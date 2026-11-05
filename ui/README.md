# @schemastud/ui

The portable **foundation UI primitives** for the schemastud/beam stack — the generic-UI
dependency a rehomed component takes **statically**, instead of reaching into an app's
local `@/components/*`.

Ships: `Button`, `Badge`, `Card` (+ `CardHeader` / `CardTitle` / `CardDescription` /
`CardContent` / `CardFooter`), `Dialog`, `Input`, `Label`, `Select` / `SimpleSelect`,
`Switch`, a dependency-free `Popover`, a headless TanStack `DataTable` (with its shared
sort vocabulary), `Separator`, `Skeleton`, `StatTile` (see [Semantic tone tokens](#semantic-tone-tokens)),
`Tooltip`, the `useIsMobile` hook, the full
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

## Motion

The motion vocabulary ships as a stylesheet. Import it after Tailwind and `tw-animate-css`:

```css
@import 'tailwindcss';
@import 'tw-animate-css';
@import '@schemastud/ui/motion.css';
```

It holds the `--splice-motion-*` tokens (under `:where(:root)`, so a host's `:root` value wins),
the `motion-standard` / `route-enter` / `list-cross-fade` utilities, and the state transitions
ruled in owner-review 18: overlays enter in 200 ms and leave in 140 ms with short travel (keyed on
the primitives' `data-slot` hooks), `SaveButton` / `MotionFaces` hold their width while the label
fades (B1), `DetailSwap` soft-cuts a desktop detail or pushes/backs a phone stack (C1/C2),
`ChangedCell` rolls only a changed cell (D3), and `MotionRow` / `useFlip` open, close and re-sort
the operator's own rows (D2). Under `prefers-reduced-motion: reduce` each piece drops its travel
and keeps its fade.

## Verify

- `npm run build` — tsup ESM + `.d.ts`.
- `npm run typecheck` — `tsc --noEmit` (also fails on any stray `@/` import).
- `npm run lint:imports` — the deny-list gate.
- `npm test` — isolation mount: primitives render off a plain fixture, no Laravel.

### Money presentation

Mount `MoneyFormatProvider` once with the host's served `{ currency, locale, minorDigits?, costMaxDigits? }`.
`useMoneyFormat()` returns `(amount, options?) => string`; the pure `formatMoney(amount, options?, format?)`
uses the same policy. Amounts are currency units, never integer cents. No caller switches automatically.

`mode: 'charge'` (default) uses ISO currency minor units unless overridden. `cost` and `rate` keep up to
`costMaxDigits` (default 6). A nonzero amount below that display cap reads “less than” the final place;
a negative one reads “greater than” its negative floor. Locale/currency apply to both. Negative zero
is suppressed. Invalid amounts/digit ranges throw instead of fabricating a cost.

Use `price: true` only for prices: a zero then reads “Free”. Recorded zeros remain formatted zero.
Rows may supply `basis: 'unpriced'` (“Not priced”), `'priced'` (normal amount), or `'replayed'`
(amount plus “· replayed”). An explicit `basis: null` means the pricing fact is unknown and reads
“Pricing unknown”; an omitted basis keeps ordinary formatting for older/charge callers. Do not infer basis from the amount. Missing rows and uncapped limits
remain the consumer's separate absence/limit states. This API does not change accounting rounding.
