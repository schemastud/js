import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { MessageProvider } from '@schemastud/messages/react';
import { createFrameKit } from '../src/kit';
import { createMemoryTransport } from '../src/testing';
import { ListShell } from '../src/ListShell';
import { EditShell } from '../src/EditShell';

afterEach(cleanup);
it('list and edit shells use alternate catalog sentences from the outer provider', async () => {
    const frame = createFrameKit({ transport: createMemoryTransport({ empty: true }), urlState: 'memory', can: () => true });
    render(<MessageProvider value={{ version: 1, locale: 'es', realm: null, direction: 'ltr', messages: {
        'schemastud-frame::messages.new_resource': { text: 'Crear :resource', sourceLocale: 'es' },
        'schemastud-frame::messages.no_records': { text: 'Sin registros.', sourceLocale: 'es' },
        'schemastud-frame::messages.save': { text: 'Guardar', sourceLocale: 'es' },
    } }}><frame.Provider><ListShell resource="members" /><EditShell resource="members" id={null} container="bare" /></frame.Provider></MessageProvider>);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Crear members' })).toBeTruthy());
    await waitFor(() => expect(screen.getByText('Sin registros.')).toBeTruthy());
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Crear members' })).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeTruthy();
});
