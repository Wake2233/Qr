# CLAUDE.md: Car Platform

Multi-dealer car marketplace. **Web (Next.js)** and **Mobile (Expo)** are each _both_ a buyer-facing storefront _and_ a full management console (admins and approved dealers).
**There is no checkout.** Every vehicle converts through a **WhatsApp deep link** or a **Call** button.
Scope, schema and phases live in `PLAN.md`. Read the active phase before starting work. Tick a checkbox only after its verification command passes.

## Repo map

```
apps/
  web/                 Next.js (App Router) · Tailwind · shadcn/ui · buyer site + /dashboard console
  mobile/              Expo (expo-router) · NativeWind · buyer tabs + `manage/` console stack (/manage)
packages/
  types/               @cp/types: GENERATED Supabase types (database.ts) + domain type helpers
  validators/          @cp/validators: Zod schemas (vehicle, lead, finance app, dealer, filters)
  api/                 @cp/api: platform-agnostic Supabase query fns + React Query keys/hooks
  core/                @cp/core: pure TS: finance math, formatters, WhatsApp/tel builders, filter<->URL
  design-tokens/       @cp/design-tokens: colors, radii, spacing, type scale → web + mobile Tailwind configs
  config/              @cp/config: shared tsconfig bases, ESLint flat configs, Prettier
supabase/
  migrations/          timestamped SQL (the ONLY way schema changes)
  tests/               pgTAP tests (RLS per role, triggers, RPCs)
  functions/           Edge Functions (Deno): simulate-lender-match, decode-vin, notify-new-lead
  seeds/reference.sql  settings, catalog, house dealer (every environment; `pnpm db:remote:seed` for hosted)
  seed.sql             local demo only: lenders, demo dealers & vehicles
scripts/               seed-users.ts, seed-images.ts (service-role, local only)
```

## Commands

Package manager is **pnpm** (via corepack). Task runner is **Turborepo**. Run everything from the repo root.

```bash
corepack enable && pnpm install        # bootstrap
pnpm dev                               # web + mobile in parallel (turbo)
pnpm dev:web                           # Next.js on http://localhost:3000
pnpm dev:mobile                        # Expo dev server (press i for iOS simulator)
pnpm lint                              # ESLint across workspaces
pnpm typecheck                         # tsc --noEmit across workspaces
pnpm test                              # Vitest (packages, web) + jest-expo (mobile)
pnpm test:integration                  # @cp/api query fns against the local stack (after pnpm db:seed:users)
pnpm test:functions                    # Deno tests for supabase/functions (deno comes from the root devDependency)
pnpm test:e2e                          # Playwright against local web + local Supabase (after pnpm db:seed; reads codes from Mailpit)
pnpm --filter @cp/web lighthouse       # Lighthouse budget (mobile) on home, /inventory and a VDP; needs `pnpm --filter @cp/web build` + seeded DB
pnpm build                             # turbo build (web prod build + package builds)
pnpm format                            # Prettier write
pnpm verify                            # lint + typecheck + test + test:functions + db:test + test:integration: MUST be green before any commit to main

pnpm db:start                          # supabase start (Docker)
pnpm db:stop
pnpm db:new <name>                     # supabase migration new <name>
pnpm db:reset                          # re-apply all migrations + seeds/reference.sql + seed.sql locally
pnpm db:test                           # supabase test db (pgTAP)
pnpm db:lint                           # supabase db lint (plpgsql checks)
pnpm db:types                          # supabase gen types typescript --local > packages/types/src/database.ts
pnpm db:seed                           # db:seed:users (local test accounts) + db:seed:images (placeholder photos); local stack only
pnpm functions:serve                   # serve Edge Functions locally (decode-vin) on :54321/functions/v1
pnpm db:remote:link                    # link CLI to the hosted project (reads .env.remote.local)
pnpm db:remote:push                    # push migrations to hosted — ASK THE USER FIRST
pnpm db:remote:seed                    # load seeds/reference.sql into hosted (idempotent; needs pnpm db:start) — ASK FIRST
```

