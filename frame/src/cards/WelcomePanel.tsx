import { Inbox, UsersRound } from 'lucide-react';
import { Card, CardContent, buttonVariants } from '@schemastud/ui';
import { CardLink } from './chrome';
import type { CardWidgetOptions, WelcomePayload } from './types';

/**
 * The dashboard's first-run / nothing-yet panel — what a `{realm}-dashboard` row of context
 * `'welcome'` draws. The server sends that row only when the dashboard has no card and no tile
 * for the viewer, so this panel stands in for frame's generic "No records." on the one surface
 * where an empty list is a person's first screen.
 *
 * Every word and every destination is the payload's: `heading`, `body`, `actions` (host-routed
 * links, the first drawn as the primary button) and an optional `hint`. The panel invents no
 * affordance — an action the host does not route never reaches it. Links go through the host's
 * injected `renderLink` like every other anchor a card draws.
 */
export function WelcomePanel({ value, options }: { value: WelcomePayload; options?: CardWidgetOptions }) {
    const Icon = value.state === 'first-run' ? UsersRound : Inbox;

    return (
        <Card data-frame-card="welcome" data-frame-welcome-state={value.state} className="py-0">
            <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:gap-5 sm:p-8">
                <span
                    aria-hidden
                    className="grid size-10 flex-none place-items-center rounded-full bg-muted text-muted-foreground"
                >
                    <Icon className="size-5" />
                </span>
                <div className="flex min-w-0 flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <h2 className="text-lg font-semibold leading-tight text-foreground">{value.heading}</h2>
                        <p className="max-w-prose text-sm text-muted-foreground">{value.body}</p>
                    </div>
                    {value.actions.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-2" data-frame-welcome-actions>
                            {value.actions.map((action, i) => (
                                <CardLink
                                    key={action.key}
                                    href={action.href}
                                    className={buttonVariants({ variant: i === 0 ? 'default' : 'outline', size: 'sm' })}
                                    marker={{ 'data-frame-welcome-action': action.key }}
                                    options={options}
                                >
                                    {action.label}
                                </CardLink>
                            ))}
                        </div>
                    ) : null}
                    {value.hint ? <p className="text-sm text-muted-foreground">{value.hint}</p> : null}
                </div>
            </CardContent>
        </Card>
    );
}
