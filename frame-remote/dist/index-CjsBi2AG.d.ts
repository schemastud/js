import { RemoteMutationRecord } from '@remote-dom/core';

/**
 * The ONE place the deployment points at the untrusted sandbox origin.
 *
 * The trust boundary in this substrate is *execution-context isolation*, not
 * API-guarding (PRD §"The decision this ratifies"). The Worker that hosts the
 * QuickJS VM MUST be served from a **separate registrable origin** from the host
 * page: only then is the guest's `fetch` cross-site (no first-party cookie
 * auto-attached), and only then is a scoped token real rather than illusory.
 *
 * In dev this is a second vite server on a different `*.test` host; in prod it is
 * the deployed sandbox origin. It is a config value, not a constant, so there is a
 * single seam to repoint. See VERIFY.md for the two-origin browser demonstration.
 */
declare const SANDBOX_ORIGIN: string;
/**
 * Default VM resource bounds. A runaway guest (infinite loop or unbounded
 * allocation) must be killed by the substrate, never trusted to be well-behaved.
 */
interface VmLimits {
    /**
     * Wall-clock budget, in ms, for a single guest evaluation. Enforced by a
     * deadline-based QuickJS interrupt handler — an infinite loop is interrupted
     * once the deadline passes.
     */
    deadlineMs: number;
    /**
     * Hard memory ceiling for the guest runtime, in bytes. An allocation past this
     * fails inside the VM (surfaced as an evaluation error), never as host OOM.
     */
    memoryLimitBytes: number;
    /**
     * Max stack size for the guest runtime, in bytes. Bounds deep recursion.
     */
    maxStackSizeBytes: number;
}
declare const DEFAULT_LIMITS: VmLimits;

/**
 * The wire protocol between the isolated guest VM and the trusted host.
 *
 * The *tree* half of the protocol is not ours: it is the real `@remote-dom/core`
 * mutation stream (`RemoteMutationRecord[]` flowing guest→host through a
 * `RemoteConnection`). We only add the tiny back-channel remote-dom leaves to the
 * embedder: how a host DOM event reaches the guest.
 *
 * Events cannot cross as functions. A real function cannot be serialized across
 * the Worker boundary, and certainly cannot cross the QuickJS WASM boundary. So an
 * event listener is represented on the wire as a **handler id** (a string the guest
 * minted); when the host paints a component and a real browser event fires, the
 * host sends this message back to the guest, which looks the id up in its own
 * in-VM handler registry and re-renders. This is the spike's `fire(handlerId,
 * payload)` shape, now riding a real remote-dom tree.
 */

/**
 * The event-listener value the guest writes onto a remote element property (via a
 * `UPDATE_PROPERTY_TYPE_EVENT_LISTENER` mutation). It is data, never a function —
 * just the id the host echoes back when the corresponding browser event fires.
 */
interface RemoteEventListenerRef {
    readonly __frameRemoteHandler: string;
}
declare function eventRef(handlerId: string): RemoteEventListenerRef;
declare function isEventRef(value: unknown): value is RemoteEventListenerRef;
/**
 * Messages the WORKER exchanges with the host page across the (separate-origin)
 * Worker boundary. The mutation stream is host-bound; the event dispatch is
 * guest-bound. Boot/limit signals let the host surface substrate state.
 */
type WorkerToHostMessage = {
    type: 'ready';
} | {
    type: 'mutate';
    records: readonly RemoteMutationRecord[];
} | {
    type: 'error';
    kind: GuestFailureKind;
    message: string;
};
type HostToWorkerMessage = {
    type: 'load';
    source: string;
} | {
    type: 'event';
    handlerId: string;
    payload: unknown;
};
/**
 * How a guest evaluation ended. `interrupt`/`memory` are the substrate killing a
 * runaway guest; `throw` is ordinary guest code throwing. The host treats all three
 * as "the guest failed", but the kind is reported for auditing.
 */
