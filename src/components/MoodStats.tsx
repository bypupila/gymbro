import React from 'react';
import { useUserStore } from '@/stores/userStore';
import Colors from '@/styles/colors';
import { Card } from './Card';
import { Zap, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const MoodStats: React.FC = () => {
    const { perfil } = useUserStore();
    const history = perfil.historial || [];

    // Filter sessions with energy data (fallback to legacy mood fields)
    const sessionsWithMood = history
        .filter(h => (h.energyPre ?? h.moodPre) !== undefined && (h.energyPost ?? h.moodPost) !== undefined)
        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()) // Oldest to newest
        .slice(-7); // Last 7

    if (sessionsWithMood.length === 0) return null;

    const avgPre = sessionsWithMood.reduce((acc, curr) => acc + (curr.energyPre ?? curr.moodPre ?? 0), 0) / sessionsWithMood.length;
    const avgPost = sessionsWithMood.reduce((acc, curr) => acc + (curr.energyPost ?? curr.moodPost ?? 0), 0) / sessionsWithMood.length;
    const diff = avgPost - avgPre;

    return (
        <Card style={styles.card}>
            <div style={styles.header}>
                <div>
                    <h3 style={styles.title}>Impacto del Entreno</h3>
                    <p style={styles.subtitle}>Tu energía antes vs. después</p>
                </div>
                <div style={{
                    ...styles.badge,
                    background: diff > 0 ? `${Colors.success}20` : diff < 0 ? `${Colors.error}20` : `${Colors.textSecondary}20`,
                    color: diff > 0 ? Colors.success : diff < 0 ? Colors.error : Colors.textSecondary
                }}>
                    {diff > 0 ? <TrendingUp size={16} /> : diff < 0 ? <TrendingDown size={16} /> : <Minus size={16} />}
                    <span>{Math.abs(diff).toFixed(1)} pts</span>
                </div>
            </div>

            <div style={styles.statsRow}>
                <div style={styles.statBox}>
                    <span style={styles.statLabel}>PRE-ENTRENO</span>
                    <div style={styles.statValueRow}>
                        <Zap size={16} color={Colors.textSecondary} />
                        <span style={styles.statValue}>{avgPre.toFixed(1)}</span>
                    </div>
                </div>
                <div style={styles.divider} />
                <div style={styles.statBox}>
                    <span style={styles.statLabel}>POST-ENTRENO</span>
                    <div style={styles.statValueRow}>
                        <Zap size={16} color={Colors.primary} fill={Colors.primary} />
                        <span style={{ ...styles.statValue, color: Colors.primary }}>{avgPost.toFixed(1)}</span>
                    </div>
                </div>
            </div>

            <div style={styles.chartContainer}>
                {sessionsWithMood.map((session) => (
                    <div key={session.id} style={styles.chartCol}>
                        <div style={styles.barsArea}>
                            {/* Post Bar (Background/Overlap?) or Side by side? Let's do Side by Side thin bars */}
                            <div style={styles.barPair}>
                                <div style={{
                                    ...styles.bar,
                                    height: `${(((session.energyPre ?? session.moodPre) || 0) / 5) * 100}%`,
                                    background: Colors.textSecondary,
                                    opacity: 0.5
                                }} />
                                <div style={{
                                    ...styles.bar,
                                    height: `${(((session.energyPost ?? session.moodPost) || 0) / 5) * 100}%`,
                                    background: Colors.primary
                                }} />
                            </div>
                        </div>
                        <span style={styles.dayLabel}>
                            {new Date(session.fecha).toLocaleDateString('es-ES', { weekday: 'narrow' })}
                        </span>
                    </div>
                ))}
            </div>
        </Card>
    );
};

const styles: Record<string, React.CSSProperties> = {
    card: {
        background: Colors.surface,
        borderRadius: '24px',
        padding: '20px',
        border: `1px solid ${Colors.border}`,
        marginBottom: '24px',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '20px',
    },
    title: {
        fontSize: '16px',
        fontWeight: 800,
        color: Colors.text,
        margin: '0 0 4px 0',
    },
    subtitle: {
        fontSize: '12px',
        color: Colors.textSecondary,
        margin: 0,
    },
    badge: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: 700,
    },
    statsRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        marginBottom: '24px',
        background: Colors.background,
        padding: '12px',
        borderRadius: '16px',
    },
    statBox: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
    },
    statLabel: {
        fontSize: '10px',
        fontWeight: 700,
        color: Colors.textTertiary,
        letterSpacing: '0.5px',
    },
    statValueRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    statValue: {
        fontSize: '20px',
        fontWeight: 800,
        color: Colors.text,
    },
    divider: {
        width: '1px',
        height: '30px',
        background: Colors.border,
    },
    chartContainer: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: '100px',
        paddingTop: '10px',
    },
    chartCol: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        flex: 1,
        height: '100%',
    },
    barsArea: {
        flex: 1,
        width: '100%',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    barPair: {
        display: 'flex',
        alignItems: 'flex-end',
        gap: '4px',
        height: '100%',
    },
    bar: {
        width: '6px',
        borderRadius: '4px',
        minHeight: '4px',
        transition: 'height 0.5s ease',
    },
    dayLabel: {
        fontSize: '10px',
        color: Colors.textTertiary,
        textTransform: 'uppercase',
    },
};

