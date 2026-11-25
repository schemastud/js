// frame-foundation 100 (amend), unregistered program: with no map, ResourceKey is string, so every host callback's
// key parameter is still string and a string-typed implementation compiles unchanged.
import type {
    FrameCan,
    FrameHooks,
    FrameInjection,
    FrameTransport,
    ManifestLookup,
    MountDispatcherOptions,
} from '../../src';

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

export const keyParameters: [
    Same<Parameters<FrameCan>[1], string>,
    Same<Parameters<FrameTransport['list']>[0], string>,
    Same<Parameters<FrameTransport['remove']>[0], string>,
    Same<Parameters<ManifestLookup>[0], string>,
    Same<Parameters<NonNullable<FrameInjection['actionLock']>>[0], string>,
    Same<Parameters<FrameHooks['fireSubmitted']>[0], string>,
    Same<Parameters<NonNullable<MountDispatcherOptions['columnsFor']>>[0], string>,
    Same<Parameters<NonNullable<MountDispatcherOptions['formFor']>>[0], string>,
] = [true, true, true, true, true, true, true, true];

export const looseRemove: FrameTransport['remove'] = async (resource: string, _id: string) => {
    resource.toUpperCase();
};
export const looseLock: NonNullable<FrameInjection['actionLock']> = (resource: string) => (resource ? null : null);
export const looseCan: FrameCan = (_action, _resource: string) => true;
export const looseLookup: ManifestLookup = (_resource: string) => undefined;
export const looseDispatch: MountDispatcherOptions = {
    columnsFor: (_resource: string) => undefined,
    formFor: (_resource: string) => undefined,
};
