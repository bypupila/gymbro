import React, { useState } from 'react';
import { useUserStore } from '@/stores/userStore';
import { routineRequestService } from '@/services/routineRequestService';
import { Card } from './Card';
import Colors from '@/styles/colors';
import { Copy, X, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Props {
    partnerName: string;
    partnerAlias: string;
    partnerId: string;
    onClose: () => void;
    isInitialSetup?: boolean;
}

export const RoutineCopyModal: React.FC<Props> = ({ partnerName, partnerAlias, partnerId, onClose, isInitialSetup = true }) => {
    void partnerAlias;
    const perfil = useUserStore((state) => state.perfil);
    const userId = useUserStore((state) => state.userId);
    const [isLoading, setIsLoading] = useState<null | 'mine' | 'theirs'>(null);

    const handleCopyMyRoutine = async () => {
        if (!userId) return;
        if (!perfil.rutina) {
            toast.error('No tienes una rutina activa para compartir.');
            return;
        }
        setIsLoading('mine');
        try {
            await routineRequestService.createRequest({
                fromUserId: userId,
                fromName: perfil.usuario.nombre || perfil.alias || 'GymBro',
                toUserId: partnerId,
                toName: partnerName,
                sourceUserId: userId,
                targetUserId: partnerId,
                type: 'copy_my_routine_to_partner',
                syncAfterAccept: true,
            });
            toast.success(`Se envio solicitud a ${partnerName}.`);
            onClose();
        } catch (error) {
            console.error('[RoutineCopyModal] Error creando solicitud:', error);
            toast.error('No se pudo enviar la solicitud. Inténtalo de nuevo.');
        } finally {
            setIsLoading(null);
        }
    };

    const handleCopyTheirRoutine = async () => {
        if (!userId) return;
        setIsLoading('theirs');
        try {
            await routineRequestService.createRequest({
                fromUserId: userId,
                fromName: perfil.usuario.nombre || perfil.alias || 'GymBro',
                toUserId: partnerId,
                toName: partnerName,
                sourceUserId: partnerId,
                targetUserId: userId,
                type: 'copy_partner_routine_to_me',
                syncAfterAccept: true,
            });
            toast.success(`Se envio solicitud a ${partnerName}.`);
            onClose();
        } catch (error) {
            toast.error('No se pudo crear la solicitud de rutina.');
            console.error(error);
        } finally {
            setIsLoading(null);
        }
    };

    return (
        <div style={styles.overlay}>
            <Card style={styles.modal}>
                <div style={styles.header}>
                    <h3 style={styles.title}>{isInitialSetup ? 'Vinculacion exitosa' : 'Copiar Rutina'}</h3>
                    <button onClick={onClose} style={styles.closeButton}><X size={20} /></button>
                </div>
                <p style={styles.text}>
                    {isInitialSetup
                        ? <>Ahora estas vinculado con <span style={styles.partnerName}>{partnerName}</span>. Elige si quieres solicitar una copia inicial de rutina.</>
                        : <>Elige una opcion para sincronizar rutinas con <span style={styles.partnerName}>{partnerName}</span>.</>
                    }
                </p>
                <div style={styles.buttonGroup}>
                    <button
                        style={styles.actionButton}
                        onClick={handleCopyMyRoutine}
                        disabled={!perfil.rutina || !!isLoading}
                    >
                        {isLoading === 'mine' ? <Loader2 className="animate-spin" /> : <Copy />}
                        <span>Solicitar enviar mi rutina a {partnerName}</span>
                    </button>
                    <button
                        style={{ ...styles.actionButton, background: Colors.success }}
                        onClick={handleCopyTheirRoutine}
                        disabled={!!isLoading}
                    >
                        {isLoading === 'theirs' ? <Loader2 className="animate-spin" /> : <Copy />}
                        <span>Solicitar copiar la rutina de {partnerName}</span>
                    </button>
                </div>
                <button style={styles.skipButton} onClick={onClose}>
                    Omitir por ahora
                </button>
            </Card>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
    },
    modal: {
        width: '90%',
        maxWidth: '400px',
        padding: '24px',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
    },
    title: {
        margin: 0,
        fontSize: '18px',
        fontWeight: 800,
    },
    closeButton: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: Colors.textSecondary,
    },
    text: {
        margin: '0 0 24px 0',
        color: Colors.textSecondary,
        lineHeight: 1.5,
    },
    partnerName: {
        color: Colors.primary,
        fontWeight: 700,
    },
    buttonGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    actionButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '16px',
        border: 'none',
        borderRadius: '12px',
        background: Colors.primary,
        color: '#000',
        fontWeight: 700,
        fontSize: '14px',
        cursor: 'pointer',
    },
    skipButton: {
        marginTop: '16px',
        background: 'none',
        border: 'none',
        color: Colors.textSecondary,
        cursor: 'pointer',
    },
};
