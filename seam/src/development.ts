/**
 * Whether this is a development run: `process.env.NODE_ENV` when the runtime or the bundler defines it (`'production'`
 * is not development; any other value is), else Vite's `import.meta.env.DEV`. The one place seam and frame decide it
 * for the unbound marker (ruling 01 §3). Read per call, so a test can flip `NODE_ENV` between renders.
 */
export function isDevelopment(): boolean {
    const nodeEnv = typeof process !== 'undefined' ? process.env?.NODE_ENV : undefined;
    if (nodeEnv !== undefined) return nodeEnv !== 'production';
    return Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);
}
