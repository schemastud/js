# @schemastud/registry

A registry kernel for the client: keys, a registry, and an index of registries.

- A **key** is dot-separated lowercase segments, such as `beam.realm.overlays`. It is parsed without repair and
  compared segment by segment.
- A **registry** owns a root. It declares what a duplicate key does, records who registered each entry, and says why
  when a read misses.
- An **index** holds registries by root and finds which one owns a key, by longest segment prefix.

It is the TypeScript side of the registry kernel that `rushing/php-popcorn` ships in PHP, and it is proved against
that package's conformance corpus. It has no runtime dependency and no React. It is `private`: nothing depends on it
yet and it is not released. It scans nothing, authorizes nothing and fetches nothing.

```ts
import { MissReason, OnKeyDuplicate, RegistryMiss, createRegistry, createRegistryIndex } from '@schemastud/registry';

const routes = createRegistry<RouteComponent>({ root: 'frame.routes', onKeyDuplicate: OnKeyDuplicate.Supersede });

routes.register('home', HomePage, '@schemastud/frame'); // stored as frame.routes.home
routes.register('home', HostHomePage, 'app/host');      // supersedes, and the first is recorded

routes.resolve('home');                 // HostHomePage
routes.registrantOf('home');            // 'app/host'
routes.superseded('home')[0];           // { entry: HomePage, by: '@schemastud/frame', supersededBy: 'app/host', … }
routes.tryResolve('about');             // null

try {
    routes.resolve('about');
} catch (miss) {
    if (miss instanceof RegistryMiss && miss.reason === MissReason.Absent) { /* no such route */ }
}

const index = createRegistryIndex().describe(routes, '@schemastud/frame');

index.routeTo('frame.routes.home');     // routes
index.routeTo('frame.route.home');      // null: compared by segment, not by character
index.registrantOf('frame.routes');     // '@schemastud/frame'
```

## Public interface

Everything the package exports. `tests/exports.test.ts` fails when the exported values and this list differ.

### Keys

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
| `key.underRoot(root)` | The key as a registry rooted at `root` stores it: untouched when at or under the root, otherwise with the root joined on the front. |
| `RegistryKey` (type) | `{ segments, display }`: how any key is carried. `Key` is one. |
| `foreignKey(segments, display)` | A `RegistryKey` that is not in the canonical grammar, carried as given. |
| `keysEqual(a, b)` | Segment equality for any two `RegistryKey`s. |
| `InvalidRegistryKey` | The error `parse` throws. Also thrown for a registry rooted at the zero-segment root. |

### A registry

| Export | What it is |
|---|---|
| `createRegistry<T>(declaration)` | A new, empty `Registry<T>`. `declaration` is `{ root, onKeyDuplicate?, populationRequirement?, description? }`; the defaults are `Supersede`, `Optional` and `null`. The root is a dotted string or a `Key` and must have at least one segment. |
| `registry.declaration` | The declaration with its defaults filled in: `{ root: Key, onKeyDuplicate, populationRequirement, description }`. Frozen. |
| `registry.register(key, entry, by)` | Writes an entry and returns the registry. `by` is who is registering it, a string or `null`; it is a required argument. A taken key does what the registry declared. |
| `registry.has(key)` | Whether an entry is at exactly this key. |
| `registry.resolve(key)` | The one entry at this key. Throws `RegistryMiss` with a `reason` otherwise. |
| `registry.tryResolve(key)` | The same, with `null` for an absent or unpopulated miss. Ambiguity still throws. |
| `registry.matches(key)` | Every entry at or under this key, in registration order. |
| `registry.keys()` | Every key that holds an entry, absolute, in registration order, each once. |
| `registry.registrantOf(key)` | Who registered the entry at exactly this key, or `null`. |
| `registry.superseded(key)` | What was displaced at exactly this key, oldest first: `{ key, entry, by, supersededBy, sequence }` each. |
| `registry.keyFor(name)` | The key for a name, for any string, without throwing. A legal key is joined to the root; any other string is carried as one segment under the root. |
| `registry.names()` | The names the registry holds, relative to its root, in registration order, each once. The inverse of `keyFor`. |
| `Registry<T>`, `RegistryDeclaration`, `RegistryDeclarationInput`, `Superseded<T>` (types) | The shapes above. |

Every `key` argument is a `RegistryKey` or a string. A string is parsed, so an illegal one throws
`InvalidRegistryKey` before anything is looked up.

