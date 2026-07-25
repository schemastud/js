import type { Meta, StoryObj } from '@storybook/react-vite';
import { within } from 'storybook/test';
import { ListShell } from './ListShell';
import type { FrameColumn } from './types';
import { MockFrameProvider } from './story-harness';

/**
 * Frame/ListShell (component-seams ticket 15). The resource-blind list surface: a
 * schema-driven facets bar + transport-driven pagination + columns resolved through
 * the columns seam, rendered here over the workbench's in-memory transport
 * (story-harness). No per-resource UI code — the demo `members` resource is pure
 * fixture data.
 *
 * TREATMENT axes (treatment-axes.md): the **states** axis (`Loading` / `Empty` /
 * populated) and the **viewport** axis (a structure surface — catalogued mobile +
 * desktop). `density` is NOT exposed on ListShellProps (it would live on the Table
 * slot), so — per the rule of sanction — it is absent-not-a-gap here. Ambient token +
 * light⊗dark wired globally; the populated stories `play`-await their rows so the VR
 * baseline captures settled data, never the loading flash.
 */
const meta = {
    title: 'Frame/ListShell',
    parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const columns: FrameColumn[] = [
    { field: 'name', header: 'Name', sortField: 'name' },
    { field: 'email', header: 'Email' },
    { field: 'role', header: 'Role' },
];

const awaitRows: Story['play'] = async ({ canvasElement }) => {
    await within(canvasElement).findByText('Ada Lovelace');
};

/** Populated — the default list over the fixture `members`, pagination top + bottom. */
export const Populated: Story = {
    render: () => (
        <MockFrameProvider>
            <ListShell resource="members" columns={columns} onOpen={() => {}} />
        </MockFrameProvider>
    ),
    play: awaitRows,
};

/** Loading — the transport parks, so the shell shows its Skeleton loading slot. */
export const Loading: Story = {
    render: () => (
        <MockFrameProvider fixtures={{ loading: true }}>
            <ListShell resource="members" columns={columns} />
        </MockFrameProvider>
    ),
};

/** Empty — the transport resolves zero rows: the shell's Empty slot. */
export const Empty: Story = {
    render: () => (
        <MockFrameProvider fixtures={{ empty: true }}>
            <ListShell resource="members" columns={columns} />
        </MockFrameProvider>
    ),
    play: async ({ canvasElement }) => {
        await within(canvasElement).findByText('No records.');
    },
};

/** paginationPlacement="bottom" — a single bar below the table. */
export const PaginationBottomOnly: Story = {
    render: () => (
        <MockFrameProvider>
            <ListShell resource="members" columns={columns} paginationPlacement="bottom" />
        </MockFrameProvider>
    ),
    play: awaitRows,
};

/** viewport = mobile — the structure surface at a narrow width. */
export const Mobile: Story = {
    parameters: { viewport: { defaultViewport: 'mobile1' } },
    render: () => (
        <MockFrameProvider>
            <ListShell resource="members" columns={columns} onOpen={() => {}} />
        </MockFrameProvider>
    ),
    play: awaitRows,
};
