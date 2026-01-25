// =====================================================
// GymBro PWA - Exercise Database
// Base de datos completa de ejercicios organizados por grupo muscular
// =====================================================

export type GrupoMuscularEjercicio =
    | 'calentamiento'
    | 'cardio'
    | 'espinales'
    | 'abdominales'
    | 'oblicuos'
    | 'pectoral'
    | 'espalda'
    | 'trapecio'
    | 'hombros'
    | 'biceps'
    | 'triceps'
    | 'piernas'
    | 'gluteos';

export interface EjercicioBase {
    id: string;
    nombre: string;
    grupoMuscular: GrupoMuscularEjercicio;
    equipamiento?: string;
    variantes?: string[];
    esCompuesto: boolean;
    descripcion?: string;
}

// =====================================================
// CALENTAMIENTO Y CARDIO
// =====================================================

const ejerciciosCardio: EjercicioBase[] = [
    { id: 'cardio-001', nombre: 'Cinta', grupoMuscular: 'cardio', esCompuesto: false },
    { id: 'cardio-002', nombre: 'Elíptico', grupoMuscular: 'cardio', esCompuesto: false },
    { id: 'cardio-003', nombre: 'Bicicleta', grupoMuscular: 'cardio', esCompuesto: false },
    { id: 'cardio-004', nombre: 'Spinning', grupoMuscular: 'cardio', esCompuesto: false },
    { id: 'cardio-005', nombre: 'Remo', grupoMuscular: 'cardio', esCompuesto: true },
];

// =====================================================
// ESPINALES
// =====================================================

const ejerciciosEspinales: EjercicioBase[] = [
    { id: 'esp-001', nombre: 'Espinales en Máquina', grupoMuscular: 'espinales', equipamiento: 'Máquina', esCompuesto: false },
    { id: 'esp-002', nombre: 'Espinales en Banco', grupoMuscular: 'espinales', equipamiento: 'Banco', esCompuesto: false },
    { id: 'esp-003', nombre: 'Espinales en Colchoneta', grupoMuscular: 'espinales', equipamiento: 'Colchoneta', esCompuesto: false },
];

// =====================================================
// ABDOMINALES
// =====================================================

const ejerciciosAbdominales: EjercicioBase[] = [
    { id: 'abd-001', nombre: 'Abdominales en Máquina', grupoMuscular: 'abdominales', equipamiento: 'Máquina', esCompuesto: false },
    { id: 'abd-002', nombre: 'Abdominales en Colchoneta', grupoMuscular: 'abdominales', equipamiento: 'Colchoneta', esCompuesto: false },
    { id: 'abd-003', nombre: 'Abdominales en Banco', grupoMuscular: 'abdominales', equipamiento: 'Banco', esCompuesto: false },
    { id: 'abd-004', nombre: 'Abdominales en Polea', grupoMuscular: 'abdominales', equipamiento: 'Polea', esCompuesto: false },
    { id: 'abd-005', nombre: 'Plancha Abdominal', grupoMuscular: 'abdominales', equipamiento: 'Colchoneta', esCompuesto: true },
    { id: 'abd-006', nombre: 'Abdominales Inferiores en Paralelas', grupoMuscular: 'abdominales', equipamiento: 'Paralelas', esCompuesto: false },
    { id: 'abd-007', nombre: 'Abdominales Inferiores en Colchoneta', grupoMuscular: 'abdominales', equipamiento: 'Colchoneta', esCompuesto: false },
];

// =====================================================
// OBLICUOS
// =====================================================

const ejerciciosOblicuos: EjercicioBase[] = [
    { id: 'obl-001', nombre: 'Oblicuos en Colchoneta', grupoMuscular: 'oblicuos', equipamiento: 'Colchoneta', esCompuesto: false },
    { id: 'obl-002', nombre: 'Oblicuos en Banco', grupoMuscular: 'oblicuos', equipamiento: 'Banco', esCompuesto: false },
    { id: 'obl-003', nombre: 'Plancha Lateral', grupoMuscular: 'oblicuos', equipamiento: 'Colchoneta', esCompuesto: true },
    { id: 'obl-004', nombre: 'Oblicuos Cruzados', grupoMuscular: 'oblicuos', equipamiento: 'Colchoneta', esCompuesto: false },
];

// =====================================================
// PECTORAL
// =====================================================

