import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// O site fica em https://<usuario>.github.io/monitor-passagens/
export default defineConfig({
  base: '/monitor-passagens/',
  plugins: [react(), tailwindcss()],
});