Local test accounts (after `pnpm db:seed`): `admin@`, `dealer.owner@`, `dealer.staff@`, `dealer2.owner@` (pending dealer), `buyer@` — all `@test.local`. Sign in with an email code; read it in Mailpit at http://127.0.0.1:54324. Hosted credentials live in `.env.remote.local` (never `.env.local`: the Supabase CLI auto-loads that and would point local commands at the hosted password).

Run a single workspace with `pnpm --filter @cp/web <script>` (or `@cp/mobile`, `@cp/core`, and so on).
Run a single test file with `pnpm --filter @cp/core test -- finance.test.ts`.

## Non-negotiable architecture rules

1. **The database is the security boundary.** The mobile app talks to Supabase directly, so any rule enforced _only_ in a Server Action is a bug. Authorization lives in RLS, column grants, constraints, triggers and RPCs.
2. **Every table has RLS enabled in the same migration that creates it,** and every policy gets a pgTAP test (anon / buyer / dealer A / dealer B / admin).
3. **Share logic, not UI.** Never import `react-native` into web or `next/*` / DOM APIs into `packages/*`. `packages/*` must be platform-agnostic TS. `@cp/api` functions take a `SupabaseClient<Database>` argument and never create their own client.
4. **The service-role / secret key is used only in Edge Functions and `scripts/`.** It never goes in `apps/*` and never goes in a `NEXT_PUBLIC_*` / `EXPO_PUBLIC_*` var.
5. **Money is stored as integer cents** (`*_cents bigint`). **APR is stored as basis points** (`apr_bps int`). Format only at render time with `@cp/core` formatters.
6. **No checkout, cart or payment code.** Conversion goes through `buildWhatsAppUrl()` / `buildTelUrl()` from `@cp/core`. Log clicks with the `track_contact_click` RPC as fire-and-forget, and never block or await before opening the link.
7. Prices and specs render **exactly** from the DB. Never hardcode, round or "estimate" listing data.
8. Privileged or multi-row writes are **Postgres RPCs** (`approve_dealer`, `apply_as_dealer`, `submit_lead`, `submit_finance_application`, `reorder_vehicle_images`), so web and mobile share one implementation.

## TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, `verbatimModuleSyntax: true`.
- No `any`. Use `unknown` and narrow with Zod. No non-null `!` outside tests. No `@ts-ignore`. Use `@ts-expect-error` only with a reason.
- DB row types come **only** from the generated `@cp/types` (`Tables<'vehicles'>`, `Enums<'fuel_type'>`). Never hand-edit `database.ts`. Regenerate after every migration and commit it with the migration.
- Input shapes come from Zod schemas in `@cp/validators`. Use `z.infer<>` and never duplicate an interface.
- Use named exports everywhere except framework-required default exports (Next `page/layout`, expo-router screens).
- Mutations return `ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string[]> }`.
- Use `const` objects with `as const` instead of TS `enum`.

## Next.js (apps/web)