const ejerciciosPectoral: EjercicioBase[] = [
    { id: 'pec-001', nombre: 'Chest Press', grupoMuscular: 'pectoral', equipamiento: 'Máquina', esCompuesto: true },
    { id: 'pec-002', nombre: 'Chest Press Hammer', grupoMuscular: 'pectoral', equipamiento: 'Máquina Hammer', esCompuesto: true },
    { id: 'pec-003', nombre: 'Peck Deck', grupoMuscular: 'pectoral', equipamiento: 'Máquina', esCompuesto: false },
    { id: 'pec-004', nombre: 'Pec Fly', grupoMuscular: 'pectoral', equipamiento: 'Máquina', esCompuesto: false },
    { id: 'pec-005', nombre: 'Press en Banco Plano con Barra', grupoMuscular: 'pectoral', equipamiento: 'Barra', esCompuesto: true },
    { id: 'pec-006', nombre: 'Press en Banco Plano con Smith', grupoMuscular: 'pectoral', equipamiento: 'Smith', esCompuesto: true },
    { id: 'pec-007', nombre: 'Press en Banco Plano con Mancuernas', grupoMuscular: 'pectoral', equipamiento: 'Mancuernas', esCompuesto: true },
    { id: 'pec-008', nombre: 'Press en Banco Inclinado con Barra', grupoMuscular: 'pectoral', equipamiento: 'Barra', esCompuesto: true },
    { id: 'pec-009', nombre: 'Press en Banco Inclinado con Smith', grupoMuscular: 'pectoral', equipamiento: 'Smith', esCompuesto: true },
    { id: 'pec-010', nombre: 'Press en Banco Inclinado con Mancuernas', grupoMuscular: 'pectoral', equipamiento: 'Mancuernas', esCompuesto: true },
    { id: 'pec-011', nombre: 'Cruces en Polea', grupoMuscular: 'pectoral', equipamiento: 'Polea', esCompuesto: false },
    { id: 'pec-012', nombre: 'Apertura en Banco Plano', grupoMuscular: 'pectoral', equipamiento: 'Banco/Mancuernas', esCompuesto: false },
    { id: 'pec-013', nombre: 'Apertura en Banco Inclinado', grupoMuscular: 'pectoral', equipamiento: 'Banco Inclinado/Mancuernas', esCompuesto: false },
    { id: 'pec-014', nombre: 'Flexiones de Brazos', grupoMuscular: 'pectoral', equipamiento: 'Peso corporal', esCompuesto: true },
];

// =====================================================
// ESPALDA
// =====================================================

const ejerciciosEspalda: EjercicioBase[] = [
    { id: 'esp-101', nombre: 'Vertical Trac', grupoMuscular: 'espalda', equipamiento: 'Máquina', esCompuesto: true },
    { id: 'esp-102', nombre: 'Low Row (Remo Bajo)', grupoMuscular: 'espalda', equipamiento: 'Máquina', esCompuesto: true },
    { id: 'esp-103', nombre: 'Low Row Hammer', grupoMuscular: 'espalda', equipamiento: 'Máquina Hammer', esCompuesto: true },
    { id: 'esp-104', nombre: 'Lat con Barra Pronado', grupoMuscular: 'espalda', equipamiento: 'Polea Alta/Barra', esCompuesto: true },
    { id: 'esp-105', nombre: 'Lat con Barra Supino', grupoMuscular: 'espalda', equipamiento: 'Polea Alta/Barra', esCompuesto: true },
    { id: 'esp-106', nombre: 'Lat con Triángulo', grupoMuscular: 'espalda', equipamiento: 'Polea Alta/Triángulo', esCompuesto: true },
    { id: 'esp-107', nombre: 'Pull Over con Mancuerna', grupoMuscular: 'espalda', equipamiento: 'Banco/Mancuerna', esCompuesto: false },
    { id: 'esp-108', nombre: 'Pull Over en Polea', grupoMuscular: 'espalda', equipamiento: 'Polea', esCompuesto: false },
    { id: 'esp-109', nombre: 'Remo con Barra', grupoMuscular: 'espalda', equipamiento: 'Barra', esCompuesto: true },
    { id: 'esp-110', nombre: 'Remo en Polea', grupoMuscular: 'espalda', equipamiento: 'Polea', esCompuesto: true },
    { id: 'esp-111', nombre: 'Dominadas', grupoMuscular: 'espalda', equipamiento: 'Barra fija', esCompuesto: true },
    { id: 'esp-112', nombre: 'Remo a un Brazo con Mancuerna', grupoMuscular: 'espalda', equipamiento: 'Mancuerna', esCompuesto: true },
    { id: 'esp-113', nombre: 'Remo a un Brazo en Polea', grupoMuscular: 'espalda', equipamiento: 'Polea', esCompuesto: true },
];

