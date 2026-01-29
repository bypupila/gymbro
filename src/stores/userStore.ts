// =====================================================
// GymBro PWA - User Store (Zustand)
// =====================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export type NivelExperiencia = 'principiante' | 'intermedio' | 'avanzado';
export type ObjetivoFitness = 'ganar_musculo' | 'perder_grasa' | 'mantener' | 'fuerza' | 'resistencia';
export type GrupoMuscular = 'Pecho' | 'Espalda' | 'Hombros' | 'Brazos' | 'Piernas' | 'Core' | 'Full Body' | 'Descanso';

export interface DatosPersonales {
    nombre: string;
    edad: number;
    peso: number;
    altura: number;
    nivel: NivelExperiencia;
    objetivo: ObjetivoFitness;
    lesiones: string;
    avatar?: string;
}

export interface DiaEntrenamiento {
    dia: string;
    entrena: boolean;
    hora: string;
    grupoMuscular: GrupoMuscular;
}

export interface HorarioSemanal {
    dias: DiaEntrenamiento[];
}

export interface EjercicioRutina {
    id: string;
    nombre: string;
    series: number;
    repeticiones: string;
    segundos?: number;
    descanso: number;
    categoria: 'calentamiento' | 'maquina';
    dia?: string; // Ej: "Día 1", "Lunes", etc.
    enfocadoA?: 'hombre' | 'mujer' | 'ambos'; // Quién debe realizarlo
    nombreOriginal?: string;
    observaciones?: string;
    grupoMuscular?: string; // Ej: "pectoral", "espalda", etc.
    imagen?: string;
}

export interface RutinaUsuario {
    nombre: string;
    duracionSemanas: number;
    ejercicios: EjercicioRutina[];
    fechaInicio: string;
    fechaExpiracion?: string; // Cuándo debería cambiarse
    analizadaPorIA: boolean;
}

export interface Clarification {
    id: string;
    exerciseIndex?: number;
    field?: keyof EjercicioRutina;
    question: string;
    detectedValue?: string;
    options?: string[];
}

export interface SetRealizado {
    numero: number;
    reps: number;
    peso: number;
}

export interface EjercicioRealizado {
    nombre: string;
    sets: SetRealizado[];
}

export interface EntrenamientoRealizado {
    id: string; // ISO Date + ID
    fecha: string;
    duracionMinutos: number;
    nombre: string;
    ejercicios: EjercicioRealizado[];
}

export interface AnalysisResult {
    exercises: EjercicioRutina[];
    unclearItems: Clarification[];
    confidence: 'high' | 'medium' | 'low';
    routineName?: string;
    isAI?: boolean;
}

export interface PerfilCompleto {
    usuario: DatosPersonales;
    pareja: DatosPersonales | null;
    horario: HorarioSemanal;
    rutina: RutinaUsuario | null;
    historial: EntrenamientoRealizado[];
    historialRutinas: RutinaUsuario[];
    onboardingCompletado: boolean;
    partnerId?: string; // New field for Cloud ID
    alias?: string; // Add this
    role?: 'admin' | 'user'; // Rol del usuario
    weeklyTracking?: Record<string, boolean>; // Tracking de días entrenados { '2026-01-29': true }
}

const datosIniciales: DatosPersonales = {
    nombre: '',
    edad: 0,
    peso: 0,
    altura: 0,
    nivel: 'principiante',
    objetivo: 'ganar_musculo',
    lesiones: '',
};

const horarioInicial: HorarioSemanal = {
    dias: [
        { dia: 'Lunes', entrena: true, hora: '07:00', grupoMuscular: 'Pecho' },
        { dia: 'Martes', entrena: true, hora: '07:00', grupoMuscular: 'Espalda' },
        { dia: 'Miércoles', entrena: false, hora: '07:00', grupoMuscular: 'Descanso' },
        { dia: 'Jueves', entrena: true, hora: '07:00', grupoMuscular: 'Hombros' },
        { dia: 'Viernes', entrena: true, hora: '07:00', grupoMuscular: 'Piernas' },
        { dia: 'Sábado', entrena: true, hora: '09:00', grupoMuscular: 'Brazos' },
        { dia: 'Domingo', entrena: false, hora: '09:00', grupoMuscular: 'Descanso' },
    ]
};

export interface SetTracking {
    completed: boolean;
    skipped: boolean;
    weight: number;
    reps: number;
}

export interface ExerciseTracking {
    id: string;
    nombre: string;
    targetSeries: number;
    targetReps: string;
    sets: SetTracking[];
    categoria?: 'calentamiento' | 'maquina'; // For separating warmup from main exercises
}

export interface ActiveSession {
    startTime: string;
    dayName: string;
    exercises: ExerciseTracking[];
    routineName: string;
}

interface UserStore {
    userId: string | null;
    perfil: PerfilCompleto;
    activeSession: ActiveSession | null;
    isSyncing: boolean;
    lastSyncError: string | null;

