import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { liveSessionService, GranularLiveUpdate } from '../services/liveSessionService';
import { firebaseService, type LinkRequest } from '../services/firebaseService';

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
    id: string; // Unique ID for the routine
    nombre: string;
    duracionSemanas: number;
    ejercicios: EjercicioRutina[];
    fechaInicio: string;
    fechaExpiracion?: string; // Cu?ndo deber?a cambiarse
    analizadaPorIA: boolean;
    isDefault?: boolean; // New: indicates if this is the default routine
    syncMeta?: {
        syncId: string;
        version: number;
        updatedBy: string;
        updatedAt: string;
    };
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
    partnerIds?: string[]; // Fast membership checks for security rules
    activePartnerId?: string | null;
    routineSync?: {
        enabled: boolean;
        partnerId: string | null;
        mode: 'manual' | 'auto';
        syncId: string | null;
        updatedAt: string;
    };
    linkSetupPendingPartnerId?: string | null;
    alias?: string; // Add this
    role?: 'admin' | 'user'; // Rol del usuario
    weeklyTracking?: Record<string, 'completed' | 'skipped' | boolean>; // Tracking de d?as entrenados { '2026-01-29': 'completed' }
    actividadesExtras: ExtraActivity[]; // Extra activities logged
    catalogoExtras: string[]; // Unique activity types discovered
    defaultRoutineId?: string; // New: ID of the default routine
    updatedAt?: string;
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
        { dia: 'Miercoles', entrena: false, hora: '07:00', grupoMuscular: 'Descanso' },
        { dia: 'Jueves', entrena: true, hora: '07:00', grupoMuscular: 'Hombros' },
        { dia: 'Viernes', entrena: true, hora: '07:00', grupoMuscular: 'Piernas' },
        { dia: 'Sabado', entrena: true, hora: '09:00', grupoMuscular: 'Brazos' },
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
    imagen?: string;
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
    liveSessionId?: string;
}

interface UserStore {
    userId: string | null;
    perfil: PerfilCompleto;
    activeSession: ActiveSession | null;
    isSyncing: boolean;
    lastSyncError: string | null;
    linkRequests: LinkRequest[];
    pendingSave: boolean;

    setUserId: (id: string | null) => void;
    setIsSyncing: (status: boolean) => void;
    setLastSyncError: (error: string | null) => void;
    setLinkRequests: (requests: LinkRequest[]) => void;
    setPendingSave: (pending: boolean) => void;
    setDatosPersonales: (datos: Partial<DatosPersonales>) => void;
    setDatosPareja: (datos: DatosPersonales | null) => void;
    setHorario: (horario: HorarioSemanal) => void;
    setRutina: (rutina: RutinaUsuario | null) => void;
    agregarEntrenamiento: (entrenamiento: EntrenamientoRealizado) => void;
    completarOnboarding: () => void;
    getEntrenamientoHoy: () => { entrena: boolean; grupoMuscular: GrupoMuscular; hora: string; dia: string };
    startSession: (dayName: string, exercises: EjercicioRutina[], routineName: string, sessionMode?: 'solo' | 'shared' | 'linked', preWorkoutMood?: number, preWorkoutEnergy?: number, preWorkoutNote?: string, selectedPartner?: PartnerInfo, trackingDate?: string, liveSessionId?: string) => void;
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
    setActivePartnerId: (id: string | null) => void;
    setPartners: (partners: PartnerInfo[]) => void;
    addPartner: (partner: PartnerInfo) => void;
    removePartner: (partnerId: string) => void;
    setRoutineSync: (sync: PerfilCompleto['routineSync']) => void;
    setLinkSetupPendingPartnerId: (partnerId: string | null) => void;
    setAlias: (alias: string) => void;
    setRole: (role: 'admin' | 'user') => void;
    deleteRoutineFromHistory: (index: number) => void;
    addExtraActivity: (activity: ExtraActivity) => Promise<void>;
    removeExtraActivity: (activityId: string) => Promise<void>;
    removeExtraActivitiesOnDate: (dateStr: string) => Promise<void>;
    getExtraActivitiesCatalog: () => string[];
    skipExercise: (exerciseId: string, isPartner?: boolean) => void;
    setDayTracking: (dateStr: string, status: 'completed' | 'skipped' | null) => void;

