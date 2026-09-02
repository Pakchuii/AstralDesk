import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'
import fs from 'fs'

export default defineConfig({
  plugins: [
    vue(),
    electron([
      {
        entry: 'electron/main.ts',
        onstart(options) {
          options.startup();
        }
      },
    ]),
    renderer(),
    {
      name: 'copy-preload-cjs',
      closeBundle() {
        if (!fs.existsSync('dist-electron')) {
          fs.mkdirSync('dist-electron', { recursive: true });
        }
        fs.copyFileSync('electron/preload.cjs', 'dist-electron/preload.cjs');
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})
