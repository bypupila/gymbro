import React from 'react';
import Colors from '@/styles/colors';

interface TimeInputProps {
    value: number | undefined;
    onChange: (totalSeconds: number | undefined) => void;
    label?: string;
    allowEmpty?: boolean;
}

export const TimeInput: React.FC<TimeInputProps> = ({ value, onChange, label, allowEmpty = false }) => {
    const totalSeconds = value || 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const handleChange = (h: number, m: number, s: number) => {
        const total = h * 3600 + m * 60 + s;
        if (allowEmpty && total === 0) {
            onChange(undefined);
        } else {
            onChange(total);
        }
    };

    return (
        <div>
            {label && <label style={styles.label}>{label}</label>}
            <div style={styles.row}>
                <div style={styles.fieldWrapper}>
                    <input
                        type="number"
                        min={0}
                        max={23}
                        value={hours || ''}
                        placeholder="0"
                        onChange={(e) => handleChange(Math.min(23, parseInt(e.target.value) || 0), minutes, seconds)}
                        onFocus={(e) => e.target.select()}
                        style={styles.input}
                    />
                    <span style={styles.unit}>h</span>
                </div>
                <div style={styles.fieldWrapper}>
                    <input
                        type="number"
                        min={0}
                        max={59}
                        value={minutes || ''}
                        placeholder="0"
                        onChange={(e) => handleChange(hours, Math.min(59, parseInt(e.target.value) || 0), seconds)}
                        onFocus={(e) => e.target.select()}
                        style={styles.input}
                    />
                    <span style={styles.unit}>m</span>
                </div>
                <div style={styles.fieldWrapper}>
                    <input
                        type="number"
                        min={0}
                        max={59}
                        value={seconds || ''}
                        placeholder="0"
                        onChange={(e) => handleChange(hours, minutes, Math.min(59, parseInt(e.target.value) || 0))}
                        onFocus={(e) => e.target.select()}
                        style={styles.input}
                    />
                    <span style={styles.unit}>s</span>
                </div>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    label: {
        display: 'block',
        fontSize: '11px',
        color: Colors.textTertiary,
        marginBottom: '4px',
    },
    row: {
        display: 'flex',
        gap: '4px',
        alignItems: 'center',
    },
    fieldWrapper: {
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        flex: 1,
    },
    input: {
        width: '100%',
        padding: '8px 4px',
        background: Colors.surface,
        border: `1px solid ${Colors.border}`,
        borderRadius: '6px',
        color: Colors.text,
        fontSize: '13px',
        textAlign: 'center' as const,
        outline: 'none',
    },
    unit: {
        fontSize: '10px',
        color: Colors.textTertiary,
        fontWeight: 700,
        minWidth: '10px',
    },
};
