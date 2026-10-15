// src/guest/sdk.ts
function bridge() {
  const fr = globalThis.FrameRemote;
  if (!fr) {
    throw new Error(
      "@schemastud/frame-remote/sdk: FrameRemote bridge is not present. This module must be evaluated inside the frame-remote guest VM."
    );
  }
  return fr;
}
function h(type, props, children) {
  return bridge().h(type, props, children);
}
function text(value) {
  return bridge().text(value);
}
function render(tree) {
  bridge().render(tree);
}
function capability(name, args) {
  return bridge().capability(name, args);
}
function defineComponent(setup) {
  setup({ render, capability });
}
export {
  capability,
  defineComponent,
  h,
  render,
  text
};
//# sourceMappingURL=sdk.js.map