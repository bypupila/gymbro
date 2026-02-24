import React from 'react';
import { useUserStore } from '@/stores/userStore';
import Colors from '@/styles/colors';

const formatMinutes = (minutes: number): string => {
    if (!minutes || minutes <= 0) return '<1 min';
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    if (hours === 0) return `${remaining} min`;
    if (remaining === 0) return `${hours} h`;
    return `${hours} h ${remaining} min`;
};

export const WorkoutCompletionSummaryModal: React.FC = () => {
    const userId = useUserStore((state) => state.userId);
    const summary = useUserStore((state) => state.lastCompletedWorkoutSummary);
    const clearSummary = useUserStore((state) => state.clearCompletedWorkoutSummary);
    const pendingWorkoutSyncCount = useUserStore((state) =>
        state.pendingWorkoutSync.filter((item) => item.ownerUserId === userId).length
    );

    if (!summary) return null;

    return (
        <div style={styles.overlay}>
            <div style={styles.card}>
                <h2 style={styles.title}>Entrenamiento completado</h2>
                <p style={styles.subtitle}>Excelente trabajo. Terminaste toda la rutina.</p>

                <div style={styles.metricList}>
                    <div style={styles.metricRow}>
                        <span style={styles.metricLabel}>Tiempo total</span>
                        <strong style={styles.metricValue}>{formatMinutes(summary.totalDurationMin)}</strong>
                    </div>
                    <div style={styles.metricRow}>
                        <span style={styles.metricLabel}>Ejercicios</span>
                        <strong style={styles.metricValue}>{summary.completedExercises}/{summary.totalExercises}</strong>
                    </div>
                    <div style={styles.metricRow}>
                        <span style={styles.metricLabel}>Series</span>
                        <strong style={styles.metricValue}>{summary.completedSets}/{summary.totalSets}</strong>
                    </div>
                </div>

                {pendingWorkoutSyncCount > 0 && (
                    <p style={styles.syncText}>
                        Sincronizacion pendiente: {pendingWorkoutSyncCount} entrenamiento(s). Se enviara automaticamente.
                    </p>
                )}

                <button onClick={clearSummary} style={styles.button}>
                    Cerrar
                </button>
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
        maxWidth: '420px',
        borderRadius: '18px',
        background: Colors.surface,
        border: `1px solid ${Colors.border}`,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
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
};

