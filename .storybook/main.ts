import type { StorybookConfig } from '@storybook/react-vite';
import tailwindcss from '@tailwindcss/vite';

/**
 * The @schemastud per-repo Storybook — the "foundation" catalog of the composition
 * architecture (component-seams map, ticket 04 as amended by ticket 08's composition pivot).
 *
 * This is ONE of several per-repo Storybooks (beam/, splicewire/splice/ get their own); a
 * project-neutral portal at ~/Workspaces/storybook composes them via `refs`. This config
 * catalogues only THIS repo's workspaces.
 *
 * Stories are COLOCATED (`*.stories.tsx` beside each component) and aggregated across every
 * schemastud workspace by the glob below (`../ui/src`, `../frame/src`, `../seam/src`, …).
 */
const config: StorybookConfig = {
    stories: ['../*/src/**/*.stories.@(ts|tsx|mdx)'],
    addons: [],
    framework: {
        name: '@storybook/react-vite',
        options: {},
    },
    viteFinal: async (cfg) => {
        cfg.plugins ??= [];
        // Tailwind v4 — the packages are headless (tsup libs, no CSS pipeline); the workbench
        // supplies the Tailwind + token layer so `bg-primary` etc. render skinned. Per-package
        // self-contained token defaults (ticket 07's aspiration) can graduate later.
        cfg.plugins.push(tailwindcss());
        // Dedupe React so any cross-package story binds a single React instance (belt-and-braces;
        // within one repo the workspace already hoists a single copy).
        cfg.resolve ??= {};
        cfg.resolve.dedupe = [...(cfg.resolve.dedupe ?? []), 'react', 'react-dom'];
        return cfg;
    },
};

export default config;
