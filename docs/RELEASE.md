# Release procedure

Deployment is separate from local verification. A green build does not prove
that the public URL is current.

1. Start from a clean worktree on the intended commit.
2. Run `npm ci`, `npm run verify`, and `npm run test:e2e`.
3. Review the generated browser screenshots and any upstream Three.js warnings.
4. Confirm `git status --short` is empty and record `git rev-parse HEAD`.
5. Push only after explicit approval and wait for GitHub Actions to pass.
6. Deploy that exact commit only after explicit approval.
7. Open the public URL in a fresh browser context and repeat the primary motion,
   one-hand, two-hand, language, perspective, and Contributor Studio journeys.
8. Record the deployed commit and the time of the live check.

Rollback means redeploying the last known-good commit. Do not use a local green
result as evidence that Vercel or another host has updated.
