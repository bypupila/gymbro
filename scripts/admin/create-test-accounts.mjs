import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp() {
    if (getApps().length > 0) {
        return getApps()[0];
    }

    const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH;
    if (!keyPath) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY_PATH no esta configurado en .env');
    }

    const serviceAccount = JSON.parse(readFileSync(resolve(keyPath), 'utf8'));
    return initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
    });
}

function randomPassword() {
    return `Gymbro!${randomBytes(8).toString('hex')}`;
}

function upsertEnvValue(envContent, key, value) {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=.*$`, 'm');
    if (pattern.test(envContent)) {
        return envContent.replace(pattern, line);
    }
    return `${envContent.trimEnd()}\n${line}\n`;
}

function buildProfilePayload(name) {
    const now = new Date().toISOString();
    return {
        usuario: {
            nombre: name,
            edad: 30,
            peso: 70,
            altura: 170,
            nivel: 'intermedio',
            objetivo: 'mantener',
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
            updatedAt: now,
        },
        linkSetupPendingPartnerId: null,
        weeklyTracking: {},
        catalogoExtras: [],
        defaultRoutineId: null,
        updatedAt: now,
    };
}

async function createOrResetAccount(auth, db, email, password, displayName) {
    let userRecord;
    try {
        userRecord = await auth.getUserByEmail(email);
        await auth.updateUser(userRecord.uid, {
            password,
            displayName,
            emailVerified: true,
            disabled: false,
        });
    } catch (error) {
        if (error?.code === 'auth/user-not-found') {
            userRecord = await auth.createUser({
                email,
                password,
                displayName,
                emailVerified: true,
                disabled: false,
            });
        } else {
            throw error;
        }
    }

    const uid = userRecord.uid;
    const batch = db.batch();
    batch.set(db.doc(`users/${uid}`), {
        displayName,
        role: 'user',
        updatedAt: new Date().toISOString(),
    }, { merge: true });
    batch.set(db.doc(`users/${uid}/profile/main`), buildProfilePayload(displayName));
    await batch.commit();
    return { uid, email, password, displayName };
}

async function main() {
    const app = getAdminApp();
    const auth = getAuth(app);
    const db = getFirestore(app);
    const suffix = Date.now().toString().slice(-6);

    const accountA = {
        email: `gymbro.qa.a.${suffix}@example.com`,
        password: randomPassword(),
        displayName: `qa_a_${suffix}`,
    };

    const accountB = {
        email: `gymbro.qa.b.${suffix}@example.com`,
        password: randomPassword(),
        displayName: `qa_b_${suffix}`,
    };

    const createdA = await createOrResetAccount(auth, db, accountA.email, accountA.password, accountA.displayName);
    const createdB = await createOrResetAccount(auth, db, accountB.email, accountB.password, accountB.displayName);

    const envPath = resolve('.env');
    let envContent = readFileSync(envPath, 'utf8');
    envContent = upsertEnvValue(envContent, 'GYMBRO_EMAIL', createdA.email);
    envContent = upsertEnvValue(envContent, 'GYMBRO_PASSWORD', createdA.password);
    envContent = upsertEnvValue(envContent, 'GYMBRO_EMAIL_2', createdB.email);
    envContent = upsertEnvValue(envContent, 'GYMBRO_PASSWORD_2', createdB.password);
    envContent = upsertEnvValue(envContent, 'GYMBRO_BASE_URL', process.env.GYMBRO_BASE_URL || 'https://gym.bypupila.com');
    writeFileSync(envPath, envContent, 'utf8');

    console.log('QA accounts created/updated successfully.');
    console.log(`A uid=${createdA.uid} alias=${createdA.displayName}`);
    console.log(`B uid=${createdB.uid} alias=${createdB.displayName}`);
    console.log('.env updated with GYMBRO_EMAIL/GYMBRO_PASSWORD and *_2 variables.');
}

main().catch((error) => {
    console.error('Failed creating QA accounts:', error);
    process.exit(1);
});
