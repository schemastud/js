import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { EditShell } from './EditShell';
import { ListShell } from './ListShell';
import { KNOWN_CONTEXTS, type ContextManifest } from './contexts';
import type { FrameColumn, ResourceActionDefinition } from './types';
import { MockFrameProvider } from './story-harness';

/**
 * Frame/ResourceActions (schemastud/laravel-frame ADR-0005). A resource's declared ACTIONS beyond CRUD,
 * rendered by the real shells: a resource-level action beside the list's "New", a record-level action on
 * each row and on the detail page, the form rendered from the action's input schema, the confirmation of a
 * confirm-only action, and the declared result (here the inline notice a host without a toast gets).
 *
 * An action is drawn only where the manifest's per-actor `can.actions[key]` is true — `HiddenWithoutCan`
 * is the same list with the actor refused, and it has no action button. Interactive stories `play` to the
 * state they name, so the VR baseline captures the open form or the settled notice, not the list behind it.
 */
const meta = {
    title: 'Frame/ResourceActions',
    parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const columns: FrameColumn[] = [];

const RELOAD: ResourceActionDefinition = {
    key: 'reload',
    label: 'Reload credits',
    scope: 'resource',
    method: 'POST',
    url: '/api/beam/commerce/credits/reload',
    input: 'Splicewire.Beam.Commerce.Data.CreditCheckoutInputData',
    result: 'toast',
    destructive: false,
};

const SUSPEND: ResourceActionDefinition = {
    key: 'suspend',
    label: 'Suspend',
    scope: 'record',
    method: 'POST',
    url: '/api/members/{id}/suspend',
    input: null,
    result: 'toast',
    destructive: true,
};

const manifest = (can: Record<string, boolean>): ContextManifest => ({
    // The columns are the manifest's own `list-column` participation, as at a real host.
    byNode: {
        name: { 'list-column': { participates: true, label: 'Name', sort: 0 } },
        email: { 'list-column': { participates: true, label: 'Email', sort: 1 } },
        role: { 'list-column': { participates: true, label: 'Role', sort: 2 } },
    },
    inherits: {},
    known: KNOWN_CONTEXTS,
    createAffordance: 'host',
    actions: [RELOAD, SUSPEND],
    can: { create: false, update: false, delete: false, actions: can },
});

const ALLOWED = manifest({ reload: true, suspend: true });

const awaitRows: Story['play'] = async ({ canvasElement }) => {
    await within(canvasElement).findByText('Ada Lovelace');
};

/** A resource-level action beside the list, and a record-level action on every row. */
export const OnTheList: Story = {
    render: () => (
        <MockFrameProvider>
            <ListShell resource="members" columns={columns} manifest={ALLOWED} onOpen={() => {}} />
        </MockFrameProvider>
    ),
    play: async (context) => {
        await awaitRows(context);
        const canvas = within(context.canvasElement);
        await expect(canvas.getByRole('button', { name: 'Reload credits' })).toBeVisible();
        await expect(canvas.getAllByRole('button', { name: 'Suspend' })).toHaveLength(4);
    },
};

/** The same list for an actor the manifest refuses: no action buttons at all. */
export const HiddenWithoutCan: Story = {
    render: () => (
        <MockFrameProvider>
            <ListShell
                resource="members"
                columns={columns}
                manifest={manifest({ reload: false, suspend: false })}
                onOpen={() => {}}
            />
        </MockFrameProvider>
    ),
    play: async (context) => {
        await awaitRows(context);
        const canvas = within(context.canvasElement);
        await expect(canvas.queryByRole('button', { name: 'Reload credits' })).toBeNull();
        await expect(canvas.queryByRole('button', { name: 'Suspend' })).toBeNull();
    },
};

/** Pressing an action with a declared input opens its form, rendered from the input schema. */
export const FormFromInputSchema: Story = {
    render: () => (
        <MockFrameProvider>
            <ListShell resource="members" columns={columns} manifest={ALLOWED} />
        </MockFrameProvider>
    ),
    play: async (context) => {
        await awaitRows(context);
        const canvas = within(context.canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: 'Reload credits' }));
        await expect(await canvas.findByLabelText(/Amount \(USD\)/)).toBeVisible();
    },
};

/** A confirm-only action (no input) asks before it sends — in destructive words when it is destructive. */
export const ConfirmOnly: Story = {
    render: () => (
        <MockFrameProvider>
            <ListShell resource="members" columns={columns} manifest={ALLOWED} />
        </MockFrameProvider>
    ),
    play: async (context) => {
        await awaitRows(context);
        const canvas = within(context.canvasElement);
        await userEvent.click(canvas.getAllByRole('button', { name: 'Suspend' })[0]);
        await expect(await canvas.findByText('Suspend? This cannot be undone.')).toBeVisible();
    },
};

/** The declared result: the response's message, shown inline by a host that binds no toast, over the refreshed list. */
export const ResultNotice: Story = {
    render: () => (
        <MockFrameProvider fixtures={{ actionMessage: 'Credits added.' }}>
            <ListShell resource="members" columns={columns} manifest={ALLOWED} />
        </MockFrameProvider>
    ),
    play: async (context) => {
        await awaitRows(context);
        const canvas = within(context.canvasElement);
        await userEvent.click(canvas.getAllByRole('button', { name: 'Suspend' })[0]);
        const dialog = await canvas.findByRole('dialog', { name: 'Suspend' });
        await userEvent.click(within(dialog).getByRole('button', { name: 'Suspend' }));
        await expect(await canvas.findByRole('status')).toHaveTextContent('Credits added.');
    },
};

/** A refused request keeps the dialog open and says why. */
export const Refused: Story = {
    render: () => (
        <MockFrameProvider fixtures={{ actionRefusal: 'The reload was declined (card_declined). Your balance is unchanged.' }}>
            <ListShell resource="members" columns={columns} manifest={ALLOWED} />
        </MockFrameProvider>
    ),
    play: async (context) => {
        await awaitRows(context);
        const canvas = within(context.canvasElement);
        await userEvent.click(canvas.getAllByRole('button', { name: 'Suspend' })[0]);
        const dialog = await canvas.findByRole('dialog', { name: 'Suspend' });
        await userEvent.click(within(dialog).getByRole('button', { name: 'Suspend' }));
        await expect(await within(dialog).findByRole('alert')).toHaveTextContent('declined');
    },
};

/** A record action on the detail page, above the record. */
export const OnTheDetailPage: Story = {
    render: () => (
        <MockFrameProvider>
            <EditShell resource="members" id="1" readOnly container="page" manifest={ALLOWED} />
        </MockFrameProvider>
    ),
    play: async ({ canvasElement }) => {
        await expect(await within(canvasElement).findByRole('button', { name: 'Suspend' })).toBeVisible();
    },
};
