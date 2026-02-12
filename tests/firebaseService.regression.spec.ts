import { expect, test } from '@playwright/test';
import {
    buildProfileDiffPatch,
    resolveActivePartnersFromEvents,
    toProfileSyncPayload,
    toProfileComparablePayload,
} from '../src/services/firebaseService.sync-utils';
import type { PerfilCompleto } from '../src/stores/userStore';

const createBaseProfile = (): PerfilCompleto => ({
    usuario: {
        nombre: 'Test User',
        edad: 30,
        peso: 80,
        altura: 180,
        nivel: 'intermedio',
        objetivo: 'ganar_musculo',
        lesiones: '',
    },
    pareja: null,
    horario: { dias: [] },
    rutina: null,
    historial: [],
    historialRutinas: [],
    onboardingCompletado: true,
    partners: [],
    partnerIds: [],
    activePartnerId: null,
    routineSync: {
        enabled: false,
        partnerId: null,
        mode: 'manual',
        syncId: null,
        updatedAt: '2026-02-11T00:00:00.000Z',
    },
    linkSetupPendingPartnerId: null,
    weeklyTracking: {},
    actividadesExtras: [],
    catalogoExtras: [],
});

test.describe('firebaseService regression helpers', () => {
    test('buildProfileDiffPatch returns empty patch for unchanged profile', () => {
        const profile = createBaseProfile();
        const previousComparable = toProfileComparablePayload(profile);
        const nextComparable = toProfileComparablePayload({ ...profile });

        const patch = buildProfileDiffPatch(previousComparable, nextComparable, () => '__DELETE__');

        expect(patch).toEqual({});
    });

    test('buildProfileDiffPatch patches changed top-level data', () => {
        const previous = createBaseProfile();
        const next = {
            ...createBaseProfile(),
            usuario: {
                ...createBaseProfile().usuario,
                peso: 82,
            },
        };

        const patch = buildProfileDiffPatch(
            toProfileComparablePayload(previous),
            toProfileComparablePayload(next),
            () => '__DELETE__'
        );

        expect(patch).toHaveProperty('usuario');
        expect((patch.usuario as PerfilCompleto['usuario']).peso).toBe(82);
    });

    test('buildProfileDiffPatch emits dot-path patch for weeklyTracking updates', () => {
        const previous = {
            ...createBaseProfile(),
            weeklyTracking: {
                '2026-02-01': 'completed' as const,
            },
        };
        const next = {
            ...createBaseProfile(),
            weeklyTracking: {
                '2026-02-01': 'skipped' as const,
                '2026-02-02': true,
            },
        };

        const patch = buildProfileDiffPatch(
            toProfileComparablePayload(previous),
            toProfileComparablePayload(next),
            () => '__DELETE__'
        );

        expect(patch['weeklyTracking.2026-02-01']).toBe('skipped');
        expect(patch['weeklyTracking.2026-02-02']).toBe(true);
    });

    test('buildProfileDiffPatch emits delete token for removed weeklyTracking keys', () => {
        const deleteToken = { type: 'delete' };
        const previous = {
            ...createBaseProfile(),
            weeklyTracking: {
                '2026-02-01': 'completed' as const,
            },
        };
        const next = {
            ...createBaseProfile(),
            weeklyTracking: {},
        };

        const patch = buildProfileDiffPatch(
            toProfileComparablePayload(previous),
            toProfileComparablePayload(next),
            () => deleteToken
        );

        expect(patch['weeklyTracking.2026-02-01']).toBe(deleteToken);
    });

    test('resolveActivePartnersFromEvents ignores partners unlinked after acceptance', () => {
        const active = resolveActivePartnersFromEvents(
            [
                {
                    partner: { id: 'p1', alias: 'alice', nombre: 'Alice' },
                    acceptedAtMs: 100,
                },
            ],
            [
                {
                    partnerId: 'p1',
                    createdAtMs: 200,
                },
            ],
            1
        );

        expect(active).toEqual([]);
    });

    test('resolveActivePartnersFromEvents keeps partner when re-accepted after unlink', () => {
        const active = resolveActivePartnersFromEvents(
            [
                {
                    partner: { id: 'p1', alias: 'alice-old', nombre: 'Alice Old' },
                    acceptedAtMs: 100,
                },
                {
                    partner: { id: 'p1', alias: 'alice-new', nombre: 'Alice New' },
                    acceptedAtMs: 300,
                },
                {
                    partner: { id: 'p2', alias: 'bob', nombre: 'Bob' },
                    acceptedAtMs: 250,
                },
            ],
            [
                {
                    partnerId: 'p1',
                    createdAtMs: 200,
                },
            ],
            1
        );

        expect(active).toEqual([{ id: 'p1', alias: 'alice-new', nombre: 'Alice New' }]);
    });

    test('toProfileSyncPayload preserves syncMeta for routines', () => {
        const profile = createBaseProfile();
        profile.rutina = {
            id: 'routine_1',
            nombre: 'Rutina base',
            duracionSemanas: 8,
            ejercicios: [],
            fechaInicio: '2026-02-12T00:00:00.000Z',
            analizadaPorIA: false,
            syncMeta: {
                syncId: 'sync_123',
                version: 3,
                updatedBy: 'user_1',
                updatedAt: '2026-02-12T00:00:00.000Z',
            },
        };

        const payload = toProfileSyncPayload(profile);
        expect(payload.rutina?.syncMeta).toEqual(profile.rutina.syncMeta);
    });

    test('toProfileSyncPayload omits undefined routine optional fields', () => {
        const profile = createBaseProfile();
        profile.rutina = {
            id: 'routine_2',
            nombre: 'Rutina limpia',
            duracionSemanas: 6,
            ejercicios: [],
            fechaInicio: '2026-02-12T00:00:00.000Z',
            analizadaPorIA: false,
            fechaExpiracion: undefined,
        };

        const payload = toProfileSyncPayload(profile);
        expect(payload.rutina).toBeTruthy();
        expect(payload.rutina && Object.prototype.hasOwnProperty.call(payload.rutina, 'fechaExpiracion')).toBe(false);
    });
});
