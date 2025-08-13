export {};

declare global {
  interface DOMStringMap {
    /** Maps to data-flip-duration */
    flipDuration?: number;
    /** Maps to data-flip-duration-offset */
    flipDurationOffset?: number;
    /** Maps to data-flip-delay */
    flipDelay?: number;
  }
}