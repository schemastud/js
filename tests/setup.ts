/**
 * Shared test setup. Core tests run in node; react tests opt into jsdom via a
 * `// @vitest-environment jsdom` docblock.
 *
 * React tests render into a shared jsdom `document`; without an unmount between
 * tests each render's DOM accumulates and a `document.querySelector` would see a
 * prior test's markup. `afterEach(cleanup)` unmounts everything after each test.
 * `cleanup` is a no-op in the node environment (no `document`), so this is safe
 * for the framework-agnostic core tests too.
 */
import { afterEach } from 'vitest';

afterEach(async () => {
    if (typeof document === 'undefined') {
        return;
    }
    const { cleanup } = await import('@testing-library/react');
    cleanup();
});

export {};
