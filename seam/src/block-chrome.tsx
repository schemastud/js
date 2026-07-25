import type { CSSProperties } from 'react';
import type { SkinContext, SkinNode } from './types';

// The built-in fallback skin. When a node-type has no registered skin, the
// registry resolves to this: a striped "resting card" that names the node-type,
// hints "Edit via the inspector →", and emits one **field anchor** per attribute
// (`data-attr="…"`) so the shell/inspector can target individual fields. It is
// itself a skin — no frame context, no PM knowledge, no inline form.

const CARD_STYLE: CSSProperties = {
    position: 'relative',
    border: '1px solid var(--stud-line-strong)',
    borderRadius: 6,
    padding: '10px 12px',
    // The "striped" resting look that reads as un-skinned.
    backgroundImage:
        'repeating-linear-gradient(45deg, var(--stud-surface-subtle), var(--stud-surface-subtle) 8px, var(--stud-surface-muted) 8px, var(--stud-surface-muted) 16px)',
    color: 'var(--stud-ink)',
    fontSize: 13,
};

const HEADER_STYLE: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
    fontWeight: 600,
};

const HINT_STYLE: CSSProperties = { fontWeight: 400, fontSize: 12, color: 'var(--stud-accent)' };

const ANCHOR_STYLE: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    padding: '3px 0',
    borderTop: '1px dashed var(--stud-line)',
};

const KEY_STYLE: CSSProperties = { color: 'var(--stud-ink-muted)' };

// The attribute keys to anchor: the node-type's attrsSchema properties when
// present (so declared-but-empty attrs still get an anchor), else the keys
// actually present on the node.
function attrKeys(node: SkinNode, ctx?: SkinContext): string[] {
    const schema = ctx?.attrsSchema;
    const properties = schema?.properties;

    if (properties && typeof properties === 'object') {
        return Object.keys(properties as Record<string, unknown>);
    }

    return node.attrs ? Object.keys(node.attrs) : [];
}

function formatValue(value: unknown): string {
    if (value === undefined || value === null || value === '') {
        return '—';
    }

    return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

export function BlockChromeFallback(node: SkinNode, ctx?: SkinContext) {
    const attrs = node.attrs ?? {};

    return (
        <div data-blockdoc-skin="block-chrome" data-node-type={node.type} style={CARD_STYLE}>
            <div style={HEADER_STYLE}>
                <span>{node.type}</span>
                <span style={HINT_STYLE}>Edit via the inspector →</span>
            </div>
            {attrKeys(node, ctx).map((key) => (
                <div key={key} data-attr={key} style={ANCHOR_STYLE}>
                    <span style={KEY_STYLE}>{key}</span>
                    <span>{formatValue(attrs[key])}</span>
                </div>
            ))}
        </div>
    );
}
