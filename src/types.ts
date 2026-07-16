import type { FormIntentBus, SchemaFetcher, SchemaNode, WidgetRegistry } from '@schemastud/seam';
import type { FacetsPrimitives, FacetsTransport, UseUrlState } from '@schemastud/facets';
import type { ComponentType, ReactNode } from 'react';
import type { FrameHooks } from './hooks';

// =============================================================================
// frame v1 — shell + slot contract (ADR-0081). Every type generalizes something
// already proven; frame is CONSOLIDATION, not greenfield.
// =============================================================================

export type Row = Record<string, unknown>;

export interface Paginated<T> {
    data: T[];
    total: number;
    page: number;
    perPage: number;
}

export type FormMode = 'splicewire' | 'raw';

// -----------------------------------------------------------------------------
// Injected auth check — frame CALLS `can`, never absorbs a policy cascade. numero
// binds it to a staff bool (Gate::allows('bypass-marquee')); a richer host can bind
// a full policy. Frame permits both, requires neither.
// -----------------------------------------------------------------------------
export type FrameAction = 'viewAny' | 'view' | 'create' | 'update' | 'delete';
export type FrameCan = (action: FrameAction, resource: string, record?: unknown) => boolean;

// -----------------------------------------------------------------------------
// Transport — facets' 5 methods + CRUD. Named-method object (a list/edit surface
// needs many operations). `getFormSchema`/`save` reach the server; the host's
// persist strategy and JsonSchemaGenerator->forRequest() sit BELOW this seam.
// -----------------------------------------------------------------------------
export interface FrameTransport extends FacetsTransport {
    list(resource: string, params: Record<string, string>): Promise<Paginated<Row>>;
    get(resource: string, id: string): Promise<Row>;
    getFormSchema(resource: string, form: FormMode): Promise<SchemaNode>;
    save(resource: string, id: string | null, data: unknown): Promise<Row>;
    remove(resource: string, id: string): Promise<void>;
}

// -----------------------------------------------------------------------------
// Primitives — facets' set + the shell chrome beyond the facets bar. The host
// supplies its design system; frame renders resource-blind through it.
// -----------------------------------------------------------------------------
export interface FramePrimitives extends FacetsPrimitives {
    Table: ComponentType<any>;
    Skeleton: ComponentType<any>;
    SidePanel: ComponentType<any>;
    Dialog?: ComponentType<any>;
}

// -----------------------------------------------------------------------------
// The one injection bundle carried by <FrameProvider>. Generalizes seam's
// (schemaFetcher + registry + intent bus) and facets' three seams into one, and
// adds the injected `can`.
// -----------------------------------------------------------------------------
export interface FrameInjection {
    transport: FrameTransport;
    primitives: FramePrimitives;
    useUrlState: UseUrlState;
    registry: WidgetRegistry;
    schemaFetcher: SchemaFetcher;
    can: FrameCan;
    /**
     * Optional host-side hook bus. When present, frame fires `onSubmitted` after a
     * successful save (see EditShell). Optional so existing consumers still compile;
     * a host opts in by passing `createFrameHooks()`.
     */
    hooks?: FrameHooks;
}

// -----------------------------------------------------------------------------
// Columns resolve through a SEAM, not a fixed prop. v1 strategy = host-supplied
// FrameColumn[]. The seam is forward-compatible with a future x-column reflection
// strategy (out of scope) without changing the shell contract.
// -----------------------------------------------------------------------------
export interface FrameColumn {
    field: string;
    header?: string;
    sortField?: string;
    cell?: (record: Row) => ReactNode;
}

// `schema` is the resource's list/filter schema — unused by the v1 host-supplied
// strategy, but the seam carries it so a future x-column reflection strategy can
// derive columns from it without changing the shell contract. The optional
// `manifest` threads the resource's ContextManifest so `list-column` participation
// (sort/label) folds into the columns and host columns are validated against it; when
// omitted, the seam is a pure passthrough (zero migration for existing surfaces).
export type ResolveColumns = (
    resource: string,
    schema: unknown,
    hostColumns: FrameColumn[],
    manifest?: import('./contexts').ContextManifest,
) => FrameColumn[];

// The manifest entry shape frame's shells consume — the frontend projection of the
// backend AdminResourceDefinition, plus the one frontend overlay (`columns`).
export interface AdminResourceDefinition {
    key: string;
    model: string;
    data: string;
    query: string | null;
    editData: string | null;
    policy: string | null;
    form: FormMode;
    nav: { label: string; group?: string | null; icon?: string | null };
}

// =============================================================================
// Slot prop contracts
// =============================================================================
export interface ToolbarSlotProps {
    resource: string;
    onNew?: () => void;
    canCreate: boolean;
}

export interface CellSlotProps {
    column: FrameColumn;
    record: Row;
}

export interface ListSlots {
    Toolbar: ComponentType<ToolbarSlotProps>;
    Filters: ComponentType<any>;
    Table: ComponentType<any>;
    Cell: ComponentType<CellSlotProps>;
    RowActions: ComponentType<{ record: Row }>;
    Empty: ComponentType<any>;
    Loading: ComponentType<any>;
    Pagination: ComponentType<PaginationSlotProps>;
}

export interface PaginationSlotProps {
    page: number;
    perPage: number;
    total: number;
    onPageChange: (page: number) => void;
}

export interface ListShellProps {
    resource: string;
    columns: FrameColumn[];
    onOpen?: (record: Row) => void;
    slots?: Partial<ListSlots>;
}

export interface FormBodySlotProps {
    schema: SchemaNode;
    formData: Row;
    intentBus: FormIntentBus;
    readOnly: boolean;
    form: FormMode;
    onChange: (data: Row) => void;
    onSubmit: (data: Row) => void;
}

export interface EditSlots {
    FormBody: ComponentType<FormBodySlotProps>;
    Toggle: ComponentType<{ value: FormMode; onChange: (m: FormMode) => void }>;
    SaveBar: ComponentType<SaveBarSlotProps>;
    Container: ComponentType<any>;
}

export interface SaveBarSlotProps {
    saving: boolean;
    readOnly: boolean;
    onSave: () => void;
    onCancel?: () => void;
}

export interface EditShellProps {
    resource: string;
    id: string | null;
    readOnly?: boolean;
    container?: 'panel' | 'page';
    form?: FormMode;
    /**
     * Show the splicewire/raw mode toggle — a dev/debug affordance for previewing a
     * field with host widgets stripped. Off by default: a resource already declares
     * its `form` mode, so the runtime switch is noise in the product UX. Opt in
     * (e.g. behind `import.meta.env.DEV`) to expose it.
     */
    showModeToggle?: boolean;
    onSaved?: (record: Row) => void;
    onCancel?: () => void;
    slots?: Partial<EditSlots>;
}
