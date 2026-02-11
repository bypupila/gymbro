import React from 'react';
import { HelpCircle, ChevronRight, AlertCircle } from 'lucide-react';
import Colors from '../styles/colors';
import { Button } from './Button';
import { Clarification } from '../stores/userStore';

interface ClarificationStepProps {
    clarifications: Clarification[];
    onAnswer: (id: string, value: string) => void;
    onComplete: () => void;
    onBack: () => void;
}

export const ClarificationStep: React.FC<ClarificationStepProps> = ({
    clarifications,
    onAnswer,
    onComplete,
    onBack
}) => {
    const [localAnswers, setLocalAnswers] = React.useState<Record<string, string>>({});

    const handleLocalChange = (id: string, val: string) => {
        setLocalAnswers(prev => ({ ...prev, [id]: val }));
        onAnswer(id, val);
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <HelpCircle size={32} color={Colors.primary} />
                <h2 style={styles.title}>Ayúdanos a entender</h2>
                <p style={styles.subtitle}>
                    Hay algunas partes de tu rutina que no se leen con claridad. ¿Podrías confirmarlas?
                </p>
            </div>

            <div style={styles.scrollArea}>
                {clarifications.map((item) => (
                    <div key={item.id} style={styles.itemCard}>
                        <div style={styles.itemHeader}>
                            <AlertCircle size={16} color={Colors.warning} />
                            <span style={styles.itemQuestion}>{item.question}</span>
                        </div>

                        {item.detectedValue && (
                            <div style={styles.detectedBox}>
                                <span style={styles.detectedLabel}>Detectamos algo como:</span>
                                <span style={styles.detectedValue}>&quot;{item.detectedValue}&quot;</span>
                            </div>
                        )}

                        <div style={styles.inputWrapper}>
                            {item.options && item.options.length > 0 ? (
                                <div style={styles.optionsGrid}>
                                    {item.options.map(opt => (
                                        <button
                                            key={opt}
                                            style={{
                                                ...styles.optionBtn,
                                                background: localAnswers[item.id] === opt ? Colors.primary : Colors.surface,
                                                color: localAnswers[item.id] === opt ? '#000' : Colors.textSecondary,
                                                borderColor: localAnswers[item.id] === opt ? Colors.primary : Colors.border,
                                            }}
                                            onClick={() => handleLocalChange(item.id, opt)}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <input
                                    style={styles.input}
                                    placeholder="Escribe la corrección aquí..."
                                    value={localAnswers[item.id] || ''}
                                    onChange={(e) => handleLocalChange(item.id, e.target.value)}
                                />
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div style={styles.footer}>
                <Button onClick={onComplete} variant="primary" fullWidth>
                    Continuar a revisión <ChevronRight size={18} />
                </Button>
                <Button onClick={onBack} variant="ghost" fullWidth>
                    Intentar con otra foto
                </Button>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: '80vh',
    },
    header: {
        textAlign: 'center',
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
    },
    title: {
        fontSize: '22px',
        fontWeight: 800,
        color: Colors.text,
        margin: 0,
    },
    subtitle: {
        fontSize: '14px',
        color: Colors.textSecondary,
        lineHeight: 1.5,
        margin: 0,
    },
    scrollArea: {
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        paddingRight: '4px',
        marginBottom: '24px',
    },
    itemCard: {
        background: Colors.background,
        borderRadius: '20px',
        padding: '16px',
        border: `1px solid ${Colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    itemHeader: {
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-start',
    },
    itemQuestion: {
        fontSize: '14px',
        fontWeight: 600,
        color: Colors.text,
        lineHeight: 1.4,
    },
    detectedBox: {
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '12px',
        padding: '10px 12px',
        border: `1px dashed ${Colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    detectedLabel: {
        fontSize: '10px',
        fontWeight: 700,
        color: Colors.textTertiary,
        textTransform: 'uppercase',
    },
    detectedValue: {
        fontSize: '13px',
        color: Colors.textSecondary,
        fontStyle: 'italic',
    },
    inputWrapper: {
        width: '100%',
    },
    input: {
        width: '100%',
        background: Colors.surface,
        border: `1px solid ${Colors.border}`,
        borderRadius: '12px',
        padding: '12px 16px',
        color: Colors.text,
        fontSize: '14px',
        outline: 'none',
        transition: 'border-color 0.2s ease',
    },
    footer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    optionsGrid: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginTop: '4px',
    },
    optionBtn: {
        padding: '8px 16px',
        borderRadius: '12px',
        border: '1px solid',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    }
};

