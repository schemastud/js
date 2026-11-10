// The UNREGISTERED program's JSX fixture (ruling 03's guarantee): with no map registered, a shell's callbacks take
// exactly what they took before the map existed.
import { EditShell, ListShell } from '../../src';

export const cases = [
    // A plain Row: a member reads as unknown, never refused (build-qa's repro).
    <ListShell resource="anything" columns={[]} onOpen={(record) => record.title} />,
    <ListShell resource="anything" columns={[]} onCellCommit={(record, field) => [record.title, field.length]} />,
    <EditShell resource="anything" id="1" onSaved={(record) => record.title} />,
];
