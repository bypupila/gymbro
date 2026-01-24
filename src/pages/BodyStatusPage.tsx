// =====================================================
// GymBro PWA - Body Status / Heatmap Page
// =====================================================

import React from 'react';
import Colors from '@/styles/colors';
import { ChevronLeft, BarChart, ShieldCheck, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/Card';

export const BodyStatusPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <button onClick={() => navigate(-1)} style={styles.backBtn}>
                    <ChevronLeft size={24} color={Colors.text} />
                </button>
                <div style={styles.headerTitleContainer}>
                    <p style={styles.headerLabel}>HEALTH INTEL</p>
                    <h1 style={styles.headerTitle}>Estado del Cuerpo</h1>
                </div>
                <button style={styles.actionBtn}>
                    <BarChart size={24} color={Colors.primary} />
                </button>
            </div>

            {/* Model View / Heatmap */}
            <div style={styles.modelView}>
                <div style={styles.modelPlaceholder}>
                    {/* SVG Human Body Representation */}
                    <svg viewBox="0 0 200 400" width="200" height="400" style={{ opacity: 0.6 }}>
                        <path fill="#FFF" d="M100 20 c10 0 15 5 15 15 s-5 15 -15 15 s-15 -5 -15 -15 s5 -15 15 -15 M100 50 l20 20 l0 100 l-10 120 l-25 0 l-10 -120 l-10 120 l-25 0 l-10 -120 l0 -100 l20 -20 z" />
                    </svg>

                    {/* Hotspot for Lower Back as shown in mockup */}
                    <div style={styles.hotspot}>
                        <div style={styles.spot} />
                        <div style={styles.spotPulse} />
                        <div style={styles.spotLabel}>LUMBAR: AGUDO</div>
                    </div>
                </div>
            </div>

            {/* AI Adaptation Card */}
            <div style={styles.adaptationWrapper}>
                <Card style={styles.adaptationCard}>
                    <div style={styles.aiHeader}>
                        <div style={styles.aiIcon}>
                            <ShieldCheck size={24} color={Colors.primary} />
                        </div>
                        <div style={styles.aiInfo}>
                            <h3 style={styles.aiTitle}>Adaptación IA Detectada</h3>
                            <p style={styles.aiText}>
                                He reemplazado el <span style={{ color: Colors.primary, fontWeight: 700 }}>Peso Muerto</span> por alternativas más seguras y añadí 5 min de movilidad lumbar.
                            </p>
                        </div>
                    </div>
                    <button style={styles.confirmBtn} onClick={() => navigate('/train')}>
                        CONFIRMAR CAMBIOS
                    </button>
                </Card>
            </div>

            {/* Legend / Stats */}
            <div style={styles.legend}>
                <div style={styles.legendItem}>
                    <div style={{ ...styles.legendDot, background: Colors.error }} />
                    <span style={styles.legendText}>Tensión Alta</span>
                </div>
                <div style={styles.legendItem}>
                    <div style={{ ...styles.legendDot, background: Colors.warning }} />
                    <span style={styles.legendText}>Fatiga Muscular</span>
                </div>
                <div style={styles.legendItem}>
                    <div style={{ ...styles.legendDot, background: Colors.primary }} />
                    <span style={styles.legendText}>Óptimo</span>
                </div>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        background: Colors.background,
        padding: '24px',
        paddingTop: 'calc(24px + env(safe-area-inset-top, 0px))',
        paddingBottom: '100px', // Space for bottom nav
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
    },
    backBtn: {
        width: '44px',
        height: '44px',
        borderRadius: '12px',
        background: Colors.surface,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `1px solid ${Colors.border}`,
    },
    headerTitleContainer: {
        textAlign: 'center',
    },
    headerLabel: {
        fontSize: '10px',
        fontWeight: 800,
        color: Colors.primary,
        letterSpacing: '1.5px',
        margin: '0 0 2px 0',
    },
    headerTitle: {
        fontSize: '18px',
        fontWeight: 800,
        color: Colors.text,
        margin: 0,
    },
    actionBtn: {
        width: '44px',
        height: '44px',
        borderRadius: '12px',
        background: Colors.surface,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `1px solid ${Colors.border}`,
    },
    modelView: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle, #1a1a1c 0%, #000 70%)',
        borderRadius: '40px',
        margin: '12px 0 32px 0',
        minHeight: '380px',
        position: 'relative',
        overflow: 'hidden',
    },
    modelPlaceholder: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    hotspot: {
        position: 'absolute',
        top: '60%',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 5,
    },
    spot: {
        width: '12px',
        height: '12px',
        background: Colors.error,
        borderRadius: '50%',
        boxShadow: `0 0 15px ${Colors.error}`,
        position: 'relative',
        zIndex: 2,
    },
    spotPulse: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        background: Colors.error,
        opacity: 0.5,
        animation: 'pulse 1.5s ease-out infinite',
    },
    spotLabel: {
        background: Colors.error,
        color: '#FFF',
        padding: '4px 12px',
        borderRadius: '8px',
        fontSize: '10px',
        fontWeight: 900,
        marginTop: '12px',
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 10px rgba(239, 68, 68, 0.4)',
    },
    adaptationWrapper: {
        marginBottom: '24px',
    },
    adaptationCard: {
        padding: '24px',
        background: Colors.surface,
        border: `1px solid ${Colors.borderLight}`,
    },
    aiHeader: {
        display: 'flex',
        gap: '16px',
        marginBottom: '20px',
    },
    aiIcon: {
        width: '44px',
        height: '44px',
        background: `${Colors.primary}15`,
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    aiInfo: {
        flex: 1,
    },
    aiTitle: {
        fontSize: '15px',
        fontWeight: 800,
        color: Colors.text,
        margin: '0 0 6px 0',
    },
    aiText: {
        fontSize: '13px',
        lineHeight: 1.5,
        color: Colors.textSecondary,
        margin: 0,
    },
    confirmBtn: {
        width: '100%',
        padding: '16px',
        borderRadius: '14px',
        background: Colors.primary,
        color: '#000',
        fontWeight: 800,
        fontSize: '15px',
        border: 'none',
        cursor: 'pointer',
        boxShadow: `0 4px 15px ${Colors.primary}40`,
        transition: 'transform 0.2s',
    },
    legend: {
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
        padding: '10px 0',
    },
    legendItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    legendDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
    },
    legendText: {
        fontSize: '11px',
        fontWeight: 600,
        color: Colors.textTertiary,
    },
};

export default BodyStatusPage;