    setUserId: (id: string | null) => void;
    setIsSyncing: (status: boolean) => void;
    setLastSyncError: (error: string | null) => void;
    setDatosPersonales: (datos: Partial<DatosPersonales>) => void;
    setDatosPareja: (datos: DatosPersonales | null) => void;
    setHorario: (horario: HorarioSemanal) => void;
    setRutina: (rutina: RutinaUsuario | null) => void;
    agregarEntrenamiento: (entrenamiento: EntrenamientoRealizado) => void;
    completarOnboarding: () => void;
    getEntrenamientoHoy: () => { entrena: boolean; grupoMuscular: GrupoMuscular; hora: string; dia: string };
    startSession: (dayName: string, exercises: EjercicioRutina[], routineName: string) => void;
    updateSet: (exerciseId: string, setIndex: number, fields: Partial<SetTracking>) => void;
    skipSet: (exerciseId: string, setIndex: number) => void;
    replaceExerciseInSession: (oldExerciseId: string, newExercise: EjercicioRutina) => void;
    addExerciseToSession: (newExercise: EjercicioRutina) => void;
    finishSession: (durationMinutos: number) => Promise<void>;
    cancelSession: () => void;
    resetear: () => void;
    logout: () => void;
    setPartnerId: (id: string | undefined) => void;
    deleteRoutineFromHistory: (index: number) => void;
}

