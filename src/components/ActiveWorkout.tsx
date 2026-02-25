import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useUserStore, ExerciseTracking, ExtraActivity } from '@/stores/userStore';
import Colors from '@/styles/colors';
import {
    Check,
    ChevronLeft,
    Clock,
    Dumbbell,
    Plus,
    Save,
    X,
    ChevronDown,
    ChevronUp,
    SkipForward,
    Play,
    Pause,
    ChevronRight,
    RotateCcw,
    Trash2,
    Shuffle,
    Search
} from 'lucide-react';
import { Card } from './Card';
import { EJERCICIOS_DATABASE, GRUPOS_MUSCULARES, EjercicioBase } from '@/data/exerciseDatabase';
import { getExerciseVideo, getExerciseImage } from '@/data/exerciseMedia';
import { toTrustedExternalVideoUrl } from '@/utils/urlSafety';
import { motion, AnimatePresence } from 'framer-motion';
import { MoodCheckin } from './MoodCheckin';
import { toast } from 'react-hot-toast';
import { liveSessionService } from '@/services/liveSessionService';
import { timerAlertService } from '@/services/timerAlertService';
import { useRenderMetric } from '@/utils/renderMetrics';

interface ActiveWorkoutProps {
    onFinish: () => void;
    onCancel: () => void;
}

type DurationUnit = 's' | 'm' | 'h';

