import type { TestRunnerConfig } from '@storybook/test-runner';

/**
 * Visual-regression SEAM (component-seams ticket 04/08): self-hosted Storybook test-runner +
 * Playwright, snapshots → `.tests/` (no external SaaS; Chromatic was rejected).
 *
 * WIRED BUT NOT BASELINED. Per ticket 08, the seam exists now but captures NO baselines yet —
 * baselining graduates as fog with the first catalog wave, when there are real stories to snapshot.
 * Until then the image-snapshot step is gated behind VR_SNAPSHOTS so a bare `test-storybook` run is
 * just the default per-story smoke (renders without error), and `.tests/` stays empty/uncommitted.
 *
 * To baseline later: `npx playwright install`, install `jest-image-snapshot`, then run with
 * `VR_SNAPSHOTS=1 test-storybook` to write the first `.tests/` baselines.
 */
const config: TestRunnerConfig = {
    async postVisit(page, context) {
        if (!process.env.VR_SNAPSHOTS) return;
        const { toMatchImageSnapshot } = await import('jest-image-snapshot');
        expect.extend({ toMatchImageSnapshot });
        const image = await page.screenshot();
        expect(image).toMatchImageSnapshot({
            customSnapshotsDir: '.tests/vr',
            customSnapshotIdentifier: context.id,
        });
    },
};

export default config;
