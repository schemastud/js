/**
 * An off-repo remote component, authored against ONLY the published guest SDK.
 *
 * This file stands in for a real external publisher's source. It imports from the
 * package's PUBLIC entry — `@schemastud/frame-remote/sdk` — exactly as an installed
 * consumer would (the fixture builder `file:`-installs the package into a temp dir, so
 * this specifier resolves through the package `exports` map to `dist/sdk.js`, NOT
 * through any in-repo relative path). The point it proves: a component built entirely
 * outside the repo, against the published surface, renders through the host receiver.
 *
 * Note what this file CANNOT do — and could not even spell. It imports `h`/`render`
 * and the vocabulary types; there is no `window`, `document`, `fetch`, host receiver,
 * or credential in scope, because the SDK exposes none. The authoring shape is the
 * same one an in-repo guest uses (name allowlisted types, declare props, register a
 * handler by writing a callback, compose children) — the trusted → untrusted
 * graduation needs no rewrite.
 */
import { h, render } from '@schemastud/frame-remote/sdk';

let count = 0;

function view() {
    return h('Card', {}, [
        h('Stack', { gap: 10 }, [
            h('Badge', { text: 'off-repo · built against @schemastud/frame-remote/sdk' }),
            h('Heading', { text: 'Authored outside the repo' }),
            h('Text', { text: `Clicked ${count}x — painted through the host receiver.` }),
            h('Button', {
                text: `Increment (${count})`,
                onClick: () => {
                    count += 1;
                    render(view());
                },
            }),
        ]),
    ]);
}

render(view());
