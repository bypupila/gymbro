// =====================================================
// GymBro PWA - Routine Detail Page
// Gestion completa de rutinas: ver, editar, eliminar
// =====================================================

import { Card } from '@/components/Card';
import { ExerciseSelector } from '@/components/ExerciseSelector';
import { TimeInput } from '@/components/TimeInput';
import { EjercicioBase, GRUPOS_MUSCULARES, GrupoMuscularEjercicio } from '@/data/exerciseDatabase';
import { getExerciseImage, getExerciseVideo } from '@/data/exerciseMedia';
import { useUserStore, EjercicioRutina, RutinaUsuario } from '@/stores/userStore';
import Colors from '@/styles/colors';
import {
    AlertTriangle,
    ArrowLeft,
    Calendar,
    ChevronDown,
    ChevronUp,
    Edit3,
    Grip,
    Plus,
    RotateCcw,
    Save,
    Trash2,
    X,
    Sparkles,
    Check,
    Share2,
    Play,
    Flame,
    FileText,
    Dumbbell,
    BookOpen,
} from 'lucide-react';
import React, { useCallback, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoutineUpload } from '@/components/RoutineUpload';
import { reorganizeRoutine } from '@/services/geminiService';
import { firebaseService } from '@/services/firebaseService';
import { routineRequestService } from '@/services/routineRequestService';
import { cleanupRoutineExercises } from '@/utils/routineHelpers';
import { Reorder, useDragControls, DragControls } from 'framer-motion';
import { toast } from 'react-hot-toast';

const debugLog = (...args: unknown[]) => {
    if (import.meta.env.DEV) {
        console.log(...args);
    }
};

const DAY_STYLE: Record<string, { color: string, bg: string }> = {
    'Lunes': { color: '#007AFF', bg: 'rgba(0, 122, 255, 0.05)' },
    'Martes': { color: '#FF2D55', bg: 'rgba(255, 45, 85, 0.05)' },
    'Miercoles': { color: '#FF9500', bg: 'rgba(255, 149, 0, 0.05)' },
    'Jueves': { color: '#5856D6', bg: 'rgba(88, 86, 214, 0.05)' },
    'Viernes': { color: '#34C759', bg: 'rgba(52, 199, 89, 0.05)' },
    'Sibado': { color: '#AF52DE', bg: 'rgba(175, 82, 222, 0.05)' },
    'Domingo': { color: '#FF3B30', bg: 'rgba(255, 59, 48, 0.05)' },
    'default': { color: Colors.primary, bg: 'rgba(0, 230, 153, 0.05)' }
};

