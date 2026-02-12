import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const email = process.env.GYMBRO_EMAIL;
const password = process.env.GYMBRO_PASSWORD;
const baseUrl = process.env.GYMBRO_BASE_URL || 'http://127.0.0.1:4173';
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH;

const getAdmin = () => {
    if (getApps().length > 0) {
        return { auth: getAuth(), db: getFirestore() };
    }
    if (!serviceAccountPath) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY_PATH is required');
    }

    const serviceAccount = JSON.parse(readFileSync(resolve(serviceAccountPath), 'utf8'));
    const app = initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
    });
    return { auth: getAuth(app), db: getFirestore(app) };
};

const login = async (page: Page, emailValue: string, passwordValue: string) => {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('Ej: TitanFit o usuario@email.com').fill(emailValue);
    await page.getByPlaceholder('******').fill(passwordValue);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect.poll(() => page.url().includes('/login'), { timeout: 45000 }).toBeFalsy();
};

test.describe('Onboarding persistence live', () => {
    test.skip(
        !email || !password || !serviceAccountPath,
        'GYMBRO_EMAIL/GYMBRO_PASSWORD/FIREBASE_SERVICE_ACCOUNT_KEY_PATH are required.',
    );

    test('completing onboarding stays completed after sync and reload', async ({ page }) => {
        test.setTimeout(240000);
        const { auth, db } = getAdmin();
        const user = await auth.getUserByEmail(email as string);
        const uid = user.uid;
        const nowIso = new Date().toISOString();

        await db.doc(`users/${uid}`).set({
            displayName: user.displayName || 'qa_a_live',
            role: 'user',
            updatedAt: nowIso,
        }, { merge: true });

        await db.doc(`users/${uid}/profile/main`).set({
            usuario: {
                nombre: '',
                edad: 0,
                peso: 0,
                altura: 0,
                nivel: 'principiante',
                objetivo: 'ganar_musculo',
                lesiones: '',
            },
            pareja: null,
            horario: {
                dias: [
                    { dia: 'Lunes', entrena: true, hora: '07:00', grupoMuscular: 'Pecho' },
                    { dia: 'Martes', entrena: true, hora: '07:00', grupoMuscular: 'Espalda' },
                    { dia: 'Miercoles', entrena: false, hora: '07:00', grupoMuscular: 'Descanso' },
                    { dia: 'Jueves', entrena: true, hora: '07:00', grupoMuscular: 'Hombros' },
                    { dia: 'Viernes', entrena: true, hora: '07:00', grupoMuscular: 'Piernas' },
                    { dia: 'Sabado', entrena: true, hora: '09:00', grupoMuscular: 'Brazos' },
                    { dia: 'Domingo', entrena: false, hora: '09:00', grupoMuscular: 'Descanso' },
                ],
            },
            rutina: null,
            historial: [],
            historialRutinas: [],
            onboardingCompletado: false,
            partnerId: null,
            partners: [],
            partnerIds: [],
            activePartnerId: null,
            routineSync: {
                enabled: false,
                partnerId: null,
                mode: 'manual',
                syncId: null,
                updatedAt: nowIso,
            },
            linkSetupPendingPartnerId: null,
            weeklyTracking: {},
            catalogoExtras: [],
            defaultRoutineId: null,
            updatedAt: nowIso,
        }, { merge: true });

        await login(page, email as string, password as string);

        await page.goto(`${baseUrl}/onboarding`, { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('button', { name: /Comenzar/i })).toBeVisible({ timeout: 30000 });
        await page.getByRole('button', { name: /Comenzar/i }).click();

        await page.getByPlaceholder('Tu nombre').fill('Codex QA');
        await page.getByPlaceholder('25').fill('31');
        await page.getByPlaceholder('70').fill('74');
        await page.getByPlaceholder('175').fill('178');
        await page.getByRole('button', { name: /^Continuar/i }).click();

        await expect(page.getByRole('button', { name: /Completar Setup/i })).toBeVisible({ timeout: 30000 });
        await page.getByRole('button', { name: /Completar Setup/i }).click();
        await expect.poll(() => page.url().includes('/onboarding/horarios'), { timeout: 45000 }).toBeFalsy();
        await expect
            .poll(() => {
                const currentUrl = page.url();
                return currentUrl.includes('/onboarding/completado') || !currentUrl.includes('/onboarding');
            }, { timeout: 45000 })
            .toBeTruthy();

        if (page.url().includes('/onboarding/completado')) {
            await page.getByRole('button', { name: /Ir al Dashboard/i }).click();
        }

        await expect.poll(() => page.url().includes('/onboarding'), { timeout: 45000 }).toBeFalsy();

        // Wait beyond autosave debounce to catch race conditions with deferred snapshots.
        await page.waitForTimeout(7000);
        await page.reload({ waitUntil: 'domcontentloaded' });
        if (page.url().includes('/onboarding/completado')) {
            await page.getByRole('button', { name: /Ir al Dashboard/i }).click();
        }
        await expect
            .poll(() => {
                const currentUrl = page.url();
                return (
                    currentUrl.endsWith('/onboarding') ||
                    currentUrl.includes('/onboarding/datos') ||
                    currentUrl.includes('/onboarding/horarios')
                );
            }, { timeout: 45000 })
            .toBeFalsy();

        const profileSnap = await db.doc(`users/${uid}/profile/main`).get();
        expect(profileSnap.data()?.onboardingCompletado).toBeTruthy();
        expect(profileSnap.data()?.usuario?.nombre).toBe('Codex QA');
        expect(profileSnap.data()?.usuario?.edad).toBe(31);
    });
});
