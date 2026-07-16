# Consolidation runbook — 7 standalone repos → one `@schemastud` workspace

One-time migration. The reversible foundation (root `package.json`, `tsconfig.base.json`,
Changesets, release workflow) is already in place and breaks nothing. The steps below are the
**destructive / outward-facing** tail — do them as one reviewed pass.

## Preconditions (blockers, as of pre-flight)

Two repos have uncommitted work; a history-preserving import only captures **committed** history, so
these must be clean first (commit or stash — don't lose the work):

- `blockdoc` — 2 modified files
- `facets` — 1 modified file

Also note (not blockers, just context — importing from the **local** repos captures these fine):
- `frame` is 3 commits ahead of its remote; `seam` is 1 ahead.
- `chat`, `facets`, `frame-remote` have **no remote** (local-only).

## Step 1 — clean the two dirty trees

```bash
cd ~/Workspaces/js/packages/schemastud
git -C blockdoc status && git -C blockdoc add -A && git -C blockdoc commit -m "wip: pre-monorepo snapshot"
git -C facets   status && git -C facets   add -A && git -C facets   commit -m "wip: pre-monorepo snapshot"
```

## Step 2 — build the monorepo repo in place, history preserved

Keeps every package at its current top-level path (so all `file:` overlays keep resolving).

```bash
cd ~/Workspaces/js/packages/schemastud
git init -b main
git add package.json tsconfig.base.json README.md MIGRATION.md .gitignore .changeset .github
git commit -m "chore: schemastud workspace scaffold"

for p in beam-mdx blockdoc chat facets frame frame-remote seam; do
  git remote add "src-$p" "./$p"
  git fetch "src-$p"
  # temporarily move the working tree aside so subtree can populate the prefix from history
  mv "$p" "$p.premove"
  git subtree add --prefix="$p" "src-$p" main
  rm -rf "$p.premove"          # subtree recreated $p from its own history
  git remote remove "src-$p"
  rm -rf "$p/.git" 2>/dev/null # (defensive; subtree won't nest a .git, but ensure none remains)
done
```

Result: one repo at `…/packages/schemastud`, seven packages at top level, each carrying its full
prior history under its path prefix. The old inner `.git` dirs are gone; nothing relocated.

> If you'd rather not preserve per-package history, the simpler path is: `rm -rf */.git`, then
> `git init && git add -A && git commit`. Loses history; keeps paths identical. Not recommended for
> `frame`/`seam` which have real unpushed history.

## Step 3 — prove it green

```bash
npm install
npm run build
npm run typecheck
npm run test
```

Fix any workspace-hoisting fallout (usually just a peer/devDep that a package assumed was local).
The React `resolve.dedupe` lesson still applies to any consumer, unchanged.

## Step 4 — create the GitHub monorepo + push  *(you)*

Create `schemastud/js` (or your preferred name) on GitHub, then:

```bash
git remote add origin git@github.com:schemastud/js.git
git push -u origin main
```

## Step 5 — publish to public npm  *(you — needs org + token)*

- Own the `schemastud` npm org (npm signup/org creation — your action; I can't create accounts).
- Add repo secret `NPM_TOKEN` = an npm **automation** token for the org.
- First publish can be manual to sanity-check, or let the workflow do it:

```bash
npm run changeset          # or hand-write .changeset/*.md for the first release
npm run version-packages
npm run release            # runs `changeset publish` → public npm
```

The `^0.1.0` consumers (`thingsontv`, `schemastud`, `audiostud`, `splicewire/splice`,
`splicewire-app/ui`→blockdoc) resolve from npm the moment the first versions land.

## Step 6 — repoint / retire  *(coordinate with the live FC/RCP work)*

- The `file:` overlays (`numero`, `stephenrushing`, `splicewire-app/ui`) keep working by path — no
  change required. Migrate them to published `^` ranges opportunistically, **not** mid-FC for
  `frame`/`frame-remote`.
- Archive the seven standalone GitHub repos (`schemastud/{beam-mdx,blockdoc,frame,seam,…}`) **after**
  the monorepo is pushed and the first publish is verified. Archive, don't delete — reversible.

## What stays mine vs. yours

- **Mine (done):** the reversible workspace foundation + this runbook.
- **Mine (on your go):** Steps 1–3 (clean dirty trees, history-preserving consolidation, prove green).
- **Yours (credentials / outward):** Step 4 push, Step 5 npm org + token + publish, Step 6 repo archival.
