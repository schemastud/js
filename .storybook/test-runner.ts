import type { TestRunnerConfig } from '@storybook/test-runner';

/**
 * Visual-regression SEAM (component-seams ticket 04/08, BASELINED in ticket 14): self-hosted
 * Storybook test-runner + Playwright, snapshots → `.tests/vr` (no external SaaS; Chromatic rejected).
 *
 * BASELINED (ticket 14 — the first catalog wave). The seam captures a baseline PER STORY in BOTH
 * ambient color schemes (treatment-axes ticket 13: light AND dark are required). Because `.dark` is
 * a pure-CSS scheme flip (the seed in preview.css overrides the semantic tokens, no React re-render),
 * postVisit screenshots the settled story once light, toggles `.dark` on the preview root, and
 * screenshots again — writing `<story-id>-light` and `<story-id>-dark`. The image-snapshot step stays
 * gated behind VR_SNAPSHOTS so a bare `test-storybook` run is still just the per-story smoke; a
 * `VR_SNAPSHOTS=1 test-storybook` run writes/compares the committed baselines under `.tests/vr`.
 *
 * Refresh baselines after an intentional visual change: `VR_SNAPSHOTS=1 test-storybook -u`.
 */
const config: TestRunnerConfig = {
    async postVisit(page, context) {
        if (!process.env.VR_SNAPSHOTS) return;
        const { toMatchImageSnapshot } = await import('jest-image-snapshot');
        expect.extend({ toMatchImageSnapshot });

        const snapshot = async (scheme: 'light' | 'dark') => {
            await page.evaluate((dark) => {
                document.documentElement.classList.toggle('dark', dark);
            }, scheme === 'dark');
            const image = await page.screenshot();
            expect(image).toMatchImageSnapshot({
                customSnapshotsDir: '.tests/vr',
                customSnapshotIdentifier: `${context.id}--${scheme}`,
            });
        };

        // Ambient axis: both schemes are required baselines (ticket 13).
        await snapshot('light');
        await snapshot('dark');
        // Leave the preview in its default (light) state for the next story's smoke assertion.
        await page.evaluate(() => document.documentElement.classList.remove('dark'));
    },
};

export default config;
