# Fingerspelling reference data

The reference panel uses the ASL (`ase`) and Swiss German Sign Language / DSGS
(`sgg`) fingerspelling pose files shipped with
[`sign-language-processing/spoken-to-signed-translation`](https://github.com/sign-language-processing/spoken-to-signed-translation).

- Upstream revision: `259aacd6b0f268ccc6ed239e46f1c44beb056852`
- Upstream license: MIT
- Landmark format: MediaPipe Holistic, 21 right-hand landmarks
- Languages bundled here: ASL A-Z and DSGS A-Z
- Generated artifact: `data/fingerspellingReferences.json`

For each letter, the generator selects the highest-confidence frame in the
central half of the source pose, rotates and scales the right-hand landmarks
for display, and calculates extension features for the thumb and four fingers.
The browser then compares the ORCA control pose with the four non-thumb
extension features.

The displayed percentage is a control-fit diagnostic, not a linguistic
accuracy score. It does not score thumb contact, fingertip contact, palm
orientation, motion path, signing location, facial expression, timing, grammar,
or comprehensibility. Dynamic letters such as J and Z and all phrase-level
signing still require separate motion references and review by a Deaf signer
fluent in the target sign language.
