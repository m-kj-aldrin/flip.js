/**
 * @template {HTMLElement[] | Element[] | NodeListOf<HTMLElement> | HTMLCollection} T
 * @param {T} elements
 */
export default function (elements) {
  const elementBoxes = Array.from(elements).map((element) => {
    return {
      element,
      box: element.getBoundingClientRect(),
    };
  });

  function play({ duration } = { duration: 100 }) {
    elementBoxes.forEach((o) => {
      const box = o.element.getBoundingClientRect();

      const posDifference = {
        x: o.box.left - box.left,
        y: o.box.top - box.top,
      };

      if (!posDifference.x && !posDifference.y) return;

      /**@type {Keyframe[]} */
      const keyFrames = [
        {
          transform: `translate(${posDifference.x}px,${posDifference.y}px)`,
        },
        {},
      ];

      o.element.animate(keyFrames, {
        duration,
        composite: "add",
        easing: "ease",
      });
    });
  }

  return {
    play,
  };
}
