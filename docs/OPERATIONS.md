# Operations Runbook

## Normal state

The public site is a static Vercel frontend. Business operations are handled by the Google Apps Script backend and its configured Google Sheets datastore.

## If the frontend appears broken

1. Check the latest Vercel deployment.
2. Open the homepage and one service page.
3. Check browser console/network errors.
4. Confirm `/css/standards.css`, `/css/site.css`, `/js/site.js`, `/js/backend-bridge.js` and `/js/adaptive.js` load successfully.
5. Check that external consultation/review/portfolio links still resolve.

## If orders appear broken

Check the Apps Script deployment and then call the backend health check from the Apps Script project. Do not repair customer/order rows manually until the schema and latest backups/export are understood.

## If the backend appears broken

Run:

- `setupBackend()` only when schema setup is required.
- `runHealthCheck()` for a non-destructive health check.
- `validateProductionConfig()` for production configuration diagnostics.
- `cleanupOperationalLogs()` only after reviewing retention requirements.

Do not run destructive data operations as a first response.

## Credentials

Admin credentials are expected in Google Apps Script Script Properties. They must never be committed to GitHub or placed in frontend JavaScript.

## Data safety

The `Customers` sheet is private. Public order tracking must remain masked. Any debugging involving customer information should use the minimum data required and should not be copied into repository files or issue comments.

## Release discipline

Every maintenance release should:

1. inspect the current `main` SHA;
2. make additive/backward-compatible changes;
3. verify changed files and SHAs;
4. run repository smoke checks;
5. check deployment status;
6. document known external dependencies.
