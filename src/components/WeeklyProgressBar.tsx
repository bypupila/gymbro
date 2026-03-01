import React, { useEffect, useMemo, useState } from 'react';
import { useUserStore, EntrenamientoRealizado, ExtraActivity, ExerciseWorkoutDetail } from '@/stores/userStore';
import Colors from '@/styles/colors';
import { Check, X, Dumbbell, Activity, Plus, Save, Edit3, Trash2, Shuffle, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { EJERCICIOS_DATABASE, GRUPOS_MUSCULARES } from '@/data/exerciseDatabase';

interface WeeklyProgressBarProps {
    initialOpenDate?: string;
    autoEditFirstWorkout?: boolean;
}

export const WeeklyProgressBar: React.FC<WeeklyProgressBarProps> = ({
    initialOpenDate,
    autoEditFirstWorkout = false
}) => {
    const perfil = useUserStore((state) => state.perfil);
    const weeklyTracking = useMemo(() => perfil.weeklyTracking || {}, [perfil.weeklyTracking]);
    const [showModal, setShowModal] = useState(false);
    const [showMonthModal, setShowMonthModal] = useState(false);
    const [monthCursor, setMonthCursor] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [showExtraActivityForm, setShowExtraActivityForm] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
    const [workoutDraft, setWorkoutDraft] = useState<EntrenamientoRealizado | null>(null);
    const [isSavingWorkout, setIsSavingWorkout] = useState(false);
    const [deletingWorkoutId, setDeletingWorkoutId] = useState<string | null>(null);
    const [weekOffset, setWeekOffset] = useState(0);

    // Manual Entry State
    const [selectedActivityType, setSelectedActivityType] = useState<string>('');
    const [duration, setDuration] = useState<string>('');
    const [distance, setDistance] = useState<string>('');
    const [intensity, setIntensity] = useState<'baja' | 'media' | 'alta'>('media');
    const [videoUrl, setVideoUrl] = useState('');
    const [extraActivitySource, setExtraActivitySource] = useState<'outside_gym' | 'catalog_gym' | ''>('');
    const [extraCatalogSearch, setExtraCatalogSearch] = useState('');
    const [selectedCatalogExerciseId, setSelectedCatalogExerciseId] = useState<string>('');

    // Custom Activity State
    const [isAddingCustom, setIsAddingCustom] = useState(false);
    const [customActivityName, setCustomActivityName] = useState('');

    const addExtraActivity = useUserStore((state) => state.addExtraActivity);
    const removeExtraActivitiesOnDate = useUserStore((state) => state.removeExtraActivitiesOnDate);
    const updateWorkoutById = useUserStore((state) => state.updateWorkoutById);
    const removeWorkoutById = useUserStore((state) => state.removeWorkoutById);
    const registerQuickCompletedWorkout = useUserStore((state) => state.registerQuickCompletedWorkout);

    // Get current week days (Monday as start)
    const getWeekDays = (offset = 0) => {
        const today = new Date();
        const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ...
        const monday = new Date(today);
        monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
        monday.setDate(monday.getDate() + (offset * 7));

        return Array.from({ length: 7 }, (_, i) => {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            return date;
        });
    };

    const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
    const dayNames = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

    const getDatePart = (value: string) => value.split('T')[0];
    const normalizeDay = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    type ExerciseStatus = 'completed' | 'partial' | 'not_done';
    const filteredCatalogExercises = useMemo(() => {
        const query = extraCatalogSearch.trim().toLowerCase();
        return EJERCICIOS_DATABASE.filter((exercise) => {
            if (!query) return true;
            return (
                exercise.nombre.toLowerCase().includes(query) ||
                exercise.grupoMuscular.toLowerCase().includes(query)
            );
        }).slice(0, 40);
    }, [extraCatalogSearch]);

    const deriveStatusFromDetail = (detail: ExerciseWorkoutDetail): ExerciseStatus => {
        if (detail.completionStatus) {
            return detail.completionStatus;
        }

        const totalSets = detail.sets.length;
        const completedSets = detail.sets.filter((set) => set.completed || set.skipped).length;
        const hasAnyProgress = detail.sets.some((set) => set.completed || set.skipped || set.reps > 0 || set.peso > 0);

        if (detail.isCompleted || (totalSets > 0 && completedSets === totalSets)) return 'completed';
        if (hasAnyProgress) return 'partial';
        return 'not_done';
    };

    const normalizeWorkoutDetails = (workout: EntrenamientoRealizado): ExerciseWorkoutDetail[] => {
        if (workout.exerciseDetails && workout.exerciseDetails.length > 0) {
            return workout.exerciseDetails.map((detail, index) => {
                const normalizedSets = (detail.sets || []).map((set, setIdx) => ({
                    numero: set.numero || setIdx + 1,
                    reps: set.reps || 0,
                    peso: set.peso || 0,
                    completed: Boolean(set.completed),
                    skipped: Boolean(set.skipped),
                    rest: set.rest,
                    duration: set.duration,
                }));

                const normalizedDetail: ExerciseWorkoutDetail = {
                    ...detail,
                    exerciseId: detail.exerciseId || `detail_${index}`,
                    sets: normalizedSets,
                };

                const status = deriveStatusFromDetail(normalizedDetail);
                return {
                    ...normalizedDetail,
                    isCompleted: status === 'completed',
                    completionStatus: status,
                };
            });
        }

        return workout.ejercicios.map((exercise, index) => {
            const sets = exercise.sets.map((set, setIdx) => ({
                numero: set.numero || setIdx + 1,
                reps: set.reps || 0,
                peso: set.peso || 0,
                completed: true,
                skipped: false,
            }));
            const status: ExerciseStatus = sets.length > 0 ? 'completed' : 'not_done';
            return {
                exerciseId: `legacy_${index}_${exercise.nombre}`,
                nombre: exercise.nombre,
                isCompleted: status === 'completed',
                isSkipped: false,
                completionStatus: status,
                sets,
            };
        });
    };

    const buildWorkoutForSave = (workout: EntrenamientoRealizado): EntrenamientoRealizado => {
        const normalizedDetails = normalizeWorkoutDetails(workout).map((detail) => {
            const status = deriveStatusFromDetail(detail);
            return {
                ...detail,
                completionStatus: status,
                isCompleted: status === 'completed',
            };
        });

        return {
            ...workout,
            exerciseDetails: normalizedDetails,
            ejercicios: normalizedDetails.map((detail) => ({
                nombre: detail.nombre,
                sets: detail.sets
                    .filter((set) => set.completed || set.skipped || set.reps > 0 || set.peso > 0)
                    .map((set, setIndex) => ({
                        numero: setIndex + 1,
                        reps: set.reps || 0,
                        peso: set.peso || 0,
                    })),
            })),
        };
    };

    const selectedDayWorkouts = useMemo(() => {
        if (!selectedDate) return [];
        const items = (perfil.historial || [])
            .filter((workout) => getDatePart(workout.fecha) === selectedDate)
            .sort((a, b) => b.fecha.localeCompare(a.fecha));
        const deduped = new Map<string, EntrenamientoRealizado>();
        items.forEach((workout) => {
            const workoutKey = workout.id || `${workout.fecha}_${workout.nombre}`;
            if (!deduped.has(workoutKey)) {
                deduped.set(workoutKey, workout);
            }
        });
        return Array.from(deduped.values());
    }, [perfil.historial, selectedDate]);

    const selectedDayExtras = useMemo(() => {
        if (!selectedDate) return [];
        const items = (perfil.actividadesExtras || [])
            .filter((activity) => getDatePart(activity.fecha) === selectedDate)
            .sort((a, b) => b.fecha.localeCompare(a.fecha));
        const deduped = new Map<string, ExtraActivity>();
        items.forEach((activity) => {
            const activityKey = activity.id || `${activity.fecha}_${activity.descripcion}`;
            if (!deduped.has(activityKey)) {
                deduped.set(activityKey, activity);
            }
        });
        return Array.from(deduped.values());
    }, [perfil.actividadesExtras, selectedDate]);

    useEffect(() => {
        if (!initialOpenDate) return;
        setSelectedDate(initialOpenDate);
        setShowDetailsModal(true);
    }, [initialOpenDate]);

    useEffect(() => {
        if (!autoEditFirstWorkout) return;
        if (!showDetailsModal) return;
        if (editingWorkoutId) return;
        if (selectedDayWorkouts.length === 0) return;
        handleStartWorkoutEdit(selectedDayWorkouts[0]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoEditFirstWorkout, showDetailsModal, selectedDayWorkouts, editingWorkoutId]);

    const closeDetailsModal = () => {
        setShowDetailsModal(false);
        setEditingWorkoutId(null);
        setWorkoutDraft(null);
        setDeletingWorkoutId(null);
    };

    const getExerciseStatusColor = (status: ExerciseStatus, isExtra = false): string => {
        if (isExtra) return Colors.accent;
        if (status === 'completed') return Colors.success;
        if (status === 'partial') return Colors.warning;
        return Colors.error;
    };

    const getExerciseStatusLabel = (status: ExerciseStatus): string => {
        if (status === 'completed') return 'Completado';
        if (status === 'partial') return 'Incompleto';
        return 'No realizado';
    };

    const handleDayClick = (dateStr: string) => {
        const hasActivity = activeDatesSet.has(dateStr);
        if (hasActivity) {
            setSelectedDate(dateStr);
            setShowDetailsModal(true);
            setEditingWorkoutId(null);
            setWorkoutDraft(null);
            setDeletingWorkoutId(null);
        } else {
            // If there is no workout/extra data, always open quick-register modal.
            if (weeklyTracking[dateStr] === 'completed' || weeklyTracking[dateStr] === true) {
                const { setDayTracking } = useUserStore.getState();
                setDayTracking(dateStr, null);
            }
            setSelectedDate(dateStr);
            setShowModal(true);
        }
    };

    const handleUnmarkDay = async (dateStr: string) => {
        await removeExtraActivitiesOnDate(dateStr);
        toast.success('Actividades extra eliminadas del día');
    };

    const handleStartWorkoutEdit = (workout: EntrenamientoRealizado) => {
        setEditingWorkoutId(workout.id);
        setWorkoutDraft(buildWorkoutForSave(workout));
    };

    const handleCancelWorkoutEdit = () => {
        setEditingWorkoutId(null);
        setWorkoutDraft(null);
    };

    const handleDraftExerciseStatusChange = (exerciseId: string, status: ExerciseStatus) => {
        setWorkoutDraft((current) => {
            if (!current) return current;
            const details = normalizeWorkoutDetails(current).map((detail) => {
                if (detail.exerciseId !== exerciseId) return detail;

                if (status === 'completed') {
                    return {
                        ...detail,
                        isCompleted: true,
                        completionStatus: 'completed' as const,
                        sets: detail.sets.map((set) => ({
                            ...set,
                            completed: true,
                            skipped: false,
                        })),
                    };
                }

                if (status === 'not_done') {
                    return {
                        ...detail,
                        isCompleted: false,
                        completionStatus: 'not_done' as const,
                        sets: detail.sets.map((set) => ({
                            ...set,
                            completed: false,
                            skipped: false,
                            reps: 0,
                            peso: 0,
                        })),
                    };
                }

                return {
                    ...detail,
                    isCompleted: false,
                    completionStatus: 'partial' as const,
                };
            });

            return { ...current, exerciseDetails: details };
        });
    };

    const handleDraftSetFieldChange = (
        exerciseId: string,
        setIndex: number,
        field: 'reps' | 'peso',
        value: number
    ) => {
        setWorkoutDraft((current) => {
            if (!current) return current;
            const details = normalizeWorkoutDetails(current).map((detail) => {
                if (detail.exerciseId !== exerciseId) return detail;
                const nextSets = detail.sets.map((set, idx) => {
                    if (idx !== setIndex) return set;
                    return {
                        ...set,
                        [field]: value,
                        completed: value > 0 || (field === 'reps' ? set.peso > 0 : set.reps > 0) || set.completed,
                    };
                });

                const nextDetail = { ...detail, sets: nextSets };
                const status = deriveStatusFromDetail(nextDetail);
                return {
                    ...nextDetail,
                    completionStatus: status,
                    isCompleted: status === 'completed',
                };
            });

            return { ...current, exerciseDetails: details };
        });
    };

    const handleSaveWorkoutEdit = async () => {
        if (!editingWorkoutId || !workoutDraft) return;
        setIsSavingWorkout(true);
        try {
            const normalizedWorkout = buildWorkoutForSave(workoutDraft);
            await updateWorkoutById(editingWorkoutId, normalizedWorkout);
            toast.success('Rutina actualizada');
            setEditingWorkoutId(null);
            setWorkoutDraft(null);
        } catch (error) {
            console.error('Error updating workout:', error);
            toast.error('No se pudo actualizar la rutina');
        } finally {
            setIsSavingWorkout(false);
        }
    };

    const handleDeleteWorkout = async (workoutId: string) => {
        const shouldDelete = window.confirm('¿Eliminar esta rutina del resumen del día?');
        if (!shouldDelete) return;
        setDeletingWorkoutId(workoutId);
        try {
            await removeWorkoutById(workoutId);
            if (editingWorkoutId === workoutId) {
                setEditingWorkoutId(null);
                setWorkoutDraft(null);
            }
            toast.success('Rutina eliminada');
        } catch (error) {
            console.error('Error deleting workout:', error);
            toast.error('No se pudo eliminar la rutina');
        } finally {
            setDeletingWorkoutId(null);
        }
    };

    const handleRoutineSelection = async (dayName: string) => {
        if (!selectedDate) return;

        if (dayName === 'Actividad Extra') {
            // Show extra activity form instead of marking as complete
            setShowModal(false);
            setExtraActivitySource('');
            setSelectedActivityType('');
            setSelectedCatalogExerciseId('');
            setExtraCatalogSearch('');
            setDuration('');
            setDistance('');
            setVideoUrl('');
            setIntensity('media');
            setShowExtraActivityForm(true);
        } else if (dayName === 'Saltar día') {
            const { setDayTracking } = useUserStore.getState();
            setDayTracking(selectedDate, 'skipped');
            setShowModal(false);
            setSelectedDate(null);
            toast.success('Día marcado como saltado');
        } else {
            if (!hasRoutineConfigured) {
                toast.error('Primero necesitas cargar una rutina');
                return;
            }

            const exercisesForDay = getRoutineExercisesForDay(dayName);
            if (exercisesForDay.length === 0) {
                toast.error('No hay ejercicios configurados para este día');
                return;
            }

            try {
                await registerQuickCompletedWorkout({
                    dateStr: selectedDate,
                    dayName,
                    routineName: perfil.rutina?.nombre || 'Rutina',
                    exercises: exercisesForDay,
                });
                setShowModal(false);
                setShowDetailsModal(true);
                setEditingWorkoutId(null);
                setWorkoutDraft(null);
                setDeletingWorkoutId(null);
                toast.success('Rutina registrada para este día');
            } catch (error) {
                console.error('Error registering quick workout:', error);
                toast.error('No se pudo registrar la rutina');
            }
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
        if (!selectedDate || !duration || !extraActivitySource) return;
        const selectedCatalogExercise = EJERCICIOS_DATABASE.find((exercise) => exercise.id === selectedCatalogExerciseId) || null;
        const activityName = extraActivitySource === 'catalog_gym'
            ? (selectedCatalogExercise?.nombre || '')
            : selectedActivityType;
        if (!activityName) return;

        try {
            // Calculate calories estimation (METs approx)
            // Low: 4, Med: 8, High: 12
            const mets = intensity === 'baja' ? 4 : intensity === 'media' ? 8 : 12;
            const weight = perfil.usuario.peso || 70;
            const durationHrs = parseInt(duration, 10) / 60;
            const estimatedCalories = Math.round(mets * weight * durationHrs);

            // Save the extra activity
            const activityToSave: ExtraActivity = {
                id: `extra_${Date.now()}`,
                fecha: selectedDate,
                descripcion: activityName, // For backward compatibility/display
                source: extraActivitySource,
                catalogExerciseId: extraActivitySource === 'catalog_gym' ? selectedCatalogExercise?.id : undefined,
                catalogExerciseName: extraActivitySource === 'catalog_gym' ? selectedCatalogExercise?.nombre : undefined,
                analisisIA: {
                    tipoDeporte: activityName,
                    duracionMinutos: parseInt(duration, 10),
                    distanciaKm: extraActivitySource === 'outside_gym' && distance ? parseFloat(distance) : undefined,
                    intensidad: intensity,
                    calorias: estimatedCalories,
                    notas: extraActivitySource === 'catalog_gym' ? 'Registro manual desde catálogo' : 'Registro manual'
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
            setExtraActivitySource('');
            setSelectedCatalogExerciseId('');
            setExtraCatalogSearch('');
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
            normalizeDay(d.dia) === normalizeDay(targetDay)
        );
    };

    const getRoutineExercisesForDay = (dayName: string) => {
        const routineExercises = perfil.rutina?.ejercicios || [];
        const normalizedDayName = normalizeDay(dayName);

        return routineExercises.filter((exercise) => {
            if (!exercise.dia) return true;
            const normalizedExerciseDay = normalizeDay(exercise.dia);
            return normalizedExerciseDay.includes(normalizedDayName) || normalizedDayName.includes(normalizedExerciseDay);
        });
    };

    const activeDatesSet = useMemo(() => {
        const workoutDates = (perfil.historial || []).map((item) => getDatePart(item.fecha));
        const extraDates = (perfil.actividadesExtras || []).map((item) => getDatePart(item.fecha));
        return new Set([...workoutDates, ...extraDates]);
    }, [perfil.actividadesExtras, perfil.historial]);

    const getDayState = (date: Date) => {
        const dateStr = formatDate(date);
        const trackingStatus = weeklyTracking[dateStr];
        const isSkipped = trackingStatus === 'skipped';
        const hasActivity = activeDatesSet.has(dateStr);
        const isCompleted = !isSkipped && hasActivity;
        const isScheduled = Boolean(getDaySchedule(date.getDay())?.entrena);
        const today = isToday(date);
        const past = isPast(date);
        const missedDay = past && isScheduled && !isCompleted && !isSkipped;
        const isFuture = !past && !today;
        const isRestDay = !isScheduled;

        return {
            dateStr,
            isSkipped,
            isCompleted,
            isScheduled,
            today,
            past,
            missedDay,
            isFuture,
            isRestDay,
        };
    };

    const completedDays = weekDays.filter(d => {
        const { dateStr } = getDayState(d);
        const status = weeklyTracking[dateStr];
        // Skipped days do NOT count as completed
        if (status === 'skipped') return false;
        return activeDatesSet.has(dateStr);
    }).length;

    const scheduledDays = weekDays.filter((_, i) => getDaySchedule((i + 1) % 7)?.entrena).length;

    const trainingDays = perfil.horario.dias.filter(d => d.entrena);
    const hasRoutineConfigured = Boolean(perfil.rutina);
    const monthLabel = monthCursor.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const monthWeekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    const monthDays = (() => {
        const year = monthCursor.getFullYear();
        const month = monthCursor.getMonth();
        const firstDay = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
        const cells: Array<{ date: Date | null; state: ReturnType<typeof getDayState> | null }> = [];

        for (let i = 0; i < startOffset; i += 1) {
            cells.push({ date: null, state: null });
        }

        for (let day = 1; day <= daysInMonth; day += 1) {
            const date = new Date(year, month, day);
            cells.push({ date, state: getDayState(date) });
        }

        return cells;
    })();

    const defaultActivities = ['Running', 'Ciclismo', 'Natación', 'Fútbol', 'Yoga', 'Pilates', 'Crossfit', 'Boxeo', 'Trekking', 'Basket', 'Tenis'];
    const currentActivityCatalog = perfil.catalogoExtras?.length ? perfil.catalogoExtras : defaultActivities;

    useEffect(() => {
        const staleCompletedDates = Object.entries(weeklyTracking)
            .filter(([dateKey, status]) => (status === 'completed' || status === true) && !activeDatesSet.has(dateKey))
            .map(([dateKey]) => dateKey);
        if (staleCompletedDates.length === 0) return;
        const { setDayTracking } = useUserStore.getState();
        staleCompletedDates.forEach((dateKey) => setDayTracking(dateKey, null));
    }, [activeDatesSet, weeklyTracking]);

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

                <div style={styles.weekControls}>
                    <button
                        type="button"
                        style={styles.weekNavBtn}
                        onClick={() => setWeekOffset((prev) => prev - 1)}
                        aria-label="Semana anterior"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span style={styles.weekLabel}>
                        {weekDays[0].toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} - {weekDays[6].toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                    </span>
                    <button
                        type="button"
                        style={{ ...styles.weekNavBtn, opacity: weekOffset >= 0 ? 0.45 : 1 }}
                        onClick={() => setWeekOffset((prev) => Math.min(0, prev + 1))}
                        aria-label="Semana siguiente"
                        disabled={weekOffset >= 0}
                    >
                        <ChevronRight size={16} />
                    </button>
                    <button
                        type="button"
                        style={styles.monthButton}
                        onClick={() => {
                            const now = new Date();
                            setMonthCursor(new Date(now.getFullYear(), now.getMonth(), 1));
                            setShowMonthModal(true);
                        }}
                    >
                        <CalendarDays size={14} />
                        Ver mes
                    </button>
                </div>

                <div style={styles.daysContainer}>
                    {weekDays.map((date, index) => {
                        const {
                            dateStr,
                            isSkipped,
                            isCompleted,
                            isScheduled,
                            today,
                            missedDay,
                        } = getDayState(date);

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

                <div style={styles.legendRow}>
                    <span style={styles.legendItem}>
                        <span style={{ ...styles.legendDot, background: Colors.success }} />
                        Entrenado
                    </span>
                    <span style={styles.legendItem}>
                        <span style={{ ...styles.legendDot, background: Colors.error }} />
                        No entrenado
                    </span>
                    <span style={styles.legendItem}>
                        <span style={{ ...styles.legendDot, background: Colors.border }} />
                        Descanso
                    </span>
                    <span style={styles.legendItem}>
                        <span style={{ ...styles.legendDot, background: `${Colors.error}77` }} />
                        Saltado
                    </span>
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
                                <h3 style={styles.modalTitle}>¿Qué rutina hiciste este día?</h3>
                                <button onClick={() => setShowModal(false)} style={styles.closeBtn}>
                                    <X size={20} color={Colors.textSecondary} />
                                </button>
                            </div>
                            <p style={styles.modalHint}>
                                Se registrará como rutina completa para este día y luego podrás editarla.
                            </p>
                            <div style={styles.routineList}>
                                {!hasRoutineConfigured && (
                                    <div style={styles.routineWarning}>
                                        Carga una rutina para usar el registro rápido de entrenamientos.
                                    </div>
                                )}
                                {trainingDays.map((day) => {
                                    const dayExercises = getRoutineExercisesForDay(day.dia);
                                    const disabled = !hasRoutineConfigured || dayExercises.length === 0;

                                    return (
                                        <button
                                            key={day.dia}
                                            onClick={() => handleRoutineSelection(day.dia)}
                                            style={{
                                                ...styles.routineOption,
                                                opacity: disabled ? 0.45 : 1,
                                                cursor: disabled ? 'not-allowed' : 'pointer',
                                            }}
                                            disabled={disabled}
                                        >
                                            <Dumbbell size={18} color={Colors.primary} />
                                            <div style={styles.routineInfo}>
                                                <span style={styles.routineDay}>{day.dia}</span>
                                                <span style={styles.routineMuscle}>
                                                    {disabled
                                                        ? 'Sin ejercicios configurados'
                                                        : `${day.grupoMuscular} · ${dayExercises.length} ejercicios`}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
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
                                    onClick={() => handleRoutineSelection('Saltar día')}
                                    style={{
                                        ...styles.routineOption,
                                        borderColor: Colors.error,
                                        background: `${Colors.error}15`
                                    }}
                                >
                                    <X size={18} color={Colors.error} />
                                    <div style={styles.routineInfo}>
                                        <span style={styles.routineDay}>Saltar día</span>
                                        <span style={styles.routineMuscle}>No pude entrenar este día</span>
                                    </div>
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Monthly Calendar Modal */}
            <AnimatePresence>
                {showMonthModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={styles.modalOverlay}
                        onClick={() => setShowMonthModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.94, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.94, opacity: 0 }}
                            style={{ ...styles.modal, maxWidth: '440px' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={styles.modalHeader}>
                                <button
                                    type="button"
                                    style={styles.monthNavButton}
                                    onClick={() => {
                                        setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
                                    }}
                                    aria-label="Mes anterior"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <h3 style={{ ...styles.modalTitle, textTransform: 'capitalize' }}>{monthLabel}</h3>
                                <button
                                    type="button"
                                    style={styles.monthNavButton}
                                    onClick={() => {
                                        setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
                                    }}
                                    aria-label="Mes siguiente"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>

                            <div style={styles.monthLegendRow}>
                                <span style={styles.monthLegendItem}>
                                    <span style={{ ...styles.legendDot, background: Colors.success }} />
                                    Entrenó
                                </span>
                                <span style={styles.monthLegendItem}>
                                    <span style={{ ...styles.legendDot, background: Colors.error }} />
                                    No entrenó
                                </span>
                                <span style={styles.monthLegendItem}>
                                    <span style={{ ...styles.legendDot, background: Colors.border }} />
                                    Descanso
                                </span>
                            </div>

                            <div style={styles.monthGrid}>
                                {monthWeekDays.map((dayLabel) => (
                                    <span key={dayLabel} style={styles.monthWeekHeader}>
                                        {dayLabel}
                                    </span>
                                ))}

                                {monthDays.map((cell, idx) => {
                                    if (!cell.date || !cell.state) {
                                        return <div key={`empty_${idx}`} style={styles.monthDayEmpty} />;
                                    }

                                    const {
                                        dateStr,
                                        isCompleted,
                                        isSkipped,
                                        missedDay,
                                        isRestDay,
                                        today,
                                        isFuture,
                                    } = cell.state;

                                    return (
                                        <button
                                            key={dateStr}
                                            type="button"
                                            onClick={() => {
                                                setShowMonthModal(false);
                                                handleDayClick(dateStr);
                                            }}
                                            style={{
                                                ...styles.monthDayButton,
                                                background: isCompleted
                                                    ? `${Colors.success}22`
                                                    : isSkipped || missedDay
                                                        ? `${Colors.error}1F`
                                                        : isRestDay
                                                            ? `${Colors.surfaceLight}`
                                                            : 'transparent',
                                                border: `1px solid ${isCompleted
                                                    ? Colors.success
                                                    : isSkipped || missedDay
                                                        ? Colors.error
                                                        : today
                                                            ? Colors.primary
                                                            : isRestDay
                                                                ? Colors.border
                                                                : Colors.border}55`,
                                                color: isCompleted
                                                    ? Colors.success
                                                    : isSkipped || missedDay
                                                        ? Colors.error
                                                        : today
                                                            ? Colors.primary
                                                            : Colors.text,
                                                opacity: isFuture ? 0.55 : 1,
                                            }}
                                        >
                                            <span>{cell.date.getDate()}</span>
                                        </button>
                                    );
                                })}
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
                        onClick={closeDetailsModal}
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
                                <button onClick={closeDetailsModal} style={styles.closeBtn}>
                                    <X size={20} color={Colors.textSecondary} />
                                </button>
                            </div>

                            <div style={styles.detailsContent}>
                                {selectedDayWorkouts.length === 0 && selectedDayExtras.length === 0 && (
                                    <button
                                        type="button"
                                        style={styles.emptyDayAction}
                                        onClick={() => {
                                            closeDetailsModal();
                                            setShowModal(true);
                                        }}
                                    >
                                        Registrar rutina o actividad para este día
                                    </button>
                                )}

                                {selectedDayWorkouts.length > 0 && (
                                    <div style={styles.detailsSection}>
                                        <div style={styles.detailsSectionHeader}>
                                            <Dumbbell size={16} color={Colors.success} />
                                            <span style={styles.detailsSectionTitle}>Rutinas ({selectedDayWorkouts.length})</span>
                                        </div>
                                        <div style={styles.detailsList}>
                                            {selectedDayWorkouts.map((workout, workoutIdx) => {
                                                const isEditing = editingWorkoutId === workout.id && workoutDraft?.id === workout.id;
                                                const currentWorkout = isEditing && workoutDraft ? workoutDraft : workout;
                                                const details = normalizeWorkoutDetails(currentWorkout);
                                                const completedCount = details.filter((detail) => deriveStatusFromDetail(detail) === 'completed').length;

                                                return (
                                                    <div key={`${workout.id || 'workout'}_${workoutIdx}`} style={styles.routineDetailContainer}>
                                                        <div style={styles.routineSummary}>
                                                            <Dumbbell size={24} color={Colors.success} />
                                                            <div style={{ flex: 1 }}>
                                                                <span style={styles.routineNameText}>{currentWorkout.nombre}</span>
                                                                <p style={styles.routineStatsText}>
                                                                    {details.length} ejercicios • {currentWorkout.duracionMinutos} min • {completedCount}/{details.length} completos
                                                                </p>
                                                            </div>
                                                            <div style={styles.workoutActions}>
                                                                {isEditing ? (
                                                                    <>
                                                                        <button
                                                                            onClick={handleSaveWorkoutEdit}
                                                                            disabled={isSavingWorkout}
                                                                            style={{ ...styles.iconActionBtn, opacity: isSavingWorkout ? 0.5 : 1 }}
                                                                        >
                                                                            <Save size={16} color={Colors.success} />
                                                                        </button>
                                                                        <button onClick={handleCancelWorkoutEdit} style={styles.iconActionBtn}>
                                                                            <X size={16} color={Colors.textSecondary} />
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <button onClick={() => handleStartWorkoutEdit(workout)} style={styles.iconActionBtn}>
                                                                            <Edit3 size={16} color={Colors.primary} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteWorkout(workout.id)}
                                                                            style={{ ...styles.iconActionBtn, opacity: deletingWorkoutId === workout.id ? 0.5 : 1 }}
                                                                            disabled={deletingWorkoutId === workout.id}
                                                                        >
                                                                            <Trash2 size={16} color={Colors.error} />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div style={styles.exerciseList}>
                                                            {details.map((detail) => {
                                                                const status = deriveStatusFromDetail(detail);
                                                                const statusColor = getExerciseStatusColor(status, Boolean(detail.isExtraAdded));
                                                                return (
                                                                    <div key={detail.exerciseId} style={styles.exerciseItem}>
                                                                        <div style={styles.exerciseHeader}>
                                                                            <span style={styles.exerciseName}>{detail.nombre}</span>
                                                                            <div style={styles.exerciseMeta}>
                                                                                {detail.isReplaced && (
                                                                                    <span style={{
                                                                                        ...styles.replacedBadge,
                                                                                        borderColor: `${statusColor}50`,
                                                                                        background: `${statusColor}20`,
                                                                                        color: statusColor,
                                                                                    }}>
                                                                                        <Shuffle size={12} />
                                                                                        Reemplazado
                                                                                    </span>
                                                                                )}
                                                                                {isEditing ? (
                                                                                    <select
                                                                                        value={status}
                                                                                        onChange={(event) => handleDraftExerciseStatusChange(
                                                                                            detail.exerciseId,
                                                                                            event.target.value as ExerciseStatus
                                                                                        )}
                                                                                        style={{
                                                                                            ...styles.statusSelect,
                                                                                            borderColor: statusColor,
                                                                                            color: statusColor
                                                                                        }}
                                                                                    >
                                                                                        <option value="completed">Completado</option>
                                                                                        <option value="partial">Incompleto</option>
                                                                                        <option value="not_done">No realizado</option>
                                                                                    </select>
                                                                                ) : (
                                                                                    <span style={{
                                                                                        ...styles.exerciseStatusBadge,
                                                                                        background: `${statusColor}20`,
                                                                                        borderColor: `${statusColor}50`,
                                                                                        color: statusColor
                                                                                    }}>
                                                                                        {getExerciseStatusLabel(status)}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        <div style={styles.setsGrid}>
                                                                            {detail.sets.length === 0 && (
                                                                                <span style={styles.emptySetLabel}>Sin series registradas</span>
                                                                            )}
                                                                            {detail.sets.map((set, setIdx) => (
                                                                                isEditing ? (
                                                                                    <div key={`${detail.exerciseId}_${setIdx}`} style={styles.setEditorCard}>
                                                                                        <span style={styles.setEditorTitle}>Serie {setIdx + 1}</span>
                                                                                        <div style={styles.setEditorInputs}>
                                                                                            <input
                                                                                                type="number"
                                                                                                value={set.reps}
                                                                                                min={0}
                                                                                                onChange={(event) =>
                                                                                                    handleDraftSetFieldChange(
                                                                                                        detail.exerciseId,
                                                                                                        setIdx,
                                                                                                        'reps',
                                                                                                        parseInt(event.target.value || '0', 10) || 0
                                                                                                    )}
                                                                                                style={styles.inlineInput}
                                                                                            />
                                                                                            <input
                                                                                                type="number"
                                                                                                value={set.peso}
                                                                                                min={0}
                                                                                                onChange={(event) =>
                                                                                                    handleDraftSetFieldChange(
                                                                                                        detail.exerciseId,
                                                                                                        setIdx,
                                                                                                        'peso',
                                                                                                        parseFloat(event.target.value || '0') || 0
                                                                                                    )}
                                                                                                style={styles.inlineInput}
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div key={`${detail.exerciseId}_${setIdx}`} style={styles.setMinicard}>
                                                                                        <span style={styles.setInfo}>
                                                                                            {set.reps} <small>reps</small>
                                                                                        </span>
                                                                                        <span style={styles.setWeight}>
                                                                                            {set.peso} <small>kg</small>
                                                                                        </span>
                                                                                    </div>
                                                                                )
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        {currentWorkout.moodPost && (
                                                            <div style={styles.moodBadge}>
                                                                <span>Estado post-entreno:</span>
                                                                <span style={styles.moodValue}>
                                                                    {currentWorkout.moodPost === 1 ? '&#128555;' : currentWorkout.moodPost === 2 ? '&#128533;' : currentWorkout.moodPost === 3 ? '&#128528;' : currentWorkout.moodPost === 4 ? '&#128578;' : '&#128293;'}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {selectedDayExtras.length > 0 && (
                                    <div style={styles.detailsSection}>
                                        <div style={styles.detailsSectionHeader}>
                                            <Activity size={16} color={Colors.accent} />
                                            <span style={styles.detailsSectionTitle}>Actividades extra ({selectedDayExtras.length})</span>
                                        </div>

                                        <div style={styles.detailsList}>
                                            {selectedDayExtras.map((extraActivity, extraIdx) => (
                                                <div key={`${extraActivity.id || 'extra'}_${extraIdx}`} style={{ ...styles.activityCard, borderColor: `${Colors.accent}50`, background: `${Colors.accent}12` }}>
                                                    <div style={styles.activityHeader}>
                                                        <Activity size={20} color={Colors.accent} />
                                                        <span style={styles.activityType}>
                                                            {extraActivity.analisisIA?.tipoDeporte || extraActivity.descripcion}
                                                        </span>
                                                        <span style={{
                                                            ...styles.exerciseStatusBadge,
                                                            background: `${Colors.accent}20`,
                                                            borderColor: `${Colors.accent}50`,
                                                            color: Colors.accent
                                                        }}>
                                                            Extra
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
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedDayExtras.length > 0 && (
                                    <button
                                        onClick={() => handleUnmarkDay(selectedDate)}
                                        style={styles.unmarkBtn}
                                    >
                                        <X size={16} /> Eliminar actividades extra del día
                                    </button>
                                )}
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
                                <div>
                                    <label style={styles.label}>Origen de la actividad</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <button
                                            onClick={() => {
                                                setExtraActivitySource('outside_gym');
                                                setSelectedCatalogExerciseId('');
                                            }}
                                            style={{
                                                ...styles.activityTypeBtn,
                                                background: extraActivitySource === 'outside_gym' ? Colors.primary : Colors.surface,
                                                color: extraActivitySource === 'outside_gym' ? '#000' : Colors.text,
                                                borderColor: extraActivitySource === 'outside_gym' ? Colors.primary : Colors.border,
                                            }}
                                        >
                                            Fuera del gym
                                        </button>
                                        <button
                                            onClick={() => {
                                                setExtraActivitySource('catalog_gym');
                                                setSelectedActivityType('');
                                            }}
                                            style={{
                                                ...styles.activityTypeBtn,
                                                background: extraActivitySource === 'catalog_gym' ? Colors.primary : Colors.surface,
                                                color: extraActivitySource === 'catalog_gym' ? '#000' : Colors.text,
                                                borderColor: extraActivitySource === 'catalog_gym' ? Colors.primary : Colors.border,
                                            }}
                                        >
                                            Desde catálogo
                                        </button>
                                    </div>
                                </div>

                                {/* Activity Type Selection */}
                                {extraActivitySource === 'outside_gym' && (
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
                                )}

                                {extraActivitySource === 'catalog_gym' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <label style={styles.label}>Ejercicio del catálogo</label>
                                        <input
                                            type="text"
                                            value={extraCatalogSearch}
                                            onChange={(e) => setExtraCatalogSearch(e.target.value)}
                                            placeholder="Buscar ejercicio..."
                                            style={styles.input}
                                        />
                                        <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {filteredCatalogExercises.map((exercise) => (
                                                <button
                                                    key={exercise.id}
                                                    onClick={() => setSelectedCatalogExerciseId(exercise.id)}
                                                    style={{
                                                        ...styles.routineOption,
                                                        padding: '12px',
                                                        borderColor: selectedCatalogExerciseId === exercise.id ? Colors.primary : Colors.border,
                                                        background: selectedCatalogExerciseId === exercise.id ? `${Colors.primary}15` : Colors.background,
                                                    }}
                                                >
                                                    <div style={{ ...styles.routineInfo, alignItems: 'flex-start' }}>
                                                        <span style={{ ...styles.routineDay, fontSize: '14px' }}>{exercise.nombre}</span>
                                                        <span style={styles.routineMuscle}>{GRUPOS_MUSCULARES[exercise.grupoMuscular]?.nombre || 'General'}</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Stats Inputs */}
                                <div style={styles.statsInputGrid}>
                                    <div>
                                        <label style={styles.label}>Duración (min)</label>
                                        <input
                                            type="number"
                                            value={duration}
                                            onChange={(e) => setDuration(e.target.value)}
                                            placeholder="45"
                                            style={styles.input}
                                        />
                                    </div>
                                    {extraActivitySource === 'outside_gym' && (
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
                                    )}
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
                                {extraActivitySource === 'outside_gym' && (
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
                                )}

                                {/* Save Button */}
                                <button
                                    onClick={handleSaveExtraActivity}
                                    disabled={
                                        !extraActivitySource ||
                                        !duration ||
                                        (extraActivitySource === 'outside_gym' && !selectedActivityType) ||
                                        (extraActivitySource === 'catalog_gym' && !selectedCatalogExerciseId)
                                    }
                                    style={{
                                        ...styles.saveBtn,
                                        opacity: (
                                            !extraActivitySource ||
                                            !duration ||
                                            (extraActivitySource === 'outside_gym' && !selectedActivityType) ||
                                            (extraActivitySource === 'catalog_gym' && !selectedCatalogExerciseId)
                                        ) ? 0.5 : 1
                                    }}
                                >
                                    Guardar actividad
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
    weekControls: {
        display: 'grid',
        gridTemplateColumns: '32px 1fr 32px auto',
        gap: '8px',
        alignItems: 'center',
        marginBottom: '12px',
    },
    weekNavBtn: {
        width: '32px',
        height: '32px',
        borderRadius: '10px',
        border: `1px solid ${Colors.border}`,
        background: Colors.surfaceLight,
        color: Colors.text,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
    },
    weekLabel: {
        fontSize: '12px',
        fontWeight: 700,
        color: Colors.textSecondary,
        textAlign: 'center',
        textTransform: 'capitalize',
    },
    monthButton: {
        border: `1px solid ${Colors.border}`,
        background: Colors.surfaceLight,
        color: Colors.text,
        borderRadius: '10px',
        padding: '7px 10px',
        fontSize: '12px',
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        cursor: 'pointer',
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
    legendRow: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        marginTop: '12px',
    },
    legendItem: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '11px',
        fontWeight: 700,
        color: Colors.textSecondary,
    },
    legendDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        display: 'inline-block',
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
    monthNavButton: {
        width: '32px',
        height: '32px',
        borderRadius: '10px',
        border: `1px solid ${Colors.border}`,
        background: Colors.surfaceLight,
        color: Colors.text,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
    },
    monthLegendRow: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        marginBottom: '14px',
    },
    monthLegendItem: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '11px',
        fontWeight: 700,
        color: Colors.textSecondary,
    },
    monthGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '8px',
    },
    monthWeekHeader: {
        fontSize: '11px',
        fontWeight: 800,
        color: Colors.textTertiary,
        textAlign: 'center',
    },
    monthDayButton: {
        height: '38px',
        borderRadius: '10px',
        border: `1px solid ${Colors.border}`,
        background: 'transparent',
        fontSize: '13px',
        fontWeight: 700,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
    },
    monthDayEmpty: {
        height: '38px',
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
    },
    modalHint: {
        fontSize: '12px',
        color: Colors.textSecondary,
        margin: '0 0 12px 0',
        lineHeight: 1.4,
    },
    routineList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    routineWarning: {
        borderRadius: '12px',
        border: `1px dashed ${Colors.warning}66`,
        background: `${Colors.warning}15`,
        color: Colors.warning,
        fontSize: '12px',
        fontWeight: 700,
        padding: '10px 12px',
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
    detailsSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    detailsSectionHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    detailsSectionTitle: {
        fontSize: '14px',
        fontWeight: 800,
        color: Colors.text,
        textTransform: 'uppercase',
        letterSpacing: '0.4px',
    },
    detailsList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
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
    workoutActions: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    iconActionBtn: {
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        border: `1px solid ${Colors.border}`,
        background: Colors.surface,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
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
    emptyDayAction: {
        width: '100%',
        padding: '12px',
        borderRadius: '12px',
        border: `1px dashed ${Colors.border}`,
        background: Colors.surfaceLight,
        color: Colors.textSecondary,
        fontSize: '13px',
        fontWeight: 700,
        cursor: 'pointer',
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
        gap: '12px',
    },
    exerciseName: {
        fontSize: '14px',
        fontWeight: 800,
        color: Colors.text,
        flex: 1,
    },
    exerciseMeta: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
    },
    replacedBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 8px',
        borderRadius: '999px',
        border: `1px solid ${Colors.warning}50`,
        background: `${Colors.warning}20`,
        color: Colors.warning,
        fontSize: '10px',
        fontWeight: 700,
    },
    statusSelect: {
        borderRadius: '8px',
        border: '1px solid',
        background: Colors.surface,
        fontSize: '12px',
        fontWeight: 700,
        padding: '4px 8px',
        cursor: 'pointer',
    },
    exerciseStatusBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: '999px',
        border: '1px solid',
        padding: '3px 8px',
        fontSize: '10px',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
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
    emptySetLabel: {
        fontSize: '12px',
        color: Colors.textTertiary,
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
    setEditorCard: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        background: Colors.surface,
        padding: '8px',
        borderRadius: '8px',
        border: `1px solid ${Colors.border}40`,
        minWidth: '120px',
    },
    setEditorTitle: {
        fontSize: '11px',
        color: Colors.textTertiary,
        fontWeight: 700,
    },
    setEditorInputs: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '6px',
    },
    inlineInput: {
        width: '100%',
        padding: '6px 8px',
        borderRadius: '6px',
        border: `1px solid ${Colors.border}`,
        background: Colors.background,
        color: Colors.text,
        fontSize: '12px',
        outline: 'none',
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

