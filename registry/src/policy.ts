// The three enums of the registry contract, as data. The member names are the PHP kernel's case
// names and the values are its backed values, so a value read off the wire compares equal to one
// written here.

/** What `register` does when the key is already taken. Declared per registry. */
export const OnKeyDuplicate = {
    /** The later write takes the key, in the earlier one's place in the order. What it displaced is recorded. */
    Supersede: 'supersede',
    /** The later write is refused: `register` throws `DuplicateRegistryKey`. */
    Reject: 'reject',
    /** Both entries live under the key. `matches` returns both; `resolve` of that key is ambiguous. */
    Admit: 'admit',
} as const;

export type OnKeyDuplicate = (typeof OnKeyDuplicate)[keyof typeof OnKeyDuplicate];

/** Whether an empty registry is expected. */
export const PopulationRequirement = {
    /** Empty is a bug: `resolve` on the empty registry misses with `MissReason.Unpopulated`. */
    Required: 'required',
    /** Empty is normal. */
    Optional: 'optional',
} as const;

export type PopulationRequirement = (typeof PopulationRequirement)[keyof typeof PopulationRequirement];

/**
 * Why a read did not produce one entry. The PHP enum has a fourth case, `Filtered`, for an entry an
 * authorizer hid. Nothing in this package authorizes, so it is not here.
 */
export const MissReason = {
    /** No entry at the key, and none under it. */
    Absent: 'absent',
    /** Several entries answer and none is the one: an admitted duplicate, or a key that names a branch. */
    Ambiguous: 'ambiguous',
    /** The registry declares itself required and nothing has registered into it. */
    Unpopulated: 'unpopulated',
} as const;

export type MissReason = (typeof MissReason)[keyof typeof MissReason];
