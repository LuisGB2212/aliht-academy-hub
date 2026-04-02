import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    vue(), 
    tailwindcss(),
    dts({
      insertTypesEntry: true,
    })
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'AlihtAcademyHub',
      fileName: (format) => `aliht-academy-hub.${format}.js`,
      formats: ['es'],
    },
    rollupOptions: {
      external: ['vue', 'pinia', 'vue-router', 'lucide-vue-next']
    },
  },
  server: {
    host: '::',
    port: 8080,
  },
})
