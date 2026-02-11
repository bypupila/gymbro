import React, { useState } from 'react';
import { useUserStore, ExtraActivity } from '@/stores/userStore';
import Colors from '@/styles/colors';
import { Check, X, Dumbbell, Activity, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { calculateGlobalStats } from '@/utils/statsUtils';

export const WeeklyProgressBar: React.FC = () => {
    const perfil = useUserStore((state) => state.perfil);
    const weeklyTracking = perfil.weeklyTracking || {};
    const [showModal, setShowModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [showExtraActivityForm, setShowExtraActivityForm] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    // Manual Entry State
    const [selectedActivityType, setSelectedActivityType] = useState<string>('');
    const [duration, setDuration] = useState<string>('');
    const [distance, setDistance] = useState<string>('');
    const [intensity, setIntensity] = useState<'baja' | 'media' | 'alta'>('media');
    const [videoUrl, setVideoUrl] = useState('');

    // Custom Activity State
    const [isAddingCustom, setIsAddingCustom] = useState(false);
    const [customActivityName, setCustomActivityName] = useState('');

    const addExtraActivity = useUserStore((state) => state.addExtraActivity);
    const removeExtraActivitiesOnDate = useUserStore((state) => state.removeExtraActivitiesOnDate);

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
    const dayNames = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

    const handleDayClick = (dateStr: string) => {
        const trackingStatus = weeklyTracking[dateStr];
        const hasActivity = activeDatesSet.has(dateStr);
        const isMarked = trackingStatus === 'completed' || trackingStatus === 'skipped' || trackingStatus === true;

        if (isMarked || hasActivity) {
            setSelectedDate(dateStr);
            setShowDetailsModal(true);
        } else {
            // If not completed/skipped, show modal to select routine
            setSelectedDate(dateStr);
            setShowModal(true);
        }
    };

    const handleUnmarkDay = async (dateStr: string) => {
        await removeExtraActivitiesOnDate(dateStr);
        // Also clear the tracking status
        const { setDayTracking } = useUserStore.getState();
        setDayTracking(dateStr, null);
        setShowDetailsModal(false);
        setSelectedDate(null);
    };

    const handleRoutineSelection = async (dayName: string) => {
        if (!selectedDate) return;

        if (dayName === 'Actividad Extra') {
            // Show extra activity form instead of marking as complete
            setShowModal(false);
            setShowExtraActivityForm(true);
        } else if (dayName === 'Saltar d?a') {
            const { setDayTracking } = useUserStore.getState();
            setDayTracking(selectedDate, 'skipped');
            setShowModal(false);
            setSelectedDate(null);
            toast.success('D?a marcado como saltado');
        } else {
            const { setDayTracking } = useUserStore.getState();
            setDayTracking(selectedDate, 'completed');
            setShowModal(false);
            setSelectedDate(null);
        }
    };

    const handleAddCustomActivity = async () => {
        if (!customActivityName.trim()) return;

        const newCatalog = [...(perfil.catalogoExtras || []), customActivityName.trim()];
        // Filter unique
        const uniqueCatalog = Array.from(new Set(newCatalog));

        useUserStore.setState((state) => ({
            perfil: {
                ...state.perfil,
                catalogoExtras: uniqueCatalog
            }
        }));

        setSelectedActivityType(customActivityName.trim());
        setCustomActivityName('');
        setIsAddingCustom(false);
    };

    const handleSaveExtraActivity = async () => {
        if (!selectedDate || !selectedActivityType || !duration) return;

        try {
            // Calculate calories estimation (METs approx)
            // Low: 4, Med: 8, High: 12
            const mets = intensity === 'baja' ? 4 : intensity === 'media' ? 8 : 12;
            const weight = perfil.usuario.peso || 70;
            const durationHrs = parseInt(duration) / 60;
            const estimatedCalories = Math.round(mets * weight * durationHrs);

            // Save the extra activity
            const activityToSave: ExtraActivity = {
                id: `extra_${Date.now()}`,
                fecha: selectedDate,
                descripcion: selectedActivityType, // For backward compatibility/display
                analisisIA: {
                    tipoDeporte: selectedActivityType,
                    duracionMinutos: parseInt(duration),
                    distanciaKm: distance ? parseFloat(distance) : undefined,
                    intensidad: intensity,
                    calorias: estimatedCalories,
                    notas: 'Registro manual'
                }
            };

            // Only add videoUrl if it has a value
            if (videoUrl && videoUrl.trim()) {
                activityToSave.videoUrl = videoUrl;
            }

            await addExtraActivity(activityToSave);

            // Reset form
            setShowExtraActivityForm(false);
            setDuration('');
            setDistance('');
            setVideoUrl('');
            setIntensity('media');
            setSelectedActivityType('');
            setSelectedDate(null);
        } catch (error) {
            console.error('Error saving extra activity:', error);
            toast.error('Error al guardar la actividad. Intenta de nuevo.');
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
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
        const targetDay = dayNames[dayIndex];
        return perfil.horario.dias.find(d =>
            d.dia.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") ===
            targetDay.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        );
    };

    const stats = calculateGlobalStats(perfil);
    const activeDatesSet = new Set(stats.unifiedHistory.map(h => formatDate(h.date)));

    const completedDays = weekDays.filter(d => {
        const dateStr = formatDate(d);
        const status = weeklyTracking[dateStr];
        // Skipped days do NOT count as completed
        if (status === 'skipped') return false;
        const isCompleted = status === 'completed' || status === true;
        return activeDatesSet.has(dateStr) || isCompleted;
    }).length;

    const scheduledDays = weekDays.filter((_, i) => getDaySchedule((i + 1) % 7)?.entrena).length;

    const trainingDays = perfil.horario.dias.filter(d => d.entrena);

    const defaultActivities = ['Running', 'Ciclismo', 'Nataci?n', 'F?tbol', 'Yoga', 'Pilates', 'Crossfit', 'Boxeo', 'Trekking', 'Basket', 'Tenis'];
    const currentActivityCatalog = perfil.catalogoExtras?.length ? perfil.catalogoExtras : defaultActivities;

    return (
        <>
            <div style={styles.container}>
                <div style={styles.header}>
                    <div>
                        <h3 style={styles.title}>Progreso Semanal</h3>
                        <p style={styles.subtitle}>
                            {completedDays} de {scheduledDays} actividades completadas
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
                        const trackingStatus = weeklyTracking[dateStr];
                        // IMPORTANT: skipped takes priority over completed
                        const isSkipped = trackingStatus === 'skipped';
                        const isCompleted = !isSkipped && (activeDatesSet.has(dateStr) || trackingStatus === 'completed' || trackingStatus === true);
                        const schedule = getDaySchedule((index + 1) % 7); // Adjust for Monday start
                        const isScheduled = schedule?.entrena;
                        const today = isToday(date);
                        const past = isPast(date);
                        const missedDay = past && isScheduled && !isCompleted && !isSkipped;

                        return (
                            <button
                                key={dateStr}
                                onClick={() => handleDayClick(dateStr)}
                                style={{
                                    ...styles.dayButton,
                                    background: isCompleted
                                        ? `linear-gradient(135deg, ${Colors.success}, ${Colors.success}DD)`
                                        : isSkipped || missedDay
                                            ? `linear-gradient(135deg, ${Colors.error}33, ${Colors.error}15)`
                                            : today
                                                ? `linear-gradient(135deg, ${Colors.primary}, ${Colors.primary}DD)`
                                                : isScheduled
                                                    ? Colors.surface
                                                    : 'transparent',
                                    border: `1px solid ${isCompleted
                                        ? Colors.success
                                        : isSkipped || missedDay
                                            ? Colors.error
                                            : today
                                                ? Colors.primary
                                                : isScheduled
                                                    ? Colors.border
                                                    : 'transparent'
                                        }`,
                                    boxShadow: today ? `0 0 15px ${Colors.primary}40` : 'none',
                                    opacity: isScheduled || isCompleted || isSkipped || missedDay ? 1 : 0.4,
                                }}
                            >
                                <div style={{
                                    ...styles.dayName,
                                    color: (isCompleted || today) ? '#000' : (isSkipped || missedDay ? Colors.error : Colors.textSecondary)
                                }}>
                                    {dayNames[index]}
                                </div>
                                <div style={{
                                    ...styles.dayDate,
                                    color: (isCompleted || today) ? '#000' : (isSkipped || missedDay ? Colors.error : Colors.text)
                                }}>
                                    {date.getDate()}
                                </div>

                                {/* Status Indicator Icon */}
                                <div style={styles.statusIconContainer}>
                                    {isCompleted ? (
                                        <Check size={10} color="#000" strokeWidth={3} />
                                    ) : isSkipped || missedDay ? (
                                        <X size={10} color={Colors.error} strokeWidth={3} />
                                    ) : isScheduled ? (
                                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: today ? '#000' : Colors.textTertiary }} />
                                    ) : null}
                                </div>
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
                                <h3 style={styles.modalTitle}>?Qu? rutina hiciste?</h3>
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
                                <button
                                    onClick={() => handleRoutineSelection('Saltar d?a')}
                                    style={{
                                        ...styles.routineOption,
                                        borderColor: Colors.error,
                                        background: `${Colors.error}15`
                                    }}
                                >
                                    <X size={18} color={Colors.error} />
                                    <div style={styles.routineInfo}>
                                        <span style={styles.routineDay}>Saltar d?a</span>
                                        <span style={styles.routineMuscle}>No pude entrenar hoy</span>
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
                                <h3 style={styles.modalTitle}>Resumen del d?a</h3>
                                <button onClick={() => setShowDetailsModal(false)} style={styles.closeBtn}>
                                    <X size={20} color={Colors.textSecondary} />
                                </button>
                            </div>

                            <div style={styles.detailsContent}>
                                {(() => {
                                    const extraActivity = perfil.actividadesExtras?.find(a => a.fecha.split('T')[0] === selectedDate);
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
                                                            <span style={styles.statLabel}>Duraci?n</span>
                                                        </div>
                                                    )}
                                                    {extraActivity.analisisIA?.distanciaKm && (
                                                        <div style={styles.statBox}>
                                                            <span style={styles.statValue}>{extraActivity.analisisIA.distanciaKm}km</span>
                                                            <span style={styles.statLabel}>Recorrido</span>
                                                        </div>
                                                    )}
                                                    {extraActivity.analisisIA?.calorias && (
                                                        <div style={styles.statBox}>
                                                            <span style={styles.statValue}>{extraActivity.analisisIA.calorias}</span>
                                                            <span style={styles.statLabel}>Kcal</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {extraActivity.analisisIA?.notas && extraActivity.analisisIA.notas !== 'Registro manual' && (
                                                    <p style={styles.activityNotes}>
                                                        &quot;{extraActivity.analisisIA.notas}&quot;
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    }

                                    if (workout) {
                                        return (
                                            <div style={styles.routineDetailContainer}>
                                                <div style={styles.routineSummary}>
                                                    <Dumbbell size={24} color={Colors.success} />
                                                    <div style={{ flex: 1 }}>
                                                        <span style={styles.routineNameText}>{workout.nombre}</span>
                                                        <p style={styles.routineStatsText}>
                                                            {workout.ejercicios.length} ejercicios ? {workout.duracionMinutos} min
                                                        </p>
                                                    </div>
                                                </div>

                                                <div style={styles.exerciseList}>
                                                    {workout.ejercicios.map((ex, exIdx) => (
                                                        <div key={exIdx} style={styles.exerciseItem}>
                                                            <div style={styles.exerciseHeader}>
                                                                <span style={styles.exerciseName}>{ex.nombre}</span>
                                                                <span style={styles.exerciseSetsCount}>{ex.sets.length} series</span>
                                                            </div>
                                                            <div style={styles.setsGrid}>
                                                                {ex.sets.map((set, setIdx) => (
                                                                    <div key={setIdx} style={styles.setMinicard}>
                                                                        <span style={styles.setInfo}>
                                                                            {set.reps} <small>reps</small>
                                                                        </span>
                                                                        <span style={styles.setWeight}>
                                                                            {set.peso} <small>kg</small>
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {workout.moodPost && (
                                                    <div style={styles.moodBadge}>
                                                        <span>Estado post-entreno:</span>
                                                        <span style={styles.moodValue}>
                                                            {workout.moodPost === 1 ? '&#128555;' : workout.moodPost === 2 ? '&#128533;' : workout.moodPost === 3 ? '&#128528;' : workout.moodPost === 4 ? '&#128578;' : '&#128293;'}
                                                        </span>                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }

                                    return (
                                        <div style={styles.noData}>
                                            No hay datos espec?ficos registrados para este d?a.
                                        </div>
                                    );
                                })()}

                                <button
                                    onClick={() => handleUnmarkDay(selectedDate)}
                                    style={styles.unmarkBtn}
                                >
                                    <X size={16} /> Desmarcar d?a
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

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {/* Activity Type Selection */}
                                <div>
                                    <label style={styles.label}>Tipo de Actividad</label>
                                    <div style={styles.activityTypeGrid}>
                                        {currentActivityCatalog.map((type) => (
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
                                        <button
                                            onClick={() => setIsAddingCustom(true)}
                                            style={{
                                                ...styles.activityTypeBtn,
                                                background: Colors.surface,
                                                color: Colors.primary,
                                                borderColor: Colors.border,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>

                                    {isAddingCustom && (
                                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                                            <input
                                                autoFocus
                                                value={customActivityName}
                                                onChange={(e) => setCustomActivityName(e.target.value)}
                                                placeholder="Nombre de actividad..."
                                                style={styles.input}
                                            />
                                            <button onClick={handleAddCustomActivity} style={styles.smallAddBtn}>
                                                Agregar
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Stats Inputs */}
                                <div style={styles.statsInputGrid}>
                                    <div>
                                        <label style={styles.label}>Duraci?n (min)</label>
                                        <input
                                            type="number"
                                            value={duration}
                                            onChange={(e) => setDuration(e.target.value)}
                                            placeholder="45"
                                            style={styles.input}
                                        />
                                    </div>
                                    <div>
                                        <label style={styles.label}>Recorrido (km)</label>
                                        <input
                                            type="number"
                                            value={distance}
                                            onChange={(e) => setDistance(e.target.value)}
                                            placeholder="Opcional"
                                            style={styles.input}
                                        />
                                    </div>
                                </div>

                                {/* Intensity Selection */}
                                <div>
                                    <label style={styles.label}>Esfuerzo Percibido</label>
                                    <div style={styles.intensityGrid}>
                                        {(['baja', 'media', 'alta'] as const).map((level) => (
                                            <button
                                                key={level}
                                                onClick={() => setIntensity(level)}
                                                style={{
                                                    ...styles.intensityBtn,
                                                    background: intensity === level
                                                        ? (level === 'alta' ? Colors.error : level === 'media' ? Colors.warning : Colors.success)
                                                        : Colors.surface,
                                                    color: intensity === level ? '#FFF' : Colors.textSecondary,
                                                    borderColor: intensity === level ? 'transparent' : Colors.border
                                                }}
                                            >
                                                {level.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Video URL */}
                                <div>
                                    <label style={styles.label}>Video URL (opcional)</label>
                                    <input
                                        type="url"
                                        value={videoUrl}
                                        onChange={(e) => setVideoUrl(e.target.value)}
                                        placeholder="https://youtube.com/..."
                                        style={styles.input}
                                    />
                                </div>

                                {/* Save Button */}
                                <button
                                    onClick={handleSaveExtraActivity}
                                    disabled={!selectedActivityType || !duration}
                                    style={{
                                        ...styles.saveBtn,
                                        opacity: (!selectedActivityType || !duration) ? 0.5 : 1
                                    }}
                                >
                                    ?? Guardar Actividad
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
        justifyContent: 'center',
        gap: '2px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        minHeight: '70px',
    },
    statusIconContainer: {
        marginTop: '4px',
        height: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayName: {
        fontSize: '10px',
        fontWeight: 700,
        color: Colors.text,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    dayDate: {
        fontSize: '18px',
        fontWeight: 900,
        color: Colors.text,
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
        maxHeight: '85vh',
        overflowY: 'auto'
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
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '8px',
    },
    activityTypeBtn: {
        padding: '10px 16px',
        borderRadius: '12px',
        border: '1px solid',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap'
    },
    statsInputGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
    },
    intensityGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '8px',
    },
    intensityBtn: {
        padding: '12px',
        borderRadius: '12px',
        border: '1px solid',
        fontSize: '12px',
        fontWeight: 700,
        cursor: 'pointer',
        textAlign: 'center'
    },
    input: {
        width: '100%',
        padding: '12px',
        borderRadius: '12px',
        border: `1px solid ${Colors.border}`,
        background: Colors.background,
        color: Colors.text,
        fontSize: '14px',
        outline: 'none',
        transition: 'border-color 0.2s',
    },
    smallAddBtn: {
        padding: '0 16px',
        background: Colors.primary,
        color: '#000',
        borderRadius: '12px',
        fontWeight: 700,
        border: 'none',
        cursor: 'pointer',
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
    routineSummary: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px',
        background: Colors.background,
        borderRadius: '16px',
        border: `1px solid ${Colors.border}`,
    },
    routineNameText: {
        fontSize: '16px',
        fontWeight: 700,
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
    routineDetailContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    exerciseList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxHeight: '40vh',
        overflowY: 'auto',
        paddingRight: '4px',
    },
    exerciseItem: {
        background: `${Colors.surfaceLight}40`,
        borderRadius: '12px',
        padding: '12px',
        border: `1px solid ${Colors.border}40`,
    },
    exerciseHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
    },
    exerciseName: {
        fontSize: '14px',
        fontWeight: 800,
        color: Colors.text,
    },
    exerciseSetsCount: {
        fontSize: '11px',
        color: Colors.textTertiary,
        background: Colors.surface,
        padding: '2px 8px',
        borderRadius: '8px',
    },
    setsGrid: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
    },
    setMinicard: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: Colors.surface,
        padding: '4px 8px',
        borderRadius: '8px',
        border: `1px solid ${Colors.border}30`,
        minWidth: '45px',
    },
    setInfo: {
        fontSize: '12px',
        fontWeight: 700,
        color: Colors.text,
    },
    setWeight: {
        fontSize: '10px',
        color: Colors.primary,
        fontWeight: 600,
    },
    moodBadge: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        background: `${Colors.primary}10`,
        borderRadius: '12px',
        fontSize: '13px',
        color: Colors.textSecondary,
    },
    moodValue: {
        fontSize: '20px',
    },
};

