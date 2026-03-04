/**
 * Vercel API Route: /api/partner
 *
 * Replaces Firebase Cloud Functions (which require the Blaze/paid plan).
 * Handles bidirectional partner operations using Firebase Admin SDK.
 *
 * Actions:
 *  - accept-link   → Updates both user profiles when a link request is accepted
 *  - unlink        → Removes each user from the other's partners array
 *  - break-sync    → Disables routine sync for both partners
 *  - sync-now      → Copies source routine to target profile (if conditions met)
 *  - accept-routine → Copies source routine to target and sets up sync if requested
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

type PartnerInfo = { id: string; alias: string; nombre: string };
type RoutineSync = {
    enabled: boolean;
    partnerId: string | null;
    mode: 'manual' | 'auto';
    syncId: string | null;
    updatedAt: string;
};

// ─── Firebase Admin (lazy, singleton) ────────────────────────────────────────

let _adminApp: import('firebase-admin/app').App | null = null;

async function getAdmin() {
    if (_adminApp) {
        const { getAuth } = await import('firebase-admin/auth');
        const { getFirestore } = await import('firebase-admin/firestore');
        return { auth: getAuth(_adminApp), db: getFirestore(_adminApp) };
    }

    const { cert, initializeApp } = await import('firebase-admin/app');
    const { getAuth } = await import('firebase-admin/auth');
    const { getFirestore } = await import('firebase-admin/firestore');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let serviceAccount: any;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        // Vercel production: JSON stored as env var
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH) {
        // Local dev: file path
        const filePath = resolve(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH);
        serviceAccount = JSON.parse(readFileSync(filePath, 'utf-8'));
    } else {
        throw new Error('Firebase Admin credentials not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_SERVICE_ACCOUNT_KEY_PATH.');
    }

    _adminApp = initializeApp({ credential: cert(serviceAccount) });
    return { auth: getAuth(_adminApp), db: getFirestore(_adminApp) };
}

function getProfileRef(db: import('firebase-admin/firestore').Firestore, userId: string) {
    return db.collection('users').doc(userId).collection('profile').doc('main');
}

const RESET_SYNC: RoutineSync = {
    enabled: false,
    partnerId: null,
    mode: 'manual',
    syncId: null,
    updatedAt: new Date().toISOString(),
};

// ─── Auth verification ────────────────────────────────────────────────────────

async function verifyCallerUid(req: ApiRequest): Promise<string> {
    const authHeader = req.headers['authorization'];
    const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

    if (!token) throw new Error('Missing authorization token');

    const { auth } = await getAdmin();
    const decoded = await auth.verifyIdToken(token);
    return decoded.uid;
}

// ─── Action handlers ──────────────────────────────────────────────────────────

async function handleAcceptLink(
    payload: Record<string, unknown>,
    callerUid: string
): Promise<void> {
    const { linkRequestId, requesterId, recipientId } = payload as {
        linkRequestId: string;
        requesterId: string;
        recipientId: string;
    };

    if (!linkRequestId || !requesterId || !recipientId) {
        throw new Error('linkRequestId, requesterId, recipientId are required');
    }
    if (callerUid !== recipientId && callerUid !== requesterId) {
        throw new Error('Not authorized to accept this link request');
    }

    const { db } = await getAdmin();
    const [requesterSnap, recipientSnap, linkReqSnap] = await Promise.all([
        getProfileRef(db, requesterId).get(),
        getProfileRef(db, recipientId).get(),
        db.collection('linkRequests').doc(linkRequestId).get(),
    ]);

    if (!requesterSnap.exists || !recipientSnap.exists) {
        throw new Error('One or both profiles not found');
    }

    const linkReq = linkReqSnap.data() || {};
    const requesterProfile = requesterSnap.data() || {};
    const recipientProfile = recipientSnap.data() || {};

    const requesterAlias: string = requesterProfile.alias || linkReq.requesterAlias || 'Partner';
    const requesterNombre: string = requesterProfile.usuario?.nombre || requesterAlias;
    const recipientAlias: string = recipientProfile.alias || linkReq.recipientAlias || 'Partner';
    const recipientNombre: string = recipientProfile.usuario?.nombre || recipientAlias;

    const now = new Date().toISOString();
    const batch = db.batch();

    // Requester's profile: store recipient as their partner
    batch.set(getProfileRef(db, requesterId), {
        partnerId: recipientId,
        activePartnerId: recipientId,
        linkSetupPendingPartnerId: recipientId,
        partnerIds: [recipientId],
        partners: [{ id: recipientId, alias: recipientAlias, nombre: recipientNombre } satisfies PartnerInfo],
        updatedAt: now,
    }, { merge: true });

    // Recipient's profile: store requester as their partner
    batch.set(getProfileRef(db, recipientId), {
        partnerId: requesterId,
        activePartnerId: requesterId,
        linkSetupPendingPartnerId: requesterId,
        partnerIds: [requesterId],
        partners: [{ id: requesterId, alias: requesterAlias, nombre: requesterNombre } satisfies PartnerInfo],
        updatedAt: now,
    }, { merge: true });

    await batch.commit();
}

async function handleUnlink(
    payload: Record<string, unknown>,
    callerUid: string
): Promise<void> {
    const { targetUserId } = payload as { targetUserId: string };
    if (!targetUserId) throw new Error('targetUserId is required');
    if (callerUid === targetUserId) throw new Error('Cannot unlink yourself');

    const { db } = await getAdmin();
    const [sourceSnap, targetSnap] = await Promise.all([
        getProfileRef(db, callerUid).get(),
        getProfileRef(db, targetUserId).get(),
    ]);

    if (!sourceSnap.exists || !targetSnap.exists) {
        throw new Error('One or both profiles not found');
    }

    const sourceData = sourceSnap.data() || {};
    const targetData = targetSnap.data() || {};
    const now = new Date().toISOString();

    const sourcePartners = ((sourceData.partners || []) as PartnerInfo[]).filter(p => p.id !== targetUserId);
    const targetPartners = ((targetData.partners || []) as PartnerInfo[]).filter(p => p.id !== callerUid);

    const resetSync: RoutineSync = { ...RESET_SYNC, updatedAt: now };

    const batch = db.batch();

    batch.set(getProfileRef(db, callerUid), {
        partnerId: sourcePartners[0]?.id || null,
        activePartnerId: sourceData.activePartnerId === targetUserId
            ? (sourcePartners[0]?.id || null)
            : (sourceData.activePartnerId || null),
        partnerIds: ((sourceData.partnerIds || []) as string[]).filter(id => id !== targetUserId),
        partners: sourcePartners,
        linkSetupPendingPartnerId: null,
        routineSync: resetSync,
        updatedAt: now,
    }, { merge: true });

    batch.set(getProfileRef(db, targetUserId), {
        partnerId: targetPartners[0]?.id || null,
        activePartnerId: targetData.activePartnerId === callerUid
            ? (targetPartners[0]?.id || null)
            : (targetData.activePartnerId || null),
        partnerIds: ((targetData.partnerIds || []) as string[]).filter(id => id !== callerUid),
        partners: targetPartners,
        linkSetupPendingPartnerId: null,
        routineSync: resetSync,
        updatedAt: now,
    }, { merge: true });

    await batch.commit();
}

async function handleBreakSync(
    payload: Record<string, unknown>,
    callerUid: string
): Promise<void> {
    const { targetUserId } = payload as { targetUserId: string };
    if (!targetUserId) throw new Error('targetUserId is required');

    const { db } = await getAdmin();
    const now = new Date().toISOString();
    const resetSync: RoutineSync = { ...RESET_SYNC, updatedAt: now };

    const batch = db.batch();
    batch.set(getProfileRef(db, callerUid), { routineSync: resetSync }, { merge: true });
    batch.set(getProfileRef(db, targetUserId), { routineSync: resetSync }, { merge: true });
    await batch.commit();
}

async function handleSyncNow(
    payload: Record<string, unknown>,
    callerUid: string
): Promise<{ synced: boolean; reason?: string }> {
    const { targetUserId } = payload as { targetUserId: string };
    if (!targetUserId) throw new Error('targetUserId is required');

    const { db } = await getAdmin();
    const [sourceSnap, targetSnap] = await Promise.all([
        getProfileRef(db, callerUid).get(),
        getProfileRef(db, targetUserId).get(),
    ]);

    if (!sourceSnap.exists || !targetSnap.exists) throw new Error('Profile not found');

    const sourceData = sourceSnap.data() || {};
    const targetData = targetSnap.data() || {};
    const sourceSync = sourceData.routineSync as RoutineSync | undefined;
    const targetSync = targetData.routineSync as RoutineSync | undefined;
    const sourceRoutine = sourceData.rutina;

    const canSync =
        Boolean(sourceRoutine) &&
        Boolean(sourceSync?.enabled) &&
        Boolean(targetSync?.enabled) &&
        sourceSync?.partnerId === targetUserId &&
        targetSync?.partnerId === callerUid &&
        Boolean(sourceSync?.syncId) &&
        sourceSync?.syncId === targetSync?.syncId;

    if (!canSync) return { synced: false, reason: 'SYNC_NOT_ALLOWED' };

    const now = new Date().toISOString();
    const syncedRoutine = {
        ...sourceRoutine,
        syncMeta: {
            syncId: sourceSync!.syncId,
            version: Number(sourceRoutine.syncMeta?.version || 0) + 1,
            updatedBy: callerUid,
            updatedAt: now,
        },
    };

    await getProfileRef(db, targetUserId).set(
        { rutina: syncedRoutine, updatedAt: now },
        { merge: true }
    );

    return { synced: true };
}

async function handleAcceptRoutine(
    payload: Record<string, unknown>,
    callerUid: string
): Promise<void> {
    const { routineRequestId, sourceUserId, targetUserId, syncAfterAccept } = payload as {
        routineRequestId: string;
        sourceUserId: string;
        targetUserId: string;
        syncAfterAccept: boolean;
    };

    if (!routineRequestId || !sourceUserId || !targetUserId) {
        throw new Error('routineRequestId, sourceUserId, targetUserId required');
    }
    if (callerUid !== targetUserId && callerUid !== sourceUserId) {
        throw new Error('Not authorized');
    }

    const { db } = await getAdmin();
    const routineReqRef = db.collection('routineRequests').doc(routineRequestId);

    // Transactional claim to prevent double-processing
    const claimed = await db.runTransaction(async (tx) => {
        const snap = await tx.get(routineReqRef);
        const data = snap.data() || {};
        if (data.applyStatus === 'applied' || data.applyStatus === 'processing') return false;
        tx.set(routineReqRef, { applyStatus: 'processing', applyStartedAt: new Date().toISOString() }, { merge: true });
        return true;
    });

    if (!claimed) return;

    const [sourceSnap, targetSnap] = await Promise.all([
        getProfileRef(db, sourceUserId).get(),
        getProfileRef(db, targetUserId).get(),
    ]);

    if (!sourceSnap.exists || !targetSnap.exists) {
        await routineReqRef.set({ applyStatus: 'failed', applyError: 'PROFILE_NOT_FOUND', appliedAt: new Date().toISOString() }, { merge: true });
        return;
    }

    const sourceProfile = sourceSnap.data() || {};
    const sourceRoutine = sourceProfile.rutina;

    if (!sourceRoutine) {
        await routineReqRef.set({ status: 'declined', applyStatus: 'failed', applyError: 'SOURCE_ROUTINE_NOT_FOUND', appliedAt: new Date().toISOString() }, { merge: true });
        return;
    }

    const now = new Date().toISOString();
    const syncId = syncAfterAccept
        ? (sourceProfile.routineSync?.syncId as string | null) || `sync_${Date.now()}_${routineRequestId}`
        : null;

    const syncedRoutine = {
        ...sourceRoutine,
        syncMeta: syncId ? {
            syncId,
            version: Number(sourceRoutine.syncMeta?.version || 1),
            updatedBy: sourceUserId,
            updatedAt: now,
        } : null,
    };

    const batch = db.batch();
    batch.set(getProfileRef(db, targetUserId), { rutina: syncedRoutine, updatedAt: now }, { merge: true });

    if (syncAfterAccept && syncId) {
        const sync = (partnerId: string): RoutineSync => ({ enabled: true, partnerId, mode: 'manual', syncId: syncId!, updatedAt: now });
        batch.set(getProfileRef(db, sourceUserId), { routineSync: sync(targetUserId) }, { merge: true });
        batch.set(getProfileRef(db, targetUserId), { routineSync: sync(sourceUserId) }, { merge: true });
    }

    batch.set(routineReqRef, { applyStatus: 'applied', appliedAt: now, applyError: null }, { merge: true });
    await batch.commit();
}

// ─── Security log helper (non-blocking) ──────────────────────────────────────

function maskToken(token: string): string {
    return createHash('sha256').update(token.slice(-16)).digest('hex').slice(0, 12);
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req: ApiRequest, res: ApiResponse) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    let callerUid: string;
    try {
        callerUid = await verifyCallerUid(req);
    } catch {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = req.body as Record<string, unknown>;
    const { action, ...payload } = body || {};

    if (!action || typeof action !== 'string') {
        return res.status(400).json({ error: 'action is required' });
    }

    // Mask token for any potential logging (avoid logging actual tokens)
    const authHeader = req.headers['authorization'];
    const tokenMask = typeof authHeader === 'string' ? maskToken(authHeader) : 'N/A';
    void tokenMask; // available for future logging

    try {
        switch (action) {
            case 'accept-link':
                await handleAcceptLink(payload, callerUid);
                return res.status(200).json({ success: true });

            case 'unlink':
                await handleUnlink(payload, callerUid);
                return res.status(200).json({ success: true });

            case 'break-sync':
                await handleBreakSync(payload, callerUid);
                return res.status(200).json({ success: true });

            case 'sync-now': {
                const result = await handleSyncNow(payload, callerUid);
                return res.status(200).json({ success: true, ...result });
            }

            case 'accept-routine':
                await handleAcceptRoutine(payload, callerUid);
                return res.status(200).json({ success: true });

            default:
                return res.status(400).json({ error: `Unknown action: ${action}` });
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return res.status(500).json({ error: message });
    }
}
