import flip from "../src/flip.js";

let items = [
  {
    name: "Cat Math",
  },
  {
    name: "Dog Bog",
  },
  {
    name: "Bird Nerd",
  },
];

function render_item(item) {
  let item_element = document.createElement("li");
  item_element.textContent = `name: ${item.name}`;

  return item_element;
}

let list_element = document.createElement("ul");
document.body.appendChild(list_element);

let item_elements = items.map(render_item);

list_element.append(...item_elements);

let flip_elements = flip(item_elements);

list_element.insertBefore(item_elements[2], item_elements[0]);

flip_elements.play({ duration: 500, easing: 'ease' });