// =====================================================
// TRAPECIO
// =====================================================

const ejerciciosTrapecio: EjercicioBase[] = [
    { id: 'trap-001', nombre: 'Tirón al Mentón', grupoMuscular: 'trapecio', equipamiento: 'Barra/Polea', esCompuesto: true },
    { id: 'trap-002', nombre: 'Encogimiento con Barra', grupoMuscular: 'trapecio', equipamiento: 'Barra', esCompuesto: false },
    { id: 'trap-003', nombre: 'Encogimiento con Mancuernas', grupoMuscular: 'trapecio', equipamiento: 'Mancuernas', esCompuesto: false },
    { id: 'trap-004', nombre: 'Encogimiento con Discos', grupoMuscular: 'trapecio', equipamiento: 'Discos', esCompuesto: false },
];

// =====================================================
// HOMBROS
// =====================================================

const ejerciciosHombros: EjercicioBase[] = [
    { id: 'hom-001', nombre: 'Shoulder Press (Máquina)', grupoMuscular: 'hombros', equipamiento: 'Máquina', esCompuesto: true },
    { id: 'hom-002', nombre: 'Press de Hombros con Barra', grupoMuscular: 'hombros', equipamiento: 'Barra', esCompuesto: true },
    { id: 'hom-003', nombre: 'Press de Hombros con Mancuernas', grupoMuscular: 'hombros', equipamiento: 'Mancuernas', esCompuesto: true },
    { id: 'hom-004', nombre: 'Press de Hombros con Smith', grupoMuscular: 'hombros', equipamiento: 'Smith', esCompuesto: true },
    { id: 'hom-005', nombre: 'Press Arnold', grupoMuscular: 'hombros', equipamiento: 'Mancuernas', esCompuesto: true },
    { id: 'hom-006', nombre: 'Press Militar', grupoMuscular: 'hombros', equipamiento: 'Barra', esCompuesto: true },
    { id: 'hom-007', nombre: 'Vuelos Frontales con Mancuernas', grupoMuscular: 'hombros', equipamiento: 'Mancuernas', esCompuesto: false },
    { id: 'hom-008', nombre: 'Vuelos Frontales en Polea', grupoMuscular: 'hombros', equipamiento: 'Polea', esCompuesto: false },
    { id: 'hom-009', nombre: 'Vuelos Laterales con Mancuernas', grupoMuscular: 'hombros', equipamiento: 'Mancuernas', esCompuesto: false },
    { id: 'hom-010', nombre: 'Vuelos Laterales en Polea', grupoMuscular: 'hombros', equipamiento: 'Polea', esCompuesto: false },
    { id: 'hom-011', nombre: 'Vuelos Posteriores en Máquina', grupoMuscular: 'hombros', equipamiento: 'Máquina', esCompuesto: false },
    { id: 'hom-012', nombre: 'Vuelos Posteriores con Mancuernas', grupoMuscular: 'hombros', equipamiento: 'Mancuernas', esCompuesto: false },
    { id: 'hom-013', nombre: 'Vuelos Posteriores en Polea', grupoMuscular: 'hombros', equipamiento: 'Polea', esCompuesto: false },
];

// =====================================================
// BÍCEPS
// =====================================================

const ejerciciosBiceps: EjercicioBase[] = [
    { id: 'bic-001', nombre: 'Arm Curl (Bíceps en Máquina)', grupoMuscular: 'biceps', equipamiento: 'Máquina', esCompuesto: false },
    { id: 'bic-002', nombre: 'Curl con Mancuernas', grupoMuscular: 'biceps', equipamiento: 'Mancuernas', esCompuesto: false },
    { id: 'bic-003', nombre: 'Curl en Polea', grupoMuscular: 'biceps', equipamiento: 'Polea', esCompuesto: false },
    { id: 'bic-004', nombre: 'Curl Alternado', grupoMuscular: 'biceps', equipamiento: 'Mancuernas', esCompuesto: false },
    { id: 'bic-005', nombre: 'Curl 21', grupoMuscular: 'biceps', equipamiento: 'Barra/Mancuernas', esCompuesto: false },
    { id: 'bic-006', nombre: 'Curl Parado con Barra', grupoMuscular: 'biceps', equipamiento: 'Barra', esCompuesto: false },
    { id: 'bic-007', nombre: 'Banco Scott', grupoMuscular: 'biceps', equipamiento: 'Banco Scott', esCompuesto: false },
    { id: 'bic-008', nombre: 'Curl Concentrado', grupoMuscular: 'biceps', equipamiento: 'Mancuerna', esCompuesto: false },
];

