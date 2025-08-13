import flip from '@mkja/flip';

class FlipGroup extends HTMLElement {
  static get observedAttributes() {
    return ['selector', 'duration', 'easing', 'respect-reduced-motion'];
  }

  constructor() {
    super();
    this._selector = 'li';
    this._duration = 300;
    this._easing = 'ease';
    this._respectReducedMotion = true;
  }

  connectedCallback() {
    // Placeholder: no-op; left for future implementation
  }

  attributeChangedCallback(name, _oldValue, newValue) {
    switch (name) {
      case 'selector':
        this._selector = String(newValue || 'li');
        break;
      case 'duration':
        this._duration = Number(newValue) || 300;
        break;
      case 'easing':
        this._easing = String(newValue || 'ease');
        break;
      case 'respect-reduced-motion':
        this._respectReducedMotion = newValue !== 'false';
        break;
    }
  }

  /**
   * Mark element(s) as primary for next run.
   * @param {HTMLElement|HTMLElement[]} el
   */
  markPrimary(el) {
    // Future implementation can forward to internal flip controller
    void el;
  }
}

if (!customElements.get('flip-group')) {
  customElements.define('flip-group', FlipGroup);
}

export default FlipGroup;