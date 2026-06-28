import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function crxBuildPlugin(): Plugin {
  return {
    name: 'crx-build',
    enforce: 'post',
    generateBundle(_, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (fileName.endsWith('.html') && chunk.type === 'asset') {
          let html = chunk.source as string;
          html = html.replace(/ type="module"/g, '');
          html = html.replace(/ crossorigin/g, '');
          // Move script tags to end of body so DOM is ready
          const scripts: string[] = [];
          html = html.replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, (match) => {
            scripts.push(match);
            return '';
          });
          if (scripts.length > 0) {
            html = html.replace('</body>', scripts.join('\n') + '\n</body>');
          }
          chunk.source = html;
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
