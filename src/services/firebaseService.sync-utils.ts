import type { PartnerInfo, PerfilCompleto } from '../stores/userStore';

export type ProfileSyncPayload = {
    usuario: PerfilCompleto['usuario'];
    pareja: PerfilCompleto['pareja'];
    horario: PerfilCompleto['horario'];
    rutina: {
        id: string;
        nombre: string;
        duracionSemanas: number;
        ejercicios: NonNullable<PerfilCompleto['rutina']>['ejercicios'];
        fechaInicio: string;
        fechaExpiracion?: string;
        analizadaPorIA: boolean;
        isDefault: boolean;
    } | null;
    onboardingCompletado: boolean;
    partnerId: string | null;
    partners: PartnerInfo[];
    partnerIds: string[];
    activePartnerId: string | null;
    routineSync: PerfilCompleto['routineSync'];
    linkSetupPendingPartnerId: string | null;
    weeklyTracking: PerfilCompleto['weeklyTracking'];
    catalogoExtras: string[];
    defaultRoutineId: string | null;
    updatedAt: string;
};

export type ProfileSyncComparablePayload = Omit<ProfileSyncPayload, 'updatedAt'>;

export type AcceptedPartnerEvent = {
    partner: PartnerInfo;
    acceptedAtMs: number;
};

export type UnlinkPartnerEvent = {
    partnerId: string;
    createdAtMs: number;
};

const isEqualForSync = (a: unknown, b: unknown): boolean => {
    return JSON.stringify(a) === JSON.stringify(b);
};

export const toProfileSyncPayload = (profile: PerfilCompleto, nowIso = new Date().toISOString()): ProfileSyncPayload => ({
    usuario: profile.usuario,
    pareja: profile.pareja,
    horario: profile.horario,
    rutina: profile.rutina ? {
        id: profile.rutina.id,
        nombre: profile.rutina.nombre,
        duracionSemanas: profile.rutina.duracionSemanas,
        ejercicios: profile.rutina.ejercicios,
        fechaInicio: profile.rutina.fechaInicio,
        fechaExpiracion: profile.rutina.fechaExpiracion,
        analizadaPorIA: profile.rutina.analizadaPorIA,
        isDefault: profile.rutina.isDefault || false,
    } : null,
    onboardingCompletado: profile.onboardingCompletado,
    partnerId: profile.partnerId || null,
    partners: profile.partners || [],
    partnerIds: profile.partnerIds || [],
    activePartnerId: profile.activePartnerId || null,
    routineSync: profile.routineSync || {
        enabled: false,
        partnerId: null,
        mode: 'manual',
        syncId: null,
        updatedAt: nowIso,
    },
    linkSetupPendingPartnerId: profile.linkSetupPendingPartnerId || null,
    weeklyTracking: profile.weeklyTracking || {},
    catalogoExtras: profile.catalogoExtras || [],
    defaultRoutineId: profile.defaultRoutineId || null,
    updatedAt: nowIso,
});

export const toProfileComparablePayload = (profile: PerfilCompleto): ProfileSyncComparablePayload => {
    const payload = toProfileSyncPayload(profile);
    // Exclude transport timestamp so comparisons are stable.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { updatedAt, ...comparable } = payload;
    return comparable;
};

export const getProfileSyncFingerprint = (profile: PerfilCompleto): string => {
    return JSON.stringify(toProfileComparablePayload(profile));
};

export const buildProfileDiffPatch = (
    previousComparable: ProfileSyncComparablePayload,
    nextComparable: ProfileSyncComparablePayload,
    makeDeleteField: () => unknown
): Record<string, unknown> => {
    const patch: Record<string, unknown> = {};

    (Object.keys(nextComparable) as Array<keyof ProfileSyncComparablePayload>).forEach((key) => {
        if (key === 'weeklyTracking') {
            return;
        }
        if (!isEqualForSync(previousComparable[key], nextComparable[key])) {
            patch[key] = nextComparable[key];
        }
    });

    const previousWeekly = previousComparable.weeklyTracking || {};
    const nextWeekly = nextComparable.weeklyTracking || {};
    const weeklyKeys = new Set([
        ...Object.keys(previousWeekly),
        ...Object.keys(nextWeekly),
    ]);

    for (const dateKey of weeklyKeys) {
        const prevValue = previousWeekly[dateKey];
        const nextValue = nextWeekly[dateKey];
        if (isEqualForSync(prevValue, nextValue)) {
            continue;
        }
        const fieldPath = `weeklyTracking.${dateKey}`;
        patch[fieldPath] = typeof nextValue === 'undefined' ? makeDeleteField() : nextValue;
    }

    return patch;
};

const latestById = <T>(items: T[], idGetter: (item: T) => string, timeGetter: (item: T) => number): Map<string, T> => {
    const map = new Map<string, T>();
    items.forEach((item) => {
        const id = idGetter(item);
        const current = map.get(id);
        if (!current || timeGetter(item) >= timeGetter(current)) {
            map.set(id, item);
        }
    });
    return map;
};

export const resolveActivePartnersFromEvents = (
    acceptedEvents: AcceptedPartnerEvent[],
    unlinkEvents: UnlinkPartnerEvent[],
    maxPartners = 1
): PartnerInfo[] => {
    const acceptedByPartner = latestById(
        acceptedEvents,
        (item) => item.partner.id,
        (item) => item.acceptedAtMs
    );

    const unlinkedAtByPartner = latestById(
        unlinkEvents,
        (item) => item.partnerId,
        (item) => item.createdAtMs
    );

    return Array.from(acceptedByPartner.values())
        .filter((item) => {
            const unlinkEvent = unlinkedAtByPartner.get(item.partner.id);
            return !unlinkEvent || item.acceptedAtMs > unlinkEvent.createdAtMs;
        })
        .sort((a, b) => b.acceptedAtMs - a.acceptedAtMs)
        .map((item) => item.partner)
        .slice(0, maxPartners);
};
