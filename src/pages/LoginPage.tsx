
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/stores/userStore';
import Colors from '@/styles/colors';
import { Users, ArrowRight, UserCircle2 } from 'lucide-react';
import { cloudService } from '@/services/cloudService';
import { authClient } from '@/services/auth';

export const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { data: session } = authClient.useSession();

    React.useEffect(() => {
        if (session) {
            console.log("Sesión detectada en login, redirigiendo...", session.user.email);
            navigate('/', { replace: true });
        }
    }, [session, navigate]);

    const { setUserId, setDatosPersonales, setHorario, setRutina, setDatosPareja } = useUserStore();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [authMode, setAuthMode] = useState<'social' | 'manual' | 'name'>('social');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleEmailAuth = async () => {
        if (!email || !password) {
            setError('Ingresa email y contraseña');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            if (isSignUp) {
                const { error: signUpError } = await authClient.signUp.email({
                    email,
                    password,
                    name: email.split('@')[0],
                });
                if (signUpError) throw new Error(signUpError.message);
                alert('¡Cuenta creada! Revisa tu email si es necesario (o intenta entrar).');
            } else {
                const { error: signInError } = await authClient.signIn.email({
                    email,
                    password,
                });
                if (signInError) throw new Error(signInError.message);
                // AuthProvider will handle the redirect/sync
            }
        } catch (err: any) {
            setError(err.message || 'Error en la autenticación');
        } finally {
            setIsLoading(false);
        }
    };

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
                <p style={styles.subtitle}>Tu progreso, a salvo.</p>

                {authMode === 'social' && (
                    <>
                        <div style={styles.authOptions}>
                            <button
                                style={{ ...styles.socialButton, backgroundColor: '#fff', color: '#000', width: '100%' }}
                                onClick={async () => {
                                    try {
                                        setIsLoading(true);
                                        const { error } = await authClient.signIn.social({
                                            provider: 'google',
                                            callbackURL: window.location.origin
                                        });
                                        if (error) {
                                            alert('Google Auth falló: ' + error.message);
                                            setIsLoading(false);
                                        }
                                    } catch (err: any) {
                                        console.error(err);
                                        alert('Error de conexión con Neon Auth. Asegúrate de que el dominio está permitido en el panel de Neon.');
                                        setIsLoading(false);
                                    }
                                }}
                            >
                                <img src="https://www.google.com/favicon.ico" width="20" alt="Google" />
                                Continuar con Google
                            </button>
                        </div>
                        <button style={styles.textLink} onClick={() => setAuthMode('manual')}>
                            Usar email y contraseña
                        </button>
                        <div style={styles.separator}>
                            <div style={styles.line}></div>
                            <span style={styles.separatorText}>o</span>
                            <div style={styles.line}></div>
                        </div>
                        <button style={styles.ghostButton} onClick={() => setAuthMode('name')}>
                            Entrar sin cuenta (solo local)
                        </button>
                    </>
                )}

                {authMode === 'manual' && (
                    <div style={{ width: '100%' }}>
                        <h2 style={styles.modeTitle}>{isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}</h2>
                        <input
                            style={styles.inputSimple}
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <input
                            style={styles.inputSimple}
                            type="password"
                            placeholder="Contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        {error && <p style={styles.error}>{error}</p>}
                        <button style={styles.button} onClick={handleEmailAuth} disabled={isLoading}>
                            {isLoading ? 'Cargando...' : (isSignUp ? 'Registrarse' : 'Entrar')}
                        </button>
                        <button style={styles.textLink} onClick={() => setIsSignUp(!isSignUp)}>
                            {isSignUp ? '¿Ya tienes cuenta? Entra aquí' : '¿No tienes cuenta? Regístrate'}
                        </button>
                        <button style={styles.textLink} onClick={() => setAuthMode('social')}>
                            Volver
                        </button>
                    </div>
                )}

                {authMode === 'name' && (
                    <div style={{ width: '100%' }}>
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
                        <button style={styles.button} onClick={handleLogin} disabled={isLoading}>
                            {isLoading ? 'Entrando...' : 'Continuar como Invitado'}
                            {!isLoading && <ArrowRight size={20} />}
                        </button>
                        <button style={styles.textLink} onClick={() => setAuthMode('social')}>
                            Volver
                        </button>
                    </div>
                )}
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
    },
    textLink: {
        background: 'none',
        border: 'none',
        color: Colors.primary,
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
        marginTop: '12px',
        textDecoration: 'underline',
        width: '100%',
    },
    modeTitle: {
        fontSize: '20px',
        fontWeight: 700,
        color: Colors.text,
        marginBottom: '20px',
        textAlign: 'center',
    },
    inputSimple: {
        width: '100%',
        padding: '16px',
        fontSize: '16px',
        background: Colors.surface,
        border: `1px solid ${Colors.border}`,
        borderRadius: '16px',
        color: Colors.text,
        outline: 'none',
        marginBottom: '12px',
    },
    ghostButton: {
        width: '100%',
        padding: '14px',
        background: 'transparent',
        border: `1px solid ${Colors.border}`,
        borderRadius: '16px',
        color: Colors.textSecondary,
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
    }
};