- Use **Server Components by default.** Put `'use client'` only on leaf components that need state, effects or browser APIs.
- **All mutations go through Server Actions** (`app/**/actions.ts`, `'use server'`). The pattern is: parse with the shared Zod schema → call Supabase with the **user's** session client → `revalidateTag`/`revalidatePath` → return `ActionResult`. Use Route Handlers only for the OAuth/magic-link callback, webhooks and OG images.
- Use `@supabase/ssr` with `lib/supabase/server.ts` (cookies), `lib/supabase/client.ts` (browser) and `src/proxy.ts` (Next 16 replacement for `middleware.ts`: session refresh + `/dashboard` gate). Base server-side authz on `supabase.auth.getUser()`/`getClaims()`, **never** `getSession()`.
- Cache Components is on (`cacheComponents: true`). Public reads use the cookie-less anon client (`lib/supabase/public.ts`) inside `'use cache'` functions with `cacheTag` + `cacheLife` (tags in `lib/cache-tags.ts`: `site-settings`, `vehicles`, `vehicle:<id>`). Server Actions invalidate with `updateTag(tag)` + `refresh()` via `lib/revalidate.ts` (read-your-own-writes); `revalidateTag(tag, 'max')` is for webhooks/background jobs. Anything that reads cookies/session/`searchParams` sits behind `<Suspense>` or a `loading.tsx` (the dev overlay flags blocking routes).
- Filter/sort/page state lives in the URL (`nuqs`). The serialization logic lives in `@cp/core/filters` and is shared with mobile.
- Storefront reads live in `lib/storefront.ts` (cached). Which filters feed the list vs the facet counts is defined once in `lib/inventory/filter-scopes.ts` (server prefetch and client hooks must use the same query keys).
- VDPs are prebuilt (`generateStaticParams`), so their metadata lands in `<head>`. Keep new public detail pages static the same way.
- **Phones first.** Design and check every storefront page at 390px wide. Touch targets are 44px below `sm` (built into `Button`/`Select`), and there is no horizontal page scroll. A horizontal scroll-snap row needs `scroll-px-*` matching its padding (otherwise the browser nudges it on load and Chrome stops reporting LCP).
- **Storefront bundle budget:** no classic `zod` in client code (use `zod/mini` or plain checks), heavy widgets (lightbox, charts) load with `next/dynamic` on demand, and grids/rails of cards use `IntentLink` (prefetch on hover/touch, not on viewport). Don't fade in the LCP element.
- React Query handles client-side interactivity (favorites, compare, dashboard tables). Seed it from RSC with `HydrationBoundary`.
- Use `next/image` for every vehicle image, with explicit `sizes` and a blurhash/`placeholder`.
- The VDP needs `generateMetadata` and JSON-LD (`schema.org/Car` + `Offer`). The inventory needs a `sitemap.ts`.
- shadcn/ui primitives go in `components/ui/`. Add them with `pnpm dlx shadcn@latest add <c>`. Compose them in `components/<feature>/` instead of rewriting primitives.
- Forms use react-hook-form + `zodResolver(sharedSchema)`. Validate again on the server in the action. Console actions use `requireConsole()`/`requireAdmin()` (`lib/console.ts`) and `attempt()`/`dbFailure()` (`lib/action-result.ts`) so DB errors (`MISSING_FIELDS`, unique violations…) come back as `fieldErrors`.
- File uploads (vehicle photos, dealer docs, logos): a Server Action issues a signed Storage upload URL, the browser PUTs the bytes with progress (`lib/images.ts`), then a Server Action writes the row. Never send file bytes through a Server Action.

## Expo (apps/mobile)