const styles: Record<string, React.CSSProperties> = {
    warningBox: {
        background: `${Colors.warning}10`,
        border: `1px solid ${Colors.warning}40`,
        borderRadius: '16px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        margin: '16px 20px',
        width: 'auto',
    },
    warningText: {
        fontSize: '13px',
        color: Colors.text,
        fontWeight: 600,
        lineHeight: 1.4,
    },
    exerciseContentWrapper: {
        display: 'flex',
        flexDirection: 'column',
    },
    exerciseImageWrapper: {
        width: '100%',
        height: '160px',
        borderRadius: '16px 16px 0 0',
        overflow: 'hidden',
        position: 'relative',
        marginBottom: '12px',
        background: Colors.surface,
    },
    exerciseImage: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        opacity: 0.8,
    },
    playOverlay: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '50px',
        height: '50px',
        background: 'rgba(255, 0, 0, 0.9)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: '22px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
        transition: 'transform 0.2s ease',
    },
    calentamientoBadge: {
        position: 'absolute',
        top: '12px',
        right: '12px',
        background: 'rgba(245, 158, 11, 0.9)',
        padding: '4px 8px',
        borderRadius: '8px',
        fontSize: '14px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    },
    container: {
        padding: '20px',
        paddingTop: 'calc(20px + env(safe-area-inset-top, 0px))',
        paddingBottom: '100px',
        minHeight: '100%',
        overflowY: 'auto',
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
    backBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '8px',
    },
    deleteBtn: {
        background: `${Colors.error}15`,
        border: 'none',
        cursor: 'pointer',
        padding: '10px',
        borderRadius: '12px',
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        textAlign: 'center',
    },
    emptyIcon: {
        width: '72px',
        height: '72px',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `${Colors.primary}15`,
        color: Colors.primary,
        marginBottom: '20px',
    },
    emptyTitle: {
        fontSize: '22px',
        fontWeight: 800,
        color: Colors.text,
        margin: '0 0 8px 0',
    },
    emptyText: {
        fontSize: '14px',
        color: Colors.textSecondary,
        marginBottom: '24px',
    },
    createButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '14px 28px',
        background: Colors.primary,
        color: '#000',
        border: 'none',
        borderRadius: '14px',
        fontSize: '15px',
        fontWeight: 700,
        cursor: 'pointer',
    },
    infoCard: {
        marginBottom: '24px',
        padding: '20px',
    },
    routineName: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px',
    },
    routineIcon: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: Colors.primary,
    },
    routineTitle: {
        fontSize: '20px',
        fontWeight: 800,
        color: Colors.text,
        margin: 0,
    },
    expirationBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 16px',
        borderRadius: '12px',
        border: '1px solid',
        marginBottom: '16px',
        flexWrap: 'wrap'
    },
    expirationText: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: '200px'
    },
    expirationTitle: {
        fontSize: '14px',
        fontWeight: 700,
    },
    expirationSubtitle: {
        fontSize: '12px',
        color: Colors.textSecondary,
    },
    renewBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        background: Colors.primary,
        color: '#000',
        border: 'none',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: 700,
        cursor: 'pointer',
    },
    actionButtonsRow: {
        display: 'flex',
        gap: '8px',
        width: '100%',
        marginTop: '12px'
    },
    recalibrateBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        background: Colors.accent,
        color: '#000',
        border: 'none',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: 700,
        cursor: 'pointer',
    },
    progressContainer: {
        marginBottom: '16px',
    },
    progressHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '8px',
    },
    progressLabel: {
        fontSize: '13px',
        color: Colors.textSecondary,
    },
    progressPercent: {
        fontSize: '13px',
        fontWeight: 700,
        color: Colors.primary,
    },
    progressBar: {
        height: '8px',
        background: Colors.surface,
        borderRadius: '4px',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        background: Colors.gradientPrimary,
        borderRadius: '4px',
        transition: 'width 0.3s ease',
    },
    progressDates: {
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '6px',
        fontSize: '11px',
        color: Colors.textTertiary,
    },
    summaryRow: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '24px',
    },
    summaryChip: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        background: Colors.surface,
        borderRadius: '20px',
        border: `1px solid ${Colors.border}`,
    },
    summaryDot: {
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: Colors.primary,
    },
    summaryDayText: {
        fontSize: '11px',
        fontWeight: 700,
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    durationRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    durationText: {
        fontSize: '13px',
        color: Colors.textSecondary,
    },
    aiTag: {
        marginLeft: 'auto',
        padding: '4px 10px',
        background: `${Colors.accent}20`,
        color: Colors.accent,
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
    },
    exercisesHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
    },
    sectionTitle: {
        fontSize: '16px',
        fontWeight: 800,
        color: Colors.text,
        margin: 0,
    },
    addExerciseBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        background: Colors.surface,
        color: Colors.primary,
        border: `1px solid ${Colors.primary}`,
        borderRadius: '10px',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
    },
    exercisesList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
    },
    dayGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '24px',
        borderRadius: '24px',
        border: '1px solid transparent',
        transition: 'all 0.3s ease'
    },
    exercisesGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '16px',
        listStyle: 'none',
        padding: 0,
        margin: 0
    },
    categorySection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '0',
        marginTop: '8px',
    },
    dayHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 16px',
        marginBottom: '8px',
        borderRadius: '16px',
    },
    expandBtn: {
        background: 'none',
        border: 'none',
        padding: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
    },
    dayTitle: {
        fontSize: '18px',
        fontWeight: 900,
        margin: 0,
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
    },
    exerciseCard: {
        padding: '16px',
    },
    exerciseHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    exerciseOrder: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2px',
    },
    exerciseNumber: {
        fontSize: '12px',
        fontWeight: 700,
        color: Colors.textTertiary,
    },
    exerciseInfo: {
        flex: 1,
    },
    exerciseName: {
        fontSize: '15px',
        fontWeight: 700,
        color: Colors.text,
        margin: '0 0 8px 0',
    },
    exerciseDetails: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
    },
    detailChip: {
        padding: '4px 10px',
        background: Colors.surface,
        borderRadius: '6px',
        fontSize: '12px',
        color: Colors.textSecondary,
    },
    exerciseActions: {
        display: 'flex',
        gap: '4px',
    },
    actionBtn: {
        padding: '8px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        borderRadius: '8px',
    },
    editForm: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    editInput: {
        width: '100%',
        padding: '12px 14px',
        background: Colors.surface,
        border: `1px solid ${Colors.border}`,
        borderRadius: '10px',
        color: Colors.text,
        fontSize: '15px',
    },
    editRow: {
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap'
    },
    editField: {
        flex: 1,
        minWidth: '120px'
    },
    editLabel: {
        display: 'block',
        fontSize: '11px',
        color: Colors.textTertiary,
        marginBottom: '4px',
    },
    editInputSmall: {
        width: '100%',
        padding: '10px 12px',
        background: Colors.surface,
        border: `1px solid ${Colors.border}`,
        borderRadius: '8px',
        color: Colors.text,
        fontSize: '14px',
    },
    editActions: {
        display: 'flex',
        gap: '12px',
        marginTop: '4px',
    },
    cancelEditBtn: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '12px',
        background: Colors.surface,
        color: Colors.textSecondary,
        border: 'none',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
    },
    saveEditBtn: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '12px',
        background: Colors.primary,
        color: '#000',
        border: 'none',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: 700,
        cursor: 'pointer',
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
    },
    modal: {
        width: '100%',
        maxWidth: '400px',
        background: Colors.surfaceLight,
        borderRadius: '24px',
        padding: '28px',
        maxHeight: '90vh',
        overflowY: 'auto'
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
    },
    closeModalBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: Colors.textSecondary,
    },
    modalIcon: {
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '16px',
    },
    modalTitle: {
        fontSize: '20px',
        fontWeight: 800,
        color: Colors.text,
        textAlign: 'center',
        margin: 0,
    },
    modalText: {
        fontSize: '14px',
        color: Colors.textSecondary,
        textAlign: 'center',
        margin: '12px 0 24px 0',
        lineHeight: 1.5,
    },
    modalActions: {
        display: 'flex',
        gap: '12px',
    },
    modalCancelBtn: {
        flex: 1,
        padding: '14px',
        background: Colors.surface,
        color: Colors.text,
        border: 'none',
        borderRadius: '12px',
        fontSize: '15px',
        fontWeight: 600,
        cursor: 'pointer',
    },
    modalDeleteBtn: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '14px',
        background: Colors.error,
        color: '#FFF',
        border: 'none',
        borderRadius: '12px',
        fontSize: '15px',
        fontWeight: 700,
        cursor: 'pointer',
    },
    addForm: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    formGroup: {
        flex: 1,
    },
    formRow: {
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap'
    },
    formLabel: {
        display: 'block',
        fontSize: '12px',
        color: Colors.textSecondary,
        marginBottom: '6px',
        fontWeight: 600,
    },
    formInput: {
        width: '100%',
        padding: '12px 14px',
        background: Colors.surface,
        border: `1px solid ${Colors.border}`,
        borderRadius: '10px',
        color: Colors.text,
        fontSize: '15px',
    },
    addExerciseSubmitBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '14px',
        background: Colors.primary,
        color: '#000',
        border: 'none',
        borderRadius: '12px',
        fontSize: '15px',
        fontWeight: 700,
        cursor: 'pointer',
        marginTop: '8px',
    },
    divider: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '16px 0',
        position: 'relative',
    },
    dividerText: {
        padding: '0 12px',
        background: Colors.surfaceLight,
        color: Colors.textTertiary,
        fontSize: '13px',
        fontWeight: 600,
    },
    selectFromDbBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '14px',
        background: Colors.surface,
        color: Colors.text,
        border: `1px solid ${Colors.border}`,
        borderRadius: '12px',
        fontSize: '15px',
        fontWeight: 600,
        cursor: 'pointer',
        width: '100%',
    },
    categoryHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '4px',
    },
    categoryDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: Colors.accent,
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
        background: Colors.surface,
        border: `1px solid ${Colors.border}`,
        borderRadius: '6px',
        color: Colors.text,
        fontSize: '12px',
        outline: 'none',
        textAlign: 'center',
    },
    dayChipsRow: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        marginTop: '6px',
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
    categoryTitle: {
        fontSize: '13px',
        fontWeight: 700,
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: '1px',
        margin: 0,
    },
    muscleGroupHeader: {
        fontSize: '12px',
        fontWeight: 900,
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: '2px',
        marginTop: '24px',
        marginBottom: '12px',
        paddingLeft: '4px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        borderBottom: `1px solid ${Colors.border}`,
        paddingBottom: '8px',
        gridColumn: '1 / -1',
    },
};




interface ExerciseCardProps {
    ejercicio: EjercicioRutina;
    idx: number;
    rutina: RutinaUsuario;
    editingExercise: string | null;
    editedExercise: EjercicioRutina | null;
    setEditedExercise: (ex: EjercicioRutina) => void;
    handleCancelEdit: () => void;
    handleMoveExercise: (idx: number, dir: 'up' | 'down') => void;
    handleStartEdit: (ex: EjercicioRutina) => void;
    handleDeleteExercise: (id: string) => void;
    availableDays: string[];
    onQuickUpdate: (id: string, fields: Partial<EjercicioRutina>) => void;
    setRutina: (rutina: RutinaUsuario | null) => void;
    dragControls?: DragControls;
}

