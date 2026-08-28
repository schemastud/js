import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

/**
 * Derive Tailwind's `@source` list for family packages instead of hand-maintaining it.
 *
 * ⚠️ NODE-ONLY. Reached via the `@schemastud/seam/vite` subpath and never from the package root —
 * it imports `node:fs`, so pulling it into a browser bundle breaks the build. It lives in seam
 * because seam is the widest-installed family package (8 of the 10 roots that carry family deps AND
 * a Tailwind entry, measured 2026-08-27); no family package reaches all 10, and the two it misses
 * carry one and two family deps respectively.
 *
 * ## The defect this removes
 *
 * Tailwind v4 ignores symlinked `node_modules`, and family packages resolve as symlinks onto
 * workspace source (or, under pnpm, into `node_modules/.pnpm/`). A utility class used only inside a
 * package's built `dist` is therefore never generated: correct markup, absent classes, HTTP 200. No
 * PHP suite, JS suite, `tsc`, `beam:ux:compile` or doctor audit can see it.
 *
 * The hand-written fix is a literal `@source` per package. It works and it re-arms: one host was
 * repaired by hand and had drifted back to 8 globs against 28 resolving packages; 9 of 11 roots
 * carrying family symlinks were under-covered when this was written.
 *
 * ## Why the population is "resolved", not "imported"
 *
 * Measured: removing the `@source` globs for packages with zero direct imports took one host's
 * emitted classes 1,011 -> 962, and the lost classes include `lg:grid-cols-[1.35fr_1fr]`,
 * `md:grid-cols-[300px_1fr]` and `md:flex-none` — geometry, not polish. Transitive reach is real
 * (`@schemastud/nav` has no direct import at the flagship and is imported by `beam-ux/dist`), so
 * narrowing to what the host imports re-creates the defect. An extra glob costs unused utilities; a
 * missing one silently strips styling. Be inclusive.
 *
 * ## The two exclusions, both measured rather than guessed
 *
 * - **No `dist`** — nothing to scan. ⚠️ A package with live imports and no published `dist` is a
 *   KNOWN GAP this plugin cannot close; only publishing a `dist` can.
 * - **Realpath inside the host's own source** — a self-symlink (a package pointing at the host's own
 *   `ui/`) or a workspace-local package. Already covered by the host's own globs.
 */

const FAMILY_SCOPES = ['@splicewire', '@schemastud'] as const;

/** Resolved family `dist` directories for a host root, as node_modules paths (the proven form). */
export function familyDistSources(root: string): string[] {
    const modules = path.join(root, 'node_modules');
    const seen = new Set<string>();
    const sources: string[] = [];

    for (const scope of FAMILY_SCOPES) {
        const scopeDir = path.join(modules, scope);

        if (!fs.existsSync(scopeDir)) {
            continue;
        }

        for (const name of fs.readdirSync(scopeDir).sort()) {
            const pkg = path.join(scopeDir, name);
            const dist = path.join(pkg, 'dist');

            if (!fs.existsSync(dist)) {
                continue;
            }

            // A package whose real location is inside this host's OWN SOURCE is already covered by the
            // host's own globs — self-symlinks (`@splicewire/app-ui` → the host's `ui/`) and
            // workspace-local packages both land here.
            //
            // ⚠️ The test must exclude `node_modules` explicitly, and this is not a nicety. Under pnpm
            // every package realpaths to `<root>/node_modules/.pnpm/<name>@file+...+/node_modules/<name>`
            // — INSIDE the host root. A naive "is the realpath under root" test therefore excludes
            // EVERY package and the plugin emits nothing, silently, while the build still succeeds.
            // Measured here: 0 sources emitted, 864 classes against 1,011 expected, exit 0.
            const real = fs.realpathSync(pkg);
            const insideHost = real === root || real.startsWith(root + path.sep);
            const insideModules = real.split(path.sep).includes('node_modules');

            if (insideHost && !insideModules) {
                continue;
            }

            // Dedupe on the REAL dist path: two scope entries can resolve to one package.
            const realDist = fs.realpathSync(dist);

            if (seen.has(realDist)) {
                continue;
            }

            seen.add(realDist);
            sources.push(dist);
        }
    }

    return sources;
}

/**
 * Injects one `@source` per resolved family dist directly after the `@import 'tailwindcss'` line.
 *
 * `enforce: 'pre'` so the injection lands before `@tailwindcss/vite` reads the stylesheet. Whether
 * that ordering actually holds is the one unproven thing here and the whole point of the spike —
 * verify by emitted-class-count diff against a known-good baseline, NEVER by loading a page, since
 * the failure mode is a 200 that merely looks wrong.
 */
export function familySources(options: { root?: string } = {}): Plugin {
    let root = options.root ?? process.cwd();

    return {
        name: 'beam-family-sources',
        enforce: 'pre',

        configResolved(config) {
            root = options.root ?? config.root;
        },

        transform(code, id) {
            if (!id.includes('.css')) {
                return null;
            }

            const tailwindImport = /@import\s+['"]tailwindcss['"];/;

            if (!tailwindImport.test(code)) {
                return null;
            }

            const sources = familyDistSources(root);

            if (sources.length === 0) {
                return null;
            }

            const block = sources.map((dir) => `@source '${dir}';`).join('\n');

            return code.replace(tailwindImport, (match) => `${match}\n${block}`);
        },
    };
}
