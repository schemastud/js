import { describe, expect, it, vi } from 'vitest';
import { createMessages, isNoticeError, notice, NoticeError, noticeOf, say, type Notice } from '../src/index';

// frame-foundation 66: the Notice primitives at the React-free root. A notice is plain data rendered in the reader's
// locale; a NoticeError's message is English for logs; isNoticeError recognises an error from another runtime copy
// by its brand; noticeOf hands back a notice only when the reader's catalog owns every key in it.
const defaults = { 'pkg::messages.saved': 'Saved :name', 'pkg::messages.failed': 'Could not save' };
const english = createMessages(defaults);
const spanish = createMessages(defaults, { catalog: { version: 1, locale: 'es', realm: null, direction: 'ltr', messages: {
    'pkg::messages.saved': { text: 'Guardado :name', sourceLocale: 'es' },
    'pkg::messages.failed': { text: 'No se pudo guardar', sourceLocale: 'es' },
} } });

describe('Notice', () => {
    it('round-trips through say in the reader\'s locale, including a nested sequence and raw strings', () => {
        const value: Notice<keyof typeof defaults> = [notice('pkg::messages.saved', { name: 'Ada' }), ' · ', ['(', notice('pkg::messages.failed'), ')']];
        expect(say(english, value)).toBe('Saved Ada · (Could not save)');
        expect(say(spanish, value)).toBe('Guardado Ada · (No se pudo guardar)');
        expect(say(spanish, 'Server said no')).toBe('Server said no');
    });

    it('is plain data', () => {
        expect(JSON.parse(JSON.stringify(notice('pkg::messages.saved', { name: 'Ada' })))).toEqual({ key: 'pkg::messages.saved', parameters: { name: 'Ada' } });
    });
});

describe('NoticeError', () => {
    it('keeps the notice and an English message', () => {
        const error = new NoticeError(notice('pkg::messages.saved', { name: 'Ada' }), english);
        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('NoticeError');
        expect(error.message).toBe('Saved Ada');
        expect(say(spanish, error.notice)).toBe('Guardado Ada');
        expect(isNoticeError(error)).toBe(true);
    });

    it('is recognised across a second copy of the runtime, where instanceof is false', async () => {
        vi.resetModules();
        const second = await import('../src/index');
        const foreignCopy = new second.NoticeError(second.notice('pkg::messages.failed'), second.createMessages(defaults));
        expect(foreignCopy instanceof NoticeError).toBe(false);
        expect(isNoticeError(foreignCopy)).toBe(true);
        expect(noticeOf(spanish, foreignCopy, 'fallback')).toEqual({ key: 'pkg::messages.failed', parameters: undefined });
    });

    it('is not faked by a plain Error, an unbranded object, or a branded error with a non-data notice', () => {
        expect(isNoticeError(new Error('plain'))).toBe(false);
        expect(isNoticeError({ name: 'NoticeError', message: 'x', notice: 'x' })).toBe(false);
        const forged = new NoticeError('x', english) as unknown as { notice: unknown };
        forged.notice = { key: 7 };
        expect(isNoticeError(forged)).toBe(false);
    });
});

describe('noticeOf', () => {
    it('returns a NoticeError\'s notice when the reader\'s catalog owns its keys', () => {
        const error = new NoticeError(notice('pkg::messages.saved', { name: 'Ada' }), english);
        expect(say(spanish, noticeOf(spanish, error, 'fallback'))).toBe('Guardado Ada');
    });

    it('returns another package\'s NoticeError as its English message, never a key this catalog cannot render', () => {
        const other = createMessages({ 'other::messages.boom': 'Other package failed' });
        const foreign = new NoticeError(notice('other::messages.boom'), other);
        const shown = noticeOf(spanish, foreign, 'fallback');
        expect(shown).toBe('Other package failed');
        expect(() => say(spanish, shown)).not.toThrow();
        const mixed = new NoticeError([notice('pkg::messages.failed'), notice('other::messages.boom')], createMessages({ ...defaults, 'other::messages.boom': 'Other package failed' }));
        // One foreign key is enough to fall back: the whole English message, not a half-rendered notice.
        expect(noticeOf(spanish, mixed, 'fallback')).toBe('Could not saveOther package failed');
    });

    it('returns an Error\'s message, and the fallback for anything else', () => {
        expect(noticeOf(spanish, new TypeError('Network down'), 'fallback')).toBe('Network down');
        expect(noticeOf(spanish, { status: 500 }, notice('pkg::messages.failed'))).toEqual({ key: 'pkg::messages.failed', parameters: undefined });
        expect(noticeOf(spanish, undefined, 'fallback')).toBe('fallback');
    });
});

describe('Messages.has', () => {
    it('answers whether a key belongs to this catalog', () => {
        expect(english.has('pkg::messages.saved')).toBe(true);
        expect(english.has('other::messages.boom')).toBe(false);
        expect(english.has('toString')).toBe(false);
    });
});

describe('a misspelt key is a type error (REVIEW-66 M1)', () => {
    it('in say, the NoticeError constructor and noticeOf\'s fallback', () => {
        const typo = notice('pkg::messages.saevd');
        // @ts-expect-error: a key outside the reader's catalog does not widen K.
        expect(() => say(english, typo)).toThrow('Unknown message key');
        // @ts-expect-error: the same for a thrown notice.
        expect(() => new NoticeError(typo, english)).toThrow('Unknown message key');
        // @ts-expect-error: and for the fallback a catch shows.
        expect(noticeOf(english, undefined, typo)).toEqual(typo);
        // A sequence that mixes a raw string and an own key still type-checks.
        expect(say(english, ['· ', notice('pkg::messages.failed')])).toBe('· Could not save');
    });
});
