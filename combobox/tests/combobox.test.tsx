import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Combobox, ComboboxList, type ComboboxOption, type ComboboxPrimitives } from '../src/index';

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

const people: ComboboxOption[] = [
    { value: 'ada', label: 'Ada Lovelace' },
    { value: 'alan', label: 'Alan Turing' },
    { value: 'grace', label: 'Grace Hopper' },
];

const searchPeople = vi.fn(async (query: string) => people.filter((p) => p.label.toLowerCase().includes(query.toLowerCase())));
const Input = (props: Record<string, unknown>) => <input {...props} />;

describe('ComboboxList', () => {
    it('searches once per typing pause and drops a stale answer', async () => {
        vi.useFakeTimers();
        const search = vi.fn(searchPeople);
        render(<ComboboxList Input={Input} search={search} onSelect={vi.fn()} label="People" />);
        const input = screen.getByRole('combobox', { name: 'People' });

        await act(async () => vi.advanceTimersByTimeAsync(200));
        expect(search).toHaveBeenCalledTimes(1);

        for (const typed of ['a', 'al', 'ala']) {
            fireEvent.change(input, { target: { value: typed } });
            await act(async () => vi.advanceTimersByTimeAsync(50));
        }
        await act(async () => vi.advanceTimersByTimeAsync(200));

        expect(search.mock.calls.map(([q]) => q)).toEqual(['', 'ala']);
        expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Alan Turing']);
    });

    it('moves with the arrows, picks with Enter, and names the active option for assistive tech', async () => {
        const onSelect = vi.fn();
        render(<ComboboxList Input={Input} search={searchPeople} onSelect={onSelect} debounceMs={0} label="People" />);
        const input = screen.getByRole('combobox', { name: 'People' });
        await screen.findByRole('option', { name: 'Ada Lovelace' });

        fireEvent.keyDown(input, { key: 'ArrowDown' });
        fireEvent.keyDown(input, { key: 'ArrowDown' });
        fireEvent.keyDown(input, { key: 'ArrowUp' });
        const active = screen.getByRole('option', { name: 'Alan Turing' });
        expect(input.getAttribute('aria-activedescendant')).toBe(active.id);
        expect(input.getAttribute('aria-controls')).toBe(screen.getByRole('listbox').id);

        fireEvent.keyDown(input, { key: 'Enter' });
        expect(onSelect).toHaveBeenCalledWith(people[1]);
    });

    it('marks every selected value in a multiple list', async () => {
        render(<ComboboxList Input={Input} search={searchPeople} onSelect={vi.fn()} debounceMs={0} multiple selectedValues={['ada', 'grace']} />);
        await screen.findByRole('option', { name: 'Ada Lovelace' });

        expect(screen.getByRole('listbox').getAttribute('aria-multiselectable')).toBe('true');
        expect(screen.getAllByRole('option', { selected: true })).toHaveLength(2);
        expect(screen.getByRole('option', { name: 'Ada Lovelace', selected: true })).toBeTruthy();
        expect(screen.getByRole('option', { name: 'Grace Hopper', selected: true })).toBeTruthy();
    });

    it('stays closed until asked when its open state is the caller’s, and closes on Escape', async () => {
        function Host() {
            const [open, setOpen] = useState(false);
            return <ComboboxList Input={Input} search={searchPeople} onSelect={vi.fn()} debounceMs={0} open={open} onOpenChange={setOpen} />;
        }
        render(<Host />);
        const input = screen.getByRole('combobox');
        expect(input.getAttribute('aria-expanded')).toBe('false');
        expect(screen.queryByRole('listbox')).toBeNull();

        fireEvent.focus(input);
        await screen.findByRole('option', { name: 'Grace Hopper' });
        expect(input.getAttribute('aria-expanded')).toBe('true');

        fireEvent.keyDown(input, { key: 'Escape' });
        expect(screen.queryByRole('listbox')).toBeNull();
    });
});

describe('Combobox', () => {
    // Stand-in popover: renders its content only while open, and the trigger toggles it.
    function primitives(): ComboboxPrimitives {
        let toggle: (open: boolean) => void = () => {};
        let isOpen = false;
        return {
            Popover: ({ open, onOpenChange, children }: { open: boolean; onOpenChange: (o: boolean) => void; children: ReactNode }) => {
                toggle = onOpenChange;
                isOpen = open;
                return <div>{children}</div>;
            },
            PopoverTrigger: ({ children }: { children: ReactNode }) => <span onClick={() => toggle(!isOpen)}>{children}</span>,
            PopoverContent: ({ children }: { children: ReactNode }) => (isOpen ? <div data-testid="content">{children}</div> : null),
            Input,
        };
    }

    it('closes after a pick when single, and stays open when multiple', async () => {
        const single = vi.fn();
        const { unmount } = render(
            <Combobox primitives={primitives()} trigger={<button>Pick</button>} search={searchPeople} onSelect={single} debounceMs={0} />,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Pick' }));
        fireEvent.click(await screen.findByRole('option', { name: 'Grace Hopper' }));
        expect(single).toHaveBeenCalledWith(people[2]);
        await waitFor(() => expect(screen.queryByTestId('content')).toBeNull());
        unmount();

        const multiple = vi.fn();
        render(
            <Combobox
                primitives={primitives()}
                trigger={<button>Pick</button>}
                search={searchPeople}
                onSelect={multiple}
                currentValue={['ada']}
                multiple
                debounceMs={0}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Pick' }));
        fireEvent.click(await screen.findByRole('option', { name: 'Grace Hopper' }));
        fireEvent.click(screen.getByRole('option', { name: 'Alan Turing' }));
        expect(multiple.mock.calls.map(([o]) => o.value)).toEqual(['grace', 'alan']);
        expect(screen.getByTestId('content')).toBeTruthy();
        expect(screen.getByRole('option', { name: 'Ada Lovelace' }).getAttribute('aria-selected')).toBe('true');
    });
});
