import flip from './flip.js';

/**
 * Declarative FLIP custom element.
 *
 * Usage:
 *   <flip-group selector="li" stagger="proximity" stagger-step="60" duration="300" easing="ease-out">
 *     ...
 *   </flip-group>
 *
 * - Tracks items by `selector` (defaults to 'li') inside its subtree.
 * - Observes childList mutations and animates changes using FLIP.
 * - Keeps a baseline (FIRST) of rects and indices when calm via ResizeObserver.
 * - On mutation, freezes FIRST, computes LAST, and animates.
 * - Elements marked with `data-flip-primary` are treated as primaries for staggering, then cleared after run.
 */
export class FlipGroup extends HTMLElement {
  constructor() {
    super();
    /** @type {Map<Element, { rect: DOMRectReadOnly; parent: Element | null; index: number }>} */
    this._first = new Map();
    /** @type {boolean} */
    this._pending = false;
    /** @type {ResizeObserver | null} */
    this._ro = null;
    /** @type {MutationObserver | null} */
    this._mo = null;
    /** @type {Animation[] | null} */
    this._activeAnimations = null;
    /** @type {{ cancel: () => void } | null} */
    this._lastController = null;
    /** @type {(ctx: { element: HTMLElement; from: any; to: any; isPrimary: boolean }) => number | null} */
    this.stagger = null; // optional JS property override
  }

  connectedCallback() {
    this._ro = new ResizeObserver(() => {
      if (this._pending) return;
      this._log('RO: refresh FIRST');
      this._refreshFirst();
    });
    this._ro.observe(this);

    this._mo = new MutationObserver((records) => {
      if (!records.some((r) => r.type === 'childList')) return;
      if (this._pending) return;
      this._pending = true; // freeze baseline
      this._log('MO: childList detected, freeze FIRST and schedule flush');
      queueMicrotask(() => {
        // Batch across microtasks, then run on next frame
        requestAnimationFrame(() => this._flush());
      });
    });
    this._mo.observe(this, { childList: true, subtree: true });

    this._log('connected: initial FIRST');
    this._refreshFirst();
  }

  disconnectedCallback() {
    try {
      this._ro?.disconnect();
    } catch {
      /* ignore */
    }
    try {
      this._mo?.disconnect();
    } catch {
      /* ignore */
    }
    this._ro = null;
    this._mo = null;
    try {
      this._lastController?.cancel?.();
    } catch {
      /* ignore */
    }
    this._lastController = null;
  }

  /** Public API for imperative marking from userland JS */
  markPrimary(elOrEls) {
    const arr = Array.isArray(elOrEls) ? elOrEls : [elOrEls];
    arr.forEach((el) => {
      if (el && el.nodeType === 1) {
        try {
          el.setAttribute('data-flip-primary', '');
        } catch {
          /* ignore */
        }
      }
    });
  }

