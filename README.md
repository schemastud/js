# rjsf-registry

Generally-useful additions over [react-jsonschema-form](https://rjsf-team.github.io/react-jsonschema-form/) — none of which RJSF core has:

- **Predicate widget registry** — `registerWidget(predicateOrKey, widget)` resolves widgets by
  predicate over the schema node instead of RJSF's name-based model; first match wins, later
  registrations take precedence.
- **uiSchema derivation** — `buildUiSchema(schema, registry)` walks a schema and emits an RJSF
  uiSchema from schema-carried hints (`x-widget`, `x-placeholder`), so a form's behavior is
  declared where its shape is declared.
- **Configurable extension-keyword tolerance** — `createKeywordVocabulary({ keywords, patterns })`
  declares a host's `x-*` dialect; `createFormValidator()` builds an AJV8 validator that never
  trips strict mode on extension keywords. No vendor dialect is hardcoded.
- **Injected `$ref` fetcher seam** — `resolveExternalRefs(schema, fetcher)` pre-resolves external
  refs through a host-supplied async fetcher. Transport-agnostic: the host passes its own authed
  client; this package never imports one.
- **`SchemaForm`** — the base component wiring all of the above over `@rjsf/shadcn`, with
  registry injection via prop or `WidgetRegistryContext`.

This package is host-agnostic: it contains no vendor vocabulary beyond the unprefixed form
keywords it consumes itself (`x-widget`, `x-placeholder`). Vendor layers (dialects, pre-wired
forms) belong in adapter packages that depend on this one.

## Install

```sh
npm install @rushing/rjsf-registry
```

Peer dependencies: `@rjsf/core`, `@rjsf/shadcn`, `@rjsf/utils`, `@rjsf/validator-ajv8` (all ^6),
`react` (≥18).

## Usage

```tsx
import { SchemaForm, createWidgetRegistry } from '@rushing/rjsf-registry';

const registry = createWidgetRegistry();
registry.registerWidget((s) => s['x-widget'] === 'citation', CitationWidget);

<SchemaForm
    schema={schema}
    registry={registry}
    schemaFetcher={(ref) => api.get(ref).then((r) => r.data)}
    onSubmit={({ formData }) => save(formData)}
/>;
```

### Default resolution chain

1. `x-widget` explicit override (`textarea`, `radio`, `file`, `select`)
2. enum: ≤4 entries → radio; larger → RJSF's select default
3. format: `file` → file widget; `date`/`date-time`/`email`/`uri` → native inputs
4. everything else → RJSF defaults (the registry emits nothing)

### Quirks handled by `SchemaForm`

- Backends that serialize an empty associative payload as `[]` (PHP among them) get their
  formData coerced to `{}` against object schemas.
- `required` entries whose property type union includes `'null'` are relaxed at the form layer
  (`relaxNullableRequired`) — the write path stays the validation authority.
- Arrays without an `items` definition are hidden rather than rendered as RJSF error blocks.
