import { defineConfig } from 'tsup';

export default defineConfig({
    // Single browser-side React surface — pure runtime chrome, no build-time plugin.
    // `.` = the generic engine (react-rnd-free). `./os` = the Frame OS desktop layer (window
    // manager + the react-rnd-bound WindowFrame), split so engine-only consumers never pull react-rnd.
    entry: { index: 'src/index.ts', os: 'src/os/index.ts' },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    // React (and its JSX runtime) stay external — the host owns the single instance.
    // react-rnd is a real dependency but stays external too so the consumer dedupes React
    // through it (react-rnd peers on react); it is resolved at runtime, not inlined.
    external: ['react', 'react/jsx-runtime', 'react-dom', 'react-rnd'],
});
