import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

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

async function rotatePasswordForEmail(auth, email, label) {
    if (!email) {
        throw new Error(`Falta ${label} en .env`);
    }

    const user = await auth.getUserByEmail(email);
    const newPassword = randomPassword();
    await auth.updateUser(user.uid, {
        password: newPassword,
        disabled: false,
        emailVerified: true,
    });

    return {
        uid: user.uid,
        email,
        password: newPassword,
    };
}

async function main() {
    const emailA = process.env.GYMBRO_EMAIL;
    const emailB = process.env.GYMBRO_EMAIL_2;
    const envPath = resolve('.env');

    if (!readFileSync(envPath, 'utf8')) {
        throw new Error('No se pudo leer .env');
    }

    const app = getAdminApp();
    const auth = getAuth(app);

    const [accountA, accountB] = await Promise.all([
        rotatePasswordForEmail(auth, emailA, 'GYMBRO_EMAIL'),
        rotatePasswordForEmail(auth, emailB, 'GYMBRO_EMAIL_2'),
    ]);

    let envContent = readFileSync(envPath, 'utf8');
    envContent = upsertEnvValue(envContent, 'GYMBRO_PASSWORD', accountA.password);
    envContent = upsertEnvValue(envContent, 'GYMBRO_PASSWORD_2', accountB.password);
    writeFileSync(envPath, envContent, 'utf8');

    console.log('QA passwords rotated successfully.');
    console.log(`A uid=${accountA.uid} email=${accountA.email}`);
    console.log(`B uid=${accountB.uid} email=${accountB.email}`);
    console.log('.env actualizado con nuevas claves (no impresas por seguridad).');
}

main().catch((error) => {
    console.error('Failed rotating QA passwords:', error instanceof Error ? error.message : error);
    process.exit(1);
});
