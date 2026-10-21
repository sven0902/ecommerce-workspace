# Ecommerce Workspace

**Test more ads. Way faster.**

An assistant-first ecommerce workspace for product research, ad references, Shopify listing preparation and audience-focused ad copy. Working title; final branding is undecided.

## What works

- Dark animated dashboard with example prompts and product/creative libraries.
- OpenAI Responses API research and copy drafts, with source links when returned.
- Per-user saved requests, profile settings and testing states in Cloudflare D1.
- Shopify OAuth, encrypted token storage and catalog-reading implementation.

## Still to build / verify

- Register/configure a Shopify app and verify authorization against a development store.
- Product publication to Shopify (currently listing drafts only).
- Automated media collection/downloads, creative generation and complete product-to-test orchestration.
- Billing, team sharing and production-wide usage quotas.

The homepage describes the intended workflow. This is a development-stage product, not a fully automated production service.

## Local development

Node.js 22.13+ and npm are required.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Set your own server credentials in `.env.local`. Never commit them. Open the printed localhost URL. The Sites development plugin provides a local test identity; do not expose this development server publicly.

Initialize local D1 after starting the development server using Wrangler and the migrations in `drizzle/`. The development database binding is `DB`, database name `site-creator-d1`; apply both SQL migrations in order to local storage. Production D1 setup is separate.

```sh
npx tsc --noEmit
node --experimental-strip-types --test tests/shopify-security.test.ts
npm run build
```

## Architecture

- `app/workspace.tsx`: Assistant and dashboard
- `app/workflow-graphic.tsx`: animated workflow
- `app/api/assistant/route.ts`, `lib/ai.ts`: AI requests
- `app/api/shopify/`, `lib/shopify*.ts`: OAuth/catalog integration
- `db/`, `drizzle/`: schema and migrations
- `worker/`, `scripts/vite/`: Cloudflare/Sites runtime

Production authentication currently relies on trusted Sites dispatch headers. A different hosting environment needs a real identity provider and must not trust user-supplied identity headers. This export omits the existing live Site ID and does not automatically deploy to it.

## Working together

Create a branch, make a focused change, run the checks, and open a pull request. See `CONTRIBUTING.md`. Do not commit credentials, customer/store data, video archives or database exports.

## Licensing

Public source does not grant a blanket open-source license to this application. Existing third-party notices remain applicable. Shopify, Meta, Pinterest and TikTok logos are trademarks of their respective owners; SVGs are sourced from Simple Icons. No affiliation is implied.