// =====================================================
// TRÍCEPS
// =====================================================

const ejerciciosTriceps: EjercicioBase[] = [
    { id: 'tri-001', nombre: 'Arm Extension (Tríceps en Máquina)', grupoMuscular: 'triceps', equipamiento: 'Máquina', esCompuesto: false },
    { id: 'tri-002', nombre: 'Extensión en Polea con Barra', grupoMuscular: 'triceps', equipamiento: 'Polea/Barra', esCompuesto: false },
    { id: 'tri-003', nombre: 'Extensión en Polea con Soga', grupoMuscular: 'triceps', equipamiento: 'Polea/Soga', esCompuesto: false },
    { id: 'tri-004', nombre: 'Press Francés', grupoMuscular: 'triceps', equipamiento: 'Barra/Mancuernas', esCompuesto: false },
    { id: 'tri-005', nombre: 'Press Cerrado con Barra', grupoMuscular: 'triceps', equipamiento: 'Barra', esCompuesto: true },
    { id: 'tri-006', nombre: 'Press Cerrado con Smith', grupoMuscular: 'triceps', equipamiento: 'Smith', esCompuesto: true },
    { id: 'tri-007', nombre: 'Fondos en Banco', grupoMuscular: 'triceps', equipamiento: 'Banco', esCompuesto: true },
    { id: 'tri-008', nombre: 'Fondos en Paralelas', grupoMuscular: 'triceps', equipamiento: 'Paralelas', esCompuesto: true },
    { id: 'tri-009', nombre: 'Tríceps Concentrado con Mancuerna', grupoMuscular: 'triceps', equipamiento: 'Mancuerna', esCompuesto: false },
    { id: 'tri-010', nombre: 'Tríceps Concentrado en Polea', grupoMuscular: 'triceps', equipamiento: 'Polea', esCompuesto: false },
    { id: 'tri-011', nombre: 'Patada de Tríceps', grupoMuscular: 'triceps', equipamiento: 'Mancuerna', esCompuesto: false },
];

// =====================================================
// PIERNAS Y GLÚTEOS
// =====================================================

const ejerciciosPiernas: EjercicioBase[] = [
    { id: 'pier-001', nombre: 'Prensa 45°', grupoMuscular: 'piernas', equipamiento: 'Máquina Prensa', esCompuesto: true },
    { id: 'pier-002', nombre: 'Prensa 90°', grupoMuscular: 'piernas', equipamiento: 'Máquina Prensa', esCompuesto: true },
    { id: 'pier-003', nombre: 'Leg Curl (Femorales)', grupoMuscular: 'piernas', equipamiento: 'Máquina', esCompuesto: false },
    { id: 'pier-004', nombre: 'Leg Extension (Cuádriceps)', grupoMuscular: 'piernas', equipamiento: 'Máquina', esCompuesto: false },
    { id: 'pier-005', nombre: 'Gemelos', grupoMuscular: 'piernas', equipamiento: 'Máquina', esCompuesto: false },
    { id: 'pier-006', nombre: 'Máquina Aductores', grupoMuscular: 'piernas', equipamiento: 'Máquina', esCompuesto: false },
    { id: 'pier-007', nombre: 'Máquina Abductores', grupoMuscular: 'piernas', equipamiento: 'Máquina', esCompuesto: false },
    { id: 'pier-008', nombre: 'Multi-Hip', grupoMuscular: 'piernas', equipamiento: 'Máquina', esCompuesto: false },
    { id: 'pier-009', nombre: 'Sentadilla Sissy', grupoMuscular: 'piernas', equipamiento: 'Máquina Sissy', esCompuesto: true },
    { id: 'pier-010', nombre: 'Sentadilla con Barra', grupoMuscular: 'piernas', equipamiento: 'Barra', esCompuesto: true },
    { id: 'pier-011', nombre: 'Sentadilla con Smith', grupoMuscular: 'piernas', equipamiento: 'Smith', esCompuesto: true },
    { id: 'pier-012', nombre: 'Sentadilla con Mancuernas', grupoMuscular: 'piernas', equipamiento: 'Mancuernas', esCompuesto: true },
    { id: 'pier-013', nombre: 'Peso Muerto con Barra', grupoMuscular: 'piernas', equipamiento: 'Barra', esCompuesto: true },
    { id: 'pier-014', nombre: 'Peso Muerto con Mancuernas', grupoMuscular: 'piernas', equipamiento: 'Mancuernas', esCompuesto: true },
];

