import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    define: {
        global: 'window',
        'process.env': {},
    },
    server: {
        port: 5173,
        proxy: {
            '/auth': 'http://localhost:5000',
        }
    }
})
