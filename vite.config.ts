import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest.json';

export default defineConfig({
    plugins: [
        svelte(),
        crx({ manifest }),
    ],
    build: {
        minify: false,
        sourcemap: true,
        rollupOptions: {
            input: {
                popup: 'src/popup/index.html',
                tabs: 'src/tabs/index.html',
                workspace: 'src/workspace/index.html'
            }
        }
    }
});
