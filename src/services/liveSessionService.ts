// =====================================================
// GymBro - Live Session Service (Real-time sync)
// =====================================================

import { 
    doc, 
    setDoc, 
    getDoc, 
    onSnapshot, 
    updateDoc, 
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { ExerciseTracking } from '../stores/userStore';

export interface LiveSessionMetadata {
    sessionId: string;
    startTime: string;
    routineName: string;
    dayName: string;
    status: 'active' | 'completed' | 'cancelled';
    createdBy: string;
    participants: string[]; // Array of user IDs
}

export interface LiveSessionParticipant {
    userId: string;
    exercises: ExerciseTracking[];
    lastUpdate: unknown; // Firestore Timestamp
    isOnline: boolean;
    currentExerciseId?: string | null;
}

// =====================================================
// Granular Live Update Interfaces
// =====================================================
export interface SetUpdatePayload {
    type: 'SET_UPDATE';
    exerciseId: string;
    setIndex: number;
    fields: Partial<{
        completed: boolean;
        skipped: boolean;
        weight: number;
        reps: number;
        startTime: number;
        duration: number;
        rest: number;
    }>;
}

export interface ExerciseCompletionPayload {
    type: 'EXERCISE_COMPLETED';
    exerciseId: string;
}

export interface ExerciseSkipPayload {
    type: 'EXERCISE_SKIPPED';
    exerciseId: string;
}

export type GranularLiveUpdate = SetUpdatePayload | ExerciseCompletionPayload | ExerciseSkipPayload;

// =====================================================


export const liveSessionService = {
    /**
     * Create a new live session
     */
    async createLiveSession(
        userId: string,
        partnerId: string,
        sessionData: {
            dayName: string;
            routineName: string;
            exercises: ExerciseTracking[];
        },
        providedSessionId?: string
    ): Promise<string> {
        const sessionId = providedSessionId || `session_${Date.now()}_${userId}`;
        
        // Create session metadata
        const sessionRef = doc(db, 'liveSessions', sessionId);
        await setDoc(sessionRef, {
            sessionId,
            startTime: new Date().toISOString(),
            routineName: sessionData.routineName,
            dayName: sessionData.dayName,
            status: 'active',
            createdBy: userId,
            participants: [userId, partnerId],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        // Create participant data for creator
        const participantRef = doc(db, 'liveSessions', sessionId, 'participants', userId);
        await setDoc(participantRef, {
            userId,
            exercises: sessionData.exercises,
            lastUpdate: serverTimestamp(),
            isOnline: true,
            currentExerciseId: null,
        });

        return sessionId;
    },

    /**
     * Join an existing live session
     */
    async joinLiveSession(
        sessionId: string,
        userId: string,
        exercises: ExerciseTracking[]
    ): Promise<void> {
        const participantRef = doc(db, 'liveSessions', sessionId, 'participants', userId);
        await setDoc(participantRef, {
            userId,
            exercises,
            lastUpdate: serverTimestamp(),
            isOnline: true,
            currentExerciseId: null,
        });
    },

    /**
     * Update participant's exercises (debounced call)
     */
    async updateParticipantExercises(
        sessionId: string,
        userId: string,
        exercises: ExerciseTracking[],
        currentExerciseId?: string | null
    ): Promise<void> {
        const participantRef = doc(db, 'liveSessions', sessionId, 'participants', userId);
        await updateDoc(participantRef, {
            exercises,
            lastUpdate: serverTimestamp(),
            currentExerciseId: currentExerciseId || null,
        });
    },

    /**
     * Apply a granular update to a participant's exercises in a live session
     */
    async applyGranularUpdate(
        sessionId: string,
        userId: string,
        update: GranularLiveUpdate
    ): Promise<void> {
        const participantRef = doc(db, 'liveSessions', sessionId, 'participants', userId);
        const snapshot = await getDoc(participantRef);

        if (!snapshot.exists()) {
            console.error(`Participant ${userId} not found in session ${sessionId}`);
            return;
        }

        let currentExercises = (snapshot.data() as LiveSessionParticipant).exercises;

        switch (update.type) {
            case 'SET_UPDATE':
                currentExercises = currentExercises.map(ex => {
                    if (ex.id === update.exerciseId) {
                        const newSets = [...ex.sets];
                        if (newSets[update.setIndex]) {
                            newSets[update.setIndex] = { ...newSets[update.setIndex], ...update.fields };
                        }
                        return { ...ex, sets: newSets };
                    }
                    return ex;
                });
                break;
            case 'EXERCISE_COMPLETED':
                currentExercises = currentExercises.map(ex => {
                    if (ex.id === update.exerciseId) {
                        return { ...ex, isCompleted: true };
                    }
                    return ex;
                });
                break;
            case 'EXERCISE_SKIPPED':
                currentExercises = currentExercises.map(ex => {
                    if (ex.id === update.exerciseId) {
                        return { ...ex, isSkipped: true };
                    }
                    return ex;
                });
                break;
            default:
                console.warn('Unknown granular update type:', update);
                return;
        }

        await updateDoc(participantRef, {
            exercises: currentExercises,
            lastUpdate: serverTimestamp(),
        });
    },

    /**
     * Mark participant as online/offline
     */
    async setParticipantOnlineStatus(
        sessionId: string,
        userId: string,
        isOnline: boolean
    ): Promise<void> {
        const participantRef = doc(db, 'liveSessions', sessionId, 'participants', userId);
        await updateDoc(participantRef, {
            isOnline,
            lastUpdate: serverTimestamp(),
        });
    },

    /**
     * Listen to session metadata changes
     */
    onSessionChange(
        sessionId: string,
        callback: (metadata: LiveSessionMetadata) => void
    ): () => void {
        const sessionRef = doc(db, 'liveSessions', sessionId);
        return onSnapshot(sessionRef, (snapshot) => {
            if (snapshot.exists()) {
                callback(snapshot.data() as LiveSessionMetadata);
            }
        });
    },

    /**
     * Listen to partner's exercise updates
     */
    onPartnerExercisesChange(
        sessionId: string,
        partnerId: string,
        callback: (participant: LiveSessionParticipant | null) => void
    ): () => void {
        const participantRef = doc(db, 'liveSessions', sessionId, 'participants', partnerId);
        return onSnapshot(participantRef, (snapshot) => {
            if (snapshot.exists()) {
                callback(snapshot.data() as LiveSessionParticipant);
            } else {
                callback(null);
            }
        });
    },

    /**
     * Check if partner has an active session
     */
    async getPartnerActiveSession(_partnerId: string): Promise<string | null> {
        void _partnerId;
        // Query active sessions where partner is a participant
        // For simplicity, we store the active session ID in the user's profile
        // or we can query the liveSessions collection
        // For now, return null (can be enhanced with a query)
        return null;
    },

    /**
     * Complete a live session
     */
    async completeSession(sessionId: string): Promise<void> {
        const sessionRef = doc(db, 'liveSessions', sessionId);
        await updateDoc(sessionRef, {
            status: 'completed',
            completedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    },

    /**
     * Cancel a live session
     */
    async cancelSession(sessionId: string): Promise<void> {
        const sessionRef = doc(db, 'liveSessions', sessionId);
        await updateDoc(sessionRef, {
            status: 'cancelled',
            cancelledAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    },

    /**
     * Get session data
     */
    async getSession(sessionId: string): Promise<LiveSessionMetadata | null> {
        const sessionRef = doc(db, 'liveSessions', sessionId);
        const snapshot = await getDoc(sessionRef);
        return snapshot.exists() ? (snapshot.data() as LiveSessionMetadata) : null;
    },

    /**
     * Get participant data
     */
    async getParticipant(
        sessionId: string,
        userId: string
    ): Promise<LiveSessionParticipant | null> {
        const participantRef = doc(db, 'liveSessions', sessionId, 'participants', userId);
        const snapshot = await getDoc(participantRef);
        return snapshot.exists() ? (snapshot.data() as LiveSessionParticipant) : null;
    },
};
