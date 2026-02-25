import process from 'node:process';
import { getAuth } from 'firebase-admin/auth';
import { getAdminDb } from './lib/firebaseAdmin.mjs';
import { parseArgs, printUsage } from './lib/cli.mjs';

function normalizeBoolean(value) {
    if (value == null) return true;
    const normalized = String(value).trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    throw new Error(`Valor invalido para --admin: ${value}`);
}

async function resolveUid({ uid, email, alias }) {
    const auth = getAuth();
    if (uid) return uid;

    if (email) {
        const user = await auth.getUserByEmail(email);
        return user.uid;
    }

    if (alias) {
        const db = getAdminDb();
        const aliasSnap = await db.collection('userAliases').doc(alias.toLowerCase().trim()).get();
        if (!aliasSnap.exists) {
            throw new Error(`Alias no encontrado: ${alias}`);
        }
        const aliasData = aliasSnap.data() || {};
        if (!aliasData.userId || typeof aliasData.userId !== 'string') {
            throw new Error(`Alias sin userId valido: ${alias}`);
        }
        return aliasData.userId;
    }

    throw new Error('Debes indicar --uid, --email o --alias.');
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help || args.h) {
        printUsage('set-admin-claim', `
Uso:
  node scripts/admin/set-admin-claim.mjs --uid=<uid> [--admin=true]
  node scripts/admin/set-admin-claim.mjs --email=<email> [--admin=true]
  node scripts/admin/set-admin-claim.mjs --alias=<alias> [--admin=true]

Opciones:
  --uid     UID de Firebase Auth.
  --email   Email para resolver UID.
  --alias   Alias (coleccion userAliases) para resolver UID.
  --admin   true|false (default: true).
`);
        process.exit(0);
    }

    getAdminDb(); // ensure admin app initialized
    const uid = await resolveUid({
        uid: args.uid,
        email: args.email,
        alias: args.alias,
    });
    const isAdmin = normalizeBoolean(args.admin);

    const auth = getAuth();
    const user = await auth.getUser(uid);
    const currentClaims = user.customClaims || {};
    const nextClaims = {
        ...currentClaims,
        admin: isAdmin,
    };

    await auth.setCustomUserClaims(uid, nextClaims);
    console.log(`Custom claim admin=${isAdmin} aplicada a uid=${uid}`);
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
