// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { MessageProvider } from '@schemastud/messages/react';
import type { ClientCatalog } from '@schemastud/messages';
import { BlockChromeFallback, BlockdocEditor, SelectionChrome, createNodeViewRegistry } from '../src/react';
import type { EditorView } from '@tiptap/pm/view';
import type { NodeViewComponentProps } from '../src/react';
import type { BlockdocEditorHandle } from '../src/react';
import { createRichContentWidget } from '../src/rjsf';
import base from './fixtures/base.manifest.json';

const manifests = [base, { profile: 'test', version: 1, doc: { admitsChildCategories: ['prose'] }, nodes: [] }];
const value = { type: 'doc', content: [{ type: 'p', attrs: { id: 'p1' }, content: [{ type: 'text', text: 'Kept prose' }] }] };
function catalog(texts: Record<string, string>): ClientCatalog {
    return { version: 1, locale: 'es', realm: null, direction: 'ltr', messages: Object.fromEntries(
        Object.entries(texts).map(([key, text]) => [key, { text, sourceLocale: 'es' }]),
    ) };
}
afterEach(cleanup);

async function showToolbar(handle: BlockdocEditorHandle) {
    const editor = handle.editor!;
    // BubbleMenu's portal remains detached until a focused editor has a
    // nonempty text selection. Exercise those public display conditions before
    // querying the document, including its debounced menu update.
    act(() => {
        editor.view.focus();
        editor.commands.setTextSelection({ from: 1, to: 5 });
    });
    await waitFor(() => {
        expect(document.querySelector('[data-blockdoc-bubble-toggle="strong"]')).not.toBeNull();
    });
    return editor;
}

it('English control: selection and fallback copy is exact and caller presence labels win', () => {
    const { container } = render(<SelectionChrome nodeId="n" localSelected required remoteSelections={[{ ownerId: 'id', ownerLabel: 'Caller label' }]}>
        {BlockChromeFallback({ type: 'Card' })}
    </SelectionChrome>);
    expect(screen.getByLabelText('Drag to reorder')).toBeTruthy();
    expect(screen.getByText('required')).toBeTruthy();
    expect(screen.getByText('Edit via the inspector →')).toBeTruthy();
    expect(container.querySelector('[data-blockdoc-remote-cursor]')?.getAttribute('aria-label')).toBe('Caller label');
});

it('required red: selection and fallback copy changes with the provider without remounting', () => {
    const body = <SelectionChrome nodeId="n" localSelected required>{BlockChromeFallback({ type: 'Card' })}</SelectionChrome>;
    const { container, rerender } = render(<MessageProvider value={catalog({})}>{body}</MessageProvider>);
    const chrome = container.firstElementChild;
    rerender(<MessageProvider value={catalog({
        'schemastud-blockdoc::messages.drag_to_reorder': 'Arrastrar',
        'schemastud-blockdoc::messages.required': 'obligatorio',
        'schemastud-blockdoc::messages.edit_via_inspector': 'Editar →',
    })}>{body}</MessageProvider>);
    expect(screen.getByLabelText('Arrastrar')).toBeTruthy();
    expect(screen.getByText('obligatorio')).toBeTruthy();
    expect(screen.getByText('Editar →')).toBeTruthy();
    expect(container.firstElementChild).toBe(chrome);
});

