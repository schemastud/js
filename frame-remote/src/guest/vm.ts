/**
 * The QuickJS-in-WASM guest VM.
 *
 * This is the substrate that makes the trust boundary *execution-context
 * isolation* rather than API-guarding. The untrusted guest runs inside a
 * `QuickJSContext` (a fresh WASM realm), NOT in the Worker's own JS realm. QuickJS
 * ships no browser globals: `document`, `window`, `localStorage`, `fetch`,
 * `parent` do not exist in the VM unless the host injects them. For this ticket we
 * inject ONLY:
 *   - `__frame_mutate(recordsJson)` — the guest's one outbound capability: emit a
 *     batch of remote-dom mutation records. (NO fetch capability by default.)
 *   - `__frame_log(msg)` — a dev-only sink (no-op in prod) so a guest can print.
 *
 * Resource bounds are enforced at the RUNTIME level:
 *   - `runtime.setInterruptHandler(shouldInterruptAfterDeadline(...))` bounds an
 *     infinite loop by wall-clock deadline.
 *   - `runtime.setMemoryLimit(bytes)` and `runtime.setMaxStackSize(bytes)` bound a
 *     runaway allocation / recursion.
 *
 * The VM is deliberately usable in Node (vitest) with the same real WASM module it
 * uses in the Worker — the isolation is identical whether the host of the VM is a
 * Worker or a test process.
 */
import {
    getQuickJS,
    shouldInterruptAfterDeadline,
    type QuickJSContext,
    type QuickJSRuntime,
    type QuickJSHandle,
    type QuickJSWASMModule,
} from 'quickjs-emscripten';
import { DEFAULT_LIMITS, type VmLimits } from '../config.js';
import { GUEST_RUNTIME_SOURCE } from './runtime.js';
import type { GuestFailureKind, RemoteMutationRecord } from '../protocol.js';

let modulePromise: Promise<QuickJSWASMModule> | null = null;
function quickjs(): Promise<QuickJSWASMModule> {
    // Shared singleton WASM module; each guest still gets its own runtime+context,
    // so realms never share intrinsics.
    modulePromise ??= getQuickJS();
    return modulePromise;
}

/**
 * The host-side broker a guest capability call routes through (RCP-05). The guest,
 * holding ONLY its injected scoped token, calls `FrameRemote.capability(name, args)`;
 * that lands here. The host is the authority: it presents the token to the server-side
 * `CapabilityBroker` (over HTTP, in a real embedder), which verifies the grant + scope,
 * runs the capability, and audits it. This callback returns the broker's JSON-able
 * result — the guest never holds a credential and never makes a raw fetch, consistent
 * with the RCP-04 no-host-surface rule. A refusal is returned as `{ ok: false, reason }`,
 * NOT thrown, so a mis-asking guest degrades rather than crashing the render.
 */
export type BrokerCall = (name: string, args: unknown) => BrokerCallResult;

export interface BrokerCallResult {
    readonly ok: boolean;
    readonly data?: unknown;
    readonly reason?: string;
}

export interface GuestVmOptions {
    limits?: Partial<VmLimits>;
    /**
     * Called with each batch of remote-dom mutation records the guest emits. The
     * host wires this straight into a `RemoteConnection.mutate(...)`.
     */
    onMutate: (records: readonly RemoteMutationRecord[]) => void;
    /** Optional dev sink for guest `__frame_log(...)` output. */
    onLog?: (message: string) => void;
    /**
     * The scoped capability token the host minted for this guest (RCP-05). Injected
     * INTO the VM as an opaque holder — the guest uses it via `FrameRemote.capability`,
     * it never crosses back out. Absent = the guest gets no capability surface at all.
     */
    capabilityToken?: string;
    /**
     * The host broker a `FrameRemote.capability(name, args)` call routes through.
     * Required for the guest to reach any brokered capability; without it, a capability
     * call is refused in-VM (`{ ok: false, reason: 'no_broker' }`).
     */
    brokerCall?: BrokerCall;
}

export class GuestFailure extends Error {
    constructor(
        public readonly kind: GuestFailureKind,
        message: string,
    ) {
        super(message);
        this.name = 'GuestFailure';
    }
}

/**
 * A single isolated guest. Owns one QuickJS runtime + context. Dispose when done.
 */
export class GuestVm {
    private constructor(
        private readonly context: QuickJSContext,
        private readonly runtime: QuickJSRuntime,
        private readonly limits: VmLimits,
        private readonly onMutate: (records: readonly RemoteMutationRecord[]) => void,
        private readonly onLog?: (message: string) => void,
        private readonly brokerCall?: BrokerCall,
    ) {}

    static async create(options: GuestVmOptions): Promise<GuestVm> {
        const limits: VmLimits = { ...DEFAULT_LIMITS, ...options.limits };
        const QuickJS = await quickjs();
        const runtime = QuickJS.newRuntime();

        // --- resource bounds, set BEFORE any guest code runs ---
        runtime.setMemoryLimit(limits.memoryLimitBytes);
        runtime.setMaxStackSize(limits.maxStackSizeBytes);

        const context = runtime.newContext();
        const vm = new GuestVm(context, runtime, limits, options.onMutate, options.onLog, options.brokerCall);
        vm.injectBridge();
        vm.loadGuestRuntime();
        vm.injectCapabilityToken(options.capabilityToken);
        return vm;
    }

