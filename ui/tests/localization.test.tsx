import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { MessageProvider } from '@schemastud/messages/react';
import { SaveButton } from '../src/save-button';

afterEach(cleanup);
it('shared UI default copy follows the catalog and caller labels still win', () => {
    const value = { version: 1 as const, locale: 'es', realm: null, direction: 'ltr' as const, messages: {
        'schemastud-ui::messages.save': { text: 'Guardar', sourceLocale: 'es' },
        'schemastud-ui::messages.saving': { text: 'Guardando…', sourceLocale: 'es' },
    } };
    const { rerender } = render(<MessageProvider value={value}><SaveButton saving={false} /></MessageProvider>);
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeTruthy();
    rerender(<MessageProvider value={value}><SaveButton saving={false} label="Aplicar" /></MessageProvider>);
    expect(screen.getByRole('button', { name: 'Aplicar' })).toBeTruthy();
    rerender(<MessageProvider value={value}><SaveButton saving label="Aplicar" savingLabel="Aplicando…" /></MessageProvider>);
    expect(screen.getByRole('button', { name: 'Aplicando…' })).toBeTruthy();
});
