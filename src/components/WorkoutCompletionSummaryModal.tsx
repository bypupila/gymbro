import React, { useMemo, useState } from 'react';
import { useUserStore } from '@/stores/userStore';
import Colors from '@/styles/colors';
import { AnimatePresence, motion } from 'framer-motion';

const formatMinutes = (minutes: number): string => {
    if (!minutes || minutes <= 0) return '<1 min';
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    if (hours === 0) return `${remaining} min`;
    if (remaining === 0) return `${hours} h`;
    return `${hours} h ${remaining} min`;
};

const formatMood = (value?: number): string => {
    if (!value || value <= 0) return '--';
    if (value <= 1) return '1/5 (Muy bajo)';
    if (value === 2) return '2/5 (Bajo)';
    if (value === 3) return '3/5 (Normal)';
    if (value === 4) return '4/5 (Bien)';
    return '5/5 (Excelente)';
};

export const WorkoutCompletionSummaryModal: React.FC = () => {
    const userId = useUserStore((state) => state.userId);
    const summary = useUserStore((state) => state.lastCompletedWorkoutSummary);
    const clearSummary = useUserStore((state) => state.clearCompletedWorkoutSummary);
    const totalWorkouts = useUserStore((state) => state.perfil.historial.length);
    const pendingWorkoutSyncCount = useUserStore((state) =>
        state.pendingWorkoutSync.filter((item) => item.ownerUserId === userId).length
    );
    const [showDetails, setShowDetails] = useState(false);
    const [closing, setClosing] = useState(false);

    const detailRows = useMemo(() => {
        if (!summary) return [];
        return (summary.exerciseDetails || []).map((detail) => {
            const totalSets = detail.sets.length;
            const completedSets = detail.sets.filter((set) => set.completed || set.skipped).length;
            const maxWeight = detail.sets.reduce((acc, set) => Math.max(acc, set.peso || 0), 0);
            const totalDurationSec = detail.sets.reduce((acc, set) => acc + (set.duration || 0), 0);
            const status = detail.completionStatus || (completedSets === totalSets ? 'completed' : completedSets > 0 ? 'partial' : 'not_done');
            return {
                id: detail.exerciseId,
                name: detail.nombre,
                replaced: Boolean(detail.isReplaced),
                status,
                completedSets,
                totalSets,
                maxWeight,
                totalDurationSec,
            };
        });
    }, [summary]);

    if (!summary) return null;

    const handleClose = () => {
        if (closing) return;
        setClosing(true);
        setTimeout(() => {
            setShowDetails(false);
            setClosing(false);
            clearSummary();
        }, 1300);
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.card}>
                <h2 style={styles.title}>Entrenamiento completado</h2>
                <p style={styles.subtitle}>Buen trabajo. Ya quedó registrado.</p>

                <div style={styles.metricList}>
                    <div style={styles.metricRow}>
                        <span style={styles.metricLabel}>Ánimo al llegar</span>
                        <strong style={styles.metricValue}>{formatMood(summary.moodAtStart)}</strong>
                    </div>
                    <div style={styles.metricRow}>
                        <span style={styles.metricLabel}>Ánimo al irte</span>
                        <strong style={styles.metricValue}>{formatMood(summary.moodAtEnd)}</strong>
                    </div>
                    <div style={styles.metricRow}>
                        <span style={styles.metricLabel}>Duración total</span>
                        <strong style={styles.metricValue}>{formatMinutes(summary.totalDurationMin)}</strong>
                    </div>
                </div>

                <button onClick={() => setShowDetails((value) => !value)} style={styles.secondaryButton}>
                    {showDetails ? 'Ocultar detalle' : 'Ver más en detalle'}
                </button>

                {showDetails && (
                    <div style={styles.detailList}>
                        {detailRows.map((row) => {
                            const statusColor = row.status === 'completed'
                                ? Colors.success
                                : row.status === 'partial'
                                    ? Colors.warning
                                    : Colors.error;
                            return (
                                <div key={row.id} style={styles.detailRow}>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={styles.detailName}>
                                            {row.name}
                                            {row.replaced && <span style={{ color: Colors.warning }}> • Reemplazado</span>}
                                        </div>
                                        <div style={styles.detailMeta}>
                                            {row.completedSets}/{row.totalSets} series • {row.maxWeight} kg máx • {row.totalDurationSec}s
                                        </div>
                                    </div>
                                    <span style={{
                                        ...styles.detailStatus,
                                        color: statusColor,
                                        borderColor: `${statusColor}55`,
                                        background: `${statusColor}1A`,
                                    }}>
                                        {row.status === 'completed' ? 'Completado' : row.status === 'partial' ? 'Incompleto' : 'No realizado'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {pendingWorkoutSyncCount > 0 && (
                    <p style={styles.syncText}>
                        Sincronización pendiente: {pendingWorkoutSyncCount} entrenamiento(s).
                    </p>
                )}

                <button onClick={handleClose} style={styles.button}>
                    Cerrar
                </button>

                <AnimatePresence>
                    {closing && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={styles.celebrateOverlay}
                        >
                            {Array.from({ length: 14 }).map((_, index) => (
                                <motion.span
                                    key={`p_${index}`}
                                    initial={{ opacity: 0, y: 0, x: 0, scale: 0.4 }}
                                    animate={{
                                        opacity: [0, 1, 0],
                                        y: [0, -40 - (index % 3) * 18],
                                        x: [0, (index - 7) * 10],
                                        scale: [0.4, 1, 0.6],
                                    }}
                                    transition={{ duration: 1.1, ease: 'easeOut', delay: index * 0.03 }}
                                    style={{
                                        ...styles.confettiParticle,
                                        background: index % 3 === 0 ? Colors.primary : index % 3 === 1 ? Colors.success : Colors.warning,
                                    }}
                                />
                            ))}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={styles.celebrateText}
                            >
                                ¡Felicitaciones! Llevas {totalWorkouts} entrenamiento(s) registrados.
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    overlay: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
    },
    card: {
        width: '100%',
        maxWidth: '460px',
        borderRadius: '18px',
        background: Colors.surface,
        border: `1px solid ${Colors.border}`,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
        position: 'relative',
        overflow: 'hidden',
    },
    title: {
        margin: 0,
        fontSize: '22px',
        color: Colors.text,
        fontWeight: 800,
    },
    subtitle: {
        margin: 0,
        color: Colors.textSecondary,
        fontSize: '14px',
    },
    metricList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        background: Colors.background,
        borderRadius: '12px',
        padding: '12px',
    },
    metricRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '14px',
    },
    metricLabel: {
        color: Colors.textSecondary,
        fontWeight: 600,
    },
    metricValue: {
        color: Colors.text,
    },
    secondaryButton: {
        border: `1px solid ${Colors.border}`,
        borderRadius: '10px',
        background: Colors.surfaceLight,
        color: Colors.text,
        fontWeight: 700,
        padding: '10px 12px',
        cursor: 'pointer',
        width: '100%',
    },
    detailList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxHeight: '220px',
        overflowY: 'auto',
        paddingRight: '4px',
    },
    detailRow: {
        background: Colors.background,
        border: `1px solid ${Colors.border}40`,
        borderRadius: '10px',
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
    },
    detailName: {
        fontSize: '13px',
        fontWeight: 700,
        color: Colors.text,
    },
    detailMeta: {
        fontSize: '11px',
        color: Colors.textSecondary,
    },
    detailStatus: {
        border: '1px solid',
        borderRadius: '999px',
        padding: '4px 8px',
        fontSize: '10px',
        fontWeight: 800,
        textTransform: 'uppercase',
        flexShrink: 0,
    },
    syncText: {
        margin: 0,
        color: Colors.warning,
        fontSize: '12px',
        fontWeight: 700,
    },
    button: {
        border: 'none',
        borderRadius: '10px',
        background: Colors.primary,
        color: '#000',
        fontWeight: 800,
        padding: '12px 14px',
        cursor: 'pointer',
        width: '100%',
    },
    celebrateOverlay: {
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.25)',
    },
    confettiParticle: {
        position: 'absolute',
        width: '8px',
        height: '8px',
        borderRadius: '2px',
    },
    celebrateText: {
        fontSize: '14px',
        fontWeight: 800,
        color: '#fff',
        textAlign: 'center',
        padding: '10px 14px',
        borderRadius: '10px',
        background: 'rgba(0,0,0,0.55)',
        maxWidth: '80%',
    },
};
