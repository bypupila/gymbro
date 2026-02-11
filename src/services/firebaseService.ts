import {
    doc, setDoc, getDoc, collection, addDoc, query,
    orderBy, limit, getDocs, onSnapshot, writeBatch, deleteDoc, where, updateDoc, deleteField
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { PerfilCompleto, EntrenamientoRealizado, RutinaUsuario, ExtraActivity, PartnerInfo } from '../stores/userStore';
import { useUserStore } from '../stores/userStore';
import type { EjercicioBase } from '../data/exerciseDatabase';
import {
    buildProfileDiffPatch,
    getProfileSyncFingerprint as buildProfileSyncFingerprint,
    resolveActivePartnersFromEvents,
    toProfileComparablePayload,
    toProfileSyncPayload,
} from './firebaseService.sync-utils';
import type { AcceptedPartnerEvent, ProfileSyncPayload, UnlinkPartnerEvent } from './firebaseService.sync-utils';

export interface LinkRequest {
    id: string;
    requesterId: string;
    requesterAlias: string;
    recipientId: string;
    recipientAlias?: string;
    status: 'pending' | 'accepted' | 'declined' | 'unlinked';
    createdAt: string;
    resolvedAt?: string;
    unlinkedAt?: string;
}

export interface RelationshipAction {
    id: string;
    actionType: 'UNLINK' | 'BREAK_SYNC' | 'SYNC_NOW';
    initiatedBy: string;
    sourceUserId: string;
    targetUserId: string;
    status: 'pending' | 'processed' | 'failed';
    createdAt: string;
}

const debugLog = (...args: unknown[]) => {
    if (import.meta.env.DEV) {
        console.log(...args);
    }
};

export const firebaseService = {
    // ========== PROFILE MANAGEMENT ==========

    getProfileSyncPayload(profile: PerfilCompleto): ProfileSyncPayload {
        return toProfileSyncPayload(profile);
    },

    getProfileSyncFingerprint(profile: PerfilCompleto): string {
        return buildProfileSyncFingerprint(profile);
    },

    async saveProfile(userId: string, profile: PerfilCompleto): Promise<void> {
        const profileRef = doc(db, 'users', userId, 'profile', 'main');
        await setDoc(profileRef, toProfileSyncPayload(profile));
    },

    async saveProfileDiff(userId: string, previousProfile: PerfilCompleto | null, nextProfile: PerfilCompleto): Promise<boolean> {
        const profileRef = doc(db, 'users', userId, 'profile', 'main');
        const nextPayload = toProfileSyncPayload(nextProfile);

        if (!previousProfile) {
            await setDoc(profileRef, nextPayload);
            return true;
        }

        const previousComparable = toProfileComparablePayload(previousProfile);
        const nextComparable = toProfileComparablePayload(nextProfile);
        const patch = buildProfileDiffPatch(previousComparable, nextComparable, deleteField);

        if (Object.keys(patch).length === 0) {
            return false;
        }

        patch.updatedAt = new Date().toISOString();

        try {
            await updateDoc(profileRef, patch);
        } catch (error: any) {
            console.error('[saveProfileDiff] updateDoc error:', error);

            // Detect permission-denied errors
            if (error?.code === 'permission-denied') {
                throw new Error('No tienes permisos para editar esta rutina. Puede ser una rutina sincronizada con tu partner.');
            }

            // If updateDoc fails for other reasons, try setDoc as fallback
            try {
                await setDoc(profileRef, nextPayload);
            } catch (setError: any) {
                console.error('[saveProfileDiff] setDoc error:', setError);

                if (setError?.code === 'permission-denied') {
                    throw new Error('No tienes permisos para editar esta rutina.');
                }

                // Re-throw the error to be caught by CloudSyncManager
                throw setError;
            }
        }

        return true;
    },

    async getProfile(userId: string): Promise<PerfilCompleto | null> {
        const profileRef = doc(db, 'users', userId, 'profile', 'main');
        const userRef = doc(db, 'users', userId);

        const [profileSnap, userSnap] = await Promise.all([
            getDoc(profileRef),
            getDoc(userRef)
        ]);

        if (!profileSnap.exists()) return null;

        const data = profileSnap.data();
        const userData = userSnap.exists() ? userSnap.data() : {};

        // Cargar historial y rutinas en paralelo
        const [historial, historialRutinas, extraActivities, catalogExtras] = await Promise.all([
            this.getWorkouts(userId),
            this.getRoutineHistory(userId),
            this.getExtraActivities(userId),
            this.getExtraActivitiesCatalog(userId)
        ]);

        return {
            usuario: data.usuario,
            pareja: data.pareja,
            horario: data.horario,
            rutina: data.rutina ? {
                id: data.rutina.id,
                nombre: data.rutina.nombre,
                duracionSemanas: data.rutina.duracionSemanas,
                ejercicios: data.rutina.ejercicios,
                fechaInicio: data.rutina.fechaInicio,
                fechaExpiracion: data.rutina.fechaExpiracion,
                analizadaPorIA: data.rutina.analizadaPorIA,
                isDefault: data.rutina.isDefault || false,
            } : null,
            historial,
            historialRutinas,
            onboardingCompletado: data.onboardingCompletado,
            partnerId: data.partnerId,
            partners: data.partners || [],
            partnerIds: data.partnerIds || [],
            activePartnerId: data.activePartnerId || null,
            routineSync: data.routineSync
                ? {
                    enabled: Boolean(data.routineSync.enabled),
                    partnerId: data.routineSync.partnerId || null,
                    mode: data.routineSync.mode === 'auto' ? 'auto' : 'manual',
                    syncId: data.routineSync.syncId || null,
                    updatedAt: data.routineSync.updatedAt || new Date().toISOString(),
                }
                : {
                    enabled: false,
                    partnerId: null,
                    mode: 'manual',
                    syncId: null,
                    updatedAt: new Date().toISOString(),
                },
            linkSetupPendingPartnerId: data.linkSetupPendingPartnerId || null,
            alias: userData.displayName || '',
            role: userData.role || (userData.displayName === 'bypupila' ? 'admin' : 'user'),
            weeklyTracking: data.weeklyTracking || {},
            actividadesExtras: extraActivities,
            catalogoExtras: catalogExtras,
            defaultRoutineId: data.defaultRoutineId || undefined, // Retrieve default routine ID
        };
    },

    // Real-time listener para sync automatico
    onProfileChange(
        userId: string,
        callback: (profile: PerfilCompleto | null) => void,
        options?: {
            // true = re-fetch related collections on every profile snapshot (legacy behavior)
            rehydrateRelatedData?: boolean;
            // true = ignore local pending writes to avoid sync echo churn
            ignorePendingWrites?: boolean;
        }
    ) {
        const profileRef = doc(db, 'users', userId, 'profile', 'main');
        const userRef = doc(db, 'users', userId);
        const rehydrateRelatedData = options?.rehydrateRelatedData ?? true;
        const ignorePendingWrites = options?.ignorePendingWrites ?? true;
        let cachedUserData: Record<string, unknown> | null = null;
        let cachedRelatedData: {
            historial: EntrenamientoRealizado[];
            historialRutinas: RutinaUsuario[];
            extraActivities: ExtraActivity[];
            catalogExtras: string[];
        } | null = null;

        const getUserData = async () => {
            if (!rehydrateRelatedData && cachedUserData) {
                return cachedUserData;
            }

            const userSnap = await getDoc(userRef);
            const userData = userSnap.exists() ? userSnap.data() : {};

            if (!rehydrateRelatedData) {
                cachedUserData = userData;
            }

            return userData;
        };

        const getRelatedData = async () => {
            if (!rehydrateRelatedData && cachedRelatedData) {
                return cachedRelatedData;
            }

            try {
                const [historial, historialRutinas, extraActivities, catalogExtras] = await Promise.all([
                    this.getWorkouts(userId),
                    this.getRoutineHistory(userId),
                    this.getExtraActivities(userId),
                    this.getExtraActivitiesCatalog(userId)
                ]);

                const nextRelatedData = {
                    historial,
                    historialRutinas,
                    extraActivities,
                    catalogExtras,
                };

                if (!rehydrateRelatedData) {
                    cachedRelatedData = nextRelatedData;
                }

                return nextRelatedData;
            } catch (error: any) {
                // If permissions fail, return empty data instead of crashing
                debugLog('[getRelatedData] Error fetching related data:', error?.code);
                return {
                    historial: [],
                    historialRutinas: [],
                    extraActivities: [],
                    catalogExtras: [],
                };
            }
        };

        return onSnapshot(profileRef, async (snap) => {
            try {
                if (!snap.exists()) {
                    callback(null);
                    return;
                }
                if (ignorePendingWrites && snap.metadata.hasPendingWrites) {
                    return;
                }
                const data = snap.data();
                const [userData, relatedData] = await Promise.all([
                    getUserData(),
                    getRelatedData()
                ]);

            callback({
                usuario: data.usuario,
                pareja: data.pareja,
                horario: data.horario,
                rutina: data.rutina ? {
                    id: data.rutina.id,
                    nombre: data.rutina.nombre,
                    duracionSemanas: data.rutina.duracionSemanas,
                    ejercicios: data.rutina.ejercicios,
                    fechaInicio: data.rutina.fechaInicio,
                    fechaExpiracion: data.rutina.fechaExpiracion,
                    analizadaPorIA: data.rutina.analizadaPorIA,
                    isDefault: data.rutina.isDefault || false,
                } : null,
                historial: relatedData.historial,
                historialRutinas: relatedData.historialRutinas,
                onboardingCompletado: data.onboardingCompletado,
                partnerId: data.partnerId,
                partners: data.partners || [],
                partnerIds: data.partnerIds || [],
                activePartnerId: data.activePartnerId || null,
                routineSync: data.routineSync
                    ? {
                        enabled: Boolean(data.routineSync.enabled),
                        partnerId: data.routineSync.partnerId || null,
                        mode: data.routineSync.mode === 'auto' ? 'auto' : 'manual',
                        syncId: data.routineSync.syncId || null,
                        updatedAt: data.routineSync.updatedAt || new Date().toISOString(),
                    }
                    : {
                        enabled: false,
                        partnerId: null,
                        mode: 'manual',
                        syncId: null,
                        updatedAt: new Date().toISOString(),
                    },
                linkSetupPendingPartnerId: data.linkSetupPendingPartnerId || null,
                alias: userData.displayName || '',
                role: userData.role || (userData.displayName === 'bypupila' ? 'admin' : 'user'),
                weeklyTracking: data.weeklyTracking || {},
                actividadesExtras: relatedData.extraActivities,
                catalogoExtras: relatedData.catalogExtras,
                defaultRoutineId: data.defaultRoutineId || undefined, // Retrieve default routine ID
            });
            } catch (error: any) {
                // Handle permission errors gracefully (common during partner unlink)
                if (error?.code === 'permission-denied') {
                    debugLog('[onProfileChange] Permission denied (likely during partner unlink), ignoring');
                    return;
                }
                console.error('[onProfileChange] Error:', error);
                // Don't throw - just skip this update
            }
        });
    },

    async isAliasAvailable(alias: string, currentUserId: string): Promise<boolean> {
        const cleanAlias = alias.toLowerCase().trim();
        const aliasRef = doc(db, 'userAliases', cleanAlias);
        const aliasSnap = await getDoc(aliasRef);

        if (!aliasSnap.exists()) return true;

        // Si existe, verificar si es del mismo usuario
        return aliasSnap.data().userId === currentUserId;
    },

    async updateAlias(userId: string, oldAlias: string, newAlias: string): Promise<void> {
        const cleanNew = newAlias.toLowerCase().trim();
        const cleanOld = oldAlias.toLowerCase().trim();
        if (cleanNew === cleanOld) return;

        debugLog('updateAlias called:', { userId, oldAlias, newAlias, cleanOld, cleanNew });

        // Verificar disponibilidad de nuevo (por seguridad si no se hizo antes)
        const available = await this.isAliasAvailable(cleanNew, userId);
        if (!available) {
            throw new Error('ALIAS_TAKEN');
        }

        try {
            const batch = writeBatch(db);

            // 1. Crear nuevo alias lookup
            const newAliasRef = doc(db, 'userAliases', cleanNew);
            batch.set(newAliasRef, {
                userId: userId,
                displayName: newAlias,
                createdAt: new Date(),
            });
            debugLog('Created new alias ref:', cleanNew);

            // 2. Eliminar antiguo alias lookup
            if (cleanOld) {
                const oldAliasRef = doc(db, 'userAliases', cleanOld);
                batch.delete(oldAliasRef);
                debugLog('Deleting old alias ref:', cleanOld);
            }

            // 3. ActualizarDisplayName en el doc del usuario (usar set merge para evitar fallo si no existe)
            const userRef = doc(db, 'users', userId);
            batch.set(userRef, {
                displayName: newAlias,
                lastAliasUpdate: new Date(),
            }, { merge: true });
            debugLog('Updating user doc:', userId);

            await batch.commit();
            debugLog('Batch committed successfully');
        } catch (error) {
            console.error('updateAlias error:', error);
            throw error;
        }
    },

    // ========== WORKOUT HISTORY ==========

    async addWorkout(userId: string, workout: EntrenamientoRealizado): Promise<void> {
        const workoutsRef = collection(db, 'users', userId, 'workoutHistory');
        await addDoc(workoutsRef, {
            ...workout,
            fecha: new Date(workout.fecha),
        });
    },

    async getWorkouts(userId: string, limitCount = 100): Promise<EntrenamientoRealizado[]> {
        const workoutsRef = collection(db, 'users', userId, 'workoutHistory');
        const q = query(workoutsRef, orderBy('fecha', 'desc'), limit(limitCount));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            ...doc.data(),
            fecha: doc.data().fecha.toISOString ? doc.data().fecha.toISOString() : new Date(doc.data().fecha.seconds * 1000).toISOString(),
        })) as EntrenamientoRealizado[];
    },

    async addWorkoutToPartner(partnerId: string, workout: EntrenamientoRealizado): Promise<boolean> {
        try {
            await this.addWorkout(partnerId, workout);
            return true;
        } catch (error) {
            console.error('Partner Sync Error:', error);
            return false;
        }
    },

    // ========== ROUTINE MANAGEMENT ==========

    async saveRoutine(userId: string, routine: RutinaUsuario | null): Promise<void> {
        const profileRef = doc(db, 'users', userId, 'profile', 'main');
        await setDoc(profileRef, {
            rutina: routine ? {
                id: routine.id,
                nombre: routine.nombre,
                duracionSemanas: routine.duracionSemanas,
                ejercicios: routine.ejercicios,
                fechaInicio: routine.fechaInicio,
                fechaExpiracion: routine.fechaExpiracion,
                analizadaPorIA: routine.analizadaPorIA,
                isDefault: routine.isDefault || false,
            } : null
        }, { merge: true });
    },

    async archiveRoutine(userId: string, routine: RutinaUsuario): Promise<void> {
        const routineRef = doc(db, 'users', userId, 'routineHistory', routine.id); // Use routine.id as document ID
        await setDoc(routineRef, {
            ...routine,
            fechaInicio: new Date(routine.fechaInicio),
            archivedAt: new Date(),
            isDefault: routine.isDefault || false, // Ensure isDefault is saved
        });
    },

    async getRoutineHistory(userId: string): Promise<RutinaUsuario[]> {
        const routinesRef = collection(db, 'users', userId, 'routineHistory');
        const q = query(routinesRef, orderBy('archivedAt', 'desc'));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id, // Explicitly get the ID from the document
            ...doc.data(),
            fechaInicio: doc.data().fechaInicio.toISOString ? doc.data().fechaInicio.toISOString() : new Date(doc.data().fechaInicio.seconds * 1000).toISOString(),
            isDefault: doc.data().isDefault || false, // Ensure isDefault is retrieved
        })) as RutinaUsuario[];
    },

    async getPartnerRoutine(partnerId: string): Promise<RutinaUsuario | null> {
        try {
            const partnerProfile = await this.getProfile(partnerId);
            if (partnerProfile && partnerProfile.rutina) {
                return partnerProfile.rutina;
            }
            return null;
        } catch (error) {
            console.error('Error getting partner routine:', error);
            return null;
        }
    },

    async getPartnerRoutines(partnerId: string): Promise<RutinaUsuario[]> {
        try {
            const partnerProfile = await this.getProfile(partnerId);
            let allRoutines: RutinaUsuario[] = [];

            if (partnerProfile) {
                if (partnerProfile.rutina) {
                    allRoutines.push(partnerProfile.rutina);
                }
                if (partnerProfile.historialRutinas) {
                    allRoutines = allRoutines.concat(partnerProfile.historialRutinas);
                }
            }
            return allRoutines;
        } catch (error) {
            console.error('Error getting partner routines:', error);
            return [];
        }
    },

    // ========== EXTRA ACTIVITIES MANAGEMENT ==========

    async saveExtraActivity(userId: string, activity: ExtraActivity): Promise<void> {
        const activityRef = doc(db, 'users', userId, 'extraActivities', activity.id);
        // Clean undefined values for Firestore
        const cleaned = JSON.parse(JSON.stringify(activity));
        await setDoc(activityRef, cleaned);
    },

    async deleteExtraActivity(userId: string, activityId: string): Promise<void> {

        const activityRef = doc(db, 'users', userId, 'extraActivities', activityId);
        await deleteDoc(activityRef);
    },

    async getExtraActivities(userId: string): Promise<ExtraActivity[]> {
        const activitiesRef = collection(db, 'users', userId, 'extraActivities');
        const q = query(activitiesRef, orderBy('fecha', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => doc.data() as ExtraActivity);
    },

    async getExtraActivitiesCatalog(userId: string): Promise<string[]> {
        // The catalog of extra activities is stored within the user's profile 'main' document.
        // This method fetches it directly from there.
        const profileRef = doc(db, 'users', userId, 'profile', 'main');
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
            const data = profileSnap.data();
            return data.catalogoExtras || [];
        }
        return [];
    },

    // ========== ACCOUNT LINKING ==========

    async sendLinkRequest(requesterId: string, requesterAlias: string, recipientId: string, recipientAlias?: string): Promise<void> {
        debugLog('[sendLinkRequest] Iniciando', { requesterId, requesterAlias, recipientId, recipientAlias });

        // Validacion defensiva
        if (!requesterId || typeof requesterId !== 'string') {
            console.error('[sendLinkRequest] ID de requester invalido:', requesterId);
            throw new Error('INVALID_REQUESTER_ID');
        }
        if (!recipientId || typeof recipientId !== 'string') {
            console.error('[sendLinkRequest] ID de recipient invalido:', recipientId);
            throw new Error('INVALID_RECIPIENT_ID');
        }
        if (!requesterAlias || typeof requesterAlias !== 'string') {
            console.error('[sendLinkRequest] Alias de requester invalido:', requesterAlias);
            throw new Error('INVALID_REQUESTER_ALIAS');
        }
        if (requesterId === recipientId) {
            console.error('[sendLinkRequest] Intento de auto-vinculacion');
            throw new Error('CANNOT_LINK_SELF');
        }

        const requestsRef = collection(db, 'linkRequests');

        // PASO 1: Obtener perfiles
        let requesterProfileSnap, recipientProfileSnap;
        try {
            [requesterProfileSnap, recipientProfileSnap] = await Promise.all([
                getDoc(doc(db, 'users', requesterId, 'profile', 'main')),
                getDoc(doc(db, 'users', recipientId, 'profile', 'main')),
            ]);
            debugLog('[sendLinkRequest] Perfiles obtenidos', {
                requesterExists: requesterProfileSnap.exists(),
                recipientExists: recipientProfileSnap.exists()
            });
        } catch (error) {
            console.error('[sendLinkRequest] Error obteniendo perfiles:', error);
            throw error;
        }

        if (!requesterProfileSnap.exists() || !recipientProfileSnap.exists()) {
            console.error('[sendLinkRequest] Perfil no encontrado', {
                requesterExists: requesterProfileSnap.exists(),
                recipientExists: recipientProfileSnap.exists()
            });
            throw new Error('PROFILE_NOT_FOUND');
        }
        const requesterProfile = requesterProfileSnap.data();
        const recipientProfile = recipientProfileSnap.data();

        // PASO 2: Validar estado de vinculacion
        const requesterLinkedId =
            requesterProfile.activePartnerId ||
            requesterProfile.partnerId ||
            requesterProfile.partnerIds?.[0] ||
            requesterProfile.partners?.[0]?.id ||
            null;
        const recipientLinkedId =
            recipientProfile.activePartnerId ||
            recipientProfile.partnerId ||
            recipientProfile.partnerIds?.[0] ||
            recipientProfile.partners?.[0]?.id ||
            null;

        debugLog('[sendLinkRequest] Estado de vinculacion', {
            requesterLinkedId,
            recipientLinkedId
        });

        if (requesterLinkedId && requesterLinkedId !== recipientId) {
            console.error('[sendLinkRequest] Requester ya tiene partner:', requesterLinkedId);
            throw new Error('ALREADY_HAS_PARTNER');
        }
        if (recipientLinkedId && recipientLinkedId !== requesterId) {
            console.error('[sendLinkRequest] Recipient ya tiene partner:', recipientLinkedId);
            throw new Error('RECIPIENT_ALREADY_HAS_PARTNER');
        }
        if (requesterLinkedId === recipientId && recipientLinkedId === requesterId) {
            console.error('[sendLinkRequest] Ya estan vinculados');
            throw new Error('ALREADY_LINKED');
        }

        // PASO 3: Verificar requests existentes
        let directPending, reciprocalPending, acceptedDirect, acceptedReciprocal;
        try {
            debugLog('[sendLinkRequest] Verificando requests existentes...');
            [directPending, reciprocalPending, acceptedDirect, acceptedReciprocal] = await Promise.all([
                getDocs(query(
                    requestsRef,
                    where('requesterId', '==', requesterId),
                    where('recipientId', '==', recipientId),
                    where('status', '==', 'pending')
                )),
                getDocs(query(
                    requestsRef,
                    where('requesterId', '==', recipientId),
                    where('recipientId', '==', requesterId),
                    where('status', '==', 'pending')
                )),
                getDocs(query(
                    requestsRef,
                    where('requesterId', '==', requesterId),
                    where('recipientId', '==', recipientId),
                    where('status', '==', 'accepted')
                )),
                getDocs(query(
                    requestsRef,
                    where('requesterId', '==', recipientId),
                    where('recipientId', '==', requesterId),
                    where('status', '==', 'accepted')
                ))
            ]);
            debugLog('[sendLinkRequest] Requests verificadas', {
                directPending: !directPending.empty,
                reciprocalPending: !reciprocalPending.empty,
                acceptedDirect: !acceptedDirect.empty,
                acceptedReciprocal: !acceptedReciprocal.empty
            });
        } catch (error) {
            console.error('[sendLinkRequest] Error verificando requests:', error);
            throw error;
        }

        if (!acceptedDirect.empty || !acceptedReciprocal.empty) {
            console.error('[sendLinkRequest] Ya existe request aceptada');
            throw new Error('ALREADY_LINKED');
        }

        if (!directPending.empty) {
            debugLog('[sendLinkRequest] Ya existe request pendiente directa, no se crea duplicada');
            return;
        }

        // PASO 4: Auto-aceptar si hay request reciproca
        if (!reciprocalPending.empty) {
            debugLog('[sendLinkRequest] Request reciproca encontrada, auto-aceptando...');
            const reciprocalDoc = reciprocalPending.docs[0];

            try {
                // Update the reciprocal request status
                await updateDoc(reciprocalDoc.ref, {
                    status: 'accepted',
                    resolvedAt: new Date().toISOString(),
                });
                debugLog('[sendLinkRequest] Request reciproca actualizada a accepted');

                // Fetch real display names
                const recipientDisplayName = await this.fetchUserDisplayName(recipientId);
                const requesterDisplayName = await this.fetchUserDisplayName(requesterId);
                debugLog('[sendLinkRequest] Display names obtenidos:', {
                    recipientDisplayName,
                    requesterDisplayName
                });

                // Add partner info to both users' profiles
                await Promise.all([
                    this.upsertOwnPartner(requesterId, {
                        id: recipientId,
                        alias: recipientAlias || recipientId,
                        nombre: recipientDisplayName, // NOMBRE REAL
                    }),
                    this.upsertOwnPartner(recipientId, {
                        id: requesterId,
                        alias: requesterAlias,
                        nombre: requesterDisplayName, // NOMBRE REAL
                    })
                ]);
                debugLog('[sendLinkRequest] [ok] Partners vinculados exitosamente (auto-aceptacion)');
            } catch (error) {
                console.error('[sendLinkRequest] Error en auto-aceptacion:', error);
                throw error;
            }

            return;
        }

        // PASO 5: Crear nueva request
        try {
            const linkRequestData = {
                requesterId,
                requesterAlias,
                recipientId,
                recipientAlias: recipientAlias || '',
                status: 'pending' as const,
                createdAt: new Date().toISOString(),
            };
            debugLog('[sendLinkRequest] Creando documento de request:', linkRequestData);
            await addDoc(requestsRef, linkRequestData);
            debugLog('[sendLinkRequest] [ok] Solicitud creada exitosamente');
        } catch (error) {
            console.error('[sendLinkRequest] Error al crear documento:', error);
            throw error;
        }
    },

    onLinkRequestsChange(userId: string, callback: (requests: LinkRequest[]) => void) {
        const requestsRef = collection(db, 'linkRequests');
        const q = query(requestsRef, where('recipientId', '==', userId), where('status', '==', 'pending'));

        return onSnapshot(q, (snapshot) => {
            const requests = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as LinkRequest));
            callback(requests);
        });
    },

    onAcceptedLinkRequestsChange(userId: string, callback: (partners: PartnerInfo[]) => void) {
        const requestsRef = collection(db, 'linkRequests');
        const actionsRef = collection(db, 'relationshipActions');
        const sentQ = query(requestsRef, where('requesterId', '==', userId), where('status', '==', 'accepted'));
        const receivedQ = query(requestsRef, where('recipientId', '==', userId), where('status', '==', 'accepted'));
        const unlinkByTargetQ = query(actionsRef, where('targetUserId', '==', userId), where('actionType', '==', 'UNLINK'));
        const parseTimestamp = (value?: string) => {
            if (!value) return 0;
            const ms = Date.parse(value);
            return Number.isFinite(ms) ? ms : 0;
        };
        let sentPartners: AcceptedPartnerEvent[] = [];
        let receivedPartners: AcceptedPartnerEvent[] = [];
        let unlinksByTarget: UnlinkPartnerEvent[] = [];

        const emit = () => {
            const activePartners = resolveActivePartnersFromEvents(
                [...sentPartners, ...receivedPartners],
                unlinksByTarget,
                1
            );
            callback(activePartners);
        };

        const unsubscribeSent = onSnapshot(sentQ, (snapshot) => {
            sentPartners = snapshot.docs.map((docSnap) => {
                const data = docSnap.data() as LinkRequest;
                const alias = data.recipientAlias || data.recipientId;
                return {
                    partner: {
                        id: data.recipientId,
                        alias,
                        nombre: alias,
                    },
                    acceptedAtMs: parseTimestamp(data.resolvedAt || data.createdAt),
                } as AcceptedPartnerEvent;
            });

            // Auto-actualizar perfil del requester cuando detecta nueva request aceptada
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added' && !change.doc.metadata.hasPendingWrites) {
                    const data = change.doc.data() as LinkRequest;
                    if (data.status === 'accepted') {
                        const alias = data.recipientAlias || data.recipientId;
                        debugLog('[onAcceptedLinkRequestsChange] Detectada request aceptada, actualizando perfil...', {
                            recipientId: data.recipientId,
                            alias
                        });
                        // Fetch display name y actualizar el perfil del requester (usuario actual)
                        this.fetchUserDisplayName(data.recipientId).then((displayName) => {
                            return this.upsertOwnPartner(userId, {
                                id: data.recipientId,
                                alias,
                                nombre: displayName, // NOMBRE REAL
                            });
                        }).then(() => {
                            debugLog('[onAcceptedLinkRequestsChange] [ok] Perfil del requester actualizado');
                        }).catch((error) => {
                            console.error('[onAcceptedLinkRequestsChange] Error actualizando perfil:', error);
                        });
                    }
                }
            });

            emit();
        });

        const unsubscribeReceived = onSnapshot(receivedQ, (snapshot) => {
            receivedPartners = snapshot.docs.map((docSnap) => {
                const data = docSnap.data() as LinkRequest;
                return {
                    partner: {
                        id: data.requesterId,
                        alias: data.requesterAlias,
                        nombre: data.requesterAlias,
                    },
                    acceptedAtMs: parseTimestamp(data.resolvedAt || data.createdAt),
                } as AcceptedPartnerEvent;
            });
            emit();
        });

        const unsubscribeUnlinkByTarget = onSnapshot(unlinkByTargetQ, (snapshot) => {
            unlinksByTarget = snapshot.docs.map((docSnap) => {
                const data = docSnap.data() as RelationshipAction;
                return {
                    partnerId: data.sourceUserId,
                    createdAtMs: parseTimestamp(data.createdAt),
                };
            });

            // Procesar mirror actions - cuando partner desvincula, auto-removerse
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added' && !change.doc.metadata.hasPendingWrites) {
                    const data = change.doc.data() as RelationshipAction;
                    if (data.actionType === 'UNLINK' && data.targetUserId === userId) {
                        debugLog('[Listener] Mirror unlink detectado, auto-removiendo partner:', data.sourceUserId);

                        // Auto-remover partner del perfil (async, fire-and-forget)
                        this.removePartnerFromOwnProfile(userId, data.sourceUserId).catch((error) => {
                            console.error('[Listener] Error auto-removiendo partner:', error);
                        });
                    }
                }
            });

            emit();
        });

        return () => {
            unsubscribeSent();
            unsubscribeReceived();
            unsubscribeUnlinkByTarget();
        };
    },

    async reconcilePartnerState(
        userId: string,
        expectedPartners: PartnerInfo[]
    ): Promise<void> {
        const profileRef = doc(db, 'users', userId, 'profile', 'main');
        const snap = await getDoc(profileRef);
        if (!snap.exists()) return;

        const currentProfile = snap.data();
        const rawCurrentPartnerIds = Array.isArray(currentProfile.partnerIds)
            ? currentProfile.partnerIds.filter((id): id is string => typeof id === 'string')
            : [];
        const currentPartnerIds = new Set(rawCurrentPartnerIds);
        const expectedPartnerIds = new Set(expectedPartners.map(p => p.id));

        // Detectar partners que deberian estar removidos
        const toRemove: string[] = [];
        currentPartnerIds.forEach(id => {
            if (!expectedPartnerIds.has(id)) {
                toRemove.push(id);
            }
        });

        // Auto-reparar inconsistencias
        if (toRemove.length > 0) {
            debugLog('[reconcilePartnerState] Detectada inconsistencia, removiendo:', toRemove);
            for (const partnerId of toRemove) {
                await this.removePartnerFromOwnProfile(userId, partnerId);
            }
        }
    },

    async upsertOwnPartner(userId: string, partner: PartnerInfo): Promise<boolean> {
        const profileRef = doc(db, 'users', userId, 'profile', 'main');
        const profileSnap = await getDoc(profileRef);
        if (!profileSnap.exists()) return false;

        const profileData = profileSnap.data();
        const alreadyExclusive =
            profileData.activePartnerId === partner.id &&
            Array.isArray(profileData.partners) &&
            profileData.partners.length === 1;

        const mergedPartners = [partner];
        const mergedPartnerIds = [partner.id];

        await setDoc(profileRef, {
            partnerId: partner.id,
            activePartnerId: partner.id,
            linkSetupPendingPartnerId: partner.id,
            partners: mergedPartners,
            partnerIds: mergedPartnerIds,
            updatedAt: new Date().toISOString(),
        }, { merge: true });

        return !alreadyExclusive;
    },

    async acceptLinkRequest(request: LinkRequest): Promise<void> {
        debugLog('[acceptLinkRequest] Iniciando aceptacion', request);

        // Obtener alias del recipient si no esta presente
        let recipientAlias = request.recipientAlias;
        if (!recipientAlias) {
            debugLog('[acceptLinkRequest] recipientAlias no presente, obteniendo desde perfil...');
            try {
                const recipientUserDoc = await getDoc(doc(db, 'users', request.recipientId));
                if (recipientUserDoc.exists()) {
                    recipientAlias = recipientUserDoc.data()?.displayName || request.recipientId;
                    debugLog('[acceptLinkRequest] recipientAlias obtenido:', recipientAlias);
                }
            } catch (error) {
                console.error('[acceptLinkRequest] Error obteniendo recipientAlias:', error);
                recipientAlias = request.recipientId;
            }
        }

        const requestRef = doc(db, 'linkRequests', request.id);
        await updateDoc(requestRef, {
            status: 'accepted',
            resolvedAt: new Date().toISOString(),
            recipientAlias: recipientAlias, // Guardar el alias para que el requester lo vea
        });
        debugLog('[acceptLinkRequest] Request actualizada a accepted');

        // Solo actualizar el perfil del usuario que esta aceptando (recipient)
        // El requester actualizara su propio perfil cuando detecte la aceptacion
        try {
            // Fetch display name del requester
            const requesterDisplayName = await this.fetchUserDisplayName(request.requesterId);
            debugLog('[acceptLinkRequest] Display name obtenido:', requesterDisplayName);

            await this.upsertOwnPartner(request.recipientId, {
                id: request.requesterId,
                alias: request.requesterAlias,
                nombre: requesterDisplayName, // NOMBRE REAL
            });
            debugLog('[acceptLinkRequest] [ok] Partner agregado al perfil del recipient');
        } catch (error) {
            console.error('[acceptLinkRequest] Error actualizando perfil:', error);
            throw error;
        }
    },

    async declineLinkRequest(requestId: string): Promise<void> {
        const requestRef = doc(db, 'linkRequests', requestId);
        await updateDoc(requestRef, { status: 'declined' });
    },

    async unlinkPartner(userId: string, partnerToRemove: PartnerInfo): Promise<void> {
        debugLog('[unlinkPartner] Iniciando desvinculacion bidireccional', {
            userId,
            partnerId: partnerToRemove.id
        });

        // PASO 0: Marcar linkRequests como unlinked
        try {
            const requestsRef = collection(db, 'linkRequests');
            const q1 = query(requestsRef, where('requesterId', '==', userId), where('recipientId', '==', partnerToRemove.id), where('status', '==', 'accepted'));
            const q2 = query(requestsRef, where('requesterId', '==', partnerToRemove.id), where('recipientId', '==', userId), where('status', '==', 'accepted'));

            const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

            const updatePromises: Promise<void>[] = [];
            snap1.forEach(docSnap => {
                const data = docSnap.data() as LinkRequest;
                updatePromises.push(updateDoc(doc(db, 'linkRequests', docSnap.id), {
                    status: 'unlinked',
                    unlinkedAt: new Date().toISOString(),
                    recipientAlias: data.recipientAlias || data.recipientId
                }));
            });
            snap2.forEach(docSnap => {
                const data = docSnap.data() as LinkRequest;
                updatePromises.push(updateDoc(doc(db, 'linkRequests', docSnap.id), {
                    status: 'unlinked',
                    unlinkedAt: new Date().toISOString(),
                    recipientAlias: data.recipientAlias || data.recipientId
                }));
            });

            if (updatePromises.length > 0) {
                await Promise.all(updatePromises);
                debugLog('[unlinkPartner] LinkRequests marcados como unlinked:', updatePromises.length);
            }
        } catch (error) {
            console.error('[unlinkPartner] Error marcando linkRequests:', error);
            throw new Error(`Failed to mark linkRequests as unlinked: ${error}`);
        }

        // PASO 1: Crear action principal
        const actionDoc = await addDoc(collection(db, 'relationshipActions'), {
            actionType: 'UNLINK',
            initiatedBy: userId,
            sourceUserId: userId,
            targetUserId: partnerToRemove.id,
            status: 'pending',
            createdAt: new Date().toISOString(),
        });
        debugLog('[unlinkPartner] Action creada:', actionDoc.id);

        // PASO 2: Actualizar mi perfil
        await this.removePartnerFromOwnProfile(userId, partnerToRemove.id);
        debugLog('[unlinkPartner] Perfil propio actualizado');

        // PASO 3: Crear mirror action para partner
        await addDoc(collection(db, 'relationshipActions'), {
            actionType: 'UNLINK',
            initiatedBy: userId,
            sourceUserId: partnerToRemove.id, // INVERTIDO
            targetUserId: userId,               // INVERTIDO
            status: 'pending',
            createdAt: new Date().toISOString(),
            mirrorOf: actionDoc.id,
        });
        debugLog('[unlinkPartner] Mirror action creada para partner');

        // El listener del partner detectara la mirror action y se auto-desvinculara
    },

    async removePartnerFromOwnProfile(userId: string, partnerIdToRemove: string): Promise<void> {
        // PROTECTION: Wait if there's a pending save to avoid write conflicts
        const waitForPendingSave = async (maxWaitMs = 5000) => {
            const startTime = Date.now();
            while (useUserStore.getState().pendingSave && (Date.now() - startTime) < maxWaitMs) {
                debugLog('[removePartnerFromOwnProfile] Waiting for pending save...');
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        };

        await waitForPendingSave();

        const profileRef = doc(db, 'users', userId, 'profile', 'main');
        const snap = await getDoc(profileRef);

        if (!snap.exists()) {
            console.error('[removePartnerFromOwnProfile] Perfil no existe');
            return;
        }

        const data = snap.data();
        const currentPartners = (data.partners || []) as PartnerInfo[];
        const nextPartners = currentPartners.filter(p => p.id !== partnerIdToRemove);
        const nextPartnerIds = nextPartners.map(p => p.id);

        const updates: {
            partners: PartnerInfo[];
            partnerIds: string[];
            updatedAt: string;
            activePartnerId?: string | null;
            partnerId?: string | null;
            routineSync?: {
                enabled: boolean;
                partnerId: null;
                mode: 'manual';
                syncId: null;
                updatedAt: string;
            };
        } = {
            partners: nextPartners,
            partnerIds: nextPartnerIds,
            updatedAt: new Date().toISOString(),
        };

        // Limpiar activePartnerId si era el removido
        if (data.activePartnerId === partnerIdToRemove) {
            updates.activePartnerId = nextPartners[0]?.id || null;
        }
        if (data.partnerId === partnerIdToRemove) {
            updates.partnerId = nextPartners[0]?.id || null;
        }

        // Limpiar routineSync si era con el removido
        if (data.routineSync?.partnerId === partnerIdToRemove) {
            updates.routineSync = {
                enabled: false,
                partnerId: null,
                mode: 'manual',
                syncId: null,
                updatedAt: new Date().toISOString(),
            };
        }

        await updateDoc(profileRef, updates);
        debugLog('[removePartnerFromOwnProfile] [ok] Partner removido');
    },

    async breakRoutineSync(userId: string, partnerId: string): Promise<void> {
        await addDoc(collection(db, 'relationshipActions'), {
            actionType: 'BREAK_SYNC',
            initiatedBy: userId,
            sourceUserId: userId,
            targetUserId: partnerId,
            status: 'pending',
            createdAt: new Date().toISOString(),
        });
    },

    async syncRoutineNow(userId: string, partnerId: string): Promise<void> {
        await addDoc(collection(db, 'relationshipActions'), {
            actionType: 'SYNC_NOW',
            initiatedBy: userId,
            sourceUserId: userId,
            targetUserId: partnerId,
            status: 'pending',
            createdAt: new Date().toISOString(),
        });
    },

    // ========== USER LOOKUP ==========

    async findUserByAlias(alias: string): Promise<{ id: string; name: string; alias: string } | null> {
        const cleanAlias = alias.toLowerCase().trim();
        const aliasRef = doc(db, 'userAliases', cleanAlias);
        const aliasSnap = await getDoc(aliasRef);

        if (!aliasSnap.exists()) {
            return null;
        }

        const data = aliasSnap.data();
        if (!data?.userId) return null;

        const userSnap = await getDoc(doc(db, 'users', data.userId));
        if (!userSnap.exists()) return null;
        const userData = userSnap.data() || {};

        return {
            id: data.userId,
            name: data.displayName || userData.displayName || cleanAlias,
            alias: cleanAlias,
        };
    },

    async fetchUserDisplayName(userId: string): Promise<string> {
        try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            return userDoc.exists() ? (userDoc.data()?.displayName || userId) : userId;
        } catch (error) {
            console.error('[fetchUserDisplayName] Error:', error);
            return userId;
        }
    },

    // ========== ROUTINE SHARING ==========

    async shareRoutine(targetAlias: string, routine: RutinaUsuario): Promise<{ success: boolean; message: string }> {
        try {
            const targetUser = await this.findUserByAlias(targetAlias);
            if (!targetUser || !targetUser.id) { // Ensure targetUser and its ID exist
                return { success: false, message: 'Usuario no encontrado' };
            }

            const targetId = targetUser.id;
            const targetProfile = await this.getProfile(targetId);

            // Create a copy of the routine with a new ID and mark as shared, not default
            const routineCopy: RutinaUsuario = {
                ...routine,
                id: `shared_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate new ID
                nombre: `Rutina Compartida - ${routine.nombre}`, // Clearly mark as shared
                fechaInicio: new Date().toISOString(),
                isDefault: false, // Shared routines should not be default by creation
                analizadaPorIA: false, // Assume shared routines are not AI-analyzed unless explicitly specified
            };

            if (!targetProfile) {
                // If target user has no profile, create a basic one with the shared routine as active
                const newProfile: PerfilCompleto = {
                    usuario: {
                        nombre: targetUser.alias,
                        edad: 0,
                        peso: 0,
                        altura: 0,
                        nivel: 'principiante',
                        objetivo: 'ganar_musculo',
                        lesiones: ''
                    },
                    pareja: null,
                    horario: { dias: [] },
                    rutina: routineCopy, // Set as active routine
                    historial: [],
                    historialRutinas: [],
                    onboardingCompletado: true,
                    actividadesExtras: [],
                    catalogoExtras: [],
                    partnerIds: [],
                    defaultRoutineId: undefined, // No default initially
                };
                await this.saveProfile(targetId, newProfile);
            } else {
                // If target user has a profile, add the shared routine to their history
                // (they can choose to activate it later)
                const routinesRef = collection(db, 'users', targetId, 'routineHistory');
                const routineRef = doc(routinesRef, routineCopy.id); // Use routineCopy.id as document ID
                await setDoc(routineRef, {
                    ...routineCopy,
                    fechaInicio: new Date(routineCopy.fechaInicio),
                    archivedAt: new Date(),
                });
            }

            return { success: true, message: 'Rutina compartida con exito' };
        } catch (error) {
            console.error('Share Routine Error:', error);
            return { success: false, message: 'Error al compartir la rutina' };
        }
    },

    // ========== USER INITIALIZATION ==========

    async createUserAlias(userId: string, alias: string): Promise<void> {
        const batch = writeBatch(db);

        // Crear metadata de usuario
        const userRef = doc(db, 'users', userId);
        batch.set(userRef, {
            email: alias,
            displayName: alias,
            createdAt: new Date(),
            lastSyncedAt: new Date(),
        });

        // Crear alias lookup
        const aliasRef = doc(db, 'userAliases', alias.toLowerCase());
        batch.set(aliasRef, {
            userId: userId,
            displayName: alias,
            createdAt: new Date(),
        });

        await batch.commit();
    },

    // ========== CATALOG MANAGEMENT (ADMIN) ==========

    async getAllExercises(): Promise<EjercicioBase[]> {
        const querySnapshot = await getDocs(collection(db, 'exercises'));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EjercicioBase));
    },

    async saveExercise(exerciseId: string, data: Partial<EjercicioBase>): Promise<void> {
        const ref = doc(db, 'exercises', exerciseId);
        await setDoc(ref, {
            ...data,
            updatedAt: new Date().toISOString()
        }, { merge: true });
    },

    async deleteExercise(exerciseId: string): Promise<void> {

        await deleteDoc(doc(db, 'exercises', exerciseId));
    },

    async initializeCatalog(initialData: EjercicioBase[]): Promise<void> {
        // Subir en lotes de 500 (limite de Firestore batch)
        const chunks = [];
        for (let i = 0; i < initialData.length; i += 400) {
            chunks.push(initialData.slice(i, i + 400));
        }

        for (const chunk of chunks) {
            const batch = writeBatch(db);
            chunk.forEach((ex) => {
                // Usar el nombre como ID para facil lookup o generar uno nuevo
                // Preferible generar ID sanitizando el nombre o usar el ID existente si lo hay
                const id = ex.id || ex.nombre.toLowerCase().replace(/[^a-z0-9]/g, '_');
                const ref = doc(db, 'exercises', id);
                batch.set(ref, ex);
            });
            await batch.commit();
        }
    },

    // Funcion temporal para limpiar inconsistencias de partners
    async forceCleanPartnerInconsistency(userId: string): Promise<void> {
        debugLog('[forceCleanPartner] Limpiando inconsistencia para userId:', userId);

        const profileRef = doc(db, 'users', userId, 'profile', 'main');

        try {
            await updateDoc(profileRef, {
                partnerId: deleteField(),
                activePartnerId: null,
                partners: [],
                partnerIds: [],
                linkSetupPendingPartnerId: null,
            });

            debugLog('[forceCleanPartner] [ok] Perfil limpiado exitosamente');
        } catch (error) {
            console.error('[forceCleanPartner] Error al limpiar perfil:', error);
            throw error;
        }
    }
};


