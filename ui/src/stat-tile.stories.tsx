import type { Meta, StoryObj } from '@storybook/react-vite';
import { Building2, CircleCheck, CircleDashed, PauseCircle, TriangleAlert } from 'lucide-react';
import { StatTile } from './stat-tile';

/**
 * Foundation/StatTile (realm-dashboards ticket 03). The one figure-with-label tile every
 * dashboard row is made of, lifted from tower-ux. Exposes the **tone** axis
 * (default/active/busy/warn/danger → one semantic token each) and an optional glyph.
 * No size axis — a tile's size is its grid cell's — so that axis is absent, not a gap.
 * Ambient token + light⊗dark wired globally.
 */
const meta = {
    title: 'Foundation/StatTile',
    component: StatTile,
    tags: ['autodocs'],
    argTypes: {
        tone: {
            control: 'select',
            options: ['default', 'active', 'busy', 'warn', 'danger'],
        },
    },
    args: { label: 'Total tenants', value: 42, icon: Building2 },
    parameters: { layout: 'padded' },
} satisfies Meta<typeof StatTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Active: Story = { args: { label: 'Active', value: 37, icon: CircleCheck, tone: 'active' } };
export const Busy: Story = { args: { label: 'Provisioning', value: 3, icon: CircleDashed, tone: 'busy' } };
export const Warn: Story = { args: { label: 'Suspended', value: 1, icon: PauseCircle, tone: 'warn' } };
export const Danger: Story = { args: { label: 'Failed', value: 1, icon: TriangleAlert, tone: 'danger' } };

/** No glyph — the figure alone, for a row that carries no icon vocabulary. */
export const Glyphless: Story = { args: { icon: undefined, label: 'Open bills', value: '$1,240' } };

/** tone axis — the full enum in the grid a dashboard row uses. */
export const AllTones: Story = {
    render: () => (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatTile label="Total tenants" value={42} icon={Building2} />
            <StatTile label="Active" value={37} icon={CircleCheck} tone="active" />
            <StatTile label="Provisioning" value={3} icon={CircleDashed} tone="busy" />
            <StatTile label="Suspended" value={1} icon={PauseCircle} tone="warn" />
            <StatTile label="Failed" value={1} icon={TriangleAlert} tone="danger" />
        </div>
    ),
};
