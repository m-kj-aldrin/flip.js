# flip-motion

Tiny FLIP animation utility (translate + optional scale) with Promise-based `play` and reduced-motion support.

## Install

This repo is a simple project; you can import directly from `src/flip.js`.

## Usage

```js
import flip from './src/flip.js';

const elements = document.querySelectorAll('li');
const ctrl = flip(elements);

// Mutate DOM (reorder/insert/remove)
// ...

await ctrl.play({ duration: 300, easing: 'ease' }).finished;
```

## API

- `flip(elements)` → controller with:
  - `play(options)` → `{ animations: Animation[], finished: Promise<void>, cancel() }`
  - `measure()` → refresh internal measurements
  - `update([elements])` → rebind or just refresh measurements
  - `cancel()` → cancel in-flight animations
  - `disconnect()` → release references

### Options

- `duration` (ms, default 100)
- `easing` (default `ease`)
- `delay` (default 0)
- `stagger` (ms per index, default 0)
- `fill` (default `auto`)
- `direction` (default `normal`)
- `composite` (default `add`)
- `shouldScale` (default `true`)
- `respectReducedMotion` (default `true`)
- `transformOrigin` (default `"0 0"`)
- `epsilon` (px threshold to skip, default `0.5`)

## Development

- Dev demo: `npm run dev` (serves `test/index.html` with Vite)
- Tests: `npm test`
- Lint: `npm run lint`
- Format: `npm run format`

## Browser support

Uses WAAPI (`element.animate`). If unavailable, calls are no-ops. Honors `prefers-reduced-motion`.

## License

MIT