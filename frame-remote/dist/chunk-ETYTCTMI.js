// src/guest/vm.ts
import {
  getQuickJS,
  shouldInterruptAfterDeadline
} from "quickjs-emscripten";

// src/config.ts
var SANDBOX_ORIGIN = typeof process !== "undefined" && process.env?.FRAME_REMOTE_SANDBOX_ORIGIN || "https://sandbox.frame-remote.test";
var DEFAULT_LIMITS = {
  deadlineMs: 1e3,
  memoryLimitBytes: 16 * 1024 * 1024,
  // 16 MiB
  maxStackSizeBytes: 512 * 1024
  // 512 KiB
};

// src/guest/runtime.ts
var GUEST_RUNTIME_SOURCE = (
  /* js */
  `
(function () {
  var ROOT_ID = "~";
  var NODE_ELEMENT = 1, NODE_TEXT = 3;
  var MUT_INSERT = 0, MUT_REMOVE = 1, MUT_UPDATE_TEXT = 2, MUT_UPDATE_PROP = 3;
  var PROP_PROPERTY = 1, PROP_EVENT = 3;

  var _id = 0;
  function nextId() { return "g" + (++_id); }

  // Guest-local handler registry. Functions NEVER cross the boundary; only ids do.
  var handlers = Object.create(null);

  // ---- authoring API: h(type, props, children) -> element descriptor ----
  function h(type, props, children) {
    if (typeof type !== "string") throw new Error("element type must be a string");
    var kids = children == null ? [] : (Array.isArray(children) ? children : [children]);
    return { type: type, props: props || {}, children: kids };
  }
  function text(value) { return { text: String(value) }; }

  // Serialize an authored descriptor into a remote-dom node serialization,
  // registering any function props as handler ids under the hood.
  function serialize(node) {
    if (node == null) return null;
    if (typeof node === "string" || typeof node === "number") {
      return { id: nextId(), type: NODE_TEXT, data: String(node) };
    }
    if (node.text != null && node.type == null) {
      return { id: nextId(), type: NODE_TEXT, data: String(node.text) };
    }
    var id = nextId();
    var properties = {};
    var eventListeners = {};
    var props = node.props || {};
    for (var key in props) {
      var v = props[key];
      if (typeof v === "function") {
        // on<Event> convention -> event listener; store fn locally, ship the id.
        var hid = id + ":" + key;
        handlers[hid] = v;
        eventListeners[key] = { __frameRemoteHandler: hid };
      } else {
        properties[key] = v;
      }
    }
    var children = [];
    for (var i = 0; i < node.children.length; i++) {
      var s = serialize(node.children[i]);
      if (s) children.push(s);
    }
    return {
      id: id,
      type: NODE_ELEMENT,
      element: node.type,
      properties: properties,
      eventListeners: eventListeners,
      children: children,
    };
  }

  // Emit the mutations that make the host root show exactly \`tree\`.
  var mountedIds = [];
  function render(tree) {
    // Reset handler registry for a clean re-render (ids are regenerated).
    handlers = Object.create(null);
    _id = 0;
    var records = [];
    // remove previously-mounted top-level children (back to front)
    for (var i = mountedIds.length - 1; i >= 0; i--) {
      records.push([MUT_REMOVE, ROOT_ID, i]);
    }
    mountedIds = [];
    var roots = Array.isArray(tree) ? tree : [tree];
    for (var j = 0; j < roots.length; j++) {
      var ser = serialize(roots[j]);
      if (!ser) continue;
      records.push([MUT_INSERT, ROOT_ID, ser, j]);
      mountedIds.push(ser.id);
    }
    __frame_mutate(JSON.stringify(records));
  }

  // The host calls this when a painted component fires an event.
  globalThis.__frame_dispatch = function (handlerId, payloadJson) {
    var fn = handlers[handlerId];
    if (typeof fn === "function") {
      var payload = payloadJson ? JSON.parse(payloadJson) : {};
      fn(payload);
    }
  };

  // ---- brokered capability call (RCP-05) ----
  // The guest HOLDS its scoped token but never sees it as a value; it can only USE it by
  // calling capability(name, args). The host broker (__frame_capability) presents the
  // token to the server-side authority, runs the capability, and returns the result.
  // A refusal comes back as { ok: false, reason }, never a throw.
  function capability(name, args) {
    // Read the token lazily: the host injects __frame_capability_token AFTER this runtime
    // is loaded, so a load-time snapshot would always be null.
    var token = typeof __frame_capability_token === "string" ? __frame_capability_token : "";
    if (!token) return { ok: false, reason: "no_token" };
    if (typeof __frame_capability !== "function") return { ok: false, reason: "no_broker" };
    var raw = __frame_capability(String(name), JSON.stringify(args == null ? {} : args));
    try {
      return JSON.parse(raw);
    } catch (e) {
      return { ok: false, reason: "bad_broker_result" };
    }
  }

  // Expose the SDK the untrusted component authors against. capability() is the ONLY
  // way out to host authority \u2014 no fetch, no host DOM, no credential.
  globalThis.FrameRemote = { h: h, text: text, render: render, capability: capability };
})();
`
);

