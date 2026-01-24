import { EjercicioRutina } from '@/stores/userStore';

/**
 * Removes duplicate exercises from a list based on their content (Day, Name, Details).
 * Ensures that exactly identical exercises do not exist on the same day.
 */
export const cleanupRoutineExercises = (exercises: EjercicioRutina[]): EjercicioRutina[] => {
    const uniqueExercises: EjercicioRutina[] = [];
    const seen = new Set();

    exercises.forEach((ex) => {
        // Normalize Day: specific day or "No Asignado"
        const dayKey = (ex.dia && ex.dia.trim().length > 0) ? ex.dia.trim() : 'No Asignado';
        const nameKey = ex.nombre.trim().toLowerCase();

        // Create a signature for "Exact Equality"
        // If two exercises have same Name, Day, Series, Reps, Category, Focus, Rest -> They are duplicates.
        const signature = `${dayKey}|${nameKey}|${ex.categoria}|${ex.series}|${ex.repeticiones}|${ex.enfocadoA || 'ambos'}|${ex.descanso}`;

        if (!seen.has(signature)) {
            seen.add(signature);
            uniqueExercises.push(ex);
        }
    });

    return uniqueExercises;
};