### The enums

Each is an object of string values and a type of the same name. The member names are the PHP kernel's
case names and the values are its backed values.

| Export | Values |
|---|---|
| `OnKeyDuplicate` | `Supersede` `'supersede'`, `Reject` `'reject'`, `Admit` `'admit'` |
| `PopulationRequirement` | `Required` `'required'`, `Optional` `'optional'` |
| `MissReason` | `Absent` `'absent'`, `Ambiguous` `'ambiguous'`, `Unpopulated` `'unpopulated'` |

### The errors

| Export | Thrown when | Carries |
|---|---|---|
| `RegistryMiss` | `resolve` does not find one entry. | `key`, `reason`, `candidates` |
| `AmbiguousRegistryMatch` | Several entries answer. It extends `RegistryMiss`, with `reason` `'ambiguous'`. | the same; `candidates` is each `{ key, by }` considered |
| `DuplicateRegistryKey` | `register` is offered a taken key under `Reject`. Not a `RegistryMiss`. | `key`, `incoming`, `existing` (the two registrants) |
| `UnregisteredRegistry` | `index.ownerOf` finds no registry for a key. Not a `RegistryMiss`. | `key`, `roots` |
| `MissCandidate` (type) | | `{ key, by }` |

### An index

| Export | What it is |
|---|---|
| `createRegistryIndex()` | A new `RegistryIndex`, holding only itself at the zero-segment root. |
| `index.describe(registry, by, owner?)` | Takes a registry in at the root it declares and returns the index. `by` is who describes it, a string. `owner` is the wrapper object a caller thinks of as the registry, if there is one. |
| `index.routeTo(key)` | The registry whose root is the longest segment prefix of the key, or `null`. |
| `index.ownerOf(key)` | The same, throwing `UnregisteredRegistry` in place of `null`. |
| `index.owner(root)` | What is described at exactly this root: the `owner` object if `describe` got one, otherwise the registry, otherwise `null`. |
| `index.registrantOf(root)` | Who described the registry at exactly this root, or `null`. |
| `index.keys()` | Every described root, the index's own first. |
| `index.superseded(root)` | The registries a later `describe` of the same root displaced, each with both registrants. |
| `RegistryIndex` (type) | The index. It extends `Registry<Registry<unknown>>`, so it also has `declaration`, `has`, `resolve`, `tryResolve`, `matches`, `keyFor`, `names` and `register`, all reading or writing roots. Use `describe` to add a registry; `register` writes one at a key without checking it is the registry's root. |

## What a registry does

- **Relative in, absolute out.** A registry rooted at `beam.resources` stores `register('invoices', …)` as
  `beam.resources.invoices`. A key already at or under the root is left as it is. Reads take either spelling, and
  `keys()` returns absolute keys. A key that sits under some other root is read as relative and joined: the registry
  cannot tell that from a typo.
- **Only a canonical key is joined to the root.** A key made with `foreignKey` is stored with exactly the segments it
  was given. It is under the root only when those segments begin with the root's. One that does not is outside the
  root: `keys()` lists it and `resolve` finds it, but `matches(root)` does not return it, an index does not route to
  it, and the same name in two registries is the same key. Do not build these by hand for names: use `keyFor`, below.
- **A duplicate does what the registry declared.**
  - `Supersede` (the default): the later write takes the key. It keeps the displaced entry's place in the order, so
    overriding one entry does not reorder a list. The displaced entry is recorded with who registered it and who
    displaced it, and is never returned by a read.
  - `Reject`: `register` throws `DuplicateRegistryKey`, naming both registrants. The first entry stays.
  - `Admit`: both entries live under the key, each in its own place. `matches` returns both. `resolve` of that key
    throws `AmbiguousRegistryMatch`. `registrantOf` answers with the first.
- **A miss says why.** `resolve` throws a `RegistryMiss` whose `reason` is:
  - `unpopulated`: the registry declares `Required` and holds nothing. Checked first.
  - `ambiguous`: the key holds several admitted entries, or it names a branch (nothing is at the key and entries
    are under it). This is an `AmbiguousRegistryMatch`, and `tryResolve` throws it too: a null would hide a
    duplicate registration.
  - `absent`: nothing is at the key or under it.
- **`resolve` is flat.** It never walks up to a parent key and never reaches down to a lone child.
- **Order is registration order**, and it is the only order: there is no rank or priority.
- **A registrant is on every write.** `by` has no default. Pass `null` only when there is nobody to name; a miss or a
  duplicate message is then less useful.

