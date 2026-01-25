// =====================================================
// GymBro PWA - Profile Page
// =====================================================

import { Card } from '@/components/Card';
import { useUserStore } from '@/stores/userStore';
import Colors from '@/styles/colors';
import {
    Bell, Calendar, Heart, RefreshCw, Settings, Shield, Users,
    Cloud, Download, Upload, CheckCircle, AlertCircle, Loader2, LogOut, Camera
} from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const { userId, perfil, resetear, logout, isSyncing, lastSyncError } = useUserStore();
    const userInfo = perfil.usuario;
    const partnerInfo = perfil.pareja;
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    const handleReset = () => {
        setShowResetConfirm(true);
    };

    const confirmReset = () => {
        resetear();
        localStorage.clear();
        navigate('/onboarding');
        window.location.reload();
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuItems = [
        { icon: Heart, label: 'Mis Rutinas Activas', color: '#3B82F6', action: () => navigate('/routine') },
        { icon: Calendar, label: 'Configurar Horario', color: '#8B5CF6', action: () => navigate('/profile/schedule') },
        { icon: Bell, label: 'Recordatorios de Gym', color: '#10B981', action: () => alert('Próximamente') },
        { icon: Shield, label: 'Privacidad y Datos', color: '#F59E0B', action: () => alert('Próximamente') },
    ];

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.headerBar}>
                <h1 style={styles.headerTitle}>MI PERFIL</h1>
                <button style={styles.settingsBtn}>
                    <Settings size={24} color="#FFF" />
                </button>
            </div>

            {/* Profile Header */}
            <div style={styles.profileHeader}>
                <div style={styles.avatarContainer}>
                    <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userInfo.nombre}&backgroundColor=b6e3f4`}
                        alt="Avatar"
                        style={styles.avatar}
                    />
                    <div style={styles.editAvatar}>
                        <Camera size={14} color="#FFF" />
                    </div>
                </div>
                <h2 style={styles.userName}>{userInfo.nombre || 'GymBro'}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <p style={styles.userLevel}>
                        {userInfo.nivel.toUpperCase()} • {userInfo.objetivo.replace('_', ' ').toUpperCase()}
                    </p>
                    {isSyncing ? (
                        <Loader2 size={14} color={Colors.primary} className="animate-spin" />
                    ) : lastSyncError ? (
                        <AlertCircle size={14} color={Colors.error} />
                    ) : (
                        <CheckCircle size={14} color={Colors.success} />
                    )}
                </div>
                {lastSyncError && <p style={{ color: Colors.error, fontSize: '10px', marginTop: '4px' }}>{lastSyncError}</p>}

                <div style={styles.aliasBadge}>
                    <span style={styles.aliasLabel}>ALIAS</span>
                    <span style={styles.aliasText}>{userId}</span>
                </div>
            </div>

            {/* Stats */}
            <div style={styles.statsRow}>
                <div style={styles.statItem}>
                    <span style={styles.statVal}>0</span>
                    <span style={styles.statLabel}>SESIONES</span>
                </div>
                <div style={styles.statItem}>
                    <span style={styles.statVal}>0</span>
                    <span style={styles.statLabel}>STREAK</span>
                </div>
                <div style={styles.statItem}>
                    <span style={styles.statVal}>70%</span>
                    <span style={styles.statLabel}>FORMA</span>
                </div>
            </div>

            {/* Partner Section */}
            <h3 style={styles.sectionTitle}>Mi Pareja Gymbro</h3>
            {partnerInfo ? (
                <Card style={styles.partnerCard}>
                    <div style={styles.partnerInfo}>
                        <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${partnerInfo.nombre}`}
                            alt="Partner"
                            style={styles.partnerAvatar}
                        />
                        <div style={{ flex: 1 }}>
                            <p style={styles.partnerName}>{partnerInfo.nombre}</p>
                            <p style={styles.partnerStatus}>Sincronizados</p>
                        </div>
                        <div style={styles.coupleStreak}>
                            <Heart size={16} color={Colors.error} fill={Colors.error} />
                            <span style={styles.coupleStreakText}>0</span>
                        </div>
                    </div>
                </Card>
            ) : (
                <button style={styles.addPartnerBtn} onClick={() => alert('Próximamente')}>
                    <Users size={32} color={Colors.primary} />
                    <span style={styles.addPartnerText}>Vincular Pareja</span>
                </button>
            )}

            {/* Routine History */}
            {perfil.historialRutinas && perfil.historialRutinas.length > 0 && (
                <>
                    <h3 style={styles.sectionTitle}>Historial de Rutinas</h3>
                    <div style={styles.historyContainer}>
                        {perfil.historialRutinas.map((r, i) => (
                            <div key={i} style={styles.historyCard}>
                                <div style={styles.historyInfo}>
                                    <span style={styles.historyVersion}>{r.nombre.split(' - ')[0]}</span>
                                    <div style={{ flex: 1 }}>
                                        <p style={styles.historyName}>{r.nombre.split(' - ')[1] || r.nombre}</p>
                                        <p style={styles.historyDate}>
                                            {new Date(r.fechaInicio).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })} • {r.ejercicios.length} ejercicios
                                        </p>
                                    </div>
                                    <Shield size={16} color={Colors.textTertiary} />
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}


            {/* Menu */}
            <div style={styles.menuContainer}>
                {menuItems.map((item, i) => (
                    <button key={i} style={styles.menuItem} onClick={item.action}>
                        <div style={{ ...styles.menuIcon, background: item.color }}>
                            <item.icon size={20} color="#FFF" />
                        </div>
                        <span style={styles.menuText}>{item.label}</span>
                    </button>
                ))}

                <button style={{ ...styles.menuItem, marginTop: '20px' }} onClick={handleLogout}>
                    <div style={{ ...styles.menuIcon, background: Colors.textSecondary }}>
                        <LogOut size={20} color="#FFF" />
                    </div>
                    <span style={styles.menuText}>Cerrar Sesión (Cambiar Usuario)</span>
                </button>

                <button style={{ ...styles.menuItem, marginTop: '8px' }} onClick={handleReset}>
                    <div style={{ ...styles.menuIcon, background: Colors.error }}>
                        <RefreshCw size={20} color="#FFF" />
                    </div>
                    <span style={{ ...styles.menuText, color: Colors.error }}>Reiniciar App (Debug)</span>
                </button>
            </div>

            <p style={styles.version}>GymBro PWA v1.0.0</p>

            {/* Reset Confirmation Modal */}
            {showResetConfirm && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalIcon}>⚠️</div>
                        <h3 style={styles.modalTitle}>¿Reiniciar App?</h3>
                        <p style={styles.modalText}>
                            Esto borrará todos tus datos: perfil, rutinas e historial. Esta acción no se puede deshacer.
                        </p>
                        <div style={styles.modalActions}>
                            <button style={styles.modalCancelBtn} onClick={() => setShowResetConfirm(false)}>
                                Cancelar
                            </button>
                            <button style={styles.modalDeleteBtn} onClick={confirmReset}>
                                <RefreshCw size={18} />
                                Reiniciar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        padding: '20px',
        paddingTop: 'calc(20px + env(safe-area-inset-top, 0px))',
    },
    headerBar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
    },
    headerTitle: {
        fontSize: '18px',
        fontWeight: 800,
        color: Colors.text,
        letterSpacing: '1px',
        margin: 0,
    },
    settingsBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
    },
    profileHeader: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: '32px',
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: '16px',
    },
    avatar: {
        width: '120px',
        height: '120px',
        borderRadius: '60px',
        border: `4px solid ${Colors.primary}`,
    },
    levelBadge: {
        position: 'absolute',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        background: Colors.primary,
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 800,
        color: '#000',
    },
    userName: {
        fontSize: '24px',
        fontWeight: 800,
        color: Colors.text,
        margin: '0 0 4px 0',
    },
    userLevel: {
        fontSize: '12px',
        fontWeight: 600,
        color: Colors.textSecondary,
        margin: 0,
        letterSpacing: '0.5px',
    },
    aliasBadge: {
        marginTop: '16px',
        background: `${Colors.primary}15`,
        padding: '8px 16px',
        borderRadius: '12px',
        border: `1px solid ${Colors.primary}30`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    aliasLabel: {
        fontSize: '10px',
        fontWeight: 900,
        color: Colors.primary,
        letterSpacing: '1px',
        marginBottom: '2px',
    },
    aliasText: {
        fontSize: '28px',
        fontWeight: 900,
        color: Colors.text,
        letterSpacing: '2px',
        textTransform: 'uppercase',
    },
    userBio: {
        fontSize: '13px',
        color: Colors.textSecondary,
        margin: 0,
    },
    statsRow: {
        display: 'flex',
        justifyContent: 'space-around',
        marginBottom: '32px',
        padding: '20px',
        background: Colors.surface,
        borderRadius: '20px',
    },
    statItem: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    statVal: {
        fontSize: '24px',
        fontWeight: 900,
        color: Colors.text,
    },
    statLabel: {
        fontSize: '10px',
        fontWeight: 700,
        color: Colors.textTertiary,
        letterSpacing: '1px',
    },
    sectionTitle: {
        fontSize: '16px',
        fontWeight: 800,
        color: Colors.text,
        margin: '0 0 16px 0',
    },
    partnerCard: {
        marginBottom: '24px',
    },
    partnerInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    },
    partnerAvatar: {
        width: '56px',
        height: '56px',
        borderRadius: '28px',
    },
    partnerName: {
        fontSize: '16px',
        fontWeight: 700,
        color: Colors.text,
        margin: 0,
    },
    partnerStatus: {
        fontSize: '13px',
        color: Colors.textSecondary,
        margin: '4px 0 0 0',
    },
    coupleStreak: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: `${Colors.error}20`,
        padding: '8px 12px',
        borderRadius: '12px',
    },
    coupleStreakText: {
        fontSize: '16px',
        fontWeight: 800,
        color: Colors.error,
    },
    addPartnerBtn: {
        width: '100%',
        padding: '24px',
        background: Colors.surface,
        border: `2px dashed ${Colors.border}`,
        borderRadius: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer',
        marginBottom: '24px',
    },
    addPartnerText: {
        fontSize: '14px',
        fontWeight: 600,
        color: Colors.primary,
    },
    menuContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    menuItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px',
        background: Colors.surface,
        border: 'none',
        borderRadius: '16px',
        cursor: 'pointer',
        width: '100%',
    },
    menuIcon: {
        width: '40px',
        height: '40px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuText: {
        fontSize: '15px',
        fontWeight: 600,
        color: Colors.text,
    },
    version: {
        textAlign: 'center',
        fontSize: '12px',
        color: Colors.textTertiary,
        marginTop: '32px',
    },
    historyContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        marginBottom: '24px',
    },
    historyCard: {
        background: Colors.surface,
        borderRadius: '16px',
        padding: '12px 16px',
        border: `1px solid ${Colors.border}`,
    },
    historyInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    historyVersion: {
        fontSize: '10px',
        fontWeight: 900,
        background: `${Colors.textTertiary}20`,
        color: Colors.textTertiary,
        padding: '4px 8px',
        borderRadius: '8px',
        minWidth: '60px',
        textAlign: 'center',
    },
    historyName: {
        fontSize: '14px',
        fontWeight: 700,
        color: Colors.text,
        margin: 0,
    },
    historyDate: {
        fontSize: '11px',
        color: Colors.textTertiary,
        margin: '2px 0 0 0',
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
    },
    modal: {
        background: Colors.surface,
        borderRadius: '24px',
        padding: '32px 24px',
        maxWidth: '360px',
        width: '100%',
        textAlign: 'center',
    },
    modalIcon: {
        fontSize: '48px',
        marginBottom: '16px',
    },
    modalTitle: {
        fontSize: '20px',
        fontWeight: 800,
        color: Colors.text,
        margin: '0 0 12px 0',
    },
    modalText: {
        fontSize: '14px',
        color: Colors.textSecondary,
        margin: '0 0 24px 0',
        lineHeight: 1.5,
    },
    modalActions: {
        display: 'flex',
        gap: '12px',
    },
    modalCancelBtn: {
        flex: 1,
        padding: '14px',
        background: Colors.background,
        border: `1px solid ${Colors.border}`,
        borderRadius: '12px',
        color: Colors.text,
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
    },
    modalDeleteBtn: {
        flex: 1,
        padding: '14px',
        background: Colors.error,
        border: 'none',
        borderRadius: '12px',
        color: '#FFF',
        fontSize: '14px',
        fontWeight: 700,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
    },
    syncActions: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginTop: '12px'
    },
    syncBtn: {
        padding: '14px',
        background: Colors.primary,
        border: 'none',
        borderRadius: '12px',
        color: '#000',
        fontSize: '14px',
        fontWeight: 700,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
    },
    syncBtnOutline: {
        padding: '14px',
        background: 'transparent',
        border: `2px solid ${Colors.primary}`,
        borderRadius: '12px',
        color: Colors.primary,
        fontSize: '14px',
        fontWeight: 700,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
    }
};

export default ProfilePage;
