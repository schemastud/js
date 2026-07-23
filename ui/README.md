# @schemastud/ui

The portable **foundation UI primitives** for the schemastud/beam stack — the generic-UI
dependency a rehomed component takes **statically**, instead of reaching into an app's
local `@/components/*`.

Ships: `Button`, `Badge`, `Dialog`, `Input`, `Label`, `Select` / `SimpleSelect`, a
dependency-free `Popover`, a headless TanStack `DataTable` (with its shared sort
vocabulary), and `cn`.

## The two rules that make it portable

1. **Zero hard-coded colors.** Every primitive is skinned with semantic Tailwind tokens
   (`bg-primary`, `text-muted-foreground`, `border-input`, …) that resolve against the
   **host's** `@theme` variables. The host owns the palette; reskin = override the vars,
   never fork a component. (Beam token-var convention, rehome-components §5.)
2. **No app coupling — ever.** No `@/…`, no `sonner`, no `ziggy-js`, no `@inertiajs/*`.
   Enforced on every build by `npm run lint:imports` (rehome-components §8b).

## Consuming under Tailwind v4

Tailwind v4 ignores symlinked `node_modules` by default, so a consumer must scan this
package's built `dist` for the utility classes it uses:

```css
@source '../../node_modules/@schemastud/ui/dist';
```

`react`, `react-dom`, `@radix-ui/react-dialog`, `@radix-ui/react-select`,
`@tanstack/react-table` and `lucide-react` are **peer** dependencies — the host provides
the single copy.

## Verify

- `npm run build` — tsup ESM + `.d.ts`.
- `npm run typecheck` — `tsc --noEmit` (also fails on any stray `@/` import).
- `npm run lint:imports` — the deny-list gate.
- `npm test` — isolation mount: primitives render off a plain fixture, no Laravel.
