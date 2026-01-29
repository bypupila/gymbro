import React, { useState } from 'react';
import { useUserStore } from '@/stores/userStore';
import Colors from '@/styles/colors';
import { Check, X, Calendar, Dumbbell, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeExtraActivity } from '@/services/geminiExtraActivityService';

export const WeeklyProgressBar: React.FC = () => {
    const { perfil } = useUserStore();
    const weeklyTracking = perfil.weeklyTracking || {};
    const [showModal, setShowModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [showExtraActivityForm, setShowExtraActivityForm] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [activityDescription, setActivityDescription] = useState('');
    const [activityUrl, setActivityUrl] = useState('');
    const [selectedActivityType, setSelectedActivityType] = useState<string>('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const { addExtraActivity } = useUserStore();

    // Get current week days (Monday as start)
    const getWeekDays = () => {
        const today = new Date();
        const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ...
        const monday = new Date(today);
        monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));

        return Array.from({ length: 7 }, (_, i) => {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            return date;
        });
    };

    const weekDays = getWeekDays();
    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    const handleDayClick = (dateStr: string) => {
        const isCompleted = weeklyTracking[dateStr];

        if (isCompleted) {
            setSelectedDate(dateStr);
            setShowDetailsModal(true);
        } else {
            // If not completed, show modal to select routine
            setSelectedDate(dateStr);
            setShowModal(true);
        }
    };

    const handleUnmarkDay = (dateStr: string) => {
        const newTracking = { ...weeklyTracking };
        delete newTracking[dateStr];

        // Also remove from extra activities if it exists
        const newExtraActivities = perfil.actividadesExtras.filter(a => a.fecha !== dateStr);

        useUserStore.setState((state) => ({
            perfil: {
                ...state.perfil,
                weeklyTracking: newTracking,
                actividadesExtras: newExtraActivities
            }
        }));

        setShowDetailsModal(false);
        setSelectedDate(null);
    };

    const handleRoutineSelection = async (dayName: string) => {
        if (!selectedDate) return;

        if (dayName === 'Actividad Extra') {
            // Show extra activity form instead of marking as complete
            setShowModal(false);
            setShowExtraActivityForm(true);
        } else {
            const newTracking = { ...weeklyTracking };
            newTracking[selectedDate] = true;

            useUserStore.setState((state) => ({
                perfil: { ...state.perfil, weeklyTracking: newTracking }
            }));

            setShowModal(false);
            setSelectedDate(null);
        }
    };

    const handleSaveExtraActivity = async () => {
        if (!selectedDate || (!activityDescription.trim() && !selectedActivityType)) return;

        setIsAnalyzing(true);
        try {
            // Use AI to analyze the description
            const analisis = await analyzeExtraActivity(
                activityDescription || selectedActivityType,
                activityUrl || undefined
            );

            // Save the extra activity
            const activityToSave: any = {
                id: `extra_${Date.now()}`,
                fecha: selectedDate,
                descripcion: activityDescription || selectedActivityType,
                analisisIA: analisis
            };

            // Only add videoUrl if it has a value
            if (activityUrl && activityUrl.trim()) {
                activityToSave.videoUrl = activityUrl;
            }

            await addExtraActivity(activityToSave);

            // Reset form
            setShowExtraActivityForm(false);
            setActivityDescription('');
            setActivityUrl('');
            setSelectedActivityType('');
            setSelectedDate(null);
        } catch (error) {
            console.error('Error saving extra activity:', error);
            alert('Error al guardar la actividad. Intenta de nuevo.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const isPast = (date: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const compareDate = new Date(date);
        compareDate.setHours(0, 0, 0, 0);
        return compareDate < today;
    };

    const getDaySchedule = (dayIndex: number) => {
        const dayName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dayIndex];
        return perfil.horario.dias.find(d => d.dia === dayName);
    };

    const completedDays = weekDays.filter(d => weeklyTracking[formatDate(d)]).length;
    const scheduledDays = weekDays.filter((_, i) => getDaySchedule(i)?.entrena).length;

    const trainingDays = perfil.horario.dias.filter(d => d.entrena);

    return (
        <>
            <div style={styles.container}>
                <div style={styles.header}>
                    <div>
                        <h3 style={styles.title}>Progreso Semanal</h3>
                        <p style={styles.subtitle}>
                            {completedDays} de {scheduledDays} días completados
                        </p>
                    </div>
                    <div style={styles.progressCircle}>
                        <span style={styles.progressText}>
                            {scheduledDays > 0 ? Math.round((completedDays / scheduledDays) * 100) : 0}%
                        </span>
                    </div>
                </div>

                <div style={styles.daysContainer}>
                    {weekDays.map((date, index) => {
                        const dateStr = formatDate(date);
                        const isCompleted = weeklyTracking[dateStr];
                        const schedule = getDaySchedule((index + 1) % 7); // Adjust for Monday start
                        const isScheduled = schedule?.entrena;
                        const today = isToday(date);
                        const past = isPast(date);
                        const missedDay = past && isScheduled && !isCompleted;

                        // Check if it was an extra activity
                        const extraActivity = perfil.actividadesExtras?.find(a => a.fecha === dateStr);

                        return (
                            <button
                                key={dateStr}
                                onClick={() => handleDayClick(dateStr)}
                                style={{
                                    ...styles.dayButton,
                                    background: isCompleted
                                        ? Colors.success
                                        : today
                                            ? Colors.primary
                                            : isScheduled
                                                ? Colors.surface
                                                : 'transparent',
                                    border: `2px solid ${isCompleted
                                        ? Colors.success
                                        : today
                                            ? Colors.primary
                                            : isScheduled
                                                ? Colors.border
                                                : Colors.border
                                        }`,
                                    opacity: isScheduled || isCompleted ? 1 : 0.5,
                                }}
                            >
                                <div style={styles.dayName}>{dayNames[index]}</div>
                                <div style={styles.dayDate}>{date.getDate()}</div>
                                {isCompleted && (
                                    <div style={styles.checkIcon}>
                                        {extraActivity ? (
                                            <Activity size={12} color="#FFF" />
                                        ) : (
                                            <Check size={12} color="#FFF" />
                                        )}
                                    </div>
                                )}
                                {missedDay && (
                                    <div style={styles.missedIcon}>
                                        <X size={14} color={Colors.error} />
                                    </div>
                                )}
                                {!isScheduled && !isCompleted && !missedDay && (
                                    <div style={styles.skipIcon}>
                                        <X size={10} color={Colors.textTertiary} />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Modal for selecting routine */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={styles.modalOverlay}
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={styles.modal}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={styles.modalHeader}>
                                <h3 style={styles.modalTitle}>¿Qué rutina hiciste?</h3>
                                <button onClick={() => setShowModal(false)} style={styles.closeBtn}>
                                    <X size={20} color={Colors.textSecondary} />
                                </button>
                            </div>
                            <div style={styles.routineList}>
                                {trainingDays.map((day) => (
                                    <button
                                        key={day.dia}
                                        onClick={() => handleRoutineSelection(day.dia)}
                                        style={styles.routineOption}
                                    >
                                        <Dumbbell size={18} color={Colors.primary} />
                                        <div style={styles.routineInfo}>
                                            <span style={styles.routineDay}>{day.dia}</span>
                                            <span style={styles.routineMuscle}>{day.grupoMuscular}</span>
                                        </div>
                                    </button>
                                ))}
                                <button
                                    onClick={() => handleRoutineSelection('Actividad Extra')}
                                    style={{
                                        ...styles.routineOption,
                                        borderColor: Colors.accent,
                                        background: `${Colors.accent}15`
                                    }}
                                >
                                    <Activity size={18} color={Colors.accent} />
                                    <div style={styles.routineInfo}>
                                        <span style={styles.routineDay}>Actividad Extra</span>
                                        <span style={styles.routineMuscle}>Cardio, deporte, etc.</span>
                                    </div>
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal for Day Details */}
            <AnimatePresence>
                {showDetailsModal && selectedDate && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={styles.modalOverlay}
                        onClick={() => setShowDetailsModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={styles.modal}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={styles.modalHeader}>
                                <h3 style={styles.modalTitle}>Resumen del día</h3>
                                <button onClick={() => setShowDetailsModal(false)} style={styles.closeBtn}>
                                    <X size={20} color={Colors.textSecondary} />
                                </button>
                            </div>

                            <div style={styles.detailsContent}>
                                {(() => {
                                    const extraActivity = perfil.actividadesExtras?.find(a => a.fecha === selectedDate);
                                    const workout = perfil.historial?.find(h => h.fecha.startsWith(selectedDate));

                                    if (extraActivity) {
                                        return (
                                            <div style={styles.activityCard}>
                                                <div style={styles.activityHeader}>
                                                    <Activity size={24} color={Colors.primary} />
                                                    <span style={styles.activityType}>
                                                        {extraActivity.analisisIA?.tipoDeporte || extraActivity.descripcion}
                                                    </span>
                                                </div>

                                                <div style={styles.statsGrid}>
                                                    {extraActivity.analisisIA?.duracionMinutos && (
                                                        <div style={styles.statBox}>
                                                            <span style={styles.statValue}>
                                                                {extraActivity.analisisIA.duracionMinutos >= 60
                                                                    ? `${(extraActivity.analisisIA.duracionMinutos / 60).toFixed(1)}h`
                                                                    : `${extraActivity.analisisIA.duracionMinutos}m`}
                                                            </span>
                                                            <span style={styles.statLabel}>Duración</span>
                                                        </div>
                                                    )}
                                                    {extraActivity.analisisIA?.distanciaKm && (
                                                        <div style={styles.statBox}>
                                                            <span style={styles.statValue}>{extraActivity.analisisIA.distanciaKm}km</span>
                                                            <span style={styles.statLabel}>Distancia</span>
                                                        </div>
                                                    )}
                                                    {extraActivity.analisisIA?.calorias && (
                                                        <div style={styles.statBox}>
                                                            <span style={styles.statValue}>{extraActivity.analisisIA.calorias}</span>
                                                            <span style={styles.statLabel}>Kcal</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {extraActivity.analisisIA?.notas && (
                                                    <p style={styles.activityNotes}>
                                                        "{extraActivity.analisisIA.notas}"
                                                    </p>
                                                )}

                                                <p style={styles.originalDesc}>
                                                    <strong>Original:</strong> {extraActivity.descripcion}
                                                </p>
                                            </div>
                                        );
                                    }

                                    if (workout) {
                                        return (
                                            <div style={styles.routineSummary}>
                                                <Dumbbell size={24} color={Colors.success} />
                                                <div style={{ flex: 1 }}>
                                                    <span style={styles.routineNameText}>{workout.nombre}</span>
                                                    <p style={styles.routineStatsText}>
                                                        {workout.ejercicios.length} ejercicios • {workout.duracionMinutos} min
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div style={styles.noData}>
                                            No hay datos específicos registrados para este día.
                                        </div>
                                    );
                                })()}

                                <button
                                    onClick={() => handleUnmarkDay(selectedDate)}
                                    style={styles.unmarkBtn}
                                >
                                    <X size={16} /> Desmarcar día
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Extra Activity Form Modal */}
            <AnimatePresence>
                {showExtraActivityForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={styles.modalOverlay}
                        onClick={() => setShowExtraActivityForm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={styles.modal}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={styles.modalHeader}>
                                <h3 style={styles.modalTitle}>Registrar Actividad Extra</h3>
                                <button onClick={() => setShowExtraActivityForm(false)} style={styles.closeBtn}>
                                    <X size={20} color={Colors.textSecondary} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Activity Type Selection */}
                                <div>
                                    <label style={styles.label}>Tipo de Actividad</label>
                                    <div style={styles.activityTypeGrid}>
                                        {(perfil.catalogoExtras || ['Running', 'Ciclismo', 'Natación', 'Fútbol', 'Yoga']).map((type) => (
                                            <button
                                                key={type}
                                                onClick={() => setSelectedActivityType(type)}
                                                style={{
                                                    ...styles.activityTypeBtn,
                                                    background: selectedActivityType === type ? Colors.primary : Colors.surface,
                                                    color: selectedActivityType === type ? '#000' : Colors.text,
                                                    borderColor: selectedActivityType === type ? Colors.primary : Colors.border
                                                }}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label style={styles.label}>Descripción (opcional)</label>
                                    <textarea
                                        value={activityDescription}
                                        onChange={(e) => setActivityDescription(e.target.value)}
                                        placeholder="Ej: Corrí 5km en 25 minutos por el parque..."
                                        style={styles.textarea}
                                        rows={3}
                                    />
                                    <p style={styles.hint}>💡 La IA extraerá automáticamente duración, distancia y calorías</p>
                                </div>

                                {/* Video URL */}
                                <div>
                                    <label style={styles.label}>Video URL (opcional)</label>
                                    <input
                                        type="url"
                                        value={activityUrl}
                                        onChange={(e) => setActivityUrl(e.target.value)}
                                        placeholder="https://youtube.com/..."
                                        style={styles.input}
                                    />
                                </div>

                                {/* Save Button */}
                                <button
                                    onClick={handleSaveExtraActivity}
                                    disabled={isAnalyzing || (!activityDescription.trim() && !selectedActivityType)}
                                    style={{
                                        ...styles.saveBtn,
                                        opacity: (isAnalyzing || (!activityDescription.trim() && !selectedActivityType)) ? 0.5 : 1
                                    }}
                                >
                                    {isAnalyzing ? '⏳ Analizando...' : '💾 Guardar Actividad'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        background: Colors.surface,
        borderRadius: '20px',
        padding: '20px',
        border: `1px solid ${Colors.border}`,
        marginBottom: '24px',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
    },
    title: {
        fontSize: '18px',
        fontWeight: 800,
        color: Colors.text,
        margin: 0,
    },
    subtitle: {
        fontSize: '13px',
        color: Colors.textSecondary,
        margin: '2px 0 0 0',
    },
    progressCircle: {
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${Colors.primary}, ${Colors.accent})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
    },
    progressText: {
        fontSize: '14px',
        fontWeight: 900,
        color: '#000',
    },
    daysContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '8px',
    },
    dayButton: {
        position: 'relative',
        padding: '12px 4px',
        borderRadius: '12px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        transition: 'all 0.2s',
    },
    dayName: {
        fontSize: '11px',
        fontWeight: 700,
        color: Colors.text,
        textTransform: 'uppercase',
    },
    dayDate: {
        fontSize: '16px',
        fontWeight: 800,
        color: Colors.text,
    },
    checkIcon: {
        position: 'absolute',
        top: '4px',
        right: '4px',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '50%',
        width: '16px',
        height: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    skipIcon: {
        position: 'absolute',
        top: '4px',
        right: '4px',
    },
    missedIcon: {
        position: 'absolute',
        top: '4px',
        right: '4px',
        background: `${Colors.error}20`,
        borderRadius: '50%',
        width: '20px',
        height: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
        padding: '24px',
        width: '100%',
        maxWidth: '400px',
        border: `1px solid ${Colors.border}`,
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
    },
    modalTitle: {
        fontSize: '18px',
        fontWeight: 800,
        color: Colors.text,
        margin: 0,
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
    },
    routineList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    routineOption: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px',
        background: Colors.background,
        border: `1px solid ${Colors.border}`,
        borderRadius: '16px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    routineInfo: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '2px',
    },
    routineDay: {
        fontSize: '16px',
        fontWeight: 800,
        color: Colors.text,
    },
    routineMuscle: {
        fontSize: '13px',
        color: Colors.textSecondary,
    },
    label: {
        fontSize: '13px',
        fontWeight: 700,
        color: Colors.text,
        marginBottom: '8px',
        display: 'block',
    },
    activityTypeGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '8px',
        marginTop: '8px',
    },
    activityTypeBtn: {
        padding: '12px',
        borderRadius: '12px',
        border: '2px solid',
        fontSize: '14px',
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    textarea: {
        width: '100%',
        padding: '12px',
        borderRadius: '12px',
        border: `1px solid ${Colors.border}`,
        background: Colors.background,
        color: Colors.text,
        fontSize: '14px',
        fontFamily: 'inherit',
        resize: 'vertical',
        marginTop: '8px',
    },
    input: {
        width: '100%',
        padding: '12px',
        borderRadius: '12px',
        border: `1px solid ${Colors.border}`,
        background: Colors.background,
        color: Colors.text,
        fontSize: '14px',
        marginTop: '8px',
    },
    hint: {
        fontSize: '12px',
        color: Colors.textSecondary,
        margin: '8px 0 0 0',
        fontStyle: 'italic',
    },
    saveBtn: {
        width: '100%',
        padding: '16px',
        borderRadius: '16px',
        background: Colors.primary,
        color: '#000',
        border: 'none',
        fontSize: '16px',
        fontWeight: 800,
        cursor: 'pointer',
        marginTop: '8px',
    },
    detailsContent: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        padding: '10px 0',
    },
    activityCard: {
        background: `${Colors.primary}10`,
        borderRadius: '20px',
        padding: '20px',
        border: `1px solid ${Colors.primary}30`,
    },
    activityHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
    },
    activityType: {
        fontSize: '20px',
        fontWeight: 800,
        color: Colors.text,
        textTransform: 'capitalize',
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        marginBottom: '16px',
    },
    statBox: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: Colors.surface,
        padding: '12px',
        borderRadius: '16px',
        border: `1px solid ${Colors.border}`,
    },
    statValue: {
        fontSize: '16px',
        fontWeight: 800,
        color: Colors.primary,
    },
    statLabel: {
        fontSize: '11px',
        color: Colors.textSecondary,
        marginTop: '2px',
    },
    activityNotes: {
        fontSize: '14px',
        color: Colors.text,
        fontStyle: 'italic',
        lineHeight: '1.4',
        margin: '0 0 12px 0',
    },
    originalDesc: {
        fontSize: '12px',
        color: Colors.textSecondary,
        margin: 0,
    },
    routineSummary: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        background: `${Colors.success}10`,
        padding: '20px',
        borderRadius: '20px',
        border: `1px solid ${Colors.success}30`,
    },
    routineNameText: {
        fontSize: '18px',
        fontWeight: 800,
        color: Colors.text,
        display: 'block',
    },
    routineStatsText: {
        fontSize: '14px',
        color: Colors.textSecondary,
        margin: '4px 0 0 0',
    },
    noData: {
        textAlign: 'center',
        color: Colors.textSecondary,
        padding: '20px',
    },
    unmarkBtn: {
        width: '100%',
        padding: '14px',
        borderRadius: '12px',
        background: 'transparent',
        border: `1px solid ${Colors.border}`,
        color: Colors.textSecondary,
        fontSize: '14px',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        cursor: 'pointer',
    },
};
