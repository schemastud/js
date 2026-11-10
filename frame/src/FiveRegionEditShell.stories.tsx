import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import type { EditShellMountValue } from './EditShellMount';
import type { WidgetRegistry } from '@schemastud/seam';
import { FiveRegionEditShell } from './FiveRegionEditShell';
import { MockFrameProvider, registerDemoEditor } from './story-harness';
import { CANVAS_MIN, INSPECTOR_MIN } from './responsive';

/**
 * Frame/FiveRegionEditShell (component-seams ticket 15). The heavyweight-editor shell
 * (ED-08/09/13/14): top bar (SavePill + Rich|Source) · left PalettePane · center
 * canvas (the mounted widget + MissingSlots) · right Inspector · bottom StatusBar —
 * all sharing ONE EditShellMount. The workbench's demo editor publishes candidates /
 * conformance / a selected node onto that mount, so every region renders populated
 * (the point of cataloguing the composed shell, not just its panes in isolation).
 *
 * TREATMENT axes (treatment-axes.md): the **viewport** / responsive axis is
 * first-class here — `collapseLevel` (0/1/2) drives which regions dock vs. collapse
 * (ED-11), so it is catalogued across levels. Plus the **states** axis (autosave on =
 * passive pill; autosave off = manual Save action). Ambient token + light⊗dark wired
 * globally; each story `play`-awaits the mounted canvas.
 */
