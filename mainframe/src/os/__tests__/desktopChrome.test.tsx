/**
 * The realm-AGNOSTIC desktop chrome (editor-promotion ticket 07 / ADR-0017).
 *
 * Verifies: (a) `buildDesktopChrome` contributes the brand/status/backdrop/dock/status-line into an
 * `os` injection that renders as a live desktop; (b) the dock renders a tile per app, highlights the
 * active one, opens the launcher, and routes a locked tile to the upsell (never a window); (c) the
 * launcher grid lists the apps; (d) the operator overlay renders its orb + toggles the host launcher.
 *
 * The whole point of the tier: NONE of this imports a beam realm/manifest type — the roster is a flat
 * `DesktopApp[]`, `locked` a plain boolean.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MainframeProvider, MainframeOutlet } from '../../react';
import {
    buildDesktopChrome,
    OperatorOverlay,
    type DesktopApp,
} from '../desktopChrome';
import { createMainframeRegistry, createSlotRegistry } from '../../index';
import type { MainframeInjection } from '../../index';

/** A minimal window injection so a `DesktopApp` can open a real (trivial) surface. */
function surfaceInjection(label: string): MainframeInjection {
    const slots = createSlotRegistry();
    const mainframes = createMainframeRegistry();
    mainframes.register('surface', ({ slots: s }) => <div>{s.node('main' as never) ?? label}</div>);
    slots.contribute({ slot: 'main', key: 'm', node: <div data-testid={`surface-${label}`}>{label}</div> });
    return { slots, mainframes };
}

function app(over: Partial<DesktopApp> & { key: string; title: string }): DesktopApp {
    return { mode: 'surface', injection: surfaceInjection(over.title), ...over };
}

const APPS: DesktopApp[] = [
    app({ key: 'site', title: 'Site', realm: 'SITE', accent: '#f00', route: '/', subtitle: 'Public' }),
    app({ key: 'user', title: 'Account', realm: 'USER', accent: '#0f0', route: '/account', subtitle: 'Authed' }),
    app({ key: 'pro', title: 'Pro', realm: 'PRO', accent: '#00f', locked: true, upsell: { title: 'Go Pro', cta: 'Upgrade' } }),
];

function renderDesktop(onNavigate = vi.fn()) {
    const injection = buildDesktopChrome({
        apps: APPS,
        brand: <span data-testid="brand">brand</span>,
        status: <span data-testid="status">status</span>,
        backdrop: <span data-testid="backdrop">back</span>,
        statusLine: <span data-testid="statusline">bus</span>,
        activeKey: 'user',
        onNavigate,
    });
    const result = render(
        <MainframeProvider injection={injection}>
            <MainframeOutlet mode="os" ctx={{ os: { apps: APPS, initialOpen: [] } }} />
        </MainframeProvider>,
    );
    return { ...result, onNavigate };
}

describe('buildDesktopChrome', () => {
    it('contributes brand / status / backdrop / dock / status-line into a live os desktop', () => {
        const { container } = renderDesktop();
        expect(screen.getByTestId('brand')).toBeTruthy();
        expect(screen.getByTestId('status')).toBeTruthy();
        expect(screen.getByTestId('backdrop')).toBeTruthy();
        expect(screen.getByTestId('statusline')).toBeTruthy();
        expect(container.querySelector('.os-dock')).not.toBeNull();
    });

    it('renders a dock tile per app; the active one is highlighted; a locked one is a lock tile', () => {
        const { container } = renderDesktop();
        const tiles = container.querySelectorAll('.dock-app');
        expect(tiles.length).toBe(3);
        // Active user tile carries `.open`.
        expect(container.querySelector('.dock-app.open')?.textContent).toContain('Account');
        // The locked pro tile is a lock tile.
        expect(container.querySelector('.dock-app.is-locked')?.textContent).toContain('Pro');
    });

    it('routes an unlocked dock tile through onNavigate (host owns routing), not a window', () => {
        const { container, onNavigate } = renderDesktop();
        const siteTile = [...container.querySelectorAll('.dock-app')].find((b) => b.textContent?.includes('Site'))!;
        fireEvent.click(siteTile);
        expect(onNavigate).toHaveBeenCalledTimes(1);
        expect(onNavigate.mock.calls[0][0].key).toBe('site');
    });

    it('a locked tile opens the upsell popover — never navigates or opens a window', () => {
        const { container, onNavigate } = renderDesktop();
        const proTile = container.querySelector('.dock-app.is-locked')!;
        fireEvent.click(proTile);
        expect(onNavigate).not.toHaveBeenCalled();
        expect(container.querySelector('.upsell-pop')).not.toBeNull();
        expect(container.querySelector('.upsell-title')?.textContent).toBe('Go Pro');
    });

    it('the launcher lists every app in its grid', () => {
        const { container } = renderDesktop();
        fireEvent.click(container.querySelector('.dock-launch')!);
        const grid = container.querySelector('.launcher-grid')!;
        expect(grid.querySelectorAll('.launcher-app').length).toBe(3);
    });
});

describe('OperatorOverlay', () => {
    it('renders the orb and toggles the host-rendered launcher', () => {
        const resolveWindow = () => null;
        const renderLauncher = vi.fn(() => <div data-testid="op-launcher">menu</div>);
        const { container } = render(
            <OperatorOverlay stableKeys={[]} resolveWindow={resolveWindow} renderLauncher={renderLauncher} />,
        );
        const orb = container.querySelector('.op-orb')!;
        expect(orb).not.toBeNull();
        expect(container.querySelector('.op-desk-overlay')).not.toBeNull();
        act(() => {
            fireEvent.click(orb);
        });
        expect(screen.getByTestId('op-launcher')).toBeTruthy();
        expect(renderLauncher).toHaveBeenCalled();
    });
});
