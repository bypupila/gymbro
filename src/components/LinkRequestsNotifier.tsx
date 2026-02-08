// src/components/LinkRequestsNotifier.tsx
import React from 'react';
import { useUserStore } from '@/stores/userStore';
import { firebaseService, LinkRequest } from '@/services/firebaseService';
import { Card } from './Card';
import Colors from '@/styles/colors';
import { Check, X, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const LinkRequestsNotifier: React.FC = () => {
    const { linkRequests, setLinkRequests, perfil, addPartner } = useUserStore();

    if (linkRequests.length === 0) {
        return null;
    }

    const handleAccept = async (request: LinkRequest) => {
        try {
            const myName = perfil.alias || perfil.usuario.nombre || 'GymBro';
            await firebaseService.acceptLinkRequest(request, myName);
            // Also update local store with the new partner
            addPartner({
                id: request.requesterId,
                alias: request.requesterAlias,
                nombre: request.requesterAlias,
            });
            toast.success(`Ahora estas vinculado con ${request.requesterAlias}!`);
        } catch (error) {
            console.error('Error accepting request:', error);
            toast.error('No se pudo aceptar la solicitud.');
        }
    };

    const handleDecline = async (request: LinkRequest) => {
        try {
            await firebaseService.declineLinkRequest(request.id);
            toast.success('Solicitud rechazada.');
            // The listener will update the store, removing the declined request
        } catch (error) {
            console.error('Error declining request:', error);
            toast.error('No se pudo rechazar la solicitud.');
        }
    };

    return (
        <div style={styles.container}>
            <h3 style={styles.title}>Solicitudes de Vinculación</h3>
            {linkRequests.map((req) => (
                <Card key={req.id} style={styles.requestCard}>
                    <div style={styles.requesterInfo}>
                        <Send size={18} color={Colors.primary} />
                        <p style={styles.requestText}>
                            <span style={styles.alias}>{req.requesterAlias}</span> quiere vincularse contigo.
                        </p>
                    </div>
                    <div style={styles.actions}>
                        <button style={{...styles.button, ...styles.declineButton}} onClick={() => handleDecline(req)}>
                            <X size={16} />
                        </button>
                        <button style={{...styles.button, ...styles.acceptButton}} onClick={() => handleAccept(req)}>
                            <Check size={16} />
                        </button>
                    </div>
                </Card>
            ))}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        margin: '20px 0',
    },
    title: {
        fontSize: '16px',
        fontWeight: 800,
        color: Colors.text,
        marginBottom: '16px',
    },
    requestCard: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        marginBottom: '12px',
    },
    requesterInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    requestText: {
        margin: 0,
        color: Colors.textSecondary,
    },
    alias: {
        fontWeight: 700,
        color: Colors.text,
    },
    actions: {
        display: 'flex',
        gap: '12px',
    },
    button: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        borderRadius: '50%',
        width: '36px',
        height: '36px',
        cursor: 'pointer',
        color: '#fff',
    },
    acceptButton: {
        background: Colors.success,
    },
    declineButton: {
        background: Colors.error,
    },
};

