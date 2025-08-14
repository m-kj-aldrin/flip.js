# @mkja/flip-group

Declarative FLIP custom element built on `@mkja/flip`.

A custom element that animates reorders/adds/removes of descendant items using the FLIP technique, without imperative orchestration.

## Install

```bash
npm i @mkja/flip-group @mkja/flip
```

## Quick start

```html
<flip-group selector="li" stagger="proximity" stagger-step="60" duration="500" respect-reduced-motion="false">
  <ul>
    <li data-flip>Item A</li>
    <li data-flip>Item B</li>
  </ul>
</flip-group>
<script type="module">
  import '@mkja/flip-group';
  const group = document.querySelector('flip-group');
  const list = group.querySelector('ul');
  // Mark and move an item
  const li = list.querySelector('[data-flip]');
  group.markPrimary(li);
  list.appendChild(li);
  // Mutations to the list trigger FLIP animations automatically
</script>
```

## Purpose
- Provide a declarative surface for FLIP: measure first (FIRST), mutate, measure last (LAST), invert, play.
- Keep FIRST correct across natural layout changes without animating layout-only shifts.

## Main components
- **FIRST cache**: Baseline per item (container‑local rect, parent, index). Updated when calm.
- **Observers**:
  - MutationObserver (childList, subtree): detects structural changes and triggers a run.
  - ResizeObserver: refreshes FIRST only when there’s no pending run.
- **Scheduler**: On mutation, freezes FIRST, coalesces work to the next rAF.
- **Run engine (flush)**:
  - Gathers current items via `selector`.
  - Collects primaries (via `data-flip-primary` or `markPrimary()`).
  - Computes old/new anchors for primaries (indices/parents) for proximity staggering.
  - Seeds transforms to warp items back to FIRST, forces reflow.
  - Creates a `flip()` controller, clears seeds, marks primaries, resolves `stagger`, plays.
  - Rebases FIRST to LAST and unfreezes.

## Flow
1. Connect → build FIRST from current items.
2. Calm (no mutations) → RO keeps FIRST in sync; no animations.
3. Mutation tick → freeze FIRST; schedule flush on rAF.
4. Flush → seed transforms → `flip(items)` → play → rebase FIRST.

## API surface
- **Attributes** (on `\<flip-group>`):
  - `selector` (default `li`): which descendants to animate.
  - `stagger`: `index` | `proximity` | number (ms per step).
  - `stagger-step`: step (ms) for `index`/`proximity` presets.
  - `duration`: animation duration (ms).
  - `easing`: Web Animations timing value.
  - `respect-reduced-motion`: `true|false` (default true).
  - `debug`: when present, logs internals.
- **JS hooks**:
  - `group.markPrimary(elOrEls)`: mark element(s) as programmatically moved before your DOM changes.
  - `group.stagger = (ctx) => number`: optional property to override preset/number. `ctx` includes `{ element, from, to, isPrimary }`.

## Stagger strategies
- **index**: delay by original index (`isPrimary` gets 0).
- **proximity**: delay by min distance to primary old/new anchors (neighbors move first).
- **custom**: function receives full context.

## Practical notes
- Coordinates are container‑local (stable across scroll/ancestor transforms). For cross‑container moves, anchors use parent+index on both sides.
- Only structural mutations trigger runs; pure layout shifts are ignored (FIRST is refreshed by RO when calm).
- In‑flight policy: cancels previous run before starting a new one.
- Respect OS reduced motion by default; override via `respect-reduced-motion="false"` if desired.
- Enable `debug` to see lifecycle logs: RO refresh, MO detection, flush start/end, primaries, options, stagger, play.

## Basic usage

```js
import '@mkja/flip-group';
```

```html
<flip-group selector="li" stagger="proximity" duration="300"></flip-group>
```