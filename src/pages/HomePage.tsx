// =====================================================
// GymBro PWA - Home / Dashboard Page
// =====================================================

import { Card } from '@/components/Card';
import { RoutineUpload } from '@/components/RoutineUpload';
import { useUserStore } from '@/stores/userStore';
import Colors from '@/styles/colors';
import { Activity, Droplets, Footprints, Heart, Moon, Play, Zap, Plus, FileText, ChevronRight } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActiveWorkout } from '@/components/ActiveWorkout';
import { GRUPOS_MUSCULARES, GrupoMuscularEjercicio } from '@/data/exerciseDatabase';
import { SyncStatus } from '@/components/SyncStatus';

type ReadinessState = 'ready' | 'tired' | 'sore';

export const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const [readiness, setReadiness] = useState<ReadinessState>('ready');
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

    const powerScore = useMemo(() => {
        switch (readiness) {
            case 'ready': return 88;
            case 'tired': return 65;
            case 'sore': return 45;
        }
    }, [readiness]);

    const getPowerLabel = () => {
        if (powerScore! >= 85) return 'PODER MÁXIMO';
        if (powerScore! >= 65) return 'MODERADO';
        return 'RECUPERACIÓN';
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

            {/* Main Workout Card or Routine Prompt */}
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
                <div style={styles.routineSection}>
                    <div
                        onClick={handleStartWorkout}
                        style={{
                            ...styles.workoutCard,
                            background: entrenamientoHoy.entrena ? Colors.gradientPrimary : Colors.gradientAccent,
                        }}
                    >
                        <div style={styles.cardHeaderRow}>
                            <div style={styles.cardBadge}>
                                <span style={styles.badgeText}>
                                    {entrenamientoHoy.entrena ? 'ENTRENAMIENTO' : 'RECUPERACIÓN'}
                                </span>
                            </div>
                            {entrenamientoHoy.entrena && (
                                <span style={styles.cardTime}>{entrenamientoHoy.hora}</span>
                            )}
                        </div>

                        <h2 style={styles.cardTitle}>
                            {entrenamientoHoy.entrena ? (entrenamientoHoy.grupoMuscular || 'Cuerpo Completo') : 'Día de Descanso'}
                        </h2>

                        <div style={styles.cardFooter}>
                            <div style={styles.exercisePreview}>
                                {entrenamientoHoy.entrena ? <Zap size={16} color="#000" /> : <Moon size={16} color="#000" />}
                                <span style={styles.previewText}>
                                    {entrenamientoHoy.entrena
                                        ? `${hoyEjercicios.length} Ejercicios • 60 min`
                                        : 'Recuperación Activa • 15 min'}
                                </span>
                            </div>
                            <div style={styles.playButton}>
                                {entrenamientoHoy.entrena ? <Play size={24} color="#FFF" fill="#FFF" /> : <Activity size={24} color="#FFF" />}
                            </div>
                        </div>
                    </div>

                    {/* Today's Exercises List */}
                    {entrenamientoHoy.entrena && hoyEjercicios.length > 0 && (
                        <div style={styles.todayExercises}>
                            <div style={styles.todayHeader}>
                                <h3 style={styles.todayTitle}>Rutina de Hoy</h3>
                                <button style={styles.viewRoutineBtn} onClick={() => navigate('/routine')}>Ver todo</button>
                            </div>
                            <div style={styles.exerciseScroll}>
                                {hoyEjercicios.map((ex) => (
                                    <div key={ex.id} style={styles.miniExCard} onClick={handleStartWorkout}>
                                        <div style={{ ...styles.miniExDot, background: GRUPOS_MUSCULARES[ex.grupoMuscular as GrupoMuscularEjercicio]?.color || Colors.primary }} />
                                        <div style={styles.miniExInfo}>
                                            <span style={styles.miniExName}>{ex.nombre}</span>
                                            <span style={styles.miniExMeta}>{ex.series}x{ex.repeticiones} {ex.grupoMuscular}</span>
                                        </div>
                                        <ChevronRight size={16} color={Colors.textTertiary} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Routine Upload Modal */}
            {showRoutineModal && (
                <RoutineUpload
                    onComplete={() => setShowRoutineModal(false)}
                    onCancel={() => setShowRoutineModal(false)}
                />
            )}

            {/* Readiness Section */}
            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>¿Cómo te sientes?</h3>
                <div style={styles.readinessRow}>
                    {[
                        { key: 'ready', icon: Zap, label: 'Listo', color: Colors.primary },
                        { key: 'tired', icon: Moon, label: 'Cansado', color: Colors.warning },
                        { key: 'sore', icon: Activity, label: 'Adolorido', color: Colors.error },
                    ].map(({ key, icon: Icon, label, color }) => (
                        <button
                            key={key}
                            onClick={() => setReadiness(key as ReadinessState)}
                            style={{
                                ...styles.readinessBtn,
                                background: readiness === key ? color : Colors.surface,
                                borderColor: readiness === key ? color : Colors.border,
                            }}
                        >
                            <Icon size={20} color={readiness === key ? '#000' : color} />
                            <span style={{
                                color: readiness === key ? '#000' : Colors.textSecondary,
                                fontSize: '12px',
                                fontWeight: 600,
                            }}>
                                {label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Grid */}
            <div style={styles.statsGrid}>
                <Card style={styles.statCard}>
                    <div style={styles.statHeader}>
                        <Heart size={18} color={Colors.error} />
                        <span style={styles.statValue}>72</span>
                    </div>
                    <span style={styles.statLabel}>HRV</span>
                </Card>
                <Card style={styles.statCard}>
                    <div style={styles.statHeader}>
                        <Footprints size={18} color={Colors.primary} />
                        <span style={styles.statValue}>5.2k</span>
                    </div>
                    <span style={styles.statLabel}>Pasos</span>
                </Card>
                <Card style={styles.statCard}>
                    <div style={styles.statHeader}>
                        <Droplets size={18} color={Colors.info} />
                        <span style={styles.statValue}>2.4L</span>
                    </div>
                    <span style={styles.statLabel}>Hidratación</span>
                </Card>
            </div>

            {/* Power Score */}
            <Card style={styles.powerCard}>
                <div style={styles.powerContent}>
                    <div style={styles.powerText}>
                        <span style={styles.powerLabel}>POWER SCORE</span>
                        <span style={styles.powerValue}>{powerScore}%</span>
                        <span style={{
                            ...styles.powerStatus,
                            color: readiness === 'ready' ? Colors.primary : Colors.warning,
                        }}>
                            {getPowerLabel()}
                        </span>
                    </div>
                    <div style={styles.powerVisual}>
                        <div style={styles.powerCircle}>
                            <div
                                style={{
                                    ...styles.powerFill,
                                    height: `${powerScore}%`,
                                    background: readiness === 'ready' ? Colors.primary : Colors.warning,
                                }}
                            />
                            <Zap size={32} color="#FFF" style={{ position: 'relative', zIndex: 2 }} />
                        </div>
                    </div>
                </div>
                <p style={styles.aiTip}>
                    <strong>Sugerencia IA:</strong> Tu cuerpo está listo para entrenar.
                    Hoy prioriza {readiness === 'ready' ? 'intensidad' : 'recuperación activa'}.
                </p>
            </Card>

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
    workoutCard: {
        borderRadius: '32px',
        padding: '24px',
        marginBottom: '24px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
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
        background: 'rgba(0,0,0,0.2)',
        padding: '6px 12px',
        borderRadius: '12px',
        marginBottom: '12px',
    },
    badgeText: {
        color: '#FFF',
        fontSize: '10px',
        fontWeight: 900,
        letterSpacing: '1px',
    },
    cardTime: {
        background: 'rgba(255,255,255,0.4)',
        padding: '4px 10px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 800,
        color: '#000',
    },
    cardTitle: {
        fontSize: '32px',
        fontWeight: 900,
        color: '#000',
        margin: '0 0 20px 0',
    },
    cardFooter: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    exercisePreview: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(0,0,0,0.1)',
        padding: '8px 12px',
        borderRadius: '16px',
    },
    previewText: {
        fontSize: '13px',
        fontWeight: 700,
        color: '#000',
    },
    playButton: {
        width: '54px',
        height: '54px',
        borderRadius: '50%',
        background: '#000',
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
