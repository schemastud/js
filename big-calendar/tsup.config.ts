import { defineConfig } from 'tsup';

export default defineConfig({
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    // The host owns the single instance of each of these — never bundled into dist.
    // React (+ its JSX runtime) and react-query for shared context/hooks identity; and
    // react-big-calendar + date-fns — the commodity view engine and its localizer, HEAVY
    // generic deps the host already carries, so they land as peers (not bundled). The
    // 844-line theme.css + the thin Calendar re-export are the ONLY vendored-and-owned
    // artifacts; everything else here is authored around the RBC accessor/prop-getter seam.
    external: [
        'react',
        'react/jsx-runtime',
        'react-dom',
        '@tanstack/react-query',
        'react-big-calendar',
        'react-big-calendar/lib/addons/dragAndDrop',
        'date-fns',
    ],
});
