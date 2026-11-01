# Independent validation loop

The browser's current robot-rule checks are useful implementation guards, but
they are not independent: the rules live beside the motions they check. This
validation lane adds an external reference and an external pose metric.

## Plan and evidence gates

1. **Calibrate the toolchain — implemented.** Generate a German-to-DSGS
   holistic pose from the pinned ZurichNLP pipeline. Confirm that the pinned
   pose metric returns zero for the unchanged reference and materially larger
   distances for a collapsed dominant hand, reversed motion, and frozen support
   hand.
2. **Export ORCA landmarks — implemented.** `HandModel.tsx` reads the actual
   URDF wrist, finger-chain, and fingertip world transforms into a 21-point
   trace for each rendered hand. Missing body and face points remain
   unsupported; they are not fabricated.
3. **Compare robot to reference — implemented, unbenchmarked.**
   `landmarkValidation.ts` compares rotation-invariant joint articulation and
   direction-invariant wrist dynamics against compact traces exported from the
   pinned DSGS `.pose` files. Hand use is scored separately. The browser does
   not invent a pass threshold.
4. **Expose the evidence — implemented.** The DSGS word card shows both raw
   lower-is-closer distances, hand-use match, trace sample counts, pinned source,
   and unsupported dimensions.
5. **Human review — still required.** A fluent Deaf DSGS/ASL signer reviews comprehensibility,
   grammar, timing, signing space, facial expression, and body movement.

## Run the implemented calibration

The upstream binary pose reader failed under Python 3.14 during the integration
spike and passed under Python 3.12. Use the known-working interpreter:

```bash
python3.12 -m venv .validation-venv
.validation-venv/bin/pip install -r validation/requirements.txt
.validation-venv/bin/pip install --no-deps \
  "pose-evaluation @ git+https://github.com/sign-language-processing/pose-evaluation.git@2769b6f49693dd83e2ee81c09355d787afe775c6"
.validation-venv/bin/python validation/run_toolchain_spike.py
.validation-venv/bin/python validation/export_browser_references.py
```

The runner downloads only five files from a pinned MIT-licensed upstream
revision, verifies their SHA-256 hashes, generates the reference locally, and
writes disposable evidence to `.validation-cache/toolchain-result.json`.

## What the calibration proves

- The reference generator is executable on the documented environment.
- Its output contains body, face, left-hand, and right-hand landmarks.
- The metric can distinguish an exact match from three controlled failures.

The browser now measures the actual ORCA kinematics against those references.
That still does **not** prove a sign is correct. The result has no calibrated
pass/fail threshold, ignores directional orientation and absolute location, and
cannot observe body, face, grammar, or comprehension. Those claims remain
blocked on labelled examples and fluent Deaf signer review.
