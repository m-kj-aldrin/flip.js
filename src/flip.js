/**
 * Minimal FLIP utility with translation and optional scale, Promise-based play,
 * reduced-motion support, and basic controls.
 *
 * Usage pattern:
 *   const ctrl = flip(elements);
 *   // ...mutate DOM (reorder/insert/remove)
 *   await ctrl.play({ duration: 300 }).finished;
 *
 * @template {HTMLElement[] | Element[] | NodeListOf<HTMLElement> | HTMLCollection} T
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
   * @property {string} [easing='ease']
   * @property {number} [delay=0]
   * @property {number} [stagger=0]
   * @property {'none'|'forwards'|'backwards'|'both'|'auto'} [fill='auto']
   * @property {'normal'|'reverse'|'alternate'|'alternate-reverse'} [direction='normal']
   * @property {'replace'|'add'|'accumulate'} [composite='add']
   * @property {boolean} [shouldScale=true]
   * @property {boolean} [respectReducedMotion=true]
   * @property {string} [transformOrigin='0 0']
   * @property {number} [epsilon=0.5]
   */

  /** @type {Animation[]} */
  let currentAnimations = [];
  let disconnected = false;

  function measure() {
    elementBoxes.forEach((record) => {
      record.box = record.element.getBoundingClientRect();
    });
    return elementBoxes.map((r) => r.box);
  }

  /**
   * @template {HTMLElement[] | Element[] | NodeListOf<HTMLElement> | HTMLCollection} U
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
      } catch {
        // Intentionally ignore cancellation errors
      }
    });
    currentAnimations = [];
  }

  /**
   * @param {FlipOptions} [options]
   * @returns {{ animations: Animation[]; finished: Promise<void>; cancel: () => void; }}
   */
  function play(options) {
    const defaultOptions = {
      duration: 100,
      easing: 'ease',
      delay: 0,
      stagger: 0,
      fill: 'auto',
      direction: 'normal',
      composite: 'add',
      shouldScale: true,
      respectReducedMotion: true,
      transformOrigin: '0 0',
      epsilon: 0.5,
    };

    const opts = { ...defaultOptions, ...(options || {}) };

    if (disconnected) {
      return { animations: [], finished: Promise.resolve(), cancel };
    }

    const prefersReduced =
      !!opts.respectReducedMotion &&
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced || (opts.duration || 0) <= 0) {
      // No-op animation: immediately refresh measurements so next play works correctly
      update();
      return { animations: [], finished: Promise.resolve(), cancel };
    }

    // Read current boxes in a single pass
    const now = elementBoxes.map((record) => ({
      element: record.element,
      prevBox: record.box,
      nowBox: record.element.getBoundingClientRect(),
    }));

    /** @type {Animation[]} */
    const animations = [];

    now.forEach((entry, index) => {
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

      if (isNegligible) return;

      /** @type {Keyframe[]} */
      const keyframes = [
        {
          transformOrigin: opts.transformOrigin,
          transform:
            `translate(${dx}px, ${dy}px)` + (opts.shouldScale ? ` scale(${scaleX}, ${scaleY})` : ''),
        },
        {
          transformOrigin: opts.transformOrigin,
          transform: 'none',
        },
      ];

      try {
        entry.element.style.willChange = 'transform';
        const animation = entry.element.animate(keyframes, {
          duration: opts.duration,
          easing: opts.easing,
          delay: (opts.delay || 0) + index * (opts.stagger || 0),
          fill: opts.fill,
          direction: opts.direction,
          composite: opts.composite,
        });
        animations.push(animation);
      } catch {
        // If WAAPI is not available, skip animation rather than throwing
      }
    });

    currentAnimations = animations;

    const finished = Promise.all(animations.map((a) => a.finished))
      .catch(() => {
        // Ignore animation cancellation/rejection
      })
      .then(() => {
        // Cleanup and refresh measurements to make subsequent plays correct
        now.forEach((entry) => {
          try {
            entry.element.style.willChange = '';
          } catch {
            // Ignore cleanup errors
          }
        });
        update();
      });

    return { animations, finished, cancel };
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