const meta = {
    title: 'Frame/FiveRegionEditShell',
    parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const schema = { type: 'object', properties: {} } as const;
const record = { name: 'Circuit: onboarding flow' };

// Parameterize the boundary from ED-11's documented minima: level 1 starts at
// 360px canvas + 280px inspector. The palette's 48px rail overlays the canvas
// inline-start edge at that boundary (ED-11 arithmetic interpretation, orch-peer
// row 47a8485f); it does not raise the level-2 breakpoint to 688px.
const LEVEL_ONE_MIN_WIDTH = CANVAS_MIN + INSPECTOR_MIN;

function SelectableDemoBlock({ editShellMount }: { editShellMount?: EditShellMountValue }) {
    useEffect(
        () =>
            editShellMount?.registerNodeAccess({
                getNode: (nodeId) =>
                    nodeId === 'first-block'
                        ? {
                              type: 'paragraph',
                              attrsSchema: { type: 'object', properties: {} },
                              attrs: {},
                          }
                        : null,
                setNodeAttrs: () => {},
            }),
        [editShellMount],
    );

    return (
        <button type="button" onClick={() => editShellMount?.selectNode('first-block')}>
            Select first block
        </button>
    );
}

const registerSelectableBlock = (registry: WidgetRegistry) => {
    registry.registerWidget('demo-editor', SelectableDemoBlock);
};

const awaitCanvas: Story['play'] = async ({ canvasElement }) => {
    await within(canvasElement).findByText(/demo heavyweight editor canvas/i);
};

/** Expanded (collapseLevel 0) — all five regions docked and populated. */
export const Expanded: Story = {
    render: () => (
        <MockFrameProvider registerWidgets={registerDemoEditor()}>
            <div style={{ height: 460 }}>
                <FiveRegionEditShell schema={schema} record={record} widget="demo-editor" collapseLevel={0} />
            </div>
        </MockFrameProvider>
    ),
    play: awaitCanvas,
};

/** Mid collapse (level 1) — the responsive step where a side region gives way. */
export const CollapsedMid: Story = {
    render: () => (
        <MockFrameProvider registerWidgets={registerDemoEditor()}>
            <div style={{ height: 460 }}>
                <FiveRegionEditShell schema={schema} record={record} widget="demo-editor" collapseLevel={1} />
            </div>
        </MockFrameProvider>
    ),
    play: awaitCanvas,
};

/** Full collapse (level 2) — the narrow/mobile arrangement. */
export const CollapsedFull: Story = {
    parameters: { viewport: { defaultViewport: 'mobile1' } },
    render: () => (
        <MockFrameProvider registerWidgets={registerDemoEditor()}>
            <div style={{ height: 520 }}>
                <FiveRegionEditShell schema={schema} record={record} widget="demo-editor" collapseLevel={2} />
            </div>
        </MockFrameProvider>
    ),
    play: awaitCanvas,
};

/** At the level-1 lower bound, the rail overlays the canvas without hiding its first block. */
export const ResponsiveLevelOneBoundary: Story = {
    tags: ['t17-responsive'],
    parameters: { layout: 'fullscreen', frameViewport: { width: LEVEL_ONE_MIN_WIDTH, height: 844 } },
    render: () => (
        <MockFrameProvider registerWidgets={registerSelectableBlock}>
            <div style={{ width: '100vw', height: 520, minWidth: 0 }}>
                <FiveRegionEditShell
                    schema={schema}
                    record={record}
                    widget="demo-editor"
                    palette={<button type="button">Insert paragraph</button>}
                />
            </div>
        </MockFrameProvider>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const selectBlock = await canvas.findByRole('button', { name: 'Select first block' });
        const host = selectBlock.closest('[data-frame-shell="edit-five"]') as HTMLElement;
        const body = host.querySelector('[data-frame-region="body"]') as HTMLElement;
        const editor = host.querySelector('[data-frame-region="canvas"]') as HTMLElement;
        const palette = host.querySelector('[data-frame-region="palette"]') as HTMLElement;

        await waitFor(() => expect(host.getAttribute('data-collapse-level')).toBe('1'));
        await expect(window.innerWidth).toBe(LEVEL_ONE_MIN_WIDTH);
        await expect(body.getBoundingClientRect().width).toBe(LEVEL_ONE_MIN_WIDTH);
        await expect(palette.getAttribute('data-palette-mode')).toBe('rail');
        await expect(palette.getBoundingClientRect().width).toBe(48);
        // The 48px rail is over the canvas edge with an explicit stacking order.
        await expect(getComputedStyle(palette).position).toBe('absolute');
        await expect(Number(getComputedStyle(palette).zIndex)).toBeGreaterThan(
            Number(getComputedStyle(editor).zIndex) || 0,
        );
        await expect(editor.getBoundingClientRect().width).toBeGreaterThanOrEqual(CANVAS_MIN);

        const toggle = canvas.getByRole('button', { name: 'Open block palette' });
        toggle.focus();
        await userEvent.keyboard('{Enter}');
        const insert = canvas.getByRole('button', { name: 'Insert paragraph' });
        await expect(insert.getBoundingClientRect().width).toBeGreaterThan(0);
        await userEvent.click(selectBlock);
        await expect(host.querySelector('[data-frame-inspector-empty]')).toBeNull();
        await expect(host.querySelector('[data-frame-region="inspector-region"] [data-node-type]')).not.toBeNull();
    },
};

/** One pixel below ED-11's 640px boundary enters level 2. */
export const ResponsiveLevelTwoBoundary: Story = {
    tags: ['t17-responsive'],
    parameters: {
        layout: 'fullscreen',
        frameViewport: { width: LEVEL_ONE_MIN_WIDTH - 1, height: 844 },
    },
    render: () => (
        <MockFrameProvider registerWidgets={registerDemoEditor()}>
            <div style={{ width: '100vw', height: 520, minWidth: 0 }}>
                <FiveRegionEditShell
                    schema={schema}
                    record={record}
                    widget="demo-editor"
                    palette={<button type="button">Insert paragraph</button>}
                />
            </div>
        </MockFrameProvider>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const shell = await canvas.findByText(/demo heavyweight editor canvas/i);
        const host = shell.closest('[data-frame-shell="edit-five"]') as HTMLElement;
        await waitFor(() => expect(host.getAttribute('data-collapse-level')).toBe('2'));
        await expect(window.innerWidth).toBe(LEVEL_ONE_MIN_WIDTH - 1);
        await expect(host.querySelector('[data-frame-region="canvas"]')?.getBoundingClientRect().width).toBeGreaterThan(0);
        const paletteToggle = canvas.getByRole('button', { name: 'Open block palette' });
        await expect(paletteToggle).toBeVisible();
        await expect(canvas.getByRole('button', { name: 'Open inspector' })).toBeVisible();
        await userEvent.click(paletteToggle);
        const insert = canvas.getByRole('button', { name: 'Insert paragraph' });
        await expect(insert).toBeVisible();
        insert.focus();
        await expect(document.activeElement).toBe(insert);
        await userEvent.keyboard('{Escape}');
        await expect((host.querySelector('[data-frame-region="palette"]') as HTMLElement).hidden).toBe(true);
        await expect(paletteToggle.getAttribute('aria-expanded')).toBe('false');
        await expect(document.activeElement).toBe(paletteToggle);
    },
};

/** At 1440px, the existing three-pane editor remains expanded. */
export const ResponsiveWide: Story = {
    tags: ['t17-responsive'],
    parameters: { layout: 'fullscreen', frameViewport: { width: 1440, height: 900 } },
    render: () => (
        <MockFrameProvider registerWidgets={registerDemoEditor()}>
            <div style={{ width: '100vw', height: 520, minWidth: 0 }}>
                <FiveRegionEditShell schema={schema} record={record} widget="demo-editor" />
            </div>
        </MockFrameProvider>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const shell = await canvas.findByText(/demo heavyweight editor canvas/i);
        const host = shell.closest('[data-frame-shell="edit-five"]') as HTMLElement;
        const palette = host.querySelector('[data-frame-region="palette"]') as HTMLElement;
        const editor = host.querySelector('[data-frame-region="canvas"]') as HTMLElement;
        const inspector = host.querySelector('[data-frame-region="inspector-region"]') as HTMLElement;

        await waitFor(() => expect(host.getAttribute('data-collapse-level')).toBe('0'));
        await expect(window.innerWidth).toBe(1440);
        await expect(palette.getAttribute('data-palette-mode')).toBe('pane');
        await expect(inspector.getAttribute('data-inspector-mode')).toBe('pane');
        await expect(editor.getBoundingClientRect().width).toBeGreaterThan(0);
        await expect(palette.getBoundingClientRect().width).toBeGreaterThan(0);
        await expect(inspector.getBoundingClientRect().width).toBeGreaterThan(0);
    },
};

/** Manual save — `autosave={false}` surfaces the explicit Save action beside the pill. */
export const ManualSave: Story = {
    render: () => (
        <MockFrameProvider registerWidgets={registerDemoEditor()}>
            <div style={{ height: 460 }}>
                <FiveRegionEditShell
                    schema={schema}
                    record={record}
                    widget="demo-editor"
                    autosave={false}
                    collapseLevel={0}
                    onSave={() => {}}
                />
            </div>
        </MockFrameProvider>
    ),
    play: awaitCanvas,
};
