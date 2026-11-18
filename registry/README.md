# @schemastud/registry

Registry keys for the client. A key is dot-separated lowercase segments, such as `beam.realm.overlays`. This package
parses one without repairing it, compares two, and answers parent and is-under segment by segment.

It is the TypeScript side of the registry kernel that `rushing/php-popcorn` ships in PHP, and it is proved against
that package's conformance corpus. It has no runtime dependency and no React. It is `private`: nothing depends on it
yet and it is not released.

```ts
import { Key } from '@schemastud/registry';

const key = Key.parse('beam.realm.overlays');

key.segments;                // ['beam', 'realm', 'overlays']
key.parent()?.display;       // 'beam.realm'
key.isUnder('beam.realm');   // true
Key.parse('beam.realms').isUnder('beam.realm'); // false: compared by segment, not by character

Key.tryParse('Beam.Realm');  // null: uppercase is refused, never folded
Key.parse(' beam');          // throws InvalidRegistryKey: nothing is trimmed
```

## Public interface

Everything the package exports:

| Export | What it is |
|---|---|
| `Key.parse(input)` | The key for a string. Throws `InvalidRegistryKey` when the string is not a legal key. |
| `Key.tryParse(input)` | The same, returning `null` in place of throwing. |
| `Key.root()` | The zero-segment key, the root of the whole tree. The only way to get it. |
| `Key.of(keyOrString)` | Passes a key through untouched (any `RegistryKey`); parses a string. |
| `key.segments` | The segments, outermost first. Frozen. |
| `key.display` | The dotted rendering. Empty for the root. `String(key)` gives the same. |
| `key.equals(other)` | Whether the two keys have the same segments. |
| `key.parent()` | The key one segment shallower. `null` for a single-segment key and for the root. |
| `key.isUnder(keyOrString)` | Whether the key sits strictly below the other, segment by segment. A key is not under itself. |
| `RegistryKey` (type) | `{ segments, display }`: how any key is carried. `Key` is one. |
| `foreignKey(segments, display)` | A `RegistryKey` that is not in the canonical grammar, carried as given. |
| `keysEqual(a, b)` | Segment equality for any two `RegistryKey`s. |
| `InvalidRegistryKey` | The error `parse` throws. |

## Rules a caller relies on

- **Parsing never repairs.** No case folding, no trimming, no alternate separator. `.` separates segments; `-`, `_`
  and `:` may join groups inside a segment but never lead, trail or double.
- **The root has no string spelling.** `Key.parse('')` throws: an empty string from config or a request is a
  mistake, not an address. `Key.root()` is the only way to the zero-segment key, and a wire format must not treat
  its empty display as "absent".
- **A key that is not canonical is carried, never re-parsed.** A key the PHP side spells another way (a URI, say)
  arrives as `{ segments, display }` and goes through `foreignKey`. Its identity is its segments. Its display is for
  showing only, and nothing here parses it.
- **Store the key, not its rendering.** `display` does not round-trip for every key type, so anything that keeps a
  key keeps the `RegistryKey`.

## The corpus

`corpus/registry-key.json` is a byte-for-byte copy of
`rushing/php-popcorn`'s `tests/Fixtures/conformance/registry-key.json`, the file the PHP kernel's own suite runs.
The tests read their cases from it; none are written out in a test file.

- `npm run corpus:sync -w @schemastud/registry` copies the PHP package's file over the vendored copy. It is the only
  thing that writes the copy.
- `tests/corpus-currency.test.ts` compares the two files and fails when they differ. It never writes, and there is no
  flag or environment variable that makes it.

Both look for the PHP file at
`~/Workspaces/php/packages/rushing/php-popcorn/tests/Fixtures/conformance/registry-key.json`, or at the path in
`SCHEMASTUD_REGISTRY_CORPUS_SOURCE` when that is set. When the default path is not on disk (a clone of this repo
alone, or CI), the currency test is reported as **skipped**, with a reason that says the copy was not checked. It
does not pass. The run summary shows `1 skipped`; `npx vitest run --reporter=verbose` prints the reason. When the
variable names a file that does not exist, the test fails.

This package drives the `grammar`, `equality` and `hierarchy` sections. The `routing` section is for the registry
index, which is not built yet.

## The pattern is ported by grammar, not by text

The PHP segment pattern ends in `\z`, PHP's end-of-input anchor. JavaScript has no `\z` and reads it as a literal
`z`, with no syntax error. Copied as written, the pattern refuses every legal key that has no `z` in it and accepts
`beamz` followed by anything. This package uses `$` with no flags, which in JavaScript means the end of input.
`tests/pattern-trap.test.ts` runs the corpus through both patterns and pins the difference.

## Development

```sh
npm run test -w @schemastud/registry
npm run typecheck -w @schemastud/registry
npm run build -w @schemastud/registry
```
