# i-growth-os agent instructions

i-growth-os is a personal growth PWA that connects daily habits, deliberate learning, focus sessions, and an animated companion. Help users make progress through simple actions, useful AI assistance, and virtual game rewards. Read `IMPLEMENTATION_PLAN.md` before making architectural changes.

## Confirmed product scope

- Deliver a responsive, installable PWA for mobile and desktop browsers. Native Android/iOS apps, app-store distribution, and native wrappers are outside the current scope.
- Currency is fictional game money. Use **Growth Coins** as the provisional name. There are no real deposits, payment methods, refunds, withdrawals, cash value, or cryptocurrency.
- Keep XP for companion progression and Growth Coins for optional game purchases. An activity may award XP, coins, or both according to explicit rules.
- Include real AI assistance in the first release, subject to a free-tier budget. Clearly distinguish provider-generated responses, curated suggestions, and offline templates.
- The companion must have persistent development and interactive animated behavior. Basic animation and reactions must work locally without an AI request.
- The companion may be a plant or animal in a living scene, not only a face. Meaningful completed activities should advance its story and improve its home/garden automatically; feeding is not a required care loop. Prioritize larger readable text and a warm visual style.
- Prioritize automatic opt-in in-app observation over manual focus starts. Group estimates by observed screen, pause while hidden/unfocused/idle, and offer exclusions. Retain existing timer history; never infer completed tasks or reward observed time.
- Keep optional Ethiopian recipes, fasting preferences, and meal logging subordinate to the main daily workflow.
- The Figma Make link is a design reference, not proof of working functionality. Its contents have not been inspected. The reference called “ruzz” remains unidentified; do not invent its behavior or copy unverified assets.

## Platform boundaries

- A PWA cannot enumerate foreground native applications or read device-wide screen-time history. Never imply otherwise in product copy, analytics, or code comments.
- Track focus-session elapsed time separately from visible activity within this app. A running timer does not prove attention or productive work.
- Device-wide usage may come from a user-provided import or an explicitly connected external desktop tracker. This is optional and must not be required for the PWA to work.
- Do not create native applications to work around this boundary without a new user request. Other mobile apps' usage remains unavailable in the PWA-only scope.
- Label data sources and freshness: in-app, self-reported, imported, or connected. Missing measurements are unknown, not zero.
- Background timers, synchronization, notifications, and installation behavior vary by browser. Use timestamps and foreground reconciliation; never depend solely on background execution.

## Current repository

- React, TypeScript, Vite, Tailwind, Lucide, Dexie, Zod, Supabase client, and `vite-plugin-pwa` are present.
- `src/App.tsx` composes the four tabs; `src/features/` implements the user journeys. `src/domain/model.ts` owns validated state, commands, rewards, timers, and wallet rules.
- `src/data/database.ts` owns transactional local persistence and the account outbox. `src/services/cloud.ts` implements sync and authenticated API calls.
- `src/components/AnimatedMascot.tsx` contains SVG character art. `src/features/Companion.tsx` drives reactions and local story chapters. `src/app/useAutomaticActivity.ts` observes eligible in-app activity; state/database/sync protocol version 4 preserves earlier history.
- `worker/` contains the backend and optional YouTube search. `supabase/migrations/` contains owner access policies, CAS commits, and atomic AI budgets/concurrency leases.
- The old mock data, payment vaults, and simulated AI service were removed. Do not reintroduce them as live behavior.
- Commands: `npm run dev`, `npm run build`, `npm run lint`, `npm test`, `npm run check:worker`, `npm run test:e2e`, `npm run preview`.
- Unit and PostgreSQL tests run with Vitest/PGlite; browser tests use Playwright against the production preview.
- Read `README.md` before configuring services. No provider credentials are committed. Live external integrations still require setup and verification.
- Do not edit `node_modules/` or generated `dist/` as source. The working directory has no Git metadata; do not assume commits or branches exist.

## Architecture

- Prefer small feature modules and pure domain functions over further expanding `App.tsx`.
- Recommended additions: Dexie/IndexedDB for local persistence; Supabase Auth/PostgreSQL for optional account sync; a TypeScript Cloudflare Worker for AI and provider API access.
- Store UI preferences and transient animation state separately from durable goals, sessions, progress events, wallet transactions, and inventory.
- Local persistence and cloud synchronization are distinct implementations. Specify retries, conflict handling, account isolation, schema migrations, and logout behavior explicitly.
- Start with one frontend, one small API service, and one database. Add infrastructure only in response to a concrete need.
- Preserve typed interfaces between domain logic, storage, providers, and UI so a provider can be replaced without rewriting the app.

