/**
 * EP-07c read-compat: normalize a stored document's pre-07c base-prose node names to
 * their post-07c JSX-tag names (ADR-0228 d6) on load, so the editor — whose schema
 * only knows the new names — can render a document saved before EP-07c B's data
 * migration has run. Editing then writes the new names back (the editor's schema emits
 * them), so a save migrates the document on write, consistent with B.
 *
 * This table is the byte-identical mirror of laravel-blockdoc's `LegacyProseNodes`
 * (PHP) and EP-07c B's migration; see that class for the canonical description. The
 * whole read-compat path is removed once every host has migrated (tracked in ticket 00).
 */

/** Pre-07c name → post-07c name, for the level-independent prose nodes. */
export const LEGACY_PROSE_RENAME: Readonly<Record<string, string>> = {
    paragraph: 'p',
    bullet_list: 'ul',
    ordered_list: 'ol',
    list_item: 'li',
    code_block: 'pre',
    horizontal_rule: 'hr',
    hard_break: 'br',
};

/**
 * EP-07c part C: pre-07c composition COMPONENT node names → their post-07c PascalCase JSX
 * tags (a component's JSX tag is its #[NodeType] name, from Tower's Block classes). A
 * separate set from the prose rename so part B is unchanged; the normalizer applies both.
 * Mirrors laravel-satellite-composition's `SlotNodeRename::COMPONENT_RENAME` byte-for-byte.
 */
export const LEGACY_COMPONENT_RENAME: Readonly<Record<string, string>> = {
    content_section: 'ContentSection',
    content_outline: 'ContentOutline',
    content_article: 'ContentArticle',
    script_screenplay: 'ScriptScreenplay',
    script_scene: 'ScriptScene',
    script_outline: 'ScriptOutline',
};

/**
 * A pre-07c `heading` carried its level as an attr; post-07c the level IS the tag,
 * clamped to h2..h6 (h2 floor — the page title owns the one h1 — default 3), matching
 * the PHP serializer and B's migration exactly.
 */
export function legacyHeadingTag(level: unknown): string {
    const n = typeof level === 'number' && Number.isFinite(level) ? level : 3;

    return `h${Math.max(2, Math.min(6, Math.trunc(n)))}`;
}

/**
 * Deep-normalize a stored document (or any node subtree) so every pre-07c prose node
 * name becomes its post-07c tag. Pure: returns a new tree, leaving the input untouched.
 * A `heading` becomes h2..h6 by its level and drops the now-meaningless `level` attr;
 * an unknown name (a current name, or a typed component) passes through unchanged.
 */
export function normalizeLegacyNodeNames<T>(doc: T): T {
    return visit(doc) as T;
}

function visit(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(visit);
    }

    if (value === null || typeof value !== 'object') {
        return value;
    }

    const node = value as Record<string, unknown>;
    const out: Record<string, unknown> = { ...node };
    const type = node.type;

    if (typeof type === 'string') {
        if (type === 'heading') {
            const attrs = typeof node.attrs === 'object' && node.attrs !== null ? (node.attrs as Record<string, unknown>) : {};
            out.type = legacyHeadingTag(attrs.level);

            if ('level' in attrs) {
                const { level: _level, ...rest } = attrs;
                out.attrs = rest;
            }
        } else if (type in LEGACY_PROSE_RENAME) {
            out.type = LEGACY_PROSE_RENAME[type];
        } else if (type in LEGACY_COMPONENT_RENAME) {
            out.type = LEGACY_COMPONENT_RENAME[type];
        }
    }

    if (Array.isArray(node.content)) {
        out.content = node.content.map(visit);
    }

    return out;
}
