
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/stores/userStore';
import Colors from '@/styles/colors';
import { Users, ArrowRight, UserCircle2 } from 'lucide-react';
import { cloudService } from '@/services/cloudService';
import { authClient } from '@/services/auth';

export const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { setUserId, setDatosPersonales, setHorario, setRutina, setDatosPareja } = useUserStore();
    const [username, setUsername] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        if (!username.trim()) {
            setError('Por favor ingresa un nombre');
            return;
        }

        setIsLoading(true);
        const userId = `user_${username.toLowerCase().replace(/\s+/g, '_')}`;

        try {
            // Set User ID in store
            setUserId(userId);

            // Try to download existing data for this user
            const data = await cloudService.downloadData(userId);

            if (data) {
                // If data exists, hydrate the store
                setDatosPersonales(data.usuario);
                if (data.horario) setHorario(data.horario);
                if (data.rutina) setRutina(data.rutina);
                if (data.pareja) setDatosPareja(data.pareja);
                // We use useUserStore.setState to force full hydration if needed, 
                // but setting individual parts is safer with the current store structure actions.
                // However, directly calling setState with the whole object is better for full restore.
                useUserStore.setState({ perfil: data });
            } else {
                // New user - just set the name
                setDatosPersonales({ nombre: username });
            }

            // Navigate to home
            navigate('/');
        } catch (err) {
            console.error(err);
            setError('Error al conectar. ¿Tienes internet?');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.content}>
                <div style={styles.iconContainer}>
                    <Users size={64} color={Colors.primary} />
                </div>

                <h1 style={styles.title}>GymBro</h1>
                <p style={styles.subtitle}>¿Quién eres hoy?</p>

                <div style={styles.authOptions}>
                    <button
                        style={{ ...styles.socialButton, backgroundColor: '#fff', color: '#000', width: '100%' }}
                        onClick={() => authClient.signIn.social({
                            provider: 'google',
                            callbackURL: window.location.origin + '/'
                        })}
                    >
                        <img src="https://www.google.com/favicon.ico" width="20" alt="Google" />
                        Continuar con Google
                    </button>
                </div>

                <div style={styles.separator}>
                    <div style={styles.line}></div>
                    <span style={styles.separatorText}>o usa tu nombre</span>
                    <div style={styles.line}></div>
                </div>

                <div style={styles.inputContainer}>
                    <UserCircle2 size={24} color={Colors.textSecondary} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        style={styles.input}
                        placeholder="Tu Nombre (Ej: Juan, Maria)"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    />
                </div>

                {error && <p style={styles.error}>{error}</p>}

                <button
                    style={styles.button}
                    onClick={handleLogin}
                    disabled={isLoading}
                >
                    {isLoading ? 'Entrando...' : 'Continuar como Invitado'}
                    {!isLoading && <ArrowRight size={20} />}
                </button>

                <p style={styles.note}>
                    Con el login de Neon, tu progreso se sincroniza automáticamente de forma segura.
                </p>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: Colors.background,
        padding: '20px',
    },
    content: {
        width: '100%',
        maxWidth: '400px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    iconContainer: {
        width: '120px',
        height: '120px',
        borderRadius: '60px',
        background: `${Colors.primary}20`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '32px',
        border: `2px solid ${Colors.primary}`,
    },
    title: {
        fontSize: '36px',
        fontWeight: 900,
        color: Colors.text,
        marginBottom: '8px',
        letterSpacing: '-1px',
    },
    subtitle: {
        fontSize: '16px',
        color: Colors.textSecondary,
        marginBottom: '40px',
    },
    inputContainer: {
        width: '100%',
        position: 'relative',
        marginBottom: '16px',
    },
    input: {
        width: '100%',
        padding: '16px 16px 16px 50px',
        fontSize: '16px',
        background: Colors.surface,
        border: `1px solid ${Colors.border}`,
        borderRadius: '16px',
        color: Colors.text,
        outline: 'none',
    },
    button: {
        width: '100%',
        padding: '18px',
        background: Colors.primary,
        border: 'none',
        borderRadius: '16px',
        color: '#000',
        fontSize: '16px',
        fontWeight: 700,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        marginBottom: '24px',
        transition: 'transform 0.1s',
    },
    error: {
        color: Colors.error,
        fontSize: '14px',
        marginBottom: '16px',
    },
    note: {
        fontSize: '12px',
        color: Colors.textTertiary,
        textAlign: 'center',
        maxWidth: '80%',
        lineHeight: 1.5,
    },
    authOptions: {
        width: '100%',
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
    },
    socialButton: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '12px',
        borderRadius: '12px',
        border: `1px solid ${Colors.border}`,
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
    },
    separator: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
    },
    line: {
        flex: 1,
        height: '1px',
        background: Colors.border,
    },
    separatorText: {
        fontSize: '12px',
        color: Colors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: '1px',
    }
};
