# Validation model

The project has two deliberately separate evidence lanes.

## Software and mechanical evidence

- JSON Schema plus semantic checks validate the Sign Pack interchange format.
- Unit tests cover planning, fallback, interpolation, timing, and comparison
  algorithms.
- Playwright covers the actual controls, local draft lifecycle, responsive
  layout, and serious/critical accessibility findings.
- Cross-platform CI checks panel geometry and control visibility; locally
  reviewed screenshots add platform-specific visual regression coverage.
- Neither geometry nor screenshot comparisons prove sign-language correctness.
- Robot checks compare encoded hand count, pose sequences, paths, and source
  presence.
- The DSGS lane compares rendered URDF landmarks with pinned reference poses and
  reports raw, unbenchmarked distances.

## Linguistic evidence

No automated score in this repository proves comprehension, grammar,
nonmanuals, signing-space correctness, regional acceptability, or fluency.
Those require documented review by a Deaf signer fluent in the target language.
Until that occurs, the interface must say **source-backed**, **mechanically
checked**, or **unsupported**—never linguistically verified.

The pinned-data generation and metric calibration procedure is documented in
[`validation/README.md`](../validation/README.md).
