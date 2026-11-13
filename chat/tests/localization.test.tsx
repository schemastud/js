// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MessageProvider } from '@schemastud/messages/react';
import { emptySnapshot, type ChatSnapshot } from '../src/core/index';
import type { ClientCatalog } from '@schemastud/messages';
import { ChatView, Composer, ThreadView, useChat, viewport, popover } from '../src/react/index';

const api = { send: async () => {}, requestHuman: async () => {}, streaming: false, escalated: false };
const snapshot = { messages: [{ id: 'root', role: 'user' as const, content: 'Root' }, { id: 'reply', role: 'assistant' as const, content: 'Reply', replyToId: 'root' }] };
function catalog(word: string): ClientCatalog {
    return { version: 1, locale: 'fr', realm: null, direction: 'ltr', messages: {
        'schemastud-chat::messages.joining': { text: ':name arrive bientôt.', sourceLocale: 'fr' },
        'schemastud-chat::messages.empty_popover': { text: 'Comment aider ?', sourceLocale: 'fr' },
        'schemastud-chat::messages.assistant': { text: 'Assistant traduit', sourceLocale: 'fr' },
        'schemastud-chat::messages.citation': { text: 'référence', sourceLocale: 'fr' },
        'schemastud-chat::messages.send': { text: word, sourceLocale: 'fr' },
        'schemastud-chat::messages.show_replies': { text: '{1} Une réponse :shownCount|[2,*] Plusieurs réponses :shownCount', sourceLocale: 'fr' },
        'schemastud-chat::messages.hide_replies': { text: 'Masquer :shownCount réponses', sourceLocale: 'fr' },
    } };
}
function View({ snapshot, preset }: { snapshot: ChatSnapshot; preset: typeof viewport }) {
    const core = { subscribe: () => () => {}, getSnapshot: () => snapshot, hydrate: () => {}, send: async () => {}, requestHuman: async () => {} };
    return <ChatView chat={useChat({ core })} {...preset} />;
}
describe('public chat localization', () => {
    it('keeps exact no-provider English and copy overrides', () => {
        const view = render(<><Composer {...api} allowRequestHuman /><ThreadView snapshot={snapshot} initialCollapsed={['root']} /></>);
        expect(view.getByText('Message')).toBeTruthy();
        expect(view.getByPlaceholderText('Type a message…')).toBeTruthy();
        expect(view.getByText('Send')).toBeTruthy();
        expect(view.getByText('Talk to a human')).toBeTruthy();
        expect(view.getByText('Show 1 replies')).toBeTruthy();
        view.rerender(<MessageProvider value={catalog('Envoyer')}><Composer {...api} placeholder="Custom prompt" sendLabel="Custom send" requestHumanLabel="Custom human" allowRequestHuman /></MessageProvider>);
        expect(view.getByPlaceholderText('Custom prompt')).toBeTruthy();
        expect(view.getByText('Custom send')).toBeTruthy();
        expect(view.getByText('Custom human')).toBeTruthy();
    });
    it('localizes public preset fills, author fallbacks, and citation fallbacks', () => {
        const empty = { ...emptySnapshot(), roster: [{ id: 'agent', kind: 'agent' as const, label: 'Ada' }] };
        const view = render(<MessageProvider value={catalog('Envoyer')}><View snapshot={empty} preset={popover} /></MessageProvider>);
        expect(view.getByText('Ada arrive bientôt.')).toBeTruthy();
        expect(view.getByText('Comment aider ?')).toBeTruthy();
        view.rerender(<MessageProvider value={catalog('Envoyer')}><View snapshot={{ ...emptySnapshot(), messages: [{ id: 'a', role: 'assistant', content: '', segments: [{ type: 'citation' }] }] }} preset={viewport} /></MessageProvider>);
        expect(view.getByText('Assistant traduit')).toBeTruthy();
        expect(view.getByText('référence')).toBeTruthy();
    });
    it('selects the plural sentence for multiple descendants', () => {
        const messages = [...snapshot.messages, { id: 'reply2', role: 'assistant' as const, content: 'Second reply', replyToId: 'root' }];
        const view = render(<MessageProvider value={catalog('Envoyer')}><ThreadView snapshot={{ messages }} initialCollapsed={['root']} /></MessageProvider>);
        expect(view.getByText('Plusieurs réponses 2')).toBeTruthy();
    });
    it('updates complete reply sentences and composer copy without remounting', () => {
        const tree = (word: string) => <MessageProvider value={catalog(word)}><Composer {...api} /><ThreadView snapshot={snapshot} initialCollapsed={['root']} /></MessageProvider>;
        const view = render(tree('Envoyer'));
        const input = view.getByPlaceholderText('Type a message…');
        fireEvent.change(input, { target: { value: 'draft' } });
        expect(view.getByText('Une réponse 1')).toBeTruthy();
        fireEvent.click(view.getByText('Une réponse 1'));
        expect(view.getByText('Masquer 1 réponses')).toBeTruthy();
        view.rerender(tree('Transmettre'));
        expect(view.getByText('Transmettre')).toBeTruthy();
        expect(view.getByPlaceholderText('Type a message…')).toBe(input);
        expect((input as HTMLTextAreaElement).value).toBe('draft');
        expect(view.getByText('Masquer 1 réponses')).toBeTruthy();
    });
});