it('English control: editor toolbar and revise defaults work without a provider', async () => {
    const ref = createRef<BlockdocEditorHandle>();
    const editor = render(<BlockdocEditor ref={ref} manifests={manifests} value={value} />);
    await showToolbar(ref.current!);
    expect(document.querySelector('[data-blockdoc-bubble-toggle="strong"]')?.textContent).toBe('B');
    expect(document.querySelector('[data-blockdoc-bubble-toggle="em"]')?.textContent).toBe('I');
    expect(document.querySelector('[data-blockdoc-bubble-toggle="code"]')?.textContent).toBe('</>');
    expect(document.querySelector('[data-blockdoc-bubble-link-input]')?.getAttribute('placeholder')).toBe('https://…');
    expect(document.querySelector('[data-blockdoc-bubble-link-set]')?.textContent?.trim()).toBe('Link');
    editor.unmount();
    const RichContent = createRichContentWidget(createNodeViewRegistry(), { baseManifest: base });
    render(<RichContent value={value} options={{ manifest: manifests[1], palette: false }} formContext={{ intentBus: {
        registerFlush: () => () => {}, dispatch: async () => {},
    } }} />);
    expect(screen.getByText('no block selected')).toBeTruthy();
    expect(screen.getByPlaceholderText('Revise instruction…')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Revise' })).toBeTruthy();
});

it('required red: toolbar and link placeholder update without recreating the editor', async () => {
    const ref = createRef<BlockdocEditorHandle>();
    const body = <BlockdocEditor ref={ref} manifests={manifests} value={value} />;
    const { rerender } = render(<MessageProvider value={catalog({})}>{body}</MessageProvider>);
    const editor = await showToolbar(ref.current!);
    expect(document.querySelector('[data-blockdoc-bubble-toggle="strong"]')?.textContent).toBe('B');
    expect(document.querySelector('[data-blockdoc-bubble-link-input]')?.getAttribute('placeholder')).toBe('https://…');
    expect(document.querySelector('[data-blockdoc-bubble-link-set]')?.textContent?.trim()).toBe('Link');
    rerender(<MessageProvider value={catalog({
        'schemastud-blockdoc::messages.bold': 'N',
        'schemastud-blockdoc::messages.italic': 'C',
        'schemastud-blockdoc::messages.code': 'Código',
        'schemastud-blockdoc::messages.link_placeholder': 'Dirección…',
        'schemastud-blockdoc::messages.link': 'Enlazar',
        'schemastud-blockdoc::messages.unlink': 'Quitar enlace',
    })}>{body}</MessageProvider>);
    expect(document.querySelector('[data-blockdoc-bubble-toggle="strong"]')?.textContent).toBe('N');
    expect(document.querySelector('[data-blockdoc-bubble-toggle="em"]')?.textContent).toBe('C');
    expect(document.querySelector('[data-blockdoc-bubble-toggle="code"]')?.textContent).toBe('Código');
    expect(document.querySelector('[data-blockdoc-bubble-link-input]')?.getAttribute('placeholder')).toBe('Dirección…');
    expect(document.querySelector('[data-blockdoc-bubble-link-set]')?.textContent?.trim()).toBe('Enlazar');
    act(() => { ref.current!.editor!.chain().setTextSelection({ from: 1, to: 5 }).setMark('link', { href: 'https://example.test' }).run(); });
    expect(document.querySelector('[data-blockdoc-bubble-link-unset]')?.textContent?.trim()).toBe('Quitar enlace');
    expect(ref.current!.editor).toBe(editor);
});

it('required red: revise copy and existing advisory errors follow provider changes', async () => {
    let paragraphView: EditorView | undefined;
    let flush: (() => void) | undefined;
    const registry = createNodeViewRegistry();
    registry.registerNodeView('p', function Paragraph({ view, contentRef }: NodeViewComponentProps) {
        paragraphView = view;
        return <div ref={contentRef} />;
    });
    const RichContent = createRichContentWidget(registry, { baseManifest: base });
    const intentBus = { registerFlush: () => () => {}, dispatch: vi.fn().mockResolvedValue(undefined) };
    const body = <RichContent value={value} options={{ manifest: manifests[1], palette: false, commit: { debounceMs: 0 } }} schema={{ type: 'object', required: ['missing'] }} formContext={{ intentBus, commitBus: { register(callback: () => void) { flush = callback; return () => {}; } } }} />;
    const { container, rerender } = render(<MessageProvider value={catalog({})}>{body}</MessageProvider>);
    expect(screen.getByText('no block selected')).toBeTruthy();
    expect(screen.getByPlaceholderText('Revise instruction…')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Revise' })).toBeTruthy();
    await waitFor(() => { expect(paragraphView).toBeDefined(); expect(flush).toBeDefined(); });
    act(() => {
        paragraphView!.dispatch(paragraphView!.state.tr.insertText('Changed ', 1));
        flush!();
    });
    expect(container.querySelector('[data-blockdoc-advisory-errors]')?.textContent).toBe("must have required property 'missing'");
    const prose = container.querySelector('.tiptap');
    rerender(<MessageProvider value={catalog({
        'schemastud-blockdoc::messages.no_block_selected': 'ningún bloque',
        'schemastud-blockdoc::messages.revise_instruction': 'Instrucción…',
        'schemastud-blockdoc::messages.revise': 'Revisar',
        'schemastud-seam::messages.validation.required': 'falta :missingProperty',
    })}>{body}</MessageProvider>);
    expect(screen.getByPlaceholderText('Instrucción…')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Revisar' })).toBeTruthy();
    expect(container.querySelector('[data-blockdoc-advisory-errors]')?.textContent).toBe("falta 'missing'");
    expect(container.querySelector('.tiptap')).toBe(prose);
});
