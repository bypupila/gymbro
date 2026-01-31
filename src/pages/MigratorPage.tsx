// =====================================================
// GymBro PWA - AI Migrator (Scan) Page
// =====================================================

import React, { useState } from 'react';
import Colors from '@/styles/colors';
import { ChevronLeft, Scan, Camera, Zap, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/Card';
import { toast } from 'react-hot-toast';

import { useUserStore } from '@/stores/userStore';

export const MigratorPage: React.FC = () => {
    const navigate = useNavigate();
    const [isScanning, setIsScanning] = useState(false);

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleScan = () => {
        fileInputRef.current?.click();
    };

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = (reader.result as string).split(',')[1];
                const { analyzeRoutineImages } = await import('@/services/geminiService');

                const result = await analyzeRoutineImages(base64);

                if (result.exercises && result.exercises.length > 0) {
                    const { setRutina, perfil } = useUserStore.getState();

                    setRutina({
                        ...perfil.rutina,
                        nombre: result.routineName || 'Rutina Escaneada',
                        duracionSemanas: 4,
                        ejercicios: result.exercises,
                        fechaInicio: new Date().toISOString(),
                        analizadaPorIA: true
                    });

                    toast.success(`¡Rutina digitalizada con éxito! ${result.exercises.length} ejercicios detectados.`);
                    navigate('/routine');
                } else {
                    toast.error('No pude detectar ejercicios en la imagen. Intenta con una más clara.');
                }
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error("Scanning error:", error);
            toast.error("Error al procesar la imagen.");
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <button onClick={() => navigate(-1)} style={styles.backBtn}>
                    <ChevronLeft size={24} color={Colors.text} />
                </button>
                <div style={styles.headerTitleContainer}>
                    <p style={styles.headerLabel}>LEGACY MIGRATION</p>
                    <h1 style={styles.headerTitle}>AI Migrator</h1>
                </div>
                <div style={{ width: '44px' }} /> {/* Spacer */}
            </div>

            {/* Scanning Area / Hero */}
            <div style={styles.heroSection}>
                <div style={styles.scanContainer}>
                    <div style={{
                        ...styles.scanView,
                        borderColor: isScanning ? Colors.primary : Colors.border
                    }}>
                        {isScanning ? (
                            <div style={styles.scannerAnimation}>
                                <div style={styles.scanLine} />
                                <Scan size={64} color={Colors.primary} style={{ opacity: 0.3 }} />
                            </div>
                        ) : (
                            <Camera size={64} color={Colors.textTertiary} />
                        )}
                        <div style={styles.cornerTL} />
                        <div style={styles.cornerTR} />
                        <div style={styles.cornerBL} />
                        <div style={styles.cornerBR} />
                    </div>
                </div>
                <h2 style={styles.heroTitle}>Convierte tu rutina física</h2>
                <p style={styles.heroDesc}>
                    Saca una foto a tu rutina de gimnasio escrita o impresa y Gemini la convertirá en una experiencia digital dinámica.
                </p>
            </div>

            {/* Instruction Steps */}
            <div style={styles.steps}>
                <div style={styles.stepItem}>
                    <div style={styles.stepNum}>1</div>
                    <div style={styles.stepContent}>
                        <h4 style={styles.stepTitle}>Escanea la rutina</h4>
                        <p style={styles.stepDesc}>Asegúrate de que haya buena iluminación y el texto sea legible.</p>
                    </div>
                </div>
                <div style={styles.stepItem}>
                    <div style={styles.stepNum}>2</div>
                    <div style={styles.stepContent}>
                        <h4 style={styles.stepTitle}>Análisis Multimodal</h4>
                        <p style={styles.stepDesc}>Gemini 1.5 Pro identifica ejercicios, series, reps y descansos.</p>
                    </div>
                </div>
                <div style={styles.stepItem}>
                    <div style={styles.stepNum}>3</div>
                    <div style={styles.stepContent}>
                        <h4 style={styles.stepTitle}>Entrena con IA</h4>
                        <p style={styles.stepDesc}>Tu rutina ahora es inteligente y se adapta a tu progreso diario.</p>
                    </div>
                </div>
            </div>

            {/* Action Card */}
            <Card style={styles.actionCard}>
                <div style={styles.infoRow}>
                    <Zap size={20} color={Colors.warning} />
                    <span style={styles.infoText}>Optimización Automática habilitada</span>
                </div>
                <button
                    style={styles.mainBtn}
                    onClick={handleScan}
                    disabled={isScanning}
                >
                    {isScanning ? 'ANALIZANDO CON IA...' : 'TOMAR FOTO O SUBIR'}
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={onFileChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                />
            </Card>

            <div style={styles.footer}>
                <ShieldCheck size={16} color={Colors.textMuted} />
                <span style={styles.footerText}>Procesado de forma segura por Google AI Infrastructure</span>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        background: Colors.background,
        padding: '24px',
        paddingTop: 'calc(24px + env(safe-area-inset-top, 0px))',
        paddingBottom: '100px',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
    },
    backBtn: {
        width: '44px',
        height: '44px',
        borderRadius: '12px',
        background: Colors.surface,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `1px solid ${Colors.border}`,
    },
    headerTitleContainer: {
        textAlign: 'center',
    },
    headerLabel: {
        fontSize: '10px',
        fontWeight: 800,
        color: Colors.accent,
        letterSpacing: '1.5px',
        margin: '0 0 2px 0',
    },
    headerTitle: {
        fontSize: '18px',
        fontWeight: 800,
        color: Colors.text,
        margin: 0,
    },
    heroSection: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        marginBottom: '40px',
    },
    scanContainer: {
        width: '240px',
        height: '240px',
        marginBottom: '32px',
        position: 'relative',
    },
    scanView: {
        width: '100%',
        height: '100%',
        background: '#0D0D0E',
        borderRadius: '40px',
        border: `2px solid ${Colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        transition: 'all 0.3s ease',
    },
    scannerAnimation: {
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scanLine: {
        position: 'absolute',
        top: '0',
        left: '10%',
        width: '80%',
        height: '2px',
        background: Colors.primary,
        boxShadow: `0 0 15px ${Colors.primary}`,
        animation: 'scan 2s linear infinite',
        zIndex: 10,
    },
    cornerTL: { position: 'absolute', top: '15px', left: '15px', width: '25px', height: '25px', borderTop: `3px solid ${Colors.primary}`, borderLeft: `3px solid ${Colors.primary}`, borderTopLeftRadius: '10px' },
    cornerTR: { position: 'absolute', top: '15px', right: '15px', width: '25px', height: '25px', borderTop: `3px solid ${Colors.primary}`, borderRight: `3px solid ${Colors.primary}`, borderTopRightRadius: '10px' },
    cornerBL: { position: 'absolute', bottom: '15px', left: '15px', width: '25px', height: '25px', borderBottom: `3px solid ${Colors.primary}`, borderLeft: `3px solid ${Colors.primary}`, borderBottomLeftRadius: '10px' },
    cornerBR: { position: 'absolute', bottom: '15px', right: '15px', width: '25px', height: '25px', borderBottom: `3px solid ${Colors.primary}`, borderRight: `3px solid ${Colors.primary}`, borderBottomRightRadius: '10px' },
    heroTitle: {
        fontSize: '24px',
        fontWeight: 900,
        color: Colors.text,
        margin: '0 0 12px 0',
    },
    heroDesc: {
        fontSize: '14px',
        color: Colors.textSecondary,
        lineHeight: 1.6,
        padding: '0 20px',
        margin: 0,
    },
    steps: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        marginBottom: '40px',
    },
    stepItem: {
        display: 'flex',
        gap: '20px',
        alignItems: 'flex-start',
    },
    stepNum: {
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        background: Colors.surface,
        border: `1px solid ${Colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        fontWeight: 800,
        color: Colors.primary,
        flexShrink: 0,
    },
    stepContent: {
        flex: 1,
    },
    stepTitle: {
        fontSize: '15px',
        fontWeight: 700,
        color: Colors.text,
        margin: '0 0 4px 0',
    },
    stepDesc: {
        fontSize: '12px',
        color: Colors.textTertiary,
        margin: 0,
        lineHeight: 1.4,
    },
    actionCard: {
        padding: '24px',
        background: Colors.surface,
        border: `1px solid ${Colors.borderLight}`,
        marginTop: 'auto',
    },
    infoRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '16px',
        justifyContent: 'center',
    },
    infoText: {
        fontSize: '12px',
        fontWeight: 700,
        color: Colors.textSecondary,
    },
    mainBtn: {
        width: '100%',
        padding: '18px',
        borderRadius: '16px',
        background: Colors.primary,
        color: '#000',
        fontWeight: 900,
        fontSize: '16px',
        border: 'none',
        cursor: 'pointer',
        boxShadow: `0 8px 20px ${Colors.primary}30`,
        transition: 'all 0.2s',
    },
    footer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        marginTop: '24px',
        opacity: 0.6,
    },
    footerText: {
        fontSize: '10px',
        color: Colors.textMuted,
        fontWeight: 500,
    },
};

export default MigratorPage;
