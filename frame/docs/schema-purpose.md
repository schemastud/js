# Schema purpose, presentation and read-only interaction

A producer can declare different write and read DTOs. Frame renders the schema it requests; it does
not infer a DTO from disabled inputs or a generated type-name string.

```tsx
// Write/create, including existing two-argument transport adapters.
<EditShell resource="requests" id={null} />
// Read-only detail whose record endpoint returns the declared read projection.
<EditShell resource="requests" id="1" readOnly schemaPurpose="read" />
```

| Axis | Values / responsibility |
| --- | --- |
| `SchemaPurpose` | `write` (default), `read`; selects the declared projection |
| `FormMode` | `bare`, `enriched`; strips/bridges host widget overrides |
| `readOnly` and injected `can` | Disable fields and prevent submission; server authorization remains authoritative |
| Widget contexts | edit/detail/list-column/etc participation, separate from DTO selection |

Create (`id === null`) always requests write, even if a caller passes read. A disabled editable
record retains the legacy write schema unless explicitly opted into read; denied update permission
does not prove that its record endpoint returns the read DTO. Heavy WidgetShell behavior remains
unchanged. No normal read schema should be paired with a narrower public/custom record response.

## Transport, hook and cache

```ts
getFormSchema(
  resource: string,
  form: FormMode,
  purpose?: SchemaPurpose,
  params?: Record<string, string>,
): Promise<SchemaNode>
useFormSchema(resource, form, purpose = 'write')
```

The producer's adapter must carry read to its server. For `schemastud/laravel-frame`, omitted/write
uses the existing `{prefix}/resources/{resource}/schema` URL; read uses `?purpose=read`.
The selected `schemastud/laravel-frame` candidate's `docs/resource-schemas.md`
describes generator modes, declared selector validation, resource reach and resolver obligations.
Use the matching local package candidate until that source is published.

Old two-argument transports still typecheck and serve default write exactly as before. A JavaScript
function silently ignoring a third argument is **not** read capability; new read behavior requires
the paired purpose-aware adapter/server and matching record projection. Frame does not negotiate
remote package versions.

Schema keys are `resourceQueryKey(transport, resource, 'form-schema', form, purpose)`; resource
prefix invalidation remains valid and the opaque authority suffix remains last. Read and write
cannot satisfy each other, including long stale-time caches. Schema placeholder data is disabled.
Replace the transport object when actor/realm/tenant authority changes, as required by facets'
transportScope contract; the random scope is not a persistent-cache/SSR hydration protocol.

The hook/shell owns loading/error/retry. A failed read schema is not replaced with a cached write
schema; disabled detail never offers Save. TypeScript types do not validate server payloads.
Generated manifest type names describe declarations; they are not dynamic JavaScript imports.

## Independent example and limits

[`examples/frame-schema-purpose`](../../examples/frame-schema-purpose) is a small executable
consumer importing exported Frame/Seam/facets contracts with its own transport and primitives.
It has no Beam application imports. The normal Frame shell renders create/write and detail/read,
with an in-memory create/action producer, warm-cache view switching, failure/retry, and legacy
actor-disabled editing. This proves that scoped client composition, not independent PHP CRUD,
authentication, durable storage, public DTO narrowing or a remote UI sandbox.

The catalogue's `Frame/SchemaPurpose` uses the same fixture for presentation/interaction. A story
alone is not independent installation proof; run the separately installed example as its README
specifies. Remote components can use their host's purpose-aware transport/schema; loader and
capability/version boundaries require their own proof.
