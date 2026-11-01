# Contributing

The safest contribution is small, sourced, and honest about what has and has
not been reviewed. A rendered robot motion is never automatically a linguistic
pass.

## Contributing a Sign Pack

1. Open the app's **Add Word** studio.
2. Choose ASL or DSGS, add one or more source phrases, and use an uppercase
   kebab-case gloss such as `THANK-YOU`.
3. Add at least one HTTPS reference from a reputable sign-language source.
   Two independent sources are preferred.
4. Build and inspect the three-keyframe motion from palm, side, and rear views.
5. Save it privately. Reload the app and confirm the draft still works.
6. Export the `.signpack.json` file and run `npm run validate:signpacks`.
7. Add the file under `signpacks/` and open a pull request. Describe the source,
   language/region, what was mechanically checked, and what still needs human
   review.

The Contributor Studio's **Copy Contribution JSON** button only copies the
pack JSON. Read this guide before sharing it. It does not submit, publish, or
upload anything.

## Trust states

- `personal-draft`: private, author-created, and unreviewed.
- `source-backed`: references and mechanical encoding were reviewed by a
  maintainer; this is not signer verification.
- `community-reviewed`: community feedback was recorded, but scope and reviewer
  qualifications must be stated in the pull request.
- `signer-verified`: reserved for documented review by a Deaf signer fluent in
  the target language. Maintainers promote trust; browser clients cannot.

Do not self-promote a pack's trust value in submitted JSON. A contribution
should normally arrive as `personal-draft`.

## Privacy and rights

- Do not include names, emails, CVs, private messages, account IDs, tokens,
  analytics IDs, or recordings in a Sign Pack.
- Do not commit source videos unless their license clearly permits
  redistribution. Link to the reference instead.
- Only contribute motion data you have the right to share under the declared
  license.
- Keep biometric video and signer identity outside the pack and repository.

## Repository checks

```bash
npm ci
npm run verify
npm run test:e2e
```

`verify` includes the schema fixtures, privacy and repository checks, unit tests,
production build, and bundle budgets. The JSON Schema authority is in
`schemas/signpack.v1.schema.json`. Public packs loaded by the deployed app live
in `public/signpacks/index.json`; maintainers add reviewed packs there as part of
promotion.