## Wrapping a registry that is keyed by names

A package that keeps its own `registerX(name, entry)` and `resolveX(name)` over a registry has names, not keys, and
most real names are not legal keys: `DocsLayout`, `contentSection`, `Admin/Users`, a string an author typed. Two
methods carry a name in and out, and neither throws for any string.

- `registry.keyFor(name)` is the key for a name. A legal key (`home`, `tenants.index`) is parsed and joined to the
  root, as `register('home', …)` would do. Any other string becomes **one segment under the root**, carried as it
  is: in a registry rooted at `beam.ux.chrome.layouts`, `DocsLayout` is the key that displays
  `beam.ux.chrome.layouts.DocsLayout`. So `matches(root)` returns it, an index routes to it, and `DocsLayout` in a
  sibling registry rooted at `beam.ux.chrome.templates` is a different key.
- `registry.names()` is the names the registry holds, in registration order, each once. It is what `routeNames()`
  or a list of registered modes returns.

```ts
const layouts = createRegistry<Layout>({ root: 'beam.ux.chrome.layouts' });

function registerLayout(name: string, layout: Layout): void {
    layouts.register(layouts.keyFor(name), layout, '@splicewire/beam-ux');
}

function resolveLayout(name: string): Layout | undefined {
    const key = layouts.keyFor(name);

    return layouts.has(key) ? layouts.resolve(key) : undefined;
}

const registeredLayoutNames = (): string[] => layouts.names();
```

**`tryResolve` is not a drop-in for `Map.get`.** It returns `null` for a name nothing is registered under, but it
throws `AmbiguousRegistryMatch` for a name that is a branch of registered names. With `tenants.index` and
`tenants.edit` registered, a `Map` answered `undefined` for `tenants`; `tryResolve('tenants')` throws. `has` is exact
and never ambiguous (`has('tenants')` is false), so a wrapper that must answer its own miss value for any string
writes `has(key) ? resolve(key) : missValue`, as above. Under `Admit` a name registered twice still throws from
`resolve`; read it with `matches(key)`.

Passing a bare string to `has`, `resolve` or `register` parses it, and throws `InvalidRegistryKey` for a name that
is not a legal key. Pass `keyFor(name)` wherever the string is a name.

A name comes back from `names()` as it went in to `keyFor`, with these exceptions:

- A legal key that begins with the registry's own root is read as already absolute. In a registry rooted at
  `frame.routes`, the name `frame.routes.home` is the same key as `home` and comes back as `home`, and the name
  `frame.routes` is the root itself and comes back as `''`.
- The empty string is carried as an empty segment under the root and comes back as `''`. That is the same name an
  entry at the root itself has, though the two are different keys.
- A key registered by other means than `keyFor` is named by taking the root off and joining what is left with dots,
  or by its display string when it is not under the root.

A canonical key is recognised by a registered symbol, not by `instanceof`, so a `Key` built by a second copy of this
package in the same bundle is still joined to the root.

`Filtered` is a fourth miss reason in the PHP kernel, for an entry an authorizer hid from the caller. Nothing in this
package authorizes, so it is not a miss reason here. A browser is to receive a tree the server already filtered.

## What an index does

- **Routing is by longest segment prefix.** With `beam` and `beam.realm` described, `beam.realm.overlays` routes to
  `beam.realm` and `beam.particle` routes to `beam`. An exact hit on a root counts. `beam.realms` is not under
  `beam.realm`.
- **The index's own root is not a fallback.** It is the zero-segment root, a prefix of every key. It answers only
  `routeTo(Key.root())`, which returns the index. A key no described root claims routes to `null`.
- **`routeTo('')` throws.** The root has no string spelling.
- **A duplicate root is recorded, not fatal.** A second registry described at a taken root takes it, and
  `superseded(root)` returns the first with both registrants.
- **No registry but the index sits at the zero-segment root.** `createRegistry` and `describe` both refuse it.

Not built here: registrars and scans, authorization and filtered reads, lazy or baked membership, removing an entry
or a registry, child and descendant listings, and a record of entries one described registry holds at an address a
nested one owns.

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

Every section is driven: `grammar`, `equality` and `hierarchy` through `Key`, and `routing` through the index. The
`routing` section opens with a `$comment` entry that is a note to the reader; the driver drops it, as the PHP driver
does, and fails if no case is left.

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