    /**
     * Inject the ONLY host functions the guest can see. Everything else about the
     * browser is absent because QuickJS never provided it.
     */
    private injectBridge(): void {
        const { context } = this;

        const mutate = context.newFunction('__frame_mutate', (recordsHandle) => {
            const json = context.getString(recordsHandle);
            let records: readonly RemoteMutationRecord[];
            try {
                records = JSON.parse(json);
            } catch {
                return context.undefined;
            }
            // Forward outside the VM. The host owns what happens next.
            this.onMutate(records);
            return context.undefined;
        });
        context.setProp(context.global, '__frame_mutate', mutate);
        mutate.dispose();

        const log = context.newFunction('__frame_log', (msgHandle) => {
            this.onLog?.(context.getString(msgHandle));
            return context.undefined;
        });
        context.setProp(context.global, '__frame_log', log);
        log.dispose();

        // The brokered-capability call (RCP-05). The guest passes a capability name and a
        // JSON args string; the host routes it through its broker (which presents the
        // scoped token to the server-side authority) and returns a JSON result string.
        // Deny-by-default: with no broker wired, every capability call is refused in-VM.
        const capability = context.newFunction('__frame_capability', (nameHandle, argsHandle) => {
            const name = context.getString(nameHandle);
            let args: unknown = {};
            try {
                args = JSON.parse(context.getString(argsHandle));
            } catch {
                args = {};
            }

            const result: BrokerCallResult = this.brokerCall
                ? this.brokerCall(name, args)
                : { ok: false, reason: 'no_broker' };

            return context.newString(JSON.stringify(result));
        });
        context.setProp(context.global, '__frame_capability', capability);
        capability.dispose();
    }

    /**
     * Inject the scoped capability token as an opaque in-VM holder (RCP-05). The guest
     * runtime reads it once to arm `FrameRemote.capability`, but the token is never
     * surfaced back to the guest as a value it can exfiltrate — it is a capability the
     * guest *uses*, not a credential it *sees*. Absent token = no capability surface.
     */
    private injectCapabilityToken(token?: string): void {
        const { context } = this;
        const value = token ? context.newString(token) : context.null;
        context.setProp(context.global, '__frame_capability_token', value);
        value.dispose();
    }

    /** Evaluate the guest SDK runtime string inside the VM (trusted, ours). */
    private loadGuestRuntime(): void {
        this.evalOrThrow(GUEST_RUNTIME_SOURCE, 'frame-remote:runtime', 'load');
    }

    /**
     * Load untrusted publisher source into the VM. Bounded by the deadline +
     * memory limits. Any failure is reported as a typed `GuestFailure`, never a
     * host crash.
     */
    load(source: string): void {
        this.evalOrThrow(source, 'frame-remote:guest', 'throw');
    }

    /**
     * Deliver a host DOM event to the guest by handler id. The guest's registered
     * handler runs (bounded by the same limits) and typically re-renders.
     */
    dispatchEvent(handlerId: string, payload: unknown): void {
        const call = `globalThis.__frame_dispatch(${JSON.stringify(handlerId)}, ${JSON.stringify(
            JSON.stringify(payload ?? {}),
        )})`;
        this.evalOrThrow(call, 'frame-remote:dispatch', 'throw');
    }

    /**
     * Run code with the deadline interrupt armed, and translate the QuickJS result
     * union into either success or a typed `GuestFailure`.
     */
    private evalOrThrow(code: string, filename: string, kind: GuestFailureKind): void {
        // Arm a fresh deadline for THIS evaluation. A deadline breach surfaces as
        // the ERROR branch of the result union (an `InternalError: interrupted`),
        // not as a host-side throw — QuickJS never throws into host code here.
        this.runtime.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + this.limits.deadlineMs));
        const result = this.context.evalCode(code, filename);
        this.runtime.removeInterruptHandler();

        if (result.error) {
            const detail = this.readError(result.error);
            result.error.dispose();
            throw new GuestFailure(this.classify(detail, kind), detail);
        }
        result.value.dispose();
    }

    /** Best-effort human-readable text for a VM error handle. */
    private readError(handle: QuickJSHandle): string {
        try {
            const dumped = this.context.dump(handle);
            if (dumped && typeof dumped === 'object') {
                const anyDump = dumped as { name?: string; message?: string };
                if (anyDump.message) return `${anyDump.name ?? 'Error'}: ${anyDump.message}`;
            }
            return String(dumped);
        } catch (err) {
            return `unreadable VM error (${(err as Error).message})`;
        }
    }

    private classify(detail: string, fallback: GuestFailureKind): GuestFailureKind {
        const lower = detail.toLowerCase();
        // Deadline breach: `InternalError: interrupted`.
        if (lower.includes('interrupt')) return 'interrupt';
        // Memory/stack ceiling: QuickJS raises an out-of-memory / stack-overflow
        // (RangeError-class) error into the same error branch.
        if (
            lower.includes('out of memory') ||
            lower.includes('out-of-memory') ||
            lower.includes('stack overflow') ||
            lower.includes('maximum call stack') ||
            lower.includes('call stack size exceeded')
        ) {
            return 'memory';
        }
        return fallback;
    }

    /**
     * Read a JSON-serializable value out of the VM by evaluating an expression and
     * dumping the result. Test/diagnostic seam — lets a probe report its in-VM
     * findings to the host without a browser. Bounded by the same deadline.
     */
    read<T = unknown>(expression: string): T {
        this.runtime.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + this.limits.deadlineMs));
        // `?? null` so an in-VM `undefined` round-trips as JSON null instead of the
        // literal string "undefined" (which is not valid JSON).
        const result = this.context.evalCode(`JSON.stringify((${expression}) ?? null)`, 'frame-remote:read');
        this.runtime.removeInterruptHandler();
        if (result.error) {
            const detail = this.readError(result.error);
            result.error.dispose();
            throw new GuestFailure(this.classify(detail, 'throw'), detail);
        }
        const json = this.context.getString(result.value);
        result.value.dispose();
        return JSON.parse(json) as T;
    }

    dispose(): void {
        this.context.dispose();
        this.runtime.dispose();
    }
}
