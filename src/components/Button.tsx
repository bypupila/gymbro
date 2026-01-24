// =====================================================
// GymBro PWA - Button Component
// =====================================================

import Colors from '@/styles/colors';
import React from 'react';

interface ButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    fullWidth?: boolean;
    style?: React.CSSProperties;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    onClick,
    variant = 'primary',
    size = 'md',
    disabled = false,
    fullWidth = false,
    style,
}) => {
    const baseStyles: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        borderRadius: size === 'lg' ? '20px' : '16px',
        fontWeight: 700,
        transition: 'all 0.2s ease',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        width: fullWidth ? '100%' : 'auto',
    };

    const sizeStyles: Record<string, React.CSSProperties> = {
        sm: { padding: '10px 16px', fontSize: '13px' },
        md: { padding: '14px 24px', fontSize: '15px' },
        lg: { padding: '18px 32px', fontSize: '17px' },
    };

    const variantStyles: Record<string, React.CSSProperties> = {
        primary: {
            background: Colors.gradientPrimary,
            color: '#000',
        },
        secondary: {
            background: Colors.surface,
            color: Colors.text,
            border: `1px solid ${Colors.border}`,
        },
        ghost: {
            background: 'transparent',
            color: Colors.primary,
        },
        danger: {
            background: Colors.error,
            color: '#FFF',
        },
    };

    return (
        <button
            onClick={disabled ? undefined : onClick}
            style={{
                ...baseStyles,
                ...sizeStyles[size],
                ...variantStyles[variant],
                ...style,
            }}
        >
            {children}
        </button>
    );
};

export default Button;
