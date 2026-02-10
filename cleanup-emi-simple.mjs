// Script de limpieza del perfil de Emi usando Firebase SDK del cliente
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, deleteField } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// Configuración de Firebase (del proyecto)
const firebaseConfig = {
    apiKey: "AIzaSyBVs8LB3zU3_rInWF7yQT6K_yvwNW5Y22Y",
    authDomain: "gymbro-582c3.firebaseapp.com",
    projectId: "gymbro-582c3",
    storageBucket: "gymbro-582c3.firebasestorage.app",
    messagingSenderId: "461046754652",
    appId: "1:461046754652:web:e57c0c47acf00be3bfdd0e",
    measurementId: "G-00KV8MWKCB"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function cleanEmiProfile() {
    const emiUserId = '0HzIA483QQSkAj9Z66QWdpJqthC3';

    console.log('🔧 Iniciando limpieza del perfil de Emi...');
    console.log(`Usuario ID: ${emiUserId}`);

    try {
        // NOTA: Este script requiere que el usuario que lo ejecute tenga permisos
        // Para ejecutarlo, necesitas estar autenticado como un usuario con permisos

        const profileRef = doc(db, 'users', emiUserId, 'profile', 'main');

        // Leer perfil actual
        console.log('\n📖 Leyendo perfil actual...');
        const profileSnap = await getDoc(profileRef);

        if (!profileSnap.exists()) {
            console.error('❌ Perfil de Emi no encontrado');
            process.exit(1);
        }

        const currentData = profileSnap.data();
        console.log('\n📄 Estado actual del perfil:');
        console.log('  - partnerId:', currentData.partnerId);
        console.log('  - activePartnerId:', currentData.activePartnerId);
        console.log('  - partners:', currentData.partners);
        console.log('  - partnerIds:', currentData.partnerIds);

        // Actualizar perfil
        console.log('\n🔄 Actualizando perfil...');
        await updateDoc(profileRef, {
            partnerId: deleteField(),
            activePartnerId: null,
            partners: [],
            partnerIds: [],
            linkSetupPendingPartnerId: null,
            updatedAt: new Date().toISOString()
        });

        console.log('\n✅ Perfil de Emi limpiado exitosamente!');
        console.log('\n📊 Nuevo estado:');
        console.log('  - partnerId: (eliminado)');
        console.log('  - activePartnerId: null');
        console.log('  - partners: []');
        console.log('  - partnerIds: []');

        console.log('\n🎉 Ahora bypupila puede enviar solicitud de vinculación a Emi');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error al limpiar perfil:', error);
        console.error('\nDetalles:', error.message);

        if (error.code === 'permission-denied') {
            console.error('\n⚠️  ERROR DE PERMISOS:');
            console.error('Las reglas de Firestore solo permiten que el usuario dueño modifique su perfil.');
            console.error('Soluciones:');
            console.error('  1. Inicia sesión como Emi y ejecuta el script');
            console.error('  2. Limpia manualmente desde Firebase Console');
            console.error('  3. Usa Firebase Admin SDK con service account');
        }

        process.exit(1);
    }
}

cleanEmiProfile();
