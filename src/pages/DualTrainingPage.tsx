// =====================================================
// GymBro PWA - Dual Training Page (Multi-Partner)
// =====================================================

import React from 'react';
import Colors from '@/styles/colors';
import { ChevronLeft, Users, Zap, Heart, ShieldCheck, Share2, UserX, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/Card';
import { useUserStore, PartnerInfo } from '@/stores/userStore';
import { toast } from 'react-hot-toast';

import { firebaseService } from '@/services/firebaseService';

export const DualTrainingPage: React.FC = () => {
    const navigate = useNavigate();
    const { perfil, userId, removePartner } = useUserStore();
    const [isConnecting, setIsConnecting] = React.useState(false);
    const [aliasInput, setAliasInput] = React.useState('');
    const [connectError, setConnectError] = React.useState('');

    const partners = perfil.partners || [];
    const hasPartners = partners.length > 0 || !!perfil.partnerId;

    const handleConnect = async () => {
        if (!aliasInput.trim()) return;
        if (!userId || !perfil.alias) {
            setConnectError('Configura tu alias primero en tu perfil.');
            return;
        }
        setIsConnecting(true);
        setConnectError('');

        try {
            const user = await firebaseService.findUserByAlias(aliasInput.trim());

            if (!user || user.id === user.alias) {
                setConnectError('Alias no encontrado');
                return;
            }

            if (user.id === userId) {
                setConnectError('No puedes vincularte contigo mismo.');
                return;
            }

            // Check if already linked
            if (partners.some(p => p.id === user.id)) {
                setConnectError('Ya estas vinculado con esta persona.');
                return;
            }

            await firebaseService.sendLinkRequest(userId, perfil.alias, user.id);
            toast.success(`Solicitud enviada a ${user.name || user.alias}`);
            setAliasInput('');
        } catch (error: unknown) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : "Error al conectar";
            setConnectError(errorMessage);
        } finally {
            setIsConnecting(false);
        }
    };

    const handleUnlink = (partner: PartnerInfo) => {
        toast((t) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>Desvincular a {partner.nombre}?</span>
                <span style={{ fontSize: '12px', color: '#aaa' }}>
                    Podran volver a vincularse despues
                </span>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px' }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={async () => {
                            try {
                                if (userId) {
                                    await firebaseService.unlinkPartner(userId, partner);
                                    removePartner(partner.id);
                                    toast.success(`${partner.nombre} desvinculado`);
                                }
                                toast.dismiss(t.id);
                            } catch (error) {
                                toast.error('Error al desvincular');
                            }
                        }}
                        style={{ background: Colors.error, border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}
                    >
                        Desvincular
                    </button>
                </div>
            </div>
        ), { duration: 5000 });
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
                            <div style={styles.synergyValue}>{partners.length}</div>
                            <div style={styles.synergyLabel}>PARTNERS</div>
                        </div>
                    </div>
                    <div style={styles.synergyInfo}>
                        <h2 style={styles.synergyTitle}>Tu Red de Entrenamiento</h2>
                        <p style={styles.synergyDesc}>
                            {hasPartners
                                ? `Tienes ${partners.length} partner${partners.length !== 1 ? 's' : ''} vinculado${partners.length !== 1 ? 's' : ''}. Elige con quien entrenar al iniciar tu sesion.`
                                : "Conecta con tus partners para entrenar juntos y motivarse mutuamente."
                            }
                        </p>
                    </div>
                </div>
            </Card>

            {/* Partners List */}
            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Partners Vinculados</h3>
                <Card style={styles.connectionCard}>
                    {/* Current user row */}
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
                            <span style={styles.userName}>{perfil.usuario.nombre || 'Tu'}</span>
                            <span style={styles.userStatus}>En linea</span>
                        </div>
                        <div style={styles.userIcon}>
                            <Zap size={18} color={Colors.primary} />
                        </div>
                    </div>

                    {/* Partner rows */}
                    {partners.length > 0 ? (
                        partners.map((partner) => (
                            <React.Fragment key={partner.id}>
                                <div style={styles.divider} />
                                <div style={styles.userRow}>
                                    <div style={styles.avatarWrapper}>
                                        <img
                                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${partner.nombre || partner.alias}`}
                                            style={styles.avatar}
                                            alt={partner.nombre}
                                        />
                                        <div style={{ ...styles.statusDot, background: Colors.textTertiary }} />
                                    </div>
                                    <div style={styles.userInfo}>
                                        <span style={styles.userName}>{partner.nombre}</span>
                                        <span style={styles.userStatus}>@{partner.alias}</span>
                                    </div>
                                    <button
                                        onClick={() => handleUnlink(partner)}
                                        style={{
                                            background: `${Colors.error}15`,
                                            border: `1px solid ${Colors.error}30`,
                                            borderRadius: '8px',
                                            padding: '6px 8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                        }}
                                    >
                                        <UserX size={14} color={Colors.error} />
                                    </button>
                                </div>
                            </React.Fragment>
                        ))
                    ) : perfil.partnerId ? (
                        // Legacy single partner fallback
                        <>
                            <div style={styles.divider} />
                            <div style={styles.userRow}>
                                <div style={styles.avatarWrapper}>
                                    <img
                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${perfil.pareja?.nombre || 'GymBro'}`}
                                        style={styles.avatar}
                                        alt="Partner"
                                    />
                                    <div style={{ ...styles.statusDot, background: Colors.textTertiary }} />
                                </div>
                                <div style={styles.userInfo}>
                                    <span style={styles.userName}>{perfil.pareja?.nombre || 'Partner vinculado'}</span>
                                    <span style={styles.userStatus}>Vinculado (legacy)</span>
                                </div>
                            </div>
                        </>
                    ) : null}

                    {/* Add new partner input */}
                    <div style={styles.divider} />
                    <div style={{ padding: '10px 0 0 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <UserPlus size={16} color={Colors.primary} />
                            <p style={{ fontSize: '13px', margin: 0, color: Colors.textSecondary, fontWeight: 600 }}>Agregar Partner</p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: `1px solid ${Colors.border}`,
                                    background: Colors.background,
                                    color: Colors.text,
                                    fontSize: '14px',
                                }}
                                placeholder="Alias del partner"
                                value={aliasInput}
                                onChange={e => setAliasInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleConnect()}
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
                </Card>
            </div>

            {/* Features Info */}
            <div style={styles.features}>
                <div style={styles.featureItem}>
                    <div style={styles.featureIcon}>
                        <Heart size={20} color={Colors.error} />
                    </div>
                    <div style={styles.featureContent}>
                        <h4 style={styles.featureTitle}>Multiples Partners</h4>
                        <p style={styles.featureDesc}>Vincularte con varias personas y elige con quien entrenar cada dia.</p>
                    </div>
                </div>
                <div style={styles.featureItem}>
                    <div style={styles.featureIcon}>
                        <ShieldCheck size={20} color="#C026D3" />
                    </div>
                    <div style={styles.featureContent}>
                        <h4 style={styles.featureTitle}>Dos Modos de Entrenamiento</h4>
                        <p style={styles.featureDesc}>Mismo celular o cada quien el suyo con sincronizacion en tiempo real.</p>
                    </div>
                </div>
            </div>

            {/* Shared Sessions History */}
            {hasPartners && (
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Sesiones Compartidas Recientes</h3>
                    <Card style={styles.historyCard}>
                        <p style={styles.historyPlaceholder}>
                            El historial de sesiones compartidas aparecera aqui
                        </p>
                        <p style={styles.historyNote}>
                            (Proximamente)
                        </p>
                    </Card>
                </div>
            )}
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
    // mainActionBtn removed - sessions start from HomePage now
    historyCard: {
        padding: '24px',
        background: Colors.surface,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
    },
    historyPlaceholder: {
        fontSize: '14px',
        color: Colors.textSecondary,
        textAlign: 'center',
        margin: 0,
    },
    historyNote: {
        fontSize: '12px',
        color: Colors.textTertiary,
        textAlign: 'center',
        margin: 0,
        fontStyle: 'italic',
    }
};

export default DualTrainingPage;