- expo-router with typed routes. Layout: `(tabs)` for buyers, `(auth)` (modal), and `manage/` (a real `/manage` segment, since a `(manage)` group would collide with the tabs' index route), which is gated in `manage/_layout.tsx` by role. RLS still does the real enforcement.
- Style with NativeWind `className` only. Colors and spacing come from `@cp/design-tokens`. Use no inline `style` objects except for Reanimated values.
- Render text with `components/text.tsx` (`variant` + `className`, merged by `cn()` from `lib/cn.ts`); RN `Text` doesn't inherit fonts. Font families are per weight (`font-sans`, `font-sans-semibold`, `font-display-bold` …, see `tailwind.config.js`). Third-party views that need `className` are registered in `lib/interop.ts`.
- `SafeAreaView` overrides `padding` classes: put padding on an inner `View`. `Animated.View` is registered in `lib/interop.ts`, so it takes `className`.
- Lists use `@shopify/flash-list`. Images use `expo-image` (blurhash, `cachePolicy="memory-disk"`). Bottom sheets use `@gorhom/bottom-sheet`.
- Store the Supabase session in an encrypted store (the Supabase "LargeSecureStore" pattern: AES key in `expo-secure-store`, payload in AsyncStorage). Register an `AppState` listener for `startAutoRefresh`/`stopAutoRefresh`.
- Persist the React Query cache with the AsyncStorage persister for fast cold starts. Prefetch the VDP on `onPressIn`.
- For WhatsApp, use `Linking.canOpenURL('whatsapp://send?...')`, fall back to `https://wa.me/...`, and use `tel:` for calls. Fire a haptic on CTA press.
- Photo upload pipeline: `expo-image-picker` (multi-select / camera) → `expo-image-manipulator` (max 2400px long edge, WebP q≈0.8; `lib/photos.ts`) → signed upload URL from `createPhotoUpload` → XHR PUT with progress → `add_vehicle_images`. Paths are `{dealer_id}/{vehicle_id}/{uuid}.webp` (the RPC rejects anything else).
- Mobile console mutations call `@cp/api` hooks (`useSaveVehicle`, `useVehiclePhotos`, …), which invalidate both `console` and `vehicles` query keys. Desk-only sections (dealer profile/team, catalog, settings, users) live on the web console.
- Env vars must be `EXPO_PUBLIC_*`, read once in `src/lib/env.ts` and validated with Zod.

## Supabase / SQL

- Workflow: `pnpm db:new <name>` → write SQL → `pnpm db:reset` → `pnpm db:types` → `pnpm db:test`. **Never** edit the hosted schema in the dashboard.
- Naming: tables are snake_case plural. Use `id uuid primary key default gen_random_uuid()` and `created_at`/`updated_at timestamptz not null default now()`, with `updated_at` kept current by a trigger. Foreign keys get an explicit index.
- Policies:
  - Write one policy per command per audience.
  - Always state `to anon` / `to authenticated` explicitly.
  - Wrap calls as `(select auth.uid())` and `(select private.is_admin())` so they become initPlans.
  - Index every column a policy filters on.
  - Name policies `"<table>: <who> can <what>"`.
- Helper functions go in the **`private`** schema (not exposed by PostgREST) and are `security definer`, `stable`, `set search_path = ''`, with fully-qualified names.
- Every view is created `with (security_invoker = true)`. PII (`profiles.phone`, finance applicant data) never appears in a public view.
- Protect sensitive columns with **column grants** (e.g. `profiles.role`, `dealers.status` are not updatable by `authenticated`). Status changes happen only through RPCs.
- After migrating hosted: run Supabase security + performance advisors and fix every warning before moving on.

## UI / UX standards

- The web storefront must feel premium: big imagery, smooth motion (`motion`), skeletons rather than spinners, sticky filter rail / bottom sheet, and dark + light themes.
- Mobile: get to the first usable screen in under 2s on a warm start, keep 60fps lists, use haptics on primary actions, and keep sticky WhatsApp/Call bars on the VDP.
- **The price is always visible** on cards and the VDP. Every spec field that exists is rendered, grouped as Overview / Powertrain / Body & Interior / History / Features.
- Accessibility: WCAG 2.2 AA, visible focus, ≥44pt touch targets, image `alt` = vehicle title + view, and respect for reduced motion.
- Copy for financing must say offers are **simulated / pre-qualification estimates**, not credit decisions.

## Testing rules

- `packages/core` and `packages/validators`: Vitest. Every exported function gets tests (finance math tables, link builders, filter round-trips).
- RLS / RPC / triggers: pgTAP in `supabase/tests/`. **A new policy without a test is not done.**
- Web: Vitest + Testing Library for components with logic. Playwright for critical flows (browse → VDP → WhatsApp href; dealer creates + publishes a listing; admin approves a dealer).
- Mobile: jest-expo + `@testing-library/react-native` for hooks and screens with logic.
- Every bug fix comes with a regression test at the lowest layer that can catch it.

## Project etiquette

- **Work phase by phase.** Don't start phase N+1 until every DoD box in phase N is checked and `pnpm verify` is green.
- Make small commits with Conventional Commits. Scopes: `web, mobile, db, api, core, validators, types, tokens, config, ci, docs`. Branch names: `phase-<n>/<topic>`.
- Add dependencies only to the workspace that needs them (`pnpm --filter @cp/web add x`). Prefer the libraries listed in PLAN.md §2. Justify any new one in the commit body.
- Keep `.env.example` files in sync with every new variable. Never commit `.env*` secrets.
- **Ask the user first** before: `supabase db push` to production, any destructive SQL on a hosted DB, loosening an RLS policy, adding a paid service, or changing the WhatsApp/Call conversion flow.
- When you deviate from PLAN.md, record it in PLAN.md §7 "Decisions log" in the same PR.
