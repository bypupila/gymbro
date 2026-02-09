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

    async acceptRequest(requestId: string, request: RoutineRequest): Promise<void> {
        const { getDoc, doc, updateDoc, setDoc } = await import('firebase/firestore');
        const { db } = await import('@/config/firebase');

        // Update request status
        await updateDoc(doc(db, 'routineRequests', requestId), {
            status: 'accepted',
            resolvedAt: new Date().toISOString(),
        });

        // Fetch source user's profile to get their routine
        const sourceProfileRef = doc(db, 'users', request.sourceUserId, 'profile', 'main');
        const sourceProfileSnap = await getDoc(sourceProfileRef);

        if (!sourceProfileSnap.exists()) {
            console.error('Source user profile not found');
            return;
        }

        const sourceProfile = sourceProfileSnap.data();
        const sourceRoutine = sourceProfile.rutina;

        if (!sourceRoutine) {
            console.error('Source user has no active routine');
            return;
        }

        // Create a copy of the routine with a new ID and updated metadata
        const routineCopy = {
            ...sourceRoutine,
            id: `copied_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            nombre: `${sourceRoutine.nombre} (de ${request.fromName})`,
            fechaInicio: new Date().toISOString(),
            isDefault: false,
        };

        // Write the copied routine to the target user's profile
        const targetProfileRef = doc(db, 'users', request.targetUserId, 'profile', 'main');
        await setDoc(targetProfileRef, {
            rutina: routineCopy,
            updatedAt: new Date().toISOString(),
        }, { merge: true });
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
};

