import 'dotenv/config';
import { getAuth } from 'firebase-admin/auth';
import { getAdminDb } from './lib/firebaseAdmin.mjs';
import { parseArgs, toStringArray } from './lib/cli.mjs';

const USER_DELETE_BATCH_LIMIT = 400;

const GLOBAL_QUERIES = [
    { collection: 'linkRequests', fields: ['requesterId', 'recipientId'] },
    { collection: 'relationshipActions', fields: ['sourceUserId', 'targetUserId', 'initiatedBy'] },
    { collection: 'routineRequests', fields: ['fromUserId', 'toUserId', 'sourceUserId', 'targetUserId'] },
    { collection: 'trainingInvitations', fields: ['fromUserId', 'toUserId'] },
];

function toUnique(values) {
    return Array.from(new Set(values.filter(Boolean)));
}

async function resolveTargets(auth, args) {
    const emailInputs = toUnique(toStringArray(args.email));
    const uidInputs = toUnique(toStringArray(args.uid));

    const targets = new Map();

    for (const uid of uidInputs) {
        try {
            const user = await auth.getUser(uid);
            targets.set(uid, {
                uid: user.uid,
                email: user.email || null,
                displayName: user.displayName || null,
                authExists: true,
            });
        } catch (error) {
            const code = error?.code || '';
            if (code === 'auth/user-not-found') {
                targets.set(uid, {
                    uid,
                    email: null,
                    displayName: null,
                    authExists: false,
                });
                continue;
            }
            throw error;
        }
    }

    for (const email of emailInputs) {
        try {
            const user = await auth.getUserByEmail(email);
            targets.set(user.uid, {
                uid: user.uid,
                email: user.email || email,
                displayName: user.displayName || null,
                authExists: true,
            });
        } catch (error) {
            const code = error?.code || '';
            if (code === 'auth/user-not-found') {
                console.warn(`[warn] Email no encontrado en Auth: ${email}`);
                continue;
            }
            throw error;
        }
    }

    return Array.from(targets.values());
}

async function collectDocsByQuery(db, collectionName, field, value, pathsSet) {
    const snap = await db.collection(collectionName).where(field, '==', value).get();
    for (const docSnap of snap.docs) {
        pathsSet.add(docSnap.ref.path);
    }
}

async function collectDeletionPlan(db, targets) {
    const docPaths = new Set();
    const recursiveDocPaths = new Set();
    const authUserUids = new Set();

    for (const target of targets) {
        if (target.authExists) {
            authUserUids.add(target.uid);
        }

        const aliasSnap = await db.collection('userAliases').where('userId', '==', target.uid).get();
        for (const docSnap of aliasSnap.docs) {
            docPaths.add(docSnap.ref.path);
        }

        for (const querySpec of GLOBAL_QUERIES) {
            for (const field of querySpec.fields) {
                await collectDocsByQuery(db, querySpec.collection, field, target.uid, docPaths);
            }
        }

        const liveByParticipant = await db.collection('liveSessions').where('participants', 'array-contains', target.uid).get();
        for (const docSnap of liveByParticipant.docs) {
            recursiveDocPaths.add(docSnap.ref.path);
        }

        const liveByCreator = await db.collection('liveSessions').where('createdBy', '==', target.uid).get();
        for (const docSnap of liveByCreator.docs) {
            recursiveDocPaths.add(docSnap.ref.path);
        }

        recursiveDocPaths.add(`users/${target.uid}`);
    }

    return {
        docPaths: Array.from(docPaths).sort(),
        recursiveDocPaths: Array.from(recursiveDocPaths).sort(),
        authUserUids: Array.from(authUserUids).sort(),
    };
}

async function applyDocDeletes(db, docPaths) {
    let deletedCount = 0;
    let batch = db.batch();
    let pending = 0;

    for (const path of docPaths) {
        batch.delete(db.doc(path));
        pending += 1;
        deletedCount += 1;

        if (pending >= USER_DELETE_BATCH_LIMIT) {
            await batch.commit();
            batch = db.batch();
            pending = 0;
        }
    }

    if (pending > 0) {
        await batch.commit();
    }

    return deletedCount;
}

async function applyRecursiveDeletes(db, recursiveDocPaths) {
    let deletedRoots = 0;
    for (const path of recursiveDocPaths) {
        const ref = db.doc(path);
        await db.recursiveDelete(ref);
        deletedRoots += 1;
    }
    return deletedRoots;
}

async function applyAuthDeletes(auth, authUserUids) {
    let deletedUsers = 0;
    for (const uid of authUserUids) {
        try {
            await auth.deleteUser(uid);
            deletedUsers += 1;
        } catch (error) {
            const code = error?.code || '';
            if (code === 'auth/user-not-found') continue;
            throw error;
        }
    }
    return deletedUsers;
}

async function main() {
    const args = parseArgs();
    const shouldApply = Boolean(args.apply);

    const db = getAdminDb();
    const auth = getAuth();

    const targets = await resolveTargets(auth, args);
    if (targets.length === 0) {
        console.log('No hay usuarios objetivo. Usa --email o --uid.');
        return;
    }

    console.log('=== User Purge (Auth + Firestore) ===');
    console.log(`Targets: ${targets.length}`);
    for (const target of targets) {
        console.log(
            `- uid=${target.uid} email=${target.email || '(null)'} displayName=${target.displayName || '(null)'} authExists=${target.authExists}`
        );
    }

    const plan = await collectDeletionPlan(db, targets);
    console.log('');
    console.log(`Firestore direct docs to delete: ${plan.docPaths.length}`);
    console.log(`Firestore recursive roots to delete: ${plan.recursiveDocPaths.length}`);
    console.log(`Auth users to delete: ${plan.authUserUids.length}`);

    if (!shouldApply) {
        console.log('');
        console.log('Dry run complete. Re-run with --apply to execute deletion.');
        return;
    }

    const deletedDirectDocs = await applyDocDeletes(db, plan.docPaths);
    const deletedRecursiveRoots = await applyRecursiveDeletes(db, plan.recursiveDocPaths);
    const deletedAuthUsers = await applyAuthDeletes(auth, plan.authUserUids);

    console.log('');
    console.log('Deletion applied successfully.');
    console.log(`Deleted direct docs: ${deletedDirectDocs}`);
    console.log(`Deleted recursive roots: ${deletedRecursiveRoots}`);
    console.log(`Deleted auth users: ${deletedAuthUsers}`);
}

main().catch((error) => {
    console.error('User purge failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
});
