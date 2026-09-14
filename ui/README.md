# @schemastud/ui

The portable **foundation UI primitives** for the schemastud/beam stack — the generic-UI
dependency a rehomed component takes **statically**, instead of reaching into an app's
local `@/components/*`.

Ships: `Button`, `Badge`, `Card` (+ `CardHeader` / `CardTitle` / `CardDescription` /
`CardContent` / `CardFooter`), `Dialog`, `Input`, `Label`, `Select` / `SimpleSelect`,
`Switch`, a dependency-free `Popover`, a headless TanStack `DataTable` (with its shared
sort vocabulary), `Separator`, `Skeleton`, `Tooltip`, the `useIsMobile` hook, the full
`Sidebar` block (collapsible desktop rail ⟷ mobile `Sheet` drawer + every `Sidebar*` menu
part — the primitive a host account/app shell hangs its nav on), and `cn`.

## The two rules that make it portable

1. **Zero hard-coded colors.** Every primitive is skinned with semantic Tailwind tokens
   (`bg-primary`, `text-muted-foreground`, `border-input`, …) that resolve against the
   **host's** `@theme` variables. The host owns the palette; reskin = override the vars,
   never fork a component. (Beam token-var convention, rehome-components §5.)
2. **No app coupling — ever.** No `@/…`, no `sonner`, no `ziggy-js`, no `@inertiajs/*`.
   Enforced on every build by `npm run lint:imports` (rehome-components §8b).

## Semantic tone tokens

`StatTile` is the one primitive whose `tone` prop reaches past the shadcn base palette. The
five tones resolve to exactly four token classes plus the muted default:

| tone | class |
|---|---|
| `default` | `text-muted-foreground` |
| `active` | `text-signal` |
| `busy` | `text-info` |
| `warn` | `text-warning` |
| `danger` | `text-destructive` |

`text-destructive` comes with any shadcn theme. The other three do **not**: a host must declare
`--color-signal`, `--color-info` and `--color-warning` in its `@theme` block. The flagship's
`~/Herd/splicewire-app/ui/src/index.css` is the worked example — `--color-signal: var(--signal);`
and its two siblings, each pointing at a token the theme already defines in light and dark.

An undeclared token renders **untoned**, never a raw hue: Tailwind simply emits no rule for the
class, the glyph well keeps its inherited colour, and the tile stays legible. That is the whole
reason nothing here names a hue — a host re-treats a tone by re-declaring the token, never by
forking the component.

## Consuming under Tailwind v4

Tailwind v4 ignores symlinked `node_modules` by default, so a consumer must scan this
package's built `dist` for the utility classes it uses:

```css
@source '../../node_modules/@schemastud/ui/dist';
```

`react`, `react-dom`, `@radix-ui/react-dialog`, `@radix-ui/react-select`,
`@radix-ui/react-switch`, `@tanstack/react-table` and `lucide-react` are **peer**
dependencies — the host provides the single copy.

## Verify

- `npm run build` — tsup ESM + `.d.ts`.
- `npm run typecheck` — `tsc --noEmit` (also fails on any stray `@/` import).
- `npm run lint:imports` — the deny-list gate.
- `npm test` — isolation mount: primitives render off a plain fixture, no Laravel.
