# Code standards

The repository optimizes for reviewability, evidence, and safe extension rather
than cleverness.

## Boundaries

- UI components render state and dispatch user intent.
- Hooks own browser lifecycles and stateful orchestration.
- Domain modules remain deterministic and browser-independent where possible.
- Storage modules are the only code that accesses IndexedDB.
- Generated reference data stays separate from authored domain logic.
- Mechanical validation must never be labelled linguistic validation.

## React

- Keep transient animation values in refs rather than React state.
- Derive display state during render instead of synchronizing it with effects.
- Keep effects focused on one external lifecycle and give them complete
  dependency lists.
- Lazy-load route-only tooling and large optional reference data.
- Split a component when it owns multiple independent lifecycles or cannot be
  reviewed comfortably as one unit. Line count is a warning, not a target.

## Testing

- Unit tests cover deterministic planning, schemas, and comparison algorithms.
- Browser tests cover user journeys, responsive behavior, accessibility, and
  the presence of meaningful 3D output.
- CI geometry assertions protect panel placement across platforms. Locally
  reviewed screenshots protect platform-specific layout and control placement.
- No visual assertion proves linguistic correctness.
- Every bug fix starts with a reproducible observation and ends with a durable
  check when practical.

## Evidence language

Use these labels consistently:

- **source-backed**: a lexical or motion source is linked and pinned.
- **mechanically checked**: encoded or rendered geometry passed a stated check.
- **signer verified**: a qualified Deaf signer reviewed the stated scope.
- **unsupported**: the model or evidence cannot measure the dimension.

Passing builds and geometry checks are never evidence of comprehension,
grammar, facial expression, or community acceptance.

## Required local gate

```bash
npm ci
npm run verify
npm run test:e2e
```

Use Node 22 as declared in `.node-version` and `package.json`.
