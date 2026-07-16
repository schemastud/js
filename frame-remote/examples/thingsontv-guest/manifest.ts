/**
 * The thingsontv block's MANIFEST (RCP-06) — the small JSON object the host reads as DATA
 * BEFORE mounting the guest bundle. It declares the vocabulary MAJOR the block was built
 * against (1) and the brokered capabilities it will request. It is authored against the
 * SAME published typed surface as the component (`ComponentManifest` from
 * `@schemastud/frame-remote/sdk`), and it lives in its OWN file so it never rides inside
 * the executed guest bundle — the host gates the load from this data with no guest code
 * running.
 *
 * Note it asks for exactly `resolve` + `read_scoped` — the untrusted-publisher grant. It
 * never asks for `request_save` (first-party only); an over-ask would be refused at load.
 */
import type { ComponentManifest } from '@schemastud/frame-remote/sdk';

export const manifest: ComponentManifest = {
    vocabularyMajor: 1,
    capabilities: ['resolve', 'read_scoped'],
    tier: 'untrusted_publisher',
};