    // New routine management functions
    activateRoutine: (routineId: string) => void;
    saveCurrentRoutineToHistory: () => void;
    setDefaultRoutine: (routineId: string | null) => void;
    importRoutine: (routine: RutinaUsuario, activate?: boolean) => void; // New function for importing routines
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
                partnerIds: [],
                activePartnerId: null,
                routineSync: {
                    enabled: false,
                    partnerId: null,
                    mode: 'manual',
                    syncId: null,
                    updatedAt: new Date().toISOString(),
                },
                linkSetupPendingPartnerId: null,
            },
            activeSession: null,
            isSyncing: false,
            lastSyncError: null,
            linkRequests: [],
            pendingSave: false,

            setUserId: (id) => set({ userId: id }),
            setIsSyncing: (status) => set({ isSyncing: status }),
            setLastSyncError: (error) => set({ lastSyncError: error }),
            setLinkRequests: (requests) => set({ linkRequests: requests }),
            setPendingSave: (pending) => set({ pendingSave: pending }),
            setPartnerId: (id) => set((state) => ({
                perfil: {
                    ...state.perfil,
                    partnerId: id,
                    activePartnerId: id || state.perfil.activePartnerId || null,
                    partnerIds: id ? [id] : []
                }
            })),
            setActivePartnerId: (id) => set((state) => ({
                perfil: {
                    ...state.perfil,
                    activePartnerId: id
                }
            })),
            setPartners: (partners) => set((state) => {
                const normalizedPartners = partners.slice(0, 1);
                const nextActivePartnerId = state.perfil.activePartnerId && normalizedPartners.some((p) => p.id === state.perfil.activePartnerId)
                    ? state.perfil.activePartnerId
                    : (normalizedPartners[0]?.id || null);
                const nextRoutineSync = state.perfil.routineSync?.partnerId && !normalizedPartners.some((p) => p.id === state.perfil.routineSync?.partnerId)
                    ? {
                        enabled: false,
                        partnerId: null,
                        mode: 'manual' as const,
                        syncId: null,
                        updatedAt: new Date().toISOString(),
                    }
                    : state.perfil.routineSync;

                return {
                    perfil: {
                        ...state.perfil,
                        partners: normalizedPartners,
                        partnerIds: normalizedPartners.map((p) => p.id),
                        partnerId: normalizedPartners[0]?.id || undefined,
                        activePartnerId: nextActivePartnerId,
                        routineSync: nextRoutineSync,
                    }
                };
            }),
            addPartner: (partner) => set((state) => {
                return {
                    perfil: {
                        ...state.perfil,
                        partners: [partner],
                        partnerId: partner.id,
                        partnerIds: [partner.id],
                        activePartnerId: partner.id,
                        linkSetupPendingPartnerId: partner.id
                    }
                };
            }),
            removePartner: (partnerId) => set((state) => {
                const current = state.perfil.partners || [];
                const nextPartners = current.filter(p => p.id !== partnerId);
                const nextActivePartnerId = state.perfil.activePartnerId === partnerId ? (nextPartners[0]?.id || null) : state.perfil.activePartnerId;
                const nextRoutineSync = state.perfil.routineSync?.partnerId === partnerId
                    ? {
                        enabled: false,
                        partnerId: null,
                        mode: 'manual' as const,
                        syncId: null,
                        updatedAt: new Date().toISOString(),
                    }
                    : state.perfil.routineSync;
                return {
                    perfil: {
                        ...state.perfil,
                        partners: nextPartners,
                        partnerId: nextPartners[0]?.id || undefined,
                        partnerIds: (state.perfil.partnerIds || []).filter((id) => id !== partnerId),
                        activePartnerId: nextActivePartnerId,
                        routineSync: nextRoutineSync,
                        linkSetupPendingPartnerId: state.perfil.linkSetupPendingPartnerId === partnerId ? null : state.perfil.linkSetupPendingPartnerId
                    }
                };
            }),
            setRoutineSync: (routineSync) => set((state) => ({
                perfil: {
                    ...state.perfil,
                    routineSync
                }
            })),
            setLinkSetupPendingPartnerId: (partnerId) => set((state) => ({
                perfil: {
                    ...state.perfil,
                    linkSetupPendingPartnerId: partnerId
                }
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

            setRutina: (newRutina) => set((state) => {
                const historialPrevio = [...state.perfil.historialRutinas];
                const rutinaActual = state.perfil.rutina;
                let updatedDefaultRoutineId = state.perfil.defaultRoutineId;
                const syncState = state.perfil.routineSync;
                const nowIso = new Date().toISOString();

                // If there's an existing active routine, move it to history
                if (rutinaActual) {
                    // Clear its isDefault flag as it's no longer the *active* default
                    const routineToArchive = { ...rutinaActual, isDefault: false };
                    historialPrevio.push(routineToArchive);
                }

                let rutinaParaActivar: RutinaUsuario | null = null;
                if (newRutina) {
                    // Ensure the new routine has an ID. If not, generate one.
                    if (!newRutina.id) {
                        newRutina.id = `routine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    }

                    // Apply versioning if it's a new routine without a version prefix
                    if (!newRutina.nombre.startsWith('Rutina V') && !newRutina.nombre.startsWith('Rutina Compartida')) {
                        const version = historialPrevio.length + 1; // Base version on current history size
                        newRutina.nombre = `Rutina V${version} - ${newRutina.nombre}`;
                    }

                    if (syncState?.enabled && syncState.syncId && syncState.mode === 'auto') {
                        const currentVersion = rutinaActual?.syncMeta?.version || newRutina.syncMeta?.version || 0;
                        newRutina.syncMeta = {
                            syncId: syncState.syncId,
                            version: currentVersion + 1,
                            updatedBy: state.userId || 'unknown',
                            updatedAt: nowIso,
                        };
                    }

                    rutinaParaActivar = newRutina;

                    // If the new routine is marked as default, update the profile's defaultRoutineId
                    if (newRutina.isDefault) {
                        updatedDefaultRoutineId = newRutina.id;
                    } else if (updatedDefaultRoutineId === newRutina.id && !newRutina.isDefault) {
                        // If it was the default, but now it's not, clear defaultRoutineId
                        updatedDefaultRoutineId = undefined;
                    }
                } else {
                    // If no new routine is provided (clearing the current routine), clear default if it was the current one
                    if (rutinaActual && updatedDefaultRoutineId === rutinaActual.id) {
                        updatedDefaultRoutineId = undefined;
                    }
                }

                return {
                    perfil: {
                        ...state.perfil,
                        rutina: rutinaParaActivar,
                        historialRutinas: historialPrevio,
                        defaultRoutineId: updatedDefaultRoutineId
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
                const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
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

            startSession: (dayName, exercises, routineName, sessionMode, preWorkoutMood, preWorkoutEnergy, preWorkoutNote, selectedPartner, trackingDate, liveSessionId) => {
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
                    ...(ex.imagen ? { imagen: ex.imagen } : {}),
                    isOptional: ex.isOptional ?? false,
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
                        liveSessionId,
                    }
                });
            },

            updateSet: (exerciseId, setIndex, fields, isPartner = false) => {
                const state = get();
                if (!state.activeSession) return;

                const targetArray = isPartner ? state.activeSession.partnerExercises : state.activeSession.exercises;
                if (!targetArray) return;

                const newExercises = targetArray.map(ex => {
                    if (ex.id !== exerciseId) return ex;
                    const newSets = [...ex.sets];
                    if (newSets[setIndex]) {
                        newSets[setIndex] = { ...newSets[setIndex], ...fields };
                    }
                    return { ...ex, sets: newSets };
                });

                // Update local state immediately
                set((state) => {
                    if (!state.activeSession) return state; // Should not happen given the check above
                    if (isPartner) {
                        return { activeSession: { ...state.activeSession, partnerExercises: newExercises } };
                    } else {
                        return { activeSession: { ...state.activeSession, exercises: newExercises } };
                    }
                });

                // If it's a linked session and this is the local user's update, send granular update to Firestore
                if (!isPartner && state.activeSession.sessionMode === 'linked' && state.userId && state.activeSession.selectedPartnerId && state.activeSession.liveSessionId) {
                    const sessionId = state.activeSession.liveSessionId;
                    const updatePayload: GranularLiveUpdate = {
                        type: 'SET_UPDATE',
                        exerciseId,
                        setIndex,
                        fields,
                    };
                    void liveSessionService.applyGranularUpdate(sessionId, state.userId, updatePayload).catch(e => {
                        console.error("Failed to send granular SET_UPDATE to liveSessionService:", e);
                    });
                }
            },

            skipSet: (exerciseId, setIndex, isPartner = false) => {
                const state = get();
                if (!state.activeSession) return;

                const targetArray = isPartner ? state.activeSession.partnerExercises : state.activeSession.exercises;
                if (!targetArray) return;

                const newExercises = targetArray.map(ex => {
                    if (ex.id !== exerciseId) return ex;
                    const newSets = [...ex.sets];
                    if (newSets[setIndex]) {
                        newSets[setIndex] = { ...newSets[setIndex], skipped: true, completed: false };
                    }
                    return { ...ex, sets: newSets };
                });

                // Update local state immediately
                set((state) => {
                    if (!state.activeSession) return state;
                    if (isPartner) {
                        return { activeSession: { ...state.activeSession, partnerExercises: newExercises } };
                    } else {
                        return { activeSession: { ...state.activeSession, exercises: newExercises } };
                    }
                });

                // If it's a linked session and this is the local user's update, send granular update to Firestore
                if (!isPartner && state.activeSession.sessionMode === 'linked' && state.userId && state.activeSession.selectedPartnerId && state.activeSession.liveSessionId) {
                    const sessionId = state.activeSession.liveSessionId;
                    const updatePayload: GranularLiveUpdate = {
                        type: 'SET_UPDATE',
                        exerciseId,
                        setIndex,
                        fields: { skipped: true, completed: false },
                    };
                    void liveSessionService.applyGranularUpdate(sessionId, state.userId, updatePayload).catch(e => {
                        console.error("Failed to send granular SET_UPDATE (skipped) to liveSessionService:", e);
                    });
                }
            },

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
                        imagen: newExercise.imagen,
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
                    imagen: newExercise.imagen,
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

            markExerciseAsCompleted: (exerciseId, isPartner = false) => {
                const state = get();
                if (!state.activeSession) return;

                // Update local state immediately
                set((state) => {
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
                });

                // If it's a linked session and this is the local user's update, send granular update to Firestore
                if (!isPartner && state.activeSession.sessionMode === 'linked' && state.userId && state.activeSession.selectedPartnerId && state.activeSession.liveSessionId) {
                    const sessionId = state.activeSession.liveSessionId;
                    const updatePayload: GranularLiveUpdate = {
                        type: 'EXERCISE_COMPLETED',
                        exerciseId,
                    };
                    void liveSessionService.applyGranularUpdate(sessionId, state.userId, updatePayload).catch(e => {
                        console.error("Failed to send granular EXERCISE_COMPLETED to liveSessionService:", e);
                    });
                }
            },

            skipExercise: (exerciseId, isPartner = false) => {
                const state = get();
                if (!state.activeSession) return;

                // Update local state immediately
                set((state) => {
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
                });

                // If it's a linked session and this is the local user's update, send granular update to Firestore
                if (!isPartner && state.activeSession.sessionMode === 'linked' && state.userId && state.activeSession.selectedPartnerId && state.activeSession.liveSessionId) {
                    const sessionId = state.activeSession.liveSessionId;
                    const updatePayload: GranularLiveUpdate = {
                        type: 'EXERCISE_SKIPPED',
                        exerciseId,
                    };
                    void liveSessionService.applyGranularUpdate(sessionId, state.userId, updatePayload).catch(e => {
                        console.error("Failed to send granular EXERCISE_SKIPPED to liveSessionService:", e);
                    });
                }
            },

            finishSession: async (durationMinutos, postWorkoutData) => {
                const state = get();
                if (!state.activeSession) return;

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

                // Profile changes are synced by CloudSyncManager debounced auto-save.
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

                // Profile changes are synced by CloudSyncManager debounced auto-save.
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
                    partnerIds: [],
                    activePartnerId: null,
                    routineSync: {
                        enabled: false,
                        partnerId: null,
                        mode: 'manual',
                        syncId: null,
                        updatedAt: new Date().toISOString(),
                    },
                    linkSetupPendingPartnerId: null,
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
                    partnerIds: [],
                    activePartnerId: null,
                    routineSync: {
                        enabled: false,
                        partnerId: null,
                        mode: 'manual',
                        syncId: null,
                        updatedAt: new Date().toISOString(),
                    },
                    linkSetupPendingPartnerId: null,
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

            activateRoutine: (routineId) => set((state) => {
                const { perfil } = state;
                const newHistory = [...perfil.historialRutinas];
                let routineToActivate: RutinaUsuario | undefined;
                let newCurrentRoutine: RutinaUsuario | null = null;

                // Find and remove the routine to activate from history
                const indexToActivate = newHistory.findIndex(r => r.id === routineId);
                if (indexToActivate !== -1) {
                    routineToActivate = newHistory.splice(indexToActivate, 1)[0];
                }

                // If found, and there's a current routine, move current to history
                if (routineToActivate) {
                    if (perfil.rutina) {
                        // Clear its isDefault flag as it's no longer the *active* default
                        newHistory.push({ ...perfil.rutina, isDefault: false });
                    }
                    newCurrentRoutine = routineToActivate;
                } else {
                    // Check if the current routine is the one to activate
                    if (perfil.rutina && perfil.rutina.id === routineId) {
                        newCurrentRoutine = perfil.rutina;
                    }
                }

                if (!newCurrentRoutine) {
                    console.warn(`Routine with ID ${routineId} not found in history or as current.`);
                    return state; // No change if routine not found
                }

                // Update defaultRoutineId if the activated routine is default
                let updatedDefaultRoutineId = perfil.defaultRoutineId;
                if (newCurrentRoutine.isDefault) {
                    updatedDefaultRoutineId = newCurrentRoutine.id;
                } else if (updatedDefaultRoutineId === newCurrentRoutine.id) {
                    // If it was default, but now is not marked, clear it
                    updatedDefaultRoutineId = undefined;
                }


                return {
                    perfil: {
                        ...perfil,
                        rutina: newCurrentRoutine,
                        historialRutinas: newHistory,
                        defaultRoutineId: updatedDefaultRoutineId
                    }
                };
            }),

            saveCurrentRoutineToHistory: () => set((state) => {
                const { perfil } = state;
                const rutinaActual = perfil.rutina;
                const newHistory = [...perfil.historialRutinas];
                let updatedDefaultRoutineId = perfil.defaultRoutineId;

                if (rutinaActual) {
                    // Clear its isDefault flag as it's no longer the *active* default
                    newHistory.push({ ...rutinaActual, isDefault: false });

                    // If the routine being saved was the default, clear the default ID
                    if (updatedDefaultRoutineId === rutinaActual.id) {
                        updatedDefaultRoutineId = undefined;
                    }
                } else {
                    console.warn("No active routine to save to history.");
                    return state;
                }

                return {
                    perfil: {
                        ...perfil,
                        rutina: null, // Clear the current active routine
                        historialRutinas: newHistory,
                        defaultRoutineId: updatedDefaultRoutineId
                    }
                };
            }),

            setDefaultRoutine: (routineId) => set((state) => {
                const { perfil } = state;
                let newCurrentRoutine = perfil.rutina ? { ...perfil.rutina } : null;
                const newHistory = perfil.historialRutinas.map(r => ({ ...r, isDefault: false })); // Clear all existing default flags

                let newDefaultRoutineId: string | undefined = undefined;

                if (routineId) {
                    // Try to find in current routine
                    if (newCurrentRoutine && newCurrentRoutine.id === routineId) {
                        newCurrentRoutine.isDefault = true;
                        newDefaultRoutineId = routineId;
                    } else {
                        // Try to find in history
                        const foundInHistoryIndex = newHistory.findIndex(r => r.id === routineId);
                        if (foundInHistoryIndex !== -1) {
                            newHistory[foundInHistoryIndex].isDefault = true;
                            newDefaultRoutineId = routineId;
                        } else {
                            console.warn(`Routine with ID ${routineId} not found to set as default.`);
                        }
                    }
                } else {
                    // Clear default
                    if (newCurrentRoutine) newCurrentRoutine.isDefault = false;
                }

                return {
                    perfil: {
                        ...perfil,
                        rutina: newCurrentRoutine,
                        historialRutinas: newHistory,
                        defaultRoutineId: newDefaultRoutineId
                    }
                };
            }),

            importRoutine: (routine, activate = false) => {
                set((state) => {
                    const { perfil } = state;
                    const newHistory = [...perfil.historialRutinas];

                    // Ensure the imported routine has a unique ID and is not marked as default initially
                    const importedRoutine: RutinaUsuario = {
                        ...routine,
                        id: routine.id || `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        isDefault: false, // Imported routine should not be default automatically
                        nombre: `Importada - ${routine.nombre}` // Prefix to distinguish imported routines
                    };

                    // Check for duplicates before adding
                    if (!newHistory.some(r => r.id === importedRoutine.id)) {
                        newHistory.push(importedRoutine);
                    } else {
                        console.warn(`Routine with ID ${importedRoutine.id} already exists in history. Skipping import.`);
                    }

                    return {
                        perfil: {
                            ...perfil,
                            historialRutinas: newHistory
                        }
                    };
                });

                if (activate) {
                    // Activate the routine if requested
                    get().activateRoutine(routine.id || `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
                }
            },

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
                const { userId } = get();
                if (userId) {
                    try {
                        await firebaseService.saveExtraActivity(userId, activity);
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
                        await firebaseService.deleteExtraActivity(userId, activityId);
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

