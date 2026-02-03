// =====================================================
// GymBro PWA - Progress Page (Enhanced with Stats)
// =====================================================

import { Card } from '@/components/Card';
import { useUserStore, EntrenamientoRealizado, ExtraActivity } from '@/stores/userStore';
import Colors from '@/styles/colors';
import { Calendar, Camera, Flame, TrendingUp, Clock, Dumbbell, Weight, BarChart3, Trophy, Activity, Trash2, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { calculateGlobalStats } from '@/utils/statsUtils';

export const ProgressPage: React.FC = () => {
    const { perfil, removeExtraActivity } = useUserStore();
    const hasPartner = !!perfil.pareja;
    const history = useMemo(() => perfil.historial || [], [perfil.historial]);
    const [showAllExtras, setShowAllExtras] = useState(false);

    // Global Stats Calculation
    const stats = useMemo(() => calculateGlobalStats(perfil), [perfil]);
    const { unifiedHistory, totalSessions, totalMinutes, totalCalories, streak, consistency } = stats;

    const currentYear = new Date().getFullYear();
    const yearlyTotal = unifiedHistory.filter(h => h.date.getFullYear() === currentYear).length;

    // Monthly Calendar Data
    const now = new Date();
    const monthName = now.toLocaleDateString('es-ES', { month: 'long' });
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
    const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    // Advanced Stats Calculations (Gym Specific)
    const gymStats = useMemo(() => {
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

        const totalDuration = history.reduce((acc, h) => acc + (h.duracionMinutos || 0), 0);
        const avgDuration = Math.round(totalDuration / history.length);

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
        const mostTrained = Object.entries(exerciseCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

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

    const moodStats = useMemo(() => {
        // Prefer energy fields; fallback to legacy mood fields if energy isn't present
        const sessionsWithEnergy = history.filter(h =>
            (h.energyPre ?? h.moodPre) !== undefined && (h.energyPost ?? h.moodPost) !== undefined
        );
        if (sessionsWithEnergy.length === 0) return null;

        const avgPre = sessionsWithEnergy.reduce((acc, h) => acc + (h.energyPre ?? h.moodPre ?? 0), 0) / sessionsWithEnergy.length;
        const avgPost = sessionsWithEnergy.reduce((acc, h) => acc + (h.energyPost ?? h.moodPost ?? 0), 0) / sessionsWithEnergy.length;
        const improvement = avgPost - avgPre;

        return {
            preEnergy: avgPre.toFixed(1),
            postEnergy: avgPost.toFixed(1),
            improvement: improvement.toFixed(1),
            totalsessions: sessionsWithEnergy.length
        };
    }, [history]);

    const workoutDaysInMonth = new Set(
        unifiedHistory
            .filter(h => h.date.getMonth() === now.getMonth() && h.date.getFullYear() === now.getFullYear())
            .map(h => h.date.getDate())
    );

    const mainStats = [
        { icon: Flame, label: 'Racha', value: streak.toString(), unit: 'd', color: Colors.warning },
        { icon: TrendingUp, label: 'Constancia', value: consistency.toString(), unit: '%', color: Colors.primary },
        { icon: Calendar, label: 'Total Sesiones', value: totalSessions.toString(), unit: '', color: Colors.info },
    ];

    const detailedStats = [
        { icon: Clock, label: 'Minutos Totales', value: totalMinutes, unit: 'min', color: Colors.accent },
        { icon: Weight, label: 'Volumen Gym', value: Math.round(gymStats.totalVolume / 1000), unit: 'ton', color: Colors.primary },
        { icon: BarChart3, label: 'Promedio SesiÛn', value: gymStats.avgWeightPerSession, unit: 'kg', color: Colors.info },
        { icon: Zap, label: 'CalorÌas (Est.)', value: totalCalories, unit: 'kcal', color: Colors.warning },
    ];

    const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        d.setHours(0, 0, 0, 0);
        const hasActivity = unifiedHistory.some(h => {
            const hDate = new Date(h.date);
            hDate.setHours(0, 0, 0, 0);
            return hDate.getTime() === d.getTime();
        });
        return { label: weekDays[(d.getDay() + 6) % 7], active: hasActivity };
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
                                <span style={styles.heartEmoji}>‚ù§Ô∏è</span>
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
                    onClick={() => toast('PrÛximamente: An·lisis visual con IA', { icon: 'ü§ñ' })}
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
            <h3 style={styles.sectionTitle}>üìä EstadÌsticas Globales</h3>
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
                    <h3 style={styles.sectionTitle}>üèÉ Actividades Extras</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                        {(showAllExtras ? perfil.actividadesExtras : perfil.actividadesExtras.slice(0, 3))
                            .filter(extra => extra && extra.analisisIA) // Ensure extra and analysis exist
                            .map((extra) => (
                                <Card key={extra.id} style={{
                                    padding: '16px',
                                    border: `1px solid ${Colors.border}40`,
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}>
                                    {/* Header Row */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            <div style={{
                                                width: '44px', height: '44px', borderRadius: '12px',
                                                background: `${Colors.primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                <Activity size={22} color={Colors.primary} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '15px', fontWeight: 800, color: Colors.text }}>
                                                    {extra.analisisIA?.tipoDeporte || 'Actividad Varia'}
                                                </div>
                                                <div style={{ fontSize: '12px', color: Colors.textSecondary }}>
                                                    {new Date(extra.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                                                </div>
                                            </div>
                                        </div>

                                        {extra.analisisIA?.intensidad && (
                                            <div style={{
                                                padding: '4px 8px', borderRadius: '8px',
                                                background: extra.analisisIA.intensidad === 'alta' ? `${Colors.error}20` : extra.analisisIA.intensidad === 'media' ? `${Colors.warning}20` : `${Colors.success}20`,
                                                border: `1px solid ${extra.analisisIA.intensidad === 'alta' ? Colors.error : extra.analisisIA.intensidad === 'media' ? Colors.warning : Colors.success}`,
                                            }}>
                                                <span style={{
                                                    fontSize: '10px', fontWeight: 800, textTransform: 'uppercase',
                                                    color: extra.analisisIA.intensidad === 'alta' ? Colors.error : extra.analisisIA.intensidad === 'media' ? Colors.warning : Colors.success
                                                }}>
                                                    {extra.analisisIA.intensidad}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Stats Row */}
                                    <div style={{
                                        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px',
                                        background: Colors.background, padding: '12px', borderRadius: '12px', marginBottom: '12px'
                                    }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '16px', fontWeight: 800, color: Colors.text }}>{extra.analisisIA?.duracionMinutos || 0}<small>m</small></div>
                                            <div style={{ fontSize: '10px', color: Colors.textTertiary, fontWeight: 700 }}>DURACI”N</div>
                                        </div>
                                        <div style={{ textAlign: 'center', borderLeft: `1px solid ${Colors.border}`, borderRight: `1px solid ${Colors.border}` }}>
                                            <div style={{ fontSize: '16px', fontWeight: 800, color: Colors.text }}>{extra.analisisIA?.calorias || 0}</div>
                                            <div style={{ fontSize: '10px', color: Colors.textTertiary, fontWeight: 700 }}>KCAL</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '16px', fontWeight: 800, color: Colors.text }}>{extra.analisisIA?.distanciaKm || '--'}<small>km</small></div>
                                            <div style={{ fontSize: '10px', color: Colors.textTertiary, fontWeight: 700 }}>DISTANCIA</div>
                                        </div>
                                    </div>

                                    {/* Notes/Description */}
                                    {extra.analisisIA?.notas && (
                                        <div style={{ fontSize: '13px', color: Colors.textSecondary, fontStyle: 'italic', marginBottom: '8px', padding: '0 4px' }}>
                                            &quot;{extra.analisisIA.notas}&quot;
                                        </div>                                    )}

                                    {/* Delete Action */}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                                        <button
                                            onClick={() => {
                                                toast((t) => (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                        <span style={{ fontSize: '14px', fontWeight: 600 }}>øEliminar esta actividad?</span>
                                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                            <button
                                                                onClick={() => toast.dismiss(t.id)}
                                                                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px' }}
                                                            >
                                                                Cancelar
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    removeExtraActivity(extra.id);
                                                                    toast.dismiss(t.id);
                                                                    toast.success('Actividad eliminada');
                                                                }}
                                                                style={{ background: Colors.error, border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}
                                                            >
                                                                Eliminar
                                                            </button>
                                                        </div>
                                                    </div>
                                                ), { duration: 5000 });
                                            }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: Colors.error,
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                cursor: 'pointer',
                                                opacity: 0.8
                                            }}
                                        >
                                            <Trash2 size={14} /> Eliminar Actividad
                                        </button>
                                    </div>
                                </Card>
                            ))}

                        {perfil.actividadesExtras.length > 3 && (
                            <button
                                onClick={() => setShowAllExtras(!showAllExtras)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: Colors.primary,
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    padding: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px',
                                    cursor: 'pointer',
                                    marginTop: '8px'
                                }}
                            >
                                {showAllExtras ? (
                                    <><ChevronUp size={16} /> Ver menos</>
                                ) : (
                                    <><ChevronDown size={16} /> Ver todas ({perfil.actividadesExtras.length})</>
                                )}
                            </button>
                        )}
                    </div>
                </>
            )}

            {/* Energy Insights */}
            {moodStats && (
                <>
                    <h3 style={styles.sectionTitle}>üß† Bienestar y EnergÌa</h3>
                    <Card style={{ padding: '24px', marginBottom: '32px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
                            <div style={{ width: '100%' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: Colors.textSecondary, marginBottom: '16px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    EnergÌa Promedio (1-5)
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '32px', fontWeight: 900, color: Colors.text }}>{moodStats.preEnergy}</div>
                                        <div style={{ fontSize: '10px', color: Colors.textTertiary, fontWeight: 700, marginTop: '4px' }}>PRE-ENTRENO</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                        <TrendingUp size={24} color={parseFloat(moodStats.improvement) >= 0 ? Colors.success : Colors.error} />
                                        <span style={{ fontSize: '10px', fontWeight: 800, color: parseFloat(moodStats.improvement) >= 0 ? Colors.success : Colors.error }}>
                                            {parseFloat(moodStats.improvement) >= 0 ? '+' : ''}{moodStats.improvement}
                                        </span>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '32px', fontWeight: 900, color: Colors.primary }}>{moodStats.postEnergy}</div>
                                        <div style={{ fontSize: '10px', color: Colors.textTertiary, fontWeight: 700, marginTop: '4px' }}>POST-ENTRENO</div>
                                    </div>
                                </div>
                            </div>

                            <div style={{
                                width: '100%',
                                padding: '16px',
                                background: `${Colors.primary}10`,
                                borderRadius: '16px',
                                border: `1px solid ${Colors.primary}20`,
                                textAlign: 'center',
                                fontSize: '14px',
                                fontWeight: 600,
                                color: Colors.text,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}>
                                <Zap size={18} color={Colors.warning} fill={Colors.warning} />
                                <span>
                                    {parseFloat(moodStats.improvement) > 0
                                        ? `°Genial! Tu energÌa sube un ${Math.abs(Math.round(parseFloat(moodStats.improvement) * 20))}% tras entrenar.`
                                        : `°Buen trabajo! Mantienes tu energÌa a tope durante el entrenamiento.`}
                                </span>
                            </div>
                        </div>
                    </Card>
                </>
            )}

            {/* Summary Cards */}
            <div style={styles.summaryRow}>
                <Card style={styles.summaryCard}>
                    <Dumbbell size={20} color={Colors.primary} />
                    <div style={styles.summaryInfo}>
                        <span style={styles.summaryValue}>{gymStats.totalSets}</span>
                        <span style={styles.summaryLabel}>Series Totales</span>
                    </div>
                </Card>
                <Card style={styles.summaryCard}>
                    <BarChart3 size={20} color={Colors.accent} />
                    <div style={styles.summaryInfo}>
                        <span style={styles.summaryValue}>{gymStats.totalReps}</span>
                        <span style={styles.summaryLabel}>Reps Totales</span>
                    </div>
                </Card>
            </div>

            {/* Weekly Average */}
            <Card style={styles.weeklyAvgCard}>
                <div style={styles.weeklyAvgContent}>
                    <span style={styles.weeklyAvgLabel}>Promedio Semanal</span>
                    <span style={styles.weeklyAvgValue}>{gymStats.weeklyAvg}</span>
                    <span style={styles.weeklyAvgUnit}>entrenamientos/semana</span>
                </div>
                <div style={styles.weeklyAvgIcon}>
                    <TrendingUp size={32} color={Colors.primary} />
                </div>
            </Card>

            {/* Most Trained */}
            {gymStats.mostTrained !== 'N/A' && (
                <Card style={styles.mostTrainedCard}>
                    <Trophy size={24} color={Colors.warning} />
                    <div style={styles.mostTrainedInfo}>
                        <span style={styles.mostTrainedLabel}>Ejercicio M·s Realizado</span>
                        <span style={styles.mostTrainedValue}>{gymStats.mostTrained}</span>
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
                    <h4 style={styles.yearlyTitle}>Resumen del AÒo {currentYear}</h4>
                    <p style={styles.yearlySub}>Has completado un total de:</p>
                    <div style={styles.yearlyMain}>
                        <span style={styles.yearlyValue}>{yearlyTotal}</span>
                        <span style={styles.yearlyUnit}>entrenamientos</span>
                    </div>
                </div>
                <div style={styles.yearlyIcon}>üèÜ</div>
            </div>

            {/* Unified Activity History */}
            <h3 style={styles.sectionTitle}>üìÖ Historial de Actividad</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                {unifiedHistory.length > 0 ? (
                    unifiedHistory.slice(0, 5).map((item, idx) => (
                        <Card key={`${item.type}-${idx}`} style={{ padding: '16px', border: `1px solid ${Colors.border}40` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '10px',
                                        background: item.type === 'gym' ? `${Colors.primary}15` : item.type === 'extra' ? `${Colors.accent}15` : `${Colors.surfaceLight}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        {item.type === 'gym' ? <Dumbbell size={20} color={Colors.primary} /> :
                                            item.type === 'extra' ? <Activity size={20} color={Colors.accent} /> :
                                                <Calendar size={20} color={Colors.textTertiary} />}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '15px', fontWeight: 800, color: Colors.text }}>
                                            {item.type === 'gym' ? (item.data as EntrenamientoRealizado).nombre :
                                                item.type === 'extra' ? (item.data as ExtraActivity).analisisIA?.tipoDeporte : 'DÌa Registrado'}
                                        </div>
                                        <div style={{ fontSize: '12px', color: Colors.textSecondary }}>
                                            {item.date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                                            {item.type === 'gym' && ` ‚Ä¢ ${(item.data as EntrenamientoRealizado).duracionMinutos} min`}
                                            {item.type === 'extra' && ` ‚Ä¢ ${(item.data as ExtraActivity).analisisIA?.duracionMinutos} min`}
                                        </div>
                                    </div>
                                </div>
                                {item.type === 'gym' && (
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '14px', fontWeight: 800, color: Colors.primary }}>
                                            {(item.data as EntrenamientoRealizado).ejercicios.length} <small>ejercicios</small>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))
                ) : (
                    <div style={styles.emptyState}>
                        <Activity size={40} color={Colors.textTertiary} />
                        <p style={{ color: Colors.textSecondary, fontSize: '14px', margin: '8px 0 0 0' }}>A˙n no hay actividad registrada</p>
                    </div>
                )}
            </div>

            {/* Progress Photos */}
            <h3 style={styles.sectionTitle}>Fotos de Progreso</h3>
            <div style={styles.photosEmpty}>
                <Camera size={48} color={Colors.textTertiary} />
                <p style={styles.emptyText}>Sin fotos a˙n</p>
                <p style={styles.emptySubtext}>
                    Toma tu primera foto para trackear tu transformaciÛn
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

