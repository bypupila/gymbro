import { GoogleGenerativeAI } from '@google/generative-ai';
import { createHash, randomBytes } from 'node:crypto';

type ApiRequest = {
    method?: string;
    body?: unknown;
    headers: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
    setHeader: (name: string, value: string) => void;
    status: (code: number) => ApiResponse;
    json: (payload: unknown) => ApiResponse;
};

type RateLimitBucket = {
    count: number;
    resetAt: number;
};

type RateLimitResult = {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetAt: number;
    retryAfterSec: number;
};

type RateLimitGlobalState = typeof globalThis & {
    __gymbroGeminiRateLimitStore?: Map<string, RateLimitBucket>;
    __gymbroGeminiRateLimitCleanupAt?: number;
};

type SecurityEventName =
    | 'gemini_rate_limited_ip'
    | 'gemini_rate_limited_user'
    | 'gemini_auth_missing_token'
    | 'gemini_auth_invalid_token'
    | 'gemini_payload_too_large'
    | 'gemini_security_log_salt_ephemeral';

const getPositiveInt = (raw: string | undefined, fallback: number): number => {
    const value = Number.parseInt(raw ?? '', 10);
    return Number.isFinite(value) && value > 0 ? value : fallback;
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || '';
const RATE_LIMIT_WINDOW_MS = getPositiveInt(process.env.GEMINI_RATE_LIMIT_WINDOW_MS, 60_000);
const RATE_LIMIT_MAX_PER_IP = getPositiveInt(process.env.GEMINI_RATE_LIMIT_MAX_PER_IP, 60);
const RATE_LIMIT_MAX_PER_USER = getPositiveInt(process.env.GEMINI_RATE_LIMIT_MAX_PER_USER, 30);
const HAS_CONFIGURED_SECURITY_LOG_SALT = Boolean(process.env.SECURITY_LOG_SALT);
const SECURITY_LOG_SALT = process.env.SECURITY_LOG_SALT || randomBytes(32).toString('hex');

const getRateLimitStore = (): Map<string, RateLimitBucket> => {
    const state = globalThis as RateLimitGlobalState;
    if (!state.__gymbroGeminiRateLimitStore) {
        state.__gymbroGeminiRateLimitStore = new Map();
    }
    return state.__gymbroGeminiRateLimitStore;
};

const pruneExpiredRateLimitBuckets = (now: number) => {
    const state = globalThis as RateLimitGlobalState;
    const nextCleanupAt = state.__gymbroGeminiRateLimitCleanupAt ?? 0;
    if (now < nextCleanupAt) {
        return;
    }

    const store = getRateLimitStore();
    for (const [key, bucket] of store.entries()) {
        if (bucket.resetAt <= now) {
            store.delete(key);
        }
    }

    state.__gymbroGeminiRateLimitCleanupAt = now + RATE_LIMIT_WINDOW_MS;
};

const applyRateLimit = (key: string, limit: number): RateLimitResult => {
    const now = Date.now();
    pruneExpiredRateLimitBuckets(now);

    const store = getRateLimitStore();
    const existing = store.get(key);

    if (!existing || existing.resetAt <= now) {
        const resetAt = now + RATE_LIMIT_WINDOW_MS;
        store.set(key, { count: 1, resetAt });
        return {
            allowed: true,
            limit,
            remaining: Math.max(0, limit - 1),
            resetAt,
            retryAfterSec: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
        };
    }

    if (existing.count >= limit) {
        return {
            allowed: false,
            limit,
            remaining: 0,
            resetAt: existing.resetAt,
            retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
        };
    }

    existing.count += 1;
    store.set(key, existing);

    return {
        allowed: true,
        limit,
        remaining: Math.max(0, limit - existing.count),
        resetAt: existing.resetAt,
        retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
};

const setRateLimitHeaders = (res: ApiResponse, result: RateLimitResult) => {
    res.setHeader('X-RateLimit-Limit', String(result.limit));
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.floor(result.resetAt / 1000)));
    if (!result.allowed) {
        res.setHeader('Retry-After', String(result.retryAfterSec));
    }
};

const getHeader = (req: ApiRequest, name: string): string | null => {
    const value = req.headers[name.toLowerCase()];
    if (Array.isArray(value)) {
        return value[0] ?? null;
    }
    return typeof value === 'string' ? value : null;
};

const getClientIp = (req: ApiRequest): string => {
    const forwardedFor = getHeader(req, 'x-forwarded-for');
    if (forwardedFor) {
        const firstForwardedIp = forwardedFor.split(',')[0]?.trim();
        if (firstForwardedIp) {
            return firstForwardedIp;
        }
    }

    const realIp = getHeader(req, 'x-real-ip');
    if (realIp) {
        return realIp.trim();
    }

    const cfConnectingIp = getHeader(req, 'cf-connecting-ip');
    if (cfConnectingIp) {
        return cfConnectingIp.trim();
    }

    return 'unknown';
};

const getTokenFingerprint = (token: string): string => {
    return createHash('sha256').update(token).digest('hex').slice(0, 24);
};

const hashForSecurityLog = (value: string): string => {
    return createHash('sha256').update(`${SECURITY_LOG_SALT}:${value}`).digest('hex').slice(0, 16);
};

