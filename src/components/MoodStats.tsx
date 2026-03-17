import React from 'react';
import { useUserStore } from '@/stores/userStore';
import Colors from '@/styles/colors';
import { Card } from './Card';
import { Zap, TrendingUp, Battery, ArrowRight, Flame } from 'lucide-react';

export const MoodStats: React.FC = () => {
    const perfil = useUserStore((state) => state.perfil);
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
    
    // Calculate percentage increase
    const boostPercentage = avgPre > 0 ? Math.round((diff / avgPre) * 100) : 0;
    const isPositive = diff > 0;

    const getMessage = () => {
        if (boostPercentage > 30) return "¡Un cambio brutal! Entrenar te revive por completo al salir.";
        if (boostPercentage > 10) return "Tu energía sube notablemente después de cada sesión.";
        if (boostPercentage > 0) return "Siempre salís con más energía de la que entrás. ¡Suma!";
        if (boostPercentage === 0) return "Mantenés tu nivel de energía parejo.";
        return "El entreno te deja exhausto, pero más fuerte.";
    };

    return (
        <Card style={styles.card}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.titleContainer}>
                    <div style={styles.iconWrapper}>
                        <Zap size={18} color={Colors.primary} fill={Colors.primary} />
                    </div>
                    <div>
                        <h3 style={styles.title}>Data For Dummies 🧠</h3>
                        <p style={styles.subtitle}>Impacto de tus últimos 7 entrenos</p>
                    </div>
                </div>
                {isPositive && (
                    <div style={styles.badge}>
                        <TrendingUp size={14} color={Colors.background} strokeWidth={3} />
                        <span>+{boostPercentage}% Energía</span>
                    </div>
                )}
            </div>

            {/* Visual Transformation */}
            <div style={styles.transformationContainer}>
                {/* PRE */}
                <div style={styles.stateCol}>
                    <span style={styles.stateLabel}>Llegás</span>
                    <div style={styles.circlePre}>
                        <Battery size={24} color={Colors.textSecondary} />
                        <div style={styles.valueRow}>
                            <span style={styles.circleValuePre}>{avgPre.toFixed(1)}</span>
                            <span style={styles.maxValue}>/5</span>
                        </div>
                    </div>
                    <span style={styles.stateDesc}>Batería media</span>
                </div>

                {/* ARROW */}
                <div style={styles.arrowContainer}>
                    <div style={styles.arrowLine} />
                    <div style={styles.arrowIconWrap}>
                        <ArrowRight size={20} color={Colors.primary} />
                    </div>
                </div>

                {/* POST */}
                <div style={styles.stateCol}>
                    <span style={styles.stateLabel}>Salís</span>
                    <div style={styles.circlePost}>
                        <Flame size={28} color={Colors.primary} fill={Colors.primary} />
                        <div style={styles.valueRow}>
                            <span style={styles.circleValuePost}>{avgPost.toFixed(1)}</span>
                            <span style={styles.maxValueAccented}>/5</span>
                        </div>
                    </div>
                    <span style={{ ...styles.stateDesc, color: Colors.primary }}>¡A tope!</span>
                </div>
            </div>

            {/* Message/Insight Footer */}
            <div style={styles.insightBox}>
                <div style={styles.insightIcon}>✨</div>
                <p style={styles.insightText}>{getMessage()}</p>
            </div>
        </Card>
    );
};

const styles: Record<string, React.CSSProperties> = {
    card: {
        background: Colors.surface,
        borderRadius: '24px',
        padding: '24px',
        border: `1px solid ${Colors.border}`,
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        position: 'relative',
        overflow: 'hidden',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    titleContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    iconWrapper: {
        width: '40px',
        height: '40px',
        borderRadius: '12px',
        background: `${Colors.primary}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
        gap: '6px',
        padding: '6px 12px',
        borderRadius: '20px',
        background: Colors.primary,
        color: Colors.background,
        fontSize: '13px',
        fontWeight: 800,
        boxShadow: `0 4px 12px ${Colors.primary}40`,
    },
    transformationContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 10px',
    },
    stateCol: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        zIndex: 2,
    },
    stateLabel: {
        fontSize: '13px',
        fontWeight: 800,
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
    },
    stateDesc: {
        fontSize: '12px',
        fontWeight: 600,
        color: Colors.textTertiary,
    },
    circlePre: {
        width: '85px',
        height: '85px',
        borderRadius: '50%',
        background: Colors.surfaceLight,
        border: `2px solid ${Colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
    },
    circlePost: {
        width: '95px',
        height: '95px',
        borderRadius: '50%',
        background: `${Colors.primary}10`,
        border: `2px solid ${Colors.primary}50`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        boxShadow: `0 0 24px ${Colors.primary}25`,
    },
    valueRow: {
        display: 'flex',
        alignItems: 'baseline',
        gap: '2px',
    },
    circleValuePre: {
        fontSize: '20px',
        fontWeight: 800,
        color: Colors.textSecondary,
    },
    circleValuePost: {
        fontSize: '24px',
        fontWeight: 900,
        color: Colors.text,
    },
    maxValue: {
        fontSize: '12px',
        fontWeight: 700,
        color: Colors.textTertiary,
    },
    maxValueAccented: {
        fontSize: '14px',
        fontWeight: 800,
        color: Colors.primary,
        opacity: 0.8,
    },
    arrowContainer: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: '0 15px',
    },
    arrowLine: {
        position: 'absolute',
        top: '50%',
        left: '0',
        right: '0',
        height: '3px',
        background: `linear-gradient(90deg, ${Colors.border} 0%, ${Colors.primary}80 100%)`,
        transform: 'translateY(-50%)',
        borderRadius: '2px',
        zIndex: 1,
    },
    arrowIconWrap: {
        background: Colors.surface,
        padding: '6px',
        borderRadius: '50%',
        zIndex: 2,
        border: `2px solid ${Colors.border}`,
    },
    insightBox: {
        background: Colors.surfaceLight,
        borderRadius: '16px',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        border: `1px solid ${Colors.borderLight}`,
    },
    insightIcon: {
        fontSize: '22px',
    },
    insightText: {
        margin: 0,
        fontSize: '14px',
        color: Colors.text,
        fontWeight: 600,
        lineHeight: 1.4,
    },
};
