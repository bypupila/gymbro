import React, { useState, useEffect, useMemo } from 'react';
import { useUserStore, SetTracking } from '../stores/userStore';
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
    SkipForward
} from 'lucide-react';
import { Card } from './Card';
import { motion, AnimatePresence } from 'framer-motion';

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
        cancelSession
    } = useUserStore();

    const [duration, setDuration] = useState(0);
    const [viewMode, setViewMode] = useState<'preview' | 'active'>('preview');
    const [expandedExercises, setExpandedExercises] = useState<string[]>([]);

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

    if (!activeSession) return null;

    const toggleExpand = (id: string) => {
        setExpandedExercises(prev =>
            prev.includes(id) ? prev.filter(eid => eid !== id) : [...prev, id]
        );
    };

    const handleStart = () => {
        setViewMode('active');
        // Expand first exercise by default
        if (activeSession.exercises.length > 0) {
            setExpandedExercises([activeSession.exercises[0].id]);
        }
    };

    const totalSets = useMemo(() => {
        return activeSession.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
    }, [activeSession.exercises]);

    const completedSets = useMemo(() => {
        return activeSession.exercises.reduce((acc, ex) =>
            acc + ex.sets.filter(s => s.completed || s.skipped).length, 0
        );
    }, [activeSession.exercises]);

    const progress = (completedSets / totalSets) * 100;

    if (viewMode === 'preview') {
        return (
            <div style={styles.fullOverlay}>
                <div style={styles.header}>
                    <button onClick={onCancel} style={styles.iconBtn}>
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
                        finishSession(Math.floor(duration / 60));
                        onFinish();
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
                {activeSession.exercises.map((ex, exIdx) => (
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
                                    {exIdx + 1}. {ex.nombre}
                                    {ex.sets.every(s => s.completed || s.skipped) && ' ✓'}
                                </h3>
                                <p style={styles.exerciseMeta}>{ex.targetSeries} series x {ex.targetReps}</p>
                            </div>
                            {expandedExercises.includes(ex.id) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
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
                                                            <button
                                                                style={styles.checkBtn}
                                                                onClick={() => updateSet(ex.id, sIdx, { completed: true })}
                                                            >
                                                                <Check size={18} />
                                                            </button>
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
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Card>
                ))}
            </div>
        </div>
    );
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
    }
};
