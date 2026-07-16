import { Bookmark, Check, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useFacetsInjection } from './context';
import { useDeleteSavedFilter, useSaveFilter, useSavedFilters } from './data';
import type { SavedFilterQueryParameters } from './types';

interface AxiosLikeError {
    response?: { status?: number; data?: { errors?: Record<string, string[]>; message?: string } };
}

function firstValidationMessage(error: unknown): string | null {
    const err = error as AxiosLikeError;
    if (err.response?.status !== 422) return null;
    const errors = err.response.data?.errors;
    const first = errors ? Object.values(errors)[0]?.[0] : undefined;
    return first ?? err.response.data?.message ?? 'That view could not be saved.';
}

/**
 * Save the current facets-bar state as a named view and recall it — CRUD against the
 * host's Saved Filter transport, operating purely on the same filter[...]/sort
 * encoding. Works on any resource key mounted via the generalized bar. Applying loads
 * a view's parameters back into the bar state; a save naming an unknown filter
 * surfaces the endpoint's 422 as a field-level message.
 */
export function SavedViews({
    resource,
    current,
    onApply,
}: {
    resource: string;
    current: SavedFilterQueryParameters;
    onApply: (params: SavedFilterQueryParameters) => void;
}) {
    const { Button, Input } = useFacetsInjection().primitives;
    const views = useSavedFilters(resource);
    const save = useSaveFilter(resource);
    const remove = useDeleteSavedFilter(resource);

    const [naming, setNaming] = useState(false);
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);

    const submit = async () => {
        setError(null);
        try {
            await save.mutateAsync({ name, query_parameters: current });
            setName('');
            setNaming(false);
        } catch (e) {
            setError(firstValidationMessage(e) ?? 'That view could not be saved.');
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Bookmark className="size-3.5" /> Saved views
            </span>

            {(views.data ?? []).map((view) => (
                <span
                    key={view.id}
                    className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
                >
                    <button
                        type="button"
                        className="font-medium hover:underline"
                        onClick={() => onApply(view.query_parameters ?? {})}
                    >
                        {view.name}
                    </button>
                    <button
                        type="button"
                        aria-label={`Delete ${view.name}`}
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(view.id)}
                    >
                        <Trash2 className="size-3 text-destructive" />
                    </button>
                </span>
            ))}

            {(views.data ?? []).length === 0 && (
                <span className="text-xs text-muted-foreground">None yet.</span>
            )}

            {naming ? (
                <div className="flex items-center gap-1">
                    <Input
                        value={name}
                        autoFocus
                        placeholder="View name"
                        className="h-7 w-40 text-xs"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                            e.key === 'Enter' && name && submit()
                        }
                    />
                    <Button
                        size="icon"
                        variant="outline"
                        className="size-7"
                        aria-label="Confirm save"
                        disabled={!name || save.isPending}
                        onClick={submit}
                    >
                        <Check />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        aria-label="Cancel save"
                        onClick={() => {
                            setNaming(false);
                            setError(null);
                        }}
                    >
                        <X />
                    </Button>
                </div>
            ) : (
                <Button size="sm" variant="outline" onClick={() => setNaming(true)}>
                    Save current view
                </Button>
            )}

            {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
    );
}
