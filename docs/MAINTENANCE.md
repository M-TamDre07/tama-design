# Tama Andrea Studio — Maintenance & Architecture

## Runtime architecture

- Public frontend: static HTML, CSS, and JavaScript served by Vercel.
- Server-side API: Vercel Node.js Functions under `api/`.
- Operational database: Supabase Postgres project `tama-design`.
- Authentication: Supabase Auth password login followed by server-verified Telegram OTP.
- Notifications: Telegram bot; Formspree is a secondary copy for website messages only.
- Public order creation: the server calls the controlled `create_public_order(jsonb)` Postgres function; the database creates the customer, order, receipt, and audit event in one transaction.
- The static site does not access protected operational tables directly. Browser code uses public API endpoints; privileged queries use server-side Supabase secret credentials only.

## Maintenance principles

1. Preserve existing public routes and customer data flows unless a change is explicitly intended.
2. Add new schema through versioned SQL migrations and apply the same SQL to the project before deploying code that depends on it.
3. Keep migration filenames synchronized with the version numbers recorded by Supabase migration history.
4. Apply RLS to every table reachable through the Data API; revoke browser-role access and grant only the minimum server role privileges needed by Vercel functions.
5. Never put Supabase secret keys, Telegram bot tokens, admin UUID allowlists, or customer records in browser bundles or Git.
6. Validate every public write server-side, rate-limit it, and log an audit trail for privileged operations.
7. Treat payment destination details as public content once a method is activated. Do not store PINs, OTPs, passwords, or private recovery data in payment CMS fields.
8. Use archive/soft-delete for operational records; do not hard-delete orders, receipts, or customer records through routine admin workflows.
9. Maintain backward-compatible API responses when public pages depend on them.
10. Never claim a real payment, notification, or booking has completed until the corresponding provider/database response confirms it.

## Database ownership map

| Area | Tables |
|---|---|
| Orders & CRM | `orders`, `customers`, `order_events`, `service_notes` |
| Billing | `transactions`, `receipts` |
| Availability | `service_availability`, `service_queue`, `service_visits` |
| Public content | `site_config`, `studio_services`, `studio_portfolio`, `studio_faq`, `studio_payment_methods`, `studio_reviews` |
| Website inbox | `website_messages`, `notifications` |
| Security & diagnostics | `admin_otp_challenges`, `admin_otp_sessions`, `audit_logs`, `error_logs`, `rate_limit_buckets`, `request_index` |

## Production checks

Before and after deploying:

- Verify GitHub Actions and production deployment status.
- Check `/api/config`, `/api/catalog?action=services`, `portfolio`, `faqs`, `paymentMethods`, and `reviews`.
- Submit only a controlled test order when explicit approval exists; confirm one order, one receipt, one customer association and audit/timeline events.
- Verify order tracking and owner verification without exposing private customer fields.
- Verify admin login, Telegram OTP, role allowlist, dashboard data loading, and audit writes.
- Verify a transaction test only against a designated test order; confirm receipt and order payment state are synchronized.
- Check Supabase Security Advisor and API logs.
- Do not perform destructive data migrations without a tested rollback plan and a verified backup.

## Public-site and maintenance routing

The public homepage is `index.html`. The obsolete migration notice page is not part of the production route map. Temporary maintenance must be enabled through an explicit deployment change and removed after the maintenance window; do not leave stale migration messaging in public pages.

## Separate projects

`TA-Assess` and Linux Software Lab are independent projects. Do not mix their Supabase projects, environment variables, data, or deployments with `tama-design`.
