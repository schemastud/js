import type { ColumnDef } from '@tanstack/react-table';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './badge';
import { DataTable } from './DataTable';

/**
 * Foundation/DataTable (component-seams ticket 14). The headless collection primitive. As a
 * collection it is the natural home for the **states** axis — populated / empty / loading
 * (two-phase: shaped skeleton on first load). It exposes **no `density` prop today**, so that
 * (collection-scoped) axis is absent, not a gap — it graduates if/when DataTable grows a density
 * knob. Ambient token + light⊗dark wired globally.
 */
type Row = { name: string; source: string; status: 'ready' | 'failed' };

const columns: ColumnDef<Row, unknown>[] = [
    { accessorKey: 'name', header: 'Fragment' },
    { accessorKey: 'source', header: 'Source' },
    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => {
            const status = getValue() as Row['status'];
            return (
                <Badge variant={status === 'ready' ? 'secondary' : 'destructive'}>{status}</Badge>
            );
        },
    },
];

const rows: Row[] = [
    { name: 'Onboarding guide', source: 'local', status: 'ready' },
    { name: 'Billing FAQ', source: 'mcp', status: 'ready' },
    { name: 'Legacy import', source: 'mcp', status: 'failed' },
];

// Render-based stories (the FrameLayout pilot idiom): DataTable is generic with required props,
// so the meta is untyped-by-component and each story renders explicitly rather than from args.
const meta = {
    title: 'Foundation/DataTable',
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <div className="w-[40rem] max-w-full">
                <Story />
            </div>
        ),
    ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** states = populated. */
export const Populated: Story = { render: () => <DataTable columns={columns} data={rows} /> };

/** states = empty — the caller's empty message, no rows. */
export const Empty: Story = {
    render: () => (
        <DataTable columns={columns} data={[]} emptyMessage="No fragments captured yet." />
    ),
};

/** states = loading — first load with no rows shows shaped skeleton rows (never a bare spinner). */
export const Loading: Story = {
    render: () => <DataTable columns={columns} data={[]} loading skeletonRows={4} />,
};
