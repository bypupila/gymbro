import { PerfilCompleto, EntrenamientoRealizado, ExtraActivity } from '@/stores/userStore';

export interface GlobalStats {
    totalSessions: number;
    totalMinutes: number;
    totalCalories: number;
    streak: number;
    consistency: number;
    unifiedHistory: Array<{
        type: 'gym' | 'extra' | 'manual';
        date: Date;
        data: EntrenamientoRealizado | ExtraActivity | null;
    }>;
}

export const calculateGlobalStats = (perfil: PerfilCompleto): GlobalStats => {
    const history = perfil.historial || [];
    const extras = perfil.actividadesExtras || [];
    const tracking = perfil.weeklyTracking || {};

    // 1. Unified History
    const unifiedHistory = [
        ...history.map(h => ({ type: 'gym' as const, date: new Date(h.fecha), data: h })),
        ...extras.map(e => ({ type: 'extra' as const, date: new Date(e.fecha), data: e })),
        ...Object.keys(tracking).filter(dateStr => {
            // Only add if not already covered by gym or extra, and if status is completed/true
            const hasGym = history.some(h => h.fecha.startsWith(dateStr));
            const hasExtra = extras.some(e => e.fecha.startsWith(dateStr));
            const status = tracking[dateStr];
            const isCompleted = status === 'completed' || status === true;
            return isCompleted && !hasGym && !hasExtra;
        }).map(dateStr => ({ type: 'manual' as const, date: new Date(dateStr + 'T12:00:00'), data: null }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    // 2. Totals
    const totalSessions = unifiedHistory.length;

    const totalMinutes = unifiedHistory.reduce((acc, item) => {
        if (item.type === 'gym') {
            return acc + ((item.data as EntrenamientoRealizado).duracionMinutos || 0);
        } else if (item.type === 'extra') {
            return acc + ((item.data as ExtraActivity).analisisIA?.duracionMinutos || 0);
        }
        return acc; // manual has no minutes data
    }, 0);

    const totalCalories = unifiedHistory.reduce((acc, item) => {
        if (item.type === 'gym') {
            const data = item.data as EntrenamientoRealizado;
            const weight = perfil.usuario.peso || 70;
            const gymCals = Math.round(4.5 * weight * ((data.duracionMinutos || 0) / 60));
            return acc + gymCals;
        } else if (item.type === 'extra') {
            return acc + ((item.data as ExtraActivity).analisisIA?.calorias || 0);
        }
        return acc; // manual has no calories data
    }, 0);

    // 3. Streak Calculation
    let streak = 0;
    const activeDates = Array.from(new Set(unifiedHistory.map(h => h.date.toDateString())))
        .map(d => new Date(d))
        .sort((a, b) => b.getTime() - a.getTime());

    if (activeDates.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const lastActivity = activeDates[0];
        lastActivity.setHours(0, 0, 0, 0);

        const diffDays = (today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);

        if (diffDays <= 1) { // Authorized gap: 1 day (yesterday)
            streak = 1;
            for (let i = 0; i < activeDates.length - 1; i++) {
                const curr = activeDates[i];
                const next = activeDates[i + 1];
                const diff = (curr.getTime() - next.getTime()) / (1000 * 60 * 60 * 24);
                if (diff === 1) streak++;
                else break;
            }
        }
    }

    // 4. Consistency (Weekly Compliance)
    const plannedDays = perfil.horario.dias.filter(d => d.entrena).length || 1; // Avoid div by 0
    // Calculate current week's active days
    const startOfWeek = new Date();
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const activeDaysThisWeek = activeDates.filter(d => d >= startOfWeek).length;
    const consistency = Math.min(Math.round((activeDaysThisWeek / plannedDays) * 100), 100);

    return {
        totalSessions,
        totalMinutes,
        totalCalories,
        streak,
        consistency,
        unifiedHistory
    };
};
