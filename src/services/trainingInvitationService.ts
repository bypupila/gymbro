// =====================================================
// GymBro PWA - Training Invitation Service
// In-app invitations with Firestore onSnapshot
// =====================================================

import {
    doc, collection, addDoc, query,
    getDocs, onSnapshot, where, updateDoc, deleteDoc, Timestamp, orderBy, limit
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface TrainingInvitation {
    id: string;
    fromUserId: string;
    fromName: string;
    toUserId: string;
    toName: string;
    status: 'pending' | 'accepted' | 'declined' | 'expired';
    sessionMode: 'shared' | 'linked';
    routineName: string;
    createdAt: string;
    expiresAt: string; // Auto-expire after 5 minutes
}

export const trainingInvitationService = {

    /**
     * Send a training invitation to a partner
     */
    async sendInvitation(
        fromUserId: string,
        fromName: string,
        toUserId: string,
        toName: string,
        sessionMode: 'shared' | 'linked',
        routineName: string
    ): Promise<string> {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 min expiry

        const invitationsRef = collection(db, 'trainingInvitations');
        const docRef = await addDoc(invitationsRef, {
            fromUserId,
            fromName,
            toUserId,
            toName,
            status: 'pending',
            sessionMode,
            routineName,
            createdAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
        });

        return docRef.id;
    },

    /**
     * Listen for incoming invitations (for the recipient)
     */
    onIncomingInvitations(
        userId: string,
        callback: (invitations: TrainingInvitation[]) => void
    ): () => void {
        const invitationsRef = collection(db, 'trainingInvitations');
        const q = query(
            invitationsRef,
            where('toUserId', '==', userId),
            where('status', '==', 'pending')
        );

        return onSnapshot(q, (snapshot) => {
            const now = new Date();
            const invitations = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as TrainingInvitation))
                .filter(inv => new Date(inv.expiresAt) > now); // Filter expired

            callback(invitations);
        });
    },

    /**
     * Listen for status changes on a sent invitation (for the sender)
     */
    onInvitationStatusChange(
        invitationId: string,
        callback: (invitation: TrainingInvitation | null) => void
    ): () => void {
        const invitationRef = doc(db, 'trainingInvitations', invitationId);

        return onSnapshot(invitationRef, (snap) => {
            if (!snap.exists()) {
                callback(null);
                return;
            }
            callback({
                id: snap.id,
                ...snap.data()
            } as TrainingInvitation);
        });
    },

    /**
     * Accept an invitation
     */
    async acceptInvitation(invitationId: string): Promise<void> {
        const invitationRef = doc(db, 'trainingInvitations', invitationId);
        await updateDoc(invitationRef, {
            status: 'accepted',
        });
    },

    /**
     * Decline an invitation
     */
    async declineInvitation(invitationId: string): Promise<void> {
        const invitationRef = doc(db, 'trainingInvitations', invitationId);
        await updateDoc(invitationRef, {
            status: 'declined',
        });
    },

    /**
     * Cancel a sent invitation
     */
    async cancelInvitation(invitationId: string): Promise<void> {
        const invitationRef = doc(db, 'trainingInvitations', invitationId);
        await deleteDoc(invitationRef);
    },

    /**
     * Clean up expired invitations (call periodically)
     */
    async cleanupExpired(userId: string): Promise<void> {
        const invitationsRef = collection(db, 'trainingInvitations');
        const now = new Date().toISOString();

        // Clean sent invitations
        const sentQ = query(
            invitationsRef,
            where('fromUserId', '==', userId),
            where('status', '==', 'pending')
        );
        const sentSnap = await getDocs(sentQ);
        for (const docSnap of sentSnap.docs) {
            const data = docSnap.data();
            if (data.expiresAt && data.expiresAt < now) {
                await updateDoc(docSnap.ref, { status: 'expired' });
            }
        }

        // Clean received invitations
        const recvQ = query(
            invitationsRef,
            where('toUserId', '==', userId),
            where('status', '==', 'pending')
        );
        const recvSnap = await getDocs(recvQ);
        for (const docSnap of recvSnap.docs) {
            const data = docSnap.data();
            if (data.expiresAt && data.expiresAt < now) {
                await updateDoc(docSnap.ref, { status: 'expired' });
            }
        }
    },
};
