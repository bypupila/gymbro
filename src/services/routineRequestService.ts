import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    updateDoc,
    where,
} from 'firebase/firestore';
import { db } from '@/config/firebase';

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
            callback(requests);
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
