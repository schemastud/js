/**
 * One segment: lowercase alphanumeric groups joined by `-`, `_` or `:`. A joiner may never lead,
 * trail or double.
 *
 * This is the PHP kernel's grammar, not its pattern text. The PHP pattern ends in `\z`, which
 * JavaScript does not have: in a JavaScript pattern `\z` matches a literal `z`, so the copied text
 * rejects every legal key that has no `z` in it and accepts `beamz` followed by anything, with no
 * syntax error. JavaScript's `$` without the `m` flag is the end of input, which is what `\z` means
 * in PHP. Do not add the `m` flag: with it `$` also matches before a line break.
 * `tests/pattern-trap.test.ts` pins both halves.
 */
export const SEGMENT_PATTERN = /^[a-z0-9]+(?:[-_:][a-z0-9]+)*$/;

export const SEPARATOR = '.';

/**
 * The segments of a key string, or null when it is not a legal key. Nothing is trimmed, folded or
 * repaired. The empty string is not a key. `pattern` is a parameter only so the pattern trap can be
 * tested through this code path.
 */
export function matchSegments(input: string, pattern: RegExp = SEGMENT_PATTERN): string[] | null {
    if (input === '') {
        return null;
    }

    const segments = input.split(SEPARATOR);

    return segments.every((segment) => pattern.test(segment)) ? segments : null;
}
