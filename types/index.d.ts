export { default } from './flip';
export * from './flip';

declare global {
  namespace JSX {
    interface HTMLAttributes<T> {
      'data-flip-duration'?: number | string;
      'data-flip-duration-offset'?: number | string;
      'data-flip-delay'?: number | string;
    }
  }
}

declare module 'react' {
  interface HTMLAttributes<T> {
    'data-flip-duration'?: number | string;
    'data-flip-duration-offset'?: number | string;
    'data-flip-delay'?: number | string;
  }
}