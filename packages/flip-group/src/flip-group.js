import { flip } from '@mkja/flip';

export class FlipGroup extends HTMLElement {
  connectedCallback() {
    this.addEventListener('flip:request', this.#onFlipRequest);
  }

  disconnectedCallback() {
    this.removeEventListener('flip:request', this.#onFlipRequest);
  }

  /**
   * @param {CustomEvent<{ mutator: () => void }>} event
   */
  #onFlipRequest = (event) => {
    event.stopPropagation();
    const { mutator } = event.detail;
    if (typeof mutator === 'function') {
      this.#runFlip(mutator);
    }
  };

  /**
   * @param {Element | Element[]} elOrEls
   */
  markPrimary(elOrEls) {
    const arr = Array.isArray(elOrEls) ? elOrEls : [elOrEls];
    arr.forEach((el) => {
      if (el && el.nodeType === 1) {
        try {
          el.setAttribute('data-flip-primary', '');
        } catch {
          // ignore
        }
      }
    });
  }

  /**
   * @param {() => void} mutator
   * @returns {Promise<void>}
   */
  async flip(mutator) {
    return this.#runFlip(mutator);
  }

  /**
   * @returns {HTMLElement[]}
   */
  #getItems() {
    const selector = this.getAttribute('selector');
    if (selector) {
      return Array.from(this.querySelectorAll(selector));
    }
    return Array.from(this.children);
  }

  /**
   * @param {() => void} mutator
   * @returns {Promise<void>}
   */
  #runFlip(mutator) {
    const items = this.#getItems();
    const primaries = items.filter((el) =>
      el.hasAttribute('data-flip-primary'),
    );

    const primaryOldAnchors = primaries.map((el) => {
      const p = el.parentElement;
      const idx = p ? Array.prototype.indexOf.call(p.children, el) : -1;
      return { parent: p, index: idx };
    });

    const controller = flip(items);

    if (primaries.length) {
      controller.markPrimary(primaries);
    }

    mutator();

    const primaryNewAnchors = primaries.map((el) => {
      const p = el.parentElement;
      const idx = p ? Array.prototype.indexOf.call(p.children, el) : -1;
      return { parent: p, index: idx };
    });

    const options = this.#getFlipOptions({
      primaryOldAnchors,
      primaryNewAnchors,
    });

    // Add the cleanup callback to the options passed to play()
    options.onFinish = () => {
      primaries.forEach((el) => {
        try {
          el.removeAttribute('data-flip-primary');
        } catch {
          // ignore
        }
      });
    };

    return controller.play(options);
  }

  #getFlipOptions({ primaryOldAnchors, primaryNewAnchors }) {
    const duration = this.#readNumberAttr('duration', null);
    const easing = this.getAttribute('easing') || null;
    const respectReducedMotionAttr = this.getAttribute('respect-reduced-motion');
    const respectReducedMotion =
      respectReducedMotionAttr == null
        ? null
        : respectReducedMotionAttr !== 'false';

    const staggerAttr = this.getAttribute('stagger');
    let stagger = null;
    if (staggerAttr) {
      const asNum = Number(staggerAttr);
      stagger = Number.isFinite(asNum) ? asNum : staggerAttr;
    }

    if (stagger === 'proximity') {
      const step = this.#readNumberAttr('stagger-step', 60);
      stagger = (ctx) => {
        if (ctx.isPrimary) return 0;
        const distances = [];

        const oldIndex = ctx.from.index;
        const oldParent = ctx.from.parent;
        primaryOldAnchors.forEach((a) => {
          if (a.parent === oldParent)
            distances.push(Math.abs(oldIndex - a.index));
        });

        const newIndex = ctx.to.index;
        const newParent = ctx.to.parent;
        primaryNewAnchors.forEach((a) => {
          if (a.parent === newParent)
            distances.push(Math.abs(newIndex - a.index));
        });
        const dist = distances.length ? Math.min(...distances) : 0;
        return dist * step;
      };
    }

    return { duration, easing, respectReducedMotion, stagger };
  }

  #readNumberAttr(name, fallback) {
    const v = this.getAttribute(name);
    if (v == null) return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
}

if (!customElements.get('flip-group')) {
  customElements.define('flip-group', FlipGroup);
}