/**
 * The untrusted publisher's component source, as a string, loaded into the VM.
 * Mirrors the fidelity-test fixture: a counter + a controlled name input + a
 * smuggled non-allowlisted <script> the host must drop.
 */
export const INTERACTIVE_GUEST = /* js */ `
  var state = { count: 0, name: '' };
  function view() {
    return FrameRemote.h('Card', {}, [
      FrameRemote.h('Stack', { gap: 12 }, [
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
        FrameRemote.h('script', { src: 'evil.js' }, []),
      ]),
    ]);
  }
  function render() { FrameRemote.render(view()); }
  render();
`;
