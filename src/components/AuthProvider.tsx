
import React, { useEffect } from 'react';
import { authClient } from '@/services/auth';
import { useUserStore } from '@/stores/userStore';
import { cloudService } from '@/services/cloudService';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { setUserId, setDatosPersonales, setHorario, setRutina, setDatosPareja } = useUserStore();
    const { data: session, isPending } = authClient.useSession();

    useEffect(() => {
        if (session?.user) {
            const userId = session.user.id;
            setUserId(userId);

            // Sync data from cloud when logging in with Neon
            const syncData = async () => {
                try {
                    const data = await cloudService.downloadData(userId);
                    if (data) {
                        setDatosPersonales(data.usuario);
                        if (data.horario) setHorario(data.horario);
                        if (data.rutina) setRutina(data.rutina);
                        if (data.pareja) setDatosPareja(data.pareja);
                        useUserStore.setState({ perfil: data });
                    } else if (session.user.name) {
                        // If no data in cloud, initialize with session name
                        setDatosPersonales({ nombre: session.user.name });
                    }
                } catch (error) {
                    console.error("Error syncing during neon auth:", error);
                }
            };

            syncData();
        }
    }, [session, setUserId, setDatosPersonales, setHorario, setRutina, setDatosPareja]);

    if (isPending) {
        return null; // Or a loading spinner
    }

    return <>{children}</>;
};
