"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onProfileRoutineChanged = exports.onRoutineRequestAccepted = exports.onRoutineRequestCreated = exports.onRelationshipActionCreated = exports.onLinkRequestAccepted = exports.cleanupExpiredInvitations = exports.onTrainingInvitationCreated = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();
function getProfileRef(userId) {
    return db.collection('users').doc(userId).collection('profile').doc('main');
}
async function sendDataPushToUser(userId, title, body, data) {
    const tokensSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('fcmTokens')
        .get();
    if (tokensSnapshot.empty)
        return;
    const tokens = tokensSnapshot.docs.map((doc) => doc.data().token);
    const payload = {
        tokens,
        notification: { title, body },
        data,
        webpush: {
            notification: {
                icon: '/pwa-192x192.png',
                badge: '/pwa-192x192.png',
                requireInteraction: true,
            },
            fcmOptions: { link: '/' },
        },
    };
    await messaging.sendEachForMulticast(payload);
}
exports.onTrainingInvitationCreated = functions.firestore
    .document('trainingInvitations/{invitationId}')
    .onCreate(async (snap, context) => {
    const invitation = snap.data();
    const invitationId = context.params.invitationId;
    if (!invitation || invitation.status !== 'pending')
        return null;
    const { toUserId, fromName, sessionMode, routineName } = invitation;
    const modeLabel = sessionMode === 'shared' ? 'Mismo celular' : 'Cada quien su cel';
    await sendDataPushToUser(toUserId, 'Invitacion a Entrenar', `${fromName} te invita a entrenar juntos (${modeLabel})`, {
        type: 'training_invitation',
        invitationId,
        fromName: fromName || '',
        sessionMode: sessionMode || '',
        routineName: routineName || '',
    });
    return null;
});
exports.cleanupExpiredInvitations = functions.pubsub
    .schedule('every 10 minutes')
    .onRun(async () => {
    const now = new Date().toISOString();
    const expiredQuery = db
        .collection('trainingInvitations')
        .where('status', '==', 'pending')
        .where('expiresAt', '<', now);
    const snapshot = await expiredQuery.get();
    if (snapshot.empty)
        return null;
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { status: 'expired' });
    });
    await batch.commit();
    return null;
});
exports.onLinkRequestAccepted = functions.firestore
    .document('linkRequests/{requestId}')
    .onUpdate(async (change) => {
    var _a, _b;
    const before = change.before.data();
    const after = change.after.data();
    if (!before || !after)
        return null;
    if (before.status === after.status)
        return null;
    if (!(before.status === 'pending' && after.status === 'accepted'))
        return null;
    const requesterId = after.requesterId;
    const recipientId = after.recipientId;
    if (!requesterId || !recipientId)
        return null;
    const [requesterProfileSnap, recipientProfileSnap, requesterUserSnap, recipientUserSnap] = await Promise.all([
        getProfileRef(requesterId).get(),
        getProfileRef(recipientId).get(),
        db.collection('users').doc(requesterId).get(),
        db.collection('users').doc(recipientId).get(),
    ]);
    if (!requesterProfileSnap.exists || !recipientProfileSnap.exists)
        return null;
    const requesterAlias = ((_a = requesterUserSnap.data()) === null || _a === void 0 ? void 0 : _a.displayName) || after.requesterAlias || 'Partner';
    const recipientAlias = ((_b = recipientUserSnap.data()) === null || _b === void 0 ? void 0 : _b.displayName) || 'Partner';
    const requesterPartner = { id: recipientId, alias: recipientAlias, nombre: recipientAlias };
    const recipientPartner = { id: requesterId, alias: requesterAlias, nombre: requesterAlias };
    const batch = db.batch();
    batch.set(getProfileRef(requesterId), {
        partnerId: recipientId,
        activePartnerId: recipientId,
        linkSetupPendingPartnerId: recipientId,
        partnerIds: [recipientId],
        partners: [requesterPartner],
        updatedAt: new Date().toISOString(),
    }, { merge: true });
    batch.set(getProfileRef(recipientId), {
        partnerId: requesterId,
        activePartnerId: requesterId,
        linkSetupPendingPartnerId: requesterId,
        partnerIds: [requesterId],
        partners: [recipientPartner],
        updatedAt: new Date().toISOString(),
    }, { merge: true });
    await batch.commit();
    return null;
});
exports.onRelationshipActionCreated = functions.firestore
    .document('relationshipActions/{actionId}')
    .onCreate(async (snap) => {
    var _a, _b, _c;
    const action = snap.data();
    if (!action)
        return null;
    const sourceUserId = action.sourceUserId;
    const targetUserId = action.targetUserId;
    const actionType = action.actionType;
    if (!sourceUserId || !targetUserId)
        return null;
    const [sourceProfileSnap, targetProfileSnap] = await Promise.all([
        getProfileRef(sourceUserId).get(),
        getProfileRef(targetUserId).get(),
    ]);
    if (!sourceProfileSnap.exists || !targetProfileSnap.exists) {
        await snap.ref.set({ status: 'failed', processedAt: new Date().toISOString() }, { merge: true });
        return null;
    }
    const sourceProfile = sourceProfileSnap.data() || {};
    const targetProfile = targetProfileSnap.data() || {};
    const batch = db.batch();
    if (actionType === 'UNLINK') {
        const sourcePartners = (sourceProfile.partners || []).filter((p) => p.id !== targetUserId);
        const targetPartners = (targetProfile.partners || []).filter((p) => p.id !== sourceUserId);
        batch.set(getProfileRef(sourceUserId), {
            partnerId: sourcePartners.length > 0 ? sourcePartners[0].id : null,
            activePartnerId: sourceProfile.activePartnerId === targetUserId
                ? (((_a = sourcePartners[0]) === null || _a === void 0 ? void 0 : _a.id) || null)
                : (sourceProfile.activePartnerId || null),
            partnerIds: (sourceProfile.partnerIds || []).filter((id) => id !== targetUserId),
            partners: sourcePartners,
            routineSync: {
                enabled: false,
                partnerId: null,
                mode: 'manual',
                syncId: null,
                updatedAt: new Date().toISOString(),
            },
            updatedAt: new Date().toISOString(),
        }, { merge: true });
        batch.set(getProfileRef(targetUserId), {
            partnerId: targetPartners.length > 0 ? targetPartners[0].id : null,
            activePartnerId: targetProfile.activePartnerId === sourceUserId
                ? (((_b = targetPartners[0]) === null || _b === void 0 ? void 0 : _b.id) || null)
                : (targetProfile.activePartnerId || null),
            partnerIds: (targetProfile.partnerIds || []).filter((id) => id !== sourceUserId),
            partners: targetPartners,
            routineSync: {
                enabled: false,
                partnerId: null,
                mode: 'manual',
                syncId: null,
                updatedAt: new Date().toISOString(),
            },
            updatedAt: new Date().toISOString(),
        }, { merge: true });
    }
    if (actionType === 'BREAK_SYNC') {
        const syncPayload = {
            enabled: false,
            partnerId: null,
            mode: 'manual',
            syncId: null,
            updatedAt: new Date().toISOString(),
        };
        batch.set(getProfileRef(sourceUserId), { routineSync: syncPayload }, { merge: true });
        batch.set(getProfileRef(targetUserId), { routineSync: syncPayload }, { merge: true });
        await sendDataPushToUser(targetUserId, 'Sincronizacion desactivada', 'Tu partner rompio la sincronizacion de rutina.', { type: 'sync_break', sourceUserId });
    }
    if (actionType === 'SYNC_NOW') {
        const sourceSync = sourceProfile.routineSync || {};
        const targetSync = targetProfile.routineSync || {};
        const sourceRoutine = sourceProfile.rutina;
        const canSyncNow = Boolean(sourceRoutine) &&
            Boolean(sourceSync.enabled) &&
            Boolean(targetSync.enabled) &&
            sourceSync.partnerId === targetUserId &&
            targetSync.partnerId === sourceUserId &&
            Boolean(sourceSync.syncId) &&
            sourceSync.syncId === targetSync.syncId;
        if (!canSyncNow) {
            batch.set(snap.ref, {
                status: 'failed',
                processedAt: new Date().toISOString(),
                error: 'SYNC_NOT_ALLOWED',
            }, { merge: true });
            await batch.commit();
            return null;
        }
        const syncedRoutine = {
            ...sourceRoutine,
            syncMeta: {
                syncId: sourceSync.syncId,
                version: Number(((_c = sourceRoutine.syncMeta) === null || _c === void 0 ? void 0 : _c.version) || 0) + 1,
                updatedBy: sourceUserId,
                updatedAt: new Date().toISOString(),
            },
        };
        batch.set(getProfileRef(targetUserId), {
            rutina: syncedRoutine,
            updatedAt: new Date().toISOString(),
        }, { merge: true });
    }
    batch.set(snap.ref, {
        status: 'processed',
        processedAt: new Date().toISOString(),
    }, { merge: true });
    await batch.commit();
    return null;
});
exports.onRoutineRequestCreated = functions.firestore
    .document('routineRequests/{requestId}')
    .onCreate(async (snap, context) => {
    const request = snap.data();
    if (!request || request.status !== 'pending')
        return null;
    await sendDataPushToUser(request.toUserId, 'Solicitud de rutina', `${request.fromName} te envio una solicitud de rutina.`, {
        type: 'routine_request',
        requestId: context.params.requestId,
        fromUserId: request.fromUserId || '',
        fromName: request.fromName || '',
    });
    return null;
});
exports.onRoutineRequestAccepted = functions.firestore
    .document('routineRequests/{requestId}')
    .onUpdate(async (change, context) => {
    var _a, _b;
    const before = change.before.data();
    const after = change.after.data();
    if (!before || !after)
        return null;
    if (!(before.status === 'pending' && after.status === 'accepted'))
        return null;
    if (after.applyStatus === 'applied')
        return null;
    const sourceUserId = after.sourceUserId;
    const targetUserId = after.targetUserId;
    const syncAfterAccept = Boolean(after.syncAfterAccept);
    if (!sourceUserId || !targetUserId)
        return null;
    const claimed = await db.runTransaction(async (tx) => {
        const snap = await tx.get(change.after.ref);
        const data = snap.data() || {};
        if (data.applyStatus === 'applied' || data.applyStatus === 'processing')
            return false;
        tx.set(change.after.ref, {
            applyStatus: 'processing',
            applyStartedAt: new Date().toISOString(),
        }, { merge: true });
        return true;
    });
    if (!claimed)
        return null;
    try {
        const [sourceProfileSnap, targetProfileSnap] = await Promise.all([
            getProfileRef(sourceUserId).get(),
            getProfileRef(targetUserId).get(),
        ]);
        if (!sourceProfileSnap.exists || !targetProfileSnap.exists) {
            await change.after.ref.set({
                applyStatus: 'failed',
                applyError: 'PROFILE_NOT_FOUND',
                appliedAt: new Date().toISOString(),
            }, { merge: true });
            return null;
        }
        const sourceProfile = sourceProfileSnap.data() || {};
        const sourceRoutine = sourceProfile.rutina;
        if (!sourceRoutine) {
            await change.after.ref.set({
                status: 'declined',
                resolvedAt: new Date().toISOString(),
                applyStatus: 'failed',
                applyError: 'SOURCE_ROUTINE_NOT_FOUND',
                appliedAt: new Date().toISOString(),
            }, { merge: true });
            return null;
        }
        const syncId = syncAfterAccept
            ? (((_a = sourceProfile.routineSync) === null || _a === void 0 ? void 0 : _a.syncId) || `sync_${Date.now()}_${context.params.requestId}`)
            : null;
        const syncedRoutine = {
            ...sourceRoutine,
            syncMeta: syncId
                ? {
                    syncId,
                    version: Number(((_b = sourceRoutine.syncMeta) === null || _b === void 0 ? void 0 : _b.version) || 1),
                    updatedBy: sourceUserId,
                    updatedAt: new Date().toISOString(),
                }
                : null,
        };
        const batch = db.batch();
        batch.set(getProfileRef(targetUserId), {
            rutina: syncedRoutine,
            updatedAt: new Date().toISOString(),
        }, { merge: true });
        if (syncAfterAccept && syncId) {
            const sourceSync = {
                enabled: true,
                partnerId: targetUserId,
                mode: 'manual',
                syncId,
                updatedAt: new Date().toISOString(),
            };
            const targetSync = {
                enabled: true,
                partnerId: sourceUserId,
                mode: 'manual',
                syncId,
                updatedAt: new Date().toISOString(),
            };
            batch.set(getProfileRef(sourceUserId), { routineSync: sourceSync }, { merge: true });
            batch.set(getProfileRef(targetUserId), { routineSync: targetSync }, { merge: true });
        }
        batch.set(change.after.ref, {
            applyStatus: 'applied',
            appliedAt: new Date().toISOString(),
            applyError: null,
        }, { merge: true });
        await batch.commit();
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
        await change.after.ref.set({
            applyStatus: 'failed',
            applyError: message,
            appliedAt: new Date().toISOString(),
        }, { merge: true });
    }
    return null;
});
exports.onProfileRoutineChanged = functions.firestore
    .document('users/{userId}/profile/main')
    .onUpdate(async (change, context) => {
    var _a, _b;
    const before = change.before.data();
    const after = change.after.data();
    const userId = context.params.userId;
    if (!before || !after)
        return null;
    if (JSON.stringify(before.rutina) === JSON.stringify(after.rutina))
        return null;
    const sourceRoutine = after.rutina;
    const sourceSync = after.routineSync;
    if (!sourceRoutine || !(sourceSync === null || sourceSync === void 0 ? void 0 : sourceSync.enabled) || sourceSync.mode !== 'auto')
        return null;
    if (!sourceRoutine.syncMeta || !sourceSync.syncId)
        return null;
    if (sourceRoutine.syncMeta.syncId !== sourceSync.syncId)
        return null;
    if (sourceRoutine.syncMeta.updatedBy !== userId)
        return null;
    const partnerId = sourceSync.partnerId;
    if (!partnerId)
        return null;
    const partnerRef = getProfileRef(partnerId);
    const partnerSnap = await partnerRef.get();
    if (!partnerSnap.exists)
        return null;
    const partnerData = partnerSnap.data() || {};
    const partnerSync = partnerData.routineSync;
    if (!(partnerSync === null || partnerSync === void 0 ? void 0 : partnerSync.enabled) || partnerSync.mode !== 'auto' || partnerSync.syncId !== sourceSync.syncId)
        return null;
    const partnerVersion = Number(((_b = (_a = partnerData.rutina) === null || _a === void 0 ? void 0 : _a.syncMeta) === null || _b === void 0 ? void 0 : _b.version) || 0);
    const sourceVersion = Number(sourceRoutine.syncMeta.version || 0);
    if (partnerVersion >= sourceVersion)
        return null;
    await partnerRef.set({
        rutina: sourceRoutine,
        updatedAt: new Date().toISOString(),
    }, { merge: true });
    return null;
});
//# sourceMappingURL=index.js.map