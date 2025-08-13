# @mkja/flip

Core FLIP utilities. ESM-only with types from JSDoc.

## Install

```bash
npm i @mkja/flip
```

## Usage

```js
import { flip } from '@mkja/flip';

const els = document.querySelectorAll('li');
const ctrl = flip(els);
els[0].dataset.flipDuration = '200';
await ctrl.play({ duration: 300 }).finished;
```