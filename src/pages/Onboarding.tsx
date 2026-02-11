// =====================================================
// GymBro PWA - Onboarding Pages
// =====================================================

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { NivelExperiencia, ObjetivoFitness, useUserStore } from '@/stores/userStore';
import Colors from '@/styles/colors';
import { Brain, Calendar, Check, ChevronRight, Dumbbell, Users } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Welcome Screen
export const OnboardingWelcome: React.FC = () => {
    const navigate = useNavigate();

    const features = [
        { icon: Brain, title: 'Coach IA Personal', desc: 'Rutinas adaptadas a ti' },
        { icon: Users, title: 'Entrena en Pareja', desc: 'Sincroniza con tu gymbro' },
        { icon: Calendar, title: 'Seguimiento Inteligente', desc: 'Trackea tu progreso' },
    ];

    return (
        <div style={styles.container}>
            <div style={styles.logoContainer}>
                <div style={styles.logoCircle}>
                    <Dumbbell size={48} color="#000" />
                </div>
                <h1 style={styles.title}>GymBro</h1>
                <p style={styles.subtitle}>Tu coach de fitness con IA</p>
            </div>

            <div style={styles.featuresContainer}>
                {features.map((feat, i) => (
                    <div key={i} style={styles.featureRow}>
                        <div style={styles.featureIcon}>
                            <feat.icon size={24} color={Colors.primary} />
                        </div>
                        <div>
                            <h3 style={styles.featureTitle}>{feat.title}</h3>
                            <p style={styles.featureDesc}>{feat.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div style={styles.footer}>
                <Button onClick={() => navigate('/onboarding/datos')} fullWidth size="lg">
                    Comenzar <ChevronRight size={20} />
                </Button>
            </div>
        </div>
    );
};

// Personal Data Screen
export const OnboardingDatos: React.FC = () => {
    const navigate = useNavigate();
    const setDatosPersonales = useUserStore((state) => state.setDatosPersonales);

    const [datos, setDatos] = useState({
        nombre: '',
        edad: '',
        peso: '',
        altura: '',
        nivel: 'principiante' as NivelExperiencia,
        objetivo: 'ganar_musculo' as ObjetivoFitness,
        lesiones: '',
    });

    const niveles: { value: NivelExperiencia; label: string }[] = [
        { value: 'principiante', label: 'Principiante' },
        { value: 'intermedio', label: 'Intermedio' },
        { value: 'avanzado', label: 'Avanzado' },
    ];

    const objetivos: { value: ObjetivoFitness; label: string }[] = [
        { value: 'ganar_musculo', label: 'Ganar Músculo' },
        { value: 'perder_grasa', label: 'Perder Grasa' },
        { value: 'mantener', label: 'Mantenerme' },
        { value: 'fuerza', label: 'Más Fuerza' },
    ];

    const isValid = datos.nombre.length > 0 && parseInt(datos.edad) > 0 && parseInt(datos.peso) > 0;

    const handleContinue = () => {
        setDatosPersonales({
            nombre: datos.nombre,
            edad: parseInt(datos.edad),
            peso: parseInt(datos.peso),
            altura: parseInt(datos.altura),
            nivel: datos.nivel,
            objetivo: datos.objetivo,
            lesiones: datos.lesiones,
        });
        navigate('/onboarding/horarios');
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <span style={styles.stepIndicator}>Paso 1 de 2</span>
                <h1 style={styles.pageTitle}>Cuéntanos sobre ti</h1>
            </div>

            <div style={styles.form}>
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Nombre</label>
                    <input
                        style={styles.input}
                        placeholder="Tu nombre"
                        value={datos.nombre}
                        onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
                    />
                </div>

                <div style={styles.inputGrid3}>
                    <div style={styles.inputGroupMin}>
                        <label style={styles.label}>Edad</label>
                        <input
                            style={styles.inputSmall}
                            type="number"
                            placeholder="25"
                            value={datos.edad}
                            onChange={(e) => setDatos({ ...datos, edad: e.target.value })}
                        />
                    </div>
                    <div style={styles.inputGroupMin}>
                        <label style={styles.label}>Peso (kg)</label>
                        <input
                            style={styles.inputSmall}
                            type="number"
                            placeholder="70"
                            value={datos.peso}
                            onChange={(e) => setDatos({ ...datos, peso: e.target.value })}
                        />
                    </div>
                    <div style={styles.inputGroupMin}>
                        <label style={styles.label}>Altura (cm)</label>
                        <input
                            style={styles.inputSmall}
                            type="number"
                            placeholder="175"
                            value={datos.altura}
                            onChange={(e) => setDatos({ ...datos, altura: e.target.value })}
                        />
                    </div>
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Nivel de Experiencia</label>
                    <div style={styles.optionsGrid3}>
                        {niveles.map((n) => (
                            <button
                                key={n.value}
                                onClick={() => setDatos({ ...datos, nivel: n.value })}
                                style={{
                                    ...styles.optionBtn,
                                    background: datos.nivel === n.value ? Colors.primary : Colors.surface,
                                    color: datos.nivel === n.value ? '#000' : Colors.text,
                                    fontSize: '12px',
                                    padding: '12px 8px',
                                }}
                            >
                                {n.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Objetivo Principal</label>
                    <div style={styles.optionsGrid}>
                        {objetivos.map((o) => (
                            <button
                                key={o.value}
                                onClick={() => setDatos({ ...datos, objetivo: o.value })}
                                style={{
                                    ...styles.optionBtn,
                                    background: datos.objetivo === o.value ? Colors.primary : Colors.surface,
                                    color: datos.objetivo === o.value ? '#000' : Colors.text,
                                }}
                            >
                                {o.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Lesiones o limitaciones (opcional)</label>
                    <textarea
                        style={{ ...styles.input, minHeight: '80px', resize: 'none' }}
                        placeholder="Ej: Dolor de rodilla derecha..."
                        value={datos.lesiones}
                        onChange={(e) => setDatos({ ...datos, lesiones: e.target.value })}
                    />
                </div>
            </div>

            <div style={styles.footer}>
                <Button onClick={handleContinue} disabled={!isValid} fullWidth size="lg">
                    Continuar <ChevronRight size={20} />
                </Button>
            </div>
        </div>
    );
};

// Schedule Screen
export const OnboardingHorarios: React.FC = () => {
    const navigate = useNavigate();
    const perfil = useUserStore((state) => state.perfil);
    const setHorario = useUserStore((state) => state.setHorario);
    const completarOnboarding = useUserStore((state) => state.completarOnboarding);
    const [dias, setDias] = useState(perfil.horario.dias);

    const toggleDia = (index: number) => {
        const newDias = [...dias];
        newDias[index] = {
            ...newDias[index],
            entrena: !newDias[index].entrena,
            grupoMuscular: !newDias[index].entrena ? 'Full Body' : 'Descanso'
        };
        setDias(newDias);
    };

    const handleComplete = () => {
        setHorario({ dias });
        completarOnboarding();
        navigate('/onboarding/completado');
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <span style={styles.stepIndicator}>Paso 2 de 2</span>
                <h1 style={styles.pageTitle}>¿Cuándo entrenas?</h1>
                <p style={styles.pageSubtitle}>Selecciona los días que puedes ir al gym</p>
            </div>

            <div style={styles.daysGrid}>
                {dias.map((dia, index) => (
                    <Card
                        key={dia.dia}
                        onClick={() => toggleDia(index)}
                        style={{
                            ...styles.dayCard,
                            borderColor: dia.entrena ? Colors.primary : Colors.border,
                            background: dia.entrena ? `${Colors.primary}15` : Colors.surface,
                        }}
                    >
                        <span style={{
                            ...styles.dayName,
                            color: dia.entrena ? Colors.primary : Colors.textSecondary,
                        }}>
                            {dia.dia.slice(0, 3)}
                        </span>
                        {dia.entrena && (
                            <div style={styles.checkCircle}>
                                <Check size={14} color="#000" />
                            </div>
                        )}
                    </Card>
                ))}
            </div>

            <div style={styles.summary}>
                <p style={styles.summaryText}>
                    Entrenarás <strong>{dias.filter(d => d.entrena).length} días</strong> por semana
                </p>
            </div>

            <div style={styles.footer}>
                <Button onClick={handleComplete} fullWidth size="lg">
                    Completar Setup <Check size={20} />
                </Button>
            </div>
        </div>
    );
};

// Completion Screen
export const OnboardingCompletado: React.FC = () => {
    const navigate = useNavigate();
    const perfil = useUserStore((state) => state.perfil);

    return (
        <div style={{ ...styles.container, justifyContent: 'center', textAlign: 'center' }}>
            <div style={styles.successIcon}>
                <Check size={48} color="#000" />
            </div>

            <h1 style={styles.successTitle}>¡Listo, {perfil.usuario.nombre}!</h1>
            <p style={styles.successSubtitle}>
                Tu perfil ha sido configurado. El Coach IA ya está preparando tu primera rutina.
            </p>

            <div style={{ ...styles.footer, marginTop: '40px' }}>
                <Button onClick={() => navigate('/')} fullWidth size="lg">
                    Ir al Dashboard <ChevronRight size={20} />
                </Button>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        minHeight: '100%',
        padding: '24px',
        paddingTop: 'calc(40px + env(safe-area-inset-top, 0px))',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '500px',
        margin: '0 auto',
    },
    logoContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: '48px',
    },
    logoCircle: {
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        background: Colors.gradientPrimary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '20px',
    },
    title: {
        fontSize: '36px',
        fontWeight: 900,
        color: Colors.text,
        margin: 0,
    },
    subtitle: {
        fontSize: '16px',
        color: Colors.textSecondary,
        margin: '8px 0 0 0',
    },
    featuresContainer: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    featureRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px',
        background: Colors.surface,
        borderRadius: '20px',
    },
    featureIcon: {
        width: '48px',
        height: '48px',
        borderRadius: '16px',
        background: `${Colors.primary}20`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureTitle: {
        fontSize: '16px',
        fontWeight: 700,
        color: Colors.text,
        margin: 0,
    },
    featureDesc: {
        fontSize: '13px',
        color: Colors.textSecondary,
        margin: '4px 0 0 0',
    },
    footer: {
        marginTop: 'auto',
        paddingTop: '24px',
    },
    header: {
        marginBottom: '32px',
    },
    stepIndicator: {
        fontSize: '12px',
        fontWeight: 700,
        color: Colors.primary,
        textTransform: 'uppercase',
        letterSpacing: '1px',
    },
    pageTitle: {
        fontSize: '28px',
        fontWeight: 900,
        color: Colors.text,
        margin: '8px 0 0 0',
    },
    pageSubtitle: {
        fontSize: '14px',
        color: Colors.textSecondary,
        margin: '8px 0 0 0',
    },
    form: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    label: {
        fontSize: '13px',
        fontWeight: 600,
        color: Colors.textSecondary,
    },
    input: {
        width: '100%',
        padding: '16px',
        background: Colors.surface,
        border: `1px solid ${Colors.border}`,
        borderRadius: '16px',
        color: Colors.text,
        fontSize: '16px',
        outline: 'none',
        boxSizing: 'border-box',
    },
    inputSmall: {
        width: '100%',
        padding: '16px 8px',
        background: Colors.surface,
        border: `1px solid ${Colors.border}`,
        borderRadius: '16px',
        color: Colors.text,
        fontSize: '16px',
        outline: 'none',
        boxSizing: 'border-box',
        textAlign: 'center',
    },
    inputGrid3: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '8px',
        width: '100%',
    },
    inputGroupMin: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minWidth: 0,
    },
    optionsRow: {
        display: 'flex',
        gap: '8px',
    },
    optionsGrid3: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '8px',
    },
    optionsGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
    },
    optionBtn: {
        flex: 1,
        padding: '14px 16px',
        borderRadius: '16px',
        border: 'none',
        fontWeight: 600,
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
    daysGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '8px',
        marginBottom: '24px',
    },
    dayCard: {
        padding: '16px 8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
    },
    dayName: {
        fontSize: '12px',
        fontWeight: 700,
    },
    checkCircle: {
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        background: Colors.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    summary: {
        textAlign: 'center',
        padding: '20px',
        background: Colors.surface,
        borderRadius: '20px',
    },
    summaryText: {
        color: Colors.textSecondary,
        margin: 0,
    },
    successIcon: {
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        background: Colors.gradientPrimary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px',
    },
    successTitle: {
        fontSize: '28px',
        fontWeight: 900,
        color: Colors.text,
        margin: '0 0 12px 0',
    },
    successSubtitle: {
        fontSize: '16px',
        color: Colors.textSecondary,
        margin: 0,
        lineHeight: 1.6,
    },
};

export default OnboardingWelcome;

