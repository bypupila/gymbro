// =====================================================
// GymBro PWA - Routine Review Step
// Visualización y edición de los resultados de la IA - Soporte para Días
// =====================================================

import React, { useState } from 'react';
import { Card } from './Card';
import { EjercicioRutina, AnalysisResult, RutinaUsuario, useUserStore } from '../stores/userStore';
import Colors from '../styles/colors';
import { ExerciseSelector } from './ExerciseSelector';
import { EjercicioBase } from '@/data/exerciseDatabase';
import {
    Check,
    Edit2,
    Trash2,
    AlertCircle,
    Save,
    X,
    ChevronDown,
    ChevronUp,
    Calendar,
    Plus,
    TrendingUp,
    Hash
} from 'lucide-react';

interface RoutineReviewStepProps {
    analysis: AnalysisResult;
    onCancel: () => void;
    onSave: (rutina: RutinaUsuario) => void;
}

export const RoutineReviewStep: React.FC<RoutineReviewStepProps> = ({
    analysis,
    onCancel,
    onSave
}) => {
    const [exercises, setExercises] = useState<EjercicioRutina[]>(analysis.exercises);
    const [routineName, setRoutineName] = useState(analysis.routineName || 'Mi Rutina Nueva');
    const [durationWeeks, setDurationWeeks] = useState(4);
    const [editingId, setEditingId] = useState<string | null>(null);
    const { perfil } = useUserStore();

    // Selector state
    const [showSelector, setShowSelector] = useState(false);
    const [selectorTargetDay, setSelectorTargetDay] = useState<string | null>(null);
    const [selectorTargetCategory, setSelectorTargetCategory] = useState<'calentamiento' | 'maquina'>('maquina');

    // Get training days to show as options
    const trainingDays = perfil.horario.dias.filter(d => d.entrena).map(d => d.dia);

    // Temp state for exercise being edited
    const [tempExercise, setTempExercise] = useState<EjercicioRutina | null>(null);

    const handleStartEdit = (ex: EjercicioRutina) => {
        setEditingId(ex.id);
        setTempExercise({ ...ex });
    };

    const handleSaveExercise = (ex: EjercicioRutina, days: string[]) => {
        let updatedExercises: EjercicioRutina[];

        if (days.length === 0) {
            // Case 0: No days selected -> Move to Unassigned
            const updated = { ...ex, dia: undefined };
            updatedExercises = exercises.map(e => e.id === ex.id ? updated : e);
        } else if (days.length === 1) {
            // Case 1: Single day -> Update directly
            const updated = { ...ex, dia: days[0] };
            updatedExercises = exercises.map(e => e.id === ex.id ? updated : e);
        } else {
            // Case 2: Multi-day -> Clone
            const firstDay = days[0];
            const otherDays = days.slice(1);

            const baseExercise = { ...ex, dia: firstDay };
            const clones = otherDays.map(day => ({
                ...ex,
                id: crypto.randomUUID(),
                dia: day
            }));

            updatedExercises = exercises.flatMap(e =>
                e.id === ex.id ? [baseExercise, ...clones] : [e]
            );
        }

        // Automatic Deduplication Logic
        const uniqueExercises: EjercicioRutina[] = [];
        const seen = new Set();

        updatedExercises.forEach((exercise) => {
            const dayKey = exercise.dia || 'No Asignado';
            const signature = `${dayKey}-${exercise.nombre.trim().toLowerCase()}-${exercise.series}-${exercise.repeticiones}`;

            if (!seen.has(signature)) {
                seen.add(signature);
                uniqueExercises.push(exercise);
            }
        });

        setExercises(uniqueExercises);
        setEditingId(null);
        setTempExercise(null);
    };

    const handleDeleteExercise = (id: string) => {
        setExercises(exercises.filter(ex => ex.id !== id));
    };

    const handleMove = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= exercises.length) return;

        const newArr = [...exercises];
        [newArr[index], newArr[newIndex]] = [newArr[newIndex], newArr[index]];
        setExercises(newArr);
    };

    const handleConfirmAll = () => {
        const fechaInicio = new Date();
        const fechaExpiracion = new Date();
        fechaExpiracion.setDate(fechaExpiracion.getDate() + (durationWeeks * 7));

        const rutina: RutinaUsuario = {
            nombre: routineName,
            duracionSemanas: durationWeeks,
            ejercicios: exercises,
            fechaInicio: fechaInicio.toISOString(),
            fechaExpiracion: fechaExpiracion.toISOString(),
            analizadaPorIA: analysis.isAI !== false
        };
        onSave(rutina);
    };

    const openSelector = (day: string | null = null, category: 'calentamiento' | 'maquina' = 'maquina') => {
        setSelectorTargetDay(day);
        setSelectorTargetCategory(category);
        setShowSelector(true);
    };

    const handleSelectExercise = (base: EjercicioBase) => {
        const nuevo: EjercicioRutina = {
            id: crypto.randomUUID(),
            nombre: base.nombre,
            series: 3,
            repeticiones: '10-12',
            descanso: 60,
            categoria: selectorTargetCategory,
            dia: selectorTargetDay || undefined,
        };
        const newExercises = [...exercises, nuevo];

        // Cleanup global function if needed, but mainly for local additions
        const uniqueExercises: EjercicioRutina[] = [];
        const seen = new Set();

        newExercises.forEach(ex => {
            const dayKey = ex.dia || 'No Asignado';
            const signature = `${dayKey}-${ex.nombre.trim().toLowerCase()}-${ex.series}-${ex.repeticiones}`;
            if (!seen.has(signature)) {
                seen.add(signature);
                uniqueExercises.push(ex);
            }
        });
        setExercises(uniqueExercises);
    };

    // Group exercises by day and then by category
    const groupedExercises = exercises.reduce((acc, ex) => {
        // Strict day logic: any non-whitespace string counts as a day. Fallback to "No Asignado".
        const normalizedDia = (ex.dia && ex.dia.trim().length > 0) ? ex.dia.trim() : "No Asignado";

        if (!acc[normalizedDia]) acc[normalizedDia] = { calentamiento: [], rutina: [] };

        if (ex.categoria === 'calentamiento') {
            acc[normalizedDia].calentamiento.push(ex);
        } else {
            acc[normalizedDia].rutina.push(ex);
        }
        return acc;
    }, {} as Record<string, { calentamiento: EjercicioRutina[], rutina: EjercicioRutina[] }>);

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}>Revisar Rutina</h2>
                <p style={styles.subtitle}>
                    Verifica que la IA haya extraído todo correctamente por día.
                </p>
            </div>

            <div style={styles.scrollContainer}>
                {/* Routine Name Edit */}
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Nombre de la Rutina</label>
                    <input
                        style={styles.input}
                        value={routineName}
                        onChange={(e) => setRoutineName(e.target.value)}
                        placeholder="Ej: Rutina Hipertrofia"
                    />
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Duración de la Rutina (Semanas)</label>
                    <select
                        style={styles.input}
                        value={durationWeeks}
                        onChange={(e) => setDurationWeeks(parseInt(e.target.value))}
                    >
                        <option value={2}>2 Semanas</option>
                        <option value={4}>4 Semanas</option>
                        <option value={6}>6 Semanas</option>
                        <option value={8}>8 Semanas</option>
                    </select>
                </div>

                <div style={styles.statsRow}>
                    <div style={{ ...styles.statBox, borderColor: analysis.confidence === 'high' ? Colors.success : Colors.warning }}>
                        <span style={styles.statLabel}>Confianza</span>
                        <span style={{
                            ...styles.statVal,
                            color: analysis.confidence === 'high' ? Colors.success : Colors.warning
                        }}>
                            {analysis.confidence.toUpperCase()}
                        </span>
                    </div>
                    <div style={styles.statBox}>
                        <span style={styles.statLabel}>Ejercicios</span>
                        <span style={styles.statVal}>{exercises.length}</span>
                    </div>
                    <div style={styles.statBox}>
                        <span style={styles.statLabel}>Días</span>
                        <span style={styles.statVal}>{Object.keys(groupedExercises).length}</span>
                    </div>
                </div>

                <div style={styles.exerciseList}>
                    {Object.entries(groupedExercises).map(([dia, diaGroups]) => (
                        <div key={dia} style={styles.daySection}>
                            <div style={styles.dayHeader}>
                                <Calendar size={16} color={Colors.primary} />
                                <h3 style={styles.dayTitle}>{dia || 'No Asignado'}</h3>
                                <button
                                    style={styles.addSmallBtnHeader}
                                    onClick={() => openSelector(dia === "No Asignado" ? null : dia)}
                                >
                                    <Plus size={14} /> Añadir a este día
                                </button>
                            </div>

                            <div style={styles.dayContent}>
                                {/* Warmups */}
                                {diaGroups.calentamiento.length > 0 && (
                                    <div style={styles.categorySubSection}>
                                        <div style={styles.categoryHeader}>
                                            <span style={styles.categoryDot} />
                                            <span style={styles.categoryLabel}>Calentamiento</span>
                                        </div>
                                        <div style={styles.dayExercisesGrid}>
                                            {diaGroups.calentamiento.map((ex) => (
                                                <ExerciseItem
                                                    key={ex.id}
                                                    ex={ex}
                                                    exercises={exercises}
                                                    editingId={editingId}
                                                    tempExercise={tempExercise}
                                                    handleMove={handleMove}
                                                    handleStartEdit={handleStartEdit}
                                                    handleDeleteExercise={handleDeleteExercise}
                                                    handleSaveExercise={handleSaveExercise}
                                                    setTempExercise={setTempExercise}
                                                    setEditingId={setEditingId}
                                                    availableDays={trainingDays}
                                                    onQuickUpdate={(id, fields) => {
                                                        setExercises(prev => prev.map(ex => ex.id === id ? { ...ex, ...fields } : ex));
                                                        if (fields.dia !== undefined) {
                                                            setTempExercise(prev => prev ? { ...prev, dia: fields.dia } : null);
                                                        }
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Main Routine */}
                                {diaGroups.rutina.length > 0 && (
                                    <div style={styles.categorySubSection}>
                                        <div style={styles.categoryHeader}>
                                            <span style={{ ...styles.categoryDot, background: Colors.primary }} />
                                            <span style={styles.categoryLabel}>Rutina Principal</span>
                                        </div>
                                        <div style={styles.dayExercisesGrid}>
                                            {diaGroups.rutina.map((ex) => (
                                                <ExerciseItem
                                                    key={ex.id}
                                                    ex={ex}
                                                    exercises={exercises}
                                                    editingId={editingId}
                                                    tempExercise={tempExercise}
                                                    handleMove={handleMove}
                                                    handleStartEdit={handleStartEdit}
                                                    handleDeleteExercise={handleDeleteExercise}
                                                    handleSaveExercise={handleSaveExercise}
                                                    setTempExercise={setTempExercise}
                                                    setEditingId={setEditingId}
                                                    availableDays={trainingDays}
                                                    onQuickUpdate={(id, fields) => {
                                                        setExercises(prev => prev.map(ex => ex.id === id ? { ...ex, ...fields } : ex));
                                                        if (fields.dia !== undefined) {
                                                            setTempExercise(prev => prev ? { ...prev, dia: fields.dia } : null);
                                                        }
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div style={styles.globalAddSection}>
                    <button style={styles.addGlobalBtn} onClick={() => openSelector(null)}>
                        <Plus size={20} /> Añadir Ejercicio que falta
                    </button>
                    <p style={styles.addGlobalHint}>El ejercicio se añadirá a la lista y podrás asignarle su día y categoría.</p>
                </div>

                {exercises.length === 0 && (
                    <div style={styles.empty}>
                        <AlertCircle size={40} color={Colors.textMuted} />
                        <p>No se encontraron ejercicios.</p>
                    </div>
                )}

                {/* Visual spacer for footer */}
                <div style={{ height: '140px' }}></div>
            </div>

            <div style={styles.footer}>
                <button style={styles.cancelActionBtn} onClick={onCancel}>
                    Cancelar
                </button>
                <button
                    style={styles.confirmBtn}
                    onClick={handleConfirmAll}
                    disabled={exercises.length === 0}
                >
                    <Check size={20} /> Establecer Rutina
                </button>
            </div>

            {showSelector && (
                <ExerciseSelector
                    onClose={() => setShowSelector(false)}
                    onSelect={handleSelectExercise}
                />
            )}
        </div>
    );
};

interface ExerciseItemProps {
    ex: EjercicioRutina;
    exercises: EjercicioRutina[];
    editingId: string | null;
    tempExercise: EjercicioRutina | null;
    handleMove: (idx: number, dir: 'up' | 'down') => void;
    handleStartEdit: (ex: EjercicioRutina) => void;
    handleDeleteExercise: (id: string) => void;
    handleSaveExercise: (ex: EjercicioRutina, days: string[]) => void;
    setTempExercise: (ex: EjercicioRutina) => void;
    setEditingId: (id: string | null) => void;
    availableDays: string[];
    onQuickUpdate: (id: string, fields: Partial<EjercicioRutina>) => void;
}

const ExerciseItem: React.FC<ExerciseItemProps> = ({
    ex, exercises, editingId, tempExercise, handleMove, handleStartEdit, handleDeleteExercise, handleSaveExercise, setTempExercise, setEditingId, availableDays, onQuickUpdate
}) => {
    const globalIndex = exercises.findIndex(e => e.id === ex.id);
    const isEditing = editingId === ex.id && tempExercise;

    // Track selected days locally for the multi-select
    const [localSelectedDays, setLocalSelectedDays] = useState<string[]>(ex.dia ? [ex.dia] : []);
    const [isProgressive, setIsProgressive] = useState(ex.repeticiones.includes(',') || ex.repeticiones.includes('/'));

    const toggleDay = (day: string) => {
        const isSelected = localSelectedDays.includes(day);
        const newDays = isSelected
            ? localSelectedDays.filter(d => d !== day)
            : [...localSelectedDays, day];

        setLocalSelectedDays(newDays);

        // Instant feedback: update the parent's "dia" property.
        // This causes the card to "jump" to the target day section immediately.
        if (newDays.length > 0) {
            onQuickUpdate(ex.id, { dia: newDays[0] });
        } else {
            onQuickUpdate(ex.id, { dia: undefined });
        }
    };

    const handleProgressiveRepChange = (val: string, index: number) => {
        if (!tempExercise) return;
        const currentReps = tempExercise.repeticiones.split(/[,/]/).map(r => r.trim());
        // Fill or truncate to match series
        const newReps = Array.from({ length: tempExercise.series || 0 }, (_, i) => currentReps[i] || currentReps[0] || '');
        newReps[index] = val;
        setTempExercise({ ...tempExercise, repeticiones: newReps.filter(r => r !== '').join(', ') });
    };

    return (
        <Card style={styles.exerciseCard}>
            {isEditing ? (
                <div style={styles.editForm}>
                    <input
                        style={styles.editInput}
                        value={tempExercise.nombre}
                        onChange={(e) => setTempExercise({ ...tempExercise, nombre: e.target.value })}
                    />
                    <div style={styles.editRow}>
                        <div style={styles.editCol}>
                            <label style={styles.editLabel}>Series</label>
                            <input
                                type="number"
                                style={styles.editInputSmall}
                                value={tempExercise.series}
                                onChange={(e) => setTempExercise({ ...tempExercise, series: parseInt(e.target.value) || 0 })}
                            />
                            <div
                                onClick={() => setIsProgressive(!isProgressive)}
                                style={styles.progressiveCheckboxRow}
                            >
                                <div style={{
                                    ...styles.checkbox,
                                    borderColor: isProgressive ? Colors.primary : Colors.border,
                                    background: isProgressive ? Colors.primary : 'transparent'
                                }}>
                                    {isProgressive && <Check size={10} color="#000" />}
                                </div>
                                <span style={{
                                    ...styles.checkboxLabel,
                                    color: isProgressive ? Colors.text : Colors.textTertiary
                                }}>Progresiva</span>
                            </div>
                        </div>
                        <div style={styles.editCol}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <label style={styles.editLabel}>Reps</label>
                            </div>

                            {isProgressive ? (
                                <div style={styles.progressiveGrid}>
                                    {Array.from({ length: tempExercise.series || 0 }).map((_, i) => (
                                        <div key={i} style={styles.progInputWrapper}>
                                            <span style={styles.progLabel}>S{i + 1}</span>
                                            <input
                                                style={styles.editInputSmallProg}
                                                value={tempExercise.repeticiones.split(/[,/]/)[i] || ''}
                                                onChange={(e) => handleProgressiveRepChange(e.target.value, i)}
                                                placeholder="10"
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <input
                                    style={styles.editInputSmall}
                                    value={tempExercise.repeticiones}
                                    onChange={(e) => setTempExercise({ ...tempExercise, repeticiones: e.target.value })}
                                    placeholder="e.g. 12-15"
                                />
                            )}
                        </div>
                        <div style={styles.editCol}>
                            <label style={styles.editLabel}>Segundos</label>
                            <input
                                type="number"
                                style={styles.editInputSmall}
                                value={tempExercise.segundos || ''}
                                onChange={(e) => setTempExercise({ ...tempExercise, segundos: e.target.value ? parseInt(e.target.value) : undefined })}
                                placeholder="Ej: 30"
                            />
                        </div>
                    </div>

                    <div style={styles.editRow}>
                        <div style={{ ...styles.editCol, flex: 2 }}>
                            <label style={styles.editLabel}>Días (Multiselección)</label>
                            <div style={styles.dayChipsRow}>
                                {availableDays.map(day => {
                                    const isSelected = localSelectedDays.includes(day);
                                    return (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => toggleDay(day)}
                                            style={{
                                                ...styles.dayChip,
                                                background: isSelected ? Colors.primary : Colors.surfaceLight,
                                                color: isSelected ? '#000' : Colors.textSecondary,
                                                borderColor: isSelected ? Colors.primary : Colors.border,
                                            }}
                                        >
                                            {day.slice(0, 2)}
                                        </button>
                                    );
                                })}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setLocalSelectedDays([]);
                                        onQuickUpdate(ex.id, { dia: undefined });
                                    }}
                                    style={{
                                        ...styles.dayChip,
                                        background: localSelectedDays.length === 0 ? Colors.error : Colors.surfaceLight,
                                        color: localSelectedDays.length === 0 ? '#FFF' : Colors.textSecondary,
                                        borderColor: Colors.border,
                                    }}
                                >
                                    Limpiar
                                </button>
                            </div>
                        </div>
                    </div>

                    <div style={styles.editRow}>
                        <div style={styles.editCol}>
                            <label style={styles.editLabel}>Categoría</label>
                            <select
                                style={styles.editInputSmall}
                                value={tempExercise.categoria || 'maquina'}
                                onChange={(e) => setTempExercise({ ...tempExercise, categoria: e.target.value as any })}
                            >
                                <option value="calentamiento">🔥 Calentamiento</option>
                                <option value="maquina">💪 Rutina</option>
                            </select>
                        </div>
                        <div style={styles.editCol}>
                            <label style={styles.editLabel}>Enfoque</label>
                            <select
                                style={styles.editInputSmall}
                                value={tempExercise.enfocadoA || 'ambos'}
                                onChange={(e) => setTempExercise({ ...tempExercise, enfocadoA: e.target.value as any })}
                            >
                                <option value="ambos">Ambos</option>
                                <option value="hombre">Hombre</option>
                                <option value="mujer">Mujer</option>
                            </select>
                        </div>
                    </div>
                    <div style={styles.editActions}>
                        <button style={styles.saveBtn} onClick={() => handleSaveExercise(tempExercise, localSelectedDays)}>
                            <Save size={16} /> Guardar
                        </button>
                        <button style={styles.cancelBtn} onClick={() => {
                            setEditingId(null);
                            setLocalSelectedDays(ex.dia ? [ex.dia] : []);
                        }}>
                            <X size={16} />
                        </button>
                    </div>
                </div>
            ) : (
                <div style={styles.viewRow}>
                    <div style={styles.orderControls}>
                        <button onClick={() => handleMove(globalIndex, 'up')} disabled={globalIndex === 0}>
                            <ChevronUp size={16} color={globalIndex === 0 ? Colors.textMuted : Colors.text} />
                        </button>
                        <button onClick={() => handleMove(globalIndex, 'down')} disabled={globalIndex === exercises.length - 1}>
                            <ChevronDown size={16} color={globalIndex === exercises.length - 1 ? Colors.textMuted : Colors.text} />
                        </button>
                    </div>
                    <div style={styles.exInfo}>
                        <div style={styles.exNameRow}>
                            <h4 style={styles.exName}>{ex.nombre}</h4>
                            {ex.enfocadoA && ex.enfocadoA !== 'ambos' && (
                                <span style={{
                                    ...styles.focusBadge,
                                    background: ex.enfocadoA === 'mujer' ? '#FF408120' : '#2196F320',
                                    color: ex.enfocadoA === 'mujer' ? '#FF4081' : '#2196F3',
                                }}>
                                    {ex.enfocadoA === 'mujer' ? '♀️' : '♂️'} {ex.enfocadoA}
                                </span>
                            )}
                        </div>
                        <p style={styles.exDetails}>
                            {ex.series} series • {ex.repeticiones ? `${ex.repeticiones} reps` : ''}{ex.repeticiones && ex.segundos ? ' + ' : ''}{ex.segundos ? `${ex.segundos} seg` : ''} • {ex.descanso}s descanso
                        </p>
                    </div>
                    <div style={styles.actions}>
                        <button style={styles.iconBtn} onClick={() => handleStartEdit(ex)}>
                            <Edit2 size={18} color={Colors.primary} />
                        </button>
                        <button style={styles.iconBtn} onClick={() => handleDeleteExercise(ex.id)}>
                            <Trash2 size={18} color={Colors.error} />
                        </button>
                    </div>
                </div>
            )}
        </Card>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        width: '100%',
        maxWidth: '1200px', // Aumentado para desktop
        height: '100%',
        margin: '0 auto',
        padding: '20px',
        animation: 'fadeIn 0.3s ease-out',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        marginBottom: '20px',
    },
    title: {
        fontSize: '24px',
        fontWeight: 800,
        color: Colors.text,
        marginBottom: '6px',
    },
    subtitle: {
        fontSize: '14px',
        color: Colors.textSecondary,
    },
    scrollContainer: {
        flex: 1,
        overflowY: 'auto',
        paddingRight: '8px',
        // Estilización de scrollbar
        scrollbarWidth: 'thin',
        scrollbarColor: `${Colors.border} transparent`,
    },
    inputGroup: {
        marginBottom: '20px',
        maxWidth: '400px',
    },
    label: {
        display: 'block',
        fontSize: '12px',
        fontWeight: 600,
        color: Colors.textTertiary,
        marginBottom: '8px',
        textTransform: 'uppercase',
        letterSpacing: '1px',
    },
    input: {
        width: '100%',
        padding: '14px 16px',
        background: Colors.surface,
        border: `1px solid ${Colors.border}`,
        borderRadius: '12px',
        color: Colors.text,
        fontSize: '16px',
        outline: 'none',
    },
    statsRow: {
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        maxWidth: '600px',
    },
    statBox: {
        flex: 1,
        padding: '12px',
        background: Colors.surface,
        borderRadius: '12px',
        border: `1px solid ${Colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    statLabel: {
        fontSize: '10px',
        color: Colors.textTertiary,
        textTransform: 'uppercase',
        marginBottom: '4px',
    },
    statVal: {
        fontSize: '16px',
        fontWeight: 800,
        color: Colors.text,
    },
    exerciseList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
    },
    daySection: {
        width: '100%',
    },
    dayHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px',
        paddingBottom: '8px',
        borderBottom: `1px solid ${Colors.border}`,
    },
    dayTitle: {
        fontSize: '18px',
        fontWeight: 800,
        color: Colors.primary,
        margin: 0,
    },
    dayExercisesGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', // Grid responsive
        gap: '16px',
    },
    exerciseCard: {
        padding: '16px',
        background: Colors.surface,
        border: `1px solid ${Colors.border}`,
    },
    viewRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    },
    orderControls: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
    },
    exInfo: {
        flex: 1,
    },
    exName: {
        fontSize: '16px',
        fontWeight: 700,
        color: Colors.text,
        margin: '0 0 4px 0',
    },
    exDetails: {
        fontSize: '13px',
        color: Colors.textSecondary,
        margin: 0,
    },
    actions: {
        display: 'flex',
        gap: '8px',
    },
    iconBtn: {
        padding: '8px',
        borderRadius: '8px',
        background: Colors.surfaceLight,
        cursor: 'pointer',
        border: 'none',
    },
    editForm: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    editInput: {
        padding: '10px 12px',
        background: Colors.surfaceLight,
        border: `1px solid ${Colors.primary}40`,
        borderRadius: '8px',
        color: Colors.text,
        fontSize: '15px',
        outline: 'none',
    },
    editRow: {
        display: 'flex',
        gap: '12px',
    },
    editCol: {
        flex: 1,
    },
    editLabel: {
        display: 'block',
        fontSize: '10px',
        color: Colors.textTertiary,
        marginBottom: '4px',
    },
    editInputSmall: {
        width: '100%',
        padding: '10px',
        background: Colors.surfaceLight,
        border: `1px solid ${Colors.border}`,
        borderRadius: '8px',
        color: Colors.text,
        fontSize: '14px',
        outline: 'none',
    },
    editActions: {
        display: 'flex',
        gap: '8px',
        marginTop: '8px',
    },
    saveBtn: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '10px',
        background: Colors.primary,
        color: '#000',
        borderRadius: '8px',
        fontWeight: 700,
        fontSize: '13px',
        cursor: 'pointer',
        border: 'none',
    },
    cancelBtn: {
        padding: '10px',
        background: Colors.surfaceLight,
        color: Colors.text,
        borderRadius: '8px',
        cursor: 'pointer',
        border: `1px solid ${Colors.border}`,
    },
    footer: {
        position: 'absolute', // Cambiado a absolute relativo al contenedor modal
        bottom: 0,
        left: 0,
        right: 0,
        padding: '20px',
        background: 'rgba(10, 10, 11, 0.95)',
        backdropFilter: 'blur(10px)',
        borderTop: `1px solid ${Colors.border}`,
        display: 'flex',
        gap: '12px',
        zIndex: 100,
    },
    cancelActionBtn: {
        flex: 1,
        padding: '16px',
        background: Colors.surface,
        color: Colors.text,
        borderRadius: '16px',
        fontWeight: 600,
        cursor: 'pointer',
        border: `1px solid ${Colors.border}`,
    },
    confirmBtn: {
        flex: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        padding: '16px',
        background: Colors.primary,
        color: '#000',
        borderRadius: '16px',
        fontWeight: 800,
        fontSize: '16px',
        cursor: 'pointer',
        border: 'none',
    },
    empty: {
        padding: '60px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        color: Colors.textSecondary,
    },
    exNameRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '4px',
    },
    focusBadge: {
        fontSize: '10px',
        fontWeight: 800,
        padding: '2px 8px',
        borderRadius: '6px',
        textTransform: 'uppercase',
    },
    categorySubSection: {
        marginBottom: '24px',
    },
    categoryHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px',
        paddingLeft: '4px',
    },
    categoryDot: {
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: Colors.accent,
    },
    categoryLabel: {
        fontSize: '11px',
        fontWeight: 800,
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    dayContent: {
        paddingTop: '8px',
    },
    addSmallBtnHeader: {
        marginLeft: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        background: `${Colors.primary}15`,
        color: Colors.primary,
        border: 'none',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    globalAddSection: {
        margin: '40px 0',
        padding: '32px',
        background: Colors.surface,
        borderRadius: '24px',
        border: `2px dashed ${Colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        textAlign: 'center',
    },
    addGlobalBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '14px 24px',
        background: Colors.surfaceLight,
        color: Colors.text,
        border: `1px solid ${Colors.border}`,
        borderRadius: '14px',
        fontSize: '15px',
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    },
    addGlobalHint: {
        fontSize: '12px',
        color: Colors.textTertiary,
        margin: 0,
    },
    dayChipsRow: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        marginTop: '2px',
    },
    dayChip: {
        padding: '6px 10px',
        borderRadius: '8px',
        fontSize: '11px',
        fontWeight: 700,
        border: '1px solid',
        cursor: 'pointer',
        transition: 'all 0.2s',
        minWidth: '40px',
        textAlign: 'center',
    },
    progressiveToggle: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        background: 'none',
        border: 'none',
        padding: 0,
        fontSize: '10px',
        fontWeight: 700,
        cursor: 'pointer',
        textTransform: 'uppercase',
    },
    progressiveGrid: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
    },
    progInputWrapper: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        flex: '1 1 40px',
        minWidth: '40px',
    },
    progLabel: {
        fontSize: '8px',
        color: Colors.textTertiary,
        textAlign: 'center',
        fontWeight: 700,
    },
    editInputSmallProg: {
        width: '100%',
        padding: '6px 4px',
        background: Colors.surfaceLight,
        border: `1px solid ${Colors.border}`,
        borderRadius: '6px',
        color: Colors.text,
        fontSize: '12px',
        outline: 'none',
        textAlign: 'center',
    },
    progressiveCheckboxRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginTop: '8px',
        cursor: 'pointer',
        userSelect: 'none',
    },
    checkbox: {
        width: '14px',
        height: '14px',
        borderRadius: '4px',
        border: '1.5px solid',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
    },
    checkboxLabel: {
        fontSize: '10px',
        fontWeight: 700,
        textTransform: 'uppercase',
    }
};
