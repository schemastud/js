import type { TestRunnerConfig } from '@storybook/test-runner';
import { getStoryContext } from '@storybook/test-runner';

/**
 * Visual-regression SEAM (component-seams tickets 04/08, BASELINED in ticket 14; structural
 * matrix added in ticket 37): self-hosted Storybook test-runner + Playwright, snapshots →
 * `.tests/vr` (no external SaaS; Chromatic rejected). Shared ambient and structural pattern across
 * schemastud / beam / splice; beam and splice also apply their stories' named viewport globals.
 *
 * TWO AXIS KINDS (treatment-axes ticket 13):
 *
 *   • AMBIENT — `colorScheme` = light AND dark, on EVERY story. `.dark` is a pure-CSS scheme
 *     flip (the seed in preview.css overrides the semantic tokens, no React re-render), so we
 *     toggle `.dark` on the preview root and re-screenshot.
 *
 *   • STRUCTURAL (ticket 36 authored the cascade; ticket 37 proves it reaches pixels) —
 *     `canvas` ([data-canvas=flat|dotted] → `--canvas-bg`) and `density`
 *     ([data-density=comfortable|compact] → `--density-*`). These are CAPABILITY-GATED: a
 *     story opts in per treatment-axes' "absent-not-a-gap" rule, else it is NOT snapshotted
 *     across them (avoids 4×–8×-ing every leaf baseline for an axis it never reads). Opt in
 *     with a story/meta parameter:
 *
 *         parameters: { vr: { canvas: true } }        // + density: true for collections
 *
 *     The matrix sets the attribute at the DEPLOYMENT ROOT (documentElement — the `:root` the
 *     preview.css cascade and a satellite both target), then screenshots — proving a
 *     root-level override RE-TREATS a component that never set the attribute itself (the
 *     satellite deployment-root cascade, ADR-0092 / component-seams ticket 32). A story whose
 *     consumer pins the attribute on its own wrapper won't move under the root flip and should
 *     NOT opt in; a demonstrator that lets the treatment inherit from root is what opts in.
 *
 * Snapshot identifiers are ADDITIVE: `<story-id>--<scheme>` when no structural axis is opted in
 * (identical to the pre-ticket-37 baselines — nothing churns), extended to
 * `<story-id>--<scheme>--canvas-<v>--density-<v>` for opted-in stories.
 *
 * The image-snapshot step stays gated behind VR_SNAPSHOTS, so a bare `test-storybook` run is
 * just the per-story smoke; `VR_SNAPSHOTS=1 test-storybook` writes/compares the committed
 * baselines under `.tests/vr`. Refresh after an intentional visual change:
 * `VR_SNAPSHOTS=1 test-storybook -u`.
 *
 * ENV NOTE: baselining is owner-env — the CI sandbox cannot launch Chromium for the runner.
 */

type StructuralAxes = { canvas?: boolean; density?: boolean };
type Scheme = 'light' | 'dark';

const config: TestRunnerConfig = {
    async postVisit(page, context) {
        if (!process.env.VR_SNAPSHOTS) return;
        const { toMatchImageSnapshot } = await import('jest-image-snapshot');
        expect.extend({ toMatchImageSnapshot });

        // Capability-gated axes are opted in per story via `parameters.vr` (absent → ambient-only,
        // preserving every pre-ticket-37 baseline).
        const storyContext = await getStoryContext(page, context);
        const vr = (storyContext.parameters?.vr ?? {}) as StructuralAxes;
        const canvasValues = vr.canvas ? (['flat', 'dotted'] as const) : ([undefined] as const);
        const densityValues = vr.density ? (['comfortable', 'compact'] as const) : ([undefined] as const);

        // Drive the ambient + structural cascade from the DEPLOYMENT ROOT, exactly as a satellite
        // would re-declare at its root — no per-component wiring, zero React re-render.
        const applyRoot = (scheme: Scheme, canvas?: string, density?: string) =>
            page.evaluate(
                ({ dark, canvas, density }) => {
                    const root = document.documentElement;
                    root.classList.toggle('dark', dark);
                    if (canvas) root.setAttribute('data-canvas', canvas);
                    else root.removeAttribute('data-canvas');
                    if (density) root.setAttribute('data-density', density);
                    else root.removeAttribute('data-density');
                },
                { dark: scheme === 'dark', canvas, density },
            );

        // SETTLE before every shot (launch follow-ups s05, the load-dependent flakes). A story is not done when its
        // `play` resolves: an IntersectionObserver delivers its first entries a frame or two later (Nav/OnThisPage's
        // scroll-spy highlight), and a state change re-renders after the assertion that triggered it (EditShell
        // BackgroundReadFailed). So wait for webfonts, then for the DOM to stay unchanged for three consecutive animation
        // frames (capped, so a story that never stops mutating still gets shot and fails visibly), and shoot with CSS
        // animations and transitions finished (`animations: 'disabled'`): the `.dark` flip would otherwise catch any
        // `transition-colors` element mid-fade. A timer-driven change is NOT covered by frame quiet; the story waits for it.
        const settle = () =>
            page.evaluate(async () => {
                await document.fonts.ready;
                await new Promise<void>((resolve) => {
                    let quiet = 0;
                    let frames = 0;
                    const observer = new MutationObserver(() => {
                        quiet = 0;
                    });
                    observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
                    const tick = () => {
                        quiet += 1;
                        frames += 1;
                        if (quiet >= 3 || frames >= 120) {
                            observer.disconnect();
                            resolve();
                        } else requestAnimationFrame(tick);
                    };
                    requestAnimationFrame(tick);
                });
            });

        const snapshot = async (scheme: Scheme, canvas?: string, density?: string) => {
            await applyRoot(scheme, canvas, density);
            await settle();
            const image = await page.screenshot({ animations: 'disabled' });
            const identifier = [scheme, canvas && `canvas-${canvas}`, density && `density-${density}`]
                .filter(Boolean)
                .join('--');
            expect(image).toMatchImageSnapshot({
                customSnapshotsDir: '.tests/vr',
                customSnapshotIdentifier: `${context.id}--${identifier}`,
            });
        };

        for (const scheme of ['light', 'dark'] as const) {
            for (const canvas of canvasValues) {
                for (const density of densityValues) {
                    await snapshot(scheme, canvas, density);
                }
            }
        }

        // Restore the preview root to its default (light, no structural overrides) so the next
        // story's smoke assertion runs against the wired ambient environment.
        await page.evaluate(() => {
            const root = document.documentElement;
            root.classList.remove('dark');
            root.removeAttribute('data-canvas');
            root.removeAttribute('data-density');
        });
    },
};

export default config;
