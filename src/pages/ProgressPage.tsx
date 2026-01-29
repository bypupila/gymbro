// =====================================================
// GymBro PWA - Progress Page (Enhanced with Stats)
// =====================================================

import { Card } from '@/components/Card';
import { useUserStore } from '@/stores/userStore';
import Colors from '@/styles/colors';
import { Calendar, Camera, Flame, TrendingUp, Clock, Dumbbell, Weight, BarChart3, Trophy, Activity } from 'lucide-react';
import React, { useMemo } from 'react';

export const ProgressPage: React.FC = () => {
    const { perfil } = useUserStore();
    const hasPartner = !!perfil.pareja;
    const history = perfil.historial || [];
    const extraActivities = perfil.actividadesExtras || [];

    // Unified dates of activity (workouts + extras)
    const activeDates = useMemo(() => {
        const dates = new Set<string>();
        history.forEach(h => dates.add(new Date(h.fecha).toDateString()));
        extraActivities.forEach(e => dates.add(new Date(e.fecha).toDateString()));

        return Array.from(dates)
            .map(d => new Date(d))
            .sort((a, b) => b.getTime() - a.getTime()); // Descending
    }, [history, extraActivities]);

    // Calculate Streak (consecutive days with any activity)
    const calculateStreak = () => {
        if (activeDates.length === 0) return 0;

        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if the most recent activity was today or yesterday to keep streak alive
        const lastActivity = activeDates[0];
        lastActivity.setHours(0, 0, 0, 0);

        const diffToLast = (today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
        if (diffToLast > 1) return 0; // Streak broken if gap > 1 day

        streak = 1;
        for (let i = 0; i < activeDates.length - 1; i++) {
            const curr = activeDates[i];
            const next = activeDates[i + 1];
            const diffDays = (curr.getTime() - next.getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays === 1) streak++;
            else break;
        }
        return streak;
    };

    // Calculate Yearly Total (Any activity count)
    const currentYear = new Date().getFullYear();
    const yearlyTotal = activeDates.filter(d => d.getFullYear() === currentYear).length;

    // Monthly Calendar Data
    const now = new Date();
    const monthName = now.toLocaleDateString('es-ES', { month: 'long' });
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
    const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    // Calculate Compliance (days active vs planned days)
    const calculateCompliance = () => {
        const plannedDays = perfil.horario.dias.filter(d => d.entrena).length;
        if (plannedDays === 0) return 100;

        const startOfWeek = new Date();
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);

        const activeDaysThisWeek = activeDates.filter(d => d >= startOfWeek).length;
        const percent = Math.round((activeDaysThisWeek / plannedDays) * 100);
        return Math.min(percent, 100);
    };

    // Advanced Stats Calculations
    const advancedStats = useMemo(() => {
        if (history.length === 0) {
            return {
                avgDuration: 0,
                totalVolume: 0,
                avgWeightPerSession: 0,
                totalSets: 0,
                totalReps: 0,
                heaviestLift: 0,
                mostTrained: 'N/A',
                weeklyAvg: 0,
            };
        }

        // Average duration
        const totalDuration = history.reduce((acc, h) => acc + (h.duracionMinutos || 0), 0);
        const avgDuration = Math.round(totalDuration / history.length);

        // Total volume, sets, reps
        let totalVolume = 0;
        let totalSets = 0;
        let totalReps = 0;
        let heaviestLift = 0;
        const exerciseCount: Record<string, number> = {};

        history.forEach(session => {
            session.ejercicios?.forEach(ex => {
                exerciseCount[ex.nombre] = (exerciseCount[ex.nombre] || 0) + 1;
                ex.sets?.forEach(set => {
                    totalSets++;
                    totalReps += set.reps || 0;
                    const volume = (set.peso || 0) * (set.reps || 0);
                    totalVolume += volume;
                    if ((set.peso || 0) > heaviestLift) {
                        heaviestLift = set.peso || 0;
                    }
                });
            });
        });

        const avgWeightPerSession = history.length > 0 ? Math.round(totalVolume / history.length) : 0;

        // Most trained exercise
        const mostTrained = Object.entries(exerciseCount)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

        // Weekly average (last 4 weeks)
        const fourWeeksAgo = new Date();
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
        const sessionsLast4Weeks = history.filter(h => new Date(h.fecha) >= fourWeeksAgo).length;
        const weeklyAvg = Math.round((sessionsLast4Weeks / 4) * 10) / 10;

        return {
            avgDuration,
            totalVolume,
            avgWeightPerSession,
            totalSets,
            totalReps,
            heaviestLift,
            mostTrained,
            weeklyAvg,
        };
    }, [history]);

    const workoutDaysInMonth = new Set(
        activeDates
            .filter(d => d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear())
            .map(d => d.getDate())
    );

    const mainStats = [
        { icon: Flame, label: 'Racha', value: calculateStreak().toString(), unit: 'd', color: Colors.warning },
        { icon: TrendingUp, label: 'Cumplimiento', value: calculateCompliance().toString(), unit: '%', color: Colors.primary },
        { icon: Calendar, label: 'Sesiones', value: history.length.toString(), unit: '', color: Colors.info }, // Keep "Sesiones" as just workouts? Or combined? Let's keep it as workouts for now but add extra count below
    ];

    const detailedStats = [
        { icon: Clock, label: 'Duración Promedio', value: advancedStats.avgDuration, unit: 'min', color: Colors.accent },
        { icon: Weight, label: 'Volumen Total', value: Math.round(advancedStats.totalVolume / 1000), unit: 'ton', color: Colors.primary },
        { icon: BarChart3, label: 'Promedio Sesión', value: advancedStats.avgWeightPerSession, unit: 'kg', color: Colors.info },
        { icon: Trophy, label: 'Max Levantado', value: advancedStats.heaviestLift, unit: 'kg', color: Colors.warning },
    ];

    const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

    const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        d.setHours(0, 0, 0, 0);
        const hasWorkout = activeDates.some(ad => {
            ad.setHours(0, 0, 0, 0);
            return ad.getTime() === d.getTime();
        });
        return { label: weekDays[(d.getDay() + 6) % 7], active: hasWorkout };
    });

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerText}>
                    <h1 style={styles.title}>
                        {hasPartner ? 'Nuestra Sinergia' : 'Mi Progreso'}
                    </h1>
                    <div style={styles.avatarsRow}>
                        <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${perfil.usuario.nombre || 'User'}`}
                            alt="Avatar"
                            style={styles.avatar}
                        />
                        {hasPartner && (
                            <>
                                <span style={styles.heartEmoji}>❤️</span>
                                <img
                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${perfil.pareja?.nombre}`}
                                    alt="Partner"
                                    style={styles.avatar}
                                />
                            </>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => alert('Próximamente: Análisis visual con IA')}
                    style={styles.cameraBtn}
                >
                    <Camera size={24} color={Colors.primary} />
                </button>
            </div>

            {/* Main Stats Grid */}
            <div style={styles.statsGrid}>
                {mainStats.map((stat, i) => (
                    <Card key={i} style={styles.statCard}>
                        <stat.icon size={24} color={stat.color} />
                        <span style={styles.statValue}>{stat.value}{stat.unit}</span>
                        <span style={styles.statLabel}>{stat.label}</span>
                    </Card>
                ))}
            </div>

            {/* Detailed Training Stats */}
            <h3 style={styles.sectionTitle}>📊 Estadísticas de Entrenamiento</h3>
            <div style={styles.detailedStatsGrid}>
                {detailedStats.map((stat, i) => (
                    <Card key={i} style={styles.detailedStatCard}>
                        <div style={styles.detailedStatIcon}>
                            <stat.icon size={20} color={stat.color} />
                        </div>
                        <div style={styles.detailedStatInfo}>
                            <span style={styles.detailedStatValue}>{stat.value} <small style={styles.detailedStatUnit}>{stat.unit}</small></span>
                            <span style={styles.detailedStatLabel}>{stat.label}</span>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Extra Activities Stats */}
            {perfil.actividadesExtras && perfil.actividadesExtras.length > 0 && (
                <>
                    <h3 style={styles.sectionTitle}>🏃 Actividades Extras</h3>
                    <div style={styles.detailedStatsGrid}>
                        <Card style={styles.detailedStatCard}>
                            <div style={styles.detailedStatIcon}>
                                <Activity size={20} color={Colors.primary} />
                            </div>
                            <div style={styles.detailedStatInfo}>
                                <span style={styles.detailedStatValue}>{perfil.actividadesExtras.length}</span>
                                <span style={styles.detailedStatLabel}>Sesiones Extras</span>
                            </div>
                        </Card>
                        <Card style={styles.detailedStatCard}>
                            <div style={styles.detailedStatIcon}>
                                <Flame size={20} color={Colors.warning} />
                            </div>
                            <div style={styles.detailedStatInfo}>
                                <span style={styles.detailedStatValue}>
                                    {perfil.actividadesExtras.reduce((acc, curr) => acc + (curr.analisisIA?.calorias || 0), 0)}
                                    <small style={styles.detailedStatUnit}> kcal</small>
                                </span>
                                <span style={styles.detailedStatLabel}>Calorías Extras</span>
                            </div>
                        </Card>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '32px' }}>
                        {perfil.actividadesExtras.slice(0, 3).map((extra) => (
                            <Card key={extra.id} style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '12px',
                                    background: `${Colors.primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Activity size={20} color={Colors.primary} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: Colors.text }}>
                                        {extra.analisisIA?.tipoDeporte || 'Actividad Varia'}
                                    </div>
                                    <div style={{ fontSize: '12px', color: Colors.textSecondary }}>
                                        {new Date(extra.fecha).toLocaleDateString()} • {extra.analisisIA?.duracionMinutos} min
                                    </div>
                                </div>
                                {extra.analisisIA?.calorias && (
                                    <div style={{ fontSize: '14px', fontWeight: 800, color: Colors.warning }}>
                                        {extra.analisisIA.calorias} kcal
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                </>
            )}

            {/* Summary Cards */}
            <div style={styles.summaryRow}>
                <Card style={styles.summaryCard}>
                    <Dumbbell size={20} color={Colors.primary} />
                    <div style={styles.summaryInfo}>
                        <span style={styles.summaryValue}>{advancedStats.totalSets}</span>
                        <span style={styles.summaryLabel}>Series Totales</span>
                    </div>
                </Card>
                <Card style={styles.summaryCard}>
                    <BarChart3 size={20} color={Colors.accent} />
                    <div style={styles.summaryInfo}>
                        <span style={styles.summaryValue}>{advancedStats.totalReps}</span>
                        <span style={styles.summaryLabel}>Reps Totales</span>
                    </div>
                </Card>
            </div>

            {/* Weekly Average */}
            <Card style={styles.weeklyAvgCard}>
                <div style={styles.weeklyAvgContent}>
                    <span style={styles.weeklyAvgLabel}>Promedio Semanal</span>
                    <span style={styles.weeklyAvgValue}>{advancedStats.weeklyAvg}</span>
                    <span style={styles.weeklyAvgUnit}>entrenamientos/semana</span>
                </div>
                <div style={styles.weeklyAvgIcon}>
                    <TrendingUp size={32} color={Colors.primary} />
                </div>
            </Card>

            {/* Most Trained */}
            {advancedStats.mostTrained !== 'N/A' && (
                <Card style={styles.mostTrainedCard}>
                    <Trophy size={24} color={Colors.warning} />
                    <div style={styles.mostTrainedInfo}>
                        <span style={styles.mostTrainedLabel}>Ejercicio Más Realizado</span>
                        <span style={styles.mostTrainedValue}>{advancedStats.mostTrained}</span>
                    </div>
                </Card>
            )}

            {/* Weekly Activity */}
            <h3 style={styles.sectionTitle}>Constancia Semanal</h3>
            <Card style={styles.weeklyCard}>
                <div style={styles.weekGrid}>
                    {last7Days.map((day, i) => (
                        <div key={i} style={styles.dayColumn}>
                            <div style={{
                                ...styles.dayBar,
                                height: day.active ? '100%' : '20%',
                                background: day.active ? Colors.gradientPrimary : Colors.surface,
                                boxShadow: day.active ? `0 4px 12px ${Colors.primary}40` : 'none',
                            }} />
                            <span style={{
                                ...styles.dayLabel,
                                color: day.active ? Colors.primary : Colors.textSecondary,
                                fontWeight: day.active ? 800 : 500
                            }}>{day.label}</span>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Monthly Calendar */}
            <h3 style={styles.sectionTitle}>Vista Mensual - {monthName.toUpperCase()}</h3>
            <Card style={styles.calendarCard}>
                <div style={styles.calendarGrid}>
                    {weekDays.map(d => <span key={d} style={styles.calHeader}>{d}</span>)}
                    {[...Array(startOffset)].map((_, i) => <div key={`off-${i}`} />)}
                    {[...Array(daysInMonth)].map((_, i) => {
                        const dayNum = i + 1;
                        const isWorkout = workoutDaysInMonth.has(dayNum);
                        const isToday = dayNum === now.getDate();
                        return (
                            <div
                                key={dayNum}
                                style={{
                                    ...styles.calDay,
                                    background: isWorkout ? Colors.primary : 'transparent',
                                    color: isWorkout ? '#000' : (isToday ? Colors.primary : Colors.text),
                                    border: isToday ? `1px solid ${Colors.primary}` : 'none',
                                    fontWeight: (isWorkout || isToday) ? 800 : 400
                                }}
                            >
                                {dayNum}
                            </div>
                        );
                    })}
                </div>
            </Card>

            {/* Yearly Stat */}
            <div style={styles.yearlyBox}>
                <div style={styles.yearlyContent}>
                    <h4 style={styles.yearlyTitle}>Resumen del Año {currentYear}</h4>
                    <p style={styles.yearlySub}>Has completado un total de:</p>
                    <div style={styles.yearlyMain}>
                        <span style={styles.yearlyValue}>{yearlyTotal}</span>
                        <span style={styles.yearlyUnit}>entrenamientos</span>
                    </div>
                </div>
                <div style={styles.yearlyIcon}>🏆</div>
            </div>

            {/* Progress Photos */}
            <h3 style={styles.sectionTitle}>Fotos de Progreso</h3>
            <div style={styles.photosEmpty}>
                <Camera size={48} color={Colors.textTertiary} />
                <p style={styles.emptyText}>Sin fotos aún</p>
                <p style={styles.emptySubtext}>
                    Toma tu primera foto para trackear tu transformación
                </p>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        padding: '20px',
        paddingTop: 'calc(20px + env(safe-area-inset-top, 0px))',
        paddingBottom: '100px',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '24px',
    },
    headerText: {},
    title: {
        fontSize: '24px',
        fontWeight: 900,
        color: Colors.text,
        margin: '0 0 12px 0',
    },
    avatarsRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    avatar: {
        width: '40px',
        height: '40px',
        borderRadius: '20px',
        border: `2px solid ${Colors.primary}`,
    },
    heartEmoji: {
        fontSize: '16px',
    },
    cameraBtn: {
        width: '48px',
        height: '48px',
        borderRadius: '16px',
        background: `${Colors.primary}20`,
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        marginBottom: '32px',
    },
    statCard: {
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
    },
    statValue: {
        fontSize: '24px',
        fontWeight: 900,
        color: Colors.text,
    },
    statLabel: {
        fontSize: '11px',
        fontWeight: 700,
        color: Colors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    sectionTitle: {
        fontSize: '16px',
        fontWeight: 800,
        color: Colors.text,
        margin: '0 0 16px 0',
    },
    detailedStatsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
        marginBottom: '16px',
    },
    detailedStatCard: {
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    detailedStatIcon: {
        width: '40px',
        height: '40px',
        borderRadius: '12px',
        background: Colors.surfaceLight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    detailedStatInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
    },
    detailedStatValue: {
        fontSize: '18px',
        fontWeight: 900,
        color: Colors.text,
    },
    detailedStatUnit: {
        fontSize: '12px',
        fontWeight: 600,
        color: Colors.textSecondary,
    },
    detailedStatLabel: {
        fontSize: '11px',
        fontWeight: 600,
        color: Colors.textTertiary,
    },
    summaryRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
        marginBottom: '16px',
    },
    summaryCard: {
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    summaryInfo: {
        display: 'flex',
        flexDirection: 'column',
    },
    summaryValue: {
        fontSize: '20px',
        fontWeight: 900,
        color: Colors.text,
    },
    summaryLabel: {
        fontSize: '11px',
        fontWeight: 600,
        color: Colors.textTertiary,
    },
    weeklyAvgCard: {
        padding: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        background: Colors.surface,
        borderRadius: '20px',
        border: `1px solid ${Colors.border}`,
    },
    weeklyAvgContent: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    weeklyAvgLabel: {
        fontSize: '12px',
        fontWeight: 700,
        color: Colors.textSecondary,
    },
    weeklyAvgValue: {
        fontSize: '36px',
        fontWeight: 900,
        color: Colors.primary,
    },
    weeklyAvgUnit: {
        fontSize: '12px',
        fontWeight: 600,
        color: Colors.textTertiary,
    },
    weeklyAvgIcon: {
        width: '60px',
        height: '60px',
        borderRadius: '16px',
        background: `${Colors.primary}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    mostTrainedCard: {
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '32px',
        background: Colors.surface,
        borderRadius: '20px',
        border: `1px solid ${Colors.border}`,
    },
    mostTrainedInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
    },
    mostTrainedLabel: {
        fontSize: '11px',
        fontWeight: 700,
        color: Colors.textSecondary,
    },
    mostTrainedValue: {
        fontSize: '16px',
        fontWeight: 800,
        color: Colors.text,
    },
    weeklyCard: {
        padding: '24px',
        marginBottom: '32px',
    },
    weekGrid: {
        display: 'flex',
        justifyContent: 'space-between',
        height: '120px',
        marginBottom: '16px',
    },
    dayColumn: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flex: 1,
        gap: '8px',
    },
    dayBar: {
        width: '24px',
        borderRadius: '12px',
        transition: 'height 0.3s ease',
    },
    dayLabel: {
        fontSize: '12px',
        fontWeight: 600,
        color: Colors.textSecondary,
    },
    photosEmpty: {
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
    calendarCard: {
        padding: '20px',
        marginBottom: '32px',
    },
    calendarGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '8px',
        textAlign: 'center',
    },
    calHeader: {
        fontSize: '11px',
        fontWeight: 800,
        color: Colors.textTertiary,
        marginBottom: '8px',
    },
    calDay: {
        aspectRatio: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '13px',
        borderRadius: '50%',
    },
    yearlyBox: {
        background: Colors.surface,
        borderRadius: '24px',
        padding: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '40px',
        border: `1px solid ${Colors.border}`,
    },
    yearlyContent: {
        flex: 1,
    },
    yearlyTitle: {
        fontSize: '16px',
        fontWeight: 800,
        color: Colors.text,
        margin: '0 0 4px 0',
    },
    yearlySub: {
        fontSize: '12px',
        color: Colors.textSecondary,
        margin: '0 0 12px 0',
    },
    yearlyMain: {
        display: 'flex',
        alignItems: 'baseline',
        gap: '8px',
    },
    yearlyValue: {
        fontSize: '32px',
        fontWeight: 900,
        color: Colors.primary,
    },
    yearlyUnit: {
        fontSize: '14px',
        fontWeight: 600,
        color: Colors.textSecondary,
    },
    yearlyIcon: {
        fontSize: '40px',
    }
};

export default ProgressPage;
