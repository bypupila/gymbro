// Script de limpieza del perfil de Emi
// Elimina la inconsistencia donde Emi tiene a bypupila pero bypupila no tiene a Emi

const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Inicializar con credenciales de aplicación por defecto (Firebase CLI)
admin.initializeApp({
    projectId: 'gymbro-582c3'
});

const db = getFirestore();

async function cleanEmiProfile() {
    const emiUserId = '0HzIA483QQSkAj9Z66QWdpJqthC3';

    console.log('🔧 Iniciando limpieza del perfil de Emi...');
    console.log(`Usuario ID: ${emiUserId}`);

    try {
        const profileRef = db.collection('users').doc(emiUserId).collection('profile').doc('main');

        // Leer perfil actual
        const profileSnap = await profileRef.get();

        if (!profileSnap.exists) {
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
        await profileRef.update({
            partnerId: admin.firestore.FieldValue.delete(),
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
        process.exit(1);
    }
}

cleanEmiProfile();
