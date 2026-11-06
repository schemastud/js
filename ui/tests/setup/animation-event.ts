/**
 * jsdom has no `AnimationEvent`. React decides at module load which native event backs `onAnimationEnd`: with no
 * `AnimationEvent` on `window` it does not bind the unprefixed `animationend`, so a test's dispatched `animationend`
 * never reaches the handler. React 19.2 happened to tolerate this; 19.3 (what a fresh release build resolves) does
 * not, which failed the motion tests only inside release-package's isolated verify (owner-review-20261102 release,
 * 2026-11-06). Every browser has `AnimationEvent`, so this is a test-environment shim, not product behaviour. It must
 * load before React, which is why it is a setup file.
 */
if (typeof window !== 'undefined' && !('AnimationEvent' in window)) {
    class AnimationEventShim extends Event {
        readonly animationName: string;
        readonly elapsedTime: number;
        readonly pseudoElement: string;
        constructor(type: string, init: AnimationEventInit = {}) {
            super(type, init);
            this.animationName = init.animationName ?? '';
            this.elapsedTime = init.elapsedTime ?? 0;
            this.pseudoElement = init.pseudoElement ?? '';
        }
    }
    (window as unknown as { AnimationEvent: typeof AnimationEventShim }).AnimationEvent = AnimationEventShim;
}
