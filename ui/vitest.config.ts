import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        // jsdom lacks AnimationEvent; React's onAnimationEnd needs it present at load (see the file).
        setupFiles: ['./tests/setup/animation-event.ts'],
    },
});
