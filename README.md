# flip-motion

Tiny FLIP animation utility (translate + optional scale) with Promise-based `play` and reduced-motion support.

## Install

Install from npm:

```bash
npm install @mkja/flip-motion
```

## Usage

```js
import flip from '@mkja/flip-motion';

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
- `easing` (default `ease`). Accepts any CSS timing function string supported by WAAPI: `linear`, `ease`, `ease-in`, `ease-out`, `ease-in-out`, `step-start`, `step-end`, `cubic-bezier(...)`, `steps(n[, start|end])`, `linear(...)`.
- `delay` (default 0)
- `stagger` (ms per index, default 0)
- `fill` (default `both`)
- `direction` (default `normal`)
- `composite` (default `add`)
- `shouldScale` (default `true`)
- `respectReducedMotion` (default `true`)
- `transformOrigin` (default `"0 0"`)
- `epsilon` (px threshold to skip, default `0.5`)

### Per-element overrides (data attributes)

- `data-flip-duration`: absolute duration in ms for that element (overrides `options.duration`)
- `data-flip-duration-offset`: value added to `options.duration` for that element (ignored if `data-flip-duration` is present)
- `data-flip-delay`: absolute delay in ms for that element (overrides base `delay` + `stagger`)

Example:

```html
<li data-flip-duration="200"></li>
<li data-flip-duration-offset="50" data-flip-delay="100"></li>
```

Or via JS:

```js
el.dataset.flipDuration = '200';
el.dataset.flipDurationOffset = '50';
el.dataset.flipDelay = '100';
```

## Development

- Dev demo: `npm run dev` (serves `test/index.html` with Vite)
- Tests: `npm test`
- Lint: `npm run lint`
- Format: `npm run format`

## Browser support

Uses WAAPI (`element.animate`). If unavailable, calls are no-ops. Honors `prefers-reduced-motion`.

## License

MIT