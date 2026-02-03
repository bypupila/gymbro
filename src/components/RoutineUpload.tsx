import React, { useState, useRef } from 'react';
import { Camera, Check, X, Loader2, Dumbbell, Sparkles, Plus, Calendar } from 'lucide-react';
import Colors from '../styles/colors';
import { Button } from './Button';
import { Card } from './Card';
import { analyzeRoutineImages, generateRoutineFromProfile } from '../services/geminiService';
import { useUserStore, EjercicioRutina, Clarification, AnalysisResult, RutinaUsuario } from '../stores/userStore';
import { EjercicioBase } from '@/data/exerciseDatabase';
import { ClarificationStep } from './ClarificationStep';
import { RoutineReviewStep } from './RoutineReviewStep';
import { ExerciseSelector } from './ExerciseSelector';

interface RoutineUploadProps {
    onComplete: () => void;
    onCancel: () => void;
}

type Step = 'initial' | 'upload' | 'analyzing' | 'clarify' | 'review' | 'success' | 'create_options' | 'generating' | 'recalibrate' | 'manual_build';

export const RoutineUpload: React.FC<RoutineUploadProps> = ({ onComplete, onCancel }) => {
    const [step, setStep] = useState<Step>('initial');
    const [images, setImages] = useState<{ req: string | null; opt: string | null }>({ req: null, opt: null });
    const [userDescription, setUserDescription] = useState('');
    const [lastAnalysis, setLastAnalysis] = useState<AnalysisResult | null>(null);
    const [extractedExercises, setExtractedExercises] = useState<EjercicioRutina[]>([]);
    const [clarifications, setClarifications] = useState<Clarification[]>([]);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fileInputRefReq = useRef<HTMLInputElement>(null);
    const fileInputRefOpt = useRef<HTMLInputElement>(null);
    const { setRutina, perfil } = useUserStore();
    const [manualExercises, setManualExercises] = useState<EjercicioRutina[]>([]);
    const [manualActiveDays, setManualActiveDays] = useState<string[]>([]);
    
    const [showDaySelector, setShowDaySelector] = useState(false);
    const [showExerciseSelector, setShowExerciseSelector] = useState(false);
    const [selectorTargetDay, setSelectorTargetDay] = useState<string>('');
    const [selectorTargetCategory, setSelectorTargetCategory] = useState<'calentamiento' | 'maquina'>('maquina');

    // Temp state for recalibration/generation
    const [tempProfile, setTempProfile] = useState({
        peso: perfil.usuario.peso || 0,
        altura: perfil.usuario.altura || 0,
        objetivo: perfil.usuario.objetivo || 'ganar_musculo',
        nivel: perfil.usuario.nivel || 'principiante',
        partnerPeso: perfil.pareja?.peso || 0,
        partnerObjetivo: perfil.pareja?.objetivo || 'ganar_musculo'
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'req' | 'opt') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImages(prev => ({ ...prev, [type]: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAnalyze = async () => {
        if (!images.req) return;

        setStep('analyzing');
        setIsAnalyzing(true);
        setError(null);

        try {
            const result = await analyzeRoutineImages(images.req, images.opt || undefined, userDescription);
            setLastAnalysis(result);
            setExtractedExercises(result.exercises);
            setClarifications(result.unclearItems);

            setStep('review');
            // We skip the clarification step to let the user edit directly in the table
            // if (result.unclearItems.length > 0) {
            //    setStep('clarify');
            // } else {
            //    setStep('review');
            // }
        } catch (err: unknown) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : "No se pudo analizar la rutina. Por favor intenta de nuevo.";
            setError(errorMessage);
            setStep('upload');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleGenerateRoutine = async () => {
        setStep('generating');
        setIsAnalyzing(true);
        setError(null);

        try {
            const member1 = {
                ...perfil.usuario,
                peso: tempProfile.peso,
                altura: tempProfile.altura,
                objetivo: tempProfile.objetivo,
                nivel: tempProfile.nivel
            };

            let member2 = null;
            if (perfil.pareja) {
                member2 = {
                    ...perfil.pareja,
                    peso: tempProfile.partnerPeso,
                    objetivo: tempProfile.partnerObjetivo
                };
            }

            const result = await generateRoutineFromProfile(member1, member2, perfil.horario);
            setLastAnalysis(result);
            setExtractedExercises(result.exercises);
            setStep('review');
        } catch (err: unknown) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : "No se pudo generar la rutina. Intenta de nuevo.";
            setError(errorMessage);
            setStep('create_options');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleClarificationAnswer = (id: string, val: string) => {
        setAnswers(prev => ({ ...prev, [id]: val }));
    };

    const processClarifications = () => {
        const updatedExercises = [...extractedExercises];
        clarifications.forEach(clari => {
            const answer = answers[clari.id];
            if (answer && clari.exerciseIndex !== undefined && clari.field) {
                const exercise = updatedExercises[clari.exerciseIndex];
                if (exercise) {
                    exercise[clari.field as keyof EjercicioRutina] = answer;
                }
            }
        });
        setExtractedExercises(updatedExercises);
        setStep('review');
    };

    const handleReviewSave = (rutinaFinal: RutinaUsuario) => {
        setRutina(rutinaFinal);
        setStep('success');
        setTimeout(() => {
            onComplete();
        }, 2000);
    };

    const handleManualAddExercise = (base: EjercicioBase) => {
        const nuevo: EjercicioRutina = {
            id: crypto.randomUUID(),
            nombre: base.nombre,
            series: 3,
            repeticiones: '10-12',
            descanso: 60,
            categoria: selectorTargetCategory,
            dia: selectorTargetDay,
        };
        setManualExercises(prev => [...prev, nuevo]);
        setShowExerciseSelector(false);
    };

    const handleContinueFromManual = () => {
        setExtractedExercises(manualExercises);
        setLastAnalysis({
            exercises: manualExercises,
            unclearItems: [],
            confidence: 'high',
            routineName: 'Mi Rutina Manual',
            isAI: false
        });
        setStep('review');
    };

    const handleRemoveManualExercise = (id: string) => {
        setManualExercises(prev => prev.filter(ex => ex.id !== id));
    };

    const handleAddManualDay = (day: string) => {
        if (!manualActiveDays.includes(day)) {
            setManualActiveDays(prev => [...prev, day]);
        }
        setShowDaySelector(false);
    };

    const handleRemoveManualDay = (day: string) => {
        setManualActiveDays(prev => prev.filter(d => d !== day));
        setManualExercises(prev => prev.filter(ex => ex.dia !== day));
    };

    const renderInitial = () => (
        <div style={styles.content}>
            <div style={styles.iconContainer}>
                <Dumbbell size={48} color={Colors.primary} />
            </div>
            <h2 style={styles.title}>¿Ya tienes una rutina?</h2>
            <p style={styles.description}>
                Sube una foto de tu rutina actual y nuestra IA la pasará a digital por ti.
            </p>
            <div style={styles.buttonGroup}>
                <Button onClick={() => setStep('upload')} variant="primary" fullWidth>
                    Sí, tengo una rutina (Escanear)
                </Button>
                <Button onClick={() => setStep('create_options')} variant="secondary" fullWidth>
                    No, quiero crear una nueva
                </Button>
            </div>
        </div>
    );

    const renderCreateOptions = () => (
        <div style={styles.content}>
            <div style={styles.iconContainer}>
                <Sparkles size={48} color={Colors.accent} />
            </div>
            <h2 style={styles.title}>Crear Nueva Rutina</h2>
            <p style={styles.description}>
                Puedo diseñar un plan para ti basado en tu perfil y objetivos.
            </p>

            <div style={styles.infoBox}>
                <p><strong>Objetivo:</strong> {(perfil.usuario?.objetivo || 'ganar_musculo').replace('_', ' ')}</p>
                <p><strong>Nivel:</strong> {perfil.usuario?.nivel || 'principiante'}</p>
            </div>

            {error && <p style={styles.errorText}>{error}</p>}

            <div style={styles.buttonGroup}>
                <Button onClick={() => setStep('recalibrate')} variant="primary" fullWidth>
                    <Sparkles size={18} /> Crear con IA (Recomendado)
                </Button>
                <Button onClick={() => {
                    setManualExercises([]);
                    setStep('manual_build');
                }} variant="secondary" fullWidth>
                    <Plus size={18} /> Crear Manualmente
                </Button>
                <Button onClick={() => setStep('initial')} variant="ghost" fullWidth>
                    Volver
                </Button>
            </div>
        </div>
    );

    const renderRecalibrate = () => (
        <div style={styles.content}>
            <h2 style={styles.title}>Tus datos actuales</h2>
            <p style={styles.description}>
                Para generar la mejor rutina, necesitamos saber cómo estás hoy.
            </p>

            <div style={styles.formGrid}>
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Tu Peso (kg)</label>
                    <input
                        type="number"
                        style={styles.input}
                        value={tempProfile.peso}
                        onChange={(e) => setTempProfile({ ...tempProfile, peso: parseInt(e.target.value) || 0 })}
                    />
                </div>
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Tu Objetivo</label>
                    <select
                        style={styles.input}
                        value={tempProfile.objetivo}
                        onChange={(e) => setTempProfile({ ...tempProfile, objetivo: e.target.value as 'ganar_musculo' | 'perder_grasa' | 'fuerza' | 'mantener' })}
                    >
                        <option value="ganar_musculo">Ganar Músculo</option>
                        <option value="perder_grasa">Perder Grasa</option>
                        <option value="fuerza">Fuerza</option>
                        <option value="mantener">Mantener</option>
                    </select>
                </div>

                {perfil.pareja && (
                    <>
                        <div style={{ ...styles.divider, gridColumn: '1 / -1' }}>Datos de {perfil.pareja.nombre}</div>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Peso Pareja (kg)</label>
                            <input
                                type="number"
                                style={styles.input}
                                value={tempProfile.partnerPeso}
                                onChange={(e) => setTempProfile({ ...tempProfile, partnerPeso: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Objetivo Pareja</label>
                            <select
                                style={styles.input}
                                                        value={tempProfile.partnerObjetivo}
                                                        onChange={(e) => setTempProfile({ ...tempProfile, partnerObjetivo: e.target.value as 'ganar_musculo' | 'perder_grasa' | 'fuerza' | 'mantener' })}                            >
                                <option value="ganar_musculo">Ganar Músculo</option>
                                <option value="perder_grasa">Perder Grasa</option>
                                <option value="fuerza">Fuerza</option>
                                <option value="mantener">Mantener</option>
                            </select>
                        </div>
                    </>
                )}
            </div>

            <div style={styles.buttonGroup}>
                <Button onClick={handleGenerateRoutine} variant="primary" fullWidth>
                    <Sparkles size={18} /> Generar Rutina con IA
                </Button>
                <Button onClick={() => setStep('create_options')} variant="ghost" fullWidth>
                    Atrás
                </Button>
            </div>
        </div>
    );

    const renderManualBuild = () => {
        const weekdays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const availableDays = weekdays.filter(d => !manualActiveDays.includes(d));

        return (
            <div style={{ ...styles.content, padding: '24px 16px' }}>
                <h2 style={styles.title}>Constructor Manual</h2>
                <p style={styles.description}>Crea tu rutina paso a paso. Comienza añadiendo un día de entrenamiento.</p>

                <div style={styles.manualScrollArea}>
                    {manualActiveDays.length === 0 ? (
                        <div style={styles.emptyManualState}>
                            <Dumbbell size={40} color={Colors.textTertiary} style={{ opacity: 0.3, marginBottom: '12px' }} />
                            <p style={{ fontSize: '14px', color: Colors.textTertiary }}>No has añadido días todavía</p>
                        </div>
                    ) : (
                        manualActiveDays.map(day => {
                            const dayInfo = perfil.horario?.dias.find(d => d.dia === day);
                            const muscleGroup = (dayInfo && dayInfo.entrena) ? dayInfo.grupoMuscular : 'Sin asignar';

                            return (
                                <div key={day} style={styles.manualDayCard}>
                                    <div style={styles.manualDayHeader}>
                                        <span style={styles.manualDayTitle}>{day}: {muscleGroup}</span>
                                        <button
                                            onClick={() => handleRemoveManualDay(day)}
                                            style={styles.removeDayBtn}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>

                                    <div style={styles.manualExerciseList}>
                                        {manualExercises.filter(ex => ex.dia === day).map(ex => (
                                            <div key={ex.id} style={styles.manualExerciseItem}>
                                                <div style={{ flex: 1, textAlign: 'left' }}>
                                                    <span style={styles.manualExCategory}>{ex.categoria === 'calentamiento' ? 'ðŸ”¥' : 'ðŸ’ª'}</span>
                                                    <span style={styles.manualExName}>{ex.nombre}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveManualExercise(ex.id)}
                                                    style={styles.removeBtn}
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    <div style={styles.manualActionRow}>
                                        <button
                                            style={styles.addSmallBtn}
                                            onClick={() => {
                                                setSelectorTargetDay(day);
                                                setSelectorTargetCategory('calentamiento');
                                                setShowExerciseSelector(true);
                                            }}
                                        >
                                            <Plus size={14} /> Calentamiento
                                        </button>
                                        <button
                                            style={{ ...styles.addSmallBtn, background: `${Colors.primary}20`, color: Colors.primary }}
                                            onClick={() => {
                                                setSelectorTargetDay(day);
                                                setSelectorTargetCategory('maquina');
                                                setShowExerciseSelector(true);
                                            }}
                                        >
                                            <Plus size={14} /> Ejercicio
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {availableDays.length > 0 && !showDaySelector && (
                        <button
                            style={styles.addDayBigBtn}
                            onClick={() => setShowDaySelector(true)}
                        >
                            <Calendar size={18} /> Añadir Día de Entrenamiento
                        </button>
                    )}

                    {showDaySelector && (
                        <div style={styles.daySelectorCard}>
                            <p style={styles.selectorLabel}>Selecciona el día a añadir:</p>
                            <div style={styles.daySelectionGrid}>
                                {availableDays.map(dayName => (
                                    <button
                                        key={dayName}
                                        style={styles.dayOptionBtn}
                                        onClick={() => handleAddManualDay(dayName)}
                                    >
                                        {dayName}
                                    </button>
                                ))}
                            </div>
                            <Button variant="ghost" fullWidth onClick={() => setShowDaySelector(false)}>Cancelar</Button>
                        </div>
                    )}
                </div>

                <div style={styles.buttonGroup}>
                    <Button
                        onClick={handleContinueFromManual}
                        variant="primary"
                        fullWidth
                        disabled={manualExercises.length === 0}
                    >
                        Continuar a Revisión ({manualExercises.length})
                    </Button>
                    <Button onClick={() => setStep('create_options')} variant="ghost" fullWidth>
                        Atrás
                    </Button>
                </div>
            </div>
        );
    };

    const renderUpload = () => (
        <div style={styles.content}>
            <h2 style={styles.title}>Detalla tu rutina</h2>
            <p style={styles.description}>
                Aquí debes colocar toda una descripción utiliza este espacio para colocar detalles específicos de tu rutina para que pueda extraer la información lo mejor posible. Si está escrita a mano, que días entrenas, si usas colores para identificar tus días. Todo lo que pueda servir para realizar el mejor análisis.
            </p>

            <div style={styles.uploadCards}>
                <div
                    style={{ ...styles.uploadBox, borderColor: images.req ? Colors.primary : Colors.border }}
                    onClick={() => fileInputRefReq.current?.click()}
                >
                    {images.req ? (
                        <img src={images.req} style={styles.previewImg} alt="Rutina 1" />
                    ) : (
                        <>
                            <Camera size={32} color={Colors.textSecondary} />
                            <span style={styles.uploadLabel}>Foto Principal (Requerida)</span>
                        </>
                    )}
                    <input
                        type="file"
                        ref={fileInputRefReq}
                        style={{ display: 'none' }}
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'req')}
                    />
                </div>

                <div
                    style={{ ...styles.uploadBox, borderColor: images.opt ? Colors.primary : Colors.border }}
                    onClick={() => fileInputRefOpt.current?.click()}
                >
                    {images.opt ? (
                        <img src={images.opt} style={styles.previewImg} alt="Rutina 2" />
                    ) : (
                        <>
                            <Plus size={32} color={Colors.textSecondary} />
                            <span style={styles.uploadLabel}>Foto Opcional</span>
                        </>
                    )}
                    <input
                        type="file"
                        ref={fileInputRefOpt}
                        style={{ display: 'none' }}
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'opt')}
                    />
                </div>
            </div>

            <div style={styles.descriptionSection}>
                <label style={styles.label}>CONTEXTO ADICIONAL (OPCIONAL)</label>
                <div style={{ fontSize: '11px', color: Colors.textTertiary, marginBottom: '8px', textAlign: 'left' }}>
                    ðŸ’¡ Tip: Indica qué días entrenas o qué significan los símbolos de tu rutina para un análisis perfecto.
                </div>
                <textarea
                    style={styles.descriptionInput}
                    placeholder="Ej: El primer ejercicio es para pierna, ignora la nota tachada..."
                    value={userDescription}
                    onChange={(e) => setUserDescription(e.target.value)}
                />
            </div>

            {error && <p style={styles.errorText}>{error}</p>}

            <div style={styles.buttonGroup}>
                <Button
                    onClick={handleAnalyze}
                    disabled={!images.req || isAnalyzing}
                    variant="primary"
                    fullWidth
                >
                    {isAnalyzing ? <Loader2 className="animate-spin" /> : <><Sparkles size={18} /> Analizar con Gemini</>}
                </Button>
                <Button onClick={() => setStep('initial')} variant="ghost" fullWidth>
                    Atrás
                </Button>
            </div>
        </div>
    );

    const renderSuccess = () => (
        <div style={styles.content}>
            <div style={styles.successIcon}>
                <Check size={64} color={Colors.primary} />
            </div>
            <h2 style={styles.title}>¡Rutina Guardada!</h2>
            <p style={styles.description}>
                Tu rutina ha sido analizada y guardada con éxito. Ya puedes empezar a entrenar.
            </p>
        </div>
    );

    return (
        <div style={styles.overlay}>
            <Card style={{
                ...styles.modal,
                maxWidth: step === 'review' ? '1200px' : '500px',
                width: step === 'review' ? '95%' : '100%',
                height: step === 'review' ? '90vh' : 'auto',
            }}>
                {step !== 'success' && step !== 'analyzing' && step !== 'generating' && (
                    <button style={styles.closeBtn} onClick={onCancel}>
                        <X size={20} color={Colors.textTertiary} />
                    </button>
                )}

                {step === 'initial' && renderInitial()}
                {step === 'create_options' && renderCreateOptions()}
                {step === 'recalibrate' && renderRecalibrate()}
                {step === 'manual_build' && renderManualBuild()}
                {step === 'upload' && renderUpload()}

                {showExerciseSelector && (
                    <ExerciseSelector
                        onSelect={handleManualAddExercise}
                        onClose={() => setShowExerciseSelector(false)}
                    />
                )}

                {(step === 'analyzing' || step === 'generating') && (
                    <div style={styles.content}>
                        <div className="pulse-container">
                            <Loader2 size={48} color={Colors.primary} className="animate-spin" />
                        </div>
                        <h2 style={styles.title}>
                            {step === 'generating' ? 'Diseñando tu plan...' : 'Analizando imagen...'}
                        </h2>
                        <p style={styles.description}>
                            {step === 'generating'
                                ? 'La IA está creando la mejor rutina para tu objetivo.'
                                : 'Digitalizando e interpretando tu rutina manuscrita.'}
                        </p>
                    </div>
                )}

                {step === 'clarify' && (
                    <ClarificationStep
                        clarifications={clarifications}
                        onAnswer={handleClarificationAnswer}
                        onComplete={processClarifications}
                        onBack={() => setStep('upload')}
                    />
                )}
                {step === 'review' && lastAnalysis && (
                    <RoutineReviewStep
                        analysis={lastAnalysis}
                        onCancel={() => setStep('upload')}
                        onSave={handleReviewSave}
                    />
                )}
                {step === 'success' && renderSuccess()}
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
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
    },
    modal: {
        width: '100%',
        maxWidth: '500px',
        maxHeight: '90vh',
        background: Colors.surface,
        borderRadius: '32px',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
    },
    closeBtn: {
        position: 'absolute',
        top: '20px',
        right: '20px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        zIndex: 10,
    },
    content: {
        padding: '40px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '16px',
    },
    iconContainer: {
        width: '80px',
        height: '80px',
        borderRadius: '24px',
        background: `${Colors.primary}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '8px',
    },
    title: {
        fontSize: '24px',
        fontWeight: 800,
        color: Colors.text,
        margin: 0,
    },
    description: {
        fontSize: '15px',
        color: Colors.textSecondary,
        lineHeight: 1.5,
        margin: '0 0 8px 0',
    },
    infoBox: {
        background: Colors.background,
        padding: '16px',
        borderRadius: '16px',
        border: `1px solid ${Colors.border}`,
        width: '100%',
        textAlign: 'left',
        fontSize: '14px',
        color: Colors.textSecondary,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    buttonGroup: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginTop: '8px',
    },
    uploadCards: {
        display: 'flex',
        gap: '12px',
        width: '100%',
        margin: '12px 0',
    },
    uploadBox: {
        flex: 1,
        aspectRatio: '1',
        border: '2px dashed',
        borderRadius: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        cursor: 'pointer',
        overflow: 'hidden',
        position: 'relative',
        background: Colors.background,
    },
    uploadLabel: {
        fontSize: '10px',
        fontWeight: 700,
        color: Colors.textTertiary,
        textAlign: 'center',
        padding: '0 8px',
    },
    previewImg: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    errorText: {
        color: Colors.error,
        fontSize: '13px',
        margin: 0,
    },
    successIcon: {
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        background: `${Colors.primary}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '16px',
    },
    descriptionSection: {
        width: '100%',
        textAlign: 'left',
        marginTop: '12px',
    },
    label: {
        display: 'block',
        fontSize: '12px',
        fontWeight: 600,
        color: Colors.textTertiary,
        marginBottom: '6px',
        textTransform: 'uppercase',
        letterSpacing: '1px',
    },
    descriptionInput: {
        width: '100%',
        height: '80px',
        background: Colors.background,
        border: `1px solid ${Colors.border}`,
        borderRadius: '12px',
        padding: '12px',
        color: Colors.text,
        fontSize: '14px',
        fontFamily: 'inherit',
        resize: 'none',
        outline: 'none',
        transition: 'border-color 0.2s',
    },
    formGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        width: '100%',
        marginTop: '8px',
    },
    inputGroup: {
        width: '100%',
        textAlign: 'left',
    },
    input: {
        width: '100%',
        padding: '12px',
        background: Colors.background,
        border: `1px solid ${Colors.border}`,
        borderRadius: '12px',
        color: Colors.text,
        fontSize: '14px',
        outline: 'none',
    },
    divider: {
        fontSize: '12px',
        fontWeight: 800,
        color: Colors.primary,
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginTop: '16px',
        textAlign: 'center',
    },
    manualScrollArea: {
        width: '100%',
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '4px',
    },
    manualDayCard: {
        background: Colors.background,
        borderRadius: '20px',
        padding: '16px',
        border: `1px solid ${Colors.border}`,
    },
    manualDayTitle: {
        fontSize: '14px',
        fontWeight: 800,
        color: Colors.primary,
        textTransform: 'uppercase',
        letterSpacing: '1px',
    },
    manualExerciseList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginBottom: '12px',
    },
    manualExerciseItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 12px',
        background: Colors.surface,
        borderRadius: '12px',
    },
    manualExCategory: {
        fontSize: '14px',
        marginRight: '6px',
    },
    manualExName: {
        fontSize: '13px',
        fontWeight: 600,
        color: Colors.text,
    },
    removeBtn: {
        background: `${Colors.error}20`,
        border: 'none',
        color: Colors.error,
        borderRadius: '50%',
        width: '24px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
    },
    manualActionRow: {
        display: 'flex',
        gap: '8px',
    },
    addSmallBtn: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '8px',
        background: `${Colors.accent}20`,
        color: Colors.accent,
        border: 'none',
        borderRadius: '10px',
        fontSize: '11px',
        fontWeight: 700,
        cursor: 'pointer',
    },
    emptyManualState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 20px',
        background: `${Colors.surface}50`,
        borderRadius: '20px',
        border: `2px dashed ${Colors.border}`,
        marginBottom: '20px',
    },
    addDayBigBtn: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        padding: '16px',
        background: `${Colors.primary}10`,
        color: Colors.primary,
        border: `1px solid ${Colors.primary}30`,
        borderRadius: '16px',
        fontSize: '14px',
        fontWeight: 700,
        cursor: 'pointer',
        marginTop: '8px',
    },
    daySelectorCard: {
        background: Colors.surface,
        borderRadius: '20px',
        padding: '16px',
        border: `1px solid ${Colors.primary}40`,
        marginTop: '8px',
    },
    selectorLabel: {
        fontSize: '12px',
        fontWeight: 700,
        color: Colors.textSecondary,
        marginBottom: '12px',
        textAlign: 'left',
    },
    daySelectionGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
        marginBottom: '16px',
    },
    dayOptionBtn: {
        padding: '10px',
        background: Colors.background,
        border: `1px solid ${Colors.border}`,
        borderRadius: '10px',
        color: Colors.text,
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
    },
    removeDayBtn: {
        background: 'none',
        border: 'none',
        color: Colors.textTertiary,
        cursor: 'pointer',
        padding: '4px',
    },
    manualDayHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
    }
};

