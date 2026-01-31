// =====================================================
// GymBro PWA - Simple Loading Placeholder
// =====================================================

import React from 'react';

const Loader: React.FC = () => {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            fontSize: '1.5rem',
            color: '#fff',
            backgroundColor: '#1a1a1a'
        }}>
            Cargando...
        </div>
    );
};

export default Loader;