const ExerciseCardComponent: React.FC<ExerciseCardProps> = ({
    ejercicio,
    idx,
    rutina,
    editingExercise,
    editedExercise,
    setEditedExercise,
    handleCancelEdit,
    handleMoveExercise,
    handleStartEdit,
    handleDeleteExercise,
    availableDays,
    onQuickUpdate,
    setRutina,
    dragControls
}) => {
    const originalIndex = rutina.ejercicios.findIndex((e: EjercicioRutina) => e.id === ejercicio.id);
    const [localSelectedDays, setLocalSelectedDays] = useState<string[]>(
        ejercicio.dia && availableDays.includes(ejercicio.dia) ? [ejercicio.dia] : []
    );
    const [isProgressive, setIsProgressive] = useState(ejercicio.repeticiones.includes(',') || ejercicio.repeticiones.includes('/'));

    const toggleDay = (day: string) => {
        const isSelected = localSelectedDays.includes(day);
        const newDays = isSelected
            ? localSelectedDays.filter(d => d !== day)
            : [...localSelectedDays, day];

        setLocalSelectedDays(newDays);

        // Instant feedback
        if (newDays.length > 0) {
            onQuickUpdate(ejercicio.id, { dia: newDays[0] });
        } else {
            onQuickUpdate(ejercicio.id, { dia: undefined });
        }
    };

    const handleProgressiveRepChange = (val: string, index: number) => {
        if (!editedExercise) return;
        const currentReps = editedExercise.repeticiones.split(/[,/]/).map(r => r.trim());
        const newReps = Array.from({ length: editedExercise.series || 0 }, (_, i) => currentReps[i] || currentReps[0] || '');
        newReps[index] = val;
        setEditedExercise({ ...editedExercise, repeticiones: newReps.filter(r => r !== '').join(', ') });
    };

    return (
        <Card key={ejercicio.id} style={styles.exerciseCard}>
            {editingExercise === ejercicio.id && editedExercise ? (
                <div style={styles.editForm}>
                    <input
                        type="text"
                        value={editedExercise.nombre}
                        onChange={(e) => setEditedExercise({
                            ...editedExercise,
                            nombre: e.target.value
                        })}
                        onFocus={(e) => e.target.select()}
                        style={styles.editInput}
                        placeholder="Nombre del ejercicio"
                    />
                    <div style={styles.editRow}>
                        <div style={styles.editField}>
                            <label style={styles.editLabel}>Series</label>
                            <input
                                type="number"
                                value={editedExercise.series}
                                onChange={(e) => setEditedExercise({
                                    ...editedExercise,
                                    series: parseInt(e.target.value) || 0
                                })}
                                onFocus={(e) => e.target.select()}
                                style={styles.editInputSmall}
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
                        <div style={styles.editField}>
                            <label style={styles.editLabel}>Reps</label>
                            {isProgressive ? (
                                <div style={styles.progressiveGrid}>
                                    {Array.from({ length: editedExercise.series || 0 }).map((_, i) => (
                                        <div key={i} style={styles.progInputWrapper}>
                                            <span style={styles.progLabel}>S{i + 1}</span>
                                            <input
                                                style={styles.editInputSmallProg}
                                                value={editedExercise.repeticiones.split(/[,/]/)[i] || ''}
                                                onChange={(e) => handleProgressiveRepChange(e.target.value, i)}
                                                onFocus={(e) => e.target.select()}
                                                placeholder="10"
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <input
                                    type="text"
                                    value={editedExercise.repeticiones}
                                    onChange={(e) => setEditedExercise({
                                        ...editedExercise,
                                        repeticiones: e.target.value
                                    })}
                                    onFocus={(e) => e.target.select()}
                                    style={styles.editInputSmall}
                                    placeholder="e.g. 12-15"
                                />
                            )}
                        </div>
                        <div style={styles.editField}>
                            <TimeInput
                                label="Duracion"
                                value={editedExercise.segundos}
                                onChange={(val) => setEditedExercise({
                                    ...editedExercise,
                                    segundos: val
                                })}
                                allowEmpty={true}
                            />
                        </div>
                        <div style={styles.editField}>
                            <TimeInput
                                label="Descanso"
                                value={editedExercise.descanso}
                                onChange={(val) => setEditedExercise({
                                    ...editedExercise,
                                    descanso: val || 0
                                })}
                            />
                        </div>
                        <div style={styles.editField}>
                            <label style={styles.editLabel}>Opcional</label>
                            <div
                                onClick={() => setEditedExercise({
                                    ...editedExercise,
                                    isOptional: !editedExercise.isOptional
                                })}
                                style={styles.progressiveCheckboxRow}
                            >
                                <div style={{
                                    ...styles.checkbox,
                                    borderColor: editedExercise.isOptional ? Colors.primary : Colors.border,
                                    background: editedExercise.isOptional ? Colors.primary : 'transparent'
                                }}>
                                    {editedExercise.isOptional && <Check size={10} color="#000" />}
                                </div>
                                <span style={{
                                    ...styles.checkboxLabel,
                                    color: editedExercise.isOptional ? Colors.text : Colors.textTertiary
                                }}>{editedExercise.isOptional ? 'Si' : 'No'}</span>
                            </div>
                        </div>
                    </div>
                    <div style={styles.editRow}>
                        <div style={{ ...styles.editField, flex: 1 }}>
                            <label style={styles.editLabel}>Dias (Multiseleccion)</label>
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
                                        onQuickUpdate(ejercicio.id, { dia: undefined });
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
                        <div style={styles.editField}>
                            <label style={styles.editLabel}>Categoria</label>
                            <select
                                value={editedExercise.categoria}
                                onChange={(e) => setEditedExercise({
                                    ...editedExercise,
                                    categoria: e.target.value as 'calentamiento' | 'maquina'
                                })}
                                style={styles.editInput}
                            >
                                <option value="maquina">Rutina Principal</option>
                                <option value="calentamiento">Calentamiento</option>
                            </select>
                        </div>
                        <div style={styles.editField}>
                            <label style={styles.editLabel}>Enfocado a</label>
                            <select
                                value={editedExercise.enfocadoA || 'ambos'}
                                onChange={(e) => setEditedExercise({
                                    ...editedExercise,
                                    enfocadoA: e.target.value as 'hombre' | 'mujer' | 'ambos'
                                })}
                                style={styles.editInput}
                            >
                                <option value="ambos">Ambos</option>
                                <option value="hombre">Hombre</option>
                                <option value="mujer">Mujer</option>
                            </select>
                        </div>
                        <div style={styles.editField}>
                            <label style={styles.editLabel}>Grupo Muscular</label>
                            <select
                                value={editedExercise.grupoMuscular || ''}
                                onChange={(e) => setEditedExercise({
                                    ...editedExercise,
                                    grupoMuscular: e.target.value
                                })}
                                style={styles.editInput}
                            >
                                <option value="">Sin asignar</option>
                                {Object.entries(GRUPOS_MUSCULARES)
                                    .filter(([key]) => key !== 'calentamiento')
                                    .map(([key, value]) => (
                                        <option key={key} value={key}>
                                            {value.nombre}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    </div>
                    <div style={styles.editActions}>
                        <button style={styles.cancelEditBtn} onClick={() => {
                            handleCancelEdit();
                            setLocalSelectedDays(ejercicio.dia && availableDays.includes(ejercicio.dia) ? [ejercicio.dia] : []);
                        }}>
                            <X size={16} />
                            Cancelar
                        </button>
                        <button style={styles.saveEditBtn} onClick={() => {
                            if (editedExercise && rutina) {
                                if (localSelectedDays.length === 0) {
                                    const finalExercise = { ...editedExercise, dia: undefined };
                                    setEditedExercise(finalExercise);
                                    const updatedEjercicios = rutina.ejercicios.map((ej: EjercicioRutina) =>
                                        ej.id === editedExercise.id ? finalExercise : ej
                                    );
                                    setRutina({ ...rutina, ejercicios: updatedEjercicios });
                                    handleCancelEdit();
                                } else if (localSelectedDays.length === 1) {
                                    const finalExercise = { ...editedExercise, dia: localSelectedDays[0] };
                                    const updatedEjercicios = rutina.ejercicios.map((ej: EjercicioRutina) =>
                                        ej.id === editedExercise.id ? finalExercise : ej
                                    );
                                    setRutina({ ...rutina, ejercicios: updatedEjercicios });
                                    handleCancelEdit();
                                } else {
                                    const firstDay = localSelectedDays[0];
                                    const otherDays = localSelectedDays.slice(1);
                                    const updatedBase = { ...editedExercise, dia: firstDay };
                                    const Clones = otherDays.map(day => ({
                                        ...editedExercise,
                                        id: crypto.randomUUID(),
                                        dia: day
                                    }));
                                    const newExercises = rutina.ejercicios.flatMap((ej: EjercicioRutina) =>
                                        ej.id === editedExercise.id ? [updatedBase, ...Clones] : [ej]
                                    );
                                    setRutina({
                                        ...rutina,
                                        ejercicios: cleanupRoutineExercises(newExercises)
                                    });
                                    handleCancelEdit();
                                }
                            }
                        }}>
                            <Save size={16} />
                            Guardar
                        </button>
                    </div>
                </div>
            ) : (
                <div style={styles.exerciseContentWrapper}>
                    {(() => {
                        const videoUrl = getExerciseVideo(ejercicio.nombre);
                        const imageContent = (
                            <>
                                <img
                                    src={ejercicio.imagen || getExerciseImage(ejercicio.nombre, ejercicio.grupoMuscular)}
                                    alt={ejercicio.nombre}
                                    style={styles.exerciseImage}
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&auto=format&fit=crop';
                                    }}
                                />
                                {videoUrl && (
                                    <div style={styles.playOverlay}>
                                        <Play size={20} color="#fff" fill="#fff" />
                                    </div>
                                )}
                                {ejercicio.categoria === 'calentamiento' && (
                                    <div style={styles.calentamientoBadge}>
                                        <Flame size={14} color="#fff" />
                                    </div>
                                )}
                            </>
                        );

                        return videoUrl ? (
                            <a
                                href={videoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ ...styles.exerciseImageWrapper, textDecoration: 'none', cursor: 'pointer', display: 'block' }}
                            >
                                {imageContent}
                            </a>
                        ) : (
                            <div style={styles.exerciseImageWrapper}>
                                {imageContent}
                            </div>
                        );
                    })()}

                    <div style={styles.exerciseHeader}>
                        <div
                            style={{ ...styles.exerciseOrder, cursor: 'grab', touchAction: 'none' }}
                            onPointerDown={(e) => dragControls?.start(e)}
                        >
                            <Grip size={16} color={Colors.textTertiary} />
                            <span style={styles.exerciseNumber}>{idx + 1}</span>
                        </div>
                        <div style={styles.exerciseInfo}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                {ejercicio.grupoMuscular && (
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: 900,
                                        padding: '4px 12px',
                                        borderRadius: '12px',
                                        background: GRUPOS_MUSCULARES[ejercicio.grupoMuscular as GrupoMuscularEjercicio]?.color || Colors.primary,
                                        color: '#000',
                                        textTransform: 'uppercase',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                    }}>
                                        {GRUPOS_MUSCULARES[ejercicio.grupoMuscular as GrupoMuscularEjercicio]?.nombre || ejercicio.grupoMuscular}
                                    </span>
                                )}
                            </div>
                            <h4 style={{ ...styles.exerciseName, fontSize: '18px', marginBottom: '4px' }}>{ejercicio.nombre}</h4>
                            <div style={styles.exerciseDetails}>
                                <span style={styles.detailChip}>
                                    {ejercicio.series} series
                                </span>
                                <span style={styles.detailChip}>
                                    {ejercicio.repeticiones ? `${ejercicio.repeticiones} reps` : ''}
                                    {ejercicio.repeticiones && ejercicio.segundos ? ' + ' : ''}
                                    {ejercicio.segundos ? `${ejercicio.segundos} seg` : ''}
                                </span>
                                <span style={styles.detailChip}>
                                    Descanso {ejercicio.descanso}s
                                </span>
                            </div>
                        </div>
                        <div style={styles.exerciseActions}>
                            <button
                                style={styles.actionBtn}
                                onClick={() => handleMoveExercise(originalIndex, 'up')}
                                disabled={originalIndex === 0}
                            >
                                <ChevronUp size={18} color={originalIndex === 0 ? Colors.textTertiary : Colors.text} />
                            </button>
                            <button
                                style={styles.actionBtn}
                                onClick={() => handleMoveExercise(originalIndex, 'down')}
                                disabled={originalIndex === rutina.ejercicios.length - 1}
                            >
                                <ChevronDown size={18} color={originalIndex === rutina.ejercicios.length - 1 ? Colors.textTertiary : Colors.text} />
                            </button>
                            <button
                                style={styles.actionBtn}
                                onClick={() => handleStartEdit(ejercicio)}
                            >
                                <Edit3 size={18} color={Colors.primary} />
                            </button>
                            <button
                                style={styles.actionBtn}
                                onClick={() => handleDeleteExercise(ejercicio.id)}
                            >
                                <Trash2 size={18} color={Colors.error} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
};





const generateSafeId = () => {
    try {
        return crypto.randomUUID();
    } catch {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
};

const DraggableExerciseCard = (props: ExerciseCardProps) => {
    const dragControls = useDragControls();

    return (
        <Reorder.Item
            value={props.ejercicio}
            dragListener={false}
            dragControls={dragControls}
            style={{ listStyle: 'none' }}
            whileDrag={{ scale: 1.02, zIndex: 10 }}
        >
            <ExerciseCardComponent {...props} dragControls={dragControls} />
        </Reorder.Item>
    );
};

export const RoutineDetailPage: React.FC = () => {
    const navigate = useNavigate();
    const perfil = useUserStore((state) => state.perfil);
    const setRutina = useUserStore((state) => state.setRutina);
    const userId = useUserStore((state) => state.userId);
    const rutina = perfil.rutina;

    const updateRoutine = useCallback(async (newRoutine: RutinaUsuario | null) => {
        if (!userId) {
            setRutina(newRoutine);
            return;
        }

        const previousRoutine = rutina;

        // Optimistic update
        setRutina(newRoutine);

        try {
            // Immediate save to cloud
            await firebaseService.saveRoutine(userId, newRoutine);
        } catch (error) {
            console.error('[RoutineDetailPage] Failed to save routine:', error);
            toast.error('No se pudo guardar la rutina. Re-sincronizando desde la nube...');

            try {
                const cloudProfile = await firebaseService.getProfile(userId);
                useUserStore.setState((state) => ({
                    perfil: {
                        ...state.perfil,
                        rutina: cloudProfile?.rutina ?? previousRoutine ?? null,
                    }
                }));
            } catch (syncError) {
                console.error('[RoutineDetailPage] Failed to re-sync routine after save error:', syncError);
                useUserStore.setState((state) => ({
                    perfil: {
                        ...state.perfil,
                        rutina: previousRoutine ?? null,
                    }
                }));
            }
        }
    }, [rutina, setRutina, userId]);

    const [editingExercise, setEditingExercise] = useState<string | null>(null);
    const [editedExercise, setEditedExercise] = useState<EjercicioRutina | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
    const [showExerciseSelector, setShowExerciseSelector] = useState(false);
    const [showRecalibrateModal, setShowRecalibrateModal] = useState(false);

    const [isReorganizing, setIsReorganizing] = useState(false);
    const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
    const [showWarning, setShowWarning] = useState(true);

    const toggleDayCollapse = (day: string) => {
        const newCollapsed = new Set(collapsedDays);
        if (newCollapsed.has(day)) {
            newCollapsed.delete(day);
        } else {
            newCollapsed.add(day);
        }
        setCollapsedDays(newCollapsed);
    };

    // Sharing state
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareAlias, setShareAlias] = useState('');
    const [isSharing, setIsSharing] = useState(false);

    const handleShareRoutine = async () => {
        if (!shareAlias.trim() || !rutina || !userId) return;
        setIsSharing(true);
        try {
            const target = await firebaseService.findUserByAlias(shareAlias.trim());
            if (!target) {
                toast.error('Usuario no encontrado');
                return;
            }

            await routineRequestService.createRequest({
                fromUserId: userId,
                fromName: perfil.usuario.nombre || perfil.alias || 'GymBro',
                toUserId: target.id,
                toName: target.name,
                sourceUserId: userId,
                targetUserId: target.id,
                type: 'copy_my_routine_to_partner',
                syncAfterAccept: false,
            });

            toast.success('Solicitud enviada');
            setShowShareModal(false);
            setShareAlias('');
        } catch (error) {
            console.error('[RoutineDetailPage] Error compartiendo rutina:', error);
            toast.error('No se pudo compartir la rutina. Intentalo de nuevo.');
        } finally {
            setIsSharing(false);
        }
    };

    const [newExercise, setNewExercise] = useState<Partial<EjercicioRutina>>({
        nombre: '',
        series: 3,
        repeticiones: '10-12',
        descanso: 60,
        categoria: 'maquina',
        grupoMuscular: ''
    });
    const [newExerciseDays, setNewExerciseDays] = useState<string[]>([]);

    const handleIAOrganize = async () => {
        if (!rutina || isReorganizing) return;

        setIsReorganizing(true);
        try {
            const result = await reorganizeRoutine(rutina.ejercicios);
            updateRoutine({
                ...rutina,
                ejercicios: cleanupRoutineExercises(result.exercises),
                nombre: result.routineName || rutina.nombre
            });
            toast.success("Rutina organizada con exito por la IA!");
        } catch (error) {
            console.error(error);
            toast.error("No se pudo organizar la rutina con IA.");
        } finally {
            setIsReorganizing(false);
        }
    };

    React.useEffect(() => {
        if (rutina?.ejercicios) {
            const cleaned = cleanupRoutineExercises(rutina.ejercicios);
            if (cleaned.length !== rutina.ejercicios.length) {
                debugLog("Auto-cleaning duplicates on mount");
                updateRoutine({ ...rutina, ejercicios: cleaned });
            }
        }
    }, [rutina, rutina?.ejercicios?.length, updateRoutine]);

    const exercisesByDay = useMemo(() => {
        if (!rutina) return {};
        const groups: Record<string, { calentamiento: EjercicioRutina[], rutina: EjercicioRutina[] }> = {};

        rutina.ejercicios.forEach(exercise => {
            const day = (exercise.dia && exercise.dia.trim().length > 0) ? exercise.dia.trim() : 'No Asignado';
            if (!groups[day]) groups[day] = { calentamiento: [], rutina: [] };

            if (exercise.categoria === 'calentamiento') {
                groups[day].calentamiento.push(exercise);
            } else {
                groups[day].rutina.push(exercise);
            }
        });

        return groups;
    }, [rutina]);

    const workoutDaysSummary = useMemo(() => {
        if (!rutina) return [];
        return Array.from(new Set(rutina.ejercicios.map(e => e.dia && e.dia.trim().length > 0 ? e.dia.trim() : 'No Asignado')));
    }, [rutina]);

    const routineInfo = useMemo(() => {
        if (!rutina) return null;
        const fechaInicio = new Date(rutina.fechaInicio);
        const fechaFin = new Date(fechaInicio);
        fechaFin.setDate(fechaFin.getDate() + rutina.duracionSemanas * 7);
        const hoy = new Date();
        const diasRestantes = Math.ceil((fechaFin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        const diasTranscurridos = Math.floor((hoy.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
        const progreso = Math.min(100, Math.max(0, (diasTranscurridos / (rutina.duracionSemanas * 7)) * 100));
        const expirada = diasRestantes <= 0;
        const proximaACaducar = diasRestantes > 0 && diasRestantes <= 7;
        return {
            fechaInicio, fechaFin, diasRestantes, diasTranscurridos, progreso, expirada, proximaACaducar
        };
    }, [rutina]);

    if (!rutina) {
        return (
            <div style={styles.container}>
                <div style={styles.headerBar}>
                    <button style={styles.backBtn} onClick={() => navigate(-1)}>
                        <ArrowLeft size={24} color="#FFF" />
                    </button>
                    <h1 style={styles.headerTitle}>MI RUTINA</h1>
                    <div style={{ width: 40 }} />
                </div>
                <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}><FileText size={28} /></div>
                    <h2 style={styles.emptyTitle}>Sin rutina activa</h2>
                    <p style={styles.emptyText}>Crea tu primera rutina para empezar a entrenar</p>
                    <button style={styles.createButton} onClick={() => navigate('/')}>
                        <Plus size={20} /> Crear Rutina
                    </button>
                </div>
            </div>
        );
    }

    const handleDeleteRoutine = () => {
        updateRoutine(null);
        setShowDeleteModal(false);
        navigate('/');
    };

    const handleStartEdit = (ejercicio: EjercicioRutina) => {
        setEditingExercise(ejercicio.id);
        setEditedExercise({ ...ejercicio });
    };

    const handleCancelEdit = () => {
        setEditingExercise(null);
        setEditedExercise(null);
    };

    const handleDeleteExercise = (id: string) => {
        if (!rutina) return;

        toast((t) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>Eliminar este ejercicio?</span>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px' }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => {
                            const updatedEjercicios = rutina.ejercicios.filter(ej => ej.id !== id);
                            updateRoutine({ ...rutina, ejercicios: updatedEjercicios });
                            toast.dismiss(t.id);
                            toast.success('Ejercicio eliminado');
                        }}
                        style={{ background: Colors.error, border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}
                    >
                        Eliminar
                    </button>
                </div>
            </div>
        ), { duration: 5000 });
    };

    const handleMoveExercise = (index: number, direction: 'up' | 'down') => {
        if (!rutina) return;
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= rutina.ejercicios.length) return;
        const newEjercicios = [...rutina.ejercicios];
        [newEjercicios[index], newEjercicios[newIndex]] = [newEjercicios[newIndex], newEjercicios[index]];
        updateRoutine({ ...rutina, ejercicios: newEjercicios });
    };

    const handleGroupReorder = (newSubset: EjercicioRutina[]) => {
        if (!rutina) return;
        const subsetIds = new Set(newSubset.map(e => e.id));
        const originalIndices = rutina.ejercicios
            .map((e, i) => subsetIds.has(e.id) ? i : -1)
            .filter(i => i !== -1);
        if (originalIndices.length !== newSubset.length) return;
        const newGlobalList = [...rutina.ejercicios];
        originalIndices.forEach((globalIndex, i) => {
            newGlobalList[globalIndex] = newSubset[i];
        });
        updateRoutine({ ...rutina, ejercicios: newGlobalList });
    };

    const handleAddExercise = () => {
        if (!rutina || !newExercise.nombre) return;

        const baseFields = {
            nombre: newExercise.nombre || '',
            series: newExercise.series || 3,
            repeticiones: newExercise.repeticiones || '10-12',
            descanso: newExercise.descanso || 60,
            segundos: newExercise.segundos,
            categoria: newExercise.categoria || 'maquina',
            grupoMuscular: newExercise.grupoMuscular,
            enfocadoA: newExercise.enfocadoA,
        };

        let nuevosEjercicios: EjercicioRutina[];

        if (newExerciseDays.length === 0) {
            nuevosEjercicios = [{
                ...baseFields,
                id: generateSafeId(),
            } as EjercicioRutina];
        } else {
            nuevosEjercicios = newExerciseDays.map(day => ({
                ...baseFields,
                id: generateSafeId(),
                dia: day,
            } as EjercicioRutina));
        }

        updateRoutine({
            ...rutina,
            ejercicios: cleanupRoutineExercises([...rutina.ejercicios, ...nuevosEjercicios])
        });
        setNewExercise({
            nombre: '', series: 3, repeticiones: '10-12', descanso: 60, categoria: 'maquina', grupoMuscular: ''
        });
        setNewExerciseDays([]);
        setShowAddExerciseModal(false);
    };

    const handleSelectFromDatabase = (ejercicio: EjercicioBase) => {
        if (!rutina) return;
        setNewExercise({
            nombre: ejercicio.nombre,
            series: 3,
            repeticiones: '10-12',
            descanso: 60,
            categoria: 'maquina',
            grupoMuscular: ejercicio.grupoMuscular,
        });
        setNewExerciseDays([]);
        setShowExerciseSelector(false);
        setShowAddExerciseModal(true);
    };

    const handleRenewRoutine = () => {
        if (!rutina) return;
        updateRoutine({ ...rutina, fechaInicio: new Date().toISOString() });
    };

    const formatDate = (date: Date) => date.toLocaleDateString('es-ES', {
        day: 'numeric', month: 'short', year: 'numeric'
    });

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.headerBar}>
                <button style={styles.backBtn} onClick={() => navigate(-1)}>
                    <ArrowLeft size={24} color="#FFF" />
                </button>
                <h1 style={styles.headerTitle}>MI RUTINA</h1>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        style={{ ...styles.actionBtn, background: `${Colors.primary}20` }}
                        onClick={() => setShowShareModal(true)}
                    >
                        <Share2 size={20} color={Colors.primary} />
                    </button>
                    <button
                        style={{ ...styles.actionBtn, background: `${Colors.accent}20` }}
                        onClick={handleIAOrganize}
                        disabled={isReorganizing}
                        title="Organizar con IA"
                    >
                        <Sparkles size={20} color={Colors.accent} className={isReorganizing ? 'animate-spin' : ''} />
                    </button>
                    <button style={styles.deleteBtn} onClick={() => setShowDeleteModal(true)}>
                        <Trash2 size={20} color={Colors.error} />
                    </button>
                </div>
            </div>

            {/* Routine Info Card */}
            <Card style={styles.infoCard}>
                <div style={styles.routineName}>
                    <span style={styles.routineIcon}><Dumbbell size={16} /></span>
                    <h2 style={styles.routineTitle}>{rutina.nombre}</h2>
                </div>

                {routineInfo && (
                    <div style={{
                        ...styles.expirationBox,
                        background: routineInfo.expirada ? `${Colors.error}15` : routineInfo.proximaACaducar ? `${Colors.warning}15` : `${Colors.success}15`,
                        borderColor: routineInfo.expirada ? Colors.error : routineInfo.proximaACaducar ? Colors.warning : Colors.success
                    }}>
                        {routineInfo.expirada ? <AlertTriangle size={20} color={Colors.error} /> : <Calendar size={20} color={routineInfo.proximaACaducar ? Colors.warning : Colors.success} />}
                        <div style={styles.expirationText}>
                            {routineInfo.expirada ? (
                                <>
                                    <span style={{ ...styles.expirationTitle, color: Colors.error }}>Rutina Expirada</span>
                                    <span style={styles.expirationSubtitle}>Finalizo el {formatDate(routineInfo.fechaFin)}</span>
                                </>
                            ) : (
                                <>
                                    <span style={{ ...styles.expirationTitle, color: routineInfo.proximaACaducar ? Colors.warning : Colors.success }}>{routineInfo.diasRestantes} dias restantes</span>
                                    <span style={styles.expirationSubtitle}>Valida hasta {formatDate(routineInfo.fechaFin)}</span>
                                </>
                            )}
                        </div>
                        <div style={styles.actionButtonsRow}>
                            {(routineInfo.expirada || routineInfo.proximaACaducar) && (
                                <button style={styles.renewBtn} onClick={handleRenewRoutine}><RotateCcw size={16} /> Renovar</button>
                            )}
                            <button style={styles.recalibrateBtn} onClick={() => setShowRecalibrateModal(true)}><Sparkles size={16} /> Nueva Rutina IA</button>
                        </div>
                    </div>
                )}

                {routineInfo && !routineInfo.expirada && (
                    <div style={styles.progressContainer}>
                        <div style={styles.progressHeader}>
                            <span style={styles.progressLabel}>Progreso</span>
                            <span style={styles.progressPercent}>{Math.round(routineInfo.progreso)}%</span>
                        </div>
                        <div style={styles.progressBar}>
                            <div style={{ ...styles.progressFill, width: `${routineInfo.progreso}%` }} />
                        </div>
                        <div style={styles.progressDates}>
                            <span>{formatDate(routineInfo.fechaInicio)}</span>
                            <span>{formatDate(routineInfo.fechaFin)}</span>
                        </div>
                    </div>
                )}

                {rutina.analizadaPorIA && (
                    <div style={{ ...styles.durationRow, marginTop: '8px' }}>
                        <span style={styles.aiTag}><Sparkles size={12} style={{ marginRight: '4px' }} /> IA</span>
                    </div>
                )}
            </Card>

            <div style={styles.summaryRow}>
                {workoutDaysSummary.map(day => (
                    <div key={day} style={styles.summaryChip}>
                        <div style={styles.summaryDot} />
                        <span style={styles.summaryDayText}>{day}</span>
                    </div>
                ))}
            </div>

            {showWarning && (
                <Card style={styles.warningBox}>
                    <AlertTriangle size={20} color={Colors.warning} />
                    <span style={styles.warningText}>
                        Verifica todos los ejercicios porque pueden existir errores o diferencias.
                    </span>
                    <button
                        onClick={() => setShowWarning(false)}
                        style={{
                            background: 'none',
                            border: 'none',
                            marginLeft: 'auto',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <X size={18} color={Colors.textSecondary} />
                    </button>
                </Card>
            )}

            <div style={styles.exercisesHeader}>
                <h3 style={styles.sectionTitle}>Ejercicios ({rutina.ejercicios.length})</h3>
                <button style={styles.addExerciseBtn} onClick={() => {
                    setNewExercise({ nombre: '', series: 3, repeticiones: '10-12', descanso: 60, categoria: 'maquina', grupoMuscular: '' });
                    setNewExerciseDays([]);
                    setShowAddExerciseModal(true);
                }}>
                    <Plus size={18} /> Anadir
                </button>
            </div>

            <div style={styles.exercisesList}>
                {Object.entries(exercisesByDay).map(([day, dayGroups]) => {
                    const dayStyle = DAY_STYLE[day] || DAY_STYLE.default;
                    return (
                        <div key={day} style={{
                            ...styles.dayGroup,
                            background: dayStyle.bg,
                            border: `1px solid ${dayStyle.color}20`
                        }}>
                            <div
                                style={{
                                    ...styles.dayHeader,
                                    background: `${dayStyle.color}15`,
                                    cursor: 'pointer',
                                    width: '100%',
                                    justifyContent: 'space-between',
                                    alignSelf: 'stretch'
                                }}
                                onClick={() => toggleDayCollapse(day)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Calendar size={18} color={dayStyle.color} />
                                    <h4 style={{ ...styles.dayTitle, color: dayStyle.color }}>{day}</h4>
                                </div>
                                <button style={styles.expandBtn}>
                                    {collapsedDays.has(day) ? (
                                        <ChevronDown size={20} color={dayStyle.color} />
                                    ) : (
                                        <ChevronUp size={20} color={dayStyle.color} />
                                    )}
                                </button>
                            </div>

                            {!collapsedDays.has(day) && (
                                <>

                                    {dayGroups.calentamiento.length > 0 && (
                                        <div style={styles.categorySection}>
                                            <div style={styles.categoryHeader}>
                                                <span style={styles.categoryDot} />
                                                <h5 style={styles.categoryTitle}>Calentamiento</h5>
                                            </div>
                                            <Reorder.Group axis="y" values={dayGroups.calentamiento} onReorder={handleGroupReorder} style={styles.exercisesGrid}>
                                                {dayGroups.calentamiento.map((ejercicio, idx) => (
                                                    <DraggableExerciseCard
                                                        key={ejercicio.id}
                                                        ejercicio={ejercicio}
                                                        idx={idx}
                                                        rutina={rutina!}
                                                        editingExercise={editingExercise}
                                                        editedExercise={editedExercise}
                                                        setEditedExercise={setEditedExercise}
                                                        handleCancelEdit={handleCancelEdit}
                                                        handleMoveExercise={handleMoveExercise}
                                                        handleStartEdit={handleStartEdit}
                                                        handleDeleteExercise={handleDeleteExercise}
                                                        availableDays={perfil.horario.dias.filter(d => d.entrena).map(d => d.dia)}
                                                        onQuickUpdate={(id, fields) => {
                                                            if (!rutina) return;
                                                            const updated = rutina.ejercicios.map(e => e.id === id ? { ...e, ...fields } : e);
                                                            updateRoutine({ ...rutina, ejercicios: cleanupRoutineExercises(updated) });
                                                        }}
                                                        setRutina={updateRoutine}
                                                    />
                                                ))}
                                            </Reorder.Group>
                                        </div>
                                    )}

                                    {dayGroups.rutina.length > 0 && (
                                        <div style={styles.categorySection}>
                                            <div style={styles.categoryHeader}>
                                                <span style={{ ...styles.categoryDot, background: Colors.primary }} />
                                                <h5 style={styles.categoryTitle}>Rutina Principal</h5>
                                            </div>
                                            <Reorder.Group axis="y" values={dayGroups.rutina} onReorder={handleGroupReorder} style={styles.exercisesGrid}>
                                                {dayGroups.rutina.map((ejercicio, idx) => {
                                                    const prevExercise = dayGroups.rutina[idx - 1];
                                                    const prevGroupName = prevExercise ? (GRUPOS_MUSCULARES[prevExercise.grupoMuscular as GrupoMuscularEjercicio]?.nombre || prevExercise.grupoMuscular) : null;
                                                    const currentGroupName = GRUPOS_MUSCULARES[ejercicio.grupoMuscular as GrupoMuscularEjercicio]?.nombre || ejercicio.grupoMuscular;
                                                    const showMuscleHeader = !prevExercise || prevGroupName !== currentGroupName;
                                                    return (
                                                        <React.Fragment key={ejercicio.id}>
                                                            {showMuscleHeader && (
                                                                <div style={styles.muscleGroupHeader}>
                                                                    {ejercicio.grupoMuscular ? (
                                                                        <>
                                                                            <span>{GRUPOS_MUSCULARES[ejercicio.grupoMuscular as GrupoMuscularEjercicio]?.nombre || ejercicio.grupoMuscular}</span>
                                                                        </>
                                                                    ) : (
                                                                        <span>Sin Grupo Muscular</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                            <DraggableExerciseCard
                                                                ejercicio={ejercicio}
                                                                idx={dayGroups.calentamiento.length + idx}
                                                                rutina={rutina!}
                                                                editingExercise={editingExercise}
                                                                editedExercise={editedExercise}
                                                                setEditedExercise={setEditedExercise}
                                                                handleCancelEdit={handleCancelEdit}
                                                                handleMoveExercise={handleMoveExercise}
                                                                handleStartEdit={handleStartEdit}
                                                                handleDeleteExercise={handleDeleteExercise}
                                                                availableDays={perfil.horario.dias.filter(d => d.entrena).map(d => d.dia)}
                                                                onQuickUpdate={(id, fields) => {
                                                                    if (!rutina) return;
                                                                    const updated = rutina.ejercicios.map(e => e.id === id ? { ...e, ...fields } : e);
                                                                    updateRoutine({ ...rutina, ejercicios: cleanupRoutineExercises(updated) });
                                                                }}
                                                                setRutina={updateRoutine}
                                                            />
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </Reorder.Group>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            {
                showDeleteModal && (
                    <div style={styles.modalOverlay}>
                        <div style={styles.modal}>
                            <div style={styles.modalIcon}><AlertTriangle size={24} color={Colors.warning} /></div>
                            <h3 style={styles.modalTitle}>Eliminar Rutina?</h3>
                            <p style={styles.modalText}>Esta accion eliminara permanentemente tu rutina &quot;{rutina.nombre}&quot; y todos sus ejercicios.</p>
                            <div style={styles.modalActions}>
                                <button style={styles.modalCancelBtn} onClick={() => setShowDeleteModal(false)}>Cancelar</button>
                                <button style={styles.modalDeleteBtn} onClick={handleDeleteRoutine}><Trash2 size={18} /> Eliminar</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showAddExerciseModal && (
                    <div style={styles.modalOverlay}>
                        <div style={styles.modal}>
                            <div style={styles.modalHeader}>
                                <h3 style={styles.modalTitle}>Anadir Ejercicio</h3>
                                <button style={styles.closeModalBtn} onClick={() => { setShowAddExerciseModal(false); setNewExerciseDays([]); }}><X size={24} /></button>
                            </div>
                            <div style={styles.addForm}>
                                <div style={styles.formRow}>
                                    <div style={{ ...styles.formGroup, flex: 1 }}>
                                        <label style={styles.formLabel}>Dias</label>
                                        <div style={styles.dayChipsRow}>
                                            {perfil.horario.dias.filter(d => d.entrena).map(d => {
                                                const isSelected = newExerciseDays.includes(d.dia);
                                                return (
                                                    <button
                                                        key={d.dia}
                                                        type="button"
                                                        onClick={() => {
                                                            setNewExerciseDays(prev =>
                                                                isSelected
                                                                    ? prev.filter(day => day !== d.dia)
                                                                    : [...prev, d.dia]
                                                            );
                                                        }}
                                                        style={{
                                                            ...styles.dayChip,
                                                            background: isSelected ? Colors.primary : Colors.surfaceLight,
                                                            color: isSelected ? '#000' : Colors.textSecondary,
                                                            borderColor: isSelected ? Colors.primary : Colors.border,
                                                        }}
                                                    >
                                                        {d.dia.slice(0, 2)}
                                                    </button>
                                                );
                                            })}
                                            <button
                                                type="button"
                                                onClick={() => setNewExerciseDays([])}
                                                style={{
                                                    ...styles.dayChip,
                                                    background: newExerciseDays.length === 0 ? Colors.error : Colors.surfaceLight,
                                                    color: newExerciseDays.length === 0 ? '#FFF' : Colors.textSecondary,
                                                    borderColor: Colors.border,
                                                }}
                                            >
                                                Limpiar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div style={styles.formRow}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>Nombre</label>
                                        <input type="text" value={newExercise.nombre} onChange={(e) => setNewExercise({ ...newExercise, nombre: e.target.value })} onFocus={(e) => e.target.select()} style={styles.formInput} placeholder="Ej: Press de Banca" />
                                    </div>
                                </div>
                                <div style={styles.formRow}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>Series</label>
                                        <input type="number" value={newExercise.series} onChange={(e) => setNewExercise({ ...newExercise, series: parseInt(e.target.value) || 0 })} onFocus={(e) => e.target.select()} style={styles.formInput} />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>Reps</label>
                                        <input type="text" value={newExercise.repeticiones} onChange={(e) => setNewExercise({ ...newExercise, repeticiones: e.target.value })} onFocus={(e) => e.target.select()} style={styles.formInput} placeholder="10-12" />
                                    </div>
                                </div>
                                <div style={styles.formRow}>
                                    <div style={styles.formGroup}>
                                        <TimeInput
                                            label="Duracion"
                                            value={newExercise.segundos}
                                            onChange={(val) => setNewExercise({ ...newExercise, segundos: val })}
                                            allowEmpty={true}
                                        />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <TimeInput
                                            label="Descanso"
                                            value={newExercise.descanso}
                                            onChange={(val) => setNewExercise({ ...newExercise, descanso: val || 0 })}
                                        />
                                    </div>
                                </div>
                                <div style={styles.formRow}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>Categoria</label>
                                        <select value={newExercise.categoria} onChange={(e) => setNewExercise({ ...newExercise, categoria: e.target.value as 'calentamiento' | 'maquina' })} style={styles.formInput}>
                                            <option value="maquina">Rutina Principal</option>
                                            <option value="calentamiento">Calentamiento</option>
                                        </select>
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>Enfocado a</label>
                                        <select value={newExercise.enfocadoA} onChange={(e) => setNewExercise({ ...newExercise, enfocadoA: e.target.value as 'hombre' | 'mujer' | 'ambos' })} style={styles.formInput}>
                                            <option value="ambos">Ambos</option>
                                            <option value="hombre">Hombre</option>
                                            <option value="mujer">Mujer</option>
                                        </select>
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>Musculo</label>
                                        <select value={newExercise.grupoMuscular || ''} onChange={(e) => setNewExercise({ ...newExercise, grupoMuscular: e.target.value })} style={styles.formInput}>
                                            <option value="">Sin asignar</option>
                                            {Object.entries(GRUPOS_MUSCULARES)
                                                .filter(([key]) => key !== 'calentamiento')
                                                .map(([key, value]) => (
                                                    <option key={key} value={key}>{value.nombre}</option>
                                                ))}
                                        </select>
                                    </div>
                                </div>
                                <button style={styles.addExerciseSubmitBtn} onClick={handleAddExercise} disabled={!newExercise.nombre}><Plus size={20} /> Anadir Ejercicio</button>
                                <div style={styles.divider}><span style={styles.dividerText}>o</span></div>
                                <button style={styles.selectFromDbBtn} onClick={() => { setShowAddExerciseModal(false); setShowExerciseSelector(true); }}>
                                    <BookOpen size={16} style={{ marginRight: '6px' }} />
                                    Seleccionar de la Base de Datos
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showExerciseSelector && (
                    <ExerciseSelector onSelect={handleSelectFromDatabase} onClose={() => setShowExerciseSelector(false)} />
                )
            }

            {
                showRecalibrateModal && (
                    <RoutineUpload onComplete={() => setShowRecalibrateModal(false)} onCancel={() => setShowRecalibrateModal(false)} />
                )
            }

            {
                showShareModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.8)', zIndex: 1000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                    }}>
                        <Card style={{ width: '100%', maxWidth: '300px', padding: '24px', background: Colors.surface }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 800, color: Colors.text, marginBottom: '8px', textAlign: 'center' }}>
                                Compartir Rutina
                            </h3>
                            <p style={{ fontSize: '14px', color: Colors.textSecondary, marginBottom: '20px', textAlign: 'center' }}>
                                Ingresa el alias del usuario a quien le quieres enviar esta rutina.
                            </p>

                            <input
                                style={{
                                    width: '100%', padding: '12px', borderRadius: '12px',
                                    border: `1px solid ${Colors.border}`, background: Colors.background,
                                    color: Colors.text, marginBottom: '16px', fontSize: '16px'
                                }}
                                placeholder="Ej: TitanFit"
                                value={shareAlias}
                                onChange={(e) => setShareAlias(e.target.value)}
                            />

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    style={{
                                        flex: 1, padding: '12px', borderRadius: '12px',
                                        background: 'transparent', border: `1px solid ${Colors.border}`,
                                        color: Colors.text
                                    }}
                                    onClick={() => setShowShareModal(false)}
                                >
                                    Cancelar
                                </button>
                                <button
                                    style={{
                                        flex: 1, padding: '12px', borderRadius: '12px',
                                        background: Colors.primary, border: 'none',
                                        color: '#000', fontWeight: 'bold'
                                    }}
                                    onClick={handleShareRoutine}
                                    disabled={isSharing || !shareAlias.trim()}
                                >
                                    {isSharing ? '...' : 'Enviar'}
                                </button>
                            </div>
                        </Card>
                    </div>
                )
            }
        </div>
    );
};




export default RoutineDetailPage;


