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
    /** @type {Map<Element, { rect: DOMRectReadOnly; parent: Element | null; index: number }>} */
    _first: Map<Element, {
        rect: DOMRectReadOnly;
        parent: Element | null;
        index: number;
    }>;
    /** @type {boolean} */
    _pending: boolean;
    /** @type {ResizeObserver | null} */
    _ro: ResizeObserver | null;
    /** @type {MutationObserver | null} */
    _mo: MutationObserver | null;
    /** @type {Animation[] | null} */
    _activeAnimations: Animation[] | null;
    /** @type {{ cancel: () => void } | null} */
    _lastController: {
        cancel: () => void;
    } | null;
    /** @type {(ctx: { element: HTMLElement; from: any; to: any; isPrimary: boolean }) => number | null} */
    stagger: (ctx: {
        element: HTMLElement;
        from: any;
        to: any;
        isPrimary: boolean;
    }) => number | null;
    connectedCallback(): void;
    disconnectedCallback(): void;
    /** Public API for imperative marking from userland JS */
    markPrimary(elOrEls: any): void;
    /** Refresh FIRST = current local rects and indices when calm */
    _refreshFirst(): void;
    /** Perform a FLIP run for the current mutation batch */
    _flush(): void;
    _items(): HTMLElement[];
    _readOptions(): {
        duration: any;
        easing: string;
        respectReducedMotion: boolean;
        stagger: string | number;
    };
    _log(...args: any[]): void;
    _readNumberAttr(name: any, fallback: any): any;
    /** Build maps of DOM indices per parent for provided elements. */
    _buildDomIndexMap(els: any): Map<HTMLElement, Map<Element, number>>;
}
