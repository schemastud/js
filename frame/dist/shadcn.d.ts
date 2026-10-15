import * as react from 'react';
import { ComponentType } from 'react';
import { q as CellSlotProps, P as PaginationSlotProps, b as FrameColumn, R as Row, T as ToolbarSlotProps, r as ErrorSlotProps, u as SaveBarSlotProps, c as FormMode } from './types-DBk4K56z.js';
import '@schemastud/seam';
import '@schemastud/facets';
import '@schemastud/ui';

/**
 * Sort state the list shell threads into the Table slot so column headers and the
 * facets-bar Sort control share ONE comma-joined `sort` param — never a competing
 * mechanism. `sortableFields` are the resource's declared `x-sort` field names (a
 * header only becomes clickable when its column's `sortField` is in this set, so an
 * unknown sort can't be emitted).
 */
interface TableSort {
    sort: string | null;
    onSortChange: (value: string | null) => void;
    sortableFields: Set<string>;
}
/**
 * shadcn-flavored list slots — the batteries-included default for the (all-shadcn)
 * ecosystem. Every slot is styled with shadcn-CONVENTION Tailwind utilities that read
 * the STANDARD shadcn CSS variables (`border`, `bg-card`, `bg-muted`,
 * `text-muted-foreground`, `ring`), so a host that maps those variables onto its own
 * palette (numero → Nebula) gets a native surface with zero table code. Interactive
 * atoms reuse the host's injected `primitives.Button` — the preset never imports a
 * host's per-app `@/components/ui/*` (which shadcn copies in, not publishes).
 */
declare function ShadcnTable(props: {
    columns: FrameColumn[];
    rows: Row[];
    onOpen?: (record: Row) => void;
    Cell: ComponentType<CellSlotProps>;
    RowActions?: ComponentType<{
        record: Row;
    }>;
    sort?: TableSort;
}): react.JSX.Element;
/** Adds empty-value + boolean rendering over the plain default; otherwise delegates. */
declare function ShadcnCell(props: CellSlotProps): react.JSX.Element;
declare function ShadcnEmpty(): react.JSX.Element;
/**
 * The shadcn-skinned failed-read state (api-surface-coherence 107) — the visual twin of
 * {@see ShadcnEmpty}, deliberately NOT sharing its markup: they must not be mistakable
 * for one another, which is the entire defect this slot closes.
 */
declare function ShadcnErrorState({ error, retry }: ErrorSlotProps): react.JSX.Element;
declare function ShadcnToolbar({ resource, onNew, canCreate, framesCreate, singularLabel, }: ToolbarSlotProps): react.JSX.Element | null;
declare function ShadcnPagination(props: PaginationSlotProps): react.JSX.Element;
/** Spread into a ListShell's `slots` for a shadcn-native list; override individual keys after. */
declare const shadcnListSlots: {
    Table: typeof ShadcnTable;
    Cell: typeof ShadcnCell;
    Empty: typeof ShadcnEmpty;
    ErrorState: typeof ShadcnErrorState;
    Toolbar: typeof ShadcnToolbar;
    Pagination: typeof ShadcnPagination;
};

/**
 * shadcn-flavored edit slots. Deliberately NOT FormBody (already themed by seam's
 * ShadcnTheme) or Container (the host owns its Sheet/Dialog) — only the two chrome
 * slots the plain defaults leave bare: the mode Toggle and the SaveBar.
 */
declare function ShadcnToggle({ value, onChange, }: {
    value: FormMode;
    onChange: (m: FormMode) => void;
}): react.JSX.Element;
declare function ShadcnSaveBar({ saving, canSubmit, readOnly, onSave, onCancel }: SaveBarSlotProps): react.JSX.Element;
/** Spread into an EditShell's `slots` for a shadcn-native editor; override keys after. */
declare const shadcnEditSlots: {
    Toggle: typeof ShadcnToggle;
    SaveBar: typeof ShadcnSaveBar;
};

/**
 * A shadcn-styled prose textarea + trailing "enrich" action — the LOOK for a host's
 * enrich component widget. The host widget keeps all behavior (the FormIntentBus
 * dispatch/subscribe, the busy flag) and passes `onChange`/`onEnrich`/`busy`; this
 * owns only presentation. It renders a plain `<textarea>` with shadcn-convention
 * classes (reading the standard shadcn CSS variables) rather than importing a host's
 * copied component, so it is portable to any shadcn host. The action reuses the
 * injected `primitives.Button`.
 */
declare function ShadcnEnrichTextarea(props: {
    id: string;
    value?: string;
    disabled?: boolean;
    readOnly?: boolean;
    busy?: boolean;
    rows?: number;
    onChange: (value: string) => void;
    onEnrich: () => void;
    label?: string;
}): react.JSX.Element;

export { ShadcnCell, ShadcnEmpty, ShadcnEnrichTextarea, ShadcnPagination, ShadcnSaveBar, ShadcnTable, ShadcnToggle, ShadcnToolbar, shadcnEditSlots, shadcnListSlots };
