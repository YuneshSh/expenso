import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function crxBuildPlugin(): Plugin {
  return {
    name: 'crx-build',
    enforce: 'post',
    generateBundle(_, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (fileName.endsWith('.html') && chunk.type === 'asset') {
          chunk.source = (chunk.source as string)
            .replace(/ type="module"/g, '')
            .replace(/ crossorigin/g, '');
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), crxBuildPlugin()],
  base: './',
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    target: 'es2015',
    modulePreload: false,
    cssCodeSplit: false,
    rollupOptions: {
      input: 'index.html',
      output: {
        format: 'iife',
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
        inlineDynamicImports: true,
      },
    },
  },
});
