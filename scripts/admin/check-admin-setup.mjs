import 'dotenv/config';
import { getAdminDb } from './lib/firebaseAdmin.mjs';

function printSetupHints() {
    console.log('');
    console.log('Setup hints:');
    console.log('1. Create a Service Account key in Firebase Console > Project settings > Service accounts.');
    console.log('2. Save the JSON file in this project (example: credentials/firebase-admin.json).');
    console.log('3. Set FIREBASE_PROJECT_ID and FIREBASE_SERVICE_ACCOUNT_KEY_PATH in .env.');
    console.log('4. Run this command again: npm run admin:check');
}

async function main() {
    const projectId = process.env.FIREBASE_PROJECT_ID || '(not set)';
    const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS || '(not set)';

    console.log('=== Firebase Admin Setup Check ===');
    console.log(`FIREBASE_PROJECT_ID: ${projectId}`);
    console.log(`FIREBASE_SERVICE_ACCOUNT_KEY_PATH: ${keyPath}`);

    const db = getAdminDb();
    const probe = await db.collection('users').limit(1).get();

    console.log('');
    console.log('Admin SDK authentication is working.');
    console.log(`Probe query succeeded (users read count: ${probe.size}).`);
}

main().catch((error) => {
    console.error('Admin setup check failed:', error instanceof Error ? error.message : String(error));
    printSetupHints();
    process.exit(1);
});
