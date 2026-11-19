import { Plugin } from 'vite';

/** Resolved family `dist` directories for a host root, as node_modules paths (the proven form). */
declare function familyDistSources(root: string): string[];
/**
 * The `@source` block for one family dist: the directory, minus the files that cannot render.
 *
 * A bare `@source '<dist>'` makes Tailwind scan `.d.ts` and `.js.map` too. Neither is runtime code,
 * and a docblock is prose — the flagship's docs stylesheet carried `[&>*]:mx-auto`, `[&>*]:max-w-3xl`,
 * `[&>*]:px-6`, `pb-16` and `pt-12` generated from `beam-ux/dist/docs.d.ts:147`, the comment recording
 * the migration AWAY from those utilities (beam-docs-satellite 63). Advisory-cost only — it emits
 * unused rules and strips nothing — but it is the wrong instrument reading, and it grows with every
 * docblock that names a utility.
 *
 * ⚠️ The exclusion is spelled with `@source not`, NOT as a positive glob, and the reason is measured:
 * `@source '<dist>/**\/*.js'` is silently IGNORED when `<dist>` sits under the host's own gitignored
 * `node_modules` — which is every host this plugin serves. Tailwind un-ignores an explicitly named
 * source inside an ignored directory by admitting the whole directory, and the glob tail never
 * reaches the walker: at the flagship `**\/*.js`, `**\/*.d.ts`, `**\/*.map` and a `**\/*.nothing` that
 * matches no file all produced the byte-identical stylesheet as the bare directory (2026-09-02,
 * Tailwind 4.3.2). The same globs work in an isolated root whose sources live OUTSIDE it, which is
 * exactly the environment a plugin author would test in. `@source not` is honoured in both, and at the
 * flagship removed precisely the five docblock classes and nothing else (+208 / −0 against control).
 */
declare function familySourceBlock(dist: string): string;
/**
 * Injects one `@source` block per resolved family dist directly after the `@import 'tailwindcss'`
 * line — see {@link familySourceBlock} for the block's shape and why it is spelled with `not`.
 *
 * `enforce: 'pre'` so the injection lands before `@tailwindcss/vite` reads the stylesheet. Whether
 * that ordering actually holds is the one unproven thing here and the whole point of the spike —
 * verify by emitted-class-count diff against a known-good baseline, NEVER by loading a page, since
 * the failure mode is a 200 that merely looks wrong.
 */
declare function familySources(options?: {
    root?: string;
}): Plugin;

export { familyDistSources, familySourceBlock, familySources };
