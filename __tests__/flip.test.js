import { describe, it, expect, vi } from 'vitest';
import flip from '../src/flip.js';

function createElementWithRect(rect) {
  let currentRect = { ...rect };
  const style = {};
  const calls = [];

  const el = {
    style,
    getBoundingClientRect: () => ({ ...currentRect }),
    animate: (keyframes, options) => {
      calls.push({ keyframes, options });
      return {
        finished: Promise.resolve(),
        cancel: () => {},
      };
    },
    __setRect: (next) => {
      currentRect = { ...currentRect, ...next };
    },
    __getAnimateCalls: () => calls,
  };
  return el;
}

describe('flip', () => {
  it('computes translate and scale based on rect deltas', async () => {
    const a = createElementWithRect({ left: 0, top: 0, width: 100, height: 50 });
    const b = createElementWithRect({ left: 120, top: 0, width: 100, height: 50 });

    const ctrl = flip([a, b]);

    // Mutate layout: move a to x=50,y=20 and resize to 200x100; b to x=140
    a.__setRect({ left: 50, top: 20, width: 200, height: 100 });
    b.__setRect({ left: 140, top: 0, width: 100, height: 50 });

    const { finished } = ctrl.play({ duration: 10 });
    await finished;

    const aCall = a.__getAnimateCalls()[0];
    const bCall = b.__getAnimateCalls()[0];

    expect(aCall).toBeTruthy();
    expect(bCall).toBeTruthy();

    // a moved from (0,0,100x50) to (50,20,200x100)
    // dx = 0-50 = -50, dy = 0-20 = -20, scaleX = 100/200 = 0.5, scaleY = 50/100 = 0.5
    const aTransform = aCall.keyframes[0].transform;
    expect(aTransform).toContain('translate(-50px, -20px)');
    expect(aTransform).toContain('scale(0.5, 0.5)');

    // b moved from (120,0) to (140,0)
    const bTransform = bCall.keyframes[0].transform;
    expect(bTransform).toContain('translate(-20px, 0px)');
  });

  it('resolves finished and refreshes measurements for subsequent plays', async () => {
    const a = createElementWithRect({ left: 0, top: 0, width: 100, height: 50 });
    const ctrl = flip([a]);

    a.__setRect({ left: 100, top: 0 });
    await ctrl.play({ duration: 10 }).finished;

    // Next move should be computed from latest position
    a.__setRect({ left: 150, top: 0 });
    await ctrl.play({ duration: 10 }).finished;

    const calls = a.__getAnimateCalls();
    expect(calls.length).toBe(2);
    expect(calls[0].keyframes[0].transform).toContain('translate(-100px, 0px)');
    expect(calls[1].keyframes[0].transform).toContain('translate(-50px, 0px)');
  });

  it('applies delay and stagger per index', async () => {
    const a = createElementWithRect({ left: 0, top: 0, width: 10, height: 10 });
    const b = createElementWithRect({ left: 10, top: 0, width: 10, height: 10 });
    const c = createElementWithRect({ left: 20, top: 0, width: 10, height: 10 });

    const ctrl = flip([a, b, c]);
    a.__setRect({ left: 5 });
    b.__setRect({ left: 15 });
    c.__setRect({ left: 25 });

    await ctrl.play({ duration: 10, delay: 100, stagger: 50 }).finished;

    const aDelay = a.__getAnimateCalls()[0].options.delay;
    const bDelay = b.__getAnimateCalls()[0].options.delay;
    const cDelay = c.__getAnimateCalls()[0].options.delay;

    expect(aDelay).toBe(100);
    expect(bDelay).toBe(150);
    expect(cDelay).toBe(200);
  });

  it('respects prefers-reduced-motion by skipping animations', async () => {
    const originalMatchMedia = globalThis.matchMedia;
    globalThis.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: () => {}, removeEventListener: () => {} });

    const a = createElementWithRect({ left: 0, top: 0, width: 10, height: 10 });
    const ctrl = flip([a]);
    a.__setRect({ left: 50 });

    const result = ctrl.play({ duration: 50 });
    await result.finished;

    expect(a.__getAnimateCalls().length).toBe(0);

    globalThis.matchMedia = originalMatchMedia;
  });
});