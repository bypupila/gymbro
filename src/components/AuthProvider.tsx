import React, { useEffect } from 'react';
import { useUserStore } from '@/stores/userStore';
import { cloudService } from '@/services/cloudService';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { userId, setDatosPersonales, setHorario, setRutina, setDatosPareja } = useUserStore();

    useEffect(() => {
        if (userId) {
            // Sync data from cloud based on alias
            const syncData = async () => {
                try {
                    const data = await cloudService.downloadData(userId);
                    if (data) {
                        // Merge or set data from cloud
                        useUserStore.setState({ perfil: data });
                    } else {
                        // If no data in cloud, initialize name with alias
                        setDatosPersonales({ nombre: userId });
                    }
                } catch (error) {
                    console.error("Error syncing profile:", error);
                }
            };

            syncData();
        }
    }, [userId, setDatosPersonales, setHorario, setRutina, setDatosPareja]);

    return <>{children}</>;
};
