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
      // Generates type declarations for the library entry point
      include: ['src/**/*.ts', 'src/**/*.vue'],
      exclude: ['src/main.ts', 'src/App.vue'],
      insertTypesEntry: true,
      rollupTypes: true,
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    // ES-only library build — no UMD
    lib: {
      entry:    path.resolve(__dirname, 'src/index.ts'),
      name:     'AlihtAcademyHub',
      fileName: () => 'aliht-academy-hub.es.js',
      formats:  ['es'],
    },
    rollupOptions: {
      // Peer deps must be externalized so they're not bundled
      external: ['vue', 'pinia', 'vue-router', 'lucide-vue-next', '@vueuse/core'],
      output: {
        // Preserve CSS as a separate file (style.css)
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'style.css'
          return assetInfo.name ?? 'asset'
        },
      },
    },
    // Minify for smaller bundle
    minify: 'esbuild',
    // Generate sourcemaps for easier debugging in consuming apps
    sourcemap: true,
  },
  server: {
    host: '::',
    port: 8080,
  },
})
