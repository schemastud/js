#!/usr/bin/env node
// The ratchet's entry (frame-foundation 79). It ALWAYS runs: there is no entry-point guard, so however a host reaches it (a
// direct path, a symlinked package, npm's .bin link, pnpm's generated shell shim, a wrapper or a loader) it measures and
// exits with the gate's verdict. The library lives in ./ratchet-lib.mjs (exported as `@schemastud/messages/ratchet`);
// import that, never this file, which runs the gate on import.
import { runRatchet } from './ratchet-lib.mjs';

try { process.exitCode = runRatchet(process.argv.slice(2)); }
catch (error) { console.error(error.message); process.exitCode = 1; }