// src/guest/vm.ts
var modulePromise = null;
function quickjs() {
  modulePromise ??= getQuickJS();
  return modulePromise;
}
var GuestFailure = class extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind;
    this.name = "GuestFailure";
  }
  kind;
};
var GuestVm = class _GuestVm {
  constructor(context, runtime, limits, onMutate, onLog, brokerCall) {
    this.context = context;
    this.runtime = runtime;
    this.limits = limits;
    this.onMutate = onMutate;
    this.onLog = onLog;
    this.brokerCall = brokerCall;
  }
  context;
  runtime;
  limits;
  onMutate;
  onLog;
  brokerCall;
  static async create(options) {
    const limits = { ...DEFAULT_LIMITS, ...options.limits };
    const QuickJS = await quickjs();
    const runtime = QuickJS.newRuntime();
    runtime.setMemoryLimit(limits.memoryLimitBytes);
    runtime.setMaxStackSize(limits.maxStackSizeBytes);
    const context = runtime.newContext();
    const vm = new _GuestVm(context, runtime, limits, options.onMutate, options.onLog, options.brokerCall);
    vm.injectBridge();
    vm.loadGuestRuntime();
    vm.injectCapabilityToken(options.capabilityToken);
    return vm;
  }
  /**
   * Inject the ONLY host functions the guest can see. Everything else about the
   * browser is absent because QuickJS never provided it.
   */
  injectBridge() {
    const { context } = this;
    const mutate = context.newFunction("__frame_mutate", (recordsHandle) => {
      const json = context.getString(recordsHandle);
      let records;
      try {
        records = JSON.parse(json);
      } catch {
        return context.undefined;
      }
      this.onMutate(records);
      return context.undefined;
    });
    context.setProp(context.global, "__frame_mutate", mutate);
    mutate.dispose();
    const log = context.newFunction("__frame_log", (msgHandle) => {
      this.onLog?.(context.getString(msgHandle));
      return context.undefined;
    });
    context.setProp(context.global, "__frame_log", log);
    log.dispose();
    const capability = context.newFunction("__frame_capability", (nameHandle, argsHandle) => {
      const name = context.getString(nameHandle);
      let args = {};
      try {
        args = JSON.parse(context.getString(argsHandle));
      } catch {
        args = {};
      }
      const result = this.brokerCall ? this.brokerCall(name, args) : { ok: false, reason: "no_broker" };
      return context.newString(JSON.stringify(result));
    });
    context.setProp(context.global, "__frame_capability", capability);
    capability.dispose();
  }
  /**
   * Inject the scoped capability token as an opaque in-VM holder (RCP-05). The guest
   * runtime reads it once to arm `FrameRemote.capability`, but the token is never
   * surfaced back to the guest as a value it can exfiltrate — it is a capability the
   * guest *uses*, not a credential it *sees*. Absent token = no capability surface.
   */
  injectCapabilityToken(token) {
    const { context } = this;
    const value = token ? context.newString(token) : context.null;
    context.setProp(context.global, "__frame_capability_token", value);
    value.dispose();
  }
  /** Evaluate the guest SDK runtime string inside the VM (trusted, ours). */
  loadGuestRuntime() {
    this.evalOrThrow(GUEST_RUNTIME_SOURCE, "frame-remote:runtime", "load");
  }
  /**
   * Load untrusted publisher source into the VM. Bounded by the deadline +
   * memory limits. Any failure is reported as a typed `GuestFailure`, never a
   * host crash.
   */
  load(source) {
    this.evalOrThrow(source, "frame-remote:guest", "throw");
  }
  /**
   * Deliver a host DOM event to the guest by handler id. The guest's registered
   * handler runs (bounded by the same limits) and typically re-renders.
   */
  dispatchEvent(handlerId, payload) {
    const call = `globalThis.__frame_dispatch(${JSON.stringify(handlerId)}, ${JSON.stringify(
      JSON.stringify(payload ?? {})
    )})`;
    this.evalOrThrow(call, "frame-remote:dispatch", "throw");
  }
  /**
   * Run code with the deadline interrupt armed, and translate the QuickJS result
   * union into either success or a typed `GuestFailure`.
   */
  evalOrThrow(code, filename, kind) {
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
  readError(handle) {
    try {
      const dumped = this.context.dump(handle);
      if (dumped && typeof dumped === "object") {
        const anyDump = dumped;
        if (anyDump.message) return `${anyDump.name ?? "Error"}: ${anyDump.message}`;
      }
      return String(dumped);
    } catch (err) {
      return `unreadable VM error (${err.message})`;
    }
  }
  classify(detail, fallback) {
    const lower = detail.toLowerCase();
    if (lower.includes("interrupt")) return "interrupt";
    if (lower.includes("out of memory") || lower.includes("out-of-memory") || lower.includes("stack overflow") || lower.includes("maximum call stack") || lower.includes("call stack size exceeded")) {
      return "memory";
    }
    return fallback;
  }
  /**
   * Read a JSON-serializable value out of the VM by evaluating an expression and
   * dumping the result. Test/diagnostic seam — lets a probe report its in-VM
   * findings to the host without a browser. Bounded by the same deadline.
   */
  read(expression) {
    this.runtime.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + this.limits.deadlineMs));
    const result = this.context.evalCode(`JSON.stringify((${expression}) ?? null)`, "frame-remote:read");
    this.runtime.removeInterruptHandler();
    if (result.error) {
      const detail = this.readError(result.error);
      result.error.dispose();
      throw new GuestFailure(this.classify(detail, "throw"), detail);
    }
    const json = this.context.getString(result.value);
    result.value.dispose();
    return JSON.parse(json);
  }
  dispose() {
    this.context.dispose();
    this.runtime.dispose();
  }
};

export {
  SANDBOX_ORIGIN,
  DEFAULT_LIMITS,
  GUEST_RUNTIME_SOURCE,
  GuestFailure,
  GuestVm
};
//# sourceMappingURL=chunk-ETYTCTMI.js.map