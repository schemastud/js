# @schemastud/messages

Typed messages with package-owned English defaults. The dependency-free core uses Laravel's colon placeholders and pipe plurals. It does not resolve PHP locale or realm fallback ladders: the host supplies an already resolved catalog, including each line's answering `sourceLocale`.

```ts
import { createMessages } from '@schemastud/messages';
const messages = createMessages({ 'messages.saved': 'Saved :name' });
messages.t('messages.saved', { name: 'Ada' });
```

`choice(key, count, parameters?)` applies explicit/interval conditions before positional selection and replaces parameters afterwards. Plural indexes follow the pinned Laravel selector, including normalization of locale aliases. Negative positional counts use Laravel 13's absolute-count behavior; explicit conditions and `:count` retain the original count. The committed shared fixture deliberately excludes negatives. Missing translated lines use the declared English default and English plural rules.

`number`, `date`, `relativeTime`, and `list` use the requested catalog locale. Without a catalog, formatters use `en-US`, realm is null and direction is `ltr`. Scalar parameters are strings, finite numbers, booleans or null; replacement is one pass and supports Laravel's capitalization variants. `pseudo: true` marks and expands text before substitution, preserving parameter values.

## React

Import `MessageProvider`, `useMessages` and `useMessageLocale` from `@schemastud/messages/react`. Mount the provider beside the host's frame kit, outside its construction. Its `value` is a `ClientCatalog`:

```tsx
<MessageProvider value={{ version: 1, locale: 'es', realm: null, direction: 'ltr',
  messages: { 'messages.saved': { text: 'Guardado :name', sourceLocale: 'es' } } }}>
  <App />
</MessageProvider>
```

Hooks work without a provider using English defaults. The context identity is shared through `Symbol.for('schemastud.messages.context.v1')`; catalogs remain scoped to each React render tree, including SSR. An incompatible ABI or React version refuses initialization. The installed dependency graph must contain one real messages runtime: the collector rejects duplicate copies even when versions match. Keep React and this package as peer dependencies in consuming packages.

Money formatting in `@schemastud/ui` uses an explicit money locale first, the message locale second, and `en-US` last. Currency remains required in a supplied money format and is never inferred from locale.

## Committed package catalogs

Export a static, committed JSON file at `./messages`, include it in the published files, and declare the marker in package.json:

```json
{"schemastud":{"messages":{"version":1,"catalog":"./messages"}}}
```

The JSON shape is `{ "version": 1, "package": "@vendor/package", "sourceLocale": "en", "namespace": "vendor-package", "sharesWith": null, "messages": { "vendor-package::messages.saved": "Saved" } }`. `sharesWith` may name the matching Composer owner, permitting the intentional PHP/JS shared namespace. Unrelated owners cannot claim the same namespace. The messages runtime itself additionally declares `runtimeAbi: 1` in its marker.

Package imperative keys use the allocated namespace and an item such as `messages.saved`. The six derived identity groups (`resources`, `data`, `enums`, `actions`, `nav`, `groups`) are reserved. Catalogs contain English strings, never executable modules or generated build output.

## Collector

Run from the host root:

```
schemastud-messages collect --out resources/messages/catalog.json --write
schemastud-messages collect --out resources/messages/catalog.json
```

`--out` is mandatory. Without `--write`, the command compares exact output bytes and fails on drift without rewriting. `--write` replaces the artifact atomically. Optional `--host-catalog <path>` supplies explicit unnamespaced host messages with `{ "version": 1, "sourceLocale": "en", "messages": { "messages.saved": "Saved" } }`.

Discovery includes the host root’s dependencies and devDependencies, since Vite hosts bundle production code from both, plus declared public workspace packages. Below the root it follows production/optional/peer dependencies, never transitive devDependencies. Private workspaces participate when reachable. Repeat `--exclude <package-name>` for genuinely dev-only fixtures; an excluded installed package with a catalog marker always fails collection, so a catalog cannot be silently dropped. Missing required root devDependencies also fail unless explicitly excluded. Workspace patterns support `*` path segments in package.json. pnpm-workspace.yaml is not read: mirror public workspace declarations in package.json before using the collector. The collector reads package metadata and static JSON exports only, never arbitrary JS or a recursive node_modules sweep. Missing required packages, conflicting catalogs/defaults/owners, unsupported versions, multiple runtime copies and malformed JSON fail before output is written.

The artifact is `{ "payload": { "version": 1, "packages": [...], "messages": { "key": { "default": "English", "owner": "@vendor/package" } } }, "digest": "sha256:…" }`. Package entries contain `name`, `namespace`, `sharesWith`, and `catalogDigest`. Digests use RFC 8785 canonical JSON and UTF-8 SHA-256; versions, timestamps and filesystem paths do not enter identity. Duplicate JSON members, lone surrogates, non-finite numbers and unsafe integer literals are rejected. The cross-language canonicalization fixture is in `tests/fixtures/jcs.json`.

Within this monorepo, UI resolves the adapter's types from source so its existing npm `prepare` can run before messages has built declarations. Published consumers use the adapter's exported declarations; the runtime import remains external.

Explicit/interval plural conditions in the shared contract use numeric endpoints, or one numeric endpoint and one `*`. PHP 8 nonnumeric comparison quirks for empty endpoints (such as `[,5]`) or `[*,*]` are outside this contract. Condition results use PHP’s ASCII trim set; non-ASCII whitespace is preserved.

Publish messages before or with UI. Hosts must install and dedupe the compatible messages peer before upgrading UI or linking its build into beam/tower-ux. React is an optional peer for core/collector-only installations; the React adapter requires it when used.


## Static display-copy ratchet

The Node-only `schemastud-message-ratchet --config <file>` compares current
counts to a committed baseline and never writes it. Comparison requires exact
counts: a lower count refuses as a stale baseline until `--write` records the
decrease, preventing removed copy from becoming a budget that can be spent again.
`--write` initializes a
missing baseline or lowers existing counts; an increase or package-set mismatch
refuses. UI/frame budgets are zero. The optional TypeScript >=5 peer is needed
only by this source scanner; the browser/core exports do not load it.

Config v1: `{ "version": 1, "baseline": "./message-ratchet.baseline.json",
"packages": { "package-name": ["src"] } }`. Roots resolve relative to the
config file. Every named root must exist and must not itself be excluded. Counts are per
package, including zero.
The baseline is `{ "version": 1, "counts": { "package-name": 0 } }`.

The AST scan covers literal JSX text and display attributes (including accessible
names), display object properties and parameter defaults, templates and logical
fallbacks (including `&&`), local constants, returned formatting copy, DOM text and
accessible-attribute writes, and window confirmation copy. Literal
substitutions in message calls are also checked. Technical attributes, type
syntax, tests/stories/fixtures, generated directories/declarations, dependencies and compiled
output are excluded. Authored/server data and runtime-computed strings are not
interpreted as catalog keys. This is a static display-position budget, not a proof
that arbitrary data-flow or third-party widgets contain no English. The rendered
catalog journeys provide that separate check.

Within this workspace: `npm run lint:messages` compares and
`npm run lint:messages:write` lowers. During the localization train, other
repositories carry config/baseline data only: run this candidate's Node CLI
against their config, with no install. Installing the released tool and wiring
host commands is owed after release; its owning ticket is TBD by root. The
workspace CI runs the read-only comparison as a required step.
