import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { FieldPath } from 'firebase-admin/firestore';
import { getAdminDb } from './lib/firebaseAdmin.mjs';
import { parseArgs } from './lib/cli.mjs';

function toSerializable(value) {
    if (value === null) return null;

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    if (Array.isArray(value)) {
        return value.map((item) => toSerializable(item));
    }

    if (typeof value === 'object') {
        if (typeof value.toDate === 'function' && typeof value.seconds === 'number') {
            return value.toDate().toISOString();
        }

        if (typeof value.latitude === 'number' && typeof value.longitude === 'number') {
            return {
                __type: 'GeoPoint',
                latitude: value.latitude,
                longitude: value.longitude,
            };
        }

        if (typeof value.path === 'string' && typeof value.id === 'string') {
            const constructorName = value.constructor?.name || '';
            if (constructorName === 'DocumentReference') {
                return {
                    __type: 'DocumentReference',
                    path: value.path,
                };
            }
        }

        const result = {};
        for (const [key, nested] of Object.entries(value)) {
            result[key] = toSerializable(nested);
        }
        return result;
    }

    return String(value);
}

function sanitizeCollectionName(collectionPath) {
    return collectionPath.replace(/[\\/]/g, '_');
}

async function main() {
    const args = parseArgs();
    const collectionPath = String(args.collection || args.c || '').trim();

    if (!collectionPath) {
        throw new Error('Missing required argument: --collection');
    }

    const batchSize = Math.max(1, Math.min(500, Number(args.batchSize || 250)));
    const limit = Number(args.limit || 0);

    const fallbackOutput = path.join(
        'backups',
        `${sanitizeCollectionName(collectionPath)}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    );
    const outputPath = String(args.out || fallbackOutput);

    const db = getAdminDb();
    const collectionRef = db.collection(collectionPath);

    const documents = [];
    let lastDocId = null;
    let processed = 0;

    while (true) {
        let query = collectionRef.orderBy(FieldPath.documentId()).limit(batchSize);
        if (lastDocId) query = query.startAfter(lastDocId);

        const snapshot = await query.get();
        if (snapshot.empty) break;

        for (const docSnap of snapshot.docs) {
            documents.push({
                id: docSnap.id,
                path: docSnap.ref.path,
                data: toSerializable(docSnap.data()),
            });

            processed += 1;
            lastDocId = docSnap.id;

            if (limit > 0 && processed >= limit) {
                break;
            }
        }

        if (limit > 0 && processed >= limit) {
            break;
        }
    }

    const payload = {
        exportedAt: new Date().toISOString(),
        projectId: process.env.FIREBASE_PROJECT_ID || null,
        collectionPath,
        count: documents.length,
        documents,
    };

    const resolvedOutput = path.resolve(outputPath);
    fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });
    fs.writeFileSync(resolvedOutput, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

    console.log('Backup completed successfully.');
    console.log(`Collection: ${collectionPath}`);
    console.log(`Documents exported: ${documents.length}`);
    console.log(`Output file: ${resolvedOutput}`);
}

main().catch((error) => {
    console.error('Backup failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
});
