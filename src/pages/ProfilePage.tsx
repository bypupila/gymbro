// =====================================================
// GymBro PWA - Profile Page
// =====================================================

import { Card } from '@/components/Card';
import { useUserStore } from '@/stores/userStore';
import Colors from '@/styles/colors';
import {
    Bell, Calendar, Heart, RefreshCw, Shield, Users, Copy,
    CheckCircle, AlertCircle, Loader2, LogOut, Camera, Trash2, X, UserX, Image as ImageIcon
} from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { firebaseService } from '@/services/firebaseService';
import { authService } from '@/services/authService';
import { toast } from 'react-hot-toast';
import { calculateGlobalStats } from '@/utils/statsUtils';
import { NivelExperiencia, ObjetivoFitness } from '@/stores/userStore';
import { LinkRequestsNotifier } from '@/components/LinkRequestsNotifier';
import { RoutineCopyModal } from '@/components/RoutineCopyModal';
import { useRenderMetric } from '@/utils/renderMetrics';

interface FirebaseAuthError {
    code: string;
    message: string;
}

const debugLog = (...args: unknown[]) => {
    if (import.meta.env.DEV) {
        console.log(...args);
    }
};


export const ProfilePage: React.FC = () => {
    useRenderMetric('ProfilePage');
    const navigate = useNavigate();
    const userId = useUserStore((state) => state.userId);
    const perfil = useUserStore((state) => state.perfil);
    const resetear = useUserStore((state) => state.resetear);
    const logout = useUserStore((state) => state.logout);
    const isSyncing = useUserStore((state) => state.isSyncing);
    const lastSyncError = useUserStore((state) => state.lastSyncError);
    const setDatosPersonales = useUserStore((state) => state.setDatosPersonales);
    const deleteRoutineFromHistory = useUserStore((state) => state.deleteRoutineFromHistory);
    const removePartner = useUserStore((state) => state.removePartner);
    const userInfo = perfil.usuario;
    const partnerInfo = perfil.pareja;
    const partners = perfil.partners || [];
    const activePartner = partners.find((p) => p.id === perfil.activePartnerId) || partners[0] || null;
    const legacyLinkedPartner = !activePartner && perfil.partnerId
        ? {
            id: perfil.partnerId,
            alias: partnerInfo?.nombre || 'partner',
            nombre: partnerInfo?.nombre || 'Partner',
        }
        : null;
    const linkedPartner = activePartner || legacyLinkedPartner;
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState(userInfo);
    const [editAlias, setEditAlias] = useState(perfil.alias || '');
    const [aliasError, setAliasError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const stats = useMemo(() => calculateGlobalStats(perfil), [perfil]);

    // Modal States
    const [showPartnerModal, setShowPartnerModal] = useState(false);
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const [showRoutineCopyModal, setShowRoutineCopyModal] = useState(false);
    const [isSyncingRoutine, setIsSyncingRoutine] = useState(false);
    const [tempAvatar, setTempAvatar] = useState<string>(userInfo.avatar || '');

    // New state for partner linking flow
    const [partnerAliasInput, setPartnerAliasInput] = useState('');
    const [foundUser, setFoundUser] = useState<{ id: string; name: string; alias: string } | null>(null);
    const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'found' | 'not_found' | 'error' | 'request_sent'>('idle');
    const [isSendingRequest, setIsSendingRequest] = useState(false);


    const handleSearchPartner = async () => {
        if (!partnerAliasInput.trim() || !userId) return;
        if (partnerAliasInput.trim().toLowerCase() === perfil.alias?.toLowerCase()) {
            setSearchStatus('error');
            toast.error('No puedes vincularte contigo mismo.');
            return;
        }

        setSearchStatus('searching');
        setFoundUser(null);
        try {
            const user = await firebaseService.findUserByAlias(partnerAliasInput.trim());
            if (!user) {
                setSearchStatus('not_found');
                return;
            }

            setFoundUser(user);
            setSearchStatus('found');
        } catch (error) {
            console.error("Error finding user:", error);
            setSearchStatus('error');
        }
    };

    const handleSendRequest = async () => {
        // Validacion de datos necesarios
        if (!foundUser || !userId || !perfil.alias) {
            toast.error('Faltan datos necesarios para enviar la solicitud.');
            return;
        }

        // Validacion de auto-vinculacion
        if (userId === foundUser.id) {
            toast.error('No puedes vincularte contigo mismo.');
            setSearchStatus('error');
            return;
        }

        setIsSendingRequest(true);
        try {
            await firebaseService.sendLinkRequest(userId, perfil.alias, foundUser.id, foundUser.alias || foundUser.name);
            setSearchStatus('request_sent');
            toast.success(`Solicitud enviada a ${foundUser.name}`);
            // Optionally close modal after a delay
            setTimeout(() => {
                setShowPartnerModal(false);
                setSearchStatus('idle');
                setPartnerAliasInput('');
                setFoundUser(null);
            }, 2000);
        } catch (error) {
            console.error("Error sending link request:", error);

            // Capturar tanto message como code de Firestore
            const errorMessage = error instanceof Error ? error.message : '';
            const errorCode =
                typeof error === 'object' && error !== null && 'code' in error
                    ? String((error as { code?: unknown }).code ?? '')
                    : '';

            debugLog('[handleSendRequest] Error details:', { errorCode, errorMessage, error });

            // Manejar errores especificos
            if (errorMessage === 'ALREADY_HAS_PARTNER') {
                toast.error('Ya tienes un partner activo.');
            } else if (errorMessage === 'RECIPIENT_ALREADY_HAS_PARTNER') {
                toast.error('Ese usuario ya tiene un partner activo.');
            } else if (errorMessage === 'ALREADY_LINKED') {
                toast.error('Ya estan vinculados.');
            } else if (errorMessage === 'PROFILE_NOT_FOUND') {
                toast.error('No se pudo encontrar el perfil del usuario.');
            } else if (errorCode === 'permission-denied') {
                toast.error('No tienes permisos. Verifica tu sesion y vuelve a intentar.');
            } else if (errorCode === 'unavailable') {
                toast.error('Error de conexion. Verifica tu internet.');
            } else {
                // Mostrar error mas detallado para debugging
                const detailedError = errorMessage || errorCode || 'Desconocido';
                toast.error(`Error al enviar la solicitud: ${detailedError}`);
            }
            setSearchStatus('error');
        } finally {
            setIsSendingRequest(false);
        }
    };

    const handleUnlinkCurrentPartner = (partnerToUnlink: { id: string; nombre: string; alias: string }) => {
        if (!userId) return;

        toast((t) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>Desvincular a {partnerToUnlink.nombre}?</span>
                <span style={{ fontSize: '12px', color: '#aaa' }}>
                    Podran volver a vincularse despues.
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
                                await firebaseService.unlinkPartner(userId, partnerToUnlink);
                                removePartner(partnerToUnlink.id);
                                toast.success(`${partnerToUnlink.nombre} desvinculado`);
                            } catch (error) {
                                console.error('Error unlinking partner:', error);
                                toast.error('No se pudo desvincular.');
                            } finally {
                                toast.dismiss(t.id);
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


    const handleSyncRoutine = async () => {
        if (!userId || !perfil.routineSync?.partnerId) return;
        setIsSyncingRoutine(true);
        try {
            await firebaseService.syncRoutineNow(userId, perfil.routineSync.partnerId);
            toast.success('Rutina sincronizada con tu pareja');
        } catch {
            toast.error('No se pudo sincronizar la rutina');
        } finally {
            setIsSyncingRoutine(false);
        }
    };

    const handleAvatarSelect = (seed: string) => {
        setTempAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4`);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setTempAvatar(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const saveAvatar = () => {
        setDatosPersonales({ avatar: tempAvatar });
        setShowAvatarModal(false);
    };

    // Sync editData with store when it updates elsewhere
    React.useEffect(() => {
        setEditData(userInfo);
        setEditAlias(perfil.alias || '');
    }, [userInfo, perfil.alias]);

    const handleReset = () => {
        setShowResetConfirm(true);
    };

    const confirmReset = () => {
        resetear();
        localStorage.clear();
        navigate('/onboarding');
        window.location.reload();
    };

    const handleLogout = async () => {
        await authService.signOut();
        logout();
        navigate('/login');
    };

    const handleSaveProfile = async () => {
        if (!userId) return;
        setIsSaving(true);
        setAliasError(null);

        const cleanAlias = editAlias.trim().toLowerCase();
        const currentAlias = (perfil.alias || '').toLowerCase();

        try {
            // 1. Validar alias si cambio
            if (cleanAlias !== currentAlias) {
                if (cleanAlias.length < 3) {
                    setAliasError('El alias debe tener al menos 3 caracteres.');
                    setIsSaving(false);
                    return;
                }
                // 1. Validar disponibilidad
                const available = await firebaseService.isAliasAvailable(cleanAlias, userId);
                if (!available) {
                    setAliasError('Este alias ya esta registrado. Elige otro.');
                    setIsSaving(false);
                    return;
                }

                // 2. Intentar actualizar Auth Email si es una cuenta de alias (@gymbro.app)
                const currentUser = authService.getCurrentUser();
                const isGymbroAccount = currentUser?.email?.endsWith('@gymbro.app');

                if (isGymbroAccount) {
                    try {
                        await authService.updateEmail(`${cleanAlias}@gymbro.app`);
                    } catch (authError: unknown) {
                        const typedAuthError = authError as FirebaseAuthError;
                        console.error("Auth Email Update Error:", typedAuthError);
                        if (typedAuthError.code === 'auth/requires-recent-login') {
                            setAliasError('Por seguridad, debes cerrar sesion y volver a entrar para cambiar tu alias de login.');
                            setIsSaving(false);
                            return;
                        }
                        // Otros errores de auth...
                    }
                }

                // 3. Actualizar alias en Firestore (indices y user doc)
                await firebaseService.updateAlias(userId, currentAlias, editAlias.trim());

                // 4. Actualizar localmente el alias en el store
                useUserStore.setState((state) => ({
                    perfil: { ...state.perfil, alias: editAlias.trim() }
                }));
            }

            // 2. Guardar datos personales
            setDatosPersonales(editData);
            setIsEditing(false);
        } catch (error: unknown) {
            const typedError = error as FirebaseAuthError;
            console.error("Error saving profile:", typedError);
            setAliasError(typedError.message === 'ALIAS_TAKEN'
                ? 'Este alias ya esta registrado.'
                : 'Error al conectar con la base de datos.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleEdit = () => {
        if (isEditing) {
            setEditData(userInfo); // Reset to current data if cancelling
        }
        setIsEditing(!isEditing);
    };

    const menuItems = [
        { icon: Heart, label: 'Mis Rutinas Activas', color: '#3B82F6', action: () => navigate('/routine') },
        { icon: Calendar, label: 'Configurar Horario', color: '#8B5CF6', action: () => navigate('/profile/schedule') },

        { icon: Bell, label: 'Recordatorios de Gym', color: '#10B981', action: () => toast('Proximamente') },
        { icon: Shield, label: 'Privacidad y Datos', color: '#F59E0B', action: () => toast('Proximamente') },
    ];

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.headerBar}>
                <h1 style={styles.headerTitle}>MI PERFIL</h1>
                <button
                    style={{ ...styles.editToggleBtn, color: isEditing ? Colors.error : Colors.primary }}
                    onClick={handleToggleEdit}
                >
                    {isEditing ? 'Cancelar' : 'Editar'}
                </button>
            </div>

            {/* Profile Header */}
            <div style={styles.profileHeader}>
                <div
                    style={{ ...styles.avatarContainer, cursor: 'pointer' }}
                    onClick={() => { setTempAvatar(userInfo.avatar || ''); setShowAvatarModal(true); }}
                >
                    <img
                        src={userInfo.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userInfo.nombre}&backgroundColor=b6e3f4`}
                        alt="Avatar"
                        style={styles.avatar}
                    />
                    <div style={styles.editAvatar}>
                        <Camera size={14} color="#FFF" />
                    </div>
                </div>

                {isEditing ? (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <input
                            style={{
                                ...styles.userName,
                                background: 'transparent',
                                border: 'none',
                                borderBottom: `2px solid ${Colors.primary}`,
                                textAlign: 'center',
                                padding: '4px',
                                width: 'auto',
                                outline: 'none',
                                color: Colors.text
                            }}
                            autoFocus
                            value={editData.nombre}
                            onChange={(e) => setEditData({ ...editData, nombre: e.target.value })}
                            placeholder="Nombre de Guerrero"
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <p style={styles.userLevel}>
                                {userInfo.nivel.toUpperCase()} - {userInfo.objetivo.replace('_', ' ').toUpperCase()}
                            </p>
                        </div>
                        <div style={{
                            ...styles.aliasBadge,
                            borderStyle: 'dashed',
                            borderColor: aliasError ? Colors.error : Colors.primary
                        }}>
                            <span style={styles.aliasLabel}>EDITAR ALIAS</span>
                            <input
                                style={{
                                    ...styles.aliasText,
                                    background: 'transparent',
                                    border: 'none',
                                    textAlign: 'center',
                                    width: '180px',
                                    outline: 'none',
                                    color: aliasError ? Colors.error : Colors.text
                                }}
                                value={editAlias}
                                onChange={(e) => {
                                    setEditAlias(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                                    setAliasError(null);
                                }}
                                placeholder="ej: titan23"
                            />
                        </div>
                        {aliasError && <p style={{ color: Colors.error, fontSize: '10px', marginTop: '4px', fontWeight: 700 }}>{aliasError}</p>}
                    </div>
                ) : (
                    <>
                        <h2 style={styles.userName}>{userInfo.nombre || 'GymBro'}</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <p style={styles.userLevel}>
                                {userInfo.nivel.toUpperCase()} - {userInfo.objetivo.replace('_', ' ').toUpperCase()}
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
                            <span style={styles.aliasText}>{perfil.alias || '---'}</span>
                        </div>
                    </>
                )}
            </div>

            {/* Stats */}
            <div style={styles.statsRow}>
                <div style={styles.statItem}>
                    <span style={styles.statVal}>{stats.totalSessions}</span>
                    <span style={styles.statLabel}>SESIONES</span>
                </div>
                <div style={styles.statItem}>
                    <span style={styles.statVal}>{stats.streak}</span>
                    <span style={styles.statLabel}>RACHA</span>
                </div>
                <div style={styles.statItem}>
                    <span style={styles.statVal}>{stats.consistency}%</span>
                    <span style={styles.statLabel}>CONSTANCIA</span>
                </div>
            </div>

            {/* Personal Info Section */}
            <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>Informacion Personal</h3>
            </div>

            <Card style={styles.infoCard}>
                {isEditing ? (
                    <div style={styles.editForm}>
                        <div style={styles.grid2}>
                            <div style={styles.inputGroup}>
                                <label style={styles.editLabel}>Edad</label>
                                <input
                                    style={styles.editInput}
                                    type="number"
                                    value={editData.edad}
                                    onChange={(e) => setEditData({ ...editData, edad: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.editLabel}>Peso (kg)</label>
                                <input
                                    style={styles.editInput}
                                    type="number"
                                    value={editData.peso}
                                    onChange={(e) => setEditData({ ...editData, peso: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                        <div style={styles.grid2}>
                            <div style={styles.inputGroup}>
                                <label style={styles.editLabel}>Altura (cm)</label>
                                <input
                                    style={styles.editInput}
                                    type="number"
                                    value={editData.altura}
                                    onChange={(e) => setEditData({ ...editData, altura: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.editLabel}>Nivel</label>
                                <select
                                    style={styles.editSelect}
                                    value={editData.nivel}
                                    onChange={(e) => setEditData({ ...editData, nivel: e.target.value as NivelExperiencia })}
                                >
                                    <option value="principiante">Principiante</option>
                                    <option value="intermedio">Intermedio</option>
                                    <option value="avanzado">Avanzado</option>
                                </select>
                            </div>
                        </div>
                        <div style={styles.inputGroup}>
                            <label style={styles.editLabel}>Objetivo</label>
                            <select
                                style={styles.editSelect}
                                value={editData.objetivo}
                                                                    onChange={(e) => setEditData({ ...editData, objetivo: e.target.value as ObjetivoFitness })}                            >
                                <option value="ganar_musculo">Ganar Musculo</option>
                                <option value="perder_grasa">Perder Grasa</option>
                                <option value="mantener">Mantenerme</option>
                                <option value="fuerza">Ganar Fuerza</option>
                                <option value="resistencia">Resistencia</option>
                            </select>
                        </div>
                        <div style={styles.inputGroup}>
                            <label style={styles.editLabel}>Lesiones / Observaciones</label>
                            <textarea
                                style={styles.editTextarea}
                                value={editData.lesiones}
                                onChange={(e) => setEditData({ ...editData, lesiones: e.target.value })}
                            />
                        </div>
                        <button
                            style={{
                                ...styles.saveBtn,
                                opacity: isSaving ? 0.7 : 1,
                                cursor: isSaving ? 'wait' : 'pointer'
                            }}
                            onClick={handleSaveProfile}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Guardando...
                                </>
                            ) : 'Guardar Cambios'}
                        </button>
                    </div>
                ) : (
                    <div style={styles.viewGrid}>
                        <div style={styles.viewItem}>
                            <span style={styles.viewLabel}>EDAD</span>
                            <span style={styles.viewValue}>{userInfo.edad || '--'} anos</span>
                        </div>
                        <div style={styles.viewItem}>
                            <span style={styles.viewLabel}>PESO</span>
                            <span style={styles.viewValue}>{userInfo.peso || '--'} kg</span>
                        </div>
                        <div style={styles.viewItem}>
                            <span style={styles.viewLabel}>ALTURA</span>
                            <span style={styles.viewValue}>{userInfo.altura || '--'} cm</span>
                        </div>
                        <div style={styles.viewItem}>
                            <span style={styles.viewLabel}>NIVEL</span>
                            <span style={styles.viewValue}>{userInfo.nivel.toUpperCase()}</span>
                        </div>
                        {userInfo.lesiones && (
                            <div style={{ ...styles.viewItem, gridColumn: 'span 2' }}>
                                <span style={styles.viewLabel}>LESIONES</span>
                                <span style={styles.viewValue}>{userInfo.lesiones}</span>
                            </div>
                        )}
                    </div>
                )}
            </Card>

            {/* Link Requests Notifier */}
            <LinkRequestsNotifier />

            {/* Partner Section */}
            <h3 style={styles.sectionTitle}>Mi Pareja Gymbro</h3>
            {linkedPartner ? (
                <Card style={styles.partnerCard}>
                    <div style={styles.partnerInfo}>
                        <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${linkedPartner.nombre || 'Partner'}`}
                            alt="Partner"
                            style={styles.partnerAvatar}
                        />
                        <div style={{ flex: 1 }}>
                            <p style={styles.partnerName}>{linkedPartner.nombre}</p>
                            <p style={styles.partnerStatus}>Sincronizados</p>
                        </div>
                        <button
                            style={styles.copyRoutineBtn}
                            onClick={() => setShowRoutineCopyModal(true)}
                            title="Copiar rutina"
                        >
                            <Copy size={16} color={Colors.primary} />
                        </button>
                        {perfil.routineSync?.enabled && perfil.rutina && (
                            <button
                                style={styles.syncRoutineBtn}
                                onClick={handleSyncRoutine}
                                disabled={isSyncingRoutine}
                                title="Sincronizar rutina"
                            >
                                {isSyncingRoutine
                                    ? <Loader2 size={16} color={Colors.success} className="animate-spin" />
                                    : <RefreshCw size={16} color={Colors.success} />
                                }
                            </button>
                        )}
                        <button
                            style={styles.unlinkPartnerBtn}
                            onClick={() => handleUnlinkCurrentPartner(linkedPartner)}
                            title="Desvincular partner"
                        >
                            <UserX size={16} color={Colors.error} />
                        </button>
                        <div style={styles.coupleStreak}>
                            <Heart size={16} color={Colors.error} fill={Colors.error} />
                            <span style={styles.coupleStreakText}>0</span>
                        </div>
                    </div>
                </Card>
            ) : (
                <button style={styles.addPartnerBtn} onClick={() => setShowPartnerModal(true)}>
                    <Users size={32} color={Colors.primary} />
                    <span style={styles.addPartnerText}>Vincular Pareja</span>
                </button>
            )
            }

            {/* Routine History */}
            {
                perfil.historialRutinas && perfil.historialRutinas.length > 0 && (
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
                                                {new Date(r.fechaInicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })} - {r.ejercicios.length} ejercicios
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                toast((t) => (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                        <span style={{ fontSize: '14px', fontWeight: 600 }}>Eliminar esta rutina del historial?</span>
                                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                            <button
                                                                onClick={() => toast.dismiss(t.id)}
                                                                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px' }}
                                                            >
                                                                Cancelar
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    deleteRoutineFromHistory(i);
                                                                    toast.dismiss(t.id);
                                                                    toast.success('Rutina eliminada del historial');
                                                                }}
                                                                style={{ background: Colors.error, border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}
                                                            >
                                                                Eliminar
                                                            </button>
                                                        </div>
                                                    </div>
                                                ), { duration: 5000 });
                                            }}
                                            style={styles.deleteHistoryBtn}
                                        >
                                            <Trash2 size={16} color={Colors.textTertiary} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )
            }


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
                    <span style={styles.menuText}>Cerrar Sesion (Cambiar Usuario)</span>
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
            {
                showResetConfirm && (
                    <div style={styles.modalOverlay}>
                        <div style={styles.modal}>
                            <div style={styles.modalIcon}><AlertCircle size={24} color={Colors.warning} /></div>
                            <h3 style={styles.modalTitle}>Reiniciar App?</h3>
                            <p style={styles.modalText}>
                                Esto borrara todos tus datos: perfil, rutinas e historial. Esta accion no se puede deshacer.
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
                )
            }

            {/* Partner Modal */}
            {showPartnerModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Vincular Pareja</h3>
                            <button onClick={() => {
                                setShowPartnerModal(false);
                                setSearchStatus('idle');
                                setPartnerAliasInput('');
                                setFoundUser(null);
                            }} style={styles.closeBtn}>
                                <X size={20} color={Colors.text} />
                            </button>
                        </div>
                        <p style={styles.modalText}>
                            Introduce el alias de tu pareja para enviarle una solicitud de vinculacion.
                        </p>
                        <div style={styles.partnerSearchContainer}>
                            <input
                                style={styles.modalInput}
                                placeholder="ej: titan23"
                                value={partnerAliasInput}
                                onChange={(e) => setPartnerAliasInput(e.target.value)}
                                disabled={searchStatus === 'searching' || searchStatus === 'request_sent'}
                            />
                            <button
                                style={styles.searchBtn}
                                onClick={handleSearchPartner}
                                disabled={searchStatus === 'searching' || !partnerAliasInput.trim()}
                            >
                                {searchStatus === 'searching' ? <Loader2 size={20} className="animate-spin" /> : 'Buscar'}
                            </button>
                        </div>

                        {searchStatus === 'found' && foundUser && (
                            <div style={styles.foundUserCard}>
                                <img
                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${foundUser.name}&backgroundColor=b6e3f4`}
                                    alt="found user"
                                    style={styles.foundUserAvatar}
                                />
                                <div>
                                    <p style={styles.foundUserName}>{foundUser.name}</p>
                                    <p style={styles.foundUserAlias}>@{foundUser.alias}</p>
                                </div>
                                <button
                                    style={{
                                        ...styles.sendRequestBtn,
                                        opacity: isSendingRequest ? 0.6 : 1,
                                        cursor: isSendingRequest ? 'not-allowed' : 'pointer'
                                    }}
                                    onClick={handleSendRequest}
                                    disabled={isSendingRequest}
                                >
                                    {isSendingRequest ? 'Enviando...' : 'Enviar Solicitud'}
                                </button>
                            </div>
                        )}

                        {searchStatus === 'not_found' && (
                            <p style={styles.searchStatusText}>Usuario no encontrado. Revisa el alias e intentalo de nuevo.</p>
                        )}
                        {searchStatus === 'error' && (
                            <p style={styles.searchStatusTextError}>Hubo un error. Intentalo mas tarde.</p>
                        )}
                        {searchStatus === 'request_sent' && (
                            <p style={styles.searchStatusTextSuccess}>Solicitud enviada! Esperando respuesta.</p>
                        )}
                    </div>
                </div>
            )}

            {/* Avatar Modal */}
            {
                showAvatarModal && (
                    <div style={styles.modalOverlay}>
                        <div style={styles.modal}>
                            <div style={styles.modalHeader}>
                                <h3 style={styles.modalTitle}>Cambiar Avatar</h3>
                                <button onClick={() => setShowAvatarModal(false)} style={styles.closeBtn}>
                                    <X size={20} color={Colors.text} />
                                </button>
                            </div>

                            <div style={styles.avatarPreviewSection}>
                                <img
                                    src={tempAvatar || userInfo.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userInfo.nombre}`}
                                    alt="Preview"
                                    style={styles.avatarLarge}
                                />
                            </div>

                            <div style={styles.avatarOptions}>
                                <p style={styles.optionLabel}>Subir Foto</p>
                                <label style={styles.uploadBtn}>
                                    <ImageIcon size={20} />
                                    <span>Seleccionar Imagen</span>
                                    <input type="file" accept="image/*" hidden onChange={handleFileUpload} />
                                </label>

                <p style={styles.optionLabel}>O Elegir Avatar</p>
                                <div style={styles.avatarGrid}>
                                    {['Felix', 'Aneka', 'Zoe', 'Marc', 'Leo', 'Sky', 'River', 'Ash'].map(seed => (
                                        <div
                                            key={seed}
                                            style={styles.avatarOption}
                                            onClick={() => handleAvatarSelect(seed)}
                                        >
                                            <img
                                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4`}
                                                alt={seed}
                                                style={{ width: '100%', height: '100%' }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button style={styles.saveBtn} onClick={saveAvatar}>
                                Guardar Avatar
                            </button>
                        </div>
                    </div>
                )
            }

            {showRoutineCopyModal && linkedPartner && (
                <RoutineCopyModal
                    partnerId={linkedPartner.id}
                    partnerName={linkedPartner.nombre}
                    partnerAlias={linkedPartner.alias}
                    onClose={() => setShowRoutineCopyModal(false)}
                    isInitialSetup={false}
                />
            )}
        </div >
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
    copyRoutineBtn: {
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        border: `1px solid ${Colors.primary}40`,
        background: `${Colors.primary}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
    },
    syncRoutineBtn: {
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        border: `1px solid ${Colors.success}40`,
        background: `${Colors.success}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
    },
    unlinkPartnerBtn: {
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        border: `1px solid ${Colors.error}40`,
        background: `${Colors.error}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
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
    aiOptionGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginTop: '20px',
    },
    aiOptionBtn: {
        padding: '16px',
        borderRadius: '16px',
        textAlign: 'left',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        transition: 'all 0.2s ease',
    },
    aiOptionName: {
        fontSize: '15px',
        fontWeight: 700,
        color: Colors.text,
    },
    aiOptionDesc: {
        fontSize: '12px',
        color: Colors.textTertiary,
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
    },
    sectionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
    },
    editToggleBtn: {
        background: 'none',
        border: 'none',
        fontSize: '14px',
        fontWeight: 700,
        cursor: 'pointer',
    },
    infoCard: {
        marginBottom: '24px',
        padding: '20px',
    },
    viewGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
    },
    viewItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    viewLabel: {
        fontSize: '10px',
        fontWeight: 800,
        color: Colors.textTertiary,
        letterSpacing: '1px',
    },
    viewValue: {
        fontSize: '16px',
        fontWeight: 700,
        color: Colors.text,
    },
    editForm: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    grid2: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
    },
    editLabel: {
        fontSize: '12px',
        fontWeight: 700,
        color: Colors.textSecondary,
        marginBottom: '4px',
    },
    editInput: {
        width: '100%',
        padding: '12px',
        background: Colors.background,
        border: `1px solid ${Colors.border}`,
        borderRadius: '12px',
        color: Colors.text,
        fontSize: '15px',
        outline: 'none',
    },
    editSelect: {
        width: '100%',
        padding: '12px',
        background: Colors.background,
        border: `1px solid ${Colors.border}`,
        borderRadius: '12px',
        color: Colors.text,
        fontSize: '15px',
        outline: 'none',
    },
    editTextarea: {
        width: '100%',
        padding: '12px',
        background: Colors.background,
        border: `1px solid ${Colors.border}`,
        borderRadius: '12px',
        color: Colors.text,
        fontSize: '15px',
        outline: 'none',
        minHeight: '80px',
        resize: 'none',
    },
    saveBtn: {
        width: '100%',
        padding: '16px',
        background: Colors.primary,
        border: 'none',
        borderRadius: '12px',
        color: '#000',
        fontSize: '16px',
        fontWeight: 800,
        cursor: 'pointer',
        marginTop: '8px',
    },
    deleteHistoryBtn: {
        background: 'none',
        border: 'none',
        padding: '8px',
        cursor: 'pointer',
        opacity: 0.7,
        transition: 'opacity 0.2s',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        width: '100%',
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
    },
    modalInput: {
        width: '100%',
        padding: '12px',
        background: Colors.background,
        border: `1px solid ${Colors.border}`,
        borderRadius: '12px',
        color: Colors.text,
        fontSize: '15px',
        outline: 'none',
        marginBottom: '16px',
    },
    avatarPreviewSection: {
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '24px',
    },
    avatarLarge: {
        width: '120px',
        height: '120px',
        borderRadius: '60px',
        border: `4px solid ${Colors.primary}`,
        objectFit: 'cover',
    },
    avatarOptions: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
        marginBottom: '24px',
    },
    optionLabel: {
        fontSize: '12px',
        fontWeight: 700,
        color: Colors.textSecondary,
        margin: 0,
    },
    uploadBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '16px',
        background: Colors.surface,
        border: `1px dashed ${Colors.primary}`,
        borderRadius: '16px',
        cursor: 'pointer',
        color: Colors.primary,
        fontWeight: 600,
        fontSize: '14px',
    },
    avatarGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
    },
    avatarOption: {
        aspectRatio: '1',
        borderRadius: '12px',
        overflow: 'hidden',
        cursor: 'pointer',
        border: `1px solid ${Colors.border}`,
    },
    partnerSearchContainer: {
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
    },
    searchBtn: {
        padding: '12px 16px',
        background: Colors.primary,
        border: 'none',
        borderRadius: '12px',
        color: '#000',
        fontWeight: 700,
        cursor: 'pointer',
    },
    foundUserCard: {
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        gap: '12px',
        background: Colors.background,
        padding: '12px',
        borderRadius: '16px',
        textAlign: 'left',
    },
    foundUserAvatar: {
        width: '48px',
        height: '48px',
        borderRadius: '24px',
    },
    foundUserName: {
        margin: 0,
        fontWeight: 700,
        color: Colors.text,
    },
    foundUserAlias: {
        margin: 0,
        fontSize: '12px',
        color: Colors.textSecondary,
    },
    sendRequestBtn: {
        padding: '10px 14px',
        background: Colors.success,
        border: 'none',
        borderRadius: '10px',
        color: '#fff',
        fontWeight: 600,
        cursor: 'pointer',
    },
    searchStatusText: {
        marginTop: '16px',
        color: Colors.textSecondary,
        fontSize: '13px',
    },
    searchStatusTextError: {
        marginTop: '16px',
        color: Colors.error,
        fontSize: '13px',
        fontWeight: 600,
    },
    searchStatusTextSuccess: {
        marginTop: '16px',
        color: Colors.success,
        fontSize: '13px',
        fontWeight: 600,
    }
};

export default ProfilePage;



