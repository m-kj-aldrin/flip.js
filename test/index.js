import flip from '../src/flip.js';

let items = [
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

function render_item(item) {
  let item_element = document.createElement('li');
  item_element.textContent = `name: ${item.name}`;

  return item_element;
}

let list_element = document.createElement('ul');
document.body.appendChild(list_element);

let item_elements = items.map(render_item);

/**
 * @param {HTMLElement} item
 * @param {number} index
 */
function set_item_attributes(item, index) {
  item.setAttribute('data-flip-delay', `${(item_elements.length - 1 - index) * 10}`);
  item.setAttribute('data-flip-duration-offset', `${index * 5}`);
  item.setAttribute('data-index', index.toString());
}

// Demonstrate per-element timing overrides via data attributes
item_elements.forEach((item, index) => {
  set_item_attributes(item, index);
});

list_element.append(...item_elements);

const move_button = document.getElementById('move-last-first');

/**
 * Moves the last <li> to the first position and animates with flip.
 */
function move_last_to_first() {
  /** @type {HTMLElement[]} */
  // Cast to HTMLElement[] for accurate typing in flip()
  const children = /** @type {HTMLElement[]} */ (Array.from(list_element.children));
  if (children.length < 2) return;

  const controller = flip(children);

  const first = children[0];
  const last = children[children.length - 1];
  list_element.insertBefore(last, first);

  return controller.play({
    duration: 300,
    easing: 'cubic-bezier(0.05, -0.25, 0.1, 1.1)',
  });
}

if (move_button instanceof HTMLButtonElement) {
  move_button.addEventListener('click', () => {
    move_last_to_first();
    item_elements.forEach((item) => {
      const index = (Number(item.getAttribute('data-index')) + 1) % item_elements.length;
      set_item_attributes(item, index);
    });
  });
}
