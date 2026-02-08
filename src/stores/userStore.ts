import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LinkRequest } from '../services/firebaseService';

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

export interface MoodLog {
    mood: number; // 1-5 (1: Terrible, 5: Excelente)
    energy: number; // 1-5 (1: Agotado, 5: A tope)
    note?: string;
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
    dia?: string; // Ej: "D?a 1", "Lunes", etc.
    enfocadoA?: 'hombre' | 'mujer' | 'ambos'; // Qui?n debe realizarlo
    nombreOriginal?: string;
    observaciones?: string;
    grupoMuscular?: string; // Ej: "pectoral", "espalda", etc.
    imagen?: string;
    isOptional?: boolean;
}

export interface RutinaUsuario {
    nombre: string;
    duracionSemanas: number;
    ejercicios: EjercicioRutina[];
    fechaInicio: string;
    fechaExpiracion?: string; // Cu?ndo deber?a cambiarse
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
    // Mood/Energy Tracking
    moodPre?: number;  // 1-5
    moodPost?: number; // 1-5
    energyPre?: number; // 1-5
    energyPost?: number; // 1-5
    notePre?: string;
    notePost?: string;
}

export interface AnalysisResult {
    exercises: EjercicioRutina[];
    unclearItems: Clarification[];
    confidence: 'high' | 'medium' | 'low';
    routineName?: string;
    isAI?: boolean;
}

export interface ExtraActivity {
    id: string;
    fecha: string;
    descripcion: string;
    videoUrl?: string;
    analisisIA?: {
        tipoDeporte?: string;
        intensidad?: 'baja' | 'media' | 'alta';
        distanciaKm?: number;
        duracionMinutos?: number;
        calorias?: number;
        notas?: string;
    };
}

export interface PartnerInfo {
    id: string;
    alias: string;
    nombre: string;
}

export interface PerfilCompleto {
    usuario: DatosPersonales;
    pareja: DatosPersonales | null;
    horario: HorarioSemanal;
    rutina: RutinaUsuario | null;
    historial: EntrenamientoRealizado[];
    historialRutinas: RutinaUsuario[];
    onboardingCompletado: boolean;
    partnerId?: string; // Legacy single partner - kept for backward compat
    partners?: PartnerInfo[]; // New: multiple partners
    alias?: string; // Add this
    role?: 'admin' | 'user'; // Rol del usuario
    weeklyTracking?: Record<string, 'completed' | 'skipped' | boolean>; // Tracking de d?as entrenados { '2026-01-29': 'completed' }
    actividadesExtras: ExtraActivity[]; // Extra activities logged
    catalogoExtras: string[]; // Unique activity types discovered
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
        { dia: 'Mi?rcoles', entrena: false, hora: '07:00', grupoMuscular: 'Descanso' },
        { dia: 'Jueves', entrena: true, hora: '07:00', grupoMuscular: 'Hombros' },
        { dia: 'Viernes', entrena: true, hora: '07:00', grupoMuscular: 'Piernas' },
        { dia: 'S?bado', entrena: true, hora: '09:00', grupoMuscular: 'Brazos' },
        { dia: 'Domingo', entrena: false, hora: '09:00', grupoMuscular: 'Descanso' },
    ]
};

export interface SetTracking {
    completed: boolean;
    skipped: boolean;
    weight: number;
    reps: number;
    startTime?: number; // timestamp
    duration?: number; // seconds
    rest?: number; // seconds
}

export interface ExerciseTracking {
    id: string;
    nombre: string;
    targetSeries: number;
    targetReps: string;
    sets: SetTracking[];
    categoria?: 'calentamiento' | 'maquina'; // For separating warmup from main exercises
    isCompleted?: boolean;
    isOptional?: boolean;
    isSkipped?: boolean;
}

