import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

export default defineConfig({
  base: '/', // ✅ prevent asset path mismatch
  plugins: [
    nitro({
      serverDir: 'server',
    }),
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
  build: {
    // manifest: true, // ✅ REQUIRED for Nitro asset mapping
    // assetsDir: 'assets',
    // rollupOptions: {
    //   output: {
    //     entryFileNames: 'assets/[name]-[hash].js',
    //     chunkFileNames: 'assets/[name]-[hash].js',
    //     assetFileNames: (assetInfo) => {
    //       if (assetInfo.names?.includes('styles.css')) {
    //         return 'assets/styles[extname]'
    //       }
    //       return 'assets/[name]-[hash][extname]'
    //     },
    //   },
    // },
  },
})
