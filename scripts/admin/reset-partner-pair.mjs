import 'dotenv/config';
import { getAdminDb } from './lib/firebaseAdmin.mjs';
import { parseArgs } from './lib/cli.mjs';
import { getAuth } from 'firebase-admin/auth';

async function resolveUid(email) {
    const auth = getAuth();
    const user = await auth.getUserByEmail(email);
    return user.uid;
}

async function collectDocs(db, collectionName, field1, val1, field2, val2) {
    const snap = await db.collection(collectionName)
        .where(field1, '==', val1)
        .where(field2, '==', val2)
        .get();
    return snap.docs;
}

async function main() {
    const args = parseArgs();
    const emailA = args.emailA;
    const emailB = args.emailB;
    const shouldApply = Boolean(args.apply);

    if (!emailA || !emailB) {
        console.error('Usage: node reset-partner-pair.mjs --emailA <email> --emailB <email> [--apply]');
        console.error('Example: node reset-partner-pair.mjs --emailA user1@gmail.com --emailB user2@gmail.com --apply');
        process.exit(1);
    }

    const db = getAdminDb();

    // Resolve UIDs from emails
    console.log(`\nResolviendo UIDs...`);
    let uidA, uidB;
    try {
        uidA = await resolveUid(emailA);
        console.log(`  ${emailA} -> ${uidA}`);
    } catch (error) {
        console.error(`  ERROR: No se encontro usuario con email ${emailA}:`, error.message);
        process.exit(1);
    }
    try {
        uidB = await resolveUid(emailB);
        console.log(`  ${emailB} -> ${uidB}`);
    } catch (error) {
        console.error(`  ERROR: No se encontro usuario con email ${emailB}:`, error.message);
        process.exit(1);
    }

    // 1. Find linkRequests between the pair (both directions)
    console.log(`\nBuscando artefactos de vinculacion...`);
    const linkReqAB = await collectDocs(db, 'linkRequests', 'requesterId', uidA, 'recipientId', uidB);
    const linkReqBA = await collectDocs(db, 'linkRequests', 'requesterId', uidB, 'recipientId', uidA);
    const allLinkRequests = [...linkReqAB, ...linkReqBA];
    console.log(`  linkRequests: ${allLinkRequests.length}`);
    for (const doc of allLinkRequests) {
        const d = doc.data();
        console.log(`    - ${doc.id} | status=${d.status} | ${d.requesterId?.slice(0, 8)}.. -> ${d.recipientId?.slice(0, 8)}..`);
    }

    // 2. Find relationshipActions between the pair
    const actionsAB = await collectDocs(db, 'relationshipActions', 'sourceUserId', uidA, 'targetUserId', uidB);
    const actionsBA = await collectDocs(db, 'relationshipActions', 'sourceUserId', uidB, 'targetUserId', uidA);
    const allActions = [...actionsAB, ...actionsBA];
    console.log(`  relationshipActions: ${allActions.length}`);
    for (const doc of allActions) {
        const d = doc.data();
        console.log(`    - ${doc.id} | type=${d.actionType} | status=${d.status}`);
    }

    // 3. Find routineRequests between the pair (by fromUserId/toUserId)
    const routineReqAB = await collectDocs(db, 'routineRequests', 'fromUserId', uidA, 'toUserId', uidB);
    const routineReqBA = await collectDocs(db, 'routineRequests', 'fromUserId', uidB, 'toUserId', uidA);
    const allRoutineRequests = [...routineReqAB, ...routineReqBA];
    console.log(`  routineRequests: ${allRoutineRequests.length}`);
    for (const doc of allRoutineRequests) {
        const d = doc.data();
        console.log(`    - ${doc.id} | type=${d.type} | status=${d.status}`);
    }

    // 4. Read current profiles
    const profileRefA = db.collection('users').doc(uidA).collection('profile').doc('main');
    const profileRefB = db.collection('users').doc(uidB).collection('profile').doc('main');
    const [profileSnapA, profileSnapB] = await Promise.all([profileRefA.get(), profileRefB.get()]);

    console.log(`\nEstado actual de perfiles:`);
    if (profileSnapA.exists) {
        const d = profileSnapA.data();
        console.log(`  ${emailA}:`);
        console.log(`    partnerId: ${d.partnerId || 'null'}`);
        console.log(`    activePartnerId: ${d.activePartnerId || 'null'}`);
        console.log(`    partnerIds: ${JSON.stringify(d.partnerIds || [])}`);
        console.log(`    partners: ${JSON.stringify((d.partners || []).map(p => p.id?.slice(0, 8)))}`);
        console.log(`    linkSetupPendingPartnerId: ${d.linkSetupPendingPartnerId || 'null'}`);
        console.log(`    routineSync.enabled: ${d.routineSync?.enabled || false}`);
    }
    if (profileSnapB.exists) {
        const d = profileSnapB.data();
        console.log(`  ${emailB}:`);
        console.log(`    partnerId: ${d.partnerId || 'null'}`);
        console.log(`    activePartnerId: ${d.activePartnerId || 'null'}`);
        console.log(`    partnerIds: ${JSON.stringify(d.partnerIds || [])}`);
        console.log(`    partners: ${JSON.stringify((d.partners || []).map(p => p.id?.slice(0, 8)))}`);
        console.log(`    linkSetupPendingPartnerId: ${d.linkSetupPendingPartnerId || 'null'}`);
        console.log(`    routineSync.enabled: ${d.routineSync?.enabled || false}`);
    }

    const totalDocs = allLinkRequests.length + allActions.length + allRoutineRequests.length;
    console.log(`\nTotal documentos a eliminar: ${totalDocs}`);
    console.log(`Perfiles a limpiar: 2`);

    if (!shouldApply) {
        console.log('\n--- DRY RUN --- Re-ejecuta con --apply para aplicar los cambios.');
        return;
    }

    // Execute cleanup
    console.log('\nAplicando cambios...');
    const batch = db.batch();

    // Delete all link artifacts
    for (const doc of allLinkRequests) {
        batch.delete(doc.ref);
    }
    for (const doc of allActions) {
        batch.delete(doc.ref);
    }
    for (const doc of allRoutineRequests) {
        batch.delete(doc.ref);
    }

    // Clean both profiles
    const cleanPayload = {
        partnerId: null,
        activePartnerId: null,
        partnerIds: [],
        partners: [],
        linkSetupPendingPartnerId: null,
        routineSync: {
            enabled: false,
            partnerId: null,
            mode: 'manual',
            syncId: null,
            updatedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
    };

    if (profileSnapA.exists) {
        batch.set(profileRefA, cleanPayload, { merge: true });
    }
    if (profileSnapB.exists) {
        batch.set(profileRefB, cleanPayload, { merge: true });
    }

    await batch.commit();
    console.log('\nListo. Ambos perfiles reseteados y todos los artefactos de vinculacion eliminados.');
    console.log('Los usuarios pueden volver a vincularse desde cero.');
}

main().catch((error) => {
    console.error('Failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
});