type GuestFailureKind = 'throw' | 'interrupt' | 'memory' | 'load';

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
type BrokerCall = (name: string, args: unknown) => BrokerCallResult;
interface BrokerCallResult {
    readonly ok: boolean;
    readonly data?: unknown;
    readonly reason?: string;
}
interface GuestVmOptions {
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
declare class GuestFailure extends Error {
    readonly kind: GuestFailureKind;
    constructor(kind: GuestFailureKind, message: string);
}
/**
 * A single isolated guest. Owns one QuickJS runtime + context. Dispose when done.
 */
declare class GuestVm {
    private readonly context;
    private readonly runtime;
    private readonly limits;
    private readonly onMutate;
    private readonly onLog?;
    private readonly brokerCall?;
    private constructor();
    static create(options: GuestVmOptions): Promise<GuestVm>;
    /**
     * Inject the ONLY host functions the guest can see. Everything else about the
     * browser is absent because QuickJS never provided it.
     */
    private injectBridge;
    /**
     * Inject the scoped capability token as an opaque in-VM holder (RCP-05). The guest
     * runtime reads it once to arm `FrameRemote.capability`, but the token is never
     * surfaced back to the guest as a value it can exfiltrate — it is a capability the
     * guest *uses*, not a credential it *sees*. Absent token = no capability surface.
     */
    private injectCapabilityToken;
    /** Evaluate the guest SDK runtime string inside the VM (trusted, ours). */
    private loadGuestRuntime;
    /**
     * Load untrusted publisher source into the VM. Bounded by the deadline +
     * memory limits. Any failure is reported as a typed `GuestFailure`, never a
     * host crash.
     */
    load(source: string): void;
    /**
     * Deliver a host DOM event to the guest by handler id. The guest's registered
     * handler runs (bounded by the same limits) and typically re-renders.
     */
    dispatchEvent(handlerId: string, payload: unknown): void;
    /**
     * Run code with the deadline interrupt armed, and translate the QuickJS result
     * union into either success or a typed `GuestFailure`.
     */
    private evalOrThrow;
    /** Best-effort human-readable text for a VM error handle. */
    private readError;
    private classify;
    /**
     * Read a JSON-serializable value out of the VM by evaluating an expression and
     * dumping the result. Test/diagnostic seam — lets a probe report its in-VM
     * findings to the host without a browser. Bounded by the same deadline.
     */
    read<T = unknown>(expression: string): T;
    dispose(): void;
}

/**
 * The guest-side runtime, as a source STRING evaluated INSIDE the QuickJS VM.
 *
 * This is the SDK surface an untrusted publisher authors their component against.
 * It runs in the VM realm, which has NO ambient browser globals — `document`,
 * `window`, `localStorage`, `fetch`, `parent` simply do not exist here. The only
 * capabilities are the host-injected bridge functions this runtime wraps:
 *
 *   - `__frame_mutate(recordsJson)` — forward a batch of remote-dom mutation
 *     records to the host `RemoteConnection`. The guest builds the SAME serialized
 *     records that `@remote-dom/core` defines; the host feeds them to a real
 *     `RemoteReceiver`.
 *   - handler dispatch — the host calls `__frame_dispatch(handlerId, payloadJson)`
 *     (defined here) when a painted component's event fires.
 *
 * Mutation record shapes (from `@remote-dom/core` constants, kept in lockstep):
 *   INSERT_CHILD    = [0, parentId, childSerialization, index]
 *   REMOVE_CHILD    = [1, parentId, index]
 *   UPDATE_TEXT     = [2, textId, text]
 *   UPDATE_PROPERTY = [3, elementId, name, value, updateType]
 *   node types: element=1 text=3 ; property update types: property=1 event=3
 *   ROOT_ID = "~"
 *
 * We author a whole-tree diff-free model: the guest declares its tree with `h(...)`
 * and calls `root.render(tree)`, and this runtime emits the mutations to realize it
 * (remove old children of root, insert new). Granular reconciliation is a later
 * optimization; the trust properties are identical (PRD spike note).
 */
declare const GUEST_RUNTIME_SOURCE = "\n(function () {\n  var ROOT_ID = \"~\";\n  var NODE_ELEMENT = 1, NODE_TEXT = 3;\n  var MUT_INSERT = 0, MUT_REMOVE = 1, MUT_UPDATE_TEXT = 2, MUT_UPDATE_PROP = 3;\n  var PROP_PROPERTY = 1, PROP_EVENT = 3;\n\n  var _id = 0;\n  function nextId() { return \"g\" + (++_id); }\n\n  // Guest-local handler registry. Functions NEVER cross the boundary; only ids do.\n  var handlers = Object.create(null);\n\n  // ---- authoring API: h(type, props, children) -> element descriptor ----\n  function h(type, props, children) {\n    if (typeof type !== \"string\") throw new Error(\"element type must be a string\");\n    var kids = children == null ? [] : (Array.isArray(children) ? children : [children]);\n    return { type: type, props: props || {}, children: kids };\n  }\n  function text(value) { return { text: String(value) }; }\n\n  // Serialize an authored descriptor into a remote-dom node serialization,\n  // registering any function props as handler ids under the hood.\n  function serialize(node) {\n    if (node == null) return null;\n    if (typeof node === \"string\" || typeof node === \"number\") {\n      return { id: nextId(), type: NODE_TEXT, data: String(node) };\n    }\n    if (node.text != null && node.type == null) {\n      return { id: nextId(), type: NODE_TEXT, data: String(node.text) };\n    }\n    var id = nextId();\n    var properties = {};\n    var eventListeners = {};\n    var props = node.props || {};\n    for (var key in props) {\n      var v = props[key];\n      if (typeof v === \"function\") {\n        // on<Event> convention -> event listener; store fn locally, ship the id.\n        var hid = id + \":\" + key;\n        handlers[hid] = v;\n        eventListeners[key] = { __frameRemoteHandler: hid };\n      } else {\n        properties[key] = v;\n      }\n    }\n    var children = [];\n    for (var i = 0; i < node.children.length; i++) {\n      var s = serialize(node.children[i]);\n      if (s) children.push(s);\n    }\n    return {\n      id: id,\n      type: NODE_ELEMENT,\n      element: node.type,\n      properties: properties,\n      eventListeners: eventListeners,\n      children: children,\n    };\n  }\n\n  // Emit the mutations that make the host root show exactly `tree`.\n  var mountedIds = [];\n  function render(tree) {\n    // Reset handler registry for a clean re-render (ids are regenerated).\n    handlers = Object.create(null);\n    _id = 0;\n    var records = [];\n    // remove previously-mounted top-level children (back to front)\n    for (var i = mountedIds.length - 1; i >= 0; i--) {\n      records.push([MUT_REMOVE, ROOT_ID, i]);\n    }\n    mountedIds = [];\n    var roots = Array.isArray(tree) ? tree : [tree];\n    for (var j = 0; j < roots.length; j++) {\n      var ser = serialize(roots[j]);\n      if (!ser) continue;\n      records.push([MUT_INSERT, ROOT_ID, ser, j]);\n      mountedIds.push(ser.id);\n    }\n    __frame_mutate(JSON.stringify(records));\n  }\n\n  // The host calls this when a painted component fires an event.\n  globalThis.__frame_dispatch = function (handlerId, payloadJson) {\n    var fn = handlers[handlerId];\n    if (typeof fn === \"function\") {\n      var payload = payloadJson ? JSON.parse(payloadJson) : {};\n      fn(payload);\n    }\n  };\n\n  // ---- brokered capability call (RCP-05) ----\n  // The guest HOLDS its scoped token but never sees it as a value; it can only USE it by\n  // calling capability(name, args). The host broker (__frame_capability) presents the\n  // token to the server-side authority, runs the capability, and returns the result.\n  // A refusal comes back as { ok: false, reason }, never a throw.\n  function capability(name, args) {\n    // Read the token lazily: the host injects __frame_capability_token AFTER this runtime\n    // is loaded, so a load-time snapshot would always be null.\n    var token = typeof __frame_capability_token === \"string\" ? __frame_capability_token : \"\";\n    if (!token) return { ok: false, reason: \"no_token\" };\n    if (typeof __frame_capability !== \"function\") return { ok: false, reason: \"no_broker\" };\n    var raw = __frame_capability(String(name), JSON.stringify(args == null ? {} : args));\n    try {\n      return JSON.parse(raw);\n    } catch (e) {\n      return { ok: false, reason: \"bad_broker_result\" };\n    }\n  }\n\n  // Expose the SDK the untrusted component authors against. capability() is the ONLY\n  // way out to host authority \u2014 no fetch, no host DOM, no credential.\n  globalThis.FrameRemote = { h: h, text: text, render: render, capability: capability };\n})();\n";

export { type BrokerCall as B, DEFAULT_LIMITS as D, GuestVm as G, type HostToWorkerMessage as H, type RemoteEventListenerRef as R, SANDBOX_ORIGIN as S, type VmLimits as V, type WorkerToHostMessage as W, type GuestVmOptions as a, GUEST_RUNTIME_SOURCE as b, GuestFailure as c, type GuestFailureKind as d, eventRef as e, type BrokerCallResult as f, isEventRef as i };
