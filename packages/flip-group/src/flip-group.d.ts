export class FlipGroup extends HTMLElement {
  stagger: ((ctx: { element: HTMLElement; from: any; to: any; isPrimary: boolean }) => number) | null;
  markPrimary(elOrEls: HTMLElement | HTMLElement[]): void;
}

declare global {
  interface HTMLElementTagNameMap {
    'flip-group': FlipGroup;
  }
}