import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore, ExerciseTracking, EjercicioRutina, ExtraActivity, MoodLog } from '@/stores/userStore';
import Colors from '@/styles/colors';
import {
    Check,
    ChevronLeft,
    Clock,
    Dumbbell,
    Plus,
    Save,
    X,
    TrendingUp,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    SkipForward,
    Play,
    Pause,
    Activity,
    ChevronRight,
    Loader,
    RotateCcw
} from 'lucide-react';
import { Card } from './Card';
import { EJERCICIOS_DATABASE, GRUPOS_MUSCULARES, EjercicioBase } from '@/data/exerciseDatabase';
import { getExerciseVideo, getExerciseImage } from '@/data/exerciseMedia';
import { motion, AnimatePresence } from 'framer-motion';
import { MoodCheckin } from './MoodCheckin';
import { toast } from 'react-hot-toast';

interface ActiveWorkoutProps {
    onFinish: () => void;
    onCancel: () => void;
}

export const ActiveWorkout: React.FC<ActiveWorkoutProps> = ({ onFinish, onCancel }) => {
    const {
        perfil,
        activeSession,
        updateSet,
        skipSet,
        finishSession,
        cancelSession,
        replaceExerciseInSession,
        addExerciseToSession,
        markExerciseAsCompleted,
        addExtraActivity
    } = useUserStore();

    const [duration, setDuration] = useState(0);
    const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
    const [timerSeconds, setTimerSeconds] = useState<number>(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [currentSetIndex, setCurrentSetIndex] = useState<number>(0);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedExercises, setExpandedExercises] = useState<string[]>([]);
    const [guidedMode, setGuidedMode] = useState<{
        active: boolean;
        exerciseId: string | null;
        setIndex: number;
        phase: 'work' | 'rest';
    }>({ active: false, exerciseId: null, setIndex: 0, phase: 'work' });

    // Add Exercise Flow State
    const [selectedExerciseForAdd, setSelectedExerciseForAdd] = useState<EjercicioBase | null>(null);
    const [addConfig, setAddConfig] = useState({
        series: 3,
        repeticiones: '10',
        descanso: 60
    });

    // Completion Modal State
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [completionType, setCompletionType] = useState<'routine' | 'extra' | null>(null);
    // Manual Extra Activity State
    const [extraActivityType, setExtraActivityType] = useState<string>('');
    const [extraActivityDuration, setExtraActivityDuration] = useState<string>('');
    const [extraActivityDistance, setExtraActivityDistance] = useState<string>('');
    const [extraActivityIntensity, setExtraActivityIntensity] = useState<'baja' | 'media' | 'alta'>('media');
    const [extraActivityUrl, setExtraActivityUrl] = useState('');
    const [isAddingCustom, setIsAddingCustom] = useState(false);
    const [customActivityName, setCustomActivityName] = useState('');

    // Post-Workout Mood State
    const [showMoodCheckin, setShowMoodCheckin] = useState(false);
    const [pendingCompletion, setPendingCompletion] = useState<{
        type: 'routine' | 'extra';
        duration: number;
        extraData?: ExtraActivity;
    } | null>(null);

    const navigate = useNavigate();

    useEffect(() => {
        const timer = setInterval(() => setDuration(d => d + 1), 1000);
        return () => clearInterval(timer);
    }, []);

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

    // Helper to check if exercise is time-based
    const isTimeBased = (reps: string): boolean => {
        return /\d+\s*(s|seg|segundos?)/i.test(reps);
    };

    // Parse time value from reps string (e.g., "30s" -> 30)
    const parseTimeSeconds = (reps: string): number => {
        const match = reps.match(/(\d+)\s*(s|seg|segundos?)/i);
        return match ? parseInt(match[1]) : 0;
    };

    // Handle exercise authorization
    const handleStartExercise = (exerciseId: string, reps: string) => {
        const exercise = activeSession?.exercises.find(e => e.id === exerciseId);

        // Guided Mode for Warmup
        if (exercise?.categoria === 'calentamiento') {
            setGuidedMode({
                active: true,
                exerciseId: exerciseId,
                setIndex: 0,
                phase: 'work'
            });

            // Set initial timer
            if (isTimeBased(reps)) {
                setTimerSeconds(parseTimeSeconds(reps));
            } else {
                setTimerSeconds(0);
            }
            setIsTimerRunning(true);
            return;
        }

        setActiveExerciseId(exerciseId);
        setCurrentSetIndex(0);
        toast.success(`Entrenamiento iniciado`);

        if (isTimeBased(reps)) {
            const seconds = parseTimeSeconds(reps);
            setTimerSeconds(seconds);
        }

        // Don't toggle expand - exercise is already expanded
    };

    // Handle set authorization (for time-based exercises)
    const handleStartSet = (exerciseId: string, setIndex: number, reps: string) => {
        setActiveExerciseId(exerciseId);
        setCurrentSetIndex(setIndex);
        setIsTimerRunning(true);
        toast.success(`Serie ${setIndex + 1} iniciada`);

        if (isTimeBased(reps)) {
            const seconds = parseTimeSeconds(reps);
            setTimerSeconds(seconds);
            setIsTimerRunning(true);
        }
    };

    // Timer effect
    useEffect(() => {
        if (!isTimerRunning) return;

        const interval = setInterval(() => {
            setTimerSeconds(prev => {
                const isRest = guidedMode.active && guidedMode.phase === 'rest';

                // If Rest Phase (Guided Mode) - Always Count Down
                if (isRest) {
                    if (prev > 0) return prev - 1;
                    if (prev <= 0) {
                        setIsTimerRunning(false); // Rest done, wait for user
                        return 0;
                    }
                    return prev;
                }

                // If Work Phase (Guided or Active)
                const exercise = activeSession?.exercises.find(e => e.id === activeExerciseId || e.id === guidedMode.exerciseId);
                const targetReps = exercise?.targetReps || '';
                const isTimedWork = isTimeBased(targetReps);

                if (isTimedWork) {
                    // Count Down
                    if (prev > 0) return prev - 1;
                    if (prev <= 0) {
                        setIsTimerRunning(false);
                        if (activeExerciseId && !guidedMode.active) {
                            updateSet(activeExerciseId, currentSetIndex, { completed: true });
                        }
                        return 0;
                    }
                    return prev;
                } else {
                    // Count Up (Elapsed Time)
                    return prev + 1;
                }
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isTimerRunning, activeExerciseId, currentSetIndex, guidedMode.active, guidedMode.exerciseId, guidedMode.phase]);

    const handleGuidedNext = () => {
        if (!guidedMode.active || !guidedMode.exerciseId) return;

        const exercise = activeSession?.exercises.find(e => e.id === guidedMode.exerciseId);
        if (!exercise) return;

        if (guidedMode.phase === 'work') {
            // Finish Set
            updateSet(guidedMode.exerciseId, guidedMode.setIndex, { completed: true });

            // Should we go to rest?
            const isLastSet = guidedMode.setIndex >= exercise.sets.length - 1;

            setGuidedMode(prev => ({ ...prev, phase: 'rest' }));
            // Default rest 30s for warmup if not specified, or 0 if it's just a transition
            setTimerSeconds(30);
            setIsTimerRunning(true);
        } else {
            // Finish Rest -> Next Work or Finish Exercise
            const nextSetIndex = guidedMode.setIndex + 1;
            if (nextSetIndex >= exercise.sets.length) {
                // Exercise Complete
                setGuidedMode({ active: false, exerciseId: null, setIndex: 0, phase: 'work' });
                setIsTimerRunning(false);
                setTimerSeconds(0);
                // Optional: Auto-mark exercise as completed or just close modal
                // markExerciseAsCompleted(exercise.id);
            } else {
                // Next Set
                setGuidedMode(prev => ({ ...prev, setIndex: nextSetIndex, phase: 'work' }));
                const nextSetReps = exercise.targetReps;
                if (isTimeBased(nextSetReps)) {
                    setTimerSeconds(parseTimeSeconds(nextSetReps));
                } else {
                    setTimerSeconds(0);
                }
                setIsTimerRunning(true);
            }
        }
    };



    const totalSets = useMemo(() => {
        if (!activeSession) return 0;
        return activeSession.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
    }, [activeSession]);

    const completedSets = useMemo(() => {
        if (!activeSession) return 0;
        return activeSession.exercises.reduce((acc, ex) =>
            acc + ex.sets.filter(s => s.completed || s.skipped).length, 0
        );
    }, [activeSession]);

    const progress = (completedSets / totalSets) * 100;

    // Early return if no active session
    if (!activeSession) return null;

    // Expand first exercise by default if none expanded
    useEffect(() => {
        if (activeSession?.exercises.length > 0 && expandedExercises.length === 0) {
            setExpandedExercises([activeSession.exercises[0].id]);
        }
    }, []);

    return (
        <div style={styles.fullOverlay}>
            {/* Active Header */}
            <div style={styles.header}>
                <button
                    onClick={() => {
                        toast((t) => (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>¿Cancelar entrenamiento actual?</span>
                                <span style={{ fontSize: '12px', color: '#aaa', marginTop: '-8px' }}>No se guardará el progreso.</span>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                    <button
                                        onClick={() => toast.dismiss(t.id)}
                                        style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px' }}
                                    >
                                        Seguir
                                    </button>
                                    <button
                                        onClick={() => {
                                            cancelSession();
                                            onCancel();
                                            toast.dismiss(t.id);
                                        }}
                                        style={{ background: Colors.error, border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ), { duration: 5000 });
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

            <div style={styles.activeContent}>
                {/* Warmup Section */}
                {activeSession.exercises.filter(ex => ex.categoria === 'calentamiento').length > 0 && (
                    <>
                        <div style={styles.sectionHeader}>
                            <span style={styles.sectionEmoji}>🔥</span>
                            <div style={styles.sectionTextContainer}>
                                <h3 style={styles.sectionTitle}>CALENTAMIENTO</h3>
                                <p style={styles.sectionSubtitle}>Prepara tu cuerpo antes de empezar</p>
                            </div>
                        </div>
                        {activeSession.exercises
                            .filter(ex => ex.categoria === 'calentamiento' && !ex.isCompleted)
                            .map((ex, exIdx) => renderExerciseCard(ex, exIdx, 'warmup'))}
                    </>
                )}

                {/* Main Routine Section */}
                <div style={styles.sectionHeader}>
                    <span style={styles.sectionEmoji}>💪</span>
                    <div style={styles.sectionTextContainer}>
                        <h3 style={styles.sectionTitle}>RUTINA PRINCIPAL</h3>
                        <p style={styles.sectionSubtitle}>Dale al botón Play para comenzar cada ejercicio</p>
                    </div>
                </div>
                {activeSession.exercises
                    .filter(ex => ex.categoria !== 'calentamiento' && !ex.isCompleted)
                    .map((ex, exIdx) => renderExerciseCard(ex, exIdx, 'main'))}

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
                                                <label style={styles.inputLabel}>Repeticiones (o Tiempo)</label>
                                                <input
                                                    type="text"
                                                    value={addConfig.repeticiones}
                                                    onChange={(e) => setAddConfig({ ...addConfig, repeticiones: e.target.value })}
                                                    style={styles.searchInput}
                                                />
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
                                                        repeticiones: addConfig.repeticiones,
                                                        descanso: addConfig.descanso,
                                                        categoria: 'maquina'
                                                    });
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
                                                            descanso: 60
                                                        });
                                                    }}
                                                >
                                                    <div style={{
                                                        ...styles.groupBadge,
                                                        background: GRUPOS_MUSCULARES[ex.grupoMuscular]?.color || Colors.surfaceLight
                                                    }}>
                                                        {GRUPOS_MUSCULARES[ex.grupoMuscular]?.emoji}
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
                                    {completionType === 'extra' ? 'Actividad Extra' : '¡Entrenamiento Terminado!'}
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
                                            <div style={styles.optionIcon}>📋</div>
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
                                            <div style={styles.optionIcon}>🏃‍♂️</div>
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
                                                {(perfil.catalogoExtras?.length ? perfil.catalogoExtras : ['Running', 'Ciclismo', 'Natación', 'Fútbol', 'Yoga', 'Pilates', 'Crossfit', 'Boxeo']).map((type) => (
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
                                                <label style={styles.inputLabel}>Duración (min)</label>
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
                                                    videoUrl: extraActivityUrl || undefined,
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
                {guidedMode.active && (
                    <div style={styles.modalOverlay}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            style={styles.guidedContainer}
                        >
                            <div style={styles.guidedHeader}>
                                {(() => {
                                    const ex = activeSession.exercises.find(e => e.id === guidedMode.exerciseId);
                                    return (
                                        <>
                                            <h2 style={styles.guidedTitle}>{ex?.nombre}</h2>
                                            <p style={styles.guidedSubtitle}>
                                                Serie {guidedMode.setIndex + 1} de {ex?.sets.length}
                                            </p>
                                        </>
                                    );
                                })()}
                            </div>

                            <div style={styles.guidedTimerContainer}>
                                <div style={{
                                    ...styles.guidedTimerCircle,
                                    borderColor: guidedMode.phase === 'work' ? Colors.primary : Colors.success
                                }}>
                                    <span style={styles.guidedTimerValue}>{formatTime(timerSeconds)}</span>
                                    <span style={styles.guidedTimerLabel}>
                                        {guidedMode.phase === 'work' ? 'TRABAJO' : 'DESCANSO'}
                                    </span>
                                </div>
                            </div>

                            <div style={styles.guidedActions}>
                                <button
                                    onClick={handleGuidedNext}
                                    style={{
                                        ...styles.guidedActionBtn,
                                        background: guidedMode.phase === 'work' ? Colors.primary : Colors.success
                                    }}
                                >
                                    {guidedMode.phase === 'work' ? (
                                        <>
                                            <Check size={24} /> Terminar Serie
                                        </>
                                    ) : (
                                        <>
                                            <Play size={24} /> Siguiente Serie
                                        </>
                                    )}
                                </button>

                                <button
                                    style={styles.guidedCancelBtn}
                                    onClick={() => {
                                        toast((t) => (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                <span style={{ fontSize: '14px', fontWeight: 600 }}>¿Salir del modo guiado?</span>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={() => toast.dismiss(t.id)}
                                                        style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px' }}
                                                    >
                                                        Seguir
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setGuidedMode({ active: false, exerciseId: null, setIndex: 0, phase: 'work' });
                                                            setIsTimerRunning(false);
                                                            toast.dismiss(t.id);
                                                        }}
                                                        style={{ background: Colors.error, border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}
                                                    >
                                                        Salir
                                                    </button>
                                                </div>
                                            </div>
                                        ), { duration: 5000 });
                                    }}
                                >
                                    Salir
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Mood Checkin Modal */}
            {showMoodCheckin && (
                <MoodCheckin
                    type="post"
                    onComplete={async (moodData) => {
                        if (!pendingCompletion) return;

                        if (pendingCompletion.type === 'extra' && pendingCompletion.extraData) {
                            await addExtraActivity(pendingCompletion.extraData);
                        }

                        await finishSession(pendingCompletion.duration, moodData);
                        onFinish();
                    }}
                    onCancel={() => setShowMoodCheckin(false)}
                />
            )}
        </div>
    );

    function renderExerciseCard(ex: ExerciseTracking, exIdx: number, section: 'warmup' | 'main') {
        const globalIdx = activeSession?.exercises.findIndex(e => e.id === ex.id) ?? 0;
        return (
            <Card key={ex.id} style={{
                ...styles.exerciseCard,
                borderColor: expandedExercises.includes(ex.id) ? `${Colors.primary}40` : Colors.border
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
                            {globalIdx + 1}. {ex.nombre}
                            {ex.sets.every(s => s.completed || s.skipped) && ' ✓'}
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
                        <p style={styles.exerciseMeta}>{ex.targetSeries} series x {ex.targetReps}</p>
                    </div>
                    <div style={styles.exerciseActions}>
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
                                    const videoUrl = getExerciseVideo(ex.nombre);
                                    const imageSrc = getExerciseImage(ex.nombre);
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
                                                    ▶
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
                                            onClick={() => handleStartExercise(ex.id, ex.targetReps)}
                                        >
                                            <Play size={24} color={Colors.background} />
                                            <span>Comenzar Ejercicio</span>
                                        </button>
                                    </div>
                                ) : isTimeBased(ex.targetReps) && isTimerRunning ? (
                                    <div style={styles.timerDisplay}>
                                        <Clock size={32} color={Colors.primary} />
                                        <div style={styles.timerText}>{formatTime(timerSeconds)}</div>
                                        <button
                                            style={styles.pauseBtn}
                                            onClick={() => setIsTimerRunning(false)}
                                        >
                                            <Pause size={20} />
                                        </button>
                                    </div>
                                ) : null}

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
                                            />

                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={set.reps || ''}
                                                onChange={(e) => updateSet(ex.id, sIdx, { reps: parseInt(e.target.value) || 0 })}
                                                style={styles.newInput}
                                                disabled={set.completed || set.skipped}
                                            />

                                            <input
                                                type="number"
                                                placeholder="-"
                                                value={set.duration || ''}
                                                onChange={(e) => updateSet(ex.id, sIdx, { duration: parseInt(e.target.value) || 0 })}
                                                style={styles.newInput}
                                                disabled={set.completed || set.skipped}
                                            />

                                            <input
                                                type="number"
                                                placeholder="-"
                                                value={set.rest || ''}
                                                onChange={(e) => updateSet(ex.id, sIdx, { rest: parseInt(e.target.value) || 0 })}
                                                style={styles.newInput}
                                                disabled={set.completed || set.skipped}
                                            />

                                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                {!set.completed && !set.skipped ? (
                                                    isTimeBased(ex.targetReps) ? (
                                                        <button
                                                            style={styles.checkBtn}
                                                            onClick={() => handleStartSet(ex.id, sIdx, ex.targetReps)}
                                                            disabled={activeExerciseId !== ex.id}
                                                        >
                                                            <Play size={16} />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            style={styles.checkBtn}
                                                            onClick={() => updateSet(ex.id, sIdx, { completed: true })}
                                                        >
                                                            <Check size={18} />
                                                        </button>
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
                                                toast((t) => (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                        <span style={{ fontSize: '14px', fontWeight: 600 }}>¿Finalizar ejercicio?</span>
                                                        <span style={{ fontSize: '12px', color: '#aaa', marginTop: '-8px' }}>Desaparecerá de la lista activa.</span>
                                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                            <button
                                                                onClick={() => toast.dismiss(t.id)}
                                                                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px' }}
                                                            >
                                                                Cancelar
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    markExerciseAsCompleted(ex.id);
                                                                    toast.dismiss(t.id);
                                                                    toast.success('Ejercicio finalizado');
                                                                }}
                                                                style={{ background: Colors.primary, border: 'none', color: '#000', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}
                                                            >
                                                                Finalizar
                                                            </button>
                                                        </div>
                                                    </div>
                                                ), { duration: 5000 });
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
    activeContent: {
        flex: 1,
        padding: '20px',
        overflowY: 'auto',
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
        width: '90%',
        maxWidth: '400px',
        background: Colors.background,
        borderRadius: '32px',
        padding: '32px',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        gap: '24px',
        boxShadow: `0 20px 40px rgba(0,0,0,0.5)`,
        border: `1px solid ${Colors.border}`,
        marginBottom: '40px'
    },
    guidedHeader: {
        textAlign: 'center' as const,
    },
    guidedTitle: {
        fontSize: '24px',
        fontWeight: 900,
        color: Colors.text,
        marginBottom: '8px',
        textAlign: 'center' as const,
    },
    guidedSubtitle: {
        fontSize: '16px',
        color: Colors.textSecondary,
    },
    guidedTimerContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
    },
    guidedTimerCircle: {
        width: '200px',
        height: '200px',
        borderRadius: '50%',
        border: `8px solid`,
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        background: Colors.surface,
        boxShadow: `0 0 30px rgba(0,0,0,0.2)`,
    },
    guidedTimerValue: {
        fontSize: '64px',
        fontWeight: 900,
        color: Colors.text,
        fontFamily: 'monospace',
        lineHeight: 1,
    },
    guidedTimerLabel: {
        fontSize: '14px',
        fontWeight: 800,
        letterSpacing: '2px',
        color: Colors.textSecondary,
        marginTop: '8px',
    },
    guidedActions: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '12px',
    },
    guidedActionBtn: {
        width: '100%',
        padding: '20px',
        borderRadius: '20px',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        fontSize: '18px',
        fontWeight: 800,
        color: '#000',
        cursor: 'pointer',
    },
    guidedCancelBtn: {
        width: '100%',
        padding: '16px',
        background: 'transparent',
        border: 'none',
        color: Colors.textSecondary,
        fontSize: '14px',
        cursor: 'pointer',
    }
};
