import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { StatTile, type StatTone } from '../src/index';

afterEach(cleanup);

/**
 * Spelled out here rather than imported: the tone list is the component's INTERNAL business,
 * and a test that iterates whatever the component exports would pass for any list it ships,
 * including one that lost a tone. The literal is the second instrument.
 */
const TONES: StatTone[] = ['default', 'active', 'busy', 'warn', 'danger'];

const Glyph = ({ className }: { className?: string }) => <svg data-testid="glyph" className={className} />;

/**
 * The isolation bar (rehome-components §8a) for the lifted tile: it renders off a plain
 * fixture with no app context, and every tone resolves to a host-owned semantic token —
 * never the `--splice-*` fallback or the `text-amber-600` literal it was lifted from.
 */
describe('StatTile', () => {
    it('renders the figure, its label and the optional glyph', () => {
        render(<StatTile label="Active" value={37} icon={Glyph} tone="active" />);

        expect(screen.getByText('37')).toBeTruthy();
        expect(screen.getByText('Active')).toBeTruthy();
        expect(screen.getByTestId('glyph')).toBeTruthy();
    });

    it('omits the glyph well entirely when no icon is given', () => {
        render(<StatTile label="Open bills" value="$1,240" />);

        expect(screen.getByText('$1,240')).toBeTruthy();
        expect(screen.queryByTestId('glyph')).toBeNull();
    });

    it.each(TONES)('tone "%s" maps to a semantic token class, not a literal colour', (tone) => {
        const { container } = render(<StatTile label="x" value={1} icon={Glyph} tone={tone} />);
        const well = screen.getByTestId('glyph').parentElement!;

        expect(container.firstElementChild!.getAttribute('data-tone')).toBe(tone);
        expect(well.className).toMatch(/text-(muted-foreground|signal|info|warning|destructive)/);
        expect(well.className).not.toMatch(/#|amber|splice-/);
    });
});
