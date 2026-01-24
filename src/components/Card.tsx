// =====================================================
// GymBro PWA - Card Component
// =====================================================

import Colors from '@/styles/colors';
import React from 'react';

interface CardProps {
    children: React.ReactNode;
    onClick?: () => void;
    style?: React.CSSProperties;
    className?: string;
    gradient?: string;
}

export const Card: React.FC<CardProps> = ({
    children,
    onClick,
    style,
    className,
    gradient,
}) => {
    const baseStyles: React.CSSProperties = {
        background: gradient || Colors.surface,
        borderRadius: '24px',
        padding: '20px',
        border: `1px solid ${Colors.border}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    };

    return (
        <div
            onClick={onClick}
            className={className}
            style={{ ...baseStyles, ...style }}
            onMouseEnter={(e) => {
                if (onClick) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 10px 40px rgba(0, 230, 153, 0.1)';
                }
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            {children}
        </div>
    );
};

export default Card;
