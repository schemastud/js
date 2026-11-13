import { useFrameMessages } from './messages';
import { useRef, type CSSProperties } from 'react';
import { useEditShellMount } from './EditShellMount';

// ED-14 — the bottom conformance readout, faithful to the mock and interactive.
// All data is published by the editor on the mount's conformance channel:
//   N nodes · R required (F of R) · complete|incomplete · grammar ✓|✗.
// The `incomplete` segment is a LIVE control: clicking it selects + reveals the
// next incompleteNodeId, cycling on repeat through the selection channel (the
// inspector follows). Because absent-category incompleteness sits on the parent
// id and present-but-empty on the child id — both in incompleteNodeIds — one
// cycle reaches both.

const BAR: CSSProperties = { display: 'flex', alignItems: 'center', gap: 12 };
const SEG: CSSProperties = { display: 'inline-flex', gap: 4 };
const CONTROL: CSSProperties = { ...SEG, cursor: 'pointer', textDecoration: 'underline dotted', border: 'none', background: 'none', font: 'inherit', color: 'inherit', padding: 0 };

export function StatusBar() {
    const { t, choice } = useFrameMessages();
    const mount = useEditShellMount();
    const c = mount.conformance;
    const cursor = useRef(0);

    const nodes = c?.nodes ?? 0;
    const requiredTotal = c?.requiredTotal ?? 0;
    const requiredFilled = c?.requiredFilled ?? 0;
    const incompleteIds = c?.incompleteNodeIds ?? [];
    const complete = incompleteIds.length === 0 && requiredFilled === requiredTotal;
    // `✗` only for a loaded doc that violates the schema (grammarValid === false).
    const grammarValid = c ? c.grammarValid : true;

    const cycleIncomplete = () => {
        if (incompleteIds.length === 0) {
            return;
        }
        const id = incompleteIds[cursor.current % incompleteIds.length];
        cursor.current += 1;
        mount.selectNode(id);
        mount.revealNode(id);
    };

    return (
        <div data-frame-status-bar="" style={BAR}>
            <span data-status-seg="nodes" style={SEG}>{choice("schemastud-frame::messages.nodes_nodes", nodes, { nodes })}</span>
            <span data-status-seg="required" style={SEG}>{choice("schemastud-frame::messages.requiredtotal_required_requiredfilled_of_requiredtotal", requiredTotal, { requiredTotal, requiredFilled })}</span>
            {complete ? (
                <span data-status-seg="complete" style={SEG}>{t("schemastud-frame::messages.complete")}</span>
            ) : (
                <button type="button" data-status-seg="incomplete" onClick={cycleIncomplete} style={CONTROL}>{t("schemastud-frame::messages.incomplete")}</button>
            )}
            <span data-status-seg="grammar" data-grammar={grammarValid ? 'valid' : 'invalid'} style={SEG}>{t("schemastud-frame::messages.grammar_value", { value: grammarValid ? t("schemastud-frame::messages.valid") : '✗' })}</span>
        </div>
    );
}
