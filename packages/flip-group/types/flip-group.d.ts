export default FlipGroup;
declare class FlipGroup extends HTMLElement {
    static get observedAttributes(): string[];
    _selector: string;
    _duration: number;
    _easing: string;
    _respectReducedMotion: boolean;
    connectedCallback(): void;
    attributeChangedCallback(name: any, _oldValue: any, newValue: any): void;
    /**
     * Mark element(s) as primary for next run.
     * @param {HTMLElement|HTMLElement[]} el
     */
    markPrimary(el: HTMLElement | HTMLElement[]): void;
}
