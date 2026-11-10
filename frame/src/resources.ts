import type { Row } from './types';

/**
 * The resource-key type map (ruling 03). Empty here; a host registers its generated map onto it, in a `.ts` module
 * (the beam shell stamp writes it as `resources/js/frame-resource-map.ts`):
 *
 * ```ts
 * import type {} from '@schemastud/frame';
 * import type { FrameResources } from '@/generated/frame-resources';
 * declare module '@schemastud/frame' { interface FrameResourceMap extends FrameResources {} }
 * ```
 *
 * The first import is what puts frame's declarations in a host program that imports no frame value of its own;
 * without it the augmentation fails TS2664 (ticket 31's interface decision).
 *
 * Registered, a key that is not in the map does not compile, and a shell's rows, columns and saved records are
 * typed by the key. Unregistered, `ResourceKey` is `string` and every row is `Row`, exactly as before. A host with
 * no generator may register by hand, adding `[key: string]: FrameResourceEntry` to keep every other key legal.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FrameResourceMap {}

/** What one key carries: its read row, its edit projection, its create result, and its actions' inputs. */
export interface FrameResourceEntry {
    row: Row;
    edit: Row;
    createResult: Row;
    actions: Record<string, unknown>;
}

/** A resource key: the registered map's keys, or any string when nothing is registered. */
export type ResourceKey = [keyof FrameResourceMap] extends [never] ? string : keyof FrameResourceMap & string;

type EntryOf<K extends string> = K extends keyof FrameResourceMap ? FrameResourceMap[K] : FrameResourceEntry;
type Member<E, M extends string, Fallback> = E extends { [P in M]: infer T } ? T : Fallback;

/** The key's read row; `Row` when unregistered. */
export type RowOf<K extends string = ResourceKey> = Member<EntryOf<K>, 'row', Row>;
/** The key's edit projection; `Row` when unregistered. */
export type EditOf<K extends string = ResourceKey> = Member<EntryOf<K>, 'edit', Row>;
/** What creating a record of the key returns; `Row` when unregistered. */
export type CreateResultOf<K extends string = ResourceKey> = Member<EntryOf<K>, 'createResult', Row>;
/** The key's declared action keys. */
export type ActionKeyOf<K extends string = ResourceKey> = keyof Member<EntryOf<K>, 'actions', Record<string, unknown>> & string;
/** The input an action of the key takes (`null` for an action with no input). */
export type ActionInputOf<K extends string, A extends ActionKeyOf<K>> = Member<EntryOf<K>, 'actions', Record<string, unknown>>[A];

/**
 * A field pointer into row `R`: any string for an untyped row; else a member, or `member.sub` one level into an
 * object-valued member (a folded slice such as `commerce.plan`).
 */
export type FieldOf<R> = string extends keyof R
    ? string
    : {
          [M in keyof R & string]:
              | M
              | (NonNullable<R[M]> extends readonly unknown[]
                    ? never
                    : NonNullable<R[M]> extends object
                      ? `${M}.${keyof NonNullable<R[M]> & string}`
                      : never);
      }[keyof R & string];
