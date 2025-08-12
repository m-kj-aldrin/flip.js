/**
 * Easing values accepted by the Web Animations API's `easing` option.
 * Matches the CSS `animation-timing-function` and `transition-timing-function` syntax.
 * @typedef {("linear"|"ease"|"ease-in"|"ease-out"|"ease-in-out"|"step-start"|"step-end"|`cubic-bezier(${string})`|`steps(${number})`|`steps(${number},start)`|`steps(${number}, end)`|`linear(${string})`)} EasingFunctions
 */

/**
 * Minimal FLIP utility with translation and optional scale, Promise-based play,
 * reduced-motion support, and basic controls.
 *
 * Usage pattern:
 *   const ctrl = flip(elements);
 *   // ...mutate DOM (reorder/insert/remove)
 *   await ctrl.play({ duration: 300 }).finished;
 *
 * @template {HTMLElement[]  | NodeListOf<HTMLElement> | HTMLCollectionOf<HTMLElement> } T
 * @param {T} elements
 */
export default function flip(elements) {
  const elementBoxes = Array.from(elements).map((element) => ({
    element,
    box: element.getBoundingClientRect(),
  }));

  /**
   * @typedef {Object} FlipOptions
   * @property {number} [duration=100]
   * @property {EasingFunctions} [easing='ease']
   * @property {number} [delay=0]
   * @property {number | ((index: number, count: number, element: HTMLElement) => number)} [stagger=0]
   * @property {FillMode} [fill='both']
   * @property {PlaybackDirection} [direction='normal']
   * @property {CompositeOperation} [composite='add']
   * @property {boolean} [shouldScale=true]
   * @property {boolean} [respectReducedMotion=true]
   * @property {string} [transformOrigin='0 0']
   * @property {number} [epsilon=0.5]
   * @property {'cancel'|'ignore'|'queue'} [interrupt='cancel']
   * @property {(ctx: { options: FlipOptions; count: number; animations: Animation[] }) => void} [onStart]
   * @property {(entry: { element: HTMLElement; index: number; prevBox: DOMRectReadOnly; nowBox: DOMRectReadOnly; delta: { dx: number; dy: number; scaleX: number; scaleY: number } }, ctx: { options: FlipOptions; count: number; animations: Animation[] }) => void} [onEachStart]
   * @property {(entry: { element: HTMLElement; index: number; prevBox: DOMRectReadOnly; nowBox: DOMRectReadOnly; delta: { dx: number; dy: number; scaleX: number; scaleY: number } }, ctx: { options: FlipOptions; count: number; animations: Animation[] }) => void} [onEachFinish]
   * @property {(ctx: { options: FlipOptions; count: number; animations: Animation[] }) => void} [onFinish]
   */

  /** @type {Animation[]} */
  let currentAnimations = [];
  let disconnected = false;
  // Concurrency tracking
  let activeRunId = 0;
  /** @type {null | { runId: number; hasQueued?: boolean; queuedStarter?: () => { animations: Animation[]; finished: Promise<void>; cancel: () => void }; result: { animations: Animation[]; finished: Promise<void>; cancel: () => void } }} */
  let inFlight = null;

  /**
   * Build a transform string from deltas.
   * @param {number} dx
   * @param {number} dy
   * @param {number} scaleX
   * @param {number} scaleY
   * @param {boolean} shouldScale
   */
  function buildTransform(dx, dy, scaleX, scaleY, shouldScale) {
    const parts = [`translate(${dx}px, ${dy}px)`];
    if (shouldScale) parts.push(`scale(${scaleX}, ${scaleY})`);
    return parts.join(' ');
  }

  /**
   * Parse a numeric data attribute value; returns null if not finite
   * @param {string | null} value
   */
  function parseNumeric(value) {
    if (value == null) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function measure() {
    elementBoxes.forEach((record) => {
      record.box = record.element.getBoundingClientRect();
    });
    return elementBoxes.map((r) => r.box);
  }

  /**
   * @template {HTMLElement[] | NodeListOf<HTMLElement> | HTMLCollectionOf<HTMLElement>} U
   * @param {U} [newElements]
   */
  function update(newElements) {
    if (newElements) {
      const next = Array.from(newElements);
      elementBoxes.length = 0;
      next.forEach((element) => {
        elementBoxes.push({ element, box: element.getBoundingClientRect() });
      });
    } else {
      measure();
    }
  }

  function cancel() {
    currentAnimations.forEach((a) => {
      try {
        a.cancel();
      } catch { /* ignore */ }
    });
    currentAnimations = [];
  }

  /**
   * @param {FlipOptions} [options]
   * @returns {{ animations: Animation[]; finished: Promise<void>; cancel: () => void; }}
   */
  function play(options) {
    /** @type {FlipOptions} */
    const defaultOptions = {
      duration: 100,
      easing: 'ease',
      delay: 0,
      stagger: 0,
      fill: 'both',
      direction: 'normal',
      composite: 'add',
      shouldScale: true,
      respectReducedMotion: true,
      transformOrigin: '0 0',
      epsilon: 0.5,
      /** @type {'cancel'|'ignore'|'queue'} */
      interrupt: 'cancel',
    };

    const opts = { ...defaultOptions, ...(options || {}) };

    if (disconnected) {
      return { animations: [], finished: Promise.resolve(), cancel };
    }

    // Handle concurrent play calls
    if (inFlight) {
      const mode = opts.interrupt || 'cancel';
      if (mode === 'ignore') {
        return inFlight.result;
      }
      if (mode === 'cancel') {
        try {
          inFlight.result.cancel();
        } catch { /* ignore */ }
        inFlight = null;
      }
      // 'queue' handled after we define startRun
    }

    const prefersReduced =
      !!opts.respectReducedMotion &&
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced || (opts.duration || 0) <= 0) {
      // No-op animation: immediately refresh measurements so next play works correctly
      update();
      try {
        // Lifecycle hooks with no animations
        opts.onStart?.({ options: opts, count: 0, animations: [] });
      } catch { /* ignore */ }
      const finished = Promise.resolve().then(() => {
        try {
          opts.onFinish?.({ options: opts, count: 0, animations: [] });
        } catch { /* ignore */ }
      });
      return { animations: [], finished, cancel };
    }

    // Internal runner with read/compute/write batching and lifecycle hooks
    const startRun = () => {
      const runId = ++activeRunId;

      // Phase 1: reads
      const entries = elementBoxes.map((record, index) => ({
        element: record.element,
        index,
        prevBox: record.box,
        nowBox: record.element.getBoundingClientRect(),
      }));

      // Phase 2: compute
      const computed = entries.map((entry) => {
        const dx = entry.prevBox.left - entry.nowBox.left;
        const dy = entry.prevBox.top - entry.nowBox.top;

        const prevW = entry.prevBox.width || 0;
        const prevH = entry.prevBox.height || 0;
        const nowW = entry.nowBox.width || 0;
        const nowH = entry.nowBox.height || 0;

        const scaleX = opts.shouldScale && nowW > 0 ? prevW / nowW : 1;
        const scaleY = opts.shouldScale && nowH > 0 ? prevH / nowH : 1;

        const isNegligible =
          Math.abs(dx) < opts.epsilon &&
          Math.abs(dy) < opts.epsilon &&
          Math.abs(scaleX - 1) < 0.01 &&
          Math.abs(scaleY - 1) < 0.01;

        return { entry, dx, dy, scaleX, scaleY, isNegligible };
      });

      /** @type {Animation[]} */
      const animations = [];
      /** Aligns with animations array; holds computed meta that produced each animation */
      const animMeta = [];

      try {
        opts.onStart?.({ options: opts, count: computed.length, animations });
      } catch { /* ignore */ }

      // Phase 3: writes and start animations
      const count = computed.length;
      const baseDelay = opts.delay || 0;
      /** @type {(i: number, c: number, el: HTMLElement) => number} */
      const staggerResolver =
        typeof opts.stagger === 'function'
          ? (i, c, el) => baseDelay + /** @type {Exclude<FlipOptions['stagger'], number>} */ (opts.stagger)(i, c, el)
          : (i) => baseDelay + i * (/** @type {number} */ (opts.stagger) || 0);

      computed.forEach((c) => {
        if (c.isNegligible) return;

        /** @type {Keyframe[]} */
        const keyframes = [
          {
            transformOrigin: opts.transformOrigin,
            transform: buildTransform(c.dx, c.dy, c.scaleX, c.scaleY, !!opts.shouldScale),
          },
          {
            transformOrigin: opts.transformOrigin,
            transform: 'none',
          },
        ];

        try {
          c.entry.element.style.willChange = 'transform';
          const delay = staggerResolver(c.entry.index, count, c.entry.element);
          // Per-element overrides via data attributes
          // data-flip-duration: absolute duration in ms for this element
          // data-flip-duration-offset: added to options.duration; ignored if data-flip-duration is present
          // data-flip-delay: absolute delay in ms for this element (overrides base delay + stagger)
          const el = c.entry.element;
          const attrDuration = parseNumeric(el.getAttribute?.('data-flip-duration') ?? null);
          const attrDurationOffset = parseNumeric(el.getAttribute?.('data-flip-duration-offset') ?? null);
          const attrDelay = parseNumeric(el.getAttribute?.('data-flip-delay') ?? null);

          let effectiveDuration = opts.duration;
          if (attrDurationOffset != null) {
            effectiveDuration = Math.max(0, (opts.duration || 0) + attrDurationOffset);
          }
          if (attrDuration != null) {
            effectiveDuration = Math.max(0, attrDuration);
          }

          const effectiveDelay = attrDelay != null ? Math.max(0, attrDelay) : delay;

          const animation = el.animate(keyframes, {
            duration: effectiveDuration,
            easing: opts.easing,
            delay: effectiveDelay,
            fill: opts.fill,
            direction: opts.direction,
            composite: opts.composite,
          });
          animations.push(animation);
          animMeta.push(c);
          try {
            opts.onEachStart?.(
              {
                element: c.entry.element,
                index: c.entry.index,
                prevBox: c.entry.prevBox,
                nowBox: c.entry.nowBox,
                delta: { dx: c.dx, dy: c.dy, scaleX: c.scaleX, scaleY: c.scaleY },
              },
              { options: opts, count, animations }
            );
          } catch { /* ignore */ }
        } catch { /* ignore */ }
      });

      currentAnimations = animations;

      // Per-animation finish hooks
      animations.forEach((a, animationIndex) => {
        a.finished
          .catch(() => { return; })
          .then(() => {
            if (runId !== activeRunId) return;
            const c = animMeta[animationIndex];
            if (!c) return;
            try {
              opts.onEachFinish?.(
                {
                  element: c.entry.element,
                  index: c.entry.index,
                  prevBox: c.entry.prevBox,
                  nowBox: c.entry.nowBox,
                  delta: { dx: c.dx, dy: c.dy, scaleX: c.scaleX, scaleY: c.scaleY },
                },
                { options: opts, count: animMeta.length, animations }
              );
            } catch { /* ignore */ }
          });
      });

      const finished = Promise.all(animations.map((a) => a.finished))
        .catch(() => { return; })
        .then(() => {
          if (runId !== activeRunId) return;
          // Cleanup and refresh measurements to make subsequent plays correct
          entries.forEach((entry) => {
            try {
              entry.element.style.willChange = '';
            } catch { /* ignore */ }
          });
          // If another run was queued, skip measurement refresh here so the queued
          // run computes deltas relative to the last stable measurement
          const queuedStarter = inFlight && inFlight.runId === runId ? inFlight.queuedStarter : undefined;
          if (!(inFlight && inFlight.runId === runId && inFlight.hasQueued)) {
            update();
          }
          try {
            opts.onFinish?.({ options: opts, count: animMeta.length, animations });
          } catch { /* ignore */ }
          if (inFlight && inFlight.runId === runId) {
            inFlight = null;
          }
          // Start queued run immediately (using queued options), if present
          if (queuedStarter) {
            queuedStarter();
          }
        });

      const result = { animations, finished, cancel };
      inFlight = { runId, result };
      return result;
    };

    if (opts.interrupt === 'queue' && inFlight) {
      // Chain after current run; ensure we don't start twice
      inFlight.hasQueued = true;
      /** @type {(value: { animations: Animation[]; finished: Promise<void>; cancel: () => void }) => void} */
      let resolveStarted;
      const startedPromise = new Promise((res) => { resolveStarted = res; });
      inFlight.queuedStarter = () => {
        const started = startRun();
        resolveStarted(started);
        return started;
      };
      const finished = inFlight.result.finished
        .catch(() => { return; })
        .then(() => startedPromise)
        .then((started) => started.finished);
      return { animations: [], finished, cancel };
    }

    return startRun();
  }

  function disconnect() {
    cancel();
    disconnected = true;
    elementBoxes.length = 0;
  }

  return {
    play,
    measure,
    update,
    cancel,
    disconnect,
  };
}
