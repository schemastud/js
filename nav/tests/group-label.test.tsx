// @vitest-environment jsdom
// Ticket 70 (frame-foundation): `groupLabel` maps a group key to its heading text only. The group's identity — the
// persisted open/closed key, the panel id behind `aria-controls`, and the React key — stays the raw group key.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { ExpandableNav } from '../src/index';

const items = [{ title: 'Start', href: '/start', track: 'Docs', group: '(global)' }];
const renderLink = (item: { title: string }) => <span>{item.title}</span>;
const prefix = 'test-nav';

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

it('groupLabel changes the heading text; the storage key, panel id and aria-controls stay on the raw key', () => {
    render(
        <ExpandableNav
            items={items}
            renderLink={renderLink}
            storagePrefix={prefix}
            groupLabel={(group) => (group === '(global)' ? 'Espacio global' : group)}
        />,
    );

    const header = screen.queryByRole('button', { name: 'Espacio global' });
    expect(header).not.toBeNull();
    expect(screen.queryByRole('button', { name: '(global)' })).toBeNull();

    const panelId = 'sn-Docs-(global)';
    expect(header?.getAttribute('aria-controls')).toBe(panelId);
    expect(document.getElementById(panelId)).not.toBeNull();

    fireEvent.click(header as HTMLElement);
    expect(window.localStorage.getItem(`${prefix}:Docs::(global)`)).toBe('0');
    expect(Object.keys(window.localStorage)).toEqual([`${prefix}:Docs::(global)`]);
});

it('a relabel keeps the saved open/closed state (the group identity did not move)', () => {
    window.localStorage.setItem(`${prefix}:Docs::(global)`, '0');
    const nav = (label: string) => (
        <ExpandableNav items={items} renderLink={renderLink} storagePrefix={prefix} groupLabel={() => label} />
    );
    const { rerender } = render(nav('Global'));
    expect(screen.queryByRole('button', { name: 'Global' })?.getAttribute('aria-expanded')).toBe('false');
    rerender(nav('Espacio global'));
    expect(screen.queryByRole('button', { name: 'Espacio global' })?.getAttribute('aria-expanded')).toBe('false');
});

it('without groupLabel, the output is unchanged (the raw key is the heading)', () => {
    const { container } = render(<ExpandableNav items={items} renderLink={renderLink} storagePrefix={prefix} />);
    const withIdentity = container.innerHTML;
    cleanup();
    const { container: again } = render(
        <ExpandableNav items={items} renderLink={renderLink} storagePrefix={prefix} groupLabel={(g) => g} />,
    );
    expect(again.innerHTML).toBe(withIdentity);
    expect(screen.queryByRole('button', { name: '(global)' })?.getAttribute('aria-controls')).toBe('sn-Docs-(global)');
});
