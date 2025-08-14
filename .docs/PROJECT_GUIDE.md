## Project guide (developer + assistant)

### What this project is
- **Two independent libraries** under a single workspace monorepo:
  - **`@mkja/flip`**: Core FLIP animation utilities (ESM-only, plain JavaScript). WAAPI-based.
  - **`@mkja/flip-group`**: Custom Element `<flip-group>` that uses the core library internally.
- **No shared global state** between packages. The custom element consumes the core via its public API only.

### Package boundaries and roles
- **`@mkja/flip` (core)**
  - Public surface: `flip(elements)` controller with `play/update/measure/cancel/markPrimary/disconnect`.
  - ESM-only, tree-shakeable (`sideEffects: false`).
  - Source in `packages/flip/src/`. Types generated to `packages/flip/types/`.
- **`@mkja/flip-group` (custom element)**
  - Defines and registers `customElements.define('flip-group', FlipGroup)`.
  - Public surface: `flip(mutator)` and `markPrimary(el)` methods; listens for `flip:request` event; configures via attributes (`selector`, `stagger`, etc.).
  - Depends on `@mkja/flip` and uses it internally; no bundling of the core.
  - Source in `packages/flip-group/src/`. Types generated to `packages/flip-group/types/`.

### Runtime assumptions
- **WAAPI-based** animations (Web Animations API).
- Modern, evergreen browsers environment. No Node runtime API reliance for the libraries themselves.

### Types strategy
- **Generated types** from JSDoc via `tsc` into each package’s `types/` directory.
- **Handcrafted augmentations** live alongside generated files (e.g., DOM/custom element augmentations).
- **Consumer entry is curated** via `types/entry.d.ts`, which re-exports public API and references augmentations.
- Do not edit generated declarations. Edit source JSDoc or handcrafted augmentation files instead.

Key files:
- Core: `packages/flip/types/entry.d.ts`, `packages/flip/types/flip.d.ts`, `packages/flip/types/dom-augmentations.d.ts`
- Custom element: `packages/flip-group/types/entry.d.ts`, `packages/flip-group/types/flip-group.d.ts`, `packages/flip-group/types/custom-elements.d.ts`

### Versioning and dependency policy
- **Independent versions** for each package; no enforced lockstep.
- **Custom element depends on core** via `dependencies` (not peerDependencies) to ensure automatic install.
- **Version range**: keep ranges compatible (e.g., `0.x`) to maximize deduping when both are installed.

### Build, tooling, and publishing
- **No bundlers for packaging**. Publish plain ESM JavaScript from `src/`.
- **Type build only**: `tsc -p tsconfig.types.json` emits declarations to `types/`.
- **Vite is kept for development/examples** and may be used later if a real need for bundling appears. It is not required for publishing.
- **Prepack** runs `build` (i.e., types generation) before publish.
- **NPM scope**: packages publish under `@mkja` with public access.

Root layout and scripts:
- Monorepo workspaces in root `package.json` (`workspaces: ["packages/*"]`).
- Build both: `npm run build` (calls per-package types build).
- Publish per package: `npm publish -w @mkja/flip`, `npm publish -w @mkja/flip-group`.

### Repository conventions
- ESM modules (`"type": "module"`).
- Explicit `exports` in each `package.json` mapping `".": "./src/index.js"`.
- `types` field points to curated `./types/entry.d.ts`.
- Published files kept tight via `files`: `src`, `types`, `README.md`, `LICENSE`.
- Minimum Node engine: `>=18`.

### Development workflow
- Work on source in `src/`. Keep modules small and composable; avoid global state.
- Run local examples under each package’s `examples/` directory (Vite is available for convenience).
- Generate types with `npm run build -w <pkg>` when needed or before publish.
- Currently **no test suite**. Add tests later when stability needs increase.

### Coding guidelines
- Prefer small, readable functions and clear naming.
- Keep the public API minimal and stable; favor additive changes.
- Avoid deep nesting and avoid catching errors without meaningful handling.
- **Do not manually edit generated declarations** under `types/`.

### Release process
- Bump versions per package as needed (no changesets; keep it lean).
- Ensure type generation is green: `npm run build`.
- Publish each package independently with npm workspace flags.

### Assistant guidance (for future automation)
- Default to minimal tooling; avoid adding dependencies unless there is a concrete need.
- Respect package boundaries and dependency policy (custom element depends on core; independent versions).
- When editing code:
  - Keep source in `src/`, update JSDoc for types, and regenerate with `tsc`.
  - Do not edit generated `types/*.d.ts` except handcrafted augmentation files.
  - Preserve existing indentation and formatting conventions.
- When in doubt, prefer explicit, simple solutions over complex build steps.


