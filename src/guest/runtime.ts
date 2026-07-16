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
export const GUEST_RUNTIME_SOURCE = /* js */ `
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

  // Expose the SDK the untrusted component authors against.
  globalThis.FrameRemote = { h: h, text: text, render: render };
})();
`;
