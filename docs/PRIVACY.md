# Privacy model

ORCA Hand Sign Lab is local-first by design. It has no account, backend,
analytics SDK, runtime AI API, or telemetry endpoint.

| User action                | Stored                            | Leaves the browser                |
| -------------------------- | --------------------------------- | --------------------------------- |
| Type or upload source text | React memory only                 | No                                |
| Generate or play a plan    | React/Three.js memory             | No                                |
| Save Local Draft           | IndexedDB on that browser         | No                                |
| Export Sign Pack           | User-selected download            | Only to the local download target |
| Copy Contribution JSON     | Clipboard after an explicit click | No upload or external navigation  |

Sign Packs exclude contributor name, email, account identifier, and recordings.
Reference URLs are public HTTPS links. `npm run check:privacy` scans repository
text for configured PII and credential patterns; it is a guardrail, not a legal
or forensic guarantee.