export const useUserStore = create<UserStore>()(
    persist(
        (set, get) => ({
            userId: null,
            perfil: {
                usuario: datosIniciales,
                pareja: null,
                horario: horarioInicial,
                rutina: null,
                historial: [],
                historialRutinas: [],
                onboardingCompletado: false,
                preferredModel: 'gemini-flash-latest',
            },
            activeSession: null,
            isSyncing: false,
            lastSyncError: null,

            setUserId: (id) => set({ userId: id }),
            setIsSyncing: (status) => set({ isSyncing: status }),
            setLastSyncError: (error) => set({ lastSyncError: error }),
            setPartnerId: (id) => set((state) => ({
                perfil: { ...state.perfil, partnerId: id }
            })),

            setDatosPersonales: (datos) => set((state) => ({
                perfil: {
                    ...state.perfil,
                    usuario: { ...state.perfil.usuario, ...datos }
                }
            })),

            setDatosPareja: (datos) => set((state) => ({
                perfil: { ...state.perfil, pareja: datos }
            })),

            setHorario: (horario) => set((state) => ({
                perfil: { ...state.perfil, horario }
            })),

            setRutina: (rutina) => set((state) => {
                const historialPrevio = [...state.perfil.historialRutinas];
                const rutinaActual = state.perfil.rutina;

                // Si hay una rutina actual y es diferente a la nueva, la guardamos en el historial
                if (rutinaActual && rutina) {
                    historialPrevio.push(rutinaActual);
                }

                if (rutina) {
                    // Aplicar versionado: "Rutina VX - [Nombre]"
                    const version = historialPrevio.length + 1;
                    const prefijo = `Rutina V${version}`;
                    if (!rutina.nombre.startsWith('Rutina V')) {
                        rutina.nombre = `${prefijo} - ${rutina.nombre}`;
                    }
                }

                return {
                    perfil: {
                        ...state.perfil,
                        rutina,
                        historialRutinas: historialPrevio
                    }
                };
            }),

            agregarEntrenamiento: (entrenamiento) => set((state) => ({
                perfil: {
                    ...state.perfil,
                    historial: [entrenamiento, ...state.perfil.historial]
                }
            })),

            completarOnboarding: () => set((state) => ({
                perfil: { ...state.perfil, onboardingCompletado: true }
            })),

            getEntrenamientoHoy: () => {
                const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                const hoyIndex = new Date().getDay();
                const diaNombre = diasSemana[hoyIndex];

                const diaHoy = get().perfil.horario.dias.find(d =>
                    d.dia.toLowerCase() === diaNombre.toLowerCase()
                );

                if (diaHoy) {
                    return {
                        entrena: diaHoy.entrena,
                        grupoMuscular: diaHoy.grupoMuscular,
                        hora: diaHoy.hora,
                        dia: diaHoy.dia // 'Lunes', 'Martes', etc.
                    };
                }

                return { entrena: false, grupoMuscular: 'Descanso' as GrupoMuscular, hora: '', dia: diaNombre };
            },

            startSession: (dayName, exercises, routineName) => set((state) => ({
                activeSession: {
                    startTime: new Date().toISOString(),
                    dayName,
                    routineName,
                    exercises: exercises.map(ex => ({
                        id: ex.id,
                        nombre: ex.nombre,
                        targetSeries: ex.series,
                        targetReps: ex.repeticiones,
                        categoria: ex.categoria, // Include category for warmup/main separation
                        sets: Array.from({ length: ex.series }, (_, i) => ({
                            completed: false,
                            skipped: false,
                            weight: 0,
                            reps: parseInt(ex.repeticiones) || 10
                        }))
                    }))
                }
            })),

            updateSet: (exerciseId, setIndex, fields) => set((state) => {
                if (!state.activeSession) return state;
                const newExercises = state.activeSession.exercises.map(ex => {
                    if (ex.id !== exerciseId) return ex;
                    const newSets = [...ex.sets];
                    newSets[setIndex] = { ...newSets[setIndex], ...fields };
                    return { ...ex, sets: newSets };
                });
                return { activeSession: { ...state.activeSession, exercises: newExercises } };
            }),

            skipSet: (exerciseId, setIndex) => set((state) => {
                if (!state.activeSession) return state;
                const newExercises = state.activeSession.exercises.map(ex => {
                    if (ex.id !== exerciseId) return ex;
                    const newSets = [...ex.sets];
                    newSets[setIndex] = { ...newSets[setIndex], skipped: true, completed: false };
                    return { ...ex, sets: newSets };
                });
                return { activeSession: { ...state.activeSession, exercises: newExercises } };
            }),

            // Replace an exercise in the current session only (doesn't affect the main routine)
            replaceExerciseInSession: (oldExerciseId, newExercise) => set((state) => {
                if (!state.activeSession) return state;
                const newExercises = state.activeSession.exercises.map(ex => {
                    if (ex.id !== oldExerciseId) return ex;
                    return {
                        id: `temp_${Date.now()}_${newExercise.id}`,
                        nombre: newExercise.nombre,
                        targetSeries: newExercise.series,
                        targetReps: newExercise.repeticiones,
                        categoria: newExercise.categoria,
                        sets: Array.from({ length: newExercise.series }, () => ({
                            completed: false,
                            skipped: false,
                            weight: 0,
                            reps: parseInt(newExercise.repeticiones) || 10
                        }))
                    };
                });
                return { activeSession: { ...state.activeSession, exercises: newExercises } };
            }),

            // Add an extra exercise to the current session only (doesn't affect the main routine)
            addExerciseToSession: (newExercise) => set((state) => {
                if (!state.activeSession) return state;
                const newExerciseTracking = {
                    id: `temp_${Date.now()}_${newExercise.id}`,
                    nombre: newExercise.nombre,
                    targetSeries: newExercise.series,
                    targetReps: newExercise.repeticiones,
                    categoria: newExercise.categoria,
                    sets: Array.from({ length: newExercise.series }, () => ({
                        completed: false,
                        skipped: false,
                        weight: 0,
                        reps: parseInt(newExercise.repeticiones) || 10
                    }))
                };
                return {
                    activeSession: {
                        ...state.activeSession,
                        exercises: [...state.activeSession.exercises, newExerciseTracking]
                    }
                };
            }),

            finishSession: async (durationMinutos) => {
                const state = get();
                if (!state.activeSession) return;

                const realizado: EntrenamientoRealizado = {
                    id: `${new Date().toISOString()}-${Math.random().toString(36).substr(2, 9)}`,
                    fecha: new Date().toISOString(),
                    duracionMinutos: durationMinutos,
                    nombre: `${state.activeSession.dayName} - ${state.activeSession.routineName}`,
                    ejercicios: state.activeSession.exercises.map(ex => ({
                        nombre: ex.nombre,
                        sets: ex.sets
                            .filter(s => s.completed)
                            .map((s, i) => ({
                                numero: i + 1,
                                reps: s.reps,
                                peso: s.weight
                            }))
                    })).filter(ex => ex.sets.length > 0)
                };

                // Sync with Partner if exists
                if (state.perfil.partnerId) {
                    console.log("Syncing workout to partner:", state.perfil.partnerId);
                    // Import dynamically to avoid circular dependencies
                    try {
                        const { firebaseService } = await import('../services/firebaseService');
                        await firebaseService.addWorkoutToPartner(state.perfil.partnerId, realizado);
                    } catch (e) {
                        console.error("Failed to sync to partner", e);
                    }
                }

                set((state) => ({
                    perfil: {
                        ...state.perfil,
                        historial: [realizado, ...state.perfil.historial]
                    },
                    activeSession: null
                }));
            },

            cancelSession: () => set({ activeSession: null }),

            resetear: () => set({
                perfil: {
                    usuario: datosIniciales,
                    pareja: null,
                    horario: horarioInicial,
                    rutina: null,
                    historial: [],
                    historialRutinas: [],
                    onboardingCompletado: false,
                }
            }),

            logout: () => set({
                userId: null,
                perfil: {
                    usuario: datosIniciales,
                    pareja: null,
                    horario: horarioInicial,
                    rutina: null,
                    historial: [],
                    historialRutinas: [],
                    onboardingCompletado: false,

                },
                activeSession: null
            }),

            deleteRoutineFromHistory: (index) => set((state) => {
                const newHistory = [...state.perfil.historialRutinas];
                newHistory.splice(index, 1);
                return {
                    perfil: {
                        ...state.perfil,
                        historialRutinas: newHistory
                    }
                };
            }),
        }),
        {
            name: 'gymbro-user-auth',
            partialize: (state) => ({
                userId: state.userId,
                perfil: state.perfil
            }),
        }
    )
);

export default useUserStore;
