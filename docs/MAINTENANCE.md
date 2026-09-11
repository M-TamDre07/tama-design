# Tama Andrea Studio — Maintenance Contract

This repository is maintained under a **non-destructive maintenance policy**.

## Core rule

Existing user-facing features, routes, APIs, data flows and working business rules must not be removed merely for modernization. Improvements must be additive or backward-compatible whenever practical.

Before changing an existing function:

1. Identify every caller and route.
2. Preserve the existing input/output contract where possible.
3. Prefer wrappers, adapters and migrations over destructive replacement.
4. Keep old assets and data unless they are confirmed unused and removal is explicitly justified.
5. Record operationally important changes in Git history.
6. Never commit credentials, tokens, deployment secrets or customer data.

## Architecture goals

- Static frontend remains deployable on Vercel without a build framework.
- Google Apps Script remains the backend/API and Google Sheets remains the operational datastore.
- Frontend API access should use the shared API bridge rather than duplicating endpoint logic.
- Responsive CSS is the primary layout mechanism; adaptive JavaScript only supplies device/performance hints.
- Public tracking must remain masked until customer verification.
- Admin-only data must never be exposed through public endpoints.
- Backend mutations should remain protected by validation, rate limiting, idempotency and audit logging.

## Long-term operation

The site is designed to be low-maintenance, but no web application can honestly be guaranteed to require zero maintenance for 2–3 years. External services, browsers, Google Apps Script behavior, Vercel platform behavior, domains and third-party URLs can change.

When maintenance is eventually performed, start with:

- production deployment status
- frontend smoke tests
- API `ping` and `stats`
- backend health check
- admin authentication
- order creation/tracking/verification
- external links
- asset loading
- Google Sheets schema/configuration

## Do not touch

`TA-Assess` is a separate project and is not part of this repository. Work in this repository applies only to `tama-design`.
