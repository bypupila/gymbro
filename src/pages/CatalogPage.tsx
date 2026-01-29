import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Colors from '@/styles/colors';
import { Search, Filter, Play, Pencil, Database, Save, X, Loader2 } from 'lucide-react';
import { useUserStore } from '@/stores/userStore';
import { firebaseService } from '@/services/firebaseService';
import { EJERCICIOS_DATABASE, GRUPOS_MUSCULARES, GrupoMuscularEjercicio } from '@/data/exerciseDatabase';
import { getExerciseImage, getExerciseVideo } from '@/data/exerciseMedia';
import { motion, AnimatePresence } from 'framer-motion';

export const CatalogPage: React.FC = () => {
    const navigate = useNavigate();
    const { perfil } = useUserStore();
    const isAdmin = perfil.alias === 'bypupila' || perfil.role === 'admin';

    const [exercises, setExercises] = useState(EJERCICIOS_DATABASE);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<GrupoMuscularEjercicio | 'todos'>('todos');
    const [notification, setNotification] = useState<string | null>(null);

    // Editor State
    const [editingExercise, setEditingExercise] = useState<any | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [useFirebaseData, setUseFirebaseData] = useState(false);

    // Load exercises from Firebase
    React.useEffect(() => {
        const loadData = async () => {
            try {
                const cloudExercises = await firebaseService.getAllExercises();
                if (cloudExercises && cloudExercises.length > 0) {
                    setExercises(cloudExercises);
                    setUseFirebaseData(true);
                }
            } catch (error) {
                console.error("Error loading exercises from DB:", error);
            }
        };
        loadData();
    }, []);

    const showNotification = (msg: string) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 3000);
    };

    const handleSyncCatalog = async () => {
        if (!confirm('¿Subir el catálogo local a la base de datos? Esto sobreescribirá datos existentes.')) return;
        setIsSyncing(true);
        try {
            await firebaseService.initializeCatalog(EJERCICIOS_DATABASE);
            showNotification('Catálogo sincronizado exitosamente.');
            setUseFirebaseData(true);
            // Reload
            const cloudExercises = await firebaseService.getAllExercises();
            setExercises(cloudExercises);
        } catch (error) {
            console.error(error);
            showNotification('Error al sincronizar catálogo.');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!editingExercise) return;
        setIsSyncing(true);
        try {
            // Generar ID si no tiene
            const id = editingExercise.id || editingExercise.nombre.toLowerCase().replace(/[^a-z0-9]/g, '_');

            await firebaseService.saveExercise(id, editingExercise);

            // Update local state
            setExercises(prev => prev.map(e => (e.id === id || e.nombre === editingExercise.nombre) ? { ...editingExercise, id } : e));
            setEditingExercise(null);
            showNotification('Ejercicio actualizado correctamente.');
        } catch (error) {
            console.error(error);
            showNotification('Error al guardar cambios.');
        } finally {
            setIsSyncing(false);
        }
    };

    // Filter Logic
    const filteredExercises = useMemo(() => {
        return exercises.filter((ej: any) => {
            const matchesSearch = ej.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                ej.equipamiento?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesGroup = selectedGroup === 'todos' || ej.grupoMuscular === selectedGroup;

            return matchesSearch && matchesGroup;
        });
    }, [searchQuery, selectedGroup, exercises]);

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
                    <p style={styles.subtitle}>
                        {useFirebaseData ? '☁️ Base de Datos en la Nube' : '💻 Base de Datos Local'} • {exercises.length} ejercicios
                    </p>
                </div>
                {isAdmin && !useFirebaseData && (
                    <button onClick={handleSyncCatalog} style={styles.syncBtn} disabled={isSyncing}>
                        {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
                        Subir a BD
                    </button>
                )}
            </div>

            {/* Notification Toast */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        style={styles.notification}
                    >
                        {notification}
                    </motion.div>
                )}
            </AnimatePresence>

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
                    {filteredExercises.map((ej: any) => {
                        const groupData = GRUPOS_MUSCULARES[ej.grupoMuscular as GrupoMuscularEjercicio] || GRUPOS_MUSCULARES['Pecho'];
                        // Use stored image or fallback
                        const img = ej.imagen || getExerciseImage(ej.nombre, ej.grupoMuscular);
                        // Use stored video or lookup
                        const videoUrl = ej.videoUrl || getExerciseVideo(ej.nombre);
                        const hasVideo = !!videoUrl;

                        return (
                            <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                                key={ej.id || ej.nombre}
                                style={styles.card}
                                onClick={() => {
                                    if (videoUrl) window.open(videoUrl, '_blank');
                                }}
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
                                    {isAdmin && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Prepare edit object
                                                setEditingExercise({
                                                    ...ej,
                                                    // Ensure we have editable fields populated even if they come from static lookups initially
                                                    videoUrl: ej.videoUrl || getExerciseVideo(ej.nombre) || '',
                                                    imagen: ej.imagen || getExerciseImage(ej.nombre, ej.grupoMuscular)
                                                });
                                            }}
                                            style={styles.editBtn}
                                        >
                                            <Pencil size={14} color="#FFF" />
                                        </button>
                                    )}
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

            {/* Edit Modal */}
            {editingExercise && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.title}>Editar Ejercicio</h3>
                            <button onClick={() => setEditingExercise(null)} style={styles.closeBtn}>
                                <X size={24} color={Colors.text} />
                            </button>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Nombre</label>
                            <input
                                style={styles.input}
                                value={editingExercise.nombre}
                                onChange={e => setEditingExercise({ ...editingExercise, nombre: e.target.value })}
                            />
                        </div>

                        <div style={styles.grid2}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Grupo Muscular</label>
                                <select
                                    style={styles.input}
                                    value={editingExercise.grupoMuscular}
                                    onChange={e => setEditingExercise({ ...editingExercise, grupoMuscular: e.target.value })}
                                >
                                    {Object.keys(GRUPOS_MUSCULARES).map(k => (
                                        <option key={k} value={k}>{GRUPOS_MUSCULARES[k as GrupoMuscularEjercicio].nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Equipamiento</label>
                                <input
                                    style={styles.input}
                                    value={editingExercise.equipamiento || ''}
                                    onChange={e => setEditingExercise({ ...editingExercise, equipamiento: e.target.value })}
                                />
                            </div>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Video URL (YouTube)</label>
                            <input
                                style={styles.input}
                                placeholder="https://youtu.be/..."
                                value={editingExercise.videoUrl || ''}
                                onChange={e => setEditingExercise({ ...editingExercise, videoUrl: e.target.value })}
                            />
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Imagen URL (Opcional)</label>
                            <input
                                style={styles.input}
                                placeholder="Si dejas vacío, se usa la por defecto"
                                value={editingExercise.imagen || ''}
                                onChange={e => setEditingExercise({ ...editingExercise, imagen: e.target.value })}
                            />
                        </div>

                        <button style={styles.saveBtn} onClick={handleSaveEdit} disabled={isSyncing}>
                            {isSyncing ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                            Guardar Cambios
                        </button>
                    </div>
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
    editBtn: {
        position: 'absolute',
        top: '8px',
        right: '8px',
        background: Colors.primary,
        border: 'none',
        borderRadius: '50%',
        width: '28px',
        height: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        zIndex: 10,
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
    notification: {
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: Colors.primary,
        color: '#000',
        padding: '12px 24px',
        borderRadius: '24px',
        fontWeight: 'bold',
        zIndex: 100,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        whiteSpace: 'nowrap',
    },
    syncBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        borderRadius: '12px',
        background: Colors.surface,
        border: `1px dashed ${Colors.primary}`,
        color: Colors.primary,
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
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
        maxWidth: '500px',
        border: `1px solid ${Colors.border}`,
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
    },
    formGroup: {
        marginBottom: '16px',
    },
    label: {
        display: 'block',
        fontSize: '12px',
        fontWeight: 700,
        color: Colors.textSecondary,
        marginBottom: '6px',
    },
    input: {
        width: '100%',
        padding: '12px',
        background: Colors.background,
        border: `1px solid ${Colors.border}`,
        borderRadius: '12px',
        color: Colors.text,
        fontSize: '15px',
        outline: 'none',
    },
    saveBtn: {
        width: '100%',
        marginTop: '12px',
        padding: '16px',
        background: Colors.primary,
        border: 'none',
        borderRadius: '12px',
        color: '#000',
        fontSize: '16px',
        fontWeight: 800,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
    },
    grid2: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
    },
};

export default CatalogPage;
