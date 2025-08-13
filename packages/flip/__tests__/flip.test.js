import { describe, it, expect, vi } from 'vitest';
import flip from '../src/flip.js';

/** @param {any} rect */
function createElementWithRect(rect) {
  let currentRect = { ...rect };
  const style = {};
  const calls = [];

  /** @type {any} */
  const el = {
    style,
    getBoundingClientRect: () => ({ ...currentRect }),
    getAttribute: () => undefined,
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

    const ctrl = flip([/** @type {any} */ (a), /** @type {any} */ (b)]);

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
    const ctrl = flip([/** @type {any} */ (a)]);

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

    const ctrl = flip([/** @type {any} */ (a), /** @type {any} */ (b), /** @type {any} */ (c)]);
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

  it('fires lifecycle hooks with correct counts and order', async () => {
    const a = createElementWithRect({ left: 0, top: 0, width: 100, height: 50 });
    const b = createElementWithRect({ left: 100, top: 0, width: 100, height: 50 });

    const events = [];
    const ctrl = flip([a, b]);

    // Move both
    a.__setRect({ left: 10 });
    b.__setRect({ left: 120 });

    await ctrl
      .play({
        duration: 10,
        onStart: (ctx) => events.push(['start', ctx.count]),
        onEachStart: (entry) => events.push(['eachStart', entry.index]),
        onEachFinish: (entry) => events.push(['eachFinish', entry.index]),
        onFinish: (ctx) => events.push(['finish', ctx.count]),
      })
      .finished;

    const kinds = events.map((e) => e[0]);
    expect(kinds[0]).toBe('start');
    expect(kinds[kinds.length - 1]).toBe('finish');
    expect(events.filter((e) => e[0] === 'eachStart').length).toBe(2);
    expect(events.filter((e) => e[0] === 'eachFinish').length).toBe(2);
  });

  it('calls hooks even when animations are skipped (duration=0)', async () => {
    const a = createElementWithRect({ left: 0, top: 0, width: 10, height: 10 });
    const events = [];
    const ctrl = flip([a]);
    a.__setRect({ left: 50 });

    await ctrl
      .play({ duration: 0, onStart: () => events.push('start'), onFinish: () => events.push('finish') })
      .finished;

    expect(events).toEqual(['start', 'finish']);
  });

  it('supports function-based stagger', async () => {
    const a = createElementWithRect({ left: 0, top: 0, width: 10, height: 10 });
    const b = createElementWithRect({ left: 10, top: 0, width: 10, height: 10 });
    const c = createElementWithRect({ left: 20, top: 0, width: 10, height: 10 });

    const ctrl = flip([a, b, c]);
    a.__setRect({ left: 5 });
    b.__setRect({ left: 15 });
    c.__setRect({ left: 25 });

    const stagger = (i, count) => (count - i) * 10; // 30,20,10
    await ctrl.play({ duration: 10, delay: 100, stagger }).finished;

    expect(a.__getAnimateCalls()[0].options.delay).toBe(130);
    expect(b.__getAnimateCalls()[0].options.delay).toBe(120);
    expect(c.__getAnimateCalls()[0].options.delay).toBe(110);
  });

  it('interrupt: ignore returns the in-flight result', async () => {
    // Element with controllable finished promise
    /** @param {any} rect */
    function createControllableElement(rect) {
      let currentRect = { ...rect };
      const style = {};
      let lastResolve;
      /** @type {any} */
      const el = {
        style,
        getBoundingClientRect: () => ({ ...currentRect }),
        animate: () => {
          return {
            finished: new Promise((res) => {
              lastResolve = res;
            }),
            cancel: () => {},
          };
        },
        __setRect: (next) => {
          currentRect = { ...currentRect, ...next };
        },
        __resolve: () => lastResolve?.(),
      };
      return el;
    }

    const a = createControllableElement({ left: 0, top: 0, width: 10, height: 10 });
    const ctrl = flip([/** @type {any} */ (a)]);
    a.__setRect({ left: 50 });

    const first = ctrl.play({ duration: 10 });
    const second = ctrl.play({ duration: 10, interrupt: 'ignore' });

    expect(second).toBe(first);
    a.__resolve();
    await first.finished;
  });

  it('interrupt: cancel cancels current animations before starting new', async () => {
    /** @param {any} rect */
    function createCancelableElement(rect) {
      let currentRect = { ...rect };
      const style = {};
      const cancelSpy = vi.fn();
      let lastAnimation = null;
      /** @type {any} */
      const el = {
        style,
        getBoundingClientRect: () => ({ ...currentRect }),
        animate: () => {
          lastAnimation = {
            finished: new Promise((res) => {
              // keep resolver around
            }),
            cancel: cancelSpy,
          };
          return lastAnimation;
        },
        __setRect: (next) => {
          currentRect = { ...currentRect, ...next };
        },
        __getLastAnimation: () => lastAnimation,
        __getCancelSpy: () => cancelSpy,
      };
      return el;
    }

    const a = createCancelableElement({ left: 0, top: 0, width: 10, height: 10 });
    const ctrl = flip([/** @type {any} */ (a)]);
    a.__setRect({ left: 10 });
    const first = ctrl.play({ duration: 10 });
    // Trigger a second play() immediately; default interrupt is 'cancel'
    a.__setRect({ left: 20 });
    const second = ctrl.play({ duration: 10 });

    expect(second).not.toBe(first);
    expect(a.__getCancelSpy()).toHaveBeenCalled();
  });

  it('interrupt: queue schedules after current finishes', async () => {
    /** @param {any} rect */
    function createQueuedElement(rect) {
      let currentRect = { ...rect };
      const style = {};
      const resolvers = [];
      let callCount = 0;
      /** @type {any} */
      const el = {
        style,
        getBoundingClientRect: () => ({ ...currentRect }),
        animate: () => {
          callCount += 1;
          const finished = new Promise((res) => {
            resolvers.push(res);
          });
          return { finished, cancel: () => {} };
        },
        __setRect: (next) => {
          currentRect = { ...currentRect, ...next };
        },
        __resolveNext: () => {
          const r = resolvers.shift();
          r && r();
        },
        __getAnimateCallCount: () => callCount,
      };
      return el;
    }

    const a = createQueuedElement({ left: 0, top: 0, width: 10, height: 10 });
    const ctrl = flip([/** @type {any} */ (a)]);
    a.__setRect({ left: 10 });
    const first = ctrl.play({ duration: 10 });
    a.__setRect({ left: 20 });
    const second = ctrl.play({ duration: 10, interrupt: 'queue' });

    // Only first run should have started so far
    expect(a.__getAnimateCallCount()).toBe(1);
    // Finish first
    a.__resolveNext();
    await first.finished;

    // After first finishes, second should start
    expect(a.__getAnimateCallCount()).toBe(2);
    a.__resolveNext();
    await second.finished;
  });
});