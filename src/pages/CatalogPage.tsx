import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Colors from '@/styles/colors';
import { Search, Filter, Play } from 'lucide-react';
import { EJERCICIOS_DATABASE, GRUPOS_MUSCULARES, GrupoMuscularEjercicio } from '@/data/exerciseDatabase';
import { getExerciseImage, getExerciseVideo } from '@/data/exerciseMedia';
import { motion, AnimatePresence } from 'framer-motion';

export const CatalogPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<GrupoMuscularEjercicio | 'todos'>('todos');

    // Filter Logic
    const filteredExercises = useMemo(() => {
        return EJERCICIOS_DATABASE.filter(ej => {
            const matchesSearch = ej.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                ej.equipamiento?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesGroup = selectedGroup === 'todos' || ej.grupoMuscular === selectedGroup;

            return matchesSearch && matchesGroup;
        });
    }, [searchQuery, selectedGroup]);

    // Handle Video Click
    const handleExerciseClick = (name: string) => {
        const videoUrl = getExerciseVideo(name);
        if (videoUrl) {
            window.open(videoUrl, '_blank');
        }
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Catálogo de Ejercicios</h1>
                    <p style={styles.subtitle}>Explora nuestra biblioteca completa de {EJERCICIOS_DATABASE.length} ejercicios.</p>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div style={styles.controls}>
                <div style={styles.searchContainer}>
                    <Search size={20} color={Colors.textTertiary} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o equipamiento..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={styles.searchInput}
                    />
                </div>

                {/* Horizontal Scrollable Filters */}
                <div style={styles.filtersWrapper}>
                    <div style={styles.filtersContainer}>
                        <FilterButton
                            label="Todos"
                            isActive={selectedGroup === 'todos'}
                            onClick={() => setSelectedGroup('todos')}
                        />
                        {Object.entries(GRUPOS_MUSCULARES).map(([key, data]) => (
                            <FilterButton
                                key={key}
                                label={data.nombre}
                                emoji={data.emoji}
                                isActive={selectedGroup === key}
                                onClick={() => setSelectedGroup(key as GrupoMuscularEjercicio)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Grid Content */}
            <div style={styles.grid}>
                <AnimatePresence mode='popLayout'>
                    {filteredExercises.map((ej) => {
                        const groupData = GRUPOS_MUSCULARES[ej.grupoMuscular];
                        const img = getExerciseImage(ej.nombre, ej.grupoMuscular);
                        const hasVideo = !!getExerciseVideo(ej.nombre);

                        return (
                            <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                                key={ej.id}
                                style={styles.card}
                                onClick={() => handleExerciseClick(ej.nombre)}
                            >
                                <div style={styles.imageContainer}>
                                    <img src={img} alt={ej.nombre} style={styles.image} loading="lazy" />
                                    {hasVideo && (
                                        <div style={styles.playOverlay}>
                                            <Play size={20} color="#fff" fill="#fff" />
                                        </div>
                                    )}
                                    <div style={styles.groupBadge}>
                                        {groupData.emoji} {groupData.nombre}
                                    </div>
                                </div>
                                <div style={styles.cardContent}>
                                    <h3 style={styles.cardTitle}>{ej.nombre}</h3>
                                    <div style={styles.cardFooter}>
                                        <span style={styles.equipment}>{ej.equipamiento || 'Sin equipamiento'}</span>
                                        {ej.esCompuesto && <span style={styles.badge}>Compuesto</span>}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {filteredExercises.length === 0 && (
                <div style={styles.emptyState}>
                    <p>No se encontraron ejercicios con esos criterios.</p>
                </div>
            )}
        </div>
    );
};

const FilterButton: React.FC<{ label: string; emoji?: string; isActive: boolean; onClick: () => void }> = ({
    label, emoji, isActive, onClick
}) => (
    <button
        onClick={onClick}
        style={{
            ...styles.filterButton,
            backgroundColor: isActive ? Colors.primary : 'rgba(255,255,255,0.05)',
            color: isActive ? '#000' : Colors.text,
            border: isActive ? `1px solid ${Colors.primary}` : `1px solid ${Colors.border}`,
        }}
    >
        {emoji} {label}
    </button>
);

const styles: Record<string, React.CSSProperties> = {
    container: {
        width: '100%',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: '28px',
        fontWeight: 900,
        color: Colors.text,
        marginBottom: '8px',
    },
    subtitle: {
        fontSize: '14px',
        color: Colors.textSecondary,
    },
    controls: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    searchContainer: {
        display: 'flex',
        alignItems: 'center',
        background: Colors.surface,
        border: `1px solid ${Colors.border}`,
        borderRadius: '12px',
        padding: '12px 16px',
        gap: '12px',
    },
    searchInput: {
        background: 'transparent',
        border: 'none',
        color: Colors.text,
        fontSize: '16px',
        width: '100%',
        outline: 'none',
    },
    filtersWrapper: {
        width: '100%',
        overflowX: 'auto',
        paddingBottom: '8px',
    },
    filtersContainer: {
        display: 'flex',
        gap: '8px',
        minWidth: 'max-content',
    },
    filterButton: {
        padding: '8px 16px',
        borderRadius: '20px',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '20px',
    },
    card: {
        background: Colors.surface,
        borderRadius: '16px',
        overflow: 'hidden',
        border: `1px solid ${Colors.border}`,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
    },
    imageContainer: {
        width: '100%',
        height: '160px',
        position: 'relative',
        background: '#000',
    },
    image: {
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
        background: 'rgba(0,0,0,0.5)',
        borderRadius: '50%',
        padding: '12px',
        backdropFilter: 'blur(4px)',
    },
    groupBadge: {
        position: 'absolute',
        bottom: '8px',
        left: '8px',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        padding: '4px 8px',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#fff',
        fontWeight: 600,
    },
    cardContent: {
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        flex: 1,
    },
    cardTitle: {
        fontSize: '16px',
        fontWeight: 700,
        color: Colors.text,
        lineHeight: 1.3,
    },
    cardFooter: {
        marginTop: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    equipment: {
        fontSize: '12px',
        color: Colors.textTertiary,
    },
    badge: {
        fontSize: '10px',
        background: 'rgba(255,255,255,0.1)',
        padding: '2px 6px',
        borderRadius: '4px',
        color: Colors.textSecondary,
    },
    emptyState: {
        textAlign: 'center',
        padding: '40px',
        color: Colors.textTertiary,
    },
};

export default CatalogPage;
