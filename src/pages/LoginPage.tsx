import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircle2, ArrowRight, Loader2, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useUserStore } from '@/stores/userStore';
import { authService } from '@/services/authService';
import { firebaseService } from '@/services/firebaseService';
import { Colors } from '@/styles/colors';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface FirebaseAuthError {
    code: string;
    message: string;
}

export const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { setUserId } = useUserStore();
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [alias, setAlias] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState<string | null>(null);
    const [registerHint, setRegisterHint] = useState<string | null>(null);
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [resetValue, setResetValue] = useState('');

    const handleLogin = async () => {
        if (!alias.trim() || !password.trim()) return;

        const cleanInput = alias.trim().toLowerCase();
        let email = '';

        if (cleanInput.includes('@')) {
            email = cleanInput;
        } else {
            const cleanAlias = cleanInput.replace(/[^a-z0-9]/g, '');
            if (cleanAlias.length < 3) {
                setStatusMsg('El alias debe tener al menos 3 caracteres.');
                return;
            }
            email = `${cleanAlias}@gymbro.app`;
        }

        setIsLoading(true);
        setStatusMsg('Conectando...');

        try {
            // Intentar Login
            const user = await authService.signIn(email, password);
            if (user) {
                setStatusMsg('Preparando tu entrenamiento...');

                // Fetch profile BEFORE navigating to avoid initial onboarding redirect
                try {
                    const cloudData = await firebaseService.getProfile(user.uid);
                    if (cloudData) {
                        useUserStore.setState({ perfil: cloudData });
                    }
                } catch (e) {
                    console.error("Error fetching profile during login:", e);
                }

                setUserId(user.uid);
                navigate('/', { replace: true });
            }
        } catch (error: FirebaseAuthError) {
            console.error("Login Error:", error);
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                if (error.code === 'auth/invalid-credential') {
                    // UX pedido: abrir automáticamente "Registrarse" y mostrar aviso verde.
                    // No mostramos el mensaje rojo si vamos a redirigir a registro.
                    setStatusMsg(null);
                    setMode('register');
                    setIsResettingPassword(false);
                    setRegisterHint('No encontramos un usuario, crea tu usuario aquí.');
                } else {
                    // Igual que arriba: evitar mensaje rojo y guiar al usuario a registro.
                    setStatusMsg(null);
                    setMode('register');
                    setIsResettingPassword(false);
                    setRegisterHint('No encontramos un usuario, crea tu usuario aquí.');
                }
            } else {
                setStatusMsg('Error de conexión: ' + error.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async () => {
        if (!alias.trim() || !password.trim()) return;

        const cleanInput = alias.trim().toLowerCase();
        setIsLoading(true);
        setStatusMsg('Creando perfil de guerrero...');

        // Determine if user entered email or alias
        let email: string;
        let displayAlias: string;

        if (cleanInput.includes('@')) {
            // User entered a full email
            email = cleanInput;
            // Create alias from email prefix
            displayAlias = cleanInput.split('@')[0].replace(/[^a-z0-9]/g, '');
        } else {
            // User entered an alias, create gymbro email
            displayAlias = cleanInput.replace(/[^a-z0-9]/g, '');
            email = `${displayAlias}@gymbro.app`;
        }

        try {
            // Firebase Auth will return 'auth/email-already-in-use' if email is taken
            // No need to check alias beforehand since user isn't authenticated yet
            const user = await authService.signUp(email, password);
            if (user) {
                // Crear alias y perfil inicial
                await firebaseService.createUserAlias(user.uid, displayAlias);

                // Crear perfil vacío en firebaseService.createUserAlias? No, solo crea indices.
                // saveProfile inicial se maneja en CloudSyncManager o aqui?
                // Mejor dejar que CloudSyncManager note que no hay datos y cree uno default, O crearlo aqui explícitamente.
                // La app actual maneja "Initial Load" en AuthProvider/CloudSync.
                // Si no hay perfil, creará uno default en userStore pero DEBE guardarlo.
                // Vamos a dejar que el flujo normal ocurra, pero aseguramos el alias.

                setStatusMsg('¡Cuenta creada!');
                setUserId(user.uid);
                navigate('/', { replace: true });
            }
        } catch (error: FirebaseAuthError) {
            console.error("Register Error:", error);
            if (error.code === 'auth/email-already-in-use') {
                setStatusMsg('Este alias ya está registrado. Intenta iniciar sesión.');
                setMode('login');
            } else {
                setStatusMsg('Error al registrar: ' + error.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordReset = async () => {
        if (isLoading) return;

        const raw = resetValue.trim().toLowerCase();
        if (!raw) {
            setStatusMsg('Ingresa tu email o alias para recuperar la contraseña.');
            return;
        }

        // Acepta email directo o alias (lo convertimos a alias@gymbro.app)
        const email =
            raw.includes('@')
                ? raw
                : `${raw.replace(/[^a-z0-9]/g, '')}@gymbro.app`;

        setIsLoading(true);
        setStatusMsg('Enviando email de recuperación...');

        try {
            await authService.sendPasswordReset(email);
            setStatusMsg('Listo. Revisa tu correo para restablecer la contraseña.');
            setIsResettingPassword(false);
            setResetValue('');
        } catch (error: FirebaseAuthError) {
            // No damos pistas de si existe o no la cuenta (mejor práctica)
            console.warn('Password reset error:', error);
            setStatusMsg('Si existe una cuenta asociada, recibirás un email de recuperación.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <h1 style={styles.title}>GymBro</h1>
                    <p style={styles.subtitle}>Ingreso Directo</p>
                </div>

                <div style={styles.modeToggle}>
                    <div
                        style={{
                            ...styles.modeToggleIndicator,
                            transform: mode === 'login' ? 'translateX(0%)' : 'translateX(100%)',
                        }}
                    />
                    <button
                        type="button"
                        style={{
                            ...styles.modeToggleButton,
                            color: mode === 'login' ? Colors.text : Colors.textSecondary,
                        }}
                        onClick={() => {
                            setMode('login');
                            setIsResettingPassword(false);
                            setStatusMsg(null);
                            setRegisterHint(null);
                        }}
                        disabled={isLoading}
                    >
                        Login
                    </button>
                    <button
                        type="button"
                        style={{
                            ...styles.modeToggleButton,
                            color: mode === 'register' ? Colors.text : Colors.textSecondary,
                        }}
                        onClick={() => {
                            setMode('register');
                            setIsResettingPassword(false);
                            setStatusMsg(null);
                            setRegisterHint(null);
                        }}
                        disabled={isLoading}
                    >
                        Registrarse
                    </button>
                </div>

                {registerHint && (
                    <p style={{
                        color: Colors.primary,
                        fontSize: '14px',
                        textAlign: 'center',
                        marginBottom: '16px',
                        fontWeight: 800
                    }}>
                        {registerHint}
                    </p>
                )}

                <div style={styles.inputWrapper}>
                    <label style={styles.label}>Tu Alias o Email</label>
                    <div style={styles.inputContainer}>
                        <UserCircle2 size={24} color={Colors.textSecondary} style={styles.icon} />
                        <input
                            style={styles.input}
                            placeholder="Ej: TitanFit o usuario@email.com"
                            value={alias}
                            onChange={(e) => {
                                setAlias(e.target.value);
                                setStatusMsg(null);
                                setRegisterHint(null);
                                // Mantener el modo seleccionado; el usuario decide login/registro arriba.
                            }}
                            autoFocus
                        />
                    </div>
                </div>

                <div style={styles.inputWrapper}>
                    <label style={styles.label}>Contraseña</label>
                    <div style={styles.inputContainer}>
                        <KeyRound size={24} color={Colors.textSecondary} style={styles.icon} />
                        <input
                            style={styles.input}
                            placeholder="******"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setStatusMsg(null);
                                setRegisterHint(null);
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && (mode === 'register' ? handleRegister() : handleLogin())}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                                position: 'absolute',
                                right: '16px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: Colors.textSecondary,
                                padding: 0,
                            }}
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>

                {statusMsg && (
                    <p style={{
                        color: statusMsg.includes('Error') || statusMsg.includes('incorrecta') ? Colors.error : Colors.primary,
                        fontSize: '14px',
                        textAlign: 'center',
                        marginBottom: '16px',
                        fontWeight: 600
                    }}>
                        {statusMsg}
                    </p>
                )}

                {mode === 'login' ? (
                    <button
                        style={{
                            ...styles.button,
                            opacity: !alias.trim() || !password.trim() || isLoading ? 0.7 : 1,
                            cursor: !alias.trim() || !password.trim() || isLoading ? 'not-allowed' : 'pointer'
                        }}
                        onClick={handleLogin}
                        disabled={!alias.trim() || !password.trim() || isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                {statusMsg && !statusMsg.includes('Error') ? statusMsg : 'Entrando...'}
                            </>
                        ) : (
                            <>
                                Entrar
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                ) : (
                    <button
                        style={{
                            ...styles.button,
                            background: Colors.accent, // Diferente color para registro
                            opacity: !alias.trim() || !password.trim() || isLoading ? 0.7 : 1,
                            cursor: !alias.trim() || !password.trim() || isLoading ? 'not-allowed' : 'pointer'
                        }}
                        onClick={handleRegister}
                        disabled={!alias.trim() || !password.trim() || isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Creando...
                            </>
                        ) : (
                            <>
                                Crear Cuenta
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                )}

                {mode === 'login' && (
                    <>
                        <button
                            type="button"
                            onClick={() => {
                                setIsResettingPassword((v) => !v);
                                setStatusMsg(null);
                                setResetValue(alias.trim());
                            }}
                            style={styles.linkButton}
                            disabled={isLoading}
                        >
                            ¿Olvidaste tu contraseña?
                        </button>

                        {isResettingPassword && (
                            <div style={styles.resetBox}>
                                <label style={styles.label}>Email o alias</label>
                                <input
                                    style={styles.resetInput}
                                    placeholder="tu@email.com o tu-alias"
                                    value={resetValue}
                                    onChange={(e) => setResetValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handlePasswordReset()}
                                />
                                <button
                                    type="button"
                                    style={{
                                        ...styles.button,
                                        background: Colors.surface,
                                        border: `2px solid ${Colors.border}`,
                                        color: Colors.text,
                                        marginTop: '10px',
                                        opacity: !resetValue.trim() || isLoading ? 0.7 : 1,
                                        cursor: !resetValue.trim() || isLoading ? 'not-allowed' : 'pointer',
                                    }}
                                    onClick={handlePasswordReset}
                                    disabled={!resetValue.trim() || isLoading}
                                >
                                    Enviar enlace
                                </button>
                                <p style={styles.resetHint}>
                                    Si usas alias, el sistema enviará a <span style={{ fontWeight: 700 }}>{'{alias}@gymbro.app'}</span>.
                                </p>
                            </div>
                        )}
                    </>
                )}

                <p style={styles.note}>
                    * Tu progreso se guardará en la nube de forma segura.
                </p>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        height: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: Colors.background, padding: '20px',
    },
    card: {
        width: '100%', maxWidth: '400px', background: Colors.surface, borderRadius: '24px', padding: '32px', border: `1px solid ${Colors.border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center',
    },
    header: { textAlign: 'center', marginBottom: '32px' },
    title: { fontSize: '32px', fontWeight: 900, color: Colors.primary, marginBottom: '8px', letterSpacing: '-1px' },
    subtitle: { fontSize: '16px', color: Colors.textSecondary, opacity: 0.8 },
    modeToggle: {
        position: 'relative',
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0px',
        padding: '4px',
        borderRadius: '16px',
        border: `1px solid ${Colors.border}`,
        background: Colors.background,
        marginBottom: '22px',
        overflow: 'hidden',
    },
    modeToggleIndicator: {
        position: 'absolute',
        top: '4px',
        left: '4px',
        width: 'calc(50% - 4px)',
        height: 'calc(100% - 8px)',
        borderRadius: '12px',
        background: Colors.surface,
        border: `1px solid ${Colors.border}`,
        transition: 'transform 180ms ease',
        boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
        zIndex: 0,
    },
    modeToggleButton: {
        position: 'relative',
        zIndex: 1,
        padding: '10px 12px',
        border: 'none',
        background: 'transparent',
        fontSize: '14px',
        fontWeight: 800,
        cursor: 'pointer',
        borderRadius: '12px',
    },
    inputWrapper: { width: '100%', marginBottom: '20px' },
    label: { fontSize: '14px', color: Colors.textSecondary, marginBottom: '8px', display: 'block', marginLeft: '4px' },
    inputContainer: { position: 'relative', width: '100%' },
    icon: { position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' },
    input: { width: '100%', padding: '16px 16px 16px 50px', fontSize: '18px', background: Colors.background, border: `2px solid ${Colors.border}`, borderRadius: '16px', color: Colors.text, outline: 'none' },
    button: { width: '100%', padding: '16px', background: Colors.primary, border: 'none', borderRadius: '16px', color: '#000', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
    linkButton: {
        marginTop: '12px',
        background: 'transparent',
        border: 'none',
        color: Colors.textSecondary,
        cursor: 'pointer',
        fontSize: '13px',
        textDecoration: 'underline',
    },
    resetBox: {
        width: '100%',
        marginTop: '14px',
        padding: '14px',
        borderRadius: '16px',
        border: `1px solid ${Colors.border}`,
        background: Colors.background,
    },
    resetInput: {
        width: '100%',
        padding: '12px 14px',
        fontSize: '16px',
        background: Colors.surface,
        border: `2px solid ${Colors.border}`,
        borderRadius: '14px',
        color: Colors.text,
        outline: 'none',
    },
    resetHint: {
        marginTop: '10px',
        fontSize: '12px',
        color: Colors.textTertiary,
        textAlign: 'center',
    },
    note: { marginTop: '24px', fontSize: '12px', color: Colors.textTertiary, textAlign: 'center' }
};
