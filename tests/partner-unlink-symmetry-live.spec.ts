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

test.describe('Partner unlink symmetry live', () => {
    test.skip(
        !emailA || !passwordA || !emailB || !passwordB || !serviceAccountPath,
        'GYMBRO_EMAIL/GYMBRO_PASSWORD/GYMBRO_EMAIL_2/GYMBRO_PASSWORD_2/FIREBASE_SERVICE_ACCOUNT_KEY_PATH are required.',
    );

    test('unlinking from one side clears link in both profiles', async ({ browser, page }) => {
        test.setTimeout(180000);
        const { auth, db } = getAdmin();

        const userA = await auth.getUserByEmail(emailA as string);
        const userB = await auth.getUserByEmail(emailB as string);
        const uidA = userA.uid;
        const uidB = userB.uid;
        const aliasA = (userA.displayName || 'qa_a').toLowerCase();
        const aliasB = (userB.displayName || 'qa_b').toLowerCase();
        const nowIso = new Date().toISOString();

        const resetBatch = db.batch();
        resetBatch.set(db.doc(`users/${uidA}`), { displayName: aliasA, role: 'user', updatedAt: nowIso }, { merge: true });
        resetBatch.set(db.doc(`users/${uidB}`), { displayName: aliasB, role: 'user', updatedAt: nowIso }, { merge: true });
        resetBatch.set(db.doc(`userAliases/${aliasA}`), { userId: uidA, updatedAt: nowIso }, { merge: true });
        resetBatch.set(db.doc(`userAliases/${aliasB}`), { userId: uidB, updatedAt: nowIso }, { merge: true });
        resetBatch.set(db.doc(`users/${uidA}/profile/main`), {
            onboardingCompletado: true,
            partnerId: uidB,
            partnerIds: [uidB],
            activePartnerId: uidB,
            partners: [{ id: uidB, alias: aliasB, nombre: aliasB }],
            routineSync: { enabled: false, partnerId: null, mode: 'manual', syncId: null, updatedAt: nowIso },
            linkSetupPendingPartnerId: null,
            updatedAt: nowIso,
        }, { merge: true });
        resetBatch.set(db.doc(`users/${uidB}/profile/main`), {
            onboardingCompletado: true,
            partnerId: uidA,
            partnerIds: [uidA],
            activePartnerId: uidA,
            partners: [{ id: uidA, alias: aliasA, nombre: aliasA }],
            routineSync: { enabled: false, partnerId: null, mode: 'manual', syncId: null, updatedAt: nowIso },
            linkSetupPendingPartnerId: null,
            updatedAt: nowIso,
        }, { merge: true });
        await resetBatch.commit();

        const [oldLinkA, oldLinkB, oldUnlinkAB, oldUnlinkBA] = await Promise.all([
            db.collection('linkRequests').where('requesterId', '==', uidA).where('recipientId', '==', uidB).get(),
            db.collection('linkRequests').where('requesterId', '==', uidB).where('recipientId', '==', uidA).get(),
            db.collection('relationshipActions').where('sourceUserId', '==', uidA).where('targetUserId', '==', uidB).where('actionType', '==', 'UNLINK').get(),
            db.collection('relationshipActions').where('sourceUserId', '==', uidB).where('targetUserId', '==', uidA).where('actionType', '==', 'UNLINK').get(),
        ]);
        await Promise.all([
            ...oldLinkA.docs.map((d) => d.ref.delete()),
            ...oldLinkB.docs.map((d) => d.ref.delete()),
            ...oldUnlinkAB.docs.map((d) => d.ref.delete()),
            ...oldUnlinkBA.docs.map((d) => d.ref.delete()),
        ]);

        await db.collection('linkRequests').add({
            requesterId: uidA,
            requesterAlias: aliasA,
            recipientId: uidB,
            recipientAlias: aliasB,
            status: 'accepted',
            createdAt: nowIso,
            resolvedAt: nowIso,
        });

        await login(page, emailB as string, passwordB as string);
        await expect(page.locator('button[title="Desvincular partner"]')).toBeVisible({ timeout: 30000 });

        await page.locator('button[title="Desvincular partner"]').click();
        await page.getByRole('button', { name: 'Desvincular', exact: true }).click();

        await expect.poll(async () => {
            const profileB = await db.doc(`users/${uidB}/profile/main`).get();
            const dataB = profileB.data() || {};
            const linkedB = dataB.partnerId === uidA || dataB.activePartnerId === uidA || (Array.isArray(dataB.partnerIds) && dataB.partnerIds.includes(uidA));
            return !linkedB;
        }, { timeout: 45000, intervals: [1000, 2000, 3000] }).toBeTruthy();

        const contextA = await browser.newContext();
        const pageA = await contextA.newPage();
        await login(pageA, emailA as string, passwordA as string);
        await pageA.waitForTimeout(6000);

        await expect.poll(async () => {
            const [profileA, profileB] = await Promise.all([
                db.doc(`users/${uidA}/profile/main`).get(),
                db.doc(`users/${uidB}/profile/main`).get(),
            ]);
            const dataA = profileA.data() || {};
            const dataB = profileB.data() || {};
            const linkedA = dataA.partnerId === uidB || dataA.activePartnerId === uidB || (Array.isArray(dataA.partnerIds) && dataA.partnerIds.includes(uidB));
            const linkedB = dataB.partnerId === uidA || dataB.activePartnerId === uidA || (Array.isArray(dataB.partnerIds) && dataB.partnerIds.includes(uidA));
            return !linkedA && !linkedB;
        }, { timeout: 45000, intervals: [1000, 2000, 3000] }).toBeTruthy();

        await contextA.close();
    });
});
