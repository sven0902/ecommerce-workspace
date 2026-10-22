# Ecommerce Workspace

**Test more ads. Way faster.**

An assistant-first ecommerce workspace for product research, ad references, Shopify listing preparation and audience-focused ad copy. Working title; final branding is undecided.

## Current implementation

- Background execution through the OpenAI Agents API, with stored task/session identity and idempotent submission.
- Product research, sourced listing drafts, audience-specific copy, published file downloads and a muted video preview.
- A structured result contract imports products and creatives into per-user libraries without replacing manual copy or testing choices.
- Independent Testing/Tested checkboxes, reversible dismissal and copy tabs.
- Origin-access decisions shown in the dashboard. Temporary service failures can be retried within the same task; interrupted startup can be recovered.
- Signed OpenAI webhooks reconcile results while the dashboard is closed. Browser polling is a fallback.
- Shopify OAuth/catalog implementation and draft imports with source images, explicit variants, prices, currency checks and readback checks.

## Verified scope and remaining work

The deployed development instance has completed an actual background text-file task, automatically imported its result, and served the file for download. This verifies orchestration and delivery, not the quality or completeness of every research run.

Still incomplete or unverified:

- Reliable exact-product video collection across Meta/TikTok and application-side media verification. A reference URL is not a downloaded creative.
- Live Shopify installation/import testing, inventory, theme/collection integration and sales-channel publication. Imported products are drafts; the application does not publish sale-ready products yet.
- Team collaboration, billing, global spending limits and cancellation. The pilot allows five new tasks per user per hour; this is not a monetary spending cap.
- Production access approvals can pause an agent until the user responds.

The homepage describes the intended full workflow. Do not market this development-stage build as a fully automated production service yet.

## Local development

Node.js 24+ and npm are required.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Set your own server credentials in `.env.local`. Never commit them. Open the printed localhost URL. The Sites development plugin provides a local test identity; do not expose this development server publicly.

Initialize local D1 after starting the development server using Wrangler and the migrations in `drizzle/`. The development database binding is `DB`, database name `site-creator-d1`; apply all SQL migrations in order to local storage. Production D1 setup is separate.

```sh
npx tsc --noEmit
node --experimental-transform-types --test tests/*.test.ts
npm run build
```

## Architecture

- `app/workspace.tsx`: Assistant and dashboard
- `app/workflow-graphic.tsx`: animated workflow
- `app/api/tasks/`, `lib/agent-client.ts`: background execution and recovery
- `lib/execution-result.ts`, `lib/execution-library.ts`: validated results and stable library records
- `lib/reconcile-task.ts`, `app/api/webhooks/openai/`: owner-bound background reconciliation
- `app/api/assistant/route.ts`, `lib/ai.ts`: legacy synchronous draft endpoint
- `app/api/shopify/`, `lib/shopify*.ts`: OAuth/catalog integration
- `db/`, `drizzle/`: schema and migrations
- `worker/`, `scripts/vite/`: Cloudflare/Sites runtime

Production authentication currently relies on trusted Sites dispatch headers. A different hosting environment needs a real identity provider and must not trust user-supplied identity headers. This export omits the existing live Site ID and does not automatically deploy to it.

## Background completion setup

Configure a project webhook in OpenAI with your own deployed HTTPS URL ending in `/api/webhooks/openai`. Subscribe to `agent.session.idle`, `agent.session.failed` and `agent.session.action_required`. Store the returned signing secret as server-only `OPENAI_WEBHOOK_SECRET`, and redeploy to apply it. No credentials or endpoint IDs are included in this export.

The handler checks the official SDK signature and timestamp, resolves the session to a stored owner, and retrieves the current session state. Repeated delivery does not overwrite existing library entries. A service or artifact verification failure returns 503 so delivery can retry. Unknown sessions are ignored. Test delivery with the OpenAI webhook test endpoint, then verify a real task completes with the task page closed.

## Working together

Create a branch, make a focused change, run the checks, and open a pull request. See `CONTRIBUTING.md`. Do not commit credentials, customer/store data, video archives or database exports.

## Licensing

Public source does not grant a blanket open-source license to this application. Existing third-party notices remain applicable. Shopify, Meta, Pinterest and TikTok logos are trademarks of their respective owners; SVGs are sourced from Simple Icons. No affiliation is implied.
