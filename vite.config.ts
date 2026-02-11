import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg'],
            manifest: {
                name: 'GymBro - Tu Coach de Fitness IA',
                short_name: 'GymBro',
                description: 'Entrena con IA, trackea tu progreso, alcanza tus metas',
                theme_color: '#00E699',
                background_color: '#0A0A0B',
                display: 'standalone',
                orientation: 'portrait',
                icons: [
                    {
                        src: 'favicon.svg',
                        sizes: 'any',
                        type: 'image/svg+xml'
                    }
                ]
            }
        })
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    server: {
        port: 3000,
        host: true
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules')) {
                        return undefined;
                    }

                    if (id.includes('@google/generative-ai')) {
                        return 'vendor-gemini';
                    }
                    if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                        return 'vendor-react';
                    }
                    if (id.includes('@firebase/firestore') || id.includes('firebase/firestore')) {
                        return 'vendor-firebase-firestore';
                    }
                    if (id.includes('@firebase/auth') || id.includes('firebase/auth')) {
                        return 'vendor-firebase-auth';
                    }
                    if (id.includes('@firebase/messaging') || id.includes('firebase/messaging')) {
                        return 'vendor-firebase-messaging';
                    }
                    if (id.includes('firebase')) {
                        return 'vendor-firebase-core';
                    }

                    return undefined;
                }
            }
        }
    }
})
