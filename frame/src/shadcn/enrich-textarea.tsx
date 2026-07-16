import { useFrameInjection } from '../context';

/**
 * A shadcn-styled prose textarea + trailing "enrich" action — the LOOK for a host's
 * enrich component widget. The host widget keeps all behavior (the FormIntentBus
 * dispatch/subscribe, the busy flag) and passes `onChange`/`onEnrich`/`busy`; this
 * owns only presentation. It renders a plain `<textarea>` with shadcn-convention
 * classes (reading the standard shadcn CSS variables) rather than importing a host's
 * copied component, so it is portable to any shadcn host. The action reuses the
 * injected `primitives.Button`.
 */
export function ShadcnEnrichTextarea(props: {
    id: string;
    value?: string;
    disabled?: boolean;
    readOnly?: boolean;
    busy?: boolean;
    rows?: number;
    onChange: (value: string) => void;
    onEnrich: () => void;
    label?: string;
}) {
    const { primitives } = useFrameInjection();
    const { Button } = primitives;
    return (
        <div data-frame-widget="splicewire-enrich" className="space-y-2">
            <textarea
                id={props.id}
                value={props.value ?? ''}
                disabled={props.disabled || props.readOnly}
                onChange={(e) => props.onChange(e.target.value)}
                rows={props.rows ?? 6}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
            {!props.readOnly ? (
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    data-frame-action="enrich"
                    disabled={props.disabled || props.busy}
                    onClick={props.onEnrich}
                >
                    {props.busy ? 'Enriching…' : (props.label ?? '✨ Enrich with Splicewire')}
                </Button>
            ) : null}
        </div>
    );
}
