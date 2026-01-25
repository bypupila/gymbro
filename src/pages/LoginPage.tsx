import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { useUserStore } from '@/stores/userStore';
import { cloudService } from '@/services/cloudService';
import { Colors } from '@/styles/colors';

export const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { setUserId, userId } = useUserStore();
    const [alias, setAlias] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    React.useEffect(() => {
        if (userId) {
            navigate('/', { replace: true });
        }
    }, [userId, navigate]);

    const handleLogin = async () => {
        if (!alias.trim()) return;

        const cleanAlias = alias.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanAlias.length < 3) return;

        setIsLoading(true);
        try {
            // Check if user has data in the cloud first
            const cloudData = await cloudService.downloadData(cleanAlias);

            if (cloudData) {
                // If they have data, put it in the store immediately
                useUserStore.setState({ perfil: cloudData });
            }

            // Simple local login: just set the ID
            setUserId(cleanAlias);
            navigate('/', { replace: true });
        } catch (error) {
            console.error("Login Error:", error);
            // Fallback to just setting ID if cloud fails
            setUserId(cleanAlias);
            navigate('/', { replace: true });
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

                <div style={styles.inputWrapper}>
                    <label style={styles.label}>Tu Alias de Guerrero</label>
                    <div style={styles.inputContainer}>
                        <UserCircle2 size={24} color={Colors.textSecondary} style={styles.icon} />
                        <input
                            style={styles.input}
                            placeholder="Ej: TitanFit"
                            value={alias}
                            onChange={(e) => setAlias(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                            autoFocus
                        />
                    </div>
                </div>

                <button
                    style={{
                        ...styles.button,
                        opacity: !alias.trim() || isLoading ? 0.7 : 1,
                        cursor: !alias.trim() || isLoading ? 'not-allowed' : 'pointer'
                    }}
                    onClick={handleLogin}
                    disabled={!alias.trim() || isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 size={20} className="animate-spin" />
                            Verificando...
                        </>
                    ) : (
                        <>
                            Entrar
                            <ArrowRight size={20} />
                        </>
                    )}
                </button>

                <p style={styles.note}>
                    * Tu progreso se guardará automáticamente bajo este nombre.
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
    inputWrapper: { width: '100%', marginBottom: '20px' },
    label: { fontSize: '14px', color: Colors.textSecondary, marginBottom: '8px', display: 'block', marginLeft: '4px' },
    inputContainer: { position: 'relative', width: '100%' },
    icon: { position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' },
    input: { width: '100%', padding: '16px 16px 16px 50px', fontSize: '18px', background: Colors.background, border: `2px solid ${Colors.border}`, borderRadius: '16px', color: Colors.text, outline: 'none' },
    button: { width: '100%', padding: '16px', background: Colors.primary, border: 'none', borderRadius: '16px', color: '#000', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
    note: { marginTop: '24px', fontSize: '12px', color: Colors.textTertiary, textAlign: 'center' }
};
