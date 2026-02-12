import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    onSnapshot,
    query,
    updateDoc,
    where,
} from 'firebase/firestore';
import { db } from '@/config/firebase';

const debugLog = (...args: unknown[]) => {
    if (import.meta.env.DEV) {
        console.log(...args);
    }
};

export type RoutineRequestType =
    | 'copy_my_routine_to_partner'
    | 'copy_partner_routine_to_me';

export interface RoutineRequest {
    id: string;
    fromUserId: string;
    fromName: string;
    toUserId: string;
    toName: string;
    sourceUserId: string;
    targetUserId: string;
    type: RoutineRequestType;
    status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
    syncAfterAccept: boolean;
    createdAt: string;
    expiresAt: string;
    resolvedAt?: string;
    applyStatus?: 'pending' | 'processing' | 'applied' | 'failed';
    appliedAt?: string;
    applyError?: string;
}

export const routineRequestService = {
    async createRequest(
        payload: Omit<RoutineRequest, 'id' | 'status' | 'createdAt' | 'expiresAt'>
    ): Promise<string> {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();

        // Prevent stacked pending requests for the same sender->target flow.
        // Spark-safe: query only by indexed/easy fields and filter client-side.
        const pendingFromSenderQ = query(
            collection(db, 'routineRequests'),
            where('fromUserId', '==', payload.fromUserId),
            where('status', '==', 'pending')
        );
        const pendingFromSenderSnap = await getDocs(pendingFromSenderQ);
        const duplicates = pendingFromSenderSnap.docs.filter((docSnap) => {
            const data = docSnap.data() as RoutineRequest;
            return (
                data.toUserId === payload.toUserId &&
                data.sourceUserId === payload.sourceUserId &&
                data.targetUserId === payload.targetUserId &&
                data.type === payload.type
            );
        });
        await Promise.all(
            duplicates.map((docSnap) =>
                updateDoc(doc(db, 'routineRequests', docSnap.id), {
                    status: 'cancelled',
                    resolvedAt: now.toISOString(),
                    cancelledReason: 'superseded_by_new_request',
                })
            )
        );

        const docRef = await addDoc(collection(db, 'routineRequests'), {
            ...payload,
            status: 'pending',
            applyStatus: 'pending',
            createdAt: now.toISOString(),
            expiresAt,
        });
        return docRef.id;
    },

    onIncomingRequests(userId: string, callback: (requests: RoutineRequest[]) => void): () => void {
        const q = query(
            collection(db, 'routineRequests'),
            where('toUserId', '==', userId),
            where('status', '==', 'pending')
        );
        return onSnapshot(q, (snapshot) => {
            const now = Date.now();
            const requests = snapshot.docs
                .map((d) => ({ id: d.id, ...d.data() } as RoutineRequest))
                .filter((r) => new Date(r.expiresAt).getTime() > now);

            // Keep only the newest pending request per sender/flow to avoid duplicated cards.
            const latestByFlow = new Map<string, RoutineRequest>();
            for (const req of requests) {
                const key = `${req.fromUserId}|${req.sourceUserId}|${req.targetUserId}|${req.type}`;
                const current = latestByFlow.get(key);
                const reqMs = Date.parse(req.createdAt);
                const currentMs = current ? Date.parse(current.createdAt) : 0;
                if (!current || reqMs >= currentMs) {
                    latestByFlow.set(key, req);
                }
            }
            callback(Array.from(latestByFlow.values()));
        }, (error) => {
            const firestoreError = error as { code?: string; message?: string };
            if (firestoreError?.code === 'permission-denied') {
                debugLog('[routineRequestService.onIncomingRequests] permission denied, ignored');
                callback([]);
                return;
            }
            console.error('[routineRequestService.onIncomingRequests] listener error:', firestoreError?.message || error);
        });
    },

    async acceptRequest(requestId: string): Promise<void> {
        // Backend Cloud Function applies the copy and sync config.
        await updateDoc(doc(db, 'routineRequests', requestId), {
            status: 'accepted',
            resolvedAt: new Date().toISOString(),
            applyStatus: 'pending',
        });
    },

    async declineRequest(requestId: string): Promise<void> {
        await updateDoc(doc(db, 'routineRequests', requestId), {
            status: 'declined',
            resolvedAt: new Date().toISOString(),
        });
    },

    async cancelRequest(requestId: string): Promise<void> {
        try {
            await updateDoc(doc(db, 'routineRequests', requestId), {
                status: 'cancelled',
                resolvedAt: new Date().toISOString(),
            });
        } catch {
            await deleteDoc(doc(db, 'routineRequests', requestId));
        }
    },

    /**
     * Listen for accepted routine requests where the current user is the targetUserId.
     * Covers the case where someone accepted a request to copy a routine TO us.
     * Uses a single where clause to avoid needing a composite Firestore index.
     */
    onAcceptedRequestsAsTarget(
        userId: string,
        callback: (requests: RoutineRequest[]) => void
    ): () => void {
        const q = query(
            collection(db, 'routineRequests'),
            where('targetUserId', '==', userId),
        );
        return onSnapshot(q, (snapshot) => {
            const requests = snapshot.docs
                .map((d) => ({ id: d.id, ...d.data() } as RoutineRequest))
                .filter((r) => r.status === 'accepted' && r.applyStatus !== 'applied');
            callback(requests);
        }, (error) => {
            const firestoreError = error as { code?: string; message?: string };
            if (firestoreError?.code === 'permission-denied') {
                debugLog('[routineRequestService.onAcceptedRequestsAsTarget] permission denied, ignored');
                callback([]);
                return;
            }
            console.error('[routineRequestService.onAcceptedRequestsAsTarget] listener error:', firestoreError?.message || error);
        });
    },

    onAcceptedRequestsAsSource(
        userId: string,
        callback: (requests: RoutineRequest[]) => void
    ): () => void {
        const q = query(
            collection(db, 'routineRequests'),
            where('fromUserId', '==', userId),
        );
        return onSnapshot(q, (snapshot) => {
            const requests = snapshot.docs
                .map((d) => ({ id: d.id, ...d.data() } as RoutineRequest))
                .filter((r) => r.status === 'accepted');
            callback(requests);
        }, (error) => {
            const firestoreError = error as { code?: string; message?: string };
            if (firestoreError?.code === 'permission-denied') {
                debugLog('[routineRequestService.onAcceptedRequestsAsSource] permission denied, ignored');
                callback([]);
                return;
            }
            console.error('[routineRequestService.onAcceptedRequestsAsSource] listener error:', firestoreError?.message || error);
        });
    },

    /**
     * Mark a routine request as applied (client-side copy completed).
     * Only works when the current user is the toUserId (Firestore rules).
     */
    async markAsApplied(requestId: string): Promise<void> {
        try {
            await updateDoc(doc(db, 'routineRequests', requestId), {
                applyStatus: 'applied',
                appliedAt: new Date().toISOString(),
                appliedBy: 'client',
            });
        } catch (e) {
            // May fail if user is not the toUserId (Firestore rules).
            // This is OK — the Cloud Function will handle it as backup.
            console.warn('[routineRequestService] markAsApplied failed (expected for fromUser):', e);
        }
    },
};
