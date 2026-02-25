import fs from 'node:fs';
import readline from 'node:readline';
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
    options: {
        in: { type: 'string' },
        json: { type: 'boolean', default: false },
        failOnAlert: { type: 'boolean', default: false },
        alertRateLimit: { type: 'string', default: '80' },
        alertAuthFailures: { type: 'string', default: '120' },
    },
    allowPositionals: true,
});

const toPositiveInt = (raw, fallback) => {
    const value = Number.parseInt(raw ?? '', 10);
    return Number.isFinite(value) && value > 0 ? value : fallback;
};

const inputPath = values.in || process.env.npm_config_in || positionals[0] || null;
const jsonOutput = values.json || process.env.npm_config_json === 'true';
const failOnAlert = values.failOnAlert || process.env.npm_config_failonalert === 'true';
const alertRateLimitThreshold = toPositiveInt(values.alertRateLimit || process.env.npm_config_alertratelimit, 80);
const alertAuthFailureThreshold = toPositiveInt(values.alertAuthFailures || process.env.npm_config_alertauthfailures, 120);

const inputStream = inputPath ? fs.createReadStream(inputPath, 'utf8') : process.stdin;
const usingStdin = !inputPath;

if (usingStdin && process.stdin.isTTY) {
    console.error('Usage: node scripts/admin/summarize-gemini-security-logs.mjs --in=<vercel-logs.jsonl>');
    console.error('Tip: vercel logs <deployment-url> --format=json > logs/vercel-gemini-security.jsonl');
    process.exit(1);
}

const extractSecurityEventFromObject = (obj) => {
    if (!obj || typeof obj !== 'object') {
        return null;
    }

    if (obj.channel === 'security' && obj.service === 'api/gemini' && typeof obj.event === 'string') {
        return obj;
    }

    const candidateFields = ['message', 'text', 'output'];
    for (const field of candidateFields) {
        if (typeof obj[field] === 'string') {
            const parsed = extractSecurityEventFromString(obj[field]);
            if (parsed) {
                return parsed;
            }
        }
    }

    return null;
};

const extractSecurityEventFromString = (text) => {
    if (typeof text !== 'string') {
        return null;
    }

    const trimmed = text.trim();
    if (!trimmed) {
        return null;
    }

    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
            const parsed = JSON.parse(trimmed);
            return extractSecurityEventFromObject(parsed);
        } catch {
            return null;
        }
    }

    const marker = '{"channel":"security"';
    const markerIndex = trimmed.indexOf(marker);
    if (markerIndex < 0) {
        return null;
    }

    const candidate = trimmed.slice(markerIndex, trimmed.lastIndexOf('}') + 1);
    if (!candidate.startsWith('{') || !candidate.endsWith('}')) {
        return null;
    }

    try {
        const parsed = JSON.parse(candidate);
        return extractSecurityEventFromObject(parsed);
    } catch {
        return null;
    }
};

const increment = (map, key) => {
    if (!key) return;
    map.set(key, (map.get(key) ?? 0) + 1);
};

const toSortedArray = (map, take = 10) => {
    return [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, take)
        .map(([key, count]) => ({ key, count }));
};

const summary = {
    linesProcessed: 0,
    securityEventsFound: 0,
    firstTs: null,
    lastTs: null,
    byEvent: new Map(),
    byIpHash: new Map(),
    byUserHash: new Map(),
    rateLimitedEvents: 0,
    authFailureEvents: 0,
    payloadTooLargeEvents: 0,
};

const rl = readline.createInterface({ input: inputStream, crlfDelay: Infinity });

for await (const line of rl) {
    summary.linesProcessed += 1;

    let event = null;

    try {
        const parsed = JSON.parse(line);
        event = extractSecurityEventFromObject(parsed);
    } catch {
        event = extractSecurityEventFromString(line);
    }

    if (!event) {
        continue;
    }

    summary.securityEventsFound += 1;
    increment(summary.byEvent, event.event);

    if (typeof event.ts === 'string') {
        if (!summary.firstTs || event.ts < summary.firstTs) {
            summary.firstTs = event.ts;
        }
        if (!summary.lastTs || event.ts > summary.lastTs) {
            summary.lastTs = event.ts;
        }
    }

    if (typeof event.ipHash === 'string') {
        increment(summary.byIpHash, event.ipHash);
    }

    if (typeof event.userHash === 'string') {
        increment(summary.byUserHash, event.userHash);
    }

    if (event.event === 'gemini_rate_limited_ip' || event.event === 'gemini_rate_limited_user') {
        summary.rateLimitedEvents += 1;
    }
    if (event.event === 'gemini_auth_missing_token' || event.event === 'gemini_auth_invalid_token') {
        summary.authFailureEvents += 1;
    }
    if (event.event === 'gemini_payload_too_large') {
        summary.payloadTooLargeEvents += 1;
    }
}

const alerts = [];
if (summary.rateLimitedEvents >= alertRateLimitThreshold) {
    alerts.push(`Rate limited events (${summary.rateLimitedEvents}) >= ${alertRateLimitThreshold}`);
}
if (summary.authFailureEvents >= alertAuthFailureThreshold) {
    alerts.push(`Auth failure events (${summary.authFailureEvents}) >= ${alertAuthFailureThreshold}`);
}

const output = {
    linesProcessed: summary.linesProcessed,
    securityEventsFound: summary.securityEventsFound,
    firstTs: summary.firstTs,
    lastTs: summary.lastTs,
    rateLimitedEvents: summary.rateLimitedEvents,
    authFailureEvents: summary.authFailureEvents,
    payloadTooLargeEvents: summary.payloadTooLargeEvents,
    byEvent: Object.fromEntries(summary.byEvent),
    topIpHashes: toSortedArray(summary.byIpHash, 10),
    topUserHashes: toSortedArray(summary.byUserHash, 10),
    alerts,
};

if (jsonOutput) {
    console.log(JSON.stringify(output, null, 2));
} else {
    console.log('GymBro Security Log Summary (api/gemini)');
    console.log(`- Lines processed: ${output.linesProcessed}`);
    console.log(`- Security events found: ${output.securityEventsFound}`);
    console.log(`- Time window: ${output.firstTs ?? 'n/a'} -> ${output.lastTs ?? 'n/a'}`);
    console.log(`- Rate limited events: ${output.rateLimitedEvents}`);
    console.log(`- Auth failure events: ${output.authFailureEvents}`);
    console.log(`- Payload too large events: ${output.payloadTooLargeEvents}`);

    console.log('- By event:');
    const eventEntries = Object.entries(output.byEvent);
    if (eventEntries.length === 0) {
        console.log('  (none)');
    } else {
        for (const [eventName, count] of eventEntries.sort((a, b) => b[1] - a[1])) {
            console.log(`  ${eventName}: ${count}`);
        }
    }

    console.log('- Top IP hashes:');
    if (output.topIpHashes.length === 0) {
        console.log('  (none)');
    } else {
        for (const row of output.topIpHashes) {
            console.log(`  ${row.key}: ${row.count}`);
        }
    }

    console.log('- Top user hashes:');
    if (output.topUserHashes.length === 0) {
        console.log('  (none)');
    } else {
        for (const row of output.topUserHashes) {
            console.log(`  ${row.key}: ${row.count}`);
        }
    }

    if (alerts.length > 0) {
        console.log('- Alerts:');
        for (const alert of alerts) {
            console.log(`  ${alert}`);
        }
    }
}

if (failOnAlert && alerts.length > 0) {
    process.exit(2);
}
