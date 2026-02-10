// Script para diagnosticar y arreglar la inconsistencia
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, getDoc, updateDoc, deleteField } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyBVs8LB3zU3_rInWF7yQT6K_yvwNW5Y22Y",
    authDomain: "gymbro-582c3.firebaseapp.com",
    projectId: "gymbro-582c3",
    storageBucket: "gymbro-582c3.firebasestorage.app",
    messagingSenderId: "461046754652",
    appId: "1:461046754652:web:e57c0c47acf00be3bfdd0e",
    measurementId: "G-00KV8MWKCB"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const emiId = '0HzIA483QQSkAj9Z66QWdpJqthC3';
const bypupilaId = 'MWiOdRJcEDhFLGB1u56e1AmBYYL2';

async function diagnoseAndFix() {
    console.log('🔍 DIAGNÓSTICO DEL ESTADO ACTUAL\n');

    // 1. Verificar linkRequests entre Emi y bypupila
    console.log('1️⃣ Verificando linkRequests...');

    const linkRequestsRef = collection(db, 'linkRequests');
    const q1 = query(linkRequestsRef, where('requesterId', '==', emiId), where('recipientId', '==', bypupilaId));
    const q2 = query(linkRequestsRef, where('requesterId', '==', bypupilaId), where('recipientId', '==', emiId));

    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

    console.log(`   Emi → bypupila: ${snap1.size} linkRequest(s)`);
    snap1.forEach(doc => {
        const data = doc.data();
        console.log(`      ID: ${doc.id}, Status: ${data.status}, Created: ${data.createdAt}`);
    });

    console.log(`   bypupila → Emi: ${snap2.size} linkRequest(s)`);
    snap2.forEach(doc => {
        const data = doc.data();
        console.log(`      ID: ${doc.id}, Status: ${data.status}, Created: ${data.createdAt}`);
    });

    // 2. Verificar perfiles
    console.log('\n2️⃣ Verificando perfiles...');

    const emiProfileRef = doc(db, 'users', emiId, 'profile', 'main');
    const bypupilaProfileRef = doc(db, 'users', bypupilaId, 'profile', 'main');

    const [emiSnap, bypupilaSnap] = await Promise.all([
        getDoc(emiProfileRef),
        getDoc(bypupilaProfileRef)
    ]);

    const emiData = emiSnap.data();
    const bypupilaData = bypupilaSnap.data();

    console.log('   Perfil de Emi:');
    console.log(`      partners: ${JSON.stringify(emiData.partners || [])}`);
    console.log(`      partnerIds: ${JSON.stringify(emiData.partnerIds || [])}`);
    console.log(`      activePartnerId: ${emiData.activePartnerId || 'null'}`);
    console.log(`      partnerId: ${emiData.partnerId || 'null'}`);

    console.log('   Perfil de bypupila:');
    console.log(`      partners: ${JSON.stringify(bypupilaData.partners || [])}`);
    console.log(`      partnerIds: ${JSON.stringify(bypupilaData.partnerIds || [])}`);
    console.log(`      activePartnerId: ${bypupilaData.activePartnerId || 'null'}`);
    console.log(`      partnerId: ${bypupilaData.partnerId || 'null'}`);

    // 3. Verificar relationshipActions recientes
    console.log('\n3️⃣ Verificando relationshipActions recientes...');
    const actionsRef = collection(db, 'relationshipActions');
    const q3 = query(actionsRef, where('actionType', '==', 'UNLINK'));
    const actionsSnap = await getDocs(q3);

    console.log(`   Total UNLINK actions: ${actionsSnap.size}`);
    const recentActions = [];
    actionsSnap.forEach(doc => {
        const data = doc.data();
        if (data.sourceUserId === emiId || data.targetUserId === emiId ||
            data.sourceUserId === bypupilaId || data.targetUserId === bypupilaId) {
            recentActions.push({ id: doc.id, ...data });
        }
    });

    console.log(`   UNLINK actions relacionados: ${recentActions.length}`);
    recentActions.forEach(action => {
        console.log(`      ${action.sourceUserId.slice(0, 8)} → ${action.targetUserId.slice(0, 8)}, Status: ${action.status}, Mirror: ${action.mirrorOf || 'no'}`);
    });

    console.log('\n\n🔧 PLAN DE ARREGLO\n');
    console.log('Para arreglar esta inconsistencia necesitas ejecutar manualmente:');
    console.log('\n1. Ir a Firebase Console:');
    console.log(`   https://console.firebase.google.com/project/gymbro-582c3/firestore/databases/-default-/data/~2Fusers~2F${emiId}~2Fprofile~2Fmain`);
    console.log('\n2. Editar el documento y establecer:');
    console.log('   - partners: []');
    console.log('   - partnerIds: []');
    console.log('   - activePartnerId: null');
    console.log('   - partnerId: (eliminar campo)');
    console.log('\n3. Eliminar los linkRequests en estado "accepted" que causan la inconsistencia');

    if (snap1.size > 0) {
        console.log('\n4. Eliminar linkRequests específicos:');
        snap1.forEach(doc => {
            console.log(`   https://console.firebase.google.com/project/gymbro-582c3/firestore/databases/-default-/data/~2FlinkRequests~2F${doc.id}`);
        });
    }

    if (snap2.size > 0) {
        snap2.forEach(doc => {
            console.log(`   https://console.firebase.google.com/project/gymbro-582c3/firestore/databases/-default-/data/~2FlinkRequests~2F${doc.id}`);
        });
    }

    process.exit(0);
}

diagnoseAndFix().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
