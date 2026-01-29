// =====================================================
// GymBro PWA - Home / Dashboard Page
// =====================================================

import { Card } from '@/components/Card';
import { RoutineUpload } from '@/components/RoutineUpload';
import { useUserStore } from '@/stores/userStore';
import Colors from '@/styles/colors';
import { Moon, Play, Plus, FileText, ChevronRight, Activity, Zap } from 'lucide-react'; // kept Activity/Zap for Premium icons if used there
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActiveWorkout } from '@/components/ActiveWorkout';
import { GRUPOS_MUSCULARES, GrupoMuscularEjercicio } from '@/data/exerciseDatabase';
import { SyncStatus } from '@/components/SyncStatus';
import { WeeklyProgressBar } from '@/components/WeeklyProgressBar';

export const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const [showRoutineModal, setShowRoutineModal] = useState(false);
    const { perfil, getEntrenamientoHoy, activeSession, startSession } = useUserStore();
    const entrenamientoHoy = getEntrenamientoHoy();

    const hoyEjercicios = useMemo(() => {
        if (!perfil.rutina) return [];
        return perfil.rutina.ejercicios.filter(ex =>
            !ex.dia || ex.dia.toLowerCase().includes(entrenamientoHoy.dia?.toLowerCase() || '')
        );
    }, [perfil.rutina, entrenamientoHoy.dia]);

    const handleStartWorkout = () => {
        if (!perfil.rutina) return;
        startSession(entrenamientoHoy.dia || 'Hoy', hoyEjercicios, perfil.rutina.nombre);
    };

    const nombreUsuario = perfil.usuario.nombre || 'Daniel';
    const fechaHoyRaw = new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });
    const fechaHoy = fechaHoyRaw.split(' ').map(word =>
        word.length > 2 ? word.charAt(0).toUpperCase() + word.slice(1) : word
    ).join(' ');

    return (
        <div style={styles.container}>
            {activeSession && (
                <ActiveWorkout
                    onFinish={() => { }}
                    onCancel={() => { }}
                />
            )}
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h1 style={styles.greeting}>Hola, {nombreUsuario}</h1>
                        <SyncStatus />
                    </div>
                    <p style={styles.date}>{fechaHoy}</p>
                </div>
                <div
                    style={styles.avatar}
                    onClick={() => navigate('/profile')}
                >
                    <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${nombreUsuario}`}
                        alt="Avatar"
                        style={styles.avatarImg}
                    />
                </div>
            </div>

            {/* Weekly Progress Bar */}
            <WeeklyProgressBar />

            {/* Main Workout Cards List */}
            {!perfil.rutina ? (
                <div
                    style={styles.routinePrompt}
                    onClick={() => setShowRoutineModal(true)}
                >
                    <div style={styles.promptIcon}>
                        <FileText size={24} color={Colors.primary} />
                    </div>
                    <div style={styles.promptContent}>
                        <h3 style={styles.promptTitle}>¿Tienes una rutina?</h3>
                        <p style={styles.promptSub}>Sube una foto y Gemini la analizará por ti.</p>
                    </div>
                    <div style={styles.promptAction}>
                        <Plus size={20} color={Colors.text} />
                    </div>
                </div>
            ) : (
                <div style={styles.daysList}>
                    {perfil.horario.dias.filter(d => d.entrena).map((trainingDay) => {
                        const dayExercises = perfil.rutina?.ejercicios.filter(ex =>
                            !ex.dia || ex.dia.toLowerCase().includes(trainingDay.dia.toLowerCase())
                        ) || [];

                        const isToday = trainingDay.dia.toLowerCase() === entrenamientoHoy.dia?.toLowerCase();

                        return (
                            <div
                                key={trainingDay.dia}
                                onClick={() => startSession(trainingDay.dia, dayExercises, perfil.rutina?.nombre || 'Rutina')}
                                style={{
                                    ...styles.workoutCard,
                                    background: isToday ? Colors.gradientPrimary : Colors.surface,
                                    border: isToday ? 'none' : `1px solid ${Colors.border}`,
                                }}
                            >
                                <div style={styles.cardHeaderRow}>
                                    <div style={styles.cardBadge}>
                                        <span style={{ ...styles.badgeText, color: isToday ? '#FFF' : Colors.primary }}>
                                            {trainingDay.dia.toUpperCase()}
                                        </span>
                                    </div>
                                    <span style={{ ...styles.cardTime, background: isToday ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.05)', color: isToday ? '#000' : Colors.textSecondary }}>
                                        {trainingDay.hora}
                                    </span>
                                </div>

                                <h2 style={{ ...styles.cardTitle, color: isToday ? '#000' : Colors.text, fontSize: '24px' }}>
                                    {trainingDay.grupoMuscular}
                                </h2>

                                <div style={styles.cardFooter}>
                                    <div style={{ ...styles.exercisePreview, background: isToday ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.05)' }}>
                                        <Zap size={16} color={isToday ? '#000' : Colors.textSecondary} />
                                        <span style={{ ...styles.previewText, color: isToday ? '#000' : Colors.textSecondary }}>
                                            {dayExercises.length} Ejercicios
                                        </span>
                                    </div>
                                    <div style={{ ...styles.playButton, background: isToday ? '#000' : Colors.primary }}>
                                        <Play size={20} color={isToday ? '#FFF' : '#000'} fill={isToday ? '#FFF' : '#000'} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Routine Upload Modal */}
            {showRoutineModal && (
                <RoutineUpload
                    onComplete={() => setShowRoutineModal(false)}
                    onCancel={() => setShowRoutineModal(false)}
                />
            )}



            {/* Premium Windows Grid (Pencil Mockup) */}
            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Funciones Premium</h3>
                <div style={styles.premiumGrid}>
                    <button
                        style={styles.premiumCard}
                        onClick={() => navigate('/body-status')}
                    >
                        <div style={{ ...styles.premiumIcon, background: `${Colors.error}15` }}>
                            <Activity size={20} color={Colors.error} />
                        </div>
                        <span style={styles.premiumLabel}>Body Status</span>
                    </button>
                    <button
                        style={styles.premiumCard}
                        onClick={() => navigate('/dual-training')}
                    >
                        <div style={{ ...styles.premiumIcon, background: `${Colors.info}15` }}>
                            <Zap size={20} color={Colors.info} />
                        </div>
                        <span style={styles.premiumLabel}>Dual Training</span>
                    </button>
                    <button
                        style={styles.premiumCard}
                        onClick={() => navigate('/migrator')}
                    >
                        <div style={{ ...styles.premiumIcon, background: `${Colors.accent}15` }}>
                            <FileText size={20} color={Colors.accent} />
                        </div>
                        <span style={styles.premiumLabel}>AI Migrator</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        padding: '20px',
        paddingTop: 'calc(20px + env(safe-area-inset-top, 0px))',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
    },
    greeting: {
        fontSize: '24px',
        fontWeight: 800,
        color: Colors.text,
        margin: 0,
    },
    date: {
        fontSize: '13px',
        color: Colors.textSecondary,
        textTransform: 'capitalize',
        margin: 0,
    },
    avatar: {
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        overflow: 'hidden',
        border: `2px solid ${Colors.surface}`,
        cursor: 'pointer',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    daysList: {
        display: 'flex',
        flexDirection: 'row',
        gap: '12px',
        marginBottom: '24px',
        overflowX: 'auto',
        paddingBottom: '12px',
        scrollbarWidth: 'none',
    },
    workoutCard: {
        flex: '0 0 240px',
        borderRadius: '24px',
        padding: '16px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '160px',
    },
    cardHeaderRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '4px',
    },
    routinePrompt: {
        background: Colors.surface,
        borderRadius: '24px',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '24px',
        cursor: 'pointer',
        border: `1px solid ${Colors.border}`,
        transition: 'transform 0.2s ease, border-color 0.2s ease',
    },
    promptIcon: {
        width: '48px',
        height: '48px',
        borderRadius: '16px',
        background: `${Colors.primary}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    promptContent: {
        flex: 1,
    },
    promptTitle: {
        fontSize: '16px',
        fontWeight: 800,
        color: Colors.text,
        margin: '0 0 2px 0',
    },
    promptSub: {
        fontSize: '12px',
        color: Colors.textSecondary,
        margin: 0,
    },
    promptAction: {
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: Colors.surfaceLight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardBadge: {
        display: 'inline-block',
        background: 'rgba(0,0,0,0.15)',
        padding: '4px 8px',
        borderRadius: '8px',
    },
    badgeText: {
        fontSize: '9px',
        fontWeight: 900,
        letterSpacing: '0.5px',
    },
    cardTime: {
        padding: '4px 8px',
        borderRadius: '8px',
        fontSize: '11px',
        fontWeight: 800,
    },
    cardTitle: {
        fontWeight: 900,
        margin: '12px 0',
        lineHeight: 1.1,
    },
    cardFooter: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    exercisePreview: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '6px 10px',
        borderRadius: '12px',
    },
    previewText: {
        fontSize: '11px',
        fontWeight: 700,
    },
    playButton: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    section: {
        marginBottom: '24px',
    },
    sectionTitle: {
        fontSize: '18px',
        fontWeight: 800,
        color: Colors.text,
        margin: '0 0 16px 0',
    },
    readinessRow: {
        display: 'flex',
        gap: '12px',
    },
    readinessBtn: {
        flex: 1,
        height: '80px',
        borderRadius: '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        border: '1px solid',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
    statsGrid: {
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
    },
    statCard: {
        flex: 1,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    statHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '4px',
    },
    statValue: {
        fontSize: '16px',
        fontWeight: 800,
        color: Colors.text,
    },
    statLabel: {
        fontSize: '10px',
        fontWeight: 700,
        color: Colors.textTertiary,
    },
    powerCard: {
        padding: '24px',
        background: '#111113',
    },
    powerContent: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
    },
    powerText: {
        display: 'flex',
        flexDirection: 'column',
    },
    powerLabel: {
        fontSize: '10px',
        fontWeight: 800,
        color: Colors.textTertiary,
        letterSpacing: '1px',
        marginBottom: '4px',
    },
    powerValue: {
        fontSize: '44px',
        fontWeight: 900,
        color: Colors.text,
    },
    powerStatus: {
        fontSize: '14px',
        fontWeight: 800,
    },
    powerVisual: {
        width: '90px',
        height: '90px',
    },
    powerCircle: {
        width: '90px',
        height: '90px',
        borderRadius: '50%',
        background: '#1E1E22',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
    },
    powerFill: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        opacity: 0.3,
        transition: 'height 0.3s ease',
    },
    aiTip: {
        fontSize: '13px',
        lineHeight: 1.5,
        color: Colors.textSecondary,
        margin: 0,
        paddingTop: '16px',
        borderTop: `1px solid ${Colors.border}`,
    },
    premiumGrid: {
        display: 'flex',
        gap: '12px',
        overflowX: 'auto',
        padding: '4px',
        margin: '0 -4px',
        scrollbarWidth: 'none',
    },
    premiumCard: {
        flex: '0 0 110px',
        background: Colors.surface,
        borderRadius: '20px',
        padding: '16px 12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        border: `1px solid ${Colors.border}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
    premiumIcon: {
        width: '40px',
        height: '40px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    premiumLabel: {
        fontSize: '11px',
        fontWeight: 700,
        color: Colors.text,
        textAlign: 'center',
    },
    routineSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '24px',
    },
    todayExercises: {
        background: Colors.surface,
        borderRadius: '24px',
        padding: '20px',
        border: `1px solid ${Colors.border}`,
    },
    todayHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
    },
    todayTitle: {
        fontSize: '16px',
        fontWeight: 800,
        color: Colors.text,
        margin: 0,
    },
    viewRoutineBtn: {
        fontSize: '12px',
        fontWeight: 700,
        color: Colors.primary,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
    },
    exerciseScroll: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    miniExCard: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        background: Colors.surfaceLight,
        borderRadius: '16px',
        cursor: 'pointer',
    },
    miniExDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
    },
    miniExInfo: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
    },
    miniExName: {
        fontSize: '14px',
        fontWeight: 700,
        color: Colors.text,
    },
    miniExMeta: {
        fontSize: '11px',
        color: Colors.textSecondary,
    },
};

export default HomePage;