export interface ActiveSession {
    startTime: string;
    dayName: string;
    exercises: ExerciseTracking[];
    routineName: string;
    preWorkoutMood?: number;
    preWorkoutEnergy?: number;
    preWorkoutNote?: string;
    isDualSession: boolean;
    partnerExercises: ExerciseTracking[] | null;
    sessionMode: 'solo' | 'shared' | 'linked';
    selectedPartnerId?: string;
    selectedPartnerName?: string;
    trackingDate?: string; // YYYY-MM-DD - which day to mark as completed (defaults to today)
}

interface UserStore {
    userId: string | null;
    perfil: PerfilCompleto;
    activeSession: ActiveSession | null;
    isSyncing: boolean;
    lastSyncError: string | null;
    linkRequests: LinkRequest[];

    setUserId: (id: string | null) => void;
    setIsSyncing: (status: boolean) => void;
    setLastSyncError: (error: string | null) => void;
    setLinkRequests: (requests: LinkRequest[]) => void;
    setDatosPersonales: (datos: Partial<DatosPersonales>) => void;
    setDatosPareja: (datos: DatosPersonales | null) => void;
    setHorario: (horario: HorarioSemanal) => void;
    setRutina: (rutina: RutinaUsuario | null) => void;
    agregarEntrenamiento: (entrenamiento: EntrenamientoRealizado) => void;
    completarOnboarding: () => void;
    getEntrenamientoHoy: () => { entrena: boolean; grupoMuscular: GrupoMuscular; hora: string; dia: string };
    startSession: (dayName: string, exercises: EjercicioRutina[], routineName: string, sessionMode?: 'solo' | 'shared' | 'linked', preWorkoutMood?: number, preWorkoutEnergy?: number, preWorkoutNote?: string, selectedPartner?: PartnerInfo, trackingDate?: string) => void;
    updateSet: (exerciseId: string, setIndex: number, fields: Partial<SetTracking>, isPartner?: boolean) => void;
    skipSet: (exerciseId: string, setIndex: number, isPartner?: boolean) => void;
    replaceExerciseInSession: (oldExerciseId: string, newExercise: EjercicioRutina) => void;
    addExerciseToSession: (newExercise: EjercicioRutina, isPartner?: boolean) => void;
    markExerciseAsCompleted: (exerciseId: string, isPartner?: boolean) => void;
    finishSession: (durationMinutos: number, postWorkoutData?: { mood?: number; energy?: number; note?: string }) => Promise<void>;
    cancelSession: () => void;
    resetear: () => void;
    logout: () => void;
    setPartnerId: (id: string | undefined) => void;
    setPartners: (partners: PartnerInfo[]) => void;
    addPartner: (partner: PartnerInfo) => void;
    removePartner: (partnerId: string) => void;
    setAlias: (alias: string) => void;
    setRole: (role: 'admin' | 'user') => void;
    deleteRoutineFromHistory: (index: number) => void;
    addExtraActivity: (activity: ExtraActivity) => Promise<void>;
    removeExtraActivity: (activityId: string) => Promise<void>;
    removeExtraActivitiesOnDate: (dateStr: string) => Promise<void>;
    getExtraActivitiesCatalog: () => string[];
    skipExercise: (exerciseId: string, isPartner?: boolean) => void;
    setDayTracking: (dateStr: string, status: 'completed' | 'skipped' | null) => void;
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
                actividadesExtras: [],
                catalogoExtras: [],
            },
            activeSession: null,
            isSyncing: false,
            lastSyncError: null,
            linkRequests: [],

            setUserId: (id) => set({ userId: id }),
            setIsSyncing: (status) => set({ isSyncing: status }),
            setLastSyncError: (error) => set({ lastSyncError: error }),
            setLinkRequests: (requests) => set({ linkRequests: requests }),
            setPartnerId: (id) => set((state) => ({
                perfil: { ...state.perfil, partnerId: id }
            })),
            setPartners: (partners) => set((state) => ({
                perfil: { ...state.perfil, partners }
            })),
            addPartner: (partner) => set((state) => {
                const current = state.perfil.partners || [];
                if (current.some(p => p.id === partner.id)) return state;
                return { perfil: { ...state.perfil, partners: [...current, partner] } };
            }),
            removePartner: (partnerId) => set((state) => {
                const current = state.perfil.partners || [];
                return { perfil: { ...state.perfil, partners: current.filter(p => p.id !== partnerId) } };
            }),

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
                const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Mi?rcoles', 'Jueves', 'Viernes', 'S?bado'];
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

            startSession: (dayName, exercises, routineName, sessionMode, preWorkoutMood, preWorkoutEnergy, preWorkoutNote, selectedPartner, trackingDate) => {
                const { perfil } = get();
                
                // Determine session mode
                const hasPartners = (perfil.partners && perfil.partners.length > 0) || !!perfil.partnerId;
                const mode = sessionMode || (hasPartners ? 'shared' : 'solo');
                const isDual = mode === 'shared' || mode === 'linked';

                const createExerciseTracking = (ex: EjercicioRutina): ExerciseTracking => ({
                    id: ex.id,
                    nombre: ex.nombre,
                    targetSeries: ex.series,
                    targetReps: ex.repeticiones,
                    categoria: ex.categoria,
                    isOptional: ex.isOptional,
                    isCompleted: false,
                    sets: Array.from({ length: ex.series }, () => ({
                        completed: false,
                        skipped: false,
                        weight: 0,
                        reps: parseInt(ex.repeticiones) || 10,
                        duration: ex.segundos || 0,
                        rest: ex.descanso || 60
                    }))
                });

                const userExercises = exercises.map(createExerciseTracking);
                const partnerExercises = isDual ? exercises.map(createExerciseTracking) : null;

                set({
                    activeSession: {
                        startTime: new Date().toISOString(),
                        dayName,
                        routineName,
                        preWorkoutMood,
                        preWorkoutEnergy,
                        preWorkoutNote,
                        exercises: userExercises,
                        isDualSession: isDual,
                        partnerExercises: partnerExercises,
                        sessionMode: mode,
                        selectedPartnerId: selectedPartner?.id,
                        selectedPartnerName: selectedPartner?.nombre,
                        trackingDate: trackingDate,
                    }
                });
            },

            updateSet: (exerciseId, setIndex, fields, isPartner = false) => set((state) => {
                if (!state.activeSession) return state;

                const targetArray = isPartner ? state.activeSession.partnerExercises : state.activeSession.exercises;
                if (!targetArray) return state;

                const newExercises = targetArray.map(ex => {
                    if (ex.id !== exerciseId) return ex;
                    const newSets = [...ex.sets];
                    newSets[setIndex] = { ...newSets[setIndex], ...fields };
                    return { ...ex, sets: newSets };
                });

                if (isPartner) {
                    return { activeSession: { ...state.activeSession, partnerExercises: newExercises } };
                } else {
                    return { activeSession: { ...state.activeSession, exercises: newExercises } };
                }
            }),

            skipSet: (exerciseId, setIndex, isPartner = false) => set((state) => {
                if (!state.activeSession) return state;

                const targetArray = isPartner ? state.activeSession.partnerExercises : state.activeSession.exercises;
                if (!targetArray) return state;

                const newExercises = targetArray.map(ex => {
                    if (ex.id !== exerciseId) return ex;
                    const newSets = [...ex.sets];
                    newSets[setIndex] = { ...newSets[setIndex], skipped: true, completed: false };
                    return { ...ex, sets: newSets };
                });

                if (isPartner) {
                    return { activeSession: { ...state.activeSession, partnerExercises: newExercises } };
                } else {
                    return { activeSession: { ...state.activeSession, exercises: newExercises } };
                }
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
                        isCompleted: false,
                        sets: Array.from({ length: newExercise.series }, () => ({
                            completed: false,
                            skipped: false,
                            weight: 0,
                            reps: parseInt(newExercise.repeticiones) || 10,
                            duration: newExercise.segundos || 0,
                            rest: newExercise.descanso || 60
                        }))
                    };
                });
                return { activeSession: { ...state.activeSession, exercises: newExercises } };
            }),

            // Add an extra exercise to the current session only (doesn't affect the main routine)
            addExerciseToSession: (newExercise, isPartner = false) => set((state) => {
                if (!state.activeSession) return state;
                const newExerciseTracking = {
                    id: `temp_${Date.now()}_${newExercise.id}`,
                    nombre: newExercise.nombre,
                    targetSeries: newExercise.series,
                    targetReps: newExercise.repeticiones,
                    categoria: newExercise.categoria,
                    isCompleted: false,
                    sets: Array.from({ length: newExercise.series }, () => ({
                        completed: false,
                        skipped: false,
                        weight: 0,
                        reps: parseInt(newExercise.repeticiones) || 10,
                        duration: newExercise.segundos || 0,
                        rest: newExercise.descanso || 60
                    }))
                };
                
                if (isPartner && state.activeSession.partnerExercises) {
                    return {
                        activeSession: {
                            ...state.activeSession,
                            partnerExercises: [...state.activeSession.partnerExercises, newExerciseTracking]
                        }
                    };
                }
                
                return {
                    activeSession: {
                        ...state.activeSession,
                        exercises: [...state.activeSession.exercises, newExerciseTracking]
                    }
                };
            }),

            markExerciseAsCompleted: (exerciseId, isPartner = false) => set((state) => {
                if (!state.activeSession) return state;
                
                if (isPartner && state.activeSession.partnerExercises) {
                    return {
                        activeSession: {
                            ...state.activeSession,
                            partnerExercises: state.activeSession.partnerExercises.map(ex =>
                                ex.id === exerciseId ? { ...ex, isCompleted: true } : ex
                            )
                        }
                    };
                }
                
                return {
                    activeSession: {
                        ...state.activeSession,
                        exercises: state.activeSession.exercises.map(ex =>
                            ex.id === exerciseId ? { ...ex, isCompleted: true } : ex
                        )
                    }
                };
            }),

            skipExercise: (exerciseId, isPartner = false) => set((state) => {
                if (!state.activeSession) return state;
                
                if (isPartner && state.activeSession.partnerExercises) {
                    return {
                        activeSession: {
                            ...state.activeSession,
                            partnerExercises: state.activeSession.partnerExercises.map(ex =>
                                ex.id === exerciseId ? { ...ex, isSkipped: true } : ex
                            )
                        }
                    };
                }
                
                return {
                    activeSession: {
                        ...state.activeSession,
                        exercises: state.activeSession.exercises.map(ex =>
                            ex.id === exerciseId ? { ...ex, isSkipped: true } : ex
                        )
                    }
                };
            }),

            finishSession: async (durationMinutos, postWorkoutData) => {
                const state = get();
                if (!state.activeSession) return;

                const { firebaseService } = await import('../services/firebaseService');
                const { userId, perfil, activeSession } = state;
                const { isDualSession, partnerExercises } = activeSession;

                // Helper to create a workout object from tracking data
                const createWorkoutFromExercises = (trackedExercises: ExerciseTracking[]): EntrenamientoRealizado => ({
                    id: `${new Date().toISOString()}-${Math.random().toString(36).substr(2, 9)}`,
                    fecha: new Date().toISOString(),
                    duracionMinutos: durationMinutos,
                    nombre: `${activeSession.dayName} - ${activeSession.routineName}`,
                    moodPre: activeSession.preWorkoutMood,
                    moodPost: postWorkoutData?.mood,
                    energyPre: activeSession.preWorkoutEnergy,
                    energyPost: postWorkoutData?.energy,
                    notePre: activeSession.preWorkoutNote,
                    notePost: postWorkoutData?.note,
                    ejercicios: trackedExercises.map(ex => ({
                        nombre: ex.nombre,
                        sets: ex.sets
                            .filter(s => s.completed || (s.weight > 0 || s.reps > 0))
                            .map((s, i) => ({
                                numero: i + 1,
                                reps: s.reps,
                                peso: s.weight
                            }))
                    })).filter(ex => ex.sets.length > 0)
                });

                // Create workout for the main user
                const userWorkout = createWorkoutFromExercises(activeSession.exercises);

                // Save main user's workout
                if (userId) {
                    try {
                        await firebaseService.addWorkout(userId, userWorkout);
                        set((s) => ({
                            perfil: { ...s.perfil, historial: [userWorkout, ...s.perfil.historial] }
                        }));
                    } catch (e) {
                        console.error("Failed to save user workout to cloud", e);
                    }
                }

                // If it's a dual session, create and save partner's workout
                const partnerTargetId = activeSession.selectedPartnerId || perfil.partnerId;
                if (isDualSession && partnerExercises && partnerTargetId) {
                    const partnerWorkout = createWorkoutFromExercises(partnerExercises);
                    try {
                        // Note: We use addWorkoutToPartner, which just calls addWorkout with the partner's ID
                        await firebaseService.addWorkoutToPartner(partnerTargetId, partnerWorkout);
                    } catch (e) {
                        console.error("Failed to save partner workout to cloud", e);
                    }
                }

                // Final state update
                set((s) => {
                    const newTracking = { ...(s.perfil.weeklyTracking || {}) };
                    // Use trackingDate if set (user chose a specific day), otherwise use today
                    const dateKey = activeSession.trackingDate || userWorkout.fecha.split('T')[0];
                    newTracking[dateKey] = 'completed';

                    return {
                        perfil: {
                            ...s.perfil,
                            weeklyTracking: newTracking,
                        },
                        activeSession: null
                    };
                });

                // Explicitly save the updated profile to Firebase to persist weekly tracking
                if (userId) {
                    try {
                        await firebaseService.saveProfile(userId, get().perfil);
                    } catch (e) {
                        console.error("Failed to sync profile after workout completion", e);
                    }
                }
            },

            setDayTracking: (dateStr, status) => {
                set((state) => {
                    const newTracking = { ...(state.perfil.weeklyTracking || {}) };
                    if (status === null) {
                        delete newTracking[dateStr];
                    } else {
                        newTracking[dateStr] = status;
                    }
                    return {
                        perfil: {
                            ...state.perfil,
                            weeklyTracking: newTracking
                        }
                    };
                });

                const { userId } = get();
                if (userId) {
                    void (async () => {
                        try {
                            const { firebaseService } = await import('../services/firebaseService');
                            await firebaseService.saveProfile(userId, get().perfil);
                        } catch (error) {
                            console.error('Error syncing day tracking:', error);
                        }
                    })();
                }
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
                    actividadesExtras: [],
                    catalogoExtras: [],
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
                    actividadesExtras: [],
                    catalogoExtras: [],
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

            setAlias: (alias) => set((state) => ({
                perfil: { ...state.perfil, alias }
            })),

            setRole: (role) => set((state) => ({
                perfil: { ...state.perfil, role }
            })),

            addExtraActivity: async (activity: ExtraActivity) => {
                // 1. Optimistic update
                set((state) => {
                    const currentActivities = state.perfil.actividadesExtras || [];
                    const currentCatalog = state.perfil.catalogoExtras || [];

                    const newActivities = [...currentActivities, activity];
                    const sportType = activity.analisisIA?.tipoDeporte;
                    const updatedCatalog = sportType && !currentCatalog.includes(sportType)
                        ? [...currentCatalog, sportType]
                        : currentCatalog;

                    // Also mark the day as completed in tracking
                    const newTracking = { ...(state.perfil.weeklyTracking || {}) };
                    if (activity.fecha) {
                        const dateKey = activity.fecha.split('T')[0];
                        newTracking[dateKey] = 'completed';
                    }

                    return {
                        perfil: {
                            ...state.perfil,
                            actividadesExtras: newActivities,
                            catalogoExtras: updatedCatalog,
                            weeklyTracking: newTracking
                        }
                    };
                });

                // 2. Persist to Firebase
                const { userId, perfil } = get();
                if (userId) {
                    try {
                        const { firebaseService } = await import('../services/firebaseService');
                        await firebaseService.saveExtraActivity(userId, activity);
                        await firebaseService.saveProfile(userId, perfil);
                    } catch (error) {
                        console.error('Error syncing extra activity:', error);
                    }
                }
            },

            removeExtraActivity: async (activityId: string) => {
                const { userId, perfil } = get();
                const activityToDelete = perfil.actividadesExtras.find(a => a.id === activityId);
                if (!activityToDelete) return;

                // 1. Optimistic Update
                set((state) => {
                    const newActivities = state.perfil.actividadesExtras.filter(a => a.id !== activityId);

                    // Check if there are other activities or workouts on that same date to keep weeklyTracking
                    const dateKey = activityToDelete.fecha.split('T')[0];
                    const otherOnSameDay = newActivities.some(a => a.fecha.split('T')[0] === dateKey) ||
                        state.perfil.historial.some(h => h.fecha.split('T')[0] === dateKey);

                    const newTracking = { ...state.perfil.weeklyTracking };
                    if (!otherOnSameDay) {
                        delete newTracking[dateKey];
                    }

                    return {
                        perfil: {
                            ...state.perfil,
                            actividadesExtras: newActivities,
                            weeklyTracking: newTracking
                        }
                    };
                });

                // 2. Persist to Firebase
                if (userId) {
                    try {
                        const { firebaseService } = await import('../services/firebaseService');
                        await firebaseService.deleteExtraActivity(userId, activityId);
                        // Also update profile if tracking changed
                        const updatedProfile = get().perfil;
                        await firebaseService.saveProfile(userId, updatedProfile);
                    } catch (error) {
                        console.error('Error removing extra activity:', error);
                    }
                }
            },

            removeExtraActivitiesOnDate: async (dateStr: string) => {
                const { userId, perfil } = get();
                const activitiesToDelete = perfil.actividadesExtras.filter(a => a.fecha.split('T')[0] === dateStr);

                if (activitiesToDelete.length === 0 && !perfil.weeklyTracking?.[dateStr]) return;

                // 1. Optimistic Update
                set((state) => {
                    const newTracking = { ...state.perfil.weeklyTracking };
                    const hasWorkout = state.perfil.historial.some(h => h.fecha.split('T')[0] === dateStr);
                    if (!hasWorkout) {
                        delete newTracking[dateStr];
                    }

                    const newActivities = state.perfil.actividadesExtras.filter(a => a.fecha.split('T')[0] !== dateStr);

                    return {
                        perfil: {
                            ...state.perfil,
                            weeklyTracking: newTracking,
                            actividadesExtras: newActivities
                        }
                    };
                });

                // 2. Persist to Firebase
                if (userId) {
                    try {
                        const { firebaseService } = await import('../services/firebaseService');
                        // Update Profile (for weeklyTracking)
                        const updatedProfile = get().perfil;
                        await firebaseService.saveProfile(userId, updatedProfile);

                        // Delete extra activity documents
                        await Promise.all(activitiesToDelete.map(activity =>
                            firebaseService.deleteExtraActivity(userId, activity.id)
                        ));
                    } catch (error) {
                        console.error('Error removing extra activity:', error);
                    }
                }
            },

            getExtraActivitiesCatalog: () => {
                const state = get();
                return state.perfil.catalogoExtras;
            }
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

