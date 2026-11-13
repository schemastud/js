import { useFrameMessages } from './messages';
import type { ReactNode } from 'react';
import type { ResourceKey } from './resources';
import { useFrameInjection } from './context';
import { DefaultContainer, DefaultNotFound } from './slots/defaults';
import { useEditShellOf, type EditShellOptionsOf } from './useEditShell';
import type { EditShellProps, EditShellPropsOf } from './types';

/**
 * The edit surface (create when id === null; detail = <EditShell readOnly/> — no
 * distinct DetailShell). Renders a form from `transport.getFormSchema` (the server's
 * request projection by default, explicit response projection for read detail), tracks edits,
 * and submits via `transport.save`. The host's
 * persist strategy sits BELOW the transport; the shell is blind to which strategy
 * runs. Every slot has a frame default the host may override.
 *
 * It is `useEditShell`'s default rendering and reads nothing else: a custom form takes the same behaviour from
 * the hook and draws its own markup.
 */
export function EditShell<K extends ResourceKey = ResourceKey>(typed: EditShellProps<K>) {
    // Typed by the key at the boundary (ruling 03); the shell itself reads records as `Row`.
    const props = typed as unknown as EditShellPropsOf<string>;
    // A different record (including create mode) must never inherit another record's draft.
    return <EditShellRecord key={JSON.stringify([props.resource, props.id, props.schemaPurpose ?? 'write'])} {...props} />;
}

function EditShellRecord({
    container = 'panel',
    showModeToggle = false,
    onCancel,
    ...options
}: EditShellPropsOf<string>) {
    const { t } = useFrameMessages();
    const edit = useEditShellOf(options as EditShellOptionsOf<string>);
    const { editSlots, primitives } = useFrameInjection();
    const { FormBody, Toggle, SaveBar } = edit.slots;
    const slots = options.slots;
    // ⚠️ Container is the one slot where the app-wide default sits BELOW the `container` prop.
    // `container: 'page'` is an explicit per-render statement that this shell is a full page and
    // not a drawer — the `mounts: 'edit'` dispatcher relies on it — so an injection-level
    // Container must not be able to silently turn a page back into a panel. `container: 'bare'`
    // is the same kind of statement in the other direction: the CALLER has already opened its own
    // Sheet/Dialog and is mounting the shell inside it, so an injected overlay would nest a second
    // one inside the first. A page's OWN `slots.Container` still wins over all of it: that is the
    // caller, not a default.
    const Container =
        slots?.Container ??
        (container === 'page'
            ? PageContainer
            : container === 'bare'
            ? BareContainer
            : editSlots?.Container ?? DefaultContainer);

    if (edit.status === 'loading') {
        return <div data-frame-shell="edit-loading">{t("schemastud-frame::messages.loading")}</div>;
    }

    const RetryButton = primitives.Button;
    // A 404 record read is a DISTINCT terminal state — not-found, no retry (the record is gone).
    // Any other read failure keeps the retryable generic error. (C17)
    const failure = edit.readFailure;
    const terminal = edit.status === 'not-found' ? (
        <DefaultNotFound message={t("schemastud-frame::messages.this_value_was_not_found", { value: edit.singularLabel.toLowerCase() })} />
    ) : !failure ? null : (
        <div role="alert" data-frame-shell="edit-error">
            <p>{failure.message}</p>
            <RetryButton type="button" onClick={failure.retry}>{t("schemastud-frame::messages.retry")}</RetryButton>
        </div>
    );
    if (edit.status !== 'ready') return <Container>{terminal}</Container>;

    return (
        <Container>
            <div data-frame-shell="edit">
                <h1 data-frame-shell="edit-heading">{edit.heading}</h1>
                {terminal}
                {edit.notice.element}
                {edit.actions.RecordActions ? <edit.actions.RecordActions /> : null}
                {showModeToggle && !edit.readOnly ? <Toggle value={edit.form} onChange={edit.setForm} /> : null}
                <FormBody
                    schema={edit.schema}
                    formData={edit.draft}
                    intentBus={edit.intentBus}
                    readOnly={edit.readOnly}
                    form={edit.form}
                    onChange={edit.setDraft}
                    onSubmit={edit.save.submit}
                    registerSubmit={edit.save.registerSubmit}
                />
                {edit.save.error && (
                    <div role="alert" data-frame-shell="save-error">
                        {edit.save.error.message || t("schemastud-frame::messages.could_not_save_changes")}
                    </div>
                )}
                {/* C17: scroll space between the last field and the sticky Save bar, so the bar
                    cannot cover the last field at desktop (UX13/UX14). */}
                <div
                    data-frame-shell="edit-bottom-spacer"
                    aria-hidden="true"
                    style={{ height: '4rem', flex: 'none' }}
                />
                <SaveBar
                    saving={edit.save.saving}
                    canSubmit={edit.save.canSubmit}
                    readOnly={edit.readOnly}
                    onSave={edit.save.request}
                    onCancel={onCancel}
                />
            </div>
        </Container>
    );
}

/**
 * The `container="page"` container — a full-surface region, never an overlay.
 *
 * ⚠️ **This used to render `primitives.Dialog ?? primitives.SidePanel`, and the fallback was a silent
 * lie.** `Dialog` is OPTIONAL on `FramePrimitives`, so a host that registers only `SidePanel` — which is
 * every host in this estate; the flagship's `ui/src/frame/primitives.tsx` registers `SidePanel` and no
 * `Dialog` — got a DRAWER on a route that asked for a page. It typechecked, it rendered, and nothing
 * reported it. Anything driving `container: 'page'` from a declaration (see `createMountDispatcher`)
 * would have shipped a drawer on every full-page edit route.
 *
 * The fallback is now a plain block element, which is what "page" means. A host that wants chrome
 * registers the new optional `Page` primitive; nothing falls back to an overlay, because an overlay is a
 * different thing rather than a lesser version of the same thing.
 */
/**
 * The `container="bare"` container — frame contributes NO chrome at all.
 *
 * The census that produced it: five surfaces at the flagship (`AgentsPage`, `ScopesPage`,
 * `OperatorScaffoldPacksPage`, `OperatorTenantsPage`, `IntegrationsPage`) each wrote the
 * IDENTICAL `Container: ({ children }) => <>{children}</>` closure, all five for the same reason —
 * they had already opened a shadcn `<Sheet>` and were mounting the shell inside it, where
 * `DefaultContainer`'s `SidePanel` is a second overlay nested in the first. Four of the five are
 * character-for-character the same three lines.
 *
 * ⚠️ It is a plain fragment on purpose, NOT a `<div>`. `PageContainer` renders a wrapper element
 * because "page" is a surface with an identity a host may want to style; "bare" is the absence of
 * a surface, and adding a div would put a block box between the host's own Sheet padding and the
 * form — a layout change dressed as a no-op, which is exactly what the five host closures were
 * written to avoid. There is deliberately no `data-frame-slot` marker either: an element carrying
 * one would have to exist.
 */
function BareContainer({ children }: { children: ReactNode }) {
    return <>{children}</>;
}

function PageContainer({ children }: { children: ReactNode }) {
    const { primitives } = useFrameInjection();
    const Page = primitives.Page;

    if (Page) {
        return <Page data-frame-slot="Container">{children}</Page>;
    }

    return (
        <div data-frame-slot="Container" data-frame-container="page">
            {children}
        </div>
    );
}
