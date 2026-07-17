import { SchemaForm, type SchemaNode } from '@schemastud/seam';
import { useEditShellMount } from './EditShellMount';

// ED-08 — the always-mounted inspector pane. A **pure frame + seam** surface with
// NO ProseMirror knowledge: it reads `selectedNodeId` off the EditShellMount,
// pulls the node via `getNode`, and renders seam's SchemaForm over the node's
// `attrsSchema`, routing `onChange → setNodeAttrs` (the one write-back pipe). The
// region rests genuinely empty ("Select a block to edit") when nothing is
// selected — no auto-select of the root.

// The shape blockdoc's node-attrs channel returns (structural — frame never
// imports blockdoc; getNode is typed `unknown` on the mount).
interface InspectedNode {
    type: string;
    attrsSchema?: SchemaNode;
    attrs?: Record<string, unknown>;
}

const EMPTY_STYLE = { padding: 16, color: '#71717a', fontSize: 13 } as const;

export function Inspector() {
    const mount = useEditShellMount();
    const selectedNodeId = mount.selectedNodeId;

    const node = selectedNodeId !== null ? (mount.getNode(selectedNodeId) as InspectedNode | null) : null;

    // Rest empty on no selection, or when the selected node raced a delete.
    if (selectedNodeId === null || node === null) {
        return (
            <div data-frame-region="inspector" data-frame-inspector-empty="" style={EMPTY_STYLE}>
                Select a block to edit
            </div>
        );
    }

    return (
        <div data-frame-region="inspector" data-node-type={node.type}>
            <SchemaForm
                // Re-key per selected node so the form re-seeds from the doc on a
                // new selection (and RJSF owns edits in between).
                key={selectedNodeId}
                schema={node.attrsSchema ?? { type: 'object', properties: {} }}
                formData={node.attrs ?? {}}
                uiSchema={{ 'ui:submitButtonOptions': { norender: true } }}
                onChange={(event: { formData?: unknown }) =>
                    mount.setNodeAttrs(selectedNodeId, (event.formData ?? {}) as Record<string, unknown>)
                }
            />
        </div>
    );
}
