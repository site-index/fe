import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
    server: {
        host: '::',
        port: 8080,
        hmr: {
            overlay: false,
        },
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:3000',
                changeOrigin: true,
                rewrite: (p) => p.replace(/^\/api/, ''),
            },
        },
    },
    plugins: [
        tailwindcss(),
        react(),
        VitePWA({
            registerType: 'prompt',
            injectRegister: false,
            includeAssets: [
                'logo.svg',
                'robots.txt',
                'pwa-192.png',
                'pwa-512.png',
                'apple-touch-icon.png',
                'pwa-icon.svg',
            ],
            manifest: {
                name: 'SITE INDEX',
                short_name: 'SITE INDEX',
                description:
                    'SITE INDEX — construction project dashboard and metrics.',
                theme_color: '#09090b',
                background_color: '#09090b',
                display: 'standalone',
                start_url: '/',
                scope: '/',
                icons: [
                    {
                        src: '/pwa-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: '/pwa-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: '/pwa-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                navigateFallback: '/index.html',
                clientsClaim: true,
            },
            devOptions: {
                enabled: false,
            },
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
        dedupe: [
            'react',
            'react-dom',
            'react/jsx-runtime',
            'react/jsx-dev-runtime',
        ],
    },
})
