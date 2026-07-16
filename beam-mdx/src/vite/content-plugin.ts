import fs from 'node:fs';
import path from 'node:path';

import type { Plugin } from 'vite';

/**
 * beam-mdx — build-time draft exclusion for the file-driven MDX content plane.
 *
 * The content resolver imports a virtual module (`virtual:beam-mdx/content`) instead of
 * calling `import.meta.glob` directly. That indirection is the whole point:
 * `import.meta.glob` is a compile-time macro that eagerly pulls *every* matching file into
 * the module graph, so a runtime `import.meta.env.PROD` guard still ships draft prose in the
 * bundle. This plugin generates the module map itself, parsing each file's frontmatter and
 * **omitting drafts** unless the current environment is allowlisted — so a draft's content
 * and even its slug never reach a production build.
 *
 * Draft signal (locked convention): a file under a *dated* content type (configured via
 * `draftablePrefixes`, e.g. `essays/`, `broadcasts/`) is a draft when it carries no
 * `datePublished`, or when `draft: true` is set. Files outside those prefixes (root pages
 * like about, resume) are never dated and are always included.
 */

const VIRTUAL_ID = 'virtual:beam-mdx/content';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

export interface BeamMdxContentOptions {
    /** Absolute path to the content root (e.g. resources/js/content). */
    contentDir: string;
    /**
     * Content-name prefixes whose files are gated by a published date. Anything outside
     * these (the root pages) is always bundled. Defaults to `['essays/', 'broadcasts/']`.
     */
    draftablePrefixes?: string[];
    /** Env names permitted to see drafts (the comma-separated allowlist, already split). */
    previewEnvs?: string[];
    /** The resolved current environment (APP_ENV). */
    currentEnv?: string;
    /** Explicit override — the dev server passes true so local always previews. */
    includeDrafts?: boolean;
}

/** Minimal YAML-frontmatter reader: just the flat scalars the draft gate needs. */
function readFrontmatter(source: string): Record<string, string> {
    const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);

    if (!match) {
        return {};
    }

    const fields: Record<string, string> = {};

    for (const line of match[1].split(/\r?\n/)) {
        const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);

        if (!kv) {
            continue;
        }

        // Strip surrounding quotes; leave everything else as the raw scalar.
        fields[kv[1]] = kv[2].trim().replace(/^['"]|['"]$/g, '');
    }

    return fields;
}

// YAML-truthy forms an author might reasonably write for `draft:`. Normalized so the gate
// can't disagree with the frontmatter parser that actually renders the page.
const TRUTHY = new Set(['true', 'yes', '1']);

function isDraft(
    name: string,
    fm: Record<string, string>,
    draftablePrefixes: string[],
): boolean {
    if (TRUTHY.has(fm.draft?.toLowerCase() ?? '')) {
        return true;
    }

    if (!draftablePrefixes.some((prefix) => name.startsWith(prefix))) {
        return false;
    }

    return !fm.datePublished;
}

/** Recursively collect every `.mdx` under `dir`, returned as absolute paths. */
function collectMdx(dir: string): string[] {
    const out: string[] = [];

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const abs = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            out.push(...collectMdx(abs));
        } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
            out.push(abs);
        }
    }

    return out;
}

export function beamMdxContent(options: BeamMdxContentOptions): Plugin {
    const {
        contentDir,
        draftablePrefixes = ['essays/', 'broadcasts/'],
        previewEnvs = [],
        currentEnv,
        includeDrafts,
    } = options;
    const allowDrafts =
        includeDrafts ??
        (currentEnv ? previewEnvs.includes(currentEnv) : false);

    const nameOf = (abs: string): string =>
        path
            .relative(contentDir, abs)
            .replace(/\\/g, '/')
            .replace(/\.mdx$/, '');

    return {
        name: 'beam-mdx:content',

        resolveId(id) {
            if (id === VIRTUAL_ID) {
                return RESOLVED_ID;
            }

            return null;
        },

        load(id) {
            if (id !== RESOLVED_ID) {
                return null;
            }

            const included = collectMdx(contentDir)
                .map((abs) => ({ abs, name: nameOf(abs) }))
                .filter(({ abs, name }) => {
                    if (allowDrafts) {
                        return true;
                    }

                    return !isDraft(
                        name,
                        readFrontmatter(fs.readFileSync(abs, 'utf8')),
                        draftablePrefixes,
                    );
                })
                .sort((a, b) => a.name.localeCompare(b.name));

            const imports = included
                .map(
                    (entry, i) =>
                        `import * as m${i} from ${JSON.stringify(entry.abs)};`,
                )
                .join('\n');
            const map = included
                .map((entry, i) => `  ${JSON.stringify(entry.name)}: m${i},`)
                .join('\n');

            return `${imports}\n\nexport const MODULES = {\n${map}\n};\n`;
        },

        // Adding, removing, or retitling a content file changes the generated map, so
        // invalidate the virtual module when any file under the content root changes.
        handleHotUpdate({ file, server }) {
            if (!file.startsWith(contentDir)) {
                return;
            }

            const mod = server.moduleGraph.getModuleById(RESOLVED_ID);

            if (mod) {
                server.moduleGraph.invalidateModule(mod);
            }
        },
    };
}
