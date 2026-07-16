import mdx from '@mdx-js/rollup';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import type { PluggableList } from 'unified';
import type { Plugin } from 'vite';

export interface BeamMdxPresetOptions {
    /** Extra remark plugins to run after the frontmatter pair. */
    remarkPlugins?: PluggableList;
}

/**
 * The MDX compile step for the content plane, previously inlined per-satellite in
 * `vite.config.ts`. MDX must compile *before* `@vitejs/plugin-react` sees the file, so it
 * runs in the `pre` slot. `remark-mdx-frontmatter` surfaces each file's YAML as a
 * `frontmatter` named export (title, layout, …) the content resolver reads.
 *
 * Returns a single Vite plugin — spread it into the `plugins` array ahead of `react()`.
 */
export function beamMdxPreset(options: BeamMdxPresetOptions = {}): Plugin {
    return {
        enforce: 'pre',
        ...mdx({
            remarkPlugins: [
                remarkFrontmatter,
                remarkMdxFrontmatter,
                ...(options.remarkPlugins ?? []),
            ],
        }),
    } as Plugin;
}
