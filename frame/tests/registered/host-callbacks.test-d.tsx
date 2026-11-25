// frame-foundation 100 (amend): every exported host callback that frame hands a resource key receives it as
// ResourceKey, so a registered host passes it on to a key-constrained helper with no cast. An implementation written
// against `string` still fits each slot (a parameter is contravariant).
import type {
    FrameCan,
    FrameHooks,
    FrameInjection,
    FrameTransport,
    ManifestLookup,
    MountDispatcherOptions,
    ResourceKey,
} from '../../src';

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Registered = 'members';

const keyed = <K extends ResourceKey>(resource: K): K => resource;

// Each callback's key parameter is the registered key, not string.
export const keyParameters: [
    Same<Parameters<FrameCan>[1], Registered>,
    Same<Parameters<FrameTransport['getFilterSchema']>[0], Registered>,
    Same<Parameters<FrameTransport['list']>[0], Registered>,
    Same<Parameters<FrameTransport['get']>[0], Registered>,
    Same<Parameters<FrameTransport['getFormSchema']>[0], Registered>,
    Same<Parameters<FrameTransport['create']>[0], Registered>,
    Same<Parameters<FrameTransport['save']>[0], Registered>,
    Same<Parameters<FrameTransport['remove']>[0], Registered>,
    Same<Parameters<NonNullable<FrameTransport['getActionSchema']>>[0], Registered>,
    Same<Parameters<ManifestLookup>[0], Registered>,
    Same<Parameters<NonNullable<FrameInjection['actionLock']>>[0], Registered>,
    Same<Parameters<FrameHooks['fireSubmitted']>[0], Registered>,
    Same<Parameters<NonNullable<MountDispatcherOptions['columnsFor']>>[0], Registered>,
    Same<Parameters<NonNullable<MountDispatcherOptions['formFor']>>[0], Registered>,
] = [true, true, true, true, true, true, true, true, true, true, true, true, true, true];

// A registered host's transport and lock hand the key on with no cast.
export const keyedRemove: FrameTransport['remove'] = async (resource) => {
    keyed(resource);
};
export const keyedLock: NonNullable<FrameInjection['actionLock']> = (resource) => {
    keyed(resource);
    return null;
};

// An implementation typed against string still fits each slot.
export const looseRemove: FrameTransport['remove'] = async (_resource: string, _id: string) => {};
export const looseLock: NonNullable<FrameInjection['actionLock']> = (_resource: string) => null;
export const looseCan: FrameCan = (_action, _resource: string) => true;
export const looseLookup: ManifestLookup = (_resource: string) => undefined;
export const looseDispatch: MountDispatcherOptions = {
    columnsFor: (_resource: string) => undefined,
    formFor: (_resource: string) => undefined,
};
