### High-level overview

`<flip-group>` watches a part of the DOM and animates reorders/inserts/removes of its “items” using the Web Animations API (WAAPI). It does this by taking a snapshot of item positions when things are calm, and on changes it computes how items moved and animates them smoothly from “where they were” to “where they are now.”

### Key ideas in plain terms

- **Items**: The elements inside `<flip-group>` that will animate. You choose them with the `selector` attribute (defaults to `li`).
- **Baseline (FIRST)**: A saved snapshot of each item’s position and index when the layout is calm. This is stored in a map and used as the “old positions.”
- **Freeze**: When a change happens, the component sets a flag so it stops refreshing the baseline. That “freezes” the old snapshot while it prepares the animation.
- **Seed transforms**: Before measuring for animation, the component temporarily moves items back to their old positions (using CSS `transform`). This tricks the browser into seeing a motion from old→new rather than a jump.
- **Flush**: The whole “detect change → compute → animate” step.
- **Rebase**: After the animation finishes, it takes a new snapshot of the items’ current positions. That becomes the next baseline for future changes.
- **Primaries**: Elements marked as “especially important” for staggering. You can mark them via `group.markPrimary(el)` or by setting a `data-flip-primary` attribute. Stagger timing can be computed relative to primaries.

### How it works step-by-step

1. Calm state
   - Uses `ResizeObserver` to keep an up-to-date baseline of item positions (FIRST) when nothing is changing.
2. Detect a change
   - `MutationObserver` sees `childList` changes (inserts/removes/reorders).
   - Sets a “freeze” flag so the baseline isn’t updated mid-change.
3. Prepare the run
   - Collects items (using `selector`).
   - Records which are primaries (for staggering).
   - Optionally computes old/new “anchors” for proximity-based staggering.
4. Seed transforms
   - Temporarily applies `transform: translate(...)` so each item appears to be at its old position again.
   - Forces a reflow so those transforms take effect.
5. Build the controller and animate
   - Calls `flip(items)` to compute deltas from the seeded “old” to the real “new.”
   - Clears the temporary transforms so the WAAPI animation handles the visual motion.
   - Starts the animation with options (duration, easing, stagger).
6. Finish and rebase
   - On finish, clears `data-flip-primary` and refreshes the baseline (rebase) so next time it animates from the layout you just ended on.
   - Unfreezes so the baseline can be updated by `ResizeObserver` again.

### Your concrete questions

- Is the `data-flip` attribute used for anything in the children?

  - **No, not by the component.** In the example, `data-flip` is only used by the demo script to easily select items to swap/shuffle. The custom element itself doesn’t look at `data-flip`. It does look at `data-flip-primary` (optional) to mark primaries for staggering.

- What is the `selector` attribute used for?
  - **It defines which descendants are considered “items” to animate.** Default is `li`. The component queries with that selector each run.

```286:289:packages/flip-group/src/flip-group.js
  _items() {
    const selector = this.getAttribute('selector') || 'li';
    return Array.from(this.querySelectorAll(selector)).filter((n) => n instanceof HTMLElement);
  }
```

For primaries:

```136:139:packages/flip-group/src/flip-group.js
    const primaries = items.filter((el) => el.hasAttribute('data-flip-primary'));
```

### A few practical notes

- You can control timing via attributes on `<flip-group>`: `duration`, `easing`, `stagger`, `stagger-step`, `respect-reduced-motion`.
- Stagger can be a number (fixed per-index), `"index"`, or `"proximity"` (computed from distances to primaries old/new).
- The component avoids global state; everything is derived from DOM snapshots and attributes.

- **Answers**:
  - `data-flip` in children: not used by the component; used only in the example code for selection.
  - `selector` attribute: defines which descendants are animated items.
- **Walkthrough**: Explained baseline (FIRST), freeze, seed transforms, flush, and rebase with a step-by-step flow.
