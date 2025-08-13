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
export default function flip<T extends HTMLElement[] | NodeListOf<HTMLElement> | HTMLCollectionOf<HTMLElement>>(elements: T): {
    play: (options?: {
        duration?: number;
        easing?: EasingFunctions;
        delay?: number;
        stagger?: number | ((index: number, count: number, element: HTMLElement) => number) | ((ctx: {
            element: HTMLElement;
            from: {
                parent: HTMLElement | null;
                index: number;
                rect: DOMRectReadOnly;
            };
            to: {
                parent: HTMLElement | null;
                index: number;
                rect: DOMRectReadOnly;
            };
        }) => number);
        fill?: FillMode;
        direction?: PlaybackDirection;
        composite?: CompositeOperation;
        shouldScale?: boolean;
        respectReducedMotion?: boolean;
        transformOrigin?: string;
        epsilon?: number;
        interrupt?: "cancel" | "ignore" | "queue";
        recalculateIndices?: boolean;
        onStart?: (ctx: {
            options: /*elided*/ any;
            count: number;
            animations: Animation[];
        }) => void;
        onEachStart?: (entry: {
            element: HTMLElement;
            index: number;
            prevBox: DOMRectReadOnly;
            nowBox: DOMRectReadOnly;
            delta: {
                dx: number;
                dy: number;
                scaleX: number;
                scaleY: number;
            };
        }, ctx: {
            options: /*elided*/ any;
            count: number;
            animations: Animation[];
        }) => void;
        onEachFinish?: (entry: {
            element: HTMLElement;
            index: number;
            prevBox: DOMRectReadOnly;
            nowBox: DOMRectReadOnly;
            delta: {
                dx: number;
                dy: number;
                scaleX: number;
                scaleY: number;
            };
        }, ctx: {
            options: /*elided*/ any;
            count: number;
            animations: Animation[];
        }) => void;
        onFinish?: (ctx: {
            options: /*elided*/ any;
            count: number;
            animations: Animation[];
        }) => void;
    }) => {
        animations: Animation[];
        finished: Promise<void>;
        cancel: () => void;
    };
    measure: () => DOMRect[];
    update: <U extends HTMLElement[] | NodeListOf<HTMLElement> | HTMLCollectionOf<HTMLElement>>(newElements?: U) => void;
    cancel: () => void;
    disconnect: () => void;
};
/**
 * Easing values accepted by the Web Animations API's `easing` option.
 * Matches the CSS `animation-timing-function` and `transition-timing-function` syntax.
 */
export type EasingFunctions = ("linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out" | "step-start" | "step-end" | `cubic-bezier(${string})` | `steps(${number})` | `steps(${number},start)` | `steps(${number}, end)` | `linear(${string})`);
