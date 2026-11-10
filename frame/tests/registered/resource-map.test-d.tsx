// The registered program's one fixture (ruling 03 slice 1): the real shells, mounted as JSX, against a
// registered map. Nothing else goes here.
import './register';
import { EditShell, ListShell, useResourceAction, type EditShellProps, type FrameColumn, type ListShellProps, type WidgetShellProps } from '../../src';

const untyped: FrameColumn[] = [{ field: 'name' }];

export const cases = [
    // A cell reads a typed member with no cast, and a dotted pointer reaches one level into an object member.
    <ListShell resource="members" columns={[{ field: 'name', cell: (record) => record.email.toUpperCase() }, { field: 'plan.tier' }]} />,
    <EditShell resource="members" id="1" onSaved={(record) => record.name} />,

    // @ts-expect-error an unknown key
    <ListShell resource="nope" columns={[]} />,
    // @ts-expect-error an unknown column
    <ListShell resource="members" columns={[{ field: 'nickname' }]} />,
    // @ts-expect-error a dotted pointer into a missing member
    <ListShell resource="members" columns={[{ field: 'plan.price' }]} />,
    // @ts-expect-error an untyped FrameColumn[] passed for a typed key
    <ListShell resource="members" columns={untyped} />,
];

// review-r1's repro: an unknown key is refused through the props types alone, not only through the shell functions.
// @ts-expect-error an unknown key on ListShellProps
export type UnknownListKey = ListShellProps<'nope'>;
// @ts-expect-error an unknown key on EditShellProps
export type UnknownEditKey = EditShellProps<'nope'>;
// @ts-expect-error an unknown key on WidgetShellProps
export type UnknownWidgetKey = WidgetShellProps<'nope'>;

// frame-foundation 32 (ruling 03 slice 5): a declared action's call is typed by its registered input.
export function ArchiveDialog() {
    const archive = useResourceAction('members', 'archive');
    void archive.invoke({ id: '1', data: null });
    // @ts-expect-error a payload that is not the action's input (archive is confirm-only)
    void archive.invoke({ id: '1', data: { reason: 'spam' } });
    // An action with a real input: its registered type flows to the call site.
    const publish = useResourceAction('members', 'publish');
    void publish.invoke({ id: '1', data: { note: 'x' } });
    // @ts-expect-error an input action called with no payload
    void publish.invoke({ id: '1', data: null });
    // @ts-expect-error a payload of the wrong shape
    void publish.invoke({ id: '1', data: { note: 1 } });
    // @ts-expect-error an action the resource does not declare
    useResourceAction('members', 'delete-forever');
    return null;
}
