import {
    doc, setDoc, getDoc, collection, addDoc, query,
    orderBy, limit, getDocs, onSnapshot, writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { PerfilCompleto, EntrenamientoRealizado, RutinaUsuario } from '../stores/userStore';

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
            updatedAt: new Date().toISOString(),
        });
    },

    async getProfile(userId: string): Promise<PerfilCompleto | null> {
        const profileRef = doc(db, 'users', userId, 'profile', 'main');
        const profileSnap = await getDoc(profileRef);

        if (!profileSnap.exists()) return null;

        const data = profileSnap.data();

        // Cargar historial y rutinas
        const historial = await this.getWorkouts(userId);
        const historialRutinas = await this.getRoutineHistory(userId);

        return {
            usuario: data.usuario,
            pareja: data.pareja,
            horario: data.horario,
            rutina: data.rutina,
            historial,
            historialRutinas,
            onboardingCompletado: data.onboardingCompletado,
            partnerId: data.partnerId,
        };
    },

    // Real-time listener para sync automático
    onProfileChange(userId: string, callback: (profile: PerfilCompleto | null) => void) {
        const profileRef = doc(db, 'users', userId, 'profile', 'main');
        return onSnapshot(profileRef, async (snap) => {
            if (!snap.exists()) {
                callback(null);
                return;
            }
            const data = snap.data();
            const historial = await this.getWorkouts(userId);
            const historialRutinas = await this.getRoutineHistory(userId);

            callback({
                usuario: data.usuario,
                pareja: data.pareja,
                horario: data.horario,
                rutina: data.rutina,
                historial,
                historialRutinas,
                onboardingCompletado: data.onboardingCompletado,
                partnerId: data.partnerId,
            });
        });
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
            email: alias, // Using alias as email/primary identifier/display name based on context
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
};
