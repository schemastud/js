import { useBeamMdx } from '../context';

/**
 * Render an authored .mdx fragment by name, inline and bare — the fragment's own
 * frontmatter layout is ignored, so a shared block of prose can be dropped into any page,
 * layout, or MDX file. Resolves against the content map supplied through <BeamMdxProvider>.
 */
export function Content({ name }: { name: string }) {
    const { resolve } = useBeamMdx();
    const mod = resolve(name);

    if (!mod) {
        if (import.meta.env?.DEV) {
            // eslint-disable-next-line no-console
            console.warn(`<Content name="${name}"> — no such content file`);
        }
        return null;
    }

    const { Component } = mod;

    return <Component />;
}
