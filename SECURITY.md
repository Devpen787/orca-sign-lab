# Security policy

## Supported version

Security fixes target the current `main` branch. This is a static prototype with
no backend, accounts, analytics, or runtime secrets.

## Reporting

Please use GitHub's private vulnerability reporting for the repository. Do not
include private signer recordings, personal data, credentials, or exploit data
in a public issue.

## Security boundaries

- Source text is held in memory and is not transmitted.
- A local Sign Pack reaches IndexedDB only after **Save Local Draft**.
- Export, clipboard preparation, and opening GitHub are separate user actions.
- The repository privacy scanner blocks common personal-path, email, token, and
  private-key patterns, but automated scanning cannot prove the absence of all
  sensitive information.
- Dependency and browser checks run in CI; they do not make linguistic claims.
