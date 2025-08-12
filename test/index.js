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
];

function render_item(item) {
  let item_element = document.createElement('li');
  item_element.textContent = `name: ${item.name}`;

  return item_element;
}

let list_element = document.createElement('ul');
document.body.appendChild(list_element);

let item_elements = items.map(render_item);
list_element.append(...item_elements);

const move_button = document.getElementById('move-last-first');

/**
 * Moves the last <li> to the first position and animates with flip.
 * @returns {Promise<void> | undefined}
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

  return controller.play({ duration: 700, easing: 'cubic-bezier(0.1, 0.2, 0.11, 1)' }).finished;
}

if (move_button instanceof HTMLButtonElement) {
  move_button.addEventListener('click', () => {
    move_button.disabled = true;
    const done = move_last_to_first();
    (done || Promise.resolve()).finally(() => {
      move_button.disabled = false;
    });
  });
}
