import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { MessageProvider } from '@schemastud/messages/react';
import { createFormValidator } from '../src/validator';
import { SchemaForm } from '../src/SchemaForm';

afterEach(cleanup);

// A theme is a component identity: keep it stable when changing providers.
const bareTheme = {};

it('a form renders RJSF control copy from the active message catalog', () => {
    render(<MessageProvider value={{ version: 1, locale: 'es', realm: null, direction: 'ltr', messages: {
        'schemastud-seam::messages.rjsf.add_button': { text: 'Añadir', sourceLocale: 'es' },
    } }}><SchemaForm schema={{ type: 'array', items: { type: 'string' } }} theme={bareTheme} /></MessageProvider>);
    expect(screen.getByRole('button', { name: 'Añadir' })).toBeTruthy();
});


it('a form localizes the validation heading and required error while retaining the field title', async () => {
    const { container } = render(<MessageProvider value={{ version: 1, locale: 'es', realm: null, direction: 'ltr', messages: {
        'schemastud-seam::messages.rjsf.errors_label': { text: 'Errores', sourceLocale: 'es' },
        'schemastud-seam::messages.validation.required': { text: 'debe tener la propiedad :missingProperty', sourceLocale: 'es' },
    } }}><SchemaForm schema={{ type: 'object', required: ['name'], properties: { name: { type: 'string', title: 'Nombre' } } }} theme={bareTheme} /></MessageProvider>);
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(screen.getByText('Errores')).toBeTruthy());
    expect(screen.getAllByText(/debe tener la propiedad/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("debe tener la propiedad 'Nombre'").length).toBeGreaterThan(0);
    expect(container.textContent).not.toContain('must have required property');
});

it('a form uses translated submit copy unless the caller supplies submitText', () => {
    const value = { version: 1 as const, locale: 'es', realm: null, direction: 'ltr' as const, messages: {
        'schemastud-seam::messages.submit': { text: 'Guardar', sourceLocale: 'es' },
    } };
    const { rerender } = render(<MessageProvider value={value}><SchemaForm schema={{ type: 'string' }} theme={bareTheme} /></MessageProvider>);
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeTruthy();
    rerender(<MessageProvider value={value}><SchemaForm schema={{ type: 'string' }} theme={bareTheme} uiSchema={{ 'ui:submitButtonOptions': { submitText: 'Enviar' } }} /></MessageProvider>);
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeTruthy();
});

