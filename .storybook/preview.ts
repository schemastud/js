import type { Preview } from '@storybook/react-vite';
import './preview.css';

/**
 * Ambient treatment axes (component-seams ticket 13 → treatment-axes.md §2a) are wired
 * ONCE here as the environment every story inherits — not per-story args:
 *
 *  - token      : the seeded `--splice-*` → semantic → Tailwind layer in preview.css.
 *  - colorScheme: light AND dark, both required now (owner call, ticket 13). The toolbar
 *                 below toggles the `.dark` class on the preview root; the dark seed in
 *                 preview.css re-skins everything. A story author never fights this — they
 *                 flip the toolbar to spot-check dark, and VR baselines cover both schemes.
 */
const preview: Preview = {
    parameters: {
        layout: 'centered',
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
    },
    globalTypes: {
        colorScheme: {
            description: 'Ambient color scheme — light AND dark are both required axes (ticket 13)',
            defaultValue: 'light',
            toolbar: {
                title: 'Scheme',
                icon: 'contrast',
                items: [
                    { value: 'light', title: 'Light', icon: 'sun' },
                    { value: 'dark', title: 'Dark', icon: 'moon' },
                ],
                dynamicTitle: true,
            },
        },
    },
    decorators: [
        (Story, context) => {
            const dark = context.globals.colorScheme === 'dark';
            if (typeof document !== 'undefined') {
                document.documentElement.classList.toggle('dark', dark);
                // Keep the preview gutter (the frame around a `centered` story) in step with
                // the scheme so the story never floats on a light frame while dark.
                document.body.style.background = 'var(--background)';
                document.body.style.color = 'var(--foreground)';
            }
            return Story();
        },
    ],
};

export default preview;
