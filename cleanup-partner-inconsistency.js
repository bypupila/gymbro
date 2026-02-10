// Script de limpieza de inconsistencia de partners
// Ejecutar desde la consola del navegador cuando estés logueado como bypupila

import { firebaseService } from './src/services/firebaseService';

async function cleanupPartnerInconsistency() {
    const emiId = '0HzIA483QQSkAj9Z66QWdpJqthC3';
    const bypupilaId = 'MWiOdRJcEDhFLGB1u56e1AmBYYL2';

    console.log('🔧 Limpiando inconsistencia de partners...');

    try {
        // Forzar desvinculación desde el perfil de Emi
        console.log('Limpiando perfil de Emi...');
        await firebaseService.unlinkPartner(emiId, {
            id: bypupilaId,
            alias: 'bypupila',
            nombre: 'bypupila'
        });

        console.log('✓ Perfil de Emi limpiado');
        console.log('Ahora puedes enviar la solicitud de vinculación correctamente');
        alert('✓ Inconsistencia limpiada. Ahora puedes intentar vincular de nuevo.');
    } catch (error) {
        console.error('Error al limpiar:', error);
        alert('Error: ' + error.message);
    }
}

cleanupPartnerInconsistency();
