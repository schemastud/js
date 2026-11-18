import { expect, it } from 'vitest';
import * as registry from '../src/index';

// The README lists the public interface. This pins the runtime half of it, so a new export is a
// decision that changes this list and that table together. Types are erased and are not seen here.
it('exports what the README lists and nothing else', () => {
    expect(Object.keys(registry).sort()).toEqual([
        'AmbiguousRegistryMatch',
        'DuplicateRegistryKey',
        'InvalidRegistryKey',
        'Key',
        'MissReason',
        'OnKeyDuplicate',
        'PopulationRequirement',
        'RegistryMiss',
        'UnregisteredRegistry',
        'createRegistry',
        'createRegistryIndex',
        'foreignKey',
        'keysEqual',
        'snapshotRegistryIndex',
    ]);
});
