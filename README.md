# flip.js monorepo

This repo contains two ESM-only packages:

- `@mkja/flip`: core FLIP utilities (imperative)
- `@mkja/flip-group`: a declarative custom element that uses `@mkja/flip`

Both ship types generated from JSDoc.

## Workspace commands

- Build types: `npm run build`
- Test core: `npm test -w @mkja/flip`
- Publish: `npm publish --access public -w <package>`

## Import

```js
import { flip } from '@mkja/flip';
// or custom element
import '@mkja/flip-group';
```