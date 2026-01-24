// =====================================================
// GymBro PWA - Edit Weekly Schedule
// =====================================================

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useUserStore } from '@/stores/userStore';
import Colors from '@/styles/colors';
import { Check, ChevronLeft } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const SchedulePage: React.FC = () => {
    const navigate = useNavigate();
    const { perfil, setHorario } = useUserStore();
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

    const handleSave = () => {
        setHorario({ dias });
        navigate('/profile');
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button onClick={() => navigate('/profile')} style={styles.backBtn}>
                    <ChevronLeft size={24} />
                </button>
                <h1 style={styles.title}>Editar Horario</h1>
            </div>

            <p style={styles.description}>
                Marca los días que tienes disponibles para entrenar. Esto afectará las sugerencias del Coach IA y lo que verás en el constructor de rutinas.
            </p>

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
                            {dia.dia}
                        </span>
                        <div style={{ flex: 1 }} />
                        {dia.entrena ? (
                            <div style={styles.checkCircle}>
                                <Check size={14} color="#000" />
                            </div>
                        ) : (
                            <span style={styles.restLabel}>Descanso</span>
                        )}
                    </Card>
                ))}
            </div>

            <div style={styles.summary}>
                <p style={styles.summaryText}>
                    Disponibilidad: <strong>{dias.filter(d => d.entrena).length} días</strong> por semana
                </p>
            </div>

            <div style={styles.footer}>
                <Button onClick={handleSave} fullWidth size="lg">
                    Guardar Cambios <Check size={20} />
                </Button>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        padding: '20px',
        paddingBottom: '40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '10px',
    },
    backBtn: {
        background: 'none',
        border: 'none',
        color: Colors.text,
        cursor: 'pointer',
        padding: 0,
        display: 'flex',
        alignItems: 'center',
    },
    title: {
        fontSize: '22px',
        fontWeight: 800,
        color: Colors.text,
        margin: 0,
    },
    description: {
        fontSize: '14px',
        color: Colors.textSecondary,
        lineHeight: 1.5,
        margin: 0,
    },
    daysGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    dayCard: {
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        borderRadius: '20px',
    },
    dayName: {
        fontSize: '16px',
        fontWeight: 700,
    },
    restLabel: {
        fontSize: '12px',
        color: Colors.textTertiary,
        fontWeight: 600,
    },
    checkCircle: {
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        background: Colors.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    summary: {
        textAlign: 'center',
        padding: '16px',
        background: Colors.surface,
        borderRadius: '16px',
        marginTop: '10px',
    },
    summaryText: {
        fontSize: '14px',
        color: Colors.textSecondary,
        margin: 0,
    },
    footer: {
        marginTop: '10px',
    },
};

export default SchedulePage;