export const ActiveWorkout: React.FC<ActiveWorkoutProps> = ({ onFinish, onCancel }) => {
    useRenderMetric('ActiveWorkout');
    const perfil = useUserStore((state) => state.perfil);
    const activeSession = useUserStore((state) => state.activeSession);
    const updateSet = useUserStore((state) => state.updateSet);
    const finishSession = useUserStore((state) => state.finishSession);
    const cancelSession = useUserStore((state) => state.cancelSession);
    const replaceExerciseInSession = useUserStore((state) => state.replaceExerciseInSession);
    const addExerciseToSession = useUserStore((state) => state.addExerciseToSession);
    const markExerciseAsCompleted = useUserStore((state) => state.markExerciseAsCompleted);
    const addExtraActivity = useUserStore((state) => state.addExtraActivity);
    const skipExercise = useUserStore((state) => state.skipExercise);

    const [duration, setDuration] = useState(0);
    const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
    const [timerSeconds, setTimerSeconds] = useState<number>(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [currentSetIndex, setCurrentSetIndex] = useState<number>(0);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedExercises, setExpandedExercises] = useState<string[]>([]);
    const [showPartnerWidget, setShowPartnerWidget] = useState(false); // New: for linked mode
    const [showPartnerDetailsPanel, setShowPartnerDetailsPanel] = useState(false);
    const [partnerExercises, setPartnerExercises] = useState<ExerciseTracking[] | null>(null); // New: partner's real-time exercises
    const [partnerCurrentExercise, setPartnerCurrentExercise] = useState<string | null>(null); // New: partner's current exercise
    const [guidedMode, setGuidedMode] = useState<{
        active: boolean;
        exerciseId: string | null;
        setIndex: number;
        phase: 'preview' | 'work' | 'rest';
    }>({ active: false, exerciseId: null, setIndex: 0, phase: 'preview' });
    const [guidedWorkTimerStarted, setGuidedWorkTimerStarted] = useState(false);
    const previousTimerRef = useRef<number>(0);
    const restTransitionLockRef = useRef(false);

    // Add Exercise Flow State
    const [selectedExerciseForAdd, setSelectedExerciseForAdd] = useState<EjercicioBase | null>(null);
    const [addConfig, setAddConfig] = useState({
        series: 3,
        repeticiones: '10',
        descanso: 60,
        unit: 'reps'
    });

    // Local state for time units in sets
    const [durationUnits, setDurationUnits] = useState<Record<string, DurationUnit>>({});

    // Completion Modal State
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [completionType, setCompletionType] = useState<'routine' | 'extra' | null>(null);
    // Manual Extra Activity State
    const [extraActivityType, setExtraActivityType] = useState<string>('');
    const [extraActivityDuration, setExtraActivityDuration] = useState<string>('');
    const [extraActivityDistance, setExtraActivityDistance] = useState<string>('');
    const [extraActivityIntensity, setExtraActivityIntensity] = useState<'baja' | 'media' | 'alta'>('media');

    const [isAddingCustom, setIsAddingCustom] = useState(false);
    const [customActivityName, setCustomActivityName] = useState('');

    // Post-Workout Mood State
    const [showMoodCheckin, setShowMoodCheckin] = useState(false);
    const [pendingCompletion, setPendingCompletion] = useState<{
        type: 'routine' | 'extra';
        duration: number;
        extraData?: ExtraActivity;
    } | null>(null);

    // Variant Selection State
    const [variantModalOpen, setVariantModalOpen] = useState(false);
    const [selectedVariantExerciseId, setSelectedVariantExerciseId] = useState<string | null>(null);
    const [variantSearchQuery, setVariantSearchQuery] = useState('');
    const [variantSelectedCategory, setVariantSelectedCategory] = useState<string | null>(null);



    useEffect(() => {
        const timer = setInterval(() => setDuration(d => d + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    // Linked Session: Real-time sync with partner
    useEffect(() => {
        if (!activeSession || activeSession.sessionMode !== 'linked' || !activeSession.selectedPartnerId || !activeSession.liveSessionId) {
            return;
        }

        const { userId } = useUserStore.getState();
        if (!userId) return;

        setShowPartnerWidget(true);

        void liveSessionService.setParticipantOnlineStatus(activeSession.liveSessionId, userId, true).catch(() => undefined);

        const unsubscribePartner = liveSessionService.onPartnerExercisesChange(
            activeSession.liveSessionId,
            activeSession.selectedPartnerId,
            (participant) => {
                if (!participant) {
                    setPartnerExercises(null);
                    setPartnerCurrentExercise(null);
                    return;
                }
                setPartnerExercises(participant.exercises || null);
                setPartnerCurrentExercise(participant.currentExerciseId || null);
            }
        );

        return () => {
            unsubscribePartner();
            setShowPartnerWidget(false);
            setShowPartnerDetailsPanel(false);
            void liveSessionService.setParticipantOnlineStatus(activeSession.liveSessionId!, userId, false).catch(() => undefined);
        };
    }, [activeSession]);

    const formatTime = (secs: number) => {
        const mins = Math.floor(secs / 60);
        const s = secs % 60;
        return `${mins}:${s.toString().padStart(2, '0')}`;
    };

    const toggleExpand = (id: string) => {
        setExpandedExercises(prev =>
            prev.includes(id) ? prev.filter(eid => eid !== id) : [...prev, id]
        );
    };

    // Parse time value from reps string (e.g., "30s" -> 30, "1m" -> 60, "1:30" -> 90)
    const parseTimeSeconds = (reps: string): number => {
        if (!reps) return 0;
        const normalized = reps.trim().toLowerCase();

        // 1. Format MM:SS or HH:MM:SS
        const hmsMatch = normalized.match(/(\d+):(\d+)(?::(\d+))?/);
        if (hmsMatch) {
            if (hmsMatch[3]) { // HH:MM:SS
                return parseInt(hmsMatch[1]) * 3600 + parseInt(hmsMatch[2]) * 60 + parseInt(hmsMatch[3]);
            }
            return parseInt(hmsMatch[1]) * 60 + parseInt(hmsMatch[2]); // MM:SS
        }

        // 2. Check for minutes (min, minutos, m)
        const minMatch = normalized.match(/(\d+)\s*(minutos?|min|m\b)/i);
        if (minMatch) return parseInt(minMatch[1]) * 60;

        // 3. Check for explicit seconds (seg, s, ', ")
        const secMatch = normalized.match(/(\d+)\s*(segundos?|seg|s|'|")/i);
        if (secMatch) return parseInt(secMatch[1]);

        // 4. Raw number: Only if it DOES NOT contain "reps", "series", "vez", "x"
        // And is either just a number or a number with whitespace
        const isReps = normalized.includes('rep') || normalized.includes('ser') || normalized.includes('vez') || normalized.includes('x');
        if (!isReps) {
            const numMatch = normalized.match(/^(\d+)$/);
            if (numMatch) return parseInt(numMatch[1]);
        }

        return 0;
    };

    // Parse only explicit time formats (MM:SS, min, seg/s).
    // It intentionally ignores naked numbers like "12" to avoid treating reps as time.
    const parseExplicitTimeSeconds = (reps: string): number => {
        if (!reps) return 0;
        const normalized = reps.trim().toLowerCase();

        const hmsMatch = normalized.match(/(\d+):(\d+)(?::(\d+))?/);
        if (hmsMatch) {
            if (hmsMatch[3]) {
                return parseInt(hmsMatch[1]) * 3600 + parseInt(hmsMatch[2]) * 60 + parseInt(hmsMatch[3]);
            }
            return parseInt(hmsMatch[1]) * 60 + parseInt(hmsMatch[2]);
        }

        const minMatch = normalized.match(/(\d+)\s*(minutos?|min|m\b)/i);
        if (minMatch) return parseInt(minMatch[1]) * 60;

        const secMatch = normalized.match(/(\d+)\s*(segundos?|seg|s|'|")/i);
        if (secMatch) return parseInt(secMatch[1]);

        return 0;
    };

    const hasExplicitTimeFormat = (value: string): boolean => parseExplicitTimeSeconds(value) > 0;

    // Helper to check if exercise is time-based
    const isTimeBased = (reps: string): boolean => {
        if (!reps) return false;
        const normalized = reps.trim().toLowerCase();

        // Explicit time formats
        if (/\d+:\d+/.test(normalized)) return true;
        if (/\d+\s*(min|seg|s|'|")/.test(normalized)) return true;

        // Naked numbers are time-based ONLY if they don't have rep indicators
        const hasRepIndicator = normalized.includes('rep') || normalized.includes('ser') || normalized.includes('vez') || normalized.includes('x');
        if (!hasRepIndicator && /^\d+$/.test(normalized)) return true;

        return false;
    };

    const hasGuidedWorkTimer = (exercise: ExerciseTracking, setIndex: number): boolean => {
        const targetSet = exercise.sets[setIndex];
        if (targetSet && typeof targetSet.duration === 'number' && targetSet.duration > 0) {
            return true;
        }

        // Warmup allows numeric defaults (e.g. "30"), main routine requires explicit time format.
        if (exercise.categoria === 'calentamiento') {
            return parseTimeSeconds(exercise.targetReps) > 0;
        }
        return hasExplicitTimeFormat(exercise.targetReps);
    };

    const getGuidedWorkSeconds = (exercise: ExerciseTracking, setIndex: number): number => {
        const targetSet = exercise.sets[setIndex];
        if (targetSet && typeof targetSet.duration === 'number' && targetSet.duration > 0) {
            return targetSet.duration;
        }
        if (exercise.categoria === 'calentamiento') {
            return parseTimeSeconds(exercise.targetReps);
        }
        return parseExplicitTimeSeconds(exercise.targetReps);
    };

    // Handle exercise authorization
    const handleStartExercise = (exerciseId: string) => {
        const exercise = activeSession?.exercises.find(e => e.id === exerciseId);
        if (!exercise) return;

        setActiveExerciseId(exerciseId);
        setCurrentSetIndex(0);
        setGuidedMode({
            active: true,
            exerciseId,
            setIndex: 0,
            phase: 'preview'
        });
        setTimerSeconds(getGuidedWorkSeconds(exercise, 0));
        setIsTimerRunning(false);
        setGuidedWorkTimerStarted(false);
        toast.success(`Entrenamiento iniciado`, { id: 'exercise-started', duration: 3000 });
    };

    const handleDiscardClick = (exerciseId: string) => {
        const shouldDiscard = window.confirm('Omitir ejercicio? No contara para el progreso de hoy.');
        if (!shouldDiscard) return;

        skipExercise(exerciseId, false);
        setIsTimerRunning(false);
        setTimerSeconds(0);
        toast.success('Ejercicio omitido', { id: 'exercise-skipped', duration: 3000 });

        if (guidedMode.active && guidedMode.exerciseId === exerciseId) {
            handleGuidedNext();
        }
    };

    const handleVariantClick = (exerciseId: string) => {
        setSelectedVariantExerciseId(exerciseId);
        setVariantSearchQuery(''); // Reset search
        setVariantSelectedCategory(null); // Reset category filter (show all by default, sorted by relevance)
        setVariantModalOpen(true);
    };

    // Handle set authorization (for time-based exercises)
    const handleStartSet = (exerciseId: string, setIndex: number) => {
        const exercise = activeSession?.exercises.find(e => e.id === exerciseId);
        if (!exercise) return;

        setActiveExerciseId(exerciseId);
        setCurrentSetIndex(setIndex);

        // Init timer with priority: 1. Manual set duration, 2. Global target time
        const currentSet = exercise.sets[setIndex];
        let seconds = 0;

        if (currentSet && typeof currentSet.duration === 'number' && currentSet.duration > 0) {
            seconds = currentSet.duration;
        } else {
            seconds = parseTimeSeconds(exercise.targetReps);
        }

        setTimerSeconds(seconds);
        setIsTimerRunning(exercise.categoria === 'calentamiento');
        if (exercise.categoria === 'calentamiento') {
            toast.success(`Serie ${setIndex + 1} iniciada`, { id: 'set-started', duration: 3000 });
        }
    };

    // Timer effect with Overtime support
    useEffect(() => {
        if (!isTimerRunning) return;

        let lastTick = Date.now();
        const interval = setInterval(() => {
            const now = Date.now();
            const deltaMs = now - lastTick;

            if (deltaMs >= 1000) {
                const deltaSeconds = Math.floor(deltaMs / 1000);
                lastTick = now - (deltaMs % 1000);

                setTimerSeconds(prev => {
                    const isRest = guidedMode.active && guidedMode.phase === 'rest';

                    if (isRest) {
                        return prev - deltaSeconds;
                    }

                    const exercise = activeSession?.exercises.find(e => e.id === activeExerciseId || e.id === guidedMode.exerciseId);
                    if (!exercise) return prev;

                    const setIndex = guidedMode.active ? guidedMode.setIndex : currentSetIndex;
                    const targetSet = exercise.sets[setIndex];
                    const targetRepsNormalized = (exercise.targetReps || '').trim().toLowerCase();
                    const hasHmsFormat = /(\d+):(\d+)(?::(\d+))?/.test(targetRepsNormalized);
                    const hasMinutesFormat = /(\d+)\s*(minutos?|min|m\b)/i.test(targetRepsNormalized);
                    const hasSecondsFormat = /(\d+)\s*(segundos?|seg|s|'|")/i.test(targetRepsNormalized);
                    const hasExplicitTime = hasHmsFormat || hasMinutesFormat || hasSecondsFormat;
                    const hasRepIndicator = targetRepsNormalized.includes('rep') || targetRepsNormalized.includes('ser') || targetRepsNormalized.includes('vez') || targetRepsNormalized.includes('x');
                    const hasRawNumericTime = /^\d+$/.test(targetRepsNormalized) && !hasRepIndicator;
                    const isTimedWork = Boolean(
                        (targetSet && typeof targetSet.duration === 'number' && targetSet.duration > 0) ||
                        (exercise.categoria === 'calentamiento' ? (hasExplicitTime || hasRawNumericTime) : hasExplicitTime)
                    );

                    // Non-timed guided work should not run any timer.
                    if (guidedMode.active && guidedMode.phase === 'work' && !isTimedWork) {
                        return prev;
                    }

                    if (isTimedWork) {
                        return prev - deltaSeconds;
                    }

                    return prev + deltaSeconds;
                });
            }
        }, 100);

        return () => clearInterval(interval);
    }, [isTimerRunning, activeExerciseId, currentSetIndex, guidedMode.active, guidedMode.exerciseId, guidedMode.phase, guidedMode.setIndex, activeSession?.exercises]);

    const handleGuidedNext = () => {
        if (!guidedMode.active || !guidedMode.exerciseId) return;

        const exercise = activeSession?.exercises.find((e) => e.id === guidedMode.exerciseId);
        if (!exercise) return;

        const endGuidedExercise = () => {
            markExerciseAsCompleted(exercise.id, false);
            setGuidedMode({ active: false, exerciseId: null, setIndex: 0, phase: 'preview' });
            setIsTimerRunning(false);
            setTimerSeconds(0);
            setActiveExerciseId(null);
            setGuidedWorkTimerStarted(false);
            restTransitionLockRef.current = false;
            toast.success('Ejercicio finalizado', { id: 'exercise-finished', duration: 3000 });
        };

        if (guidedMode.phase === 'preview') {
            setGuidedMode((prev) => ({ ...prev, phase: 'work' }));
            setCurrentSetIndex(guidedMode.setIndex);
            setTimerSeconds(getGuidedWorkSeconds(exercise, guidedMode.setIndex));
            setIsTimerRunning(false);
            setGuidedWorkTimerStarted(false);
            return;
        }

        if (guidedMode.phase === 'work') {
            updateSet(guidedMode.exerciseId, guidedMode.setIndex, { completed: true });

            const isLastSet = guidedMode.setIndex >= exercise.sets.length - 1;
            if (isLastSet) {
                endGuidedExercise();
                return;
            }

            const restSeconds = exercise.sets[guidedMode.setIndex]?.rest || 30;
            setGuidedMode((prev) => ({ ...prev, phase: 'rest' }));
            setTimerSeconds(restSeconds);
            setIsTimerRunning(true);
            setGuidedWorkTimerStarted(false);
            toast.success('Descanso iniciado', { id: 'rest-started', duration: 3000 });
            return;
        }

        const nextSetIndex = guidedMode.setIndex + 1;
        if (nextSetIndex >= exercise.sets.length) {
            endGuidedExercise();
            return;
        }

        setGuidedMode((prev) => ({ ...prev, setIndex: nextSetIndex, phase: 'work' }));
        setCurrentSetIndex(nextSetIndex);
        setTimerSeconds(getGuidedWorkSeconds(exercise, nextSetIndex));
        setIsTimerRunning(false);
        setGuidedWorkTimerStarted(false);
        restTransitionLockRef.current = false;
    };

    const handleGuidedOpenVideo = (exercise: ExerciseTracking) => {
        const videoUrl = toTrustedExternalVideoUrl(getExerciseVideo(exercise.nombre));
        if (!videoUrl) return;

        setIsTimerRunning(false);
        window.open(videoUrl, '_blank', 'noopener,noreferrer');
    };

    const handleGuidedWorkPlay = (exercise: ExerciseTracking) => {
        if (!hasGuidedWorkTimer(exercise, guidedMode.setIndex)) return;

        if (!guidedWorkTimerStarted || timerSeconds <= 0) {
            setTimerSeconds(getGuidedWorkSeconds(exercise, guidedMode.setIndex));
        }
        setGuidedWorkTimerStarted(true);
        setIsTimerRunning(true);
    };

    const handleGuidedWorkReset = (exercise: ExerciseTracking) => {
        setTimerSeconds(getGuidedWorkSeconds(exercise, guidedMode.setIndex));
        setGuidedWorkTimerStarted(false);
        setIsTimerRunning(false);
    };

    // Keep the screen awake while a timer is active.
    useEffect(() => {
        if (isTimerRunning) {
            void timerAlertService.acquireWakeLock();
            return;
        }
        timerAlertService.releaseWakeLock();
    }, [isTimerRunning]);

    useEffect(() => {
        return () => {
            timerAlertService.releaseWakeLock();
        };
    }, []);

    // Multimodal alert when timer reaches zero.
    useEffect(() => {
        const previous = previousTimerRef.current;
        const crossedZero = isTimerRunning && previous > 0 && timerSeconds <= 0;
        previousTimerRef.current = timerSeconds;

        if (!crossedZero) return;

        const isRestPhase = guidedMode.active && guidedMode.phase === 'rest';
        void timerAlertService.triggerTimerFinished({
            title: isRestPhase ? 'Descanso terminado' : 'Tiempo finalizado',
            body: isRestPhase
                ? 'Sigue con la siguiente serie.'
                : 'Completa la serie cuando estes listo.',
        });

        if (!isRestPhase) {
            setIsTimerRunning(false);
        }
    }, [guidedMode.active, guidedMode.phase, isTimerRunning, timerSeconds]);

    // Rest phases move forward automatically when timer ends.
    useEffect(() => {
        if (!guidedMode.active || guidedMode.phase !== 'rest') {
            restTransitionLockRef.current = false;
            return;
        }
        if (!isTimerRunning || timerSeconds > 0 || restTransitionLockRef.current) return;

        restTransitionLockRef.current = true;
        handleGuidedNext();
        // handleGuidedNext is intentionally not a dependency to avoid effect churn while the rest timer ticks.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [guidedMode.active, guidedMode.phase, isTimerRunning, timerSeconds]);


    const totalSets = useMemo(() => {
        if (!activeSession) return 0;
        return activeSession.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
    }, [activeSession]);

    const completedSets = useMemo(() => {
        if (!activeSession) return 0;
        return activeSession.exercises.reduce((acc, ex) => {
            if (ex.isSkipped) return acc + ex.sets.length;
            return acc + ex.sets.filter(s => s.completed || s.skipped).length;
        }, 0);
    }, [activeSession]);

    const progress = (completedSets / totalSets) * 100;

    // Expand first exercise by default if none expanded
    useEffect(() => {
        if (activeSession && activeSession.exercises.length > 0 && expandedExercises.length === 0) {
            setExpandedExercises([activeSession.exercises[0].id]);
        }
    }, [activeSession, expandedExercises.length]);

    // Early return if no active session
    if (!activeSession) return null;

    return (
        <div style={styles.fullOverlay}>
            {/* Active Header */}
            <div style={styles.header}>
                <button
                    onClick={() => {
                        const shouldCancel = window.confirm('Cancelar entrenamiento actual? No se guardara el progreso.');
                        if (!shouldCancel) return;
                        cancelSession();
                        onCancel();
                    }}
                    style={styles.iconBtn}
                >
                    <X size={24} color={Colors.textSecondary} />
                </button>
                <div style={styles.timerBadge}>
                    <Clock size={14} color={Colors.primary} />
                    <span>{formatTime(duration)}</span>
                </div>
                <button
                    onClick={() => {
                        setShowCompletionModal(true);
                    }}
                    style={{
                        ...styles.finishBtn,
                        opacity: progress > 0 ? 1 : 0.5
                    }}
                    disabled={progress === 0}
                >
                    Finalizar
                </button>
            </div>

            {/* Progress Bar */}
            <div style={styles.progressContainer}>
                <div style={{ ...styles.progressFill, width: `${progress}%` }} />
            </div>

            {/* Dual Session Indicator */}
            {activeSession.isDualSession && activeSession.partnerExercises && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '16px',
                    padding: '8px 20px',
                    background: `${Colors.primary}08`,
                    borderBottom: `1px solid ${Colors.border}`,
                    fontSize: '12px',
                    color: Colors.textSecondary
                }}>
                    <span style={{ fontWeight: 700, color: Colors.text }}>{perfil.usuario.nombre.split(' ')[0]}</span>
                    <span style={{ color: Colors.textTertiary }}>+</span>
                    <span style={{ fontWeight: 700, color: Colors.primary }}>{activeSession.selectedPartnerName || perfil.pareja?.nombre.split(' ')[0] || 'Partner'}</span>
                    <span style={{ color: Colors.textTertiary, fontSize: '10px', marginLeft: '8px' }}>
                        {activeSession.sessionMode === 'shared' ? 'Mismo cel' : 'Vinculado'}
                    </span>
                </div>
            )}

            <div style={styles.activeContent}>
                {/* Warmup Section */}
                {activeSession.exercises.filter(ex => ex.categoria === 'calentamiento').length > 0 && (
                    <>
                        <div style={styles.sectionHeader}>
                            <span style={styles.sectionEmoji}>WU</span>
                            <div style={styles.sectionTextContainer}>
                                <h3 style={styles.sectionTitle}>CALENTAMIENTO</h3>
                                <p style={styles.sectionSubtitle}>Prepara tu cuerpo antes de empezar</p>
                            </div>
                        </div>
                        {activeSession.exercises
                            .filter(ex => ex.categoria === 'calentamiento' && !ex.isCompleted && !ex.isSkipped)
                            .map((ex) => renderExerciseCard(ex))}
                    </>
                )}

                {/* Main Routine Section */}
                <div style={styles.sectionHeader}>
                    <span style={styles.sectionEmoji}>RP</span>
                    <div style={styles.sectionTextContainer}>
                        <h3 style={styles.sectionTitle}>RUTINA PRINCIPAL</h3>
                        <p style={styles.sectionSubtitle}>Dale al botÃ³n Play para comenzar cada ejercicio</p>
                    </div>
                </div>
                {activeSession.exercises
                    .filter(ex => ex.categoria !== 'calentamiento' && !ex.isCompleted)
                    .map((ex) => renderExerciseCard(ex))}

                {/* Add Exercise Button */}
                <button
                    style={styles.addExerciseBtn}
                    onClick={() => setShowAddModal(true)}
                >
                    <Plus size={20} color={Colors.primary} />
                    <span>Agregar Ejercicio Extra</span>
                </button>

                {/* Exercise Selection Modal */}
                <AnimatePresence>
                    {showAddModal && (
                        <div style={styles.modalOverlay}>
                            <motion.div
                                initial={{ opacity: 0, y: 100 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 100 }}
                                style={styles.modalContent}
                            >
                                {selectedExerciseForAdd ? (
                                    <div style={{ padding: '0 20px 20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                            <button
                                                onClick={() => setSelectedExerciseForAdd(null)}
                                                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: Colors.textSecondary }}
                                            >
                                                <ChevronLeft size={24} />
                                            </button>
                                            <h3 style={{ ...styles.modalTitle, margin: 0 }}>{selectedExerciseForAdd.nombre}</h3>
                                        </div>

                                        <div style={{ display: 'grid', gap: '16px' }}>
                                            <div>
                                                <label style={styles.inputLabel}>Series</label>
                                                <input
                                                    type="number"
                                                    value={addConfig.series}
                                                    onChange={(e) => setAddConfig({ ...addConfig, series: parseInt(e.target.value) || 0 })}
                                                    style={styles.searchInput}
                                                />
                                            </div>
                                            <div>
                                                <label style={styles.inputLabel}>Repeticiones / Tiempo</label>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <input
                                                        type="text"
                                                        value={addConfig.repeticiones}
                                                        onChange={(e) => setAddConfig({ ...addConfig, repeticiones: e.target.value })}
                                                        style={{ ...styles.searchInput, flex: 1 }}
                                                        placeholder="0"
                                                    />
                                                    <select
                                                        value={addConfig.unit}
                                                        onChange={(e) => setAddConfig({ ...addConfig, unit: e.target.value })}
                                                        style={{ ...styles.searchInput, width: '90px', padding: '0 8px' }}
                                                    >
                                                        <option value="reps">Reps</option>
                                                        <option value="s">Seg</option>
                                                        <option value="m">Min</option>
                                                        <option value="h">Horas</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label style={styles.inputLabel}>Descanso (seg)</label>
                                                <input
                                                    type="number"
                                                    value={addConfig.descanso}
                                                    onChange={(e) => setAddConfig({ ...addConfig, descanso: parseInt(e.target.value) || 0 })}
                                                    style={styles.searchInput}
                                                />
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (!selectedExerciseForAdd) return;
                                                    addExerciseToSession({
                                                        id: selectedExerciseForAdd.id,
                                                        nombre: selectedExerciseForAdd.nombre,
                                                        series: addConfig.series,
                                                        repeticiones: addConfig.unit !== 'reps' ? `${addConfig.repeticiones}${addConfig.unit}` : addConfig.repeticiones,
                                                        descanso: addConfig.descanso,
                                                        categoria: 'maquina'
                                                    }, false);
                                                    setShowAddModal(false);
                                                    setSelectedExerciseForAdd(null);
                                                    setSearchQuery('');
                                                }}
                                                style={styles.startExerciseBtn}
                                            >
                                                <Plus size={20} />
                                                <span>Agregar a la Rutina</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div style={styles.modalHeader}>
                                            <h3 style={styles.modalTitle}>Agregar Ejercicio</h3>
                                            <button onClick={() => setShowAddModal(false)} style={styles.closeModalBtn}>
                                                <X size={24} />
                                            </button>
                                        </div>

                                        <div style={styles.searchContainer}>
                                            <input
                                                type="text"
                                                placeholder="Buscar ejercicio..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                style={styles.searchInput}
                                                autoFocus
                                            />
                                        </div>

                                        <div style={styles.exerciseList}>
                                            {EJERCICIOS_DATABASE.filter(ex =>
                                                ex.nombre.toLowerCase().includes(searchQuery.toLowerCase())
                                            ).map(ex => (
                                                <div
                                                    key={ex.id}
                                                    style={styles.exerciseListItem}
                                                    onClick={() => {
                                                        setSelectedExerciseForAdd(ex);
                                                        setAddConfig({
                                                            series: 3,
                                                            repeticiones: '10',
                                                            descanso: 60,
                                                            unit: 'reps'
                                                        });
                                                    }}
                                                >
                                                    <div style={{
                                                        ...styles.groupBadge,
                                                        background: GRUPOS_MUSCULARES[ex.grupoMuscular]?.color || Colors.surfaceLight
                                                    }}>
                                                        {GRUPOS_MUSCULARES[ex.grupoMuscular]?.nombre?.slice(0, 2) || '--'}
                                                    </div>
                                                    <div style={styles.exerciseInfo}>
                                                        <div style={styles.exerciseLabel}>{ex.nombre}</div>
                                                        <div style={styles.exerciseGroup}>{GRUPOS_MUSCULARES[ex.grupoMuscular]?.nombre}</div>
                                                    </div>
                                                    <ChevronRight size={20} color={Colors.textTertiary} />
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Completion Modal */}
            <AnimatePresence>
                {showCompletionModal && (
                    <div style={styles.modalOverlay}>
                        <motion.div
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 100 }}
                            style={styles.modalContent}
                        >
                            <div style={styles.modalHeader}>
                                <h3 style={styles.modalTitle}>
                                    {completionType === 'extra' ? 'Actividad Extra' : 'Â¡Entrenamiento Terminado!'}
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowCompletionModal(false);
                                        setCompletionType(null);
                                    }}
                                    style={styles.closeModalBtn}
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
                                {!completionType ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <button
                                            style={styles.optionBtn}
                                            onClick={() => {
                                                setPendingCompletion({
                                                    type: 'routine',
                                                    duration: Math.floor(duration / 60)
                                                });
                                                setShowCompletionModal(false);
                                                setShowMoodCheckin(true);
                                            }}
                                        >
                                            <div style={styles.optionIcon}><Check size={18} /></div>
                                            <div style={styles.optionText}>
                                                <h4>Rutina Completa</h4>
                                                <p>Guardar progreso y finalizar</p>
                                            </div>
                                            <ChevronLeft size={20} style={{ transform: 'rotate(180deg)' }} />
                                        </button>

                                        <button
                                            style={styles.optionBtn}
                                            onClick={() => setCompletionType('extra')}
                                        >
                                            <div style={styles.optionIcon}><Plus size={18} /></div>
                                            <div style={styles.optionText}>
                                                <h4>Actividad Extra</h4>
                                                <p>Agregar cardio, estiramiento, deporte...</p>
                                            </div>
                                            <ChevronLeft size={20} style={{ transform: 'rotate(180deg)' }} />
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {/* Activity Type */}
                                        <div>
                                            <label style={styles.inputLabel}>Tipo de Actividad</label>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                                                {(perfil.catalogoExtras?.length ? perfil.catalogoExtras : ['Running', 'Ciclismo', 'NataciÃ³n', 'FÃºtbol', 'Yoga', 'Pilates', 'Crossfit', 'Boxeo']).map((type) => (
                                                    <button
                                                        key={type}
                                                        onClick={() => setExtraActivityType(type)}
                                                        style={{
                                                            padding: '8px 12px',
                                                            borderRadius: '12px',
                                                            border: `1px solid ${extraActivityType === type ? Colors.primary : Colors.border}`,
                                                            background: extraActivityType === type ? Colors.primary : Colors.surface,
                                                            color: extraActivityType === type ? '#000' : Colors.text,
                                                            fontSize: '13px',
                                                            fontWeight: 600,
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={() => setIsAddingCustom(true)}
                                                    style={{
                                                        padding: '8px 12px',
                                                        borderRadius: '12px',
                                                        border: `1px solid ${Colors.border}`,
                                                        background: Colors.surface,
                                                        color: Colors.primary,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }}
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>

                                            {isAddingCustom && (
                                                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                                                    <input
                                                        autoFocus
                                                        value={customActivityName}
                                                        onChange={(e) => setCustomActivityName(e.target.value)}
                                                        placeholder="Nombre..."
                                                        style={{ ...styles.searchInput, marginTop: 0 }}
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            if (!customActivityName.trim()) return;
                                                            const newCatalog = [...(perfil.catalogoExtras || []), customActivityName.trim()];
                                                            const uniqueCatalog = Array.from(new Set(newCatalog));
                                                            useUserStore.setState((state) => ({
                                                                perfil: { ...state.perfil, catalogoExtras: uniqueCatalog }
                                                            }));
                                                            setExtraActivityType(customActivityName.trim());
                                                            setCustomActivityName('');
                                                            setIsAddingCustom(false);
                                                        }}
                                                        style={{
                                                            background: Colors.primary,
                                                            color: '#000',
                                                            border: 'none',
                                                            borderRadius: '10px',
                                                            padding: '0 16px',
                                                            fontWeight: 700,
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        OK
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Stats */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            <div>
                                                <label style={styles.inputLabel}>DuraciÃ³n (min)</label>
                                                <input
                                                    type="number"
                                                    value={extraActivityDuration}
                                                    onChange={(e) => setExtraActivityDuration(e.target.value)}
                                                    placeholder="45"
                                                    style={styles.searchInput}
                                                />
                                            </div>
                                            <div>
                                                <label style={styles.inputLabel}>Recorrido (km)</label>
                                                <input
                                                    type="number"
                                                    value={extraActivityDistance}
                                                    onChange={(e) => setExtraActivityDistance(e.target.value)}
                                                    placeholder="Opcional"
                                                    style={styles.searchInput}
                                                />
                                            </div>
                                        </div>

                                        {/* Intensity */}
                                        <div>
                                            <label style={styles.inputLabel}>Esfuerzo</label>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '8px' }}>
                                                {(['baja', 'media', 'alta'] as const).map((level) => (
                                                    <button
                                                        key={level}
                                                        onClick={() => setExtraActivityIntensity(level)}
                                                        style={{
                                                            padding: '10px',
                                                            borderRadius: '10px',
                                                            border: '1px solid',
                                                            background: extraActivityIntensity === level
                                                                ? (level === 'alta' ? Colors.error : level === 'media' ? Colors.warning : Colors.success)
                                                                : Colors.surface,
                                                            color: extraActivityIntensity === level ? '#FFF' : Colors.textSecondary,
                                                            borderColor: extraActivityIntensity === level ? 'transparent' : Colors.border,
                                                            fontSize: '12px',
                                                            fontWeight: 700,
                                                            cursor: 'pointer',
                                                            textTransform: 'uppercase'
                                                        }}
                                                    >
                                                        {level}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Submit */}
                                        <button
                                            style={{
                                                ...styles.startExerciseBtn,
                                                opacity: (!extraActivityType || !extraActivityDuration) ? 0.5 : 1,
                                                width: '100%',
                                                marginTop: '8px'
                                            }}
                                            disabled={!extraActivityType || !extraActivityDuration}
                                            onClick={async () => {
                                                const mets = extraActivityIntensity === 'baja' ? 4 : extraActivityIntensity === 'media' ? 8 : 12;
                                                const weight = perfil.usuario.peso || 70;
                                                const durationHrs = parseInt(extraActivityDuration) / 60;
                                                const estimatedCalories = Math.round(mets * weight * durationHrs);

                                                const extraData: ExtraActivity = {
                                                    id: `extra_${Date.now()}`,
                                                    fecha: new Date().toISOString(),
                                                    descripcion: extraActivityType,
                                                    analisisIA: {
                                                        tipoDeporte: extraActivityType,
                                                        duracionMinutos: parseInt(extraActivityDuration),
                                                        distanciaKm: extraActivityDistance ? parseFloat(extraActivityDistance) : undefined,
                                                        intensidad: extraActivityIntensity,
                                                        calorias: estimatedCalories,
                                                        notas: 'Registro manual'
                                                    }
                                                };

                                                setPendingCompletion({
                                                    type: 'extra',
                                                    duration: Math.floor(duration / 60),
                                                    extraData
                                                });
                                                setShowCompletionModal(false);
                                                setShowMoodCheckin(true);
                                            }}
                                        >
                                            <Save size={20} /> Guardar y Finalizar
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Guided Mode Overlay */}
            <AnimatePresence>
                {guidedMode.active && (() => {
                    const ex = activeSession.exercises.find((e) => e.id === guidedMode.exerciseId);
                    if (!ex) return null;

                    const currentSet = ex.sets[guidedMode.setIndex];
                    const guidedImage = ex.imagen || getExerciseImage(ex.nombre);
                    const guidedVideoUrl = toTrustedExternalVideoUrl(getExerciseVideo(ex.nombre));
                    const isPreview = guidedMode.phase === 'preview';
                    const isRestPhase = guidedMode.phase === 'rest';
                    const isWorkPhase = guidedMode.phase === 'work';
                    const workHasTimer = isWorkPhase && hasGuidedWorkTimer(ex, guidedMode.setIndex);
                    const timerExpired = !isPreview && timerSeconds <= 0;
                    const nextSetNumber = Math.min(guidedMode.setIndex + 2, ex.sets.length);
                    const showWorkStart = workHasTimer && !guidedWorkTimerStarted && !isTimerRunning;
                    const showWorkPaused = workHasTimer && guidedWorkTimerStarted && !isTimerRunning;
                    const showCircularTimer = isRestPhase || (isWorkPhase && workHasTimer && (isTimerRunning || showWorkPaused));

                    return (
                        <div style={styles.modalOverlay}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                style={styles.guidedContainer}
                            >
                                <div style={styles.guidedHeaderRow}>
                                    <div style={styles.guidedHeaderText}>
                                        <h2 style={styles.guidedTitle}>{isRestPhase ? 'Descanso' : ex.nombre}</h2>
                                        <p style={styles.guidedSubtitle}>
                                            {isRestPhase
                                                ? `Siguiente: serie ${nextSetNumber} de ${ex.sets.length}`
                                                : `Serie ${guidedMode.setIndex + 1} de ${ex.sets.length}`}
                                        </p>
                                    </div>
                                    <div style={styles.guidedHeaderActions}>
                                        <button
                                            onClick={() => guidedMode.exerciseId && handleVariantClick(guidedMode.exerciseId)}
                                            style={styles.iconBtn}
                                        >
                                            <Shuffle size={20} color={Colors.textSecondary} />
                                        </button>
                                        <button
                                            onClick={() => guidedMode.exerciseId && handleDiscardClick(guidedMode.exerciseId)}
                                            style={styles.iconBtn}
                                        >
                                            <Trash2 size={20} color={Colors.textSecondary} />
                                        </button>
                                    </div>
                                </div>

                                <button
                                    style={{
                                        ...styles.guidedMediaButton,
                                        cursor: guidedVideoUrl ? 'pointer' : 'default'
                                    }}
                                    onClick={() => handleGuidedOpenVideo(ex)}
                                    disabled={!guidedVideoUrl}
                                >
                                    <img
                                        src={guidedImage}
                                        alt={ex.nombre}
                                        style={styles.guidedPreviewImage}
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = getExerciseImage(ex.nombre);
                                        }}
                                    />
                                    {guidedVideoUrl && (
                                        <span style={styles.guidedPlayBadge}>
                                            <Play size={14} /> Ver video
                                        </span>
                                    )}
                                </button>

                                <div style={styles.guidedSummaryCard}>
                                    <div style={styles.guidedSummaryRow}>
                                        <span style={styles.guidedSummaryLabel}>Series objetivo</span>
                                        <strong>{ex.targetSeries}</strong>
                                    </div>
                                    <div style={styles.guidedSummaryRow}>
                                        <span style={styles.guidedSummaryLabel}>Reps objetivo</span>
                                        <strong>{ex.targetReps}</strong>
                                    </div>
                                    <div style={styles.guidedSummaryRow}>
                                        <span style={styles.guidedSummaryLabel}>Descanso</span>
                                        <strong>{currentSet?.rest || 30}s</strong>
                                    </div>
                                </div>

                                {showWorkStart && (
                                    <button
                                        onClick={() => handleGuidedWorkPlay(ex)}
                                        style={styles.guidedTimerStartBtn}
                                    >
                                        <Play size={26} /> Play
                                    </button>
                                )}

                                {showCircularTimer && (
                                    <>
                                        <button
                                            style={styles.guidedTimerContainer}
                                            onClick={() => {
                                                if (isWorkPhase && workHasTimer && isTimerRunning) {
                                                    setIsTimerRunning(false);
                                                }
                                            }}
                                            disabled={!(isWorkPhase && workHasTimer && isTimerRunning)}
                                        >
                                            <div style={{
                                                ...styles.guidedTimerCircle,
                                                borderColor: timerExpired ? Colors.error : (guidedMode.phase === 'work' ? Colors.primary : Colors.success)
                                            }}>
                                                <span style={{
                                                    ...styles.guidedTimerValue,
                                                    color: timerSeconds <= 0 ? Colors.error : Colors.text
                                                }}>
                                                    {timerSeconds < 0 ? `-${formatTime(Math.abs(timerSeconds))}` : formatTime(timerSeconds)}
                                                </span>
                                                <span style={styles.guidedTimerLabel}>
                                                    {isRestPhase ? 'DESCANSO' : showWorkPaused ? 'PAUSADO' : 'TRABAJO'}
                                                </span>
                                            </div>
                                        </button>

                                        {showWorkPaused && (
                                            <div style={styles.guidedPausedActions}>
                                                <button
                                                    onClick={() => setIsTimerRunning(true)}
                                                    style={styles.guidedSecondaryBtn}
                                                >
                                                    <Play size={16} /> Reanudar
                                                </button>
                                                <button
                                                    onClick={() => handleGuidedWorkReset(ex)}
                                                    style={styles.guidedSecondaryBtn}
                                                >
                                                    <RotateCcw size={16} /> Reiniciar
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}

                                {guidedMode.phase === 'work' && currentSet && (
                                    <div style={styles.guidedSetInputGrid}>
                                        <div>
                                            <label style={styles.inputLabel}>Peso (kg)</label>
                                            <input
                                                type="number"
                                                value={currentSet.weight || ''}
                                                onChange={(e) => updateSet(ex.id, guidedMode.setIndex, { weight: parseFloat(e.target.value) || 0 })}
                                                placeholder="0"
                                                style={styles.searchInput}
                                            />
                                        </div>
                                        <div>
                                            <label style={styles.inputLabel}>Reps hechas</label>
                                            <input
                                                type="number"
                                                value={currentSet.reps || ''}
                                                onChange={(e) => updateSet(ex.id, guidedMode.setIndex, { reps: parseInt(e.target.value) || 0 })}
                                                placeholder="0"
                                                style={styles.searchInput}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div style={styles.guidedActions}>
                                    <button
                                        onClick={handleGuidedNext}
                                        style={{
                                            ...styles.guidedActionBtn,
                                            background: isPreview ? Colors.primary : guidedMode.phase === 'work' ? Colors.primary : Colors.success
                                        }}
                                    >
                                        {isPreview ? (
                                            <>
                                                <Play size={24} /> Comenzar ejercicio
                                            </>
                                        ) : guidedMode.phase === 'work' ? (
                                            <>
                                                <Check size={24} /> Completar serie
                                            </>
                                        ) : (
                                            <>
                                                <Play size={24} /> Saltar descanso
                                            </>
                                        )}
                                    </button>

                                    <button
                                        style={styles.guidedCancelBtn}
                                        onClick={() => {
                                            const shouldExit = window.confirm('Salir del modo guiado?');
                                            if (!shouldExit) return;
                                            setGuidedMode({ active: false, exerciseId: null, setIndex: 0, phase: 'preview' });
                                            setIsTimerRunning(false);
                                            setGuidedWorkTimerStarted(false);
                                            setActiveExerciseId(null);
                                        }}
                                    >
                                        Salir
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    );
                })()}
            </AnimatePresence>
            {/* Partner Widget for Linked Session */}
            {showPartnerWidget && activeSession.sessionMode === 'linked' && (
                <div style={styles.partnerWidget}>
                    <div style={styles.partnerWidgetHeader}>
                        <span style={styles.partnerWidgetTitle}>{activeSession.selectedPartnerName || perfil.pareja?.nombre.split(' ')[0] || 'Partner'}</span>
                        <span style={styles.partnerOnlineIndicator}>â—</span>
                    </div>
                    <div style={styles.partnerWidgetContent}>
                        {partnerCurrentExercise ? (
                            <>
                                <span style={styles.partnerCurrentExercise}>
                                    {partnerExercises?.find((item) => item.id === partnerCurrentExercise)?.nombre || partnerCurrentExercise}
                                </span>
                                <div style={styles.partnerProgress}>
                                    {partnerExercises ? (
                                        <span style={styles.partnerProgressText}>
                                            {partnerExercises.filter(ex => ex.isCompleted).length}/{partnerExercises.length} completados
                                        </span>
                                    ) : (
                                        <span style={styles.partnerProgressText}>Cargando...</span>
                                    )}
                                </div>
                            </>
                        ) : (
                            <span style={styles.partnerProgressText}>Esperando...</span>
                        )}
                    </div>
                    <button
                        style={styles.partnerWidgetExpand}
                        onClick={() => {
                            setShowPartnerDetailsPanel((prev) => !prev);
                        }}
                    >
                        {showPartnerDetailsPanel ? 'Ocultar detalle' : 'Ver detalle'}
                    </button>
                    {showPartnerDetailsPanel && partnerExercises && (
                        <div style={styles.partnerDetailsList}>
                            {partnerExercises.map((partnerEx, index) => {
                                const completedSets = partnerEx.sets.filter((set) => set.completed || set.skipped).length;
                                const statusLabel = partnerEx.isCompleted
                                    ? 'Completado'
                                    : partnerEx.isSkipped
                                        ? 'Omitido'
                                        : `${completedSets}/${partnerEx.sets.length} series`;

                                return (
                                    <div key={partnerEx.id} style={styles.partnerDetailsRow}>
                                        <span style={styles.partnerDetailsName}>{index + 1}. {partnerEx.nombre}</span>
                                        <span style={styles.partnerDetailsStatus}>{statusLabel}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Mood Checkin Modal */}
            {showMoodCheckin && (
                <MoodCheckin
                    type="post"
                    onComplete={async (moodData) => {
                        if (!pendingCompletion) return;

                        if (pendingCompletion.type === 'extra' && pendingCompletion.extraData) {
                            await addExtraActivity(pendingCompletion.extraData);
                        }

                        await finishSession(pendingCompletion.duration, {
                            mood: moodData.mood,
                            energy: moodData.energy,
                            note: moodData.note
                        });
                        onFinish();
                    }}
                    onCancel={() => setShowMoodCheckin(false)}
                />
            )}

            {/* Variant Selection Modal */}
            {variantModalOpen && renderVariantModal()}
        </div>
    );

    function renderVariantModal() {
        if (!selectedVariantExerciseId) return null;
        const currentExercise = activeSession?.exercises.find(e => e.id === selectedVariantExerciseId);
        if (!currentExercise) return null;

        // Determine initial category to optional expand or filter
        const dbExercise = EJERCICIOS_DATABASE.find(e => e.nombre === currentExercise.nombre);
        const currentMuscleGroup = dbExercise?.grupoMuscular;

        // Filter exercises
        const filteredExercises = EJERCICIOS_DATABASE.filter(ex => {
            const matchesSearch = ex.nombre.toLowerCase().includes(variantSearchQuery.toLowerCase());
            const matchesCategory = variantSelectedCategory ? ex.grupoMuscular === variantSelectedCategory : true;
            // Exclude current exercise from options
            return matchesSearch && matchesCategory && ex.nombre !== currentExercise.nombre;
        });

        // Group by category
        const groupedExercises: Record<string, EjercicioBase[]> = {};
        filteredExercises.forEach(ex => {
            const group = ex.grupoMuscular;
            if (!groupedExercises[group]) groupedExercises[group] = [];
            groupedExercises[group].push(ex);
        });

        // Sort categories: Current muscle group first, then others
        const sortedCategories = Object.keys(groupedExercises).sort((a, b) => {
            if (a === currentMuscleGroup) return -1;
            if (b === currentMuscleGroup) return 1;
            return a.localeCompare(b);
        });

        return (
            <div style={styles.modalOverlay}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ ...styles.modalContent, height: '80vh', display: 'flex', flexDirection: 'column' }}
                >
                    <div style={styles.modalHeader}>
                        <h3 style={styles.modalTitle}>Reemplazar Ejercicio</h3>
                        <button onClick={() => setVariantModalOpen(false)} style={styles.iconBtn}>
                            <X size={24} color={Colors.text} />
                        </button>
                    </div>

                    <div style={{ padding: '0 20px 10px' }}>
                        <div style={styles.variantSearchContainer}>
                            <Search size={18} color={Colors.textTertiary} />
                            <input
                                style={styles.variantSearchInput}
                                placeholder="Buscar ejercicio..."
                                value={variantSearchQuery}
                                onChange={(e) => setVariantSearchQuery(e.target.value)}
                                autoFocus
                            />
                            {variantSearchQuery && (
                                <button onClick={() => setVariantSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                    <X size={16} color={Colors.textTertiary} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Category Tabs (Optional - simpler to just show list headers for now as requested "like database")
                        But we can add a horizontal scroll of chips if user wants to filter. 
                        Let's stick to the list with headers as it mimics the "organization of the database".
                    */}

                    <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
                        <p style={{ color: Colors.textSecondary, marginBottom: '16px', fontSize: '13px' }}>
                            Reemplazando: <strong>{currentExercise.nombre}</strong>
                        </p>

                        {sortedCategories.length > 0 ? (
                            sortedCategories.map(catKey => {
                                const categoryInfo = GRUPOS_MUSCULARES[catKey as keyof typeof GRUPOS_MUSCULARES] || { nombre: catKey, emoji: '', color: Colors.text };
                                return (
                                    <div key={catKey} style={{ marginBottom: '20px' }}>
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            padding: '8px 0', borderBottom: `2px solid ${categoryInfo.color}20`,
                                            marginBottom: '8px'
                                        }}>
                                            <span style={{ fontSize: '14px', fontWeight: 800, color: categoryInfo.color, textTransform: 'uppercase' }}>
                                                {categoryInfo.nombre}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {groupedExercises[catKey].map(ex => (
                                                <button
                                                    key={ex.id}
                                                    onClick={() => {
                                                        replaceExerciseInSession(selectedVariantExerciseId, {
                                                            id: ex.id,
                                                            nombre: ex.nombre,
                                                            series: currentExercise.targetSeries,
                                                            repeticiones: currentExercise.targetReps,
                                                            descanso: 60,
                                                            categoria: currentExercise.categoria || 'maquina'
                                                        });
                                                        setVariantModalOpen(false);
                                                        setVariantSearchQuery(''); // Reset search
                                                        toast.success('Ejercicio reemplazado');
                                                    }}
                                                    style={{
                                                        ...styles.previewItem,
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        textAlign: 'left',
                                                        justifyContent: 'space-between',
                                                        padding: '12px 16px',
                                                        background: Colors.surface
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={styles.previewItemName}>{ex.nombre}</span>
                                                        <span style={{ fontSize: '11px', color: Colors.textTertiary }}>
                                                            {ex.equipamiento || 'Sin equipo'}
                                                        </span>
                                                    </div>
                                                    <ChevronRight size={16} color={Colors.textTertiary} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: Colors.textSecondary }}>
                                <Dumbbell size={32} color={Colors.border} style={{ marginBottom: '12px', opacity: 0.5 }} />
                                <p>No se encontraron ejercicios.</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        );
    }

    function renderExerciseCard(ex: ExerciseTracking, isPartner: boolean = false) {
        const globalIdx = activeSession?.exercises.findIndex(e => e.id === ex.id) ?? 0;
        const isDualSession = activeSession?.isDualSession; // Mostrar dual row en shared y linked modes
        const partnerExercises = activeSession?.partnerExercises;
        const partnerEx = isDualSession && partnerExercises ? partnerExercises.find((pEx: ExerciseTracking) => pEx.id === ex.id) : null;
        const isResting = guidedMode.active && guidedMode.exerciseId === ex.id && guidedMode.phase === 'rest';

        return (
            <Card key={ex.id} style={{
                ...styles.exerciseCard,
                borderColor: expandedExercises.includes(ex.id) ? `${Colors.primary}40` : Colors.border,
                backgroundColor: ex.isSkipped ? `${Colors.error}10` : Colors.surface,
            }}>
                <div
                    style={styles.exerciseHeader}
                    onClick={() => toggleExpand(ex.id)}
                >
                    <div style={{ flex: 1 }}>
                        <h3 style={{
                            ...styles.exerciseName,
                            color: ex.sets.every(s => s.completed || s.skipped) ? Colors.textTertiary : Colors.text
                        }}>
                            {isResting ? 'Descanso' : `${globalIdx + 1}. ${ex.nombre}`}
                            {ex.sets.every(s => s.completed || s.skipped) && ' - OK'}
                            {ex.isOptional && (
                                <span style={{
                                    fontSize: '10px',
                                    backgroundColor: Colors.surfaceLight,
                                    color: Colors.textSecondary,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    marginLeft: '8px',
                                    border: `1px solid ${Colors.border}`
                                }}>
                                    OPCIONAL
                                </span>
                            )}
                        </h3>
                        <p style={styles.exerciseMeta}>{ex.targetSeries} series</p>
                    </div>
                    <div style={styles.exerciseActions}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleVariantClick(ex.id);
                            }}
                            style={styles.actionIconBtn}
                        >
                            <Shuffle size={18} color={Colors.textSecondary} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDiscardClick(ex.id);
                            }}
                            style={styles.actionIconBtn}
                        >
                            <Trash2 size={18} color={Colors.textSecondary} />
                        </button>
                        <div style={{ width: '1px', height: '16px', background: Colors.border, margin: '0 4px' }} />
                        {expandedExercises.includes(ex.id) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                </div>

                <AnimatePresence>
                    {expandedExercises.includes(ex.id) && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{ overflow: 'hidden' }}
                        >
                            <div style={styles.setsContainer}>
                                {(() => {
                                    const videoUrl = toTrustedExternalVideoUrl(getExerciseVideo(ex.nombre));
                                    const imageSrc = ex.imagen || getExerciseImage(ex.nombre);
                                    return (
                                        <div style={styles.previewContainer}>
                                            <img
                                                src={imageSrc}
                                                style={styles.previewImage}
                                                alt={ex.nombre}
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&auto=format&fit=crop';
                                                }}
                                            />
                                            {videoUrl && (
                                                <a href={videoUrl} target="_blank" rel="noopener noreferrer" style={styles.playOverlay}>
                                                    <Play size={18} color="#fff" fill="#fff" />
                                                </a>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* Start Exercise Button or Timer Display */}
                                {activeExerciseId !== ex.id ? (
                                    <div style={styles.startButtonContainer}>
                                        <button
                                            style={styles.startExerciseBtn}
                                            onClick={() => handleStartExercise(ex.id)}
                                        >
                                            <Play size={24} color={Colors.background} />
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                                <span style={{ fontSize: '16px', fontWeight: 800 }}>Comenzar Ejercicio</span>
                                            </div>
                                        </button>
                                    </div>
                                ) : isTimeBased(ex.targetReps) && isTimerRunning && activeExerciseId === ex.id ? (
                                    <div style={styles.timerDisplay}>
                                        <Clock size={32} color={Colors.primary} />
                                        <div style={styles.timerText}>
                                            {timerSeconds < 0 ? `-${formatTime(Math.abs(timerSeconds))}` : formatTime(timerSeconds)}
                                        </div>
                                        <button
                                            style={styles.pauseBtn}
                                            onClick={() => setIsTimerRunning(false)}
                                        >
                                            <Pause size={20} />
                                        </button>
                                    </div>
                                ) : isTimerRunning ? (
                                    <div style={styles.timerDisplay}>
                                        <Clock size={32} color={Colors.textSecondary} />
                                        <div style={styles.timerText}>{formatTime(timerSeconds)}</div>
                                        <button
                                            style={styles.pauseBtn}
                                            onClick={() => setIsTimerRunning(false)}
                                        >
                                            <Pause size={20} />
                                        </button>
                                    </div>
                                ) : null}

                                {isDualSession && partnerEx ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {/* Header for dual session */}
                                        <div style={{ 
                                            display: 'grid',
                                            gridTemplateColumns: '0.5fr 0.8fr 1fr 1fr 1fr 1fr 0.6fr',
                                            gap: '4px',
                                            padding: '4px 8px 8px 8px',
                                            borderBottom: `1px solid ${Colors.border}`
                                        }}>
                                            <span style={{ ...styles.setHeaderCell, textAlign: 'center' }}>#</span>
                                            <span style={{ ...styles.setHeaderCell, textAlign: 'center' }}>QUIEN</span>
                                            <span style={{ ...styles.setHeaderCell, textAlign: 'center' }}>KG</span>
                                            <span style={{ ...styles.setHeaderCell, textAlign: 'center' }}>REPS</span>
                                            <span style={{ ...styles.setHeaderCell, textAlign: 'center' }}>TIEMPO</span>
                                            <span style={{ ...styles.setHeaderCell, textAlign: 'center' }}>DESC.</span>
                                            <span></span>
                                        </div>
                                        {ex.sets.map((_set, sIdx) => renderDualSetRow(ex, partnerEx, sIdx))}
                                    </div>
                                ) : (
                                    <>
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: '0.8fr 1.2fr 1.2fr 1.2fr 1.2fr 1fr',
                                            gap: '8px',
                                            marginBottom: '12px',
                                            marginTop: '8px',
                                            padding: '0 4px'
                                        }}>
                                            <span style={{ fontSize: '10px', fontWeight: 800, color: Colors.textTertiary, textAlign: 'center' }}>#</span>
                                            <span style={{ fontSize: '10px', fontWeight: 800, color: Colors.textTertiary, textAlign: 'center' }}>PESO (kg)</span>
                                            <span style={{ fontSize: '10px', fontWeight: 800, color: Colors.textTertiary, textAlign: 'center' }}>REPS</span>
                                            <span style={{ fontSize: '10px', fontWeight: 800, color: Colors.textTertiary, textAlign: 'center' }}>TIEMPO (s)</span>
                                            <span style={{ fontSize: '10px', fontWeight: 800, color: Colors.textTertiary, textAlign: 'center' }}>DESC. (s)</span>
                                            <span></span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {ex.sets.map((set, sIdx) => (
                                                <div
                                                    key={sIdx}
                                                    style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: '0.8fr 1.2fr 1.2fr 1.2fr 1.2fr 1fr',
                                                        gap: '8px',
                                                        alignItems: 'center',
                                                        background: set.completed ? `${Colors.success}10` : set.skipped ? `${Colors.surfaceLight}` : Colors.surface,
                                                        padding: '8px 4px',
                                                        borderRadius: '12px',
                                                        border: `1px solid ${set.completed ? `${Colors.success}30` : Colors.border}`,
                                                        opacity: (set.completed || set.skipped) ? 0.7 : 1
                                                    }}
                                                >
                                                    <span style={{ ...styles.setNumber, background: 'transparent' }}>{sIdx + 1}</span>

                                                    <input
                                                        type="number"
                                                        placeholder="0"
                                                        value={set.weight || ''}
                                                        onChange={(e) => updateSet(ex.id, sIdx, { weight: parseFloat(e.target.value) || 0 })}
                                                        style={styles.newInput}
                                                        disabled={set.completed || set.skipped}
                                                        onFocus={(e) => { setActiveExerciseId(ex.id); e.target.select(); }}
                                                    />

                                                    <input
                                                        type="number"
                                                        placeholder="0"
                                                        value={set.reps || ''}
                                                        onChange={(e) => updateSet(ex.id, sIdx, { reps: parseInt(e.target.value) || 0 })}
                                                        style={styles.newInput}
                                                        disabled={set.completed || set.skipped}
                                                        onFocus={(e) => { setActiveExerciseId(ex.id); e.target.select(); }}
                                                    />

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                        <input
                                                            type="number"
                                                            placeholder="-"
                                                            value={(() => {
                                                                const val = set.duration || 0;
                                                                const unit = durationUnits[`${ex.id}-${sIdx}`] || 's';
                                                                if (unit === 'm') return parseFloat((val / 60).toFixed(2));
                                                                if (unit === 'h') return parseFloat((val / 3600).toFixed(2));
                                                                return val;
                                                            })() || ''}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value) || 0;
                                                                const unit = durationUnits[`${ex.id}-${sIdx}`] || 's';
                                                                let multiplier = 1;
                                                                if (unit === 'm') multiplier = 60;
                                                                if (unit === 'h') multiplier = 3600;
                                                                updateSet(ex.id, sIdx, { duration: Math.round(val * multiplier) });
                                                            }}
                                                            style={{ ...styles.newInput, padding: '8px 2px', minWidth: 0 }}
                                                            disabled={set.completed || set.skipped}
                                                            onFocus={(e) => { setActiveExerciseId(ex.id); e.target.select(); }}
                                                        />
                                                        <select
                                                            value={durationUnits[`${ex.id}-${sIdx}`] || 's'}
                                                            onChange={(e) => setDurationUnits({ ...durationUnits, [`${ex.id}-${sIdx}`]: e.target.value as DurationUnit })}
                                                            style={{
                                                                background: 'transparent',
                                                                border: 'none',
                                                                color: Colors.textSecondary,
                                                                fontSize: '10px',
                                                                padding: 0,
                                                                cursor: 'pointer',
                                                                width: '30px'
                                                            }}
                                                            disabled={set.completed || set.skipped}
                                                        >
                                                            <option value="s">s</option>
                                                            <option value="m">m</option>
                                                            <option value="h">h</option>
                                                        </select>
                                                    </div>

                                                    <input
                                                        type="number"
                                                        placeholder="-"
                                                        value={set.rest || ''}
                                                        onChange={(e) => updateSet(ex.id, sIdx, { rest: parseInt(e.target.value) || 0 })}
                                                        style={styles.newInput}
                                                        disabled={set.completed || set.skipped}
                                                        onFocus={() => setActiveExerciseId(ex.id)}
                                                    />

                                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                        {!set.completed && !set.skipped ? (
                                                            (isTimeBased(ex.targetReps) && ex.categoria === 'calentamiento') ? (
                                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                                    <button
                                                                        style={{ ...styles.checkBtn, background: Colors.surface, border: `1px solid ${Colors.border}`, color: Colors.textSecondary }}
                                                                        onClick={() => updateSet(ex.id, sIdx, { skipped: true })}
                                                                    >
                                                                        <SkipForward size={14} />
                                                                    </button>
                                                                    <button
                                                                        style={styles.checkBtn}
                                                                        onClick={() => handleStartSet(ex.id, sIdx)}
                                                                    >
                                                                        <Play size={16} />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                                    <button
                                                                        style={{ ...styles.checkBtn, background: Colors.surface, border: `1px solid ${Colors.border}`, color: Colors.textSecondary }}
                                                                        onClick={() => updateSet(ex.id, sIdx, { skipped: true })}
                                                                    >
                                                                        <SkipForward size={14} />
                                                                    </button>
                                                                    <button
                                                                        style={styles.checkBtn}
                                                                        onClick={() => updateSet(ex.id, sIdx, { completed: true })}
                                                                    >
                                                                        <Check size={18} />
                                                                    </button>
                                                                </div>
                                                            )
                                                        ) : (
                                                            <button
                                                                style={styles.undoIconBtn}
                                                                onClick={() => updateSet(ex.id, sIdx, { completed: false, skipped: false })}
                                                            >
                                                                <RotateCcw size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {/* Complete Exercise Button */}
                                {ex.sets.every(s => s.completed || s.skipped) && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        style={{ marginTop: '16px' }}
                                    >
                                        <button
                                            style={styles.completeExerciseBtn}
                                            onClick={() => {
                                                const shouldFinish = window.confirm('Finalizar ejercicio? Desaparecera de la lista activa.');
                                                if (!shouldFinish) return;
                                                markExerciseAsCompleted(ex.id, isPartner);
                                                setIsTimerRunning(false);
                                                setTimerSeconds(0);
                                                toast.success('Ejercicio finalizado', { id: 'exercise-manual-finished', duration: 3000 });
                                            }}
                                        >
                                            <Check size={20} />
                                            <span>Finalizar Ejercicio</span>
                                        </button>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>
        );
    }
    function renderDualSetRow(userEx: ExerciseTracking, partnerEx: ExerciseTracking, sIdx: number) {
        const userSet = userEx.sets[sIdx];
        const partnerSet = partnerEx.sets[sIdx];
        const bothCompleted = userSet.completed && partnerSet.completed;
        const bothSkipped = userSet.skipped && partnerSet.skipped;
        const userName = perfil.usuario.nombre.split(' ')[0];
        const partnerName = activeSession?.selectedPartnerName || perfil.pareja?.nombre.split(' ')[0] || 'Partner';

        const gridCols = '0.5fr 0.8fr 1fr 1fr 1fr 1fr 0.6fr';

        return (
            <div
                key={sIdx}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    marginBottom: '8px',
                    background: bothCompleted ? `${Colors.success}10` : bothSkipped ? Colors.surfaceLight : Colors.surface,
                    border: `1px solid ${bothCompleted ? `${Colors.success}30` : Colors.border}`,
                    borderRadius: '12px',
                    padding: '6px 8px',
                    opacity: (bothCompleted || bothSkipped) ? 0.7 : 1
                }}
            >
                {/* User Row */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: gridCols,
                    gap: '4px',
                    alignItems: 'center',
                    paddingBottom: '4px'
                }}>
                    <span style={{ ...styles.setNumber, background: 'transparent', fontSize: '11px' }}>{sIdx + 1}</span>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: Colors.text, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</span>
                    
                    <input
                        type="number"
                        placeholder="kg"
                        value={userSet.weight || ''}
                        onChange={(e) => updateSet(userEx.id, sIdx, { weight: parseFloat(e.target.value) || 0 }, false)}
                        style={{ ...styles.dualInput, padding: '6px 4px', fontSize: '13px' }}
                        disabled={userSet.completed || userSet.skipped}
                    />
                    <input
                        type="number"
                        placeholder="reps"
                        value={userSet.reps || ''}
                        onChange={(e) => updateSet(userEx.id, sIdx, { reps: parseInt(e.target.value) || 0 }, false)}
                        style={{ ...styles.dualInput, padding: '6px 4px', fontSize: '13px' }}
                        disabled={userSet.completed || userSet.skipped}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <input
                            type="number"
                            placeholder="-"
                            value={(() => {
                                const val = userSet.duration || 0;
                                const unit = durationUnits[`${userEx.id}-${sIdx}-user`] || 's';
                                if (unit === 'm') return parseFloat((val / 60).toFixed(2));
                                if (unit === 'h') return parseFloat((val / 3600).toFixed(2));
                                return val;
                            })() || ''}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                const unit = durationUnits[`${userEx.id}-${sIdx}-user`] || 's';
                                let multiplier = 1;
                                if (unit === 'm') multiplier = 60;
                                if (unit === 'h') multiplier = 3600;
                                updateSet(userEx.id, sIdx, { duration: Math.round(val * multiplier) }, false);
                            }}
                            style={{ ...styles.dualInput, padding: '6px 2px', fontSize: '12px', minWidth: 0 }}
                            disabled={userSet.completed || userSet.skipped}
                        />
                        <select
                            value={durationUnits[`${userEx.id}-${sIdx}-user`] || 's'}
                            onChange={(e) => setDurationUnits({ ...durationUnits, [`${userEx.id}-${sIdx}-user`]: e.target.value as DurationUnit })}
                            style={{ background: 'transparent', border: 'none', color: Colors.textSecondary, fontSize: '9px', padding: 0, cursor: 'pointer', width: '22px' }}
                            disabled={userSet.completed || userSet.skipped}
                        >
                            <option value="s">s</option>
                            <option value="m">m</option>
                            <option value="h">h</option>
                        </select>
                    </div>
                    <input
                        type="number"
                        placeholder="-"
                        value={userSet.rest || ''}
                        onChange={(e) => updateSet(userEx.id, sIdx, { rest: parseInt(e.target.value) || 0 }, false)}
                        style={{ ...styles.dualInput, padding: '6px 4px', fontSize: '13px' }}
                        disabled={userSet.completed || userSet.skipped}
                    />
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        {!userSet.completed && !userSet.skipped ? (
                            <button style={{ ...styles.checkBtn, width: '26px', height: '26px' }} onClick={() => updateSet(userEx.id, sIdx, { completed: true }, false)}>
                                <Check size={14} />
                            </button>
                        ) : (
                            <button style={{ ...styles.undoIconBtn, width: '26px', height: '26px' }} onClick={() => updateSet(userEx.id, sIdx, { completed: false, skipped: false }, false)}>
                                <RotateCcw size={12} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Partner Row */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: gridCols,
                    gap: '4px',
                    alignItems: 'center',
                    paddingTop: '4px',
                    borderTop: `1px dashed ${Colors.border}`
                }}>
                    <span style={{ fontSize: '10px', color: 'transparent' }}>-</span>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: Colors.primary, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{partnerName}</span>
                    
                    <input
                        type="number"
                        placeholder="kg"
                        value={partnerSet.weight || ''}
                        onChange={(e) => updateSet(userEx.id, sIdx, { weight: parseFloat(e.target.value) || 0 }, true)}
                        style={{ ...styles.dualInput, padding: '6px 4px', fontSize: '13px' }}
                        disabled={partnerSet.completed || partnerSet.skipped}
                    />
                    <input
                        type="number"
                        placeholder="reps"
                        value={partnerSet.reps || ''}
                        onChange={(e) => updateSet(userEx.id, sIdx, { reps: parseInt(e.target.value) || 0 }, true)}
                        style={{ ...styles.dualInput, padding: '6px 4px', fontSize: '13px' }}
                        disabled={partnerSet.completed || partnerSet.skipped}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <input
                            type="number"
                            placeholder="-"
                            value={(() => {
                                const val = partnerSet.duration || 0;
                                const unit = durationUnits[`${userEx.id}-${sIdx}-partner`] || 's';
                                if (unit === 'm') return parseFloat((val / 60).toFixed(2));
                                if (unit === 'h') return parseFloat((val / 3600).toFixed(2));
                                return val;
                            })() || ''}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                const unit = durationUnits[`${userEx.id}-${sIdx}-partner`] || 's';
                                let multiplier = 1;
                                if (unit === 'm') multiplier = 60;
                                if (unit === 'h') multiplier = 3600;
                                updateSet(userEx.id, sIdx, { duration: Math.round(val * multiplier) }, true);
                            }}
                            style={{ ...styles.dualInput, padding: '6px 2px', fontSize: '12px', minWidth: 0 }}
                            disabled={partnerSet.completed || partnerSet.skipped}
                        />
                        <select
                            value={durationUnits[`${userEx.id}-${sIdx}-partner`] || 's'}
                            onChange={(e) => setDurationUnits({ ...durationUnits, [`${userEx.id}-${sIdx}-partner`]: e.target.value as DurationUnit })}
                            style={{ background: 'transparent', border: 'none', color: Colors.textSecondary, fontSize: '9px', padding: 0, cursor: 'pointer', width: '22px' }}
                            disabled={partnerSet.completed || partnerSet.skipped}
                        >
                            <option value="s">s</option>
                            <option value="m">m</option>
                            <option value="h">h</option>
                        </select>
                    </div>
                    <input
                        type="number"
                        placeholder="-"
                        value={partnerSet.rest || ''}
                        onChange={(e) => updateSet(userEx.id, sIdx, { rest: parseInt(e.target.value) || 0 }, true)}
                        style={{ ...styles.dualInput, padding: '6px 4px', fontSize: '13px' }}
                        disabled={partnerSet.completed || partnerSet.skipped}
                    />
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        {!partnerSet.completed && !partnerSet.skipped ? (
                            <button style={{ ...styles.checkBtn, width: '26px', height: '26px' }} onClick={() => updateSet(userEx.id, sIdx, { completed: true }, true)}>
                                <Check size={14} />
                            </button>
                        ) : (
                            <button style={{ ...styles.undoIconBtn, width: '26px', height: '26px' }} onClick={() => updateSet(userEx.id, sIdx, { completed: false, skipped: false }, true)}>
                                <RotateCcw size={12} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }
};

const styles: Record<string, React.CSSProperties> = {
    fullOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: Colors.background,
        zIndex: 5000,
        display: 'flex',
        flexDirection: 'column',
    },
    dualSetHeader: {
        display: 'grid',
        gap: '8px',
        padding: '0 4px 8px 4px',
        borderBottom: `1px solid ${Colors.border}`,
    },
    dualSetRow: {
        display: 'grid',
        gridTemplateColumns: '0.8fr 2.4fr 2.4fr 1fr',
        gap: '8px',
        alignItems: 'center',
        padding: '8px 4px',
        borderRadius: '12px',
    },
    dualInputGroup: {
        display: 'flex',
        gap: '8px',
    },
    dualInput: {
        width: '100%',
        background: Colors.background,
        border: `1px solid ${Colors.border}`,
        borderRadius: '8px',
        padding: '12px 8px',
        color: Colors.text,
        fontSize: '14px',
        textAlign: 'center',
        outline: 'none',
    },
    dualSetActions: {
        display: 'flex',
        justifyContent: 'center',
    },
    header: {
        padding: '16px 20px',
        paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: Colors.surface,
        borderBottom: `1px solid ${Colors.border}`,
    },
    headerTitle: {
        fontSize: '16px',
        fontWeight: 800,
        color: Colors.text,
    },
    iconBtn: {
        background: 'transparent',
        border: 'none',
        padding: '8px',
        cursor: 'pointer',
    },
    actionIconBtn: {
        background: 'transparent',
        border: 'none',
        padding: '8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px',
    },
    timerBadge: {
        background: `${Colors.primary}15`,
        color: Colors.primary,
        padding: '6px 14px',
        borderRadius: '20px',
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '14px',
        letterSpacing: '0.5px'
    },
    finishBtn: {
        background: Colors.primary,
        color: '#000',
        border: 'none',
        borderRadius: '14px',
        padding: '8px 16px',
        fontWeight: 800,
        fontSize: '13px',
        cursor: 'pointer',
    },
    progressContainer: {
        height: '4px',
        background: Colors.surface,
        width: '100%',
    },
    progressFill: {
        height: '100%',
        background: Colors.primary,
        transition: 'width 0.3s ease',
    },
    // Tab styles removed - using inline dual layout instead
    activeContent: {
        flex: 1,
        padding: '20px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    previewContent: {
        flex: 1,
        padding: '30px 20px',
        overflowY: 'auto',
    },
    previewHero: {
        marginBottom: '40px',
        textAlign: 'center',
    },
    previewDay: {
        fontSize: '14px',
        fontWeight: 800,
        color: Colors.primary,
        textTransform: 'uppercase',
        letterSpacing: '2px',
    },
    previewRoutineName: {
        fontSize: '32px',
        fontWeight: 900,
        color: Colors.text,
        margin: '12px 0 20px 0',
        lineHeight: 1.1,
    },
    previewStats: {
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
    },
    prevStat: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        color: Colors.textSecondary,
        fontWeight: 600,
    },
    exerciseListPreview: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    previewItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px',
        background: Colors.surface,
        borderRadius: '20px',
    },
    previewNumber: {
        fontSize: '18px',
        fontWeight: 900,
        color: Colors.textTertiary,
        width: '24px',
    },
    previewItemInfo: {
        flex: 1,
    },
    previewItemName: {
        fontSize: '16px',
        fontWeight: 700,
        color: Colors.text,
        margin: '0 0 2px 0',
    },
    previewItemMeta: {
        fontSize: '13px',
        color: Colors.textSecondary,
        margin: 0,
    },
    bottomAction: {
        padding: '20px',
        paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
        background: 'linear-gradient(to top, #0A0A0B 80%, transparent)',
    },
    startBtn: {
        width: '100%',
        background: Colors.primary,
        color: '#000',
        border: 'none',
        borderRadius: '20px',
        padding: '20px',
        fontSize: '16px',
        fontWeight: 900,
        cursor: 'pointer',
        boxShadow: `0 10px 30px ${Colors.primary}30`,
    },

    exerciseCard: {
        marginBottom: '16px',
        border: '1px solid',
        transition: 'all 0.3s ease',
    },
    exerciseHeader: {
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer',
    },
    exerciseName: {
        fontSize: '18px',
        fontWeight: 800,
        margin: '0 0 2px 0',
    },
    exerciseMeta: {
        fontSize: '13px',
        color: Colors.textSecondary,
        margin: 0,
    },
    setsContainer: {
        padding: '0 16px 16px 16px',
    },
    setsHeader: {
        display: 'flex',
        padding: '8px 0',
        borderBottom: `1px solid ${Colors.border}`,
        marginBottom: '8px',
    },
    setHeaderCell: {
        flex: 1,
        fontSize: '10px',
        fontWeight: 800,
        color: Colors.textTertiary,
        textAlign: 'center',
    },
    setRow: {
        display: 'flex',
        alignItems: 'center',
        padding: '10px 0',
        borderRadius: '12px',
        marginBottom: '4px',
    },
    setNumber: {
        flex: 1,
        textAlign: 'center',
        fontSize: '14px',
        fontWeight: 800,
        color: Colors.textSecondary,
    },
    setInput: {
        flex: 1,
        width: '40px',
        background: Colors.background,
        border: `1px solid ${Colors.border}`,
        borderRadius: '8px',
        padding: '8px 4px',
        color: Colors.text,
        fontSize: '14px',
        textAlign: 'center',
        margin: '0 4px',
        outline: 'none',
    },
    setActions: {
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        gap: '6px',
    },
    checkBtn: {
        width: '32px',
        height: '32px',
        borderRadius: '10px',
        background: Colors.success,
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFF',
        cursor: 'pointer',
    },
    skipBtn: {
        width: '32px',
        height: '32px',
        borderRadius: '10px',
        background: Colors.surfaceLight,
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: Colors.textSecondary,
        cursor: 'pointer',
    },
    undoBtn: {
        fontSize: '11px',
        fontWeight: 700,
        color: Colors.primary,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
    },
    previewContainer: {
        position: 'relative',
        width: '100%',
        height: '140px',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '16px',
        background: Colors.surface,
    },
    previewImage: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        opacity: 0.8,
    },
    playOverlay: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '44px',
        height: '44px',
        background: 'rgba(255, 0, 0, 0.9)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: '18px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
        textDecoration: 'none',
    },
    sectionHeader: {
        padding: '20px 0 16px 0',
        borderBottom: `2px solid ${Colors.border}`,
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    sectionEmoji: {
        fontSize: '28px',
    },
    sectionTextContainer: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: '14px',
        fontWeight: 900,
        color: Colors.text,
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        margin: '0 0 4px 0',
    },
    sectionSubtitle: {
        fontSize: '12px',
        color: Colors.textSecondary,
        margin: 0,
    },
    exerciseActions: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    replaceBtn: {
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        background: Colors.surfaceLight,
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
    },
    addExerciseBtn: {
        width: '100%',
        padding: '16px',
        marginTop: '16px',
        borderRadius: '16px',
        background: `${Colors.primary}15`,
        border: `2px dashed ${Colors.primary}40`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 700,
        color: Colors.primary,
    },
    startButtonContainer: {
        display: 'flex',
        justifyContent: 'center',
        padding: '20px 0',
        marginBottom: '16px',
    },
    startExerciseBtn: {
        padding: '14px 32px',
        borderRadius: '12px',
        background: Colors.primary,
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: 700,
        color: Colors.background,
        boxShadow: `0 4px 12px ${Colors.primary}40`,
        transition: 'all 0.2s ease',
    },
    timerDisplay: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        padding: '24px',
        marginBottom: '16px',
        background: `${Colors.primary}10`,
        borderRadius: '12px',
        gap: '12px',
    },
    timerText: {
        fontSize: '48px',
        fontWeight: 900,
        color: Colors.primary,
        fontFamily: 'monospace',
    },
    pauseBtn: {
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: Colors.surfaceLight,
        border: `2px solid ${Colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(10px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    modalContent: {
        width: '100%',
        height: '90vh',
        background: Colors.background,
        borderTopLeftRadius: '32px',
        borderTopRightRadius: '32px',
        display: 'flex',
        flexDirection: 'column' as const,
        overflow: 'hidden',
    },
    modalHeader: {
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${Colors.border}`,
    },
    modalTitle: {
        fontSize: '20px',
        fontWeight: 800,
        color: Colors.text,
        margin: 0,
    },
    closeModalBtn: {
        background: Colors.surface,
        border: 'none',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: Colors.text,
        cursor: 'pointer',
    },
    searchContainer: {
        padding: '16px 24px',
    },
    searchInput: {
        width: '100%',
        padding: '16px 20px',
        borderRadius: '16px',
        background: Colors.surface,
        border: `2px solid ${Colors.border}`,
        color: Colors.text,
        fontSize: '16px',
        outline: 'none',
    },
    exerciseList: {
        flex: 1,
        overflowY: 'auto' as const,
        padding: '0 24px 40px 24px',
    },
    exerciseListItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px',
        borderRadius: '16px',
        background: Colors.surfaceLight,
        marginBottom: '12px',
        cursor: 'pointer',
    },
    groupBadge: {
        width: '44px',
        height: '44px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
    },
    exerciseInfo: {
        flex: 1,
    },
    exerciseLabel: {
        fontSize: '16px',
        fontWeight: 700,
        color: Colors.text,
        marginBottom: '2px',
    },
    exerciseGroup: {
        fontSize: '12px',
        color: Colors.textSecondary,
    },
    newInput: {
        width: '100%',
        background: Colors.background,
        border: `1px solid ${Colors.border}`,
        borderRadius: '8px',
        padding: '8px 4px',
        color: Colors.text,
        fontSize: '14px',
        textAlign: 'center',
        outline: 'none',
        fontWeight: 600,
    },
    undoIconBtn: {
        width: '32px',
        height: '32px',
        borderRadius: '10px',
        background: Colors.surfaceLight,
        border: `1px solid ${Colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: Colors.textSecondary,
        cursor: 'pointer',
    },
    completeExerciseBtn: {
        width: '100%',
        padding: '16px',
        borderRadius: '12px',
        background: Colors.success,
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: 700,
        color: '#fff',
        boxShadow: `0 4px 12px ${Colors.success}40`,
    },
    optionBtn: {
        display: 'flex',
        alignItems: 'center',
        padding: '20px',
        background: Colors.surfaceLight,
        borderRadius: '16px',
        border: `1px solid ${Colors.border}`,
        width: '100%',
        cursor: 'pointer',
        textAlign: 'left' as const,
        gap: '16px',
    },
    optionIcon: {
        fontSize: '24px',
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        background: Colors.surface,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionText: {
        flex: 1,
    },
    inputLabel: {
        display: 'block',
        marginBottom: '8px',
        fontSize: '14px',
        color: Colors.textSecondary,
        fontWeight: 600,
    },
    textArea: {
        width: '100%',
        padding: '16px',
        borderRadius: '16px',
        background: Colors.surface,
        border: `2px solid ${Colors.border}`,
        color: Colors.text,
        fontSize: '16px',
        outline: 'none',
        resize: 'none' as const,
        fontFamily: 'inherit',
    },
    guidedContainer: {
        width: '92%',
        maxWidth: '420px',
        background: Colors.background,
        borderRadius: '28px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'stretch',
        gap: '12px',
        boxShadow: `0 20px 40px rgba(0,0,0,0.5)`,
        border: `1px solid ${Colors.border}`,
        marginBottom: '40px',
        maxHeight: '86vh',
        overflowY: 'auto' as const,
    },
    guidedHeaderRow: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '8px',
    },
    guidedHeaderText: {
        minWidth: 0,
        flex: 1,
    },
    guidedHeaderActions: {
        display: 'flex',
        gap: '4px',
        flexShrink: 0,
    },
    guidedMediaButton: {
        width: '100%',
        border: 'none',
        padding: 0,
        position: 'relative' as const,
        borderRadius: '14px',
        overflow: 'hidden',
        background: Colors.surface,
        textAlign: 'left' as const,
    },
    guidedPlayBadge: {
        position: 'absolute' as const,
        right: '10px',
        bottom: '10px',
        background: 'rgba(0,0,0,0.72)',
        color: '#fff',
        borderRadius: '999px',
        padding: '6px 10px',
        fontSize: '12px',
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
    },
    guidedPreviewImage: {
        width: '100%',
        height: '148px',
        objectFit: 'cover' as const,
    },
    guidedSummaryCard: {
        width: '100%',
        background: Colors.surface,
        border: `1px solid ${Colors.border}`,
        borderRadius: '12px',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '6px',
    },
    guidedSummaryRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: Colors.text,
        fontSize: '13px',
    },
    guidedSummaryLabel: {
        color: Colors.textSecondary,
        fontWeight: 600,
    },
    guidedSetInputGrid: {
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
    },
    guidedHeader: {
        textAlign: 'center' as const,
    },
    guidedTitle: {
        fontSize: '22px',
        fontWeight: 900,
        color: Colors.text,
        marginBottom: '4px',
        textAlign: 'center' as const,
        lineHeight: 1.2,
    },
    guidedSubtitle: {
        fontSize: '13px',
        color: Colors.textSecondary,
        textAlign: 'center' as const,
    },
    guidedTimerContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 0,
        background: 'transparent',
        border: 'none',
        width: '100%',
    },
    guidedTimerCircle: {
        width: '180px',
        height: '180px',
        borderRadius: '50%',
        border: `6px solid`,
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        background: Colors.surface,
        boxShadow: `0 0 24px rgba(0,0,0,0.25)`,
    },
    guidedTimerValue: {
        fontSize: '50px',
        fontWeight: 900,
        color: Colors.text,
        fontFamily: 'monospace',
        lineHeight: 1,
    },
    guidedTimerLabel: {
        fontSize: '12px',
        fontWeight: 800,
        letterSpacing: '1px',
        color: Colors.textSecondary,
        marginTop: '6px',
    },
    guidedTimerStartBtn: {
        width: '100%',
        border: `1px solid ${Colors.primary}60`,
        background: `${Colors.primary}1a`,
        color: Colors.primary,
        borderRadius: '12px',
        padding: '14px',
        fontWeight: 800,
        fontSize: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
    },
    guidedPausedActions: {
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
    },
    guidedSecondaryBtn: {
        border: `1px solid ${Colors.border}`,
        background: Colors.surface,
        color: Colors.text,
        borderRadius: '10px',
        padding: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        fontSize: '13px',
        fontWeight: 700,
    },
    guidedActions: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '8px',
    },
    guidedActionBtn: {
        background: Colors.primary,
        color: '#000',
        border: 'none',
        padding: '14px 20px',
        borderRadius: '14px',
        fontSize: '16px',
        fontWeight: 800,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        width: '100%',
        justifyContent: 'center'
    },
    guidedCancelBtn: {
        width: '100%',
        padding: '10px',
        background: 'transparent',
        border: 'none',
        color: Colors.textSecondary,
        fontSize: '13px',
        cursor: 'pointer',
    },
    variantSearchContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        background: Colors.surface,
        borderRadius: '16px',
        border: `1px solid ${Colors.border}`,
    },
    variantSearchInput: {
        background: 'transparent',
        border: 'none',
        flex: 1,
        fontSize: '16px',
        color: Colors.text,
        outline: 'none',
    },
    partnerWidget: {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '280px',
        background: Colors.surface,
        border: `2px solid ${Colors.primary}`,
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        zIndex: 1000,
    },
    partnerWidgetHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
    },
    partnerWidgetTitle: {
        fontSize: '16px',
        fontWeight: 800,
        color: Colors.text,
    },
    partnerOnlineIndicator: {
        fontSize: '12px',
        color: Colors.success,
        animation: 'pulse 2s infinite',
    },
    partnerWidgetContent: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginBottom: '12px',
    },
    partnerCurrentExercise: {
        fontSize: '14px',
        fontWeight: 700,
        color: Colors.primary,
    },
    partnerProgress: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    partnerProgressText: {
        fontSize: '12px',
        color: Colors.textSecondary,
    },
    partnerWidgetExpand: {
        width: '100%',
        padding: '8px',
        background: `${Colors.primary}15`,
        border: `1px solid ${Colors.primary}`,
        borderRadius: '8px',
        color: Colors.primary,
        fontSize: '12px',
        fontWeight: 700,
        cursor: 'pointer',
    },
    partnerDetailsList: {
        marginTop: '12px',
        borderTop: `1px solid ${Colors.border}`,
        paddingTop: '8px',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '6px',
        maxHeight: '180px',
        overflowY: 'auto',
    },
    partnerDetailsRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '8px',
        fontSize: '11px',
    },
    partnerDetailsName: {
        color: Colors.text,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
        flex: 1,
    },
    partnerDetailsStatus: {
        color: Colors.textSecondary,
        fontWeight: 700,
        fontSize: '10px',
    },
};





