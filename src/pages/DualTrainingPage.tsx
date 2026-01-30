// =====================================================
// GymBro PWA - Dual Training Page
// =====================================================

import React from 'react';
import Colors from '@/styles/colors';
import { ChevronLeft, Users, Zap, Heart, ShieldCheck, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/Card';
import { useUserStore } from '@/stores/userStore';
import { toast } from 'react-hot-toast';

export const DualTrainingPage: React.FC = () => {
    const navigate = useNavigate();
    const { perfil, setPartnerId, setDatosPareja } = useUserStore();
    const [isConnecting, setIsConnecting] = React.useState(false);
    const [aliasInput, setAliasInput] = React.useState('');
    const [connectError, setConnectError] = React.useState('');

    // Check local state or if partnerId exists
    const parejaconectada = !!perfil.pareja || !!perfil.partnerId;

    const handleConnect = async () => {
        if (!aliasInput.trim()) return;
        setIsConnecting(true);
        setConnectError('');

        try {
            // Dynamic import to avoid cycles if any, though likely safe
            const { firebaseService } = await import('@/services/firebaseService');
            const user = await firebaseService.findUserByAlias(aliasInput.trim());

            if (user) {
                setPartnerId(user.id);
                setDatosPareja({
                    nombre: user.name || user.alias || 'Partner',
                    edad: 0, peso: 0, altura: 0, nivel: 'intermedio', objetivo: 'mantener', lesiones: ''
                });
                toast.success('¡Pareja Conectada!');
            } else {
                setConnectError('Alias no encontrado');
            }
        } catch (e) {
            setConnectError('Error al conectar');
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <button onClick={() => navigate(-1)} style={styles.backBtn}>
                    <ChevronLeft size={24} color={Colors.text} />
                </button>
                <div style={styles.headerTitleContainer}>
                    <p style={styles.headerLabel}>SOCIAL SYNERGY</p>
                    <h1 style={styles.headerTitle}>Entrenamiento Dual</h1>
                </div>
                <button style={styles.actionBtn}>
                    <Share2 size={24} color={Colors.primary} />
                </button>
            </div>

            {/* Synergy Score / Hero Section */}
            <Card style={styles.heroCard}>
                <div style={styles.synergyContent}>
                    <div style={styles.synergyMain}>
                        <div style={styles.synergyRing}>
                            <Users size={32} color={Colors.primary} />
                            <div style={styles.synergyValue}>88</div>
                            <div style={styles.synergyLabel}>PUNTOS</div>
                        </div>
                    </div>
                    <div style={styles.synergyInfo}>
                        <h2 style={styles.synergyTitle}>Sinergia de Pareja</h2>
                        <p style={styles.synergyDesc}>
                            {parejaconectada
                                ? "¡Gran ritmo! Habéis completado 4 sesiones juntos esta semana."
                                : "Conecta a tu pareja para duplicar resultados y mantener la racha."
                            }
                        </p>
                    </div>
                </div>
            </Card>

            {/* Connection Status */}
            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Estado de Conexión</h3>
                <Card style={styles.connectionCard}>
                    <div style={styles.userRow}>
                        <div style={styles.avatarWrapper}>
                            <img
                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${perfil.usuario.nombre || 'Yo'}`}
                                style={styles.avatar}
                                alt="Yo"
                            />
                            <div style={{ ...styles.statusDot, background: Colors.primary }} />
                        </div>
                        <div style={styles.userInfo}>
                            <span style={styles.userName}>{perfil.usuario.nombre || 'Tú'}</span>
                            <span style={styles.userStatus}>En línea</span>
                        </div>
                        <div style={styles.userIcon}>
                            <Zap size={18} color={Colors.primary} />
                        </div>
                    </div>

                    <div style={styles.divider} />

                    {perfil.pareja ? (
                        <div style={styles.userRow}>
                            <div style={styles.avatarWrapper}>
                                <img
                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${perfil.pareja.nombre}`}
                                    style={styles.avatar}
                                    alt="Pareja"
                                />
                                <div style={{ ...styles.statusDot, background: Colors.textTertiary }} />
                            </div>
                            <div style={styles.userInfo}>
                                <span style={styles.userName}>{perfil.pareja.nombre}</span>
                                <span style={styles.userStatus}>Desconectado</span>
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: '10px' }}>
                            <p style={{ fontSize: '14px', marginBottom: '8px', color: Colors.textSecondary }}>Ingresa el Alias de tu GymBro:</p>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: `1px solid ${Colors.border}`,
                                        background: Colors.background,
                                        color: Colors.text
                                    }}
                                    placeholder="Ej: TitanFit"
                                    value={aliasInput}
                                    onChange={e => setAliasInput(e.target.value)}
                                />
                                <button
                                    style={{
                                        ...styles.connectBtn,
                                        width: 'auto',
                                        padding: '0 16px',
                                        background: Colors.primary,
                                        color: '#000',
                                        border: 'none'
                                    }}
                                    onClick={handleConnect}
                                    disabled={isConnecting}
                                >
                                    {isConnecting ? '...' : <Zap size={18} />}
                                </button>
                            </div>
                            {connectError && <p style={{ color: Colors.error, fontSize: '12px', marginTop: '8px' }}>{connectError}</p>}
                        </div>
                    )}
                </Card>
            </div>

            {/* Features Info */}
            <div style={styles.features}>
                <div style={styles.featureItem}>
                    <div style={styles.featureIcon}>
                        <Heart size={20} color={Colors.error} />
                    </div>
                    <div style={styles.featureContent}>
                        <h4 style={styles.featureTitle}>Racha Compartida</h4>
                        <p style={styles.featureDesc}>Si uno falla, la racha de ambos peligra. Motivación mutua.</p>
                    </div>
                </div>
                <div style={styles.featureItem}>
                    <div style={styles.featureIcon}>
                        <ShieldCheck size={20} color="#C026D3" />
                    </div>
                    <div style={styles.featureContent}>
                        <h4 style={styles.featureTitle}>Sincronización de Descansos</h4>
                        <p style={styles.featureDesc}>Tiempos de descanso coordinados en tiempo real.</p>
                    </div>
                </div>
            </div>

            {/* Action Button */}
            <button
                style={{
                    ...styles.mainActionBtn,
                    opacity: parejaconectada ? 1 : 0.6
                }}
                disabled={!parejaconectada}
                onClick={() => navigate('/train')}
            >
                INICIAR SESIÓN DUAL
            </button>
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
        paddingBottom: '100px',
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
    heroCard: {
        background: 'linear-gradient(135deg, #1e1e22 0%, #000 100%)',
        padding: '32px 24px',
        marginBottom: '32px',
        border: `1px solid ${Colors.borderLight}`,
    },
    synergyContent: {
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
    },
    synergyMain: {
        position: 'relative',
    },
    synergyRing: {
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        border: `6px solid ${Colors.surfaceLight}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    synergyValue: {
        fontSize: '28px',
        fontWeight: 900,
        color: Colors.primary,
        marginTop: '2px',
    },
    synergyLabel: {
        fontSize: '8px',
        fontWeight: 800,
        color: Colors.textSecondary,
        letterSpacing: '1px',
    },
    synergyInfo: {
        flex: 1,
    },
    synergyTitle: {
        fontSize: '18px',
        fontWeight: 800,
        color: Colors.text,
        margin: '0 0 8px 0',
    },
    synergyDesc: {
        fontSize: '13px',
        color: Colors.textSecondary,
        lineHeight: 1.5,
        margin: 0,
    },
    section: {
        marginBottom: '32px',
    },
    sectionTitle: {
        fontSize: '16px',
        fontWeight: 800,
        color: Colors.text,
        marginBottom: '16px',
    },
    connectionCard: {
        padding: '20px',
        background: Colors.surface,
    },
    userRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatar: {
        width: '48px',
        height: '48px',
        borderRadius: '16px',
        background: Colors.background,
    },
    statusDot: {
        position: 'absolute',
        bottom: '-2px',
        right: '-2px',
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        border: `2px solid ${Colors.surface}`,
    },
    userInfo: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
    },
    userName: {
        fontSize: '15px',
        fontWeight: 700,
        color: Colors.text,
    },
    userStatus: {
        fontSize: '12px',
        color: Colors.textTertiary,
    },
    userIcon: {
        width: '32px',
        height: '32px',
        background: `${Colors.primary}15`,
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    divider: {
        height: '1px',
        background: Colors.border,
        margin: '16px 0',
    },
    connectBtn: {
        width: '100%',
        padding: '12px',
        background: Colors.background,
        border: `1px dashed ${Colors.primary}`,
        borderRadius: '12px',
        color: Colors.primary,
        fontSize: '14px',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        cursor: 'pointer',
    },
    features: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        marginBottom: '32px',
    },
    featureItem: {
        display: 'flex',
        gap: '16px',
    },
    featureIcon: {
        width: '44px',
        height: '44px',
        background: Colors.surface,
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        border: `1px solid ${Colors.border}`,
    },
    featureContent: {
        flex: 1,
    },
    featureTitle: {
        fontSize: '15px',
        fontWeight: 800,
        color: Colors.text,
        margin: '0 0 4px 0',
    },
    featureDesc: {
        fontSize: '13px',
        color: Colors.textSecondary,
        margin: 0,
        lineHeight: 1.4,
    },
    mainActionBtn: {
        width: '100%',
        padding: '18px',
        borderRadius: '16px',
        background: Colors.gradientPrimary,
        color: '#000',
        fontWeight: 900,
        fontSize: '16px',
        border: 'none',
        cursor: 'pointer',
        boxShadow: `0 8px 24px ${Colors.primary}40`,
        letterSpacing: '0.5px',
    },
};

export default DualTrainingPage;
