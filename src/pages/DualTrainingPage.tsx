// =====================================================
// GymBro PWA - Dual Training Page (Single Partner)
// =====================================================

import React from 'react';
import Colors from '@/styles/colors';
import { ChevronLeft, Users, Zap, Heart, ShieldCheck, Share2, UserX, UserPlus, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/Card';
import { useUserStore, PartnerInfo } from '@/stores/userStore';
import { toast } from 'react-hot-toast';

import { firebaseService } from '@/services/firebaseService';

export const DualTrainingPage: React.FC = () => {
    const navigate = useNavigate();
    const { perfil, userId, removePartner, setActivePartnerId, setRoutineSync } = useUserStore();
    const [isConnecting, setIsConnecting] = React.useState(false);
    const [aliasInput, setAliasInput] = React.useState('');
    const [connectError, setConnectError] = React.useState('');

    const partners = perfil.partners || [];
    const activePartnerId = perfil.activePartnerId || partners[0]?.id || null;
    const hasPartners = partners.length > 0 || !!perfil.partnerId;
    const isSyncEnabled = Boolean(perfil.routineSync?.enabled && perfil.routineSync?.partnerId);

    const handleConnect = async () => {
        if (!aliasInput.trim()) return;
        if (!userId || !perfil.alias) {
            setConnectError('Configura tu alias primero en tu perfil.');
            return;
        }
        if (hasPartners) {
            setConnectError('Solo puedes tener un partner activo. Desvincula primero.');
            return;
        }
        setIsConnecting(true);
        setConnectError('');

        try {
            const user = await firebaseService.findUserByAlias(aliasInput.trim());

            if (!user) {
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

            await firebaseService.sendLinkRequest(userId, perfil.alias, user.id, user.alias || user.name);
            toast.success(`Solicitud enviada a ${user.name || user.alias}`);
            setAliasInput('');
        } catch (error: unknown) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : 'Error al conectar';
            if (errorMessage === 'ALREADY_HAS_PARTNER') {
                setConnectError('Ya tienes un partner activo.');
            } else if (errorMessage === 'RECIPIENT_ALREADY_HAS_PARTNER') {
                setConnectError('Ese usuario ya tiene un partner activo.');
            } else if (errorMessage === 'ALREADY_LINKED') {
                setConnectError('Ya estan vinculados.');
            } else {
                setConnectError(errorMessage);
            }
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
                            } catch {
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

    const handleBreakSync = async () => {
        if (!userId || !perfil.routineSync?.partnerId) return;
        try {
            await firebaseService.breakRoutineSync(userId, perfil.routineSync.partnerId);
            setRoutineSync({
                enabled: false,
                partnerId: null,
                mode: 'manual',
                syncId: null,
                updatedAt: new Date().toISOString(),
            });
            toast.success('Sincronizacion desactivada');
        } catch {
            toast.error('No se pudo desactivar la sincronizacion');
        }
    };

    const handleSyncNow = async () => {
        if (!userId || !perfil.routineSync?.partnerId) return;
        try {
            await firebaseService.syncRoutineNow(userId, perfil.routineSync.partnerId);
            toast.success('Sincronizacion manual solicitada');
        } catch {
            toast.error('No se pudo sincronizar ahora');
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
                    <p style={styles.headerLabel}>SOCIAL SYNC</p>
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
                                ? 'Tienes un partner vinculado. Puedes entrenar juntos y sincronizar rutina manualmente.'
                                : 'Conecta con un partner para entrenar juntos y motivarse mutuamente.'
                            }
                        </p>
                        {isSyncEnabled && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                                <button
                                    onClick={handleSyncNow}
                                    style={{
                                        borderRadius: '8px',
                                        padding: '8px 12px',
                                        border: `1px solid ${Colors.primary}`,
                                        color: Colors.primary,
                                        background: `${Colors.primary}15`,
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                    }}
                                >
                                    <RefreshCw size={12} />
                                    Sincronizar ahora
                                </button>
                                <button
                                    onClick={handleBreakSync}
                                    style={{
                                        borderRadius: '8px',
                                        padding: '8px 12px',
                                        border: `1px solid ${Colors.warning}`,
                                        color: Colors.warning,
                                        background: `${Colors.warning}15`,
                                        fontSize: '12px',
                                        fontWeight: 700,
                                    }}
                                >
                                    Romper sincronizacion
                                </button>
                            </div>
                        )}
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
                                    <div
                                        style={{ ...styles.userInfo, cursor: 'pointer' }}
                                        onClick={() => setActivePartnerId(partner.id)}
                                    >
                                        <span style={styles.userName}>{partner.nombre}</span>
                                        <span style={styles.userStatus}>
                                            @{partner.alias}{activePartnerId === partner.id ? ' - Activo' : ''}
                                        </span>
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
                                <button
                                    onClick={() => handleUnlink({
                                        id: perfil.partnerId!,
                                        alias: perfil.pareja?.nombre || 'partner',
                                        nombre: perfil.pareja?.nombre || 'Partner',
                                    })}
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
                                    title="Desvincular partner"
                                >
                                    <UserX size={14} color={Colors.error} />
                                </button>
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
                                disabled={hasPartners}
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
                                disabled={isConnecting || hasPartners}
                            >
                                {isConnecting ? '...' : <Zap size={18} />}
                            </button>
                        </div>
                        {hasPartners && (
                            <p style={{ color: Colors.textTertiary, fontSize: '12px', marginTop: '8px' }}>
                                Ya tienes un partner activo. Desvincula para vincular otro.
                            </p>
                        )}
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
                        <h4 style={styles.featureTitle}>Vinculo 1 a 1</h4>
                        <p style={styles.featureDesc}>Un partner activo para mantener el flujo simple y estable.</p>
                    </div>
                </div>
                <div style={styles.featureItem}>
                    <div style={styles.featureIcon}>
                        <ShieldCheck size={20} color="#C026D3" />
                    </div>
                    <div style={styles.featureContent}>
                        <h4 style={styles.featureTitle}>Sync Manual Eficiente</h4>
                        <p style={styles.featureDesc}>Sincroniza la rutina cuando quieras, sin costo de tiempo real continuo.</p>
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


