import { useState, type ReactNode } from 'react';
import { WidgetRegistryContext, type SchemaNode, type WidgetRegistry } from '@schemastud/seam';
import { EditShellMountProvider, useEditShellMountController } from './EditShellMount';
import { Inspector } from './Inspector';
import { PalettePane } from './PalettePane';
import { SavePill } from './SavePill';
import { WidgetSurface } from './WidgetShell';
import type { Row } from './types';

// ED-08 — the five-region editor shell (tracer bullet). Grows the single-column
// EditShell into: top bar · left palette · center canvas · right inspector ·
// bottom status. The canvas mounts the heavyweight editor widget full-surface
// (the `mounts:'widget'` mount, ED-04); the inspector (ED-08) and canvas share
// ONE EditShellMount, created here and provided to both, so selecting a block in
// the canvas drives the inspector. Palette + status are stubs this ticket (they
// fill in ED-09/13/14).

const REGION_BODY = { display: 'flex', alignItems: 'stretch', minHeight: 0 } as const;
const PALETTE_STYLE = { flex: '0 0 200px', borderRight: '1px solid #e4e4e7' } as const;
const CANVAS_STYLE = { flex: '1 1 auto', minWidth: 0, overflow: 'auto' } as const;
const INSPECTOR_STYLE = { flex: '0 0 300px', borderLeft: '1px solid #e4e4e7' } as const;
const BAR_STYLE = { padding: '6px 12px', borderBottom: '1px solid #e4e4e7' } as const;
const STATUS_STYLE = { padding: '4px 12px', borderTop: '1px solid #e4e4e7', fontSize: 12, color: '#71717a' } as const;

export interface FiveRegionEditShellProps {
    /** The resolved form schema the editor widget mounts over. */
    schema: SchemaNode;
    /** The record the editor edits. */
    record?: Row;
    /** The registered heavyweight editor-widget name mounted in the canvas. */
    widget: string;
    /** Widget registry (falls back to the seam context). */
    registry?: WidgetRegistry;
    readOnly?: boolean;
    /** Extra top-bar content, rendered beside the save pill / mode toggle. */
    topBar?: ReactNode;
    /** Palette region content — defaults to the hoisted PalettePane (ED-09). */
    palette?: ReactNode;
    /** Status region content — a stub until ED-14. */
    status?: ReactNode;
    /**
     * Persistence is autosave-by-default; the manual Save action shows only when
     * a host turns autosave OFF (ED-10).
     */
    autosave?: boolean;
    onSave?: () => void;
    /** Show the `Rich | Source` toggle. Defaults on; the editor always opens Rich. */
    sourceToggle?: boolean;
}

export function FiveRegionEditShell({
    schema,
    record,
    widget,
    registry,
    readOnly = false,
    topBar,
    palette,
    status,
    autosave = true,
    onSave,
    sourceToggle = true,
}: FiveRegionEditShellProps) {
    // The one mount both the canvas widget and the inspector share.
    const mount = useEditShellMountController();
    // The editor always opens in Rich; Source is an opt-in view.
    const [mode, setMode] = useState<'rich' | 'source'>('rich');

    const shell = (
        <EditShellMountProvider value={mount}>
            <div data-frame-shell="edit-five" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div
                    data-frame-region="top-bar"
                    style={{ ...BAR_STYLE, display: 'flex', alignItems: 'center', gap: 8 }}
                >
                    <SavePill />
                    {! autosave && (
                        <button type="button" data-frame-save-action="" onClick={() => onSave?.()}>
                            Save
                        </button>
                    )}
                    {sourceToggle && (
                        <span data-frame-mode-toggle="" role="group" style={{ marginLeft: 'auto' }}>
                            <button
                                type="button"
                                data-mode="rich"
                                aria-pressed={mode === 'rich'}
                                onClick={() => setMode('rich')}
                            >
                                Rich
                            </button>
                            <button
                                type="button"
                                data-mode="source"
                                aria-pressed={mode === 'source'}
                                onClick={() => setMode('source')}
                            >
                                Source
                            </button>
                        </span>
                    )}
                    {topBar ?? null}
                </div>
                <div data-frame-region="body" style={REGION_BODY}>
                    <div data-frame-region="palette" style={PALETTE_STYLE}>
                        {palette ?? <PalettePane />}
                    </div>
                    <div data-frame-region="canvas" style={CANVAS_STYLE}>
                        {mode === 'source' ? (
                            <pre data-frame-source-view="" style={{ margin: 0, padding: 12, fontSize: 12 }}>
                                {JSON.stringify(record ?? {}, null, 2)}
                            </pre>
                        ) : (
                            <WidgetSurface
                                schema={schema}
                                record={record}
                                widget={widget}
                                registry={registry}
                                readOnly={readOnly}
                                mount={mount}
                            />
                        )}
                    </div>
                    <div data-frame-region="inspector-region" style={INSPECTOR_STYLE}>
                        <Inspector />
                    </div>
                </div>
                <div data-frame-region="status" style={STATUS_STYLE}>
                    {status ?? <StatusStub />}
                </div>
            </div>
        </EditShellMountProvider>
    );

    // Make the registry available to the inspector's SchemaForm too (via seam's
    // context), so an inspected node's x-widget widgets resolve.
    return registry ? (
        <WidgetRegistryContext.Provider value={registry}>{shell}</WidgetRegistryContext.Provider>
    ) : (
        shell
    );
}

function StatusStub() {
    return <span data-frame-region-stub="status">Ready</span>;
}