## Progress and virtual currency

- Award rewards from validated domain actions, never from render cycles, React state updater side effects, raw button clicks, or AI output.
- Each eligible action has a stable identity: for example, habit ID plus scheduled occurrence, exercise completion ID, or focus session ID.
- Enforce idempotency at the domain, storage, and server levels. Repeated clicks, StrictMode, reloads, retries, and multiple devices must not multiply rewards.
- Use integer coins and an append-only transaction ledger. Spending and inventory updates must be atomic, with no negative balances.
- Offline guest wallets are local-only. Signed-in offline earnings are pending until reconciled; synchronized spending requires a connection in the first release.
- AI may suggest actions but cannot award coins, modify balances, claim achievements, or execute changes without the user's explicit action in the UI.
- Petting or feeding should not provide unlimited progression. Use bounded, documented rewards for meaningful activities and milestones.
- Reward independent practice and goal progress, not YouTube/TikTok views, likes, follows, or sharing. Keep provider videos optional learning resources.

## AI assistance

- Route provider calls through the backend. Never put provider secrets in `VITE_*` variables or browser code.
- Use a provider interface, structured output validation, timeouts, cancellation, bounded retries, and per-user plus global usage caps.
- Keep the model configurable and verify current availability, regional access, data handling, and free-tier limits before connecting it.
- Require user review before saving an AI-generated plan. Course links must be supplied by users or verified through an allowed provider source; do not fabricate resources.
- Send only the context needed for the request. Raw device activity, private notes, and meal information are excluded by default.
- AI text is untrusted content. Render safely and never execute returned HTML, code, or instructions as application operations.
- Provide useful offline templates and clear quota/error states. Do not silently represent a template as a live AI response.

## Privacy and security

- Enforce user ownership through database row-level security and backend authorization, not frontend filtering alone.
- Keep service-role keys and provider tokens server-side. Store native tracker credentials only in the external connector, never in public web assets.
- Validate input, constrain provider URLs and outbound requests, restrict CORS, and avoid logging secrets or sensitive request bodies.
- Separate account data locally. Logout must clear private runtime caches and prevent another account from seeing pending events or stored records.
- Tracking and cloud synchronization are opt-in. Provide pause, exclusions, export, deletion, and connection revocation where applicable.
- Default to local raw activity and cloud summaries. Do not collect screenshots, keystrokes, private window titles, or full browsing URLs for basic usage statistics.
- Do not expose an ActivityWatch server to the internet. Treat imports as untrusted data with size, schema, and date bounds.
- Cache the app shell and appropriate static assets. Do not indiscriminately service-worker-cache authenticated API responses, AI requests, or third-party video streams.

## User experience and accessibility

- Organize around Today, Learn, Progress, and Settings. Keep one obvious next action on Today.
- Use dark mode by default for new workspaces, with a coordinated light option and saved appearance preferences. Keep Today focused on one next action beside an interactive garden; use separate learning/progress views and expandable settings instead of a dense dashboard.
- Keep the focused layout playful and energizing: bold rounded typography, vivid accents on a dark canvas, expressive companion artwork, selectable habit cards, and completion feedback. Warmth alone is insufficient; avoid a rigid or visually subdued dashboard.
- Support a guest experience, accessible forms, keyboard use, screen readers, readable contrast, and approximately 44 px touch targets.
- Respect reduced motion, mute audio by default, pause hidden animations, and provide a lightweight visual fallback.
- Use encouraging recovery after missed days; do not punish absence through distressing companion behavior.
- Show honest empty, offline, pending, disconnected, and error states. Keep demo content in an explicitly labeled demo mode.
- Do not present unverified nutrition estimates or simplified calendar rules as authoritative analysis.

## Implementation and validation workflow

- Follow the plan phase by phase, keeping the application usable. Update plan status only when its acceptance criteria are met.
- Preserve unrelated user work. A request for documentation alone does not authorize implementing the roadmap or deploying services.
- Keep this file concise and update it when confirmed product decisions change.
- For code changes, run `npm run build` and `npm run lint`, then relevant targeted tests. Report existing failures separately from new regressions.
- Add meaningful tests for reward duplication, wallet spending, migrations, timer recovery, sync conflicts, account isolation, authorization, and AI validation when those features are implemented.
- Verify install/offline behavior using the production preview, not only the Vite development server.
- Documentation-only changes require content and link review rather than an unrelated application build.
- Report the actual changes, checks performed, and remaining limitations. Do not call a feature connected, secure, or complete based only on its appearance.
