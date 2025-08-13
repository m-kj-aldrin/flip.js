import '../src/flip-group.js';

/** @type {import('../src/flip-group.js').FlipGroup} */
const group = /** @type {any} */ (document.getElementById('group'));
/** @type {HTMLUListElement} */
const listA = /** @type {any} */ (document.getElementById('a'));
/** @type {HTMLUListElement} */
const listB = /** @type {any} */ (document.getElementById('b'));
/** @type {HTMLButtonElement} */
const btnSwap = /** @type {any} */ (document.getElementById('swap'));
/** @type {HTMLButtonElement} */
const btnShuffle = /** @type {any} */ (document.getElementById('shuffle'));
/** @type {HTMLSelectElement} */
const selectStagger = /** @type {any} */ (document.getElementById('stg'));

// Enable debug logs by default for troubleshooting
try {
  group?.setAttribute('debug', '');
  console.log('[declarative-demo] boot, debug enabled');
} catch {
  /* ignore */
}

function randChild(parent) {
  const c = parent.querySelectorAll('[data-flip]');
  if (c.length === 0) return null;
  return c[Math.floor(Math.random() * c.length)];
}

btnSwap?.addEventListener('click', () => {
  const a = randChild(listA);
  const b = randChild(listB);
  if (!a && !b) return;
  if (a) {
    group.markPrimary(a);
    const idx = Math.floor(Math.random() * (listB.children.length + 1));
    const ref = listB.children[idx] || null;
    listB.insertBefore(a, ref);
  }
  if (b) {
    group.markPrimary(b);
    const idx = Math.floor(Math.random() * (listA.children.length + 1));
    const ref = listA.children[idx] || null;
    listA.insertBefore(b, ref);
  }
});

btnShuffle?.addEventListener('click', () => {
  const items = Array.from(listA.querySelectorAll('[data-flip]'));
  if (items.length < 2) return;
  // simple Fisher-Yates
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    if (i !== j) listA.insertBefore(items[i], items[j]);
  }
});

selectStagger?.addEventListener('change', () => {
  const v = selectStagger.value;
  group.setAttribute('stagger', v);
});


