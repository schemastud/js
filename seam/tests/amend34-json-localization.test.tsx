import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { FieldProps } from '@rjsf/utils';
import { MessageProvider } from '@schemastud/messages/react';
import type { ClientCatalog } from '@schemastud/messages';
import { JsonField } from '../src/widgets/json';

afterEach(cleanup);
const value = (text: string): ClientCatalog => ({ version: 1, locale: 'fr', realm: null, direction: 'ltr', messages: {
    'schemastud-seam::messages.widget.json_invalid_object': { text, sourceLocale: 'fr' },
} });
function field(onChange: FieldProps<unknown>['onChange']) {
    // JsonField reads only these field props; the RJSF wrapper supplies the rest.
    const props = { formData: '{broken', onChange, fieldPathId: { $id: 'artifact', path: ['artifact'] }, schema: { type: 'object', title: 'Artifact' }, name: 'artifact' } as FieldProps<unknown>;
    return <JsonField {...props} />;
}
it('English control: JSON invalid draft keeps the exact alert and RJSF error', () => {
    const onChange = vi.fn();
    render(field(onChange));
    expect(screen.getByRole('alert').textContent).toBe('Enter a valid JSON object.');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '[]' } });
    expect(onChange).toHaveBeenLastCalledWith('[]', ['artifact'], { __errors: ['Enter a valid JSON object.'] });
});
it('JSON draft alert and RJSF errors follow provider changes on the same textarea', () => {
    const onChange = vi.fn();
    const tree = (text: string) => <MessageProvider value={value(text)}>{field(onChange)}</MessageProvider>;
    const view = render(tree('Saisissez un objet JSON valide.'));
    const textarea = screen.getByRole('textbox');
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('Saisissez un objet JSON valide.');
    fireEvent.change(textarea, { target: { value: '[]' } });
    expect(onChange).toHaveBeenLastCalledWith('[]', ['artifact'], { __errors: ['Saisissez un objet JSON valide.'] });
    view.rerender(tree('Un objet JSON est requis.'));
    expect(screen.getByRole('textbox')).toBe(textarea);
    expect(screen.getByRole('alert')).toBe(alert);
    expect(alert.textContent).toBe('Un objet JSON est requis.');
    fireEvent.change(textarea, { target: { value: 'null' } });
    expect(onChange).toHaveBeenLastCalledWith('null', ['artifact'], { __errors: ['Un objet JSON est requis.'] });
});
