import { ResourceKindPicker, type ResourceKindPickerProps } from './KindPicker';
import { ResourceRecordPicker, type ResourceRecordPickerProps } from './RecordPicker';

// =============================================================================
// ResourcePicker — the one "pick a resource" component (owner-review-20261102 RP; the
// shared core research 10-S1 names for ref-combobox / ref-tree / ref-tags and O10's
// pack picker). Two stages share one placement vocabulary:
//
//   <ResourcePicker kinds={…} placement="nav" value={keys} onChange={…} />
//       stage 1 — a resource KIND from a declared catalogue (palette / rail / catalog);
//   <ResourcePicker resource="threads" placement="bulk" value={selection} onChange={…} />
//       stage 2 — RECORDS of one kind (typeahead / embedded ListShell), whose value is
//       the `{mode:'ids'} | {mode:'set'}` selection that crosses the wire.
// =============================================================================

export type ResourcePickerProps =
    | ({ stage?: 'kinds' } & ResourceKindPickerProps)
    | ({ stage?: 'records' } & ResourceRecordPickerProps);

export function ResourcePicker(props: ResourcePickerProps) {
    if ('kinds' in props && Array.isArray(props.kinds)) {
        return <ResourceKindPicker {...(props as ResourceKindPickerProps)} />;
    }
    return <ResourceRecordPicker {...(props as ResourceRecordPickerProps)} />;
}
