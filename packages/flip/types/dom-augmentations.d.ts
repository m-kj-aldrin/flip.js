interface Window {
  matchMedia(query: string): MediaQueryList;
}

interface MediaQueryList {
  matches: boolean;
  addEventListener: (type: 'change', listener: (ev: any) => void) => void;
  removeEventListener: (type: 'change', listener: (ev: any) => void) => void;
}