/**
 * Local dev API server for Playwright live tests.
 * Replicates /api/partner logic on port 3738 (Vite preview proxies /api/* here).
 *
 * Usage: npx tsx scripts/api-dev-server.ts
 */

import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ─── Load .env ───────────────────────────────────────────────────────────────
try {
    const envContent = readFileSync(resolve(process.cwd(), '.env'), 'utf-8');
    for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx < 0) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = value;
    }
} catch { /* .env not found */ }

const PORT = 3738;

// ─── Firebase Admin (singleton) ──────────────────────────────────────────────
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function getAdmin() {
    if (getApps().length > 0) return { auth: getAuth(), db: getFirestore() };
    const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH;
    if (!keyPath) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY_PATH not set');
    const sa = JSON.parse(readFileSync(resolve(keyPath), 'utf-8'));
    initializeApp({ credential: cert(sa) });
    return { auth: getAuth(), db: getFirestore() };
}

function profileRef(db: ReturnType<typeof getFirestore>, uid: string) {
    return db.collection('users').doc(uid).collection('profile').doc('main');
}

// ─── Body parser ─────────────────────────────────────────────────────────────
function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
    return new Promise((res, rej) => {
        const chunks: Buffer[] = [];
        req.on('data', c => chunks.push(c));
        req.on('end', () => { try { res(JSON.parse(Buffer.concat(chunks).toString())); } catch { res({}); } });
        req.on('error', rej);
    });
}

// ─── Auth verify ─────────────────────────────────────────────────────────────
async function verifyUid(authHeader: string | undefined): Promise<string> {
    if (!authHeader?.startsWith('Bearer ')) throw new Error('Missing token');
    const { auth } = getAdmin();
    const decoded = await auth.verifyIdToken(authHeader.slice(7));
    return decoded.uid;
}

// ─── Handlers (same logic as api/partner.ts) ─────────────────────────────────
type PI = { id: string; alias: string; nombre: string };
const RESET_SYNC = { enabled: false, partnerId: null, mode: 'manual', syncId: null };

async function acceptLink(body: Record<string, unknown>, uid: string) {
    const { linkRequestId, requesterId, recipientId } = body as Record<string, string>;
    if (uid !== recipientId && uid !== requesterId) throw new Error('Not authorized');
    const { db } = getAdmin();
    const [rqSnap, rcSnap, lrSnap] = await Promise.all([
        profileRef(db, requesterId).get(),
        profileRef(db, recipientId).get(),
        db.collection('linkRequests').doc(linkRequestId).get(),
    ]);
    if (!rqSnap.exists || !rcSnap.exists) throw new Error('Profile not found');
    const lr = lrSnap.data() || {};
    const rqP = rqSnap.data() || {};
    const rcP = rcSnap.data() || {};
    const rqAlias: string = rqP.alias || lr.requesterAlias || 'Partner';
    const rcAlias: string = rcP.alias || lr.recipientAlias || 'Partner';
    const now = new Date().toISOString();
    const batch = db.batch();
    batch.set(profileRef(db, requesterId), { partnerId: recipientId, activePartnerId: recipientId, linkSetupPendingPartnerId: recipientId, partnerIds: [recipientId], partners: [{ id: recipientId, alias: rcAlias, nombre: rcP.usuario?.nombre || rcAlias }], updatedAt: now }, { merge: true });
    batch.set(profileRef(db, recipientId), { partnerId: requesterId, activePartnerId: requesterId, linkSetupPendingPartnerId: requesterId, partnerIds: [requesterId], partners: [{ id: requesterId, alias: rqAlias, nombre: rqP.usuario?.nombre || rqAlias }], updatedAt: now }, { merge: true });
    await batch.commit();
}

async function unlink(body: Record<string, unknown>, uid: string) {
    const { targetUserId } = body as Record<string, string>;
    if (!targetUserId || uid === targetUserId) throw new Error('Bad request');
    const { db } = getAdmin();
    const [srcSnap, tgtSnap] = await Promise.all([profileRef(db, uid).get(), profileRef(db, targetUserId).get()]);
    if (!srcSnap.exists || !tgtSnap.exists) throw new Error('Profile not found');
    const src = srcSnap.data() || {};
    const tgt = tgtSnap.data() || {};
    const srcPt = ((src.partners || []) as PI[]).filter(p => p.id !== targetUserId);
    const tgtPt = ((tgt.partners || []) as PI[]).filter(p => p.id !== uid);
    const now = new Date().toISOString();
    const rs = { ...RESET_SYNC, updatedAt: now };
    const batch = db.batch();
    batch.set(profileRef(db, uid), { partnerId: srcPt[0]?.id || null, activePartnerId: src.activePartnerId === targetUserId ? (srcPt[0]?.id || null) : (src.activePartnerId || null), partnerIds: ((src.partnerIds || []) as string[]).filter((id: string) => id !== targetUserId), partners: srcPt, linkSetupPendingPartnerId: null, routineSync: rs, updatedAt: now }, { merge: true });
    batch.set(profileRef(db, targetUserId), { partnerId: tgtPt[0]?.id || null, activePartnerId: tgt.activePartnerId === uid ? (tgtPt[0]?.id || null) : (tgt.activePartnerId || null), partnerIds: ((tgt.partnerIds || []) as string[]).filter((id: string) => id !== uid), partners: tgtPt, linkSetupPendingPartnerId: null, routineSync: rs, updatedAt: now }, { merge: true });
    await batch.commit();
}

