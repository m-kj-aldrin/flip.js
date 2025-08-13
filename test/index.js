import flip from '../src/flip.js';

let itemsA = [
  {
    name: 'Cat Math',
  },
  {
    name: 'Dog Bog',
  },
  {
    name: 'Bird Nerd',
  },
  {
    name: 'Fish Dish',
  },
  {
    name: 'Rat Chat',
  },
  {
    name: 'Pig Jig',
  },
  {
    name: 'Fox Box',
  },
  {
    name: 'Bear Lair',
  },
  {
    name: 'Goat Note',
  },
  {
    name: 'Duck Luck',
  },
  {
    name: 'Sheep Sleep',
  },
  {
    name: 'Cow Pow',
  },
  {
    name: 'Mouse House',
  },
];

let itemsB = [
  { name: 'Alpha' },
  { name: 'Beta' },
  { name: 'Gamma' },
  { name: 'Delta' },
  { name: 'Epsilon' },
];

function render_item(item) {
  let item_element = document.createElement('li');
  item_element.textContent = `name: ${item.name}`;

  return item_element;
}

const list_a = document.getElementById('list-a');
const list_b = document.getElementById('list-b');

if (!(list_a instanceof HTMLUListElement) || !(list_b instanceof HTMLUListElement)) {
  throw new Error('expected #list-a and #list-b');
}

let item_elements_a = itemsA.map(render_item);
let item_elements_b = itemsB.map(render_item);

/**
 * @param {HTMLElement} item
 * @param {number} index
 */
function set_item_attributes(item, index) {
  // item.setAttribute('data-flip-delay', `${(item_elements.length - 1 - index) * 10}`);
  // item.setAttribute('data-flip-duration-offset', `${index * 5}`);
  // item.setAttribute('data-index', index.toString());
}

// Demonstrate per-element timing overrides via data attributes
item_elements_a.forEach((item, index) => set_item_attributes(item, index));
item_elements_b.forEach((item, index) => set_item_attributes(item, index));

list_a.append(...item_elements_a);
list_b.append(...item_elements_b);

const move_button = document.getElementById('swap-between');

function pickRandomChild(parent) {
  const children = parent.children;
  if (children.length === 0) return null;
  const idx = Math.floor(Math.random() * children.length);
  return /** @type {HTMLElement} */ (children[idx]);
}

function swap_between_lists() {
  /** @type {HTMLElement[]} */
  const allChildren = /** @type {HTMLElement[]} */ ([
    ...Array.from(list_a.children),
    ...Array.from(list_b.children),
  ]);
  if (allChildren.length === 0) return;

  const controller = flip(allChildren);

  const fromA = pickRandomChild(list_a);
  const fromB = pickRandomChild(list_b);
  if (!fromA && !fromB) return;

  if (fromA) controller.markPrimary(fromA);
  if (fromB) controller.markPrimary(fromB);

  // Capture source indices before DOM changes
  const fromIdxA = fromA ? Array.from(list_a.children).indexOf(fromA) : null;
  const fromIdxB = fromB ? Array.from(list_b.children).indexOf(fromB) : null;

  // Compute random insert positions ahead of time
  const insertIdxB = fromA ? Math.floor(Math.random() * (list_b.children.length + 1)) : null;
  const insertIdxA = fromB ? Math.floor(Math.random() * (list_a.children.length + 1)) : null;

  // Perform DOM moves using the chosen positions
  if (fromA && insertIdxB != null) {
    const refB = list_b.children[insertIdxB] || null;
    list_b.insertBefore(fromA, refB);
  }
  if (fromB && insertIdxA != null) {
    const refA = list_a.children[insertIdxA] || null;
    list_a.insertBefore(fromB, refA);
  }

  return controller.play({
    duration: 1000,
    respectReducedMotion: false,
    easing: 'cubic-bezier(0.05, -0.25, 0.1, 1.1)',
    stagger: (ctx) => {
      if (ctx.isPrimary) return 0;
      /** @type {number[]} */
      const distances = [];
      // Distance from the removal point in list A/B
      if (fromIdxA != null && ctx.from.parent === list_a) {
        distances.push(Math.abs(ctx.from.index - fromIdxA));
      }
      if (fromIdxB != null && ctx.from.parent === list_b) {
        distances.push(Math.abs(ctx.from.index - fromIdxB));
      }
      // Distance from the insertion point in list A/B
      if (insertIdxA != null && ctx.to.parent === list_a) {
        distances.push(Math.abs(ctx.to.index - insertIdxA));
      }
      if (insertIdxB != null && ctx.to.parent === list_b) {
        distances.push(Math.abs(ctx.to.index - insertIdxB));
      }
      const step = 60;
      const dist = distances.length ? Math.min(...distances) : 0;
      return dist * step;
    },
    onStart: ({ animations }) => {
      // no-op; keep to show hooks available
    },
  });
}

if (move_button instanceof HTMLButtonElement) {
  move_button.addEventListener('click', () => {
    swap_between_lists();
  });
}
