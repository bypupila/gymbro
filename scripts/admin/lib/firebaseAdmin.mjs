import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

function readServiceAccountFromFile(filePath) {
    const resolvedPath = path.resolve(filePath);

    if (!fs.existsSync(resolvedPath)) {
        throw new Error(
            `No se encontro el archivo de credenciales en: ${resolvedPath}. ` +
            'Define FIREBASE_SERVICE_ACCOUNT_KEY_PATH con una ruta valida.'
        );
    }

    const content = fs.readFileSync(resolvedPath, 'utf8');

    try {
        return JSON.parse(content);
    } catch (error) {
        throw new Error(
            `El archivo de credenciales no contiene JSON valido (${resolvedPath}): ` +
            `${error instanceof Error ? error.message : String(error)}`
        );
    }
}

function readServiceAccountFromEnv() {
    const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!rawJson) return null;

    try {
        return JSON.parse(rawJson);
    } catch (error) {
        throw new Error(
            `FIREBASE_SERVICE_ACCOUNT_JSON no contiene JSON valido: ` +
            `${error instanceof Error ? error.message : String(error)}`
        );
    }
}

function getCredentialConfig() {
    const fromEnv = readServiceAccountFromEnv();
    if (fromEnv) return cert(fromEnv);

    const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (keyPath) return cert(readServiceAccountFromFile(keyPath));

    throw new Error(
        'Credenciales no configuradas. Define FIREBASE_SERVICE_ACCOUNT_KEY_PATH o FIREBASE_SERVICE_ACCOUNT_JSON.'
    );
}

export function getAdminDb() {
    if (getApps().length === 0) {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const credential = getCredentialConfig();

        initializeApp({
            credential,
            ...(projectId ? { projectId } : {}),
        });
    }

    return getFirestore();
}

export { FieldValue };