const ejerciciosGluteos: EjercicioBase[] = [
    { id: 'glut-001', nombre: 'Hip Thrust con Barra', grupoMuscular: 'gluteos', equipamiento: 'Barra/Banco', esCompuesto: true },
    { id: 'glut-002', nombre: 'Hip Thrust con Smith', grupoMuscular: 'gluteos', equipamiento: 'Smith/Banco', esCompuesto: true },
    { id: 'glut-003', nombre: 'Hip Thrust en Colchoneta', grupoMuscular: 'gluteos', equipamiento: 'Colchoneta', esCompuesto: true },
    { id: 'glut-004', nombre: 'Glúteos en Polea', grupoMuscular: 'gluteos', equipamiento: 'Polea', esCompuesto: false },
];

// =====================================================
// EXPORTACIÓN COMPLETA
// =====================================================

export const EJERCICIOS_DATABASE: EjercicioBase[] = [
    ...ejerciciosCardio,
    ...ejerciciosEspinales,
    ...ejerciciosAbdominales,
    ...ejerciciosOblicuos,
    ...ejerciciosPectoral,
    ...ejerciciosEspalda,
    ...ejerciciosTrapecio,
    ...ejerciciosHombros,
    ...ejerciciosBiceps,
    ...ejerciciosTriceps,
    ...ejerciciosPiernas,
    ...ejerciciosGluteos,
];

// Mapa de grupos musculares para mostrar en UI
export const GRUPOS_MUSCULARES: Record<GrupoMuscularEjercicio, { nombre: string; emoji: string; color: string }> = {
    calentamiento: { nombre: 'Calentamiento', emoji: '🔥', color: '#F59E0B' },
    cardio: { nombre: 'Cardio', emoji: '❤️', color: '#EF4444' },
    espinales: { nombre: 'Espinales', emoji: '🦴', color: '#8B5CF6' },
    abdominales: { nombre: 'Abdominales', emoji: '💎', color: '#3B82F6' },
    oblicuos: { nombre: 'Oblicuos', emoji: '↔️', color: '#06B6D4' },
    pectoral: { nombre: 'Pectoral', emoji: '💪', color: '#EC4899' },
    espalda: { nombre: 'Espalda', emoji: '🔙', color: '#10B981' },
    trapecio: { nombre: 'Trapecio', emoji: '⬆️', color: '#14B8A6' },
    hombros: { nombre: 'Hombros', emoji: '🎯', color: '#F97316' },
    biceps: { nombre: 'Bíceps', emoji: '💪', color: '#EF4444' },
    triceps: { nombre: 'Tríceps', emoji: '🦾', color: '#8B5CF6' },
    piernas: { nombre: 'Piernas / Glúteos', emoji: '🦵', color: '#22C55E' },
    gluteos: { nombre: 'Piernas / Glúteos', emoji: '🦵', color: '#22C55E' },
};

// Helper functions
export const getEjerciciosPorGrupo = (grupo: GrupoMuscularEjercicio): EjercicioBase[] => {
    return EJERCICIOS_DATABASE.filter(ej => ej.grupoMuscular === grupo);
};

export const buscarEjercicios = (query: string): EjercicioBase[] => {
    const lowerQuery = query.toLowerCase();
    return EJERCICIOS_DATABASE.filter(ej =>
        ej.nombre.toLowerCase().includes(lowerQuery) ||
        ej.equipamiento?.toLowerCase().includes(lowerQuery) ||
        ej.descripcion?.toLowerCase().includes(lowerQuery)
    );
};

export const getEjercicioById = (id: string): EjercicioBase | undefined => {
    return EJERCICIOS_DATABASE.find(ej => ej.id === id);
};

export const getEjerciciosCompuestos = (): EjercicioBase[] => {
    return EJERCICIOS_DATABASE.filter(ej => ej.esCompuesto);
};

export const getEjerciciosAislamiento = (): EjercicioBase[] => {
    return EJERCICIOS_DATABASE.filter(ej => !ej.esCompuesto);
};

export default EJERCICIOS_DATABASE;
