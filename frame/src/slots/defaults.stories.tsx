import type { Meta, StoryObj } from '@storybook/react-vite';
import { createFormIntentBus, type SchemaNode } from '@schemastud/seam';
import {
    DefaultCell,
    DefaultContainer,
    DefaultEmpty,
    DefaultFormBody,
    DefaultLoading,
    DefaultPagination,
    DefaultSaveBar,
    DefaultTable,
    DefaultToggle,
    DefaultToolbar,
} from './defaults';
import type { FrameColumn, Row } from '../types';
import { MockFrameProvider } from '../story-harness';

/**
 * Frame/Slot Defaults (component-seams ticket 15). Every frame shell renders through
 * slots; each slot has a working frame DEFAULT a host overrides only to deviate. This
 * file catalogues the canonical defaults (`slots/defaults.tsx`) — the baseline chrome
 * ListShell/EditShell wear out of the box. The concrete shadcn skin (`shadcn/*`) is a
 * separate alternative binding, not this wave.
 *
 * TREATMENT axes (treatment-axes.md): the **states** axis dominates (Toolbar
 * can-create on/off; Pagination first/middle/last; Empty; Loading; SaveBar
 * editable/read-only). Most defaults read the injected `primitives`, so each story
 * wraps in the workbench FrameProvider (story-harness). Ambient token + light⊗dark
 * wired globally.
 */
const meta = {
    title: 'Frame/Slot Defaults',
    parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const columns: FrameColumn[] = [
    { field: 'name', header: 'Name' },
    { field: 'role', header: 'Role' },
];
const rows: Row[] = [
    { id: '1', name: 'Ada Lovelace', role: 'owner' },
    { id: '2', name: 'Grace Hopper', role: 'admin' },
];

// ── Toolbar ─────────────────────────────────────────────────────────────────
/** Toolbar, can-create — the "New members" affordance. */
export const Toolbar: Story = {
    render: () => (
        <MockFrameProvider>
            <DefaultToolbar resource="members" canCreate onNew={() => {}} />
        </MockFrameProvider>
    ),
};

/** Toolbar, no create right — renders nothing (the empty state is invisible by design). */
export const ToolbarNoCreate: Story = {
    render: () => (
        <MockFrameProvider>
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                <DefaultToolbar resource="members" canCreate={false} onNew={() => {}} />
                canCreate=false → Toolbar renders null.
            </div>
        </MockFrameProvider>
    ),
};

// ── Table + Cell ───────────────────────────────────────────────────────────
/** The generalized resource-blind table over resolved columns + the Cell slot. */
export const Table: Story = {
    render: () => (
        <MockFrameProvider>
            <DefaultTable columns={columns} rows={rows} Cell={DefaultCell} onOpen={() => {}} />
        </MockFrameProvider>
    ),
};

// ── Empty / Loading ─────────────────────────────────────────────────────────
/** Empty state — the "No records." slot. */
export const Empty: Story = { render: () => <DefaultEmpty /> };

/** Loading state — the injected Skeleton primitive. */
export const Loading: Story = {
    render: () => (
        <MockFrameProvider>
            <div style={{ width: 320 }}>
                <DefaultLoading />
            </div>
        </MockFrameProvider>
    ),
};

// ── Pagination (states axis: first / middle / last) ─────────────────────────
export const PaginationFirst: Story = {
    render: () => (
        <MockFrameProvider>
            <DefaultPagination page={1} perPage={25} total={120} onPageChange={() => {}} />
        </MockFrameProvider>
    ),
};
export const PaginationMiddle: Story = {
    render: () => (
        <MockFrameProvider>
            <DefaultPagination page={3} perPage={25} total={120} onPageChange={() => {}} />
        </MockFrameProvider>
    ),
};
export const PaginationLast: Story = {
    render: () => (
        <MockFrameProvider>
            <DefaultPagination page={5} perPage={25} total={120} onPageChange={() => {}} />
        </MockFrameProvider>
    ),
};

// ── Edit-side defaults ───────────────────────────────────────────────────────
const editSchema: SchemaNode = {
    type: 'object',
    properties: {
        name: { type: 'string', title: 'Name' },
        role: { type: 'string', title: 'Role', enum: ['owner', 'admin', 'member'] },
    },
} as SchemaNode;

/** FormBody — seam's SchemaForm over a small schema (the default edit body). */
export const FormBody: Story = {
    render: () => (
        <MockFrameProvider>
            <DefaultFormBody
                schema={editSchema}
                formData={{ name: 'Grace Hopper', role: 'admin' }}
                intentBus={createFormIntentBus()}
                readOnly={false}
                form="bare"
                onChange={() => {}}
                onSubmit={() => {}}
            />
        </MockFrameProvider>
    ),
};

/** Toggle — the `enriched | bare` form-mode radio group. */
export const Toggle: Story = { render: () => <DefaultToggle value="enriched" onChange={() => {}} /> };

/** SaveBar, editable — Cancel + Save. */
export const SaveBar: Story = {
    render: () => (
        <MockFrameProvider>
            <DefaultSaveBar saving={false} readOnly={false} onSave={() => {}} onCancel={() => {}} />
        </MockFrameProvider>
    ),
};

/** SaveBar, saving — the in-flight state. */
export const SaveBarSaving: Story = {
    render: () => (
        <MockFrameProvider>
            <DefaultSaveBar saving readOnly={false} onSave={() => {}} onCancel={() => {}} />
        </MockFrameProvider>
    ),
};

/** SaveBar, read-only — only Cancel (no Save affordance). */
export const SaveBarReadOnly: Story = {
    render: () => (
        <MockFrameProvider>
            <DefaultSaveBar saving={false} readOnly onCancel={() => {}} onSave={() => {}} />
        </MockFrameProvider>
    ),
};

/** Container — the SidePanel-backed edit container (workbench renders it inline). */
export const Container: Story = {
    render: () => (
        <MockFrameProvider>
            <DefaultContainer>
                <div className="text-sm">Edit surface content sits inside the container slot.</div>
            </DefaultContainer>
        </MockFrameProvider>
    ),
};
