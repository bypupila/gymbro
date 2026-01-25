// =====================================================
// GymBro PWA - Exercise Selector Component
// Selector de ejercicios con búsqueda y filtros por grupo muscular
// =====================================================

import React, { useState, useMemo } from 'react';
import { Search, X, ChevronRight, Dumbbell } from 'lucide-react';
import Colors from '@/styles/colors';
import {
    EJERCICIOS_DATABASE,
    GRUPOS_MUSCULARES,
    EjercicioBase,
    GrupoMuscularEjercicio,
    buscarEjercicios,
    getEjerciciosPorGrupo
} from '@/data/exerciseDatabase';

interface ExerciseSelectorProps {
    onSelect: (ejercicio: EjercicioBase) => void;
    onClose: () => void;
}

export const ExerciseSelector: React.FC<ExerciseSelectorProps> = ({ onSelect, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<GrupoMuscularEjercicio | null>(null);
    const [view, setView] = useState<'groups' | 'exercises'>('groups');

    const gruposMusculares = (Object.entries(GRUPOS_MUSCULARES) as [GrupoMuscularEjercicio, typeof GRUPOS_MUSCULARES[GrupoMuscularEjercicio]][])
        .filter(([key]) => key !== 'calentamiento');

    const filteredExercises = useMemo(() => {
        if (searchQuery.length > 0) {
            return buscarEjercicios(searchQuery);
        }
        if (selectedGroup) {
            return getEjerciciosPorGrupo(selectedGroup);
        }
        return [];
    }, [searchQuery, selectedGroup]);

    const handleGroupSelect = (grupo: GrupoMuscularEjercicio) => {
        setSelectedGroup(grupo);
        setView('exercises');
    };

    const handleBack = () => {
        setSelectedGroup(null);
        setView('groups');
        setSearchQuery('');
    };

    const handleExerciseSelect = (ejercicio: EjercicioBase) => {
        onSelect(ejercicio);
        onClose();
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.container}>
                {/* Header */}
                <div style={styles.header}>
                    <h2 style={styles.title}>
                        {view === 'groups' ? 'Seleccionar Ejercicio' : GRUPOS_MUSCULARES[selectedGroup!]?.nombre}
                    </h2>
                    <button style={styles.closeBtn} onClick={onClose}>
                        <X size={24} color={Colors.text} />
                    </button>
                </div>

                {/* Search Bar */}
                <div style={styles.searchContainer}>
                    <Search size={20} color={Colors.textTertiary} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            if (e.target.value.length > 0) {
                                setView('exercises');
                                setSelectedGroup(null);
                            } else if (!selectedGroup) {
                                setView('groups');
                            }
                        }}
                        placeholder="Buscar ejercicio..."
                        style={styles.searchInput}
                    />
                    {searchQuery && (
                        <button
                            style={styles.clearBtn}
                            onClick={() => {
                                setSearchQuery('');
                                if (!selectedGroup) setView('groups');
                            }}
                        >
                            <X size={18} color={Colors.textSecondary} />
                        </button>
                    )}
                </div>

                {/* Back Button (when in exercises view) */}
                {view === 'exercises' && selectedGroup && !searchQuery && (
                    <button style={styles.backBtn} onClick={handleBack}>
                        ← Volver a grupos
                    </button>
                )}

                {/* Content */}
                <div style={styles.content}>
                    {view === 'groups' && !searchQuery ? (
                        // Muscle Groups Grid
                        <div style={styles.groupsGrid}>
                            {gruposMusculares.map(([key, group]) => {
                                const count = getEjerciciosPorGrupo(key).length;
                                return (
                                    <button
                                        key={key}
                                        style={{
                                            ...styles.groupCard,
                                            borderColor: group.color
                                        }}
                                        onClick={() => handleGroupSelect(key)}
                                    >
                                        <span style={styles.groupEmoji}>{group.emoji}</span>
                                        <span style={styles.groupName}>{group.nombre}</span>
                                        <span style={styles.groupCount}>{count} ejercicios</span>
                                        <ChevronRight size={18} color={Colors.textTertiary} />
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        // Exercises List
                        <div style={styles.exercisesList}>
                            {filteredExercises.length > 0 ? (
                                filteredExercises.map((ejercicio) => (
                                    <button
                                        key={ejercicio.id}
                                        style={styles.exerciseItem}
                                        onClick={() => handleExerciseSelect(ejercicio)}
                                    >
                                        <div style={styles.exerciseIcon}>
                                            <Dumbbell size={20} color={GRUPOS_MUSCULARES[ejercicio.grupoMuscular]?.color || Colors.primary} />
                                        </div>
                                        <div style={styles.exerciseInfo}>
                                            <span style={styles.exerciseName}>{ejercicio.nombre}</span>
                                            <div style={styles.exerciseMeta}>
                                                {ejercicio.equipamiento && (
                                                    <span style={styles.tag}>{ejercicio.equipamiento}</span>
                                                )}
                                                {ejercicio.esCompuesto && (
                                                    <span style={{ ...styles.tag, background: `${Colors.primary}20`, color: Colors.primary }}>
                                                        Compuesto
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronRight size={18} color={Colors.textTertiary} />
                                    </button>
                                ))
                            ) : (
                                <div style={styles.emptyState}>
                                    <span style={styles.emptyIcon}>🔍</span>
                                    <p style={styles.emptyText}>
                                        No se encontraron ejercicios
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Stats */}
                <div style={styles.footer}>
                    <span style={styles.statsText}>
                        {EJERCICIOS_DATABASE.length} ejercicios disponibles
                    </span>
                </div>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 1000,
    },
    container: {
        width: '100%',
        maxWidth: '500px',
        maxHeight: '85vh',
        background: Colors.surfaceLight,
        borderRadius: '24px 24px 0 0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 20px 12px',
        borderBottom: `1px solid ${Colors.border}`,
    },
    title: {
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
    searchContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        margin: '16px 20px',
        padding: '12px 16px',
        background: Colors.surface,
        borderRadius: '12px',
        border: `1px solid ${Colors.border}`,
    },
    searchInput: {
        flex: 1,
        background: 'none',
        border: 'none',
        color: Colors.text,
        fontSize: '15px',
        outline: 'none',
    },
    clearBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
    },
    backBtn: {
        margin: '0 20px 12px',
        padding: '8px 12px',
        background: Colors.surface,
        border: 'none',
        borderRadius: '8px',
        color: Colors.textSecondary,
        fontSize: '13px',
        cursor: 'pointer',
        textAlign: 'left',
    },
    content: {
        flex: 1,
        overflowY: 'auto',
        padding: '0 20px',
    },
    groupsGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        paddingBottom: '20px',
    },
    groupCard: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 16px',
        background: Colors.surface,
        border: '1px solid',
        borderRadius: '14px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
    groupEmoji: {
        fontSize: '24px',
    },
    groupName: {
        flex: 1,
        fontSize: '15px',
        fontWeight: 600,
        color: Colors.text,
        textAlign: 'left',
    },
    groupCount: {
        fontSize: '12px',
        color: Colors.textTertiary,
    },
    exercisesList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        paddingBottom: '20px',
    },
    exerciseItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 16px',
        background: Colors.surface,
        border: `1px solid ${Colors.border}`,
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
    exerciseIcon: {
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        background: Colors.surfaceLight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    exerciseInfo: {
        flex: 1,
        textAlign: 'left',
    },
    exerciseName: {
        fontSize: '14px',
        fontWeight: 600,
        color: Colors.text,
        display: 'block',
        marginBottom: '4px',
    },
    exerciseMeta: {
        display: 'flex',
        gap: '6px',
        flexWrap: 'wrap',
    },
    tag: {
        padding: '2px 8px',
        background: Colors.surfaceLight,
        borderRadius: '6px',
        fontSize: '11px',
        color: Colors.textSecondary,
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 20px',
    },
    emptyIcon: {
        fontSize: '48px',
        marginBottom: '12px',
    },
    emptyText: {
        fontSize: '14px',
        color: Colors.textSecondary,
        margin: 0,
    },
    footer: {
        padding: '12px 20px',
        borderTop: `1px solid ${Colors.border}`,
        textAlign: 'center',
    },
    statsText: {
        fontSize: '12px',
        color: Colors.textTertiary,
    },
};

export default ExerciseSelector;
