// =====================================================
// GymBro PWA - Train Page (Explore)
// =====================================================

import { Card } from '@/components/Card';
import { useUserStore } from '@/stores/userStore';
import Colors from '@/styles/colors';
import { Dumbbell, History, Play, Zap, Calendar, ChevronRight } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActiveWorkout } from '@/components/ActiveWorkout';
import { MoodCheckin } from '@/components/MoodCheckin';
import { MoodLog } from '@/stores/userStore';
import { toast } from 'react-hot-toast';

export const TrainPage: React.FC = () => {
    const navigate = useNavigate();
    const { perfil, getEntrenamientoHoy, activeSession, startSession } = useUserStore();
    const entrenamientoHoy = getEntrenamientoHoy();
    const [showMoodCheckin, setShowMoodCheckin] = useState(false);

    const hoyEjercicios = useMemo(() => {
        if (!perfil.rutina) return [];
        return perfil.rutina.ejercicios.filter(ex =>
            !ex.dia || ex.dia.toLowerCase().includes(entrenamientoHoy.dia?.toLowerCase() || '')
        );
    }, [perfil.rutina, entrenamientoHoy.dia]);

    const handleStartWorkout = () => {
        if (!perfil.rutina) {
            toast.error('Primero debes crear una rutina en el Inicio.');
            navigate('/');
            return;
        }
        setShowMoodCheckin(true);
    };

    const handleMoodComplete = (moodData: MoodLog) => {
        if (!perfil.rutina) return;
        startSession(entrenamientoHoy.dia || 'Hoy', hoyEjercicios, perfil.rutina.nombre, moodData);
        setShowMoodCheckin(false);
    };

    if (activeSession) {
        return (
            <ActiveWorkout
                onFinish={() => { }}
                onCancel={() => { }}
            />
        );
    }

    const quickActions = [
        { icon: Zap, label: 'Entrenamiento Rápido', desc: '15 min HIIT', color: Colors.warning },
        { icon: Dumbbell, label: 'Rutina Completa', desc: '45-60 min', color: Colors.primary },
    ];

    return (
        <div style={styles.container}>
            {showMoodCheckin && (
                <MoodCheckin
                    type="pre"
                    onComplete={handleMoodComplete}
                    onCancel={() => setShowMoodCheckin(false)}
                />
            )}
            <h1 style={styles.title}>Entrenar</h1>
            <p style={styles.subtitle}>
                {entrenamientoHoy.entrena
                    ? `Hoy toca ${entrenamientoHoy.grupoMuscular}`
                    : 'Día de descanso programado'}
            </p>

            {/* Main CTA */}
            <div
                onClick={handleStartWorkout}
                style={{
                    ...styles.mainCard,
                    background: entrenamientoHoy.entrena ? Colors.gradientPrimary : Colors.gradientAccent,
                }}
            >
                <div style={styles.mainContent}>
                    <div style={styles.mainBadge}>
                        {entrenamientoHoy.entrena ? 'RECOMENDADO HOY' : 'DESCANSO ACTIVO'}
                    </div>
                    <h2 style={styles.mainTitle}>
                        {perfil.rutina ? perfil.rutina.nombre : (entrenamientoHoy.entrena ? entrenamientoHoy.grupoMuscular : 'Estiramientos')}
                    </h2>
                    <p style={styles.mainDesc}>
                        {perfil.rutina
                            ? `${perfil.rutina.ejercicios.length} ejercicios • ~60 min`
                            : (entrenamientoHoy.entrena ? 'Crear Rutina Primero' : 'Recuperación • 15 min')}
                    </p>
                </div>
                <div style={styles.playBtn}>
                    <Play size={32} color="#FFF" fill="#FFF" />
                </div>
            </div>

            {/* Quick Actions */}
            <h3 style={styles.sectionTitle}>Acciones Rápidas</h3>
            <div style={styles.actionsGrid}>
                {quickActions.map((action, i) => (
                    <Card
                        key={i}
                        onClick={() => toast('Próximamente', { icon: '⏳' })}
                        style={styles.actionCard}
                    >
                        <div style={{ ...styles.actionIcon, background: `${action.color}20` }}>
                            <action.icon size={24} color={action.color} />
                        </div>
                        <h4 style={styles.actionLabel}>{action.label}</h4>
                        <p style={styles.actionDesc}>{action.desc}</p>
                    </Card>
                ))}
            </div>

            {/* Recent Workouts History */}
            <h3 style={styles.sectionTitle}>
                <History size={18} /> Historial Reciente
            </h3>

            {perfil.historial && perfil.historial.length > 0 ? (
                <div style={styles.historyList}>
                    {perfil.historial.map((log) => (
                        <Card key={log.id} style={styles.historyCard}>
                            <div style={styles.historyIcon}>
                                <Calendar size={20} color={Colors.textSecondary} />
                            </div>
                            <div style={styles.historyInfo}>
                                <h4 style={styles.historyTitle}>{log.nombre}</h4>
                                <p style={styles.historyMeta}>
                                    {new Date(log.fecha).toLocaleDateString()} • {log.duracionMinutos} min
                                </p>
                            </div>
                            <div style={styles.historyArrow}>
                                <ChevronRight size={20} color={Colors.textTertiary} />
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div style={styles.emptyState}>
                    <Dumbbell size={48} color={Colors.textTertiary} />
                    <p style={styles.emptyText}>Aún no tienes entrenamientos</p>
                    <p style={styles.emptySubtext}>Completa tu primera sesión para ver tu historial</p>
                </div>
            )}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        padding: '20px',
        paddingTop: 'calc(20px + env(safe-area-inset-top, 0px))',
        paddingBottom: '100px', // Space for tab bar
    },
    title: {
        fontSize: '28px',
        fontWeight: 900,
        color: Colors.text,
        margin: '0 0 4px 0',
    },
    subtitle: {
        fontSize: '14px',
        color: Colors.textSecondary,
        margin: '0 0 24px 0',
    },
    mainCard: {
        borderRadius: '28px',
        padding: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer',
        marginBottom: '32px',
    },
    mainContent: {
        flex: 1,
    },
    mainBadge: {
        display: 'inline-block',
        background: 'rgba(0,0,0,0.2)',
        padding: '6px 12px',
        borderRadius: '10px',
        fontSize: '10px',
        fontWeight: 800,
        color: '#FFF',
        letterSpacing: '1px',
        marginBottom: '12px',
    },
    mainTitle: {
        fontSize: '28px',
        fontWeight: 900,
        color: '#000',
        margin: '0 0 8px 0',
        lineHeight: 1.1,
    },
    mainDesc: {
        fontSize: '14px',
        fontWeight: 600,
        color: 'rgba(0,0,0,0.7)',
        margin: 0,
    },
    playBtn: {
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    },
    sectionTitle: {
        fontSize: '16px',
        fontWeight: 800,
        color: Colors.text,
        margin: '0 0 16px 0',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    actionsGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginBottom: '32px',
    },
    actionCard: {
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
    },
    actionIcon: {
        width: '48px',
        height: '48px',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '12px',
    },
    actionLabel: {
        fontSize: '14px',
        fontWeight: 700,
        color: Colors.text,
        margin: '0 0 4px 0',
    },
    actionDesc: {
        fontSize: '12px',
        color: Colors.textSecondary,
        margin: 0,
    },
    historyList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    historyCard: {
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    },
    historyIcon: {
        width: '40px',
        height: '40px',
        borderRadius: '12px',
        background: Colors.surfaceLight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    historyInfo: {
        flex: 1,
    },
    historyTitle: {
        fontSize: '15px',
        fontWeight: 700,
        color: Colors.text,
        margin: '0 0 4px 0',
    },
    historyMeta: {
        fontSize: '12px',
        color: Colors.textSecondary,
        margin: 0,
    },
    historyArrow: {
        opacity: 0.5,
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 20px',
        background: Colors.surface,
        borderRadius: '24px',
        textAlign: 'center',
    },
    emptyText: {
        fontSize: '16px',
        fontWeight: 700,
        color: Colors.text,
        margin: '16px 0 4px 0',
    },
    emptySubtext: {
        fontSize: '13px',
        color: Colors.textSecondary,
        margin: 0,
    },
};

export default TrainPage;