const emitSecurityEvent = (event: SecurityEventName, details: Record<string, unknown>) => {
    const payload = {
        channel: 'security',
        service: 'api/gemini',
        event,
        ts: new Date().toISOString(),
        ...details,
    };
    // Structured JSON logs are easier to aggregate into dashboards and alerts.
    console.warn(JSON.stringify(payload));
};

if (!HAS_CONFIGURED_SECURITY_LOG_SALT) {
    emitSecurityEvent('gemini_security_log_salt_ephemeral', {
        note: 'SECURITY_LOG_SALT is missing; using an ephemeral runtime salt for hash anonymization.',
    });
}

const getModel = () => {
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured');
    }
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    return genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
        },
    });
};

const parseBody = (req: ApiRequest): Record<string, unknown> => {
    if (!req.body) return {};
    if (typeof req.body === 'string') {
        try {
            return JSON.parse(req.body);
        } catch {
            return {};
        }
    }
    return typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
};

const getBearerToken = (req: ApiRequest): string | null => {
    const header = req.headers.authorization;
    if (!header || typeof header !== 'string' || !header.startsWith('Bearer ')) {
        return null;
    }
    return header.slice('Bearer '.length).trim();
};

const verifyFirebaseIdToken = async (idToken: string): Promise<boolean> => {
    if (!FIREBASE_API_KEY) {
        return false;
    }

    const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_API_KEY)}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
        }
    );

    if (!response.ok) {
        return false;
    }

    const data = await response.json();
    return Array.isArray(data?.users) && data.users.length > 0;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
    res.setHeader('Cache-Control', 'no-store');

    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const clientIp = getClientIp(req);
    const ipRateLimitResult = applyRateLimit(`gemini:ip:${clientIp}`, RATE_LIMIT_MAX_PER_IP);
    setRateLimitHeaders(res, ipRateLimitResult);
    if (!ipRateLimitResult.allowed) {
        emitSecurityEvent('gemini_rate_limited_ip', {
            ipHash: hashForSecurityLog(clientIp),
            limit: ipRateLimitResult.limit,
            retryAfterSec: ipRateLimitResult.retryAfterSec,
            windowSec: Math.floor(RATE_LIMIT_WINDOW_MS / 1000),
        });
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    const token = getBearerToken(req);
    if (!token) {
        emitSecurityEvent('gemini_auth_missing_token', {
            ipHash: hashForSecurityLog(clientIp),
        });
        return res.status(401).json({ error: 'Missing authentication token' });
    }

    const tokenFingerprint = getTokenFingerprint(token);
    try {
        const isValidToken = await verifyFirebaseIdToken(token);
        if (!isValidToken) {
            emitSecurityEvent('gemini_auth_invalid_token', {
                ipHash: hashForSecurityLog(clientIp),
                userHash: hashForSecurityLog(tokenFingerprint),
            });
            return res.status(401).json({ error: 'Invalid authentication token' });
        }
    } catch {
        emitSecurityEvent('gemini_auth_invalid_token', {
            ipHash: hashForSecurityLog(clientIp),
            userHash: hashForSecurityLog(tokenFingerprint),
        });
        return res.status(401).json({ error: 'Token verification failed' });
    }

    const userRateLimitResult = applyRateLimit(
        `gemini:user:${tokenFingerprint}`,
        RATE_LIMIT_MAX_PER_USER
    );
    setRateLimitHeaders(res, userRateLimitResult);
    if (!userRateLimitResult.allowed) {
        emitSecurityEvent('gemini_rate_limited_user', {
            userHash: hashForSecurityLog(tokenFingerprint),
            ipHash: hashForSecurityLog(clientIp),
            limit: userRateLimitResult.limit,
            retryAfterSec: userRateLimitResult.retryAfterSec,
            windowSec: Math.floor(RATE_LIMIT_WINDOW_MS / 1000),
        });
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    if (!GEMINI_API_KEY) {
        return res.status(503).json({ error: 'Gemini service is not configured' });
    }

    const body = parseBody(req);
    const action = body.action;
    const payload = typeof body.payload === 'object' && body.payload !== null
        ? body.payload as Record<string, unknown>
        : {};

    const bodySize = JSON.stringify(payload).length;
    if (bodySize > 1_500_000) {
        emitSecurityEvent('gemini_payload_too_large', {
            userHash: hashForSecurityLog(tokenFingerprint),
            ipHash: hashForSecurityLog(clientIp),
            bodySize,
        });
        return res.status(413).json({ error: 'Request payload too large' });
    }

    try {
        const model = getModel();

        if (action === 'generate-content') {
            const input = payload.input;
            if (typeof input !== 'string' && !Array.isArray(input)) {
                return res.status(400).json({ error: 'Invalid generate-content payload' });
            }

            const result = await model.generateContent(input as string | Array<unknown>);
            const response = await result.response;
            return res.status(200).json({ text: response.text() });
        }

        if (action === 'chat') {
            const history = Array.isArray(payload.history) ? payload.history : [];
            const message = typeof payload.message === 'string' ? payload.message : '';
            if (!message) {
                return res.status(400).json({ error: 'Missing chat message' });
            }

            const chat = model.startChat({ history: history as Array<unknown> });
            const result = await chat.sendMessage(message);
            const response = await result.response;
            return res.status(200).json({ text: response.text() });
        }

        return res.status(400).json({ error: 'Unknown action' });
    } catch (error) {
        console.error('[api/gemini] request failed:', error);
        return res.status(500).json({ error: 'Failed to process Gemini request' });
    }
}
