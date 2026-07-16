/**
 * Untrusted-guest source fixtures used by the isolation tests. Each is a STRING
 * loaded into the QuickJS VM — exactly as a real remote publisher's bundle would be.
 */

/**
 * Containment self-probe. Attempts to reach every ambient it would want and reports
 * whether each is reachable, by rendering a report through the vocabulary. Because
 * QuickJS has none of these, every target must be unreachable.
 *
 * We surface the result two ways so tests can assert cheaply:
 *   - a global `__PROBE__` array (read via a dispatched capture, see test), and
 *   - a rendered Text node per target ("<target>: BLOCKED|LEAKED").
 */
export const CONTAINMENT_PROBE = /* js */ `
  var targets = {
    document: function () { return typeof document; },
    'document.cookie': function () { return document.cookie; },
    window: function () { return typeof window; },
    'window.parent': function () { return window.parent; },
    localStorage: function () { return typeof localStorage; },
    fetch: function () { return typeof fetch; },
    globalThis_fetch: function () { return typeof globalThis.fetch; },
    XMLHttpRequest: function () { return typeof XMLHttpRequest; },
  };
  var report = [];
  for (var name in targets) {
    var reachable;
    try {
      var v = targets[name]();
      // 'undefined' typeof, or an actually-undefined value, counts as blocked.
      reachable = !(v === undefined || v === 'undefined');
    } catch (e) {
      reachable = false; // ReferenceError etc. => blocked
    }
    report.push({ target: name, blocked: !reachable });
  }
  globalThis.__PROBE__ = report;

  // Also render it through the vocabulary so the host sees a painted result.
  var kids = report.map(function (r) {
    return FrameRemote.h('Text', { text: r.target + ': ' + (r.blocked ? 'BLOCKED' : 'LEAKED') });
  });
  FrameRemote.render(FrameRemote.h('Card', {}, [FrameRemote.h('Stack', { gap: 6 }, kids)]));
`;

/**
 * Sandbox-escape attempt: prototype pollution + global tamper. In a separate realm
 * this pollutes only the VM's own intrinsics; the host realm's `Object.prototype`
 * must be untouched.
 */
export const ESCAPE_PROBE = /* js */ `
  // Render BEFORE tampering so the paint still lands; the attack follows.
  FrameRemote.render(FrameRemote.h('Text', { text: 'escape attempted' }));
  Object.prototype.polluted = 'PWNED';
  Array.prototype.polluted = 'PWNED';
  // Tamper with intrinsics + try to hijack the injected bridge in the VM realm.
  try { Function.prototype.call = function () { return 'tampered'; }; } catch (e) {}
  try { globalThis.__frame_mutate = function () { throw new Error('hijacked'); }; } catch (e) {}
  globalThis.__ESCAPE_MARKER__ = ({}).polluted; // proves pollution DID land in-VM
`;

/** Infinite loop — must be killed by the deadline interrupt. */
export const INFINITE_LOOP = /* js */ `
  FrameRemote.render(FrameRemote.h('Text', { text: 'about to spin' }));
  var x = 0;
  while (true) { x = (x + 1) % 1000000; }
`;

/** Unbounded allocation — must hit the memory ceiling. */
export const MEMORY_HOG = /* js */ `
  // Retained allocation: push objects forever. Each is small, but they are never
  // released, so the runtime's memory ceiling ("out of memory") is reached before
  // any wall-clock deadline — the substrate caps it, the host never OOMs.
  var sink = [];
  while (true) {
    sink.push({ x: 1, y: 2, z: 'hello world padding padding padding' });
  }
`;

/**
 * An interactive component: a counter button + a controlled name input. Proves the
 * event round-trip (guest -> host paint -> host event -> guest re-render).
 */
export const INTERACTIVE_COMPONENT = /* js */ `
  var state = { count: 0, name: '' };
  function view() {
    return FrameRemote.h('Card', {}, [
      FrameRemote.h('Stack', { gap: 10 }, [
        FrameRemote.h('Badge', { text: 'thingsontv · remote block' }),
        FrameRemote.h('Heading', { text: 'Polish this block' }),
        FrameRemote.h('Text', {
          text: state.name
            ? ('Hello, ' + state.name + ' — clicked ' + state.count + 'x.')
            : ('Clicked ' + state.count + 'x. Type your name below.'),
        }),
        FrameRemote.h('TextInput', {
          placeholder: 'your name',
          value: state.name,
          onInput: function (p) { state.name = p.value; render(); },
        }),
        FrameRemote.h('Button', {
          text: 'Increment (' + state.count + ')',
          onClick: function () { state.count = state.count + 1; render(); },
        }),
        // smuggled: a type the host does NOT own. Host must refuse to paint it.
        FrameRemote.h('script', { src: 'evil.js' }, []),
      ]),
    ]);
  }
  function render() { FrameRemote.render(view()); }
  render();
`;
