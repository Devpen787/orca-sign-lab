# Architecture decisions

## ADR-001: Static and local-first

The lab remains a static React application. Source text stays in memory and
private Sign Pack drafts use IndexedDB only after an explicit save action. No
account, backend, analytics service, or runtime AI API is required.

## ADR-002: Feature slices over a framework-shaped tree

`demo`, `signpacks`, and `about` are product features. Each feature may contain
components, hooks, domain logic, data, and storage. Truly reusable primitives
stay under `src/components` and `src/styles`. This keeps changes local without a
large cosmetic directory migration.

## ADR-003: JSON Schema is the Sign Pack contract

`schemas/signpack.v1.schema.json` is the portable interchange authority. The
browser, CLI, fixtures, and CI must validate against it. Additional semantic
checks may strengthen the schema but may not silently weaken it.

## ADR-004: Two separate proof lanes

Robot-rule and landmark comparisons are implementation evidence. Sign-language
correctness requires qualified human review. The UI and documentation preserve
that distinction even when a mechanical score is high.

## ADR-005: Optional evidence is loaded on demand

Large reference traces and contributor tooling must not delay the first useful
motion-lab screen. Route chunks and language-specific evidence are loaded only
when used.

## ADR-006: Track the upstream Three.js clock warning

Three.js r185 deprecates `Clock`, while `@react-three/fiber` 9.7.0 still creates
one inside its root store. The lab does not instantiate `Clock`. Browser tests
continue to fail on page errors and known application warnings remain visible;
this upstream warning will be removed when the renderer migrates to
`THREE.Timer`. We do not patch or globally silence dependency output.

## ADR-007: Reproducible patched build tooling

Vite 8.1.6 and Vitest 4.1.12 are pinned and reused through npm overrides.
These patched versions resolve the build/test advisories found in the earlier
lockfile. Explicitly reusing them also avoids an npm peer-resolution cycle that
crashes Arborist with `edgesOut` while choosing optional development-tool peers.
The committed lockfile is the reproducible dependency graph; use `npm ci`.

## ADR-008: Contribution preparation stays local

Copy Contribution JSON writes to the clipboard only after its explicit button
click. It does not open an older repository or imply that a public destination
exists. Read `CONTRIBUTING.md` and select a destination before submitting a pack.
