// src/components/RoutineCopyModal.tsx
import React, { useState } from 'react';
import { useUserStore } from '@/stores/userStore';
import { firebaseService } from '@/services/firebaseService';
import { Card } from './Card';
import Colors from '@/styles/colors';
import { Copy, X, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Props {
    partnerName: string;
    partnerAlias: string;
    partnerId: string;
    onClose: () => void;
}

export const RoutineCopyModal: React.FC<Props> = ({ partnerName, partnerAlias, partnerId, onClose }) => {
    const { perfil, setRutina } = useUserStore();
    const [isLoading, setIsLoading] = useState<null | 'mine' | 'theirs'>(null);

    const handleCopyMyRoutine = async () => {
        if (!perfil.rutina) {
            toast.error('No tienes una rutina activa para compartir.');
            return;
        }
        setIsLoading('mine');
        try {
            const result = await firebaseService.shareRoutine(partnerAlias, perfil.rutina);
            if (result.success) {
                toast.success(`Tu rutina ha sido enviada a ${partnerName}.`);
                onClose();
            } else {
                toast.error(result.message);
            }
        } finally {
            setIsLoading(null);
        }
    };

    const handleCopyTheirRoutine = async () => {
        setIsLoading('theirs');
        try {
            const partnerRoutine = await firebaseService.getPartnerRoutine(partnerId);
            if (partnerRoutine) {
                // The setRutina function from the store will handle archiving the old one
                setRutina(partnerRoutine);
                toast.success(`Has copiado la rutina de ${partnerName}.`);
                onClose();
            } else {
                toast.error(`${partnerName} no tiene una rutina activa para copiar.`);
            }
        } catch (error) {
            toast.error('No se pudo obtener la rutina de tu pareja.');
            console.error(error);
        } finally {
            setIsLoading(null);
        }
    };

    return (
        <div style={styles.overlay}>
            <Card style={styles.modal}>
                <div style={styles.header}>
                    <h3 style={styles.title}>¡Vinculación Exitosa!</h3>
                    <button onClick={onClose} style={styles.closeButton}><X size={20} /></button>
                </div>
                <p style={styles.text}>
                    Ahora estás vinculado con <span style={styles.partnerName}>{partnerName}</span>. ¿Quieres compartir una rutina?
                </p>
                <div style={styles.buttonGroup}>
                    <button
                        style={styles.actionButton}
                        onClick={handleCopyMyRoutine}
                        disabled={!perfil.rutina || !!isLoading}
                    >
                        {isLoading === 'mine' ? <Loader2 className="animate-spin" /> : <Copy />}
                        <span>Enviar mi rutina a {partnerName}</span>
                    </button>
                    <button
                        style={{ ...styles.actionButton, background: Colors.success }}
                        onClick={handleCopyTheirRoutine}
                        disabled={!!isLoading}
                    >
                        {isLoading === 'theirs' ? <Loader2 className="animate-spin" /> : <Copy />}
                        <span>Copiar la rutina de {partnerName}</span>
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