it('a provider-free form retains English', () => {
    render(<SchemaForm schema={{ type: 'array', items: { type: 'string' } }} theme={bareTheme} />);
    expect(screen.getByRole('button', { name: 'Add' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
});

it('validation follows provider changes without changing neighboring English forms', async () => {
    const schema = { type: 'string' as const, minLength: 3 };
    const es = { version: 1 as const, locale: 'es', realm: null, direction: 'ltr' as const, messages: {
        'schemastud-seam::messages.validation.minLength': { text: 'al menos :limit caracteres', sourceLocale: 'es' },
    } };
    const fr = { ...es, locale: 'fr', messages: {
        'schemastud-seam::messages.validation.minLength': { text: 'au moins :limit caractères', sourceLocale: 'fr' },
    } };
    const forms = (value: typeof es) => <><MessageProvider value={value}><SchemaForm schema={schema} formData="a" theme={bareTheme} /></MessageProvider><SchemaForm schema={schema} formData="a" theme={bareTheme} /></>;
    const { container, rerender } = render(forms(es));
    for (const form of container.querySelectorAll('form')) fireEvent.submit(form);
    await waitFor(() => expect(screen.getAllByText(/al menos 3 caracteres/).length).toBeGreaterThan(0));
    expect(screen.getAllByText(/must NOT have fewer than 3 characters/).length).toBeGreaterThan(0);
    rerender(forms(fr));
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(screen.getAllByText(/au moins 3 caractères/).length).toBeGreaterThan(0));
    expect(screen.getAllByText(/must NOT have fewer than 3 characters/).length).toBeGreaterThan(0);
});


it('an explicit validator and custom validation diagnostics remain host-owned', async () => {
    const validator = createFormValidator(undefined, errors => {
        for (const error of errors ?? []) error.message = 'Host validation';
    });
    const { container } = render(<MessageProvider value={{ version: 1, locale: 'es', realm: null, direction: 'ltr', messages: {
        'schemastud-seam::messages.validation.minLength': { text: 'Catalog validation', sourceLocale: 'es' },
    } }}><SchemaForm schema={{ type: 'string', minLength: 3 }} formData="a" validator={validator} theme={bareTheme}
        customValidate={(_data, errors) => { errors.addError('custom::diagnostic.literal'); return errors; }} /></MessageProvider>);
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(screen.getAllByText(/Host validation/).length).toBeGreaterThan(0));
    expect(screen.getAllByText(/custom::diagnostic.literal/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Catalog validation/)).toBeNull();
});


it('RJSF controls follow the provider without remounting the form', () => {
    const schema = { type: 'array', items: { type: 'string' } } as const;
    const es = { version: 1 as const, locale: 'es', realm: null, direction: 'ltr' as const, messages: {
        'schemastud-seam::messages.rjsf.add_button': { text: 'Añadir', sourceLocale: 'es' },
    } };
    const fr = { ...es, locale: 'fr', messages: {
        'schemastud-seam::messages.rjsf.add_button': { text: 'Ajouter', sourceLocale: 'fr' },
    } };
    const { container, rerender } = render(<MessageProvider value={es}><SchemaForm schema={schema} theme={bareTheme} /></MessageProvider>);
    const form = container.querySelector('form');
    expect(screen.getByRole('button', { name: 'Añadir' })).toBeTruthy();
    rerender(<MessageProvider value={fr}><SchemaForm schema={schema} theme={bareTheme} /></MessageProvider>);
    expect(screen.getByRole('button', { name: 'Ajouter' })).toBeTruthy();
    expect(container.querySelector('form')).toBe(form);
});

it('a provider switch before the first submit supplies the new validation language', async () => {
    const schema = { type: 'string' as const, minLength: 3 };
    const es = { version: 1 as const, locale: 'es', realm: null, direction: 'ltr' as const, messages: {
        'schemastud-seam::messages.validation.minLength': { text: 'al menos :limit caracteres', sourceLocale: 'es' },
    } };
    const fr = { ...es, locale: 'fr', messages: {
        'schemastud-seam::messages.validation.minLength': { text: 'au moins :limit caractères', sourceLocale: 'fr' },
    } };
    const { container, rerender } = render(<MessageProvider value={es}><SchemaForm schema={schema} formData="a" theme={bareTheme} /></MessageProvider>);
    const form = container.querySelector('form')!;
    rerender(<MessageProvider value={fr}><SchemaForm schema={schema} formData="a" theme={bareTheme} /></MessageProvider>);
    expect(container.querySelector('form')).toBe(form);
    fireEvent.submit(form);
    await waitFor(() => expect(screen.getAllByText(/au moins 3 caractères/).length).toBeGreaterThan(0));
    expect(screen.queryByText(/al menos 3 caracteres/)).toBeNull();
});

it('an explicit host translator can change without remounting', () => {
    const schema = { type: 'array', items: { type: 'string' } } as const;
    const { container, rerender } = render(<SchemaForm schema={schema} theme={bareTheme} translateString={() => 'One'} />);
    const form = container.querySelector('form');
    expect(screen.getByRole('button', { name: 'One' })).toBeTruthy();
    rerender(<SchemaForm schema={schema} theme={bareTheme} translateString={() => 'Two'} />);
    expect(screen.getByRole('button', { name: 'Two' })).toBeTruthy();
    expect(container.querySelector('form')).toBe(form);
});
