import React, { Component, ReactNode } from 'react';

// A local error boundary so if a component fails to render due to missing props,
// it doesn't break the whole gallery page.
class GalleryErrorBoundary extends Component<{ children: ReactNode; name: string }, { hasError: boolean; error: Error | null }> {
    state = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error) {
        console.warn(`Gallery: Component ${this.props.name} crashed because it likely needs specific props to render. Error:`, error);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '16px', background: 'rgba(255,50,50,0.1)', color: '#ff6b6b', borderRadius: '8px', fontSize: '12px' }}>
                    <p>⚠️ <strong>{this.props.name}</strong> requiere datos/props para poder visualizarse acá.</p>
                    <pre style={{ overflow: 'auto', maxHeight: '100px', margin: 0 }}>{String(this.state.error)}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}

// Vite magic to load all components from the folder.
const componentModules = import.meta.glob('../components/*.tsx', { eager: true });

export const ComponentGalleryPage: React.FC = () => {
    return (
        <div style={{
            padding: '40px 20px',
            maxWidth: '900px',
            margin: '0 auto',
            minHeight: '100vh',
            color: '#fff',
            fontFamily: 'Inter, system-ui, sans-serif'
        }}>
            <h1 style={{ marginBottom: '8px', fontSize: '32px', fontWeight: 'bold' }}>Galería de Componentes</h1>
            <p style={{ color: '#aaa', marginBottom: '40px' }}>
                Este es un catálogo visual automático de los componentes encontrados en <code>src/components</code>.
                Algunos componentes complejos quizás muestren error porque necesitan datos reales (rutinas, usuarios, etc.) para dibujar su interfaz.
            </p>

            <div style={{ display: 'grid', gap: '32px' }}>
                {Object.entries(componentModules).map(([path, module]: [string, any]) => {
                    const componentName = path.split('/').pop()?.replace('.tsx', '') || 'Unknown';

                    // Módulo puede exportar default o un named export. 
                    // Intentamos encontrar algo que parezca un componente de React.
                    const ComponentToRender = module.default || module[componentName] || (Object.values(module)[0] as any);

                    // Skip the App components or Error Boundaries that might be tricky
                    if (!ComponentToRender || typeof ComponentToRender !== 'function' || componentName === 'ErrorBoundary') return null;

                    return (
                        <div key={componentName} style={{
                            background: '#1a1a1a',
                            border: '1px solid #333',
                            borderRadius: '16px',
                            overflow: 'hidden'
                        }}>
                            {/* Component Header info */}
                            <div style={{ padding: '12px 20px', background: '#252525', borderBottom: '1px solid #333', fontSize: '14px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{componentName}</span>
                                <span style={{ fontSize: '11px', color: '#888', fontWeight: 'normal' }}>{path}</span>
                            </div>

                            {/* Component Canvas (aislado con transform Z y max height para modales) */}
                            <div style={{
                                padding: '24px',
                                position: 'relative',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                minHeight: '100px',
                                maxHeight: '600px',
                                overflow: 'auto',
                                background: '#0a0a0a',
                                transform: 'translateZ(0)', // Hace de "containing block" para elementos con position: fixed
                                width: '100%'
                            }}>
                                <GalleryErrorBoundary name={componentName}>
                                    <ComponentToRender />
                                </GalleryErrorBoundary>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div style={{ marginTop: '40px', textAlign: 'center' }}>
                <button onClick={() => window.history.back()} style={{ padding: '10px 20px', background: '#333', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                    Volver atrás
                </button>
            </div>
        </div>
    );
};

export default ComponentGalleryPage;
