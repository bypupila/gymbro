import { GoogleGenerativeAI } from '@google/generative-ai';

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

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || '';

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

    const token = getBearerToken(req);
    if (!token) {
        return res.status(401).json({ error: 'Missing authentication token' });
    }

    try {
        const isValidToken = await verifyFirebaseIdToken(token);
        if (!isValidToken) {
            return res.status(401).json({ error: 'Invalid authentication token' });
        }
    } catch {
        return res.status(401).json({ error: 'Token verification failed' });
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
