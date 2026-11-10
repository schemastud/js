// The registered program's one fixture (ruling 03 slice 1): the real shells, mounted as JSX, against a
// registered map. Nothing else goes here.
import './register';
import { EditShell, ListShell, type EditShellProps, type FrameColumn, type ListShellProps, type WidgetShellProps } from '../../src';

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
