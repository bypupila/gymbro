import type { DiaEntrenamiento } from '@/stores/userStore';

const DEFAULT_DAYS: DiaEntrenamiento[] = [
    { dia: 'Lunes', entrena: true, hora: '07:00', grupoMuscular: 'Pecho' },
    { dia: 'Martes', entrena: true, hora: '07:00', grupoMuscular: 'Espalda' },
    { dia: 'Miercoles', entrena: false, hora: '07:00', grupoMuscular: 'Descanso' },
    { dia: 'Jueves', entrena: true, hora: '07:00', grupoMuscular: 'Hombros' },
    { dia: 'Viernes', entrena: true, hora: '07:00', grupoMuscular: 'Piernas' },
    { dia: 'Sabado', entrena: true, hora: '09:00', grupoMuscular: 'Brazos' },
    { dia: 'Domingo', entrena: false, hora: '09:00', grupoMuscular: 'Descanso' },
];

export const getDefaultScheduleDays = (): DiaEntrenamiento[] =>
    DEFAULT_DAYS.map((day) => ({ ...day }));

export const ensureScheduleDays = (days?: DiaEntrenamiento[] | null): DiaEntrenamiento[] => {
    if (!Array.isArray(days) || days.length === 0) {
        return getDefaultScheduleDays();
    }
    return days.map((day) => ({ ...day }));
};

