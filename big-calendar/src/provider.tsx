import { createContext, useContext, type ReactNode } from 'react';
import type { CalendarServices, NotifyMessage, Subscribe } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the context is generic over the event DTO; hooks re-narrow.
const CalendarServicesContext = createContext<CalendarServices<any> | null>(null);

/**
 * The dependency-free default feedback sink (PRD §7.2): a bare mount still surfaces
 * feedback without dragging a toaster into the foundation. Real hosts pass their own.
 */
function consoleNotify(msg: NotifyMessage): void {
    if (msg.level === 'error') console.error(`[big-calendar] ${msg.text}`);
    else console.debug(`[big-calendar] ${msg.text}`);
}

/** The dependency-free default error hook. */
function consoleError(err: unknown): void {
    console.error('[big-calendar]', err);
}

/** A no-op subscription: nothing to listen to, nothing to tear down. */
const noopSubscribe: Subscribe = () => () => {};

export function BigCalendarProvider<E>({
    services,
    children,
}: {
    services: CalendarServices<E>;
    children: ReactNode;
}) {
    return (
        <CalendarServicesContext.Provider value={services}>
            {children}
        </CalendarServicesContext.Provider>
    );
}

export function useCalendarServices<E>(): CalendarServices<E> {
    const services = useContext(CalendarServicesContext);
    if (!services) {
        throw new Error('BigCalendarSurface must be rendered inside a <BigCalendarProvider>.');
    }
    return services as CalendarServices<E>;
}

/** The injected `notify`, or the console default when the host supplied none. */
export function useNotify(): (msg: NotifyMessage) => void {
    return useCalendarServices().notify ?? consoleNotify;
}

/** The injected `onError`, or the console default. */
export function useOnError(): (err: unknown) => void {
    return useCalendarServices().onError ?? consoleError;
}

/** The injected real-time `subscribe`, or the no-op default when the host wired none. */
export function useSubscribe(): Subscribe {
    return useCalendarServices().subscribe ?? noopSubscribe;
}
