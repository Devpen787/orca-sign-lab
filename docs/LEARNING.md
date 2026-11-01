# Learning through an open robotic hand

This project explores a question: how far can an inspectable hand model help us
understand a motion cue, and where does that representation stop being enough?

## Follow the code

1. Start with the source text and motion planner in `src/demo/domain/`.
2. Trace how a cue becomes joint targets and timed movement.
3. Compare the two hand instances from the recipient and side views.
4. Read the validation model before interpreting a successful mechanical check.
5. Build a local Sign Pack in the Contributor Studio and export it.

## What I learned

- A plausible animation is not evidence of language comprehension. Facial
  grammar, body position, signing space, and fluent signer review matter.
- One and two hand cues need different representations; forcing everything onto
  one hand removes information rather than simplifying the problem.
- Explicit fingerspelling fallback is more inspectable than inventing a sign for
  a word that has no supported motion cue.
- Source presence, mechanical checks, and signer verification answer different
  questions. The interface should tell the reader which one has actually happened.
- A shared schema makes browser drafts and command-line validation easier to
  compare. Local storage is a deliberate user action rather than an automatic upload.

## Try changing one thing

Add a source-backed cue, add its test, and inspect it from multiple angles.
Explain what your test establishes and what still needs a qualified signer.
Do not relabel an animation as validated translation or physical hand execution.

See `ARCHITECTURE.md`, `docs/VALIDATION.md`, and `THIRD_PARTY_NOTICES.md` for
implementation detail and upstream attribution. Browser tests and unit tests
support software behavior; they do not validate signing or robot performance.
