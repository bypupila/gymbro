import {
    doc, setDoc, getDoc, collection, addDoc, query,
    orderBy, limit, getDocs, onSnapshot, writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { PerfilCompleto, EntrenamientoRealizado, RutinaUsuario, ExtraActivity } from '../stores/userStore';

export const firebaseService = {
    // ========== PROFILE MANAGEMENT ==========

    async saveProfile(userId: string, profile: PerfilCompleto): Promise<void> {
        const profileRef = doc(db, 'users', userId, 'profile', 'main');
        await setDoc(profileRef, {
            usuario: profile.usuario,
            pareja: profile.pareja,
            horario: profile.horario,
            rutina: profile.rutina,
            onboardingCompletado: profile.onboardingCompletado,
            partnerId: profile.partnerId || null,
            weeklyTracking: profile.weeklyTracking || {},
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
            rutina: data.rutina,
            historial,
            historialRutinas,
            onboardingCompletado: data.onboardingCompletado,
            partnerId: data.partnerId,
            alias: userData.displayName || '',
            role: userData.role || (userData.displayName === 'bypupila' ? 'admin' : 'user'),
            weeklyTracking: data.weeklyTracking || {},
            actividadesExtras: extraActivities,
            catalogoExtras: catalogExtras,
        };
    },

    // Real-time listener para sync automático
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
                rutina: data.rutina,
                historial,
                historialRutinas,
                onboardingCompletado: data.onboardingCompletado,
                partnerId: data.partnerId,
                alias: userData.displayName || '',
                role: userData.role || (userData.displayName === 'bypupila' ? 'admin' : 'user'),
                weeklyTracking: data.weeklyTracking || {},
                actividadesExtras: extraActivities,
                catalogoExtras: catalogExtras,
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
        await setDoc(profileRef, { rutina: routine }, { merge: true });
    },

    async archiveRoutine(userId: string, routine: RutinaUsuario): Promise<void> {
        const routinesRef = collection(db, 'users', userId, 'routineHistory');
        await addDoc(routinesRef, {
            ...routine,
            fechaInicio: new Date(routine.fechaInicio),
            archivedAt: new Date(),
        });
    },

    async getRoutineHistory(userId: string): Promise<RutinaUsuario[]> {
        const routinesRef = collection(db, 'users', userId, 'routineHistory');
        const q = query(routinesRef, orderBy('archivedAt', 'desc'));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            ...doc.data(),
            fechaInicio: doc.data().fechaInicio.toISOString ? doc.data().fechaInicio.toISOString() : new Date(doc.data().fechaInicio.seconds * 1000).toISOString(),
        })) as RutinaUsuario[];
    },

    // ========== EXTRA ACTIVITIES MANAGEMENT ==========

    async saveExtraActivity(userId: string, activity: ExtraActivity): Promise<void> {
        const activityRef = doc(db, 'users', userId, 'extraActivities', activity.id);
        // Clean undefined values for Firestore
        const cleaned = JSON.parse(JSON.stringify(activity));
        await setDoc(activityRef, cleaned);
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
            if (!targetUser) {
                return { success: false, message: 'Usuario no encontrado' };
            }

            const targetId = targetUser.id;
            const targetProfile = await this.getProfile(targetId);

            const routineCopy = {
                ...routine,
                nombre: `${routine.nombre} (Compartida)`,
                fechaInicio: new Date().toISOString(),
            };

            if (!targetProfile) {
                // Crear perfil básico si no existe (though this implies user doesn't exist which contradicts successful findUserByAlias if alias maps to existing user)
                // Check plan: "Crear perfil básico si no existe"
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
                    rutina: routineCopy,
                    historial: [],
                    historialRutinas: [],
                    onboardingCompletado: true,
                    actividadesExtras: [],
                    catalogoExtras: []
                };
                await this.saveProfile(targetId, newProfile);
            } else {
                // Archivar rutina actual y establecer nueva
                if (targetProfile.rutina) {
                    await this.archiveRoutine(targetId, targetProfile.rutina);
                }
                await this.saveRoutine(targetId, routineCopy);
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

    async getAllExercises(): Promise<any[]> {
        const querySnapshot = await getDocs(collection(db, 'exercises'));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async saveExercise(exerciseId: string, data: any): Promise<void> {
        const ref = doc(db, 'exercises', exerciseId);
        await setDoc(ref, {
            ...data,
            updatedAt: new Date().toISOString()
        }, { merge: true });
    },

    async deleteExercise(exerciseId: string): Promise<void> {
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(doc(db, 'exercises', exerciseId));
    },

    async initializeCatalog(initialData: any[]): Promise<void> {
        // Subir en lotes de 500 (límite de Firestore batch)
        const chunks = [];
        for (let i = 0; i < initialData.length; i += 400) {
            chunks.push(initialData.slice(i, i + 400));
        }

        for (const chunk of chunks) {
            const batch = writeBatch(db);
            chunk.forEach((ex) => {
                // Usar el nombre como ID para fácil lookup o generar uno nuevo
                // Preferible generar ID sanitizando el nombre o usar el ID existente si lo hay
                const id = ex.id || ex.nombre.toLowerCase().replace(/[^a-z0-9]/g, '_');
                const ref = doc(db, 'exercises', id);
                batch.set(ref, ex);
            });
            await batch.commit();
        }
    }
};
