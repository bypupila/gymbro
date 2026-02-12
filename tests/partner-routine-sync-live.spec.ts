import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const emailA = process.env.GYMBRO_EMAIL;
const passwordA = process.env.GYMBRO_PASSWORD;
const emailB = process.env.GYMBRO_EMAIL_2;
const passwordB = process.env.GYMBRO_PASSWORD_2;
const baseUrl = process.env.GYMBRO_BASE_URL || 'http://127.0.0.1:4173';
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH;

const createBaseProfile = (name: string) => {
    const nowIso = new Date().toISOString();
    return {
        usuario: {
            nombre: name,
            edad: 30,
            peso: 75,
            altura: 175,
            nivel: 'intermedio',
            objetivo: 'mantener',
            lesiones: '',
        },
        pareja: null,
        horario: { dias: [] },
        rutina: null,
        onboardingCompletado: true,
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
    };
};

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

const login = async (page: Page, email: string, password: string) => {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('Ej: TitanFit o usuario@email.com').fill(email);
    await page.getByPlaceholder('******').fill(password);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect.poll(() => page.url().includes('/login'), { timeout: 45000 }).toBeFalsy();
    await page.goto(`${baseUrl}/profile`, { waitUntil: 'domcontentloaded' });
};

test.describe('Partner routine sync live flow', () => {
    test.skip(
        !emailA || !passwordA || !emailB || !passwordB || !serviceAccountPath,
        'GYMBRO_EMAIL/GYMBRO_PASSWORD/GYMBRO_EMAIL_2/GYMBRO_PASSWORD_2/FIREBASE_SERVICE_ACCOUNT_KEY_PATH are required.',
    );

    test('user1 creates base routine, links user2, copies routine and user2 receives later updates', async ({ browser }) => {
        test.setTimeout(240000);
        const { auth, db } = getAdmin();

        const userA = await auth.getUserByEmail(emailA as string);
        const userB = await auth.getUserByEmail(emailB as string);
        const uidA = userA.uid;
        const uidB = userB.uid;
        const aliasA = (userA.displayName || 'qa_a').toLowerCase();
        const aliasB = (userB.displayName || 'qa_b').toLowerCase();
        const baseExerciseName = `Codex QA Base ${Date.now()}`;
        const extraExerciseName = `Codex QA Extra ${Date.now()}`;

        const resetBatch = db.batch();
        resetBatch.set(db.doc(`users/${uidA}`), { displayName: aliasA, role: 'user' }, { merge: true });
        resetBatch.set(db.doc(`users/${uidB}`), { displayName: aliasB, role: 'user' }, { merge: true });
        resetBatch.set(db.doc(`userAliases/${aliasA}`), { userId: uidA, updatedAt: new Date().toISOString() }, { merge: true });
        resetBatch.set(db.doc(`userAliases/${aliasB}`), { userId: uidB, updatedAt: new Date().toISOString() }, { merge: true });
        resetBatch.set(db.doc(`users/${uidA}/profile/main`), {
            ...createBaseProfile(aliasA),
            rutina: {
                id: `routine_${Date.now()}`,
                nombre: 'Rutina QA Base',
                duracionSemanas: 8,
                ejercicios: [
                    {
                        id: `ex_${Date.now()}`,
                        nombre: baseExerciseName,
                        series: 3,
                        repeticiones: '10-12',
                        descanso: 60,
                        categoria: 'maquina',
                        grupoMuscular: 'pecho',
                    },
                ],
                fechaInicio: new Date().toISOString(),
                analizadaPorIA: false,
                isDefault: false,
            },
        }, { merge: true });
        resetBatch.set(db.doc(`users/${uidB}/profile/main`), createBaseProfile(aliasB), { merge: true });
        await resetBatch.commit();

        const [linkReqA, linkReqB, routineReqA, routineReqB] = await Promise.all([
            db.collection('linkRequests').where('requesterId', '==', uidA).get(),
            db.collection('linkRequests').where('requesterId', '==', uidB).get(),
            db.collection('routineRequests').where('fromUserId', '==', uidA).get(),
            db.collection('routineRequests').where('fromUserId', '==', uidB).get(),
        ]);
        await Promise.all([
            ...linkReqA.docs.map((d) => d.ref.delete()),
            ...linkReqB.docs.map((d) => d.ref.delete()),
            ...routineReqA.docs.map((d) => d.ref.delete()),
            ...routineReqB.docs.map((d) => d.ref.delete()),
        ]);

        const contextA = await browser.newContext();
        const contextB = await browser.newContext();
        const pageA = await contextA.newPage();
        const pageB = await contextB.newPage();

        await Promise.all([
            login(pageA, emailA as string, passwordA as string),
            login(pageB, emailB as string, passwordB as string),
        ]);

        await pageA.getByRole('button', { name: /Vincular Pareja/i }).click();
        await pageA.getByPlaceholder('ej: titan23').fill(aliasB);
        await pageA.getByRole('button', { name: 'Buscar' }).click();
        await pageA.getByRole('button', { name: /Enviar Solicitud/i }).click();

        await pageB.goto(`${baseUrl}/profile`, { waitUntil: 'domcontentloaded' });
        await expect(pageB.getByText('quiere vincularse contigo')).toBeVisible({ timeout: 30000 });
        await pageB.getByRole('button', { name: 'Aceptar solicitud' }).first().click();

        await expect.poll(async () => {
            const [profileA, profileB] = await Promise.all([
                db.doc(`users/${uidA}/profile/main`).get(),
                db.doc(`users/${uidB}/profile/main`).get(),
            ]);
            const linkedA = profileA.data()?.activePartnerId === uidB || profileA.data()?.partnerId === uidB;
            const linkedB = profileB.data()?.activePartnerId === uidA || profileB.data()?.partnerId === uidA;
            return linkedA && linkedB;
        }, { timeout: 45000, intervals: [1000, 2000, 3000] }).toBeTruthy();

        await pageA.locator('button[title=\"Copiar rutina\"]').click();
        await pageA.getByRole('button', { name: /Solicitar enviar mi rutina/i }).click();

        await pageB.goto(`${baseUrl}/profile`, { waitUntil: 'domcontentloaded' });
        const routineCard = pageB.locator('div', { hasText: 'Solicitud de rutina' }).first();
        await expect(routineCard).toBeVisible({ timeout: 45000 });
        await routineCard.getByRole('button', { name: 'Aceptar' }).click();

        await pageB.goto(`${baseUrl}/routine`, { waitUntil: 'domcontentloaded' });
        await expect(pageB.getByText(baseExerciseName)).toBeVisible({ timeout: 45000 });

        await pageA.goto(`${baseUrl}/routine`, { waitUntil: 'domcontentloaded' });
        await pageA.getByRole('button', { name: /Anadir$/i }).first().click();
        await pageA.getByPlaceholder('Ej: Press de Banca').fill(extraExerciseName);
        await pageA.getByRole('button', { name: /Anadir Ejercicio/i }).click();
        await expect(pageA.getByText(extraExerciseName)).toBeVisible({ timeout: 30000 });

        await pageB.goto(`${baseUrl}/routine`, { waitUntil: 'domcontentloaded' });
        await expect.poll(async () => {
            await pageB.reload({ waitUntil: 'domcontentloaded' });
            return await pageB.getByText(extraExerciseName).count();
        }, { timeout: 60000, intervals: [1000, 2000, 3000] }).toBeGreaterThan(0);

        await contextA.close();
        await contextB.close();
    });
});