async function breakSync(body: Record<string, unknown>, uid: string) {
    const { targetUserId } = body as Record<string, string>;
    const { db } = getAdmin();
    const now = new Date().toISOString();
    const rs = { ...RESET_SYNC, updatedAt: now };
    const batch = db.batch();
    batch.set(profileRef(db, uid), { routineSync: rs }, { merge: true });
    batch.set(profileRef(db, targetUserId), { routineSync: rs }, { merge: true });
    await batch.commit();
}

async function syncNow(body: Record<string, unknown>, uid: string): Promise<object> {
    const { targetUserId } = body as Record<string, string>;
    const { db } = getAdmin();
    const [srcSnap, tgtSnap] = await Promise.all([profileRef(db, uid).get(), profileRef(db, targetUserId).get()]);
    if (!srcSnap.exists || !tgtSnap.exists) throw new Error('Profile not found');
    const src = srcSnap.data() || {};
    const tgt = tgtSnap.data() || {};
    const ss = src.routineSync; const ts = tgt.routineSync;
    const canSync = src.rutina && ss?.enabled && ts?.enabled && ss?.partnerId === targetUserId && ts?.partnerId === uid && ss?.syncId && ss.syncId === ts.syncId;
    if (!canSync) return { synced: false, reason: 'SYNC_NOT_ALLOWED' };
    const now = new Date().toISOString();
    await profileRef(db, targetUserId).set({ rutina: { ...src.rutina, syncMeta: { syncId: ss.syncId, version: Number(src.rutina.syncMeta?.version || 0) + 1, updatedBy: uid, updatedAt: now } }, updatedAt: now }, { merge: true });
    return { synced: true };
}

async function acceptRoutine(body: Record<string, unknown>, uid: string) {
    const { routineRequestId, sourceUserId, targetUserId, syncAfterAccept } = body as Record<string, unknown>;
    if (uid !== targetUserId && uid !== sourceUserId) throw new Error('Not authorized');
    const { db } = getAdmin();
    const reqRef = db.collection('routineRequests').doc(routineRequestId as string);
    const claimed = await db.runTransaction(async tx => {
        const s = await tx.get(reqRef);
        const d = s.data() || {};
        if (d.applyStatus === 'applied' || d.applyStatus === 'processing') return false;
        tx.set(reqRef, { applyStatus: 'processing', applyStartedAt: new Date().toISOString() }, { merge: true });
        return true;
    });
    if (!claimed) return;
    const [srcSnap] = await Promise.all([profileRef(db, sourceUserId as string).get()]);
    const srcR = (srcSnap.data() || {}).rutina;
    if (!srcR) { await reqRef.set({ applyStatus: 'failed', applyError: 'NO_ROUTINE' }, { merge: true }); return; }
    const now = new Date().toISOString();
    const syncId = syncAfterAccept ? `sync_${Date.now()}_${routineRequestId}` : null;
    const batch = db.batch();
    batch.set(profileRef(db, targetUserId as string), { rutina: { ...srcR, syncMeta: syncId ? { syncId, version: 1, updatedBy: sourceUserId, updatedAt: now } : null }, updatedAt: now }, { merge: true });
    if (syncId) {
        const s = { enabled: true, mode: 'manual', syncId, updatedAt: now };
        batch.set(profileRef(db, sourceUserId as string), { routineSync: { ...s, partnerId: targetUserId } }, { merge: true });
        batch.set(profileRef(db, targetUserId as string), { routineSync: { ...s, partnerId: sourceUserId } }, { merge: true });
    }
    batch.set(reqRef, { applyStatus: 'applied', appliedAt: now, applyError: null }, { merge: true });
    await batch.commit();
}

// ─── HTTP Server ─────────────────────────────────────────────────────────────
const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    const send = (code: number, body: object) => {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(code);
        res.end(JSON.stringify(body));
    };

    if (req.url !== '/api/partner') { send(404, { error: 'Not found' }); return; }
    if (req.method !== 'POST') { send(405, { error: 'Method not allowed' }); return; }

    let uid: string;
    try { uid = await verifyUid(req.headers.authorization); }
    catch { send(401, { error: 'Unauthorized' }); return; }

    const body = await readBody(req);
    const { action, ...payload } = body;

    try {
        switch (action) {
            case 'accept-link': await acceptLink(payload, uid); send(200, { success: true }); break;
            case 'unlink': await unlink(payload, uid); send(200, { success: true }); break;
            case 'break-sync': await breakSync(payload, uid); send(200, { success: true }); break;
            case 'sync-now': send(200, { success: true, ...(await syncNow(payload, uid)) }); break;
            case 'accept-routine': await acceptRoutine(payload, uid); send(200, { success: true }); break;
            default: send(400, { error: `Unknown action: ${action}` });
        }
    } catch (e) {
        send(500, { error: e instanceof Error ? e.message : 'Internal error' });
    }
});

server.listen(PORT, () => console.log(`[api-dev-server] http://localhost:${PORT}/api/partner`));