  /** Refresh FIRST = current local rects and indices when calm */
  _refreshFirst() {
    const items = this._items();
    this._log('FIRST refresh: items=', items.length);
    const containerRect = this.getBoundingClientRect();
    this._first.clear();
    const indexMapByParent = this._buildDomIndexMap(items);
    items.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const localRect = new DOMRect(
        r.left - containerRect.left,
        r.top - containerRect.top,
        r.width,
        r.height,
      );
      const parent = el.parentElement;
      const idx = parent ? (indexMapByParent.get(parent)?.get(el) ?? i) : i;
      this._first.set(el, { rect: localRect, parent, index: idx });
    });
  }

  /** Perform a FLIP run for the current mutation batch */
  _flush() {
    const items = this._items();
    if (items.length === 0) {
      this._log('flush: no items, abort');
      this._pending = false;
      return;
    }
    this._log('flush: start, items=', items.length);

    // Snapshot data needed for stagger proximity calculations
    /** @type {WeakMap<Element, number>} */
    const firstIndexByElement = new WeakMap();
    /** @type {WeakMap<Element, (Element|null)>} */
    const firstParentByElement = new WeakMap();
    this._first.forEach((v, el) => {
      firstIndexByElement.set(el, v.index);
      firstParentByElement.set(el, v.parent);
    });

    /** primaries declared via attribute */
    const primaries = items.filter((el) => el.hasAttribute('data-flip-primary'));
    this._log('flush: primaries=', primaries.length);

    // Precompute new insertion anchors for primaries (post-mutation)
    const indexMapByParentAfter = this._buildDomIndexMap(items);
    /** @type {{ parent: Element|null, index: number }[]} */
    const primaryNewAnchors = primaries.map((el) => {
      const p = el.parentElement;
      const idx = p ? (indexMapByParentAfter.get(p)?.get(el) ?? 0) : 0;
      return { parent: p, index: idx };
    });

    /** Old anchors for primaries from FIRST */
    /** @type {{ parent: Element|null, index: number }[]} */
    const primaryOldAnchors = primaries.map((el) => {
      const p = firstParentByElement.get(el) || null;
      const idx = firstIndexByElement.get(el) ?? 0;
      return { parent: p, index: idx };
    });

    // Seed transforms to visually warp items back to FIRST local rects
    const containerRect = this.getBoundingClientRect();
    items.forEach((el) => {
      const first = this._first.get(el);
      if (!first) return;
      const now = el.getBoundingClientRect();
      const firstLeft = first.rect.left + containerRect.left;
      const firstTop = first.rect.top + containerRect.top;
      const dx = firstLeft - now.left;
      const dy = firstTop - now.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      el.style.willChange = 'transform';
    });
    this._log('flush: seeded transforms (if any)');

    // Force reflow so transforms are applied before measuring in flip()
    try {
      void this.offsetWidth;
    } catch {
      /* ignore */
    }

    // Build controller over current items; prevBox equals transformed positions
    const controller = flip(items);
    this._log('flush: controller created');

    // Clear our seeding transforms (animation will handle actual movement)
    items.forEach((el) => {
      el.style.transform = '';
      el.style.willChange = '';
    });

    // Mark primaries for this run on the controller
    if (primaries.length) controller.markPrimary(primaries);

    // Build stagger from attributes/preset or property
    const { stagger, duration, easing, respectReducedMotion } = this._readOptions();
    const prefersReduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const effectiveReduced = (respectReducedMotion ?? true) && prefersReduced;
    this._log('options:', {
      stagger,
      duration,
      easing,
      respectReducedMotion,
      prefersReduced,
      effectiveReduced,
    });

    /** proximity preset helper */
    const buildProximity = () => {
      const step = this._readNumberAttr('stagger-step', 60);
      return (ctx) => {
        if (ctx.isPrimary) return 0;
        const distances = [];
        // distance to old anchors (use FIRST indices)
        const oldIndex = firstIndexByElement.get(ctx.element) ?? 0;
        const oldParent = firstParentByElement.get(ctx.element) || null;
        primaryOldAnchors.forEach((a) => {
          if (a.parent === oldParent) distances.push(Math.abs(oldIndex - a.index));
        });
        // distance to new anchors (use current to.index)
        const newIndex = ctx.to.index;
        const newParent = ctx.to.parent;
        primaryNewAnchors.forEach((a) => {
          if (a.parent === newParent) distances.push(Math.abs(newIndex - a.index));
        });
        const dist = distances.length ? Math.min(...distances) : 0;
        return dist * step;
      };
    };

    /** decide stagger option */
    /** @type {number | ((ctx: any) => number)} */
    let staggerOption = 0;
    if (this.stagger && typeof this.stagger === 'function') {
      staggerOption = this.stagger;
    } else if (typeof stagger === 'number') {
      staggerOption = stagger;
    } else if (stagger === 'proximity') {
      staggerOption = buildProximity();
    } else {
      // 'index' or unknown preset defaults to index-based
      const step = this._readNumberAttr('stagger-step', 20);
      staggerOption = (ctx) => (ctx.isPrimary ? 0 : ctx.from.index * step);
    }
    this._log('stagger resolved:', typeof staggerOption === 'number' ? staggerOption : 'function');

    // Cancel previous run if any
    try {
      this._lastController?.cancel?.();
    } catch {
      /* ignore */
    }
    this._lastController = controller;

    // Kick animation
    const easingOption = /** @type {any} */ (easing ?? 'ease');
    controller.play({
      duration: duration ?? 300,
      easing: easingOption,
      respectReducedMotion: respectReducedMotion ?? true,
      interrupt: 'cancel',
      stagger: staggerOption,
      onStart: ({ count }) => {
        this._log('play: onStart count=', count);
      },
      onFinish: () => {
        this._log('play: onFinish');
        // Clear primary attributes after run
        primaries.forEach((el) => {
          try {
            el.removeAttribute('data-flip-primary');
          } catch {
            /* ignore */
          }
        });
      },
    });

    // Rebase FIRST to LAST after starting
    this._refreshFirst();
    this._pending = false;
    this._log('flush: end, FIRST rebased');
  }

  _items() {
    const selector = this.getAttribute('selector') || 'li';
    return Array.from(this.querySelectorAll(selector)).filter((n) => n instanceof HTMLElement);
  }

  _readOptions() {
    const duration = this._readNumberAttr('duration', null);
    const easing = this.getAttribute('easing') || null;
    const respectReducedMotionAttr = this.getAttribute('respect-reduced-motion');
    const respectReducedMotion =
      respectReducedMotionAttr == null ? null : respectReducedMotionAttr !== 'false';
    const staggerAttr = this.getAttribute('stagger');
    let stagger = null;
    if (staggerAttr) {
      const asNum = Number(staggerAttr);
      stagger = Number.isFinite(asNum) ? asNum : staggerAttr;
    }
    return { duration, easing, respectReducedMotion, stagger };
  }

  _log(...args) {
    if (!this.hasAttribute('debug')) return;
    try {
      console.log('[flip-group]', ...args);
    } catch {
      /* ignore */
    }
  }

  _readNumberAttr(name, fallback) {
    const v = this.getAttribute(name);
    if (v == null) return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  /** Build maps of DOM indices per parent for provided elements. */
  _buildDomIndexMap(els) {
    /** @type {Map<HTMLElement, Map<Element, number>>} */
    const parentToIndex = new Map();
    try {
      /** @type {Map<HTMLElement, true>} */
      const parents = new Map();
      for (let i = 0; i < els.length; i += 1) {
        const p = els[i]?.parentElement || null;
        if (p) parents.set(p, true);
      }
      parents.forEach((_, parent) => {
        const map = new Map();
        const children = parent.children;
        for (let i = 0; i < children.length; i += 1) {
          map.set(children[i], i);
        }
        parentToIndex.set(parent, map);
      });
    } catch {
      /* ignore */
    }
    return parentToIndex;
  }
}

customElements.define('flip-group', FlipGroup);
// if (!customElements.get('flip-group')) {
// }
