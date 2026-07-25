import type { Meta, StoryObj } from '@storybook/react-vite';
import { within } from 'storybook/test';
import { WidgetShell, WidgetSurface } from './WidgetShell';
import { MockFrameProvider, registerDemoEditor } from './story-harness';

/**
 * Frame/WidgetShell (component-seams ticket 15). The `mounts:'widget'` route path
 * (frame 22-spine, ED-04): a route whose entry mounts ONE heavyweight widget
 * full-surface (not a field form). `WidgetShell` is the route shell (fetches schema +
 * record, owns the EditShellMount); `WidgetSurface` is the pure props-driven inner
 * surface. The workbench registers a demo heavyweight editor (story-harness) so the
 * surface has something to mount.
 *
 * TREATMENT axes (treatment-axes.md): the **states** axis — a bound widget mounted
 * full-surface, a read-only mount, and the `unbound` fallback (a widget name with no
 * registry match). Ambient token + light⊗dark wired globally; the bound stories
 * `play`-await the mounted canvas.
 */
const meta = {
    title: 'Frame/WidgetShell',
    parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const awaitCanvas: Story['play'] = async ({ canvasElement }) => {
    await within(canvasElement).findByText(/demo heavyweight editor canvas/i);
};

/** The route shell — fetches the record + schema, mounts the demo editor full-surface. */
export const RouteShell: Story = {
    render: () => (
        <MockFrameProvider registerWidgets={registerDemoEditor()}>
            <WidgetShell resource="members" id="2" widget="demo-editor" />
        </MockFrameProvider>
    ),
    play: awaitCanvas,
};

/** Read-only — the same mount, `readOnly` threaded through to the widget. */
export const ReadOnly: Story = {
    render: () => (
        <MockFrameProvider registerWidgets={registerDemoEditor()}>
            <WidgetShell resource="members" id="1" widget="demo-editor" readOnly />
        </MockFrameProvider>
    ),
    play: awaitCanvas,
};

/** WidgetSurface directly — the pure, props-driven surface with no route fetch. */
export const SurfaceDirect: Story = {
    render: () => (
        <MockFrameProvider registerWidgets={registerDemoEditor()}>
            <WidgetSurface
                schema={{ type: 'object', properties: {} }}
                record={{ name: 'Direct-mounted record' }}
                widget="demo-editor"
            />
        </MockFrameProvider>
    ),
    play: async ({ canvasElement }) => {
        await within(canvasElement).findByText(/demo heavyweight editor canvas/i);
    },
};

/** Unbound — a widget name the registry cannot resolve: the honest "not mounted" fallback. */
export const Unbound: Story = {
    render: () => (
        <MockFrameProvider>
            <WidgetSurface
                schema={{ type: 'object', properties: {} }}
                record={{}}
                widget="no-such-widget"
            />
        </MockFrameProvider>
    ),
};
