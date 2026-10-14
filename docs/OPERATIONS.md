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


## Temporary maintenance mode

- Public HTML routes redirect to `/maintenance.html` through `vercel.json`. Keep `/privasi.html` accessible during maintenance.
- `sw.js` uses the temporary `ta-maintenance-v5` cache and a maintenance-page offline fallback. After the site is ready to reopen, restore a reviewed normal shell cache, remove the maintenance redirects, confirm `robots.txt` allows crawling so search engines can read the maintenance page's `noindex` directive, and remove the noindex header/meta from the active homepage.
- The former homepage is archived at `index-live.html`; it is intentionally noindex while maintenance mode is active. Review it before copying its contents back to `index.html`.

## Apps Script credential setup and deployment

The repository copy of `backend/google-apps-script/code.gs` is source code only; commits do not update the deployed Apps Script web app. After a reviewed backend release, manually sync the source with the actual Apps Script project and deploy a new version. Smoke-test `stats`, `serviceConfig`, order creation and verification before reopening the form.

For a fresh administrator setup, configure one-time Script Properties `TA_ADMIN_INITIAL_USERNAME`, `TA_ADMIN_INITIAL_NAME`, `TA_ADMIN_INITIAL_EMAIL`, and `TA_ADMIN_INITIAL_PASSWORD` (a unique password of at least 16 characters) before running `setupAdminSecurityPermanent()`. The helper deletes these one-time values after successful setup.

For existing installations, set `TA_ADMIN_ROTATE_PASSWORD` to a new unique password of at least 16 characters, deploy the updated source, then run `rotateAdminPasswordFromEditor_()` from the Apps Script editor. The helper deletes the one-time value and invalidates admin sessions. Do not send passwords in chat or commit them to GitHub.
