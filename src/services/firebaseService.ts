import {
    doc, setDoc, getDoc, collection, addDoc, query,
    orderBy, limit, getDocs, onSnapshot, writeBatch, deleteDoc, where, updateDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { PerfilCompleto, EntrenamientoRealizado, RutinaUsuario, ExtraActivity, PartnerInfo } from '../stores/userStore';
import { EjercicioBase } from '../data/exerciseDatabase';

export interface LinkRequest {
    id: string;
    requesterId: string;
    requesterAlias: string;
    recipientId: string;
    status: 'pending' | 'accepted' | 'declined';
    createdAt: string;
}

export interface RelationshipAction {
    id: string;
    actionType: 'UNLINK' | 'BREAK_SYNC';
    initiatedBy: string;
    sourceUserId: string;
    targetUserId: string;
    status: 'pending' | 'processed' | 'failed';
    createdAt: string;
}

export const firebaseService = {
    // ========== PROFILE MANAGEMENT ==========

    async saveProfile(userId: string, profile: PerfilCompleto): Promise<void> {
        const profileRef = doc(db, 'users', userId, 'profile', 'main');
        await setDoc(profileRef, {
            usuario: profile.usuario,
            pareja: profile.pareja,
            horario: profile.horario,
            rutina: profile.rutina ? { // Ensure ID and isDefault are saved
                id: profile.rutina.id,
                nombre: profile.rutina.nombre,
                duracionSemanas: profile.rutina.duracionSemanas,
                ejercicios: profile.rutina.ejercicios,
                fechaInicio: profile.rutina.fechaInicio,
                fechaExpiracion: profile.rutina.fechaExpiracion,
                analizadaPorIA: profile.rutina.analizadaPorIA,
                isDefault: profile.rutina.isDefault || false,
            } : null,
            onboardingCompletado: profile.onboardingCompletado,
            partnerId: profile.partnerId || null,
            partners: profile.partners || [],
            partnerIds: profile.partnerIds || [],
            activePartnerId: profile.activePartnerId || null,
            routineSync: profile.routineSync || {
                enabled: false,
                partnerId: null,
                mode: 'bidirectional',
                syncId: null,
                updatedAt: new Date().toISOString(),
            },
            linkSetupPendingPartnerId: profile.linkSetupPendingPartnerId || null,
            weeklyTracking: profile.weeklyTracking || {},
            catalogoExtras: profile.catalogoExtras || [],
            defaultRoutineId: profile.defaultRoutineId || null, // Save the default routine ID
            updatedAt: new Date().toISOString(),
        });
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
            routineSync: data.routineSync || {
                enabled: false,
                partnerId: null,
                mode: 'bidirectional',
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

    // Real-time listener para sync autom?tico
    onProfileChange(userId: string, callback: (profile: PerfilCompleto | null) => void) {
        const profileRef = doc(db, 'users', userId, 'profile', 'main');
        const userRef = doc(db, 'users', userId);

        return onSnapshot(profileRef, async (snap) => {
            if (!snap.exists()) {
                callback(null);
                return;
            }
            const data = snap.data();
            const userSnap = await getDoc(userRef);
            const userData = userSnap.exists() ? userSnap.data() : {};

            // Cargar historial, rutinas y actividades extras en paralelo
            const [historial, historialRutinas, extraActivities, catalogExtras] = await Promise.all([
                this.getWorkouts(userId),
                this.getRoutineHistory(userId),
                this.getExtraActivities(userId),
                this.getExtraActivitiesCatalog(userId)
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
                historial,
                historialRutinas,
                onboardingCompletado: data.onboardingCompletado,
                partnerId: data.partnerId,
                partners: data.partners || [],
                partnerIds: data.partnerIds || [],
                activePartnerId: data.activePartnerId || null,
                routineSync: data.routineSync || {
                    enabled: false,
                    partnerId: null,
                    mode: 'bidirectional',
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
            });
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

        console.log('updateAlias called:', { userId, oldAlias, newAlias, cleanOld, cleanNew });

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
            console.log('Created new alias ref:', cleanNew);

            // 2. Eliminar antiguo alias lookup
            if (cleanOld) {
                const oldAliasRef = doc(db, 'userAliases', cleanOld);
                batch.delete(oldAliasRef);
                console.log('Deleting old alias ref:', cleanOld);
            }

            // 3. ActualizarDisplayName en el doc del usuario (usar set merge para evitar fallo si no existe)
            const userRef = doc(db, 'users', userId);
            batch.set(userRef, {
                displayName: newAlias,
                lastAliasUpdate: new Date(),
            }, { merge: true });
            console.log('Updating user doc:', userId);

            await batch.commit();
            console.log('Batch committed successfully');
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

    async sendLinkRequest(requesterId: string, requesterAlias: string, recipientId: string): Promise<void> {
        const requestsRef = collection(db, 'linkRequests');

        const [directPending, reciprocalPending, acceptedDirect, acceptedReciprocal] = await Promise.all([
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

        if (!acceptedDirect.empty || !acceptedReciprocal.empty) {
            throw new Error('ALREADY_LINKED');
        }

        if (!directPending.empty) {
            return;
        }

        if (!reciprocalPending.empty) {
            await updateDoc(reciprocalPending.docs[0].ref, {
                status: 'accepted',
                resolvedAt: new Date().toISOString(),
            });
            return;
        }

        await addDoc(requestsRef, {
            requesterId,
            requesterAlias,
            recipientId,
            status: 'pending',
            createdAt: new Date().toISOString(),
        });
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

    async acceptLinkRequest(request: LinkRequest): Promise<void> {
        const requestRef = doc(db, 'linkRequests', request.id);
        await updateDoc(requestRef, {
            status: 'accepted',
            resolvedAt: new Date().toISOString(),
        });
    },

    async declineLinkRequest(requestId: string): Promise<void> {
        const requestRef = doc(db, 'linkRequests', requestId);
        await updateDoc(requestRef, { status: 'declined' });
    },

    async unlinkPartner(userId: string, partnerToRemove: PartnerInfo): Promise<void> {
        await addDoc(collection(db, 'relationshipActions'), {
            actionType: 'UNLINK',
            initiatedBy: userId,
            sourceUserId: userId,
            targetUserId: partnerToRemove.id,
            status: 'pending',
            createdAt: new Date().toISOString(),
        });
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

    // ========== USER LOOKUP ==========

    async findUserByAlias(alias: string): Promise<{ id: string; name: string; alias: string } | null> {
        const cleanAlias = alias.toLowerCase().trim();
        const aliasRef = doc(db, 'userAliases', cleanAlias);
        const aliasSnap = await getDoc(aliasRef);

        if (!aliasSnap.exists()) {
            // Si no existe, retornar el alias como posible ID (fallback behavior from original plan?)
            // Actually plan says: "Si no existe, retornar el alias como posible ID"
            return { id: cleanAlias, name: cleanAlias, alias: cleanAlias };
        }

        const data = aliasSnap.data();
        return {
            id: data.userId,
            name: data.displayName,
            alias: cleanAlias,
        };
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

            return { success: true, message: 'Rutina compartida con éxito' };
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
        // Subir en lotes de 500 (l?mite de Firestore batch)
        const chunks = [];
        for (let i = 0; i < initialData.length; i += 400) {
            chunks.push(initialData.slice(i, i + 400));
        }

        for (const chunk of chunks) {
            const batch = writeBatch(db);
            chunk.forEach((ex) => {
                // Usar el nombre como ID para f?cil lookup o generar uno nuevo
                // Preferible generar ID sanitizando el nombre o usar el ID existente si lo hay
                const id = ex.id || ex.nombre.toLowerCase().replace(/[^a-z0-9]/g, '_');
                const ref = doc(db, 'exercises', id);
                batch.set(ref, ex);
            });
            await batch.commit();
        }
    }
};

