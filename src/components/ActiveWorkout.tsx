import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore, SetTracking, ExerciseTracking } from '../stores/userStore';
import { getExerciseImage, getExerciseVideo } from '../data/exerciseMedia';
import Colors from '../styles/colors';
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
    Loader
} from 'lucide-react';
import { Card } from './Card';
import { motion, AnimatePresence } from 'framer-motion';
import { EJERCICIOS_DATABASE, GRUPOS_MUSCULARES, EjercicioBase } from '../data/exerciseDatabase';
import { analyzeExtraActivity } from '../services/geminiExtraActivityService';

interface ActiveWorkoutProps {
    onFinish: () => void;
    onCancel: () => void;
}

export const ActiveWorkout: React.FC<ActiveWorkoutProps> = ({ onFinish, onCancel }) => {
    const {
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
    const [viewMode, setViewMode] = useState<'preview' | 'active'>('preview');
    const [expandedExercises, setExpandedExercises] = useState<string[]>([]);

    // Completion Modal State
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [completionType, setCompletionType] = useState<'routine' | 'extra' | null>(null);
    const [extraActivityDesc, setExtraActivityDesc] = useState('');
    const [extraActivityUrl, setExtraActivityUrl] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        if (viewMode === 'active') {
            const timer = setInterval(() => setDuration(d => d + 1), 1000);
            return () => clearInterval(timer);
        }
    }, [viewMode]);

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
        if (!confirm(`¿Comenzar este ejercicio?`)) return;

        setActiveExerciseId(exerciseId);
        setCurrentSetIndex(0);

        if (isTimeBased(reps)) {
            const seconds = parseTimeSeconds(reps);
            setTimerSeconds(seconds);
        }

        // Don't toggle expand - exercise is already expanded
    };

    // Handle set authorization (for time-based exercises)
    const handleStartSet = (exerciseId: string, setIndex: number, reps: string) => {
        if (!confirm(`¿Comenzar serie ${setIndex + 1}?`)) return;

        setCurrentSetIndex(setIndex);

        if (isTimeBased(reps)) {
            const seconds = parseTimeSeconds(reps);
            setTimerSeconds(seconds);
            setIsTimerRunning(true);
        }
    };

    // Timer countdown effect
    useEffect(() => {
        if (!isTimerRunning || timerSeconds <= 0) {
            if (timerSeconds === 0 && isTimerRunning) {
                setIsTimerRunning(false);
                // Auto-mark set as complete when timer finishes
                if (activeExerciseId) {
                    updateSet(activeExerciseId, currentSetIndex, { completed: true });
                }
            }
            return;
        }

        const interval = setInterval(() => {
            setTimerSeconds(prev => prev - 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [isTimerRunning, timerSeconds, activeExerciseId, currentSetIndex]);

    const handleStart = () => {
        setViewMode('active');
        // Expand first exercise by default
        if (activeSession && activeSession.exercises.length > 0) {
            setExpandedExercises([activeSession.exercises[0].id]);
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

    if (viewMode === 'preview') {
        return (
            <div style={styles.fullOverlay}>
                <div style={styles.header}>
                    <button onClick={() => {
                        cancelSession();
                        onCancel();
                        navigate('/');
                    }} style={styles.iconBtn}>
                        <ChevronLeft size={24} color={Colors.text} />
                    </button>
                    <h2 style={styles.headerTitle}>Resumen de Hoy</h2>
                    <div style={{ width: 40 }} />
                </div>

                <div style={styles.previewContent}>
                    <div style={styles.previewHero}>
                        <span style={styles.previewDay}>{activeSession.dayName}</span>
                        <h1 style={styles.previewRoutineName}>{activeSession.routineName}</h1>
                        <div style={styles.previewStats}>
                            <div style={styles.prevStat}>
                                <Dumbbell size={16} color={Colors.primary} />
                                <span>{activeSession.exercises.length} Ejercicios</span>
                            </div>
                            <div style={styles.prevStat}>
                                <Clock size={16} color={Colors.primary} />
                                <span>~45-60 min</span>
                            </div>
                        </div>
                    </div>

                    <div style={styles.exerciseListPreview}>
                        {activeSession.exercises.map((ex, i) => (
                            <div key={ex.id} style={styles.previewItem}>
                                <span style={styles.previewNumber}>{i + 1}</span>
                                <div style={styles.previewItemInfo}>
                                    <h4 style={styles.previewItemName}>{ex.nombre}</h4>
                                    <p style={styles.previewItemMeta}>{ex.targetSeries} series x {ex.targetReps} reps</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={styles.bottomAction}>
                    <button style={styles.startBtn} onClick={handleStart}>
                        ¡COMENZAR ENTRENAMIENTO!
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.fullOverlay}>
            {/* Active Header */}
            <div style={styles.header}>
                <button onClick={() => {
                    if (confirm('¿Cancelar entrenamiento actual? No se guardará el progreso.')) {
                        cancelSession();
                        onCancel();
                    }
                }} style={styles.iconBtn}>
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
                                                addExerciseToSession({
                                                    id: ex.id,
                                                    nombre: ex.nombre,
                                                    series: 3,
                                                    repeticiones: '10',
                                                    descanso: 60,
                                                    categoria: 'maquina'
                                                });
                                                setShowAddModal(false);
                                                setSearchQuery('');
                                                // Expand the newly added exercise
                                                // Note: The store will generate a temp ID, so we might not be able to 
                                                // expand it immediately without checking the updated session
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
                                            <Plus size={20} color={Colors.textTertiary} />
                                        </div>
                                    ))}
                                </div>
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
                                                finishSession(Math.floor(duration / 60));
                                                onFinish();
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
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <div>
                                            <label style={styles.inputLabel}>Describe tu actividad</label>
                                            <textarea
                                                value={extraActivityDesc}
                                                onChange={(e) => setExtraActivityDesc(e.target.value)}
                                                placeholder="Ej: Corrí 5km en 25 minutos..."
                                                style={styles.textArea}
                                                rows={4}
                                            />
                                        </div>

                                        <div>
                                            <label style={styles.inputLabel}>Video URL (Opcional)</label>
                                            <input
                                                type="url"
                                                value={extraActivityUrl}
                                                onChange={(e) => setExtraActivityUrl(e.target.value)}
                                                placeholder="https://youtube.com/..."
                                                style={styles.searchInput}
                                            />
                                        </div>

                                        <button
                                            style={{
                                                ...styles.startExerciseBtn,
                                                opacity: (isAnalyzing || !extraActivityDesc.trim()) ? 0.7 : 1,
                                                width: '100%'
                                            }}
                                            disabled={isAnalyzing || !extraActivityDesc.trim()}
                                            onClick={async () => {
                                                setIsAnalyzing(true);
                                                try {
                                                    const analisis = await analyzeExtraActivity(extraActivityDesc, extraActivityUrl);

                                                    await addExtraActivity({
                                                        id: `extra_${Date.now()}`,
                                                        fecha: new Date().toISOString(),
                                                        descripcion: extraActivityDesc,
                                                        videoUrl: extraActivityUrl || undefined,
                                                        analisisIA: analisis
                                                    });

                                                    // Finish session after adding extra
                                                    await finishSession(Math.floor(duration / 60));
                                                    onFinish();
                                                } catch (error) {
                                                    console.error(error);
                                                    alert('Error al analizar la actividad. Intenta de nuevo.');
                                                } finally {
                                                    setIsAnalyzing(false);
                                                }
                                            }}
                                        >
                                            {isAnalyzing ? (
                                                <>
                                                    <span className="spin">⏳</span> Analizando...
                                                </>
                                            ) : (
                                                <>
                                                    <Save size={20} /> Guardar y Finalizar
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );

    function renderExerciseCard(ex: ExerciseTracking, exIdx: number, section: 'warmup' | 'main') {
        if (!activeSession) return null;
        const globalIdx = activeSession.exercises.findIndex(e => e.id === ex.id);
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

                                <div style={styles.setsHeader}>
                                    <span style={styles.setHeaderCell}>SERIE</span>
                                    <span style={styles.setHeaderCell}>PESO (KG)</span>
                                    <span style={styles.setHeaderCell}>REPS</span>
                                    <span style={styles.setHeaderCell}>ACCIONES</span>
                                </div>
                                {ex.sets.map((set, sIdx) => (
                                    <div
                                        key={sIdx}
                                        style={{
                                            ...styles.setRow,
                                            background: set.completed ? `${Colors.success}10` : set.skipped ? `${Colors.surfaceLight}` : 'transparent',
                                            opacity: (set.completed || set.skipped) ? 0.7 : 1
                                        }}
                                    >
                                        <span style={styles.setNumber}>{sIdx + 1}</span>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={set.weight || ''}
                                            onChange={(e) => updateSet(ex.id, sIdx, { weight: parseFloat(e.target.value) || 0 })}
                                            style={styles.setInput}
                                            disabled={set.completed || set.skipped}
                                        />
                                        <input
                                            type="number"
                                            placeholder="10"
                                            value={set.reps || ''}
                                            onChange={(e) => updateSet(ex.id, sIdx, { reps: parseInt(e.target.value) || 0 })}
                                            style={styles.setInput}
                                            disabled={set.completed || set.skipped}
                                        />
                                        <div style={styles.setActions}>
                                            {!set.completed && !set.skipped ? (
                                                <>
                                                    <button
                                                        style={styles.skipBtn}
                                                        onClick={() => skipSet(ex.id, sIdx)}
                                                    >
                                                        <SkipForward size={16} />
                                                    </button>
                                                    {isTimeBased(ex.targetReps) ? (
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
                                                    )}
                                                </>
                                            ) : (
                                                <button
                                                    style={styles.undoBtn}
                                                    onClick={() => updateSet(ex.id, sIdx, { completed: false, skipped: false })}
                                                >
                                                    Deshacer
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}

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
                                                if (confirm('¿Finalizar ejercicio? Desaparecerá de la lista.')) {
                                                    markExerciseAsCompleted(ex.id);
                                                }
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
            </Card >
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
};
