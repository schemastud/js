import type { Meta, StoryObj } from '@storybook/react-vite';
import { within } from 'storybook/test';
import { FiveRegionEditShell } from './FiveRegionEditShell';
import { MockFrameProvider, registerDemoEditor } from './story-harness';

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
