
import React, { useState } from 'react';
import { Card } from './Card';
import Colors from '@/styles/colors';
import { X, Battery, BatteryCharging, Smile, Frown, Meh } from 'lucide-react';
import { MoodLog } from '@/stores/userStore';

interface MoodCheckinProps {
    onComplete: (data: MoodLog) => void;
    onCancel: () => void;
    type: 'pre' | 'post';
}

export const MoodCheckin: React.FC<MoodCheckinProps> = ({ onComplete, onCancel, type }) => {
    const [mood, setMood] = useState<number>(3);
    const [energy, setEnergy] = useState<number>(3);
    const [note, setNote] = useState<string>('');

    const MOOD_EMOJIS = ['😫', '😕', '😐', '🙂', '🤩'];
    const MOOD_LABELS = ['Terrible', 'Mal', 'Normal', 'Bien', 'Excelente'];

    // Energy levels: 1=Low, 5=High
    const ENERGY_LABELS = ['Agotado', 'Baja', 'Normal', 'Alta', 'A tope'];

    const styles: Record<string, React.CSSProperties> = {
        overlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px',
        },
        card: {
            width: '100%',
            maxWidth: '400px',
            background: Colors.surface,
            borderRadius: '24px',
            padding: '28px',
            maxHeight: '90vh',
            overflowY: 'auto',
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
        },
        title: {
            fontSize: '22px',
            fontWeight: 800,
            color: Colors.text,
            margin: 0,
            textAlign: 'center',
            flex: 1,
        },
        closeBtn: {
            background: 'none',
            border: 'none',
            color: Colors.textSecondary,
            cursor: 'pointer',
            padding: '4px',
        },
        section: {
            marginBottom: '32px',
        },
        sectionTitle: {
            fontSize: '16px',
            fontWeight: 700,
            color: Colors.textSecondary,
            marginBottom: '16px',
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '1px',
        },
        row: {
            display: 'flex',
            justifyContent: 'space-between',
            gap: '8px',
        },
        optionBtn: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '12px',
            transition: 'all 0.2s',
        },
        emoji: {
            fontSize: '32px',
            filter: 'grayscale(100%)',
            transition: 'all 0.2s',
        },
        activeEmoji: {
            filter: 'grayscale(0%)',
            transform: 'scale(1.2)',
        },
        label: {
            fontSize: '11px',
            color: Colors.textTertiary,
            fontWeight: 600,
        },
        activeLabel: {
            color: Colors.primary,
        },
        batteryContainer: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            marginTop: '12px',
        },
        batterySegment: {
            width: '16%',
            height: '40px',
            borderRadius: '8px',
            background: Colors.surfaceLight,
            cursor: 'pointer',
            transition: 'all 0.2s',
            border: `1px solid ${Colors.border}`,
        },
        noteInput: {
            width: '100%',
            padding: '16px',
            background: Colors.surfaceLight,
            border: `1px solid ${Colors.border}`,
            borderRadius: '16px',
            color: Colors.text,
            fontSize: '15px',
            fontFamily: 'inherit',
            resize: 'none',
            minHeight: '80px',
        },
        submitBtn: {
            width: '100%',
            padding: '16px',
            background: Colors.primary,
            color: '#000',
            border: 'none',
            borderRadius: '16px',
            fontSize: '16px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: `0 4px 20px ${Colors.primary}40`,
        },
    };

    const getBatteryColor = (level: number) => {
        if (level <= 1) return Colors.error;
        if (level <= 2) return Colors.warning;
        if (level <= 3) return '#FFCC00'; // Yellow
        return Colors.success;
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <div style={{ width: 24 }} /> {/* Spacer */}
                    <h2 style={styles.title}>
                        {type === 'pre' ? '¿Cómo te sientes hoy?' : 'Resumen post-entreno'}
                    </h2>
                    <button style={styles.closeBtn} onClick={onCancel}>
                        <X size={24} />
                    </button>
                </div>

                {/* Mood Section */}
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Estado de Ánimo</h3>
                    <div style={styles.row}>
                        {MOOD_EMOJIS.map((emoji, idx) => {
                            const val = idx + 1;
                            const isActive = mood === val;
                            return (
                                <button
                                    key={val}
                                    style={{
                                        ...styles.optionBtn,
                                        background: isActive ? `${Colors.primary}10` : 'transparent',
                                    }}
                                    onClick={() => setMood(val)}
                                >
                                    <span style={{
                                        ...styles.emoji,
                                        ...(isActive ? styles.activeEmoji : {})
                                    }}>{emoji}</span>
                                    <span style={{
                                        ...styles.label,
                                        ...(isActive ? styles.activeLabel : {})
                                    }}>{MOOD_LABELS[idx]}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Energy Section */}
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Nivel de Energía: {ENERGY_LABELS[energy - 1]}</h3>
                    <div style={{ ...styles.row, height: '60px', alignItems: 'flex-end', justifyContent: 'center', gap: '8px' }}>
                        {[1, 2, 3, 4, 5].map((val) => {
                            const isActive = energy >= val;
                            const isSelected = energy === val;
                            return (
                                <button
                                    key={val}
                                    style={{
                                        ...styles.batterySegment,
                                        height: `${30 + (val * 10)}%`, // Progressive height
                                        background: isActive ? getBatteryColor(energy) : Colors.surfaceLight,
                                        opacity: isActive ? 1 : 0.3,
                                        borderColor: isActive ? getBatteryColor(energy) : Colors.border,
                                        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                    }}
                                    onClick={() => setEnergy(val)}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Note Section */}
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Notas (Opcional)</h3>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={type === 'pre' ? "Alguna molestia o comentario..." : "Cómo sentiste el entrenamiento..."}
                        style={styles.noteInput}
                    />
                </div>

                <button
                    style={styles.submitBtn}
                    onClick={() => onComplete({ mood, energy, note })}
                >
                    {type === 'pre' ? 'Comenzar Entrenamiento' : 'Finalizar Entrenamiento'}
                </button>
            </div>
        </div>
    );
};
