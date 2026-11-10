import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// Tailwind styles the kit's default @schemastud/ui primitives; `src/style.css` names their sources.
export default defineConfig({
    plugins: [tailwindcss()],
});
