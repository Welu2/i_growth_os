# i-growth-os implementation plan

Build a useful personal growth PWA with an animated companion, virtual game currency, and AI assistance. Start with a reliable offline daily workflow, then add account synchronization and provider integrations within explicit free-tier limits.

Status: local implementation delivered; connected-service rollout and the full release gate remain open. Product decisions include the October 15, 2026 clarification below. `AGENTS.md` governs implementation work.


## Interactive frontend redesign

The user requested a complete, simpler interface with a lively local companion. The frontend now uses horizontal desktop navigation, a focused daily action beside a new SVG garden, two-step onboarding, separate Practice/Library and Journey/Home/Activity views, and expandable settings. Habit and goal creation use dialogs; library search and view switches retain unsaved resource notes. The companion responds to pointer movement, keyboard/touch greetings, scene lighting changes, and validated XP changes. Reduced-motion and hidden-page behavior remain in place. PWA icons and theme colors match the new design.

These are presentation and navigation changes. Existing storage, synchronization, provider setup, reward validation, and wallet rules remain intact. Local scene interactions do not issue rewards or call AI. Earlier release blockers and physical-device checks remain open.

Verification: build/lint and 25 domain/companion tests pass. The 30 existing browser journeys pass, plus four new interaction checks after the onboarding Back fix. Responsive layouts, expanded controls at 320 px with enlarged text, keyboard greetings, reward idempotency, library drafts/search, and reduced motion were checked. All main screens and onboarding were visually reviewed. The bundle-size warning remains; no service setup or deployment was performed.

The latest visual iteration replaces the subdued Today composition with oversized type, a lime action card, a larger colorful garden, and selectable habit cards. Selection changes only the featured action; completion still uses the existing validated command. Saved XP changes trigger decorative confetti, suppressed for reduced motion. Build/lint and 12 targeted browser checks pass, including the new selection/reward regression. The earlier full-suite results remain separate historical evidence.

## Live verification runner

Plan for the requested continuation: add `npm run test:live`, a bounded integration runner that first checks saved configuration and the running Worker's protocol/CORS. Only after prerequisites pass may it create two disposable, auto-confirmed test accounts without sending email. Verify sign-in, shared-account replay, duplicate rewards, purchases, two-account database isolation, protected writes/RPCs, note conflicts, one genuine AI draft, one YouTube search, and account deletion. Clean up only accounts created by the run; report cleanup failure without secrets. Exercise runner success/failure paths with isolated fixtures, then run local checks. A passing fixture is not a live result. Missing credentials remain an explicit prerequisite, not a reason to invent results or alter unrelated user data.

Status: runner implemented and verified with isolated external-service fixtures. Build, lint, Worker type checks, and all 83 tests pass. Tests execute the real Worker against fixtures and cover successful lifecycle, blocked setup creating nothing, provider failure without generation retries, cross-account leakage stopping provider calls, cleanup failure, and ambiguous creation responses. No frontend behavior changed; the previous browser evidence is unchanged.

An actual `npm run test:live` invocation stopped at preflight: server credential and database prerequisites are blocked. No temporary live accounts, AI generation, search, migrations, or deployment were performed. A final dotenv-parser inspection still found zero server keys in root `.env` and an empty canonical Worker entry. Auth/provider metadata checks remain successful but are not a live integration result. Save the role/server-secret key and complete SQL setup before rerunning.

## Service-connection continuation

User reports adding the role key and authorizes continuing implementation. First saved-file inspection still found `SUPABASE_SERVICE_ROLE_KEY` empty in `worker/.dev.vars`; no equivalent value was present in the root environment files. Requested the saved file path without requesting secret contents.

Plan before further implementation:

1. Verify the saved backend key and project configuration without printing secrets. Support both legacy service-role JWTs and current Supabase server-secret keys; keep signed-in user authorization separate.
2. Add a repeatable read-only `check:services` command for auth availability, server-key configuration, required tables/RPC metadata, Gemini model metadata, and YouTube access. Report setup states explicitly; never equate configuration with end-to-end success.
3. Apply the existing SQL migration only when a database/management connection is available and the target schema has been checked. A data API role key alone is not a database-management credential.
4. Once prerequisites pass, run bounded live checks with disposable test accounts, verify sync/ownership/rewards, request one real AI draft and one search, then remove only test data created by those checks. Keep user data untouched. No email is sent to other people or public deployment performed by these checks.
5. Run relevant local checks, update the verification record, and identify any remaining owner-controlled setup or device checks.

Status: independent implementation complete. Added read-only `npm run check:services` diagnostics and support for Supabase server-secret keys without treating them as Bearer JWTs. User authentication continues to use the user's own access token. Build, lint, Worker type checks, and all 77 unit/database/backend tests pass. No frontend behavior changed in this continuation; the earlier 30-browser-journey result remains separate evidence.

Live checks: public Auth settings HTTP 200, configured Gemini model metadata HTTP 200 with generation support, and YouTube public lookup HTTP 200. These checks sent no email and generated no AI output. After the user identified the root `.env`, its saved contents and the Worker file were rechecked, including key-format classification: no role/server-secret credential was present, and the canonical role-key entry remained empty. Root `.env` still contained only the four previously configured entries. No credentials were changed, no user accounts created, and no migration or deployment performed. The live prerequisite remains blocked until the new key is saved; SQL setup also needs its own verified connection or dashboard execution.

## Current iteration: October 22 feature-completeness audit

Requested order: write this implementation plan first, then implement and verify missing features. Existing work and confirmed PWA scope remain the baseline. Completion means working behavior with evidence; configured keys alone do not establish a connected integration.

### Delivery checklist

1. **Daily workflow and recovery:** expose existing habit schedules, make archived habits recoverable, and let users finish/cancel a timer saved by an earlier version. Keep automatic observation as the primary workflow. Verify schedule/reward identities across archive/restore and reload.
2. **Account lifecycle:** add password-reset request and recovery-password forms, including account entry before guest onboarding; prevent account switches or in-flight sync from sending another account's commands or recreating signed-out data. Clear transient account notices and protect pending changes during session revocation. Verify isolated account/sync behavior.
3. **Reviewed external activity:** add bounded CSV imports and ActivityWatch AFK filtering, import-time app exclusions/category review, and overlap-adjusted preview totals. Preserve privacy, provenance, stable identities, and zero rewards for observations.
4. **Optional everyday care:** add curated recipe instructions and personal fasting preferences without claiming calendar or nutrition authority. Keep these under optional Settings and preserve old saves.
5. **Release checks and setup:** run build, lint, Worker type checks, unit/PostgreSQL suites, and production-preview browser journeys. Inspect configuration presence without printing secrets. Document remaining live-service and physical-device blockers precisely.

### Feature audit and scope

| Feature family | Existing implementation | Work in this iteration |
| --- | --- | --- |
| Guest onboarding, goals, practice, coins/shop, companion story | Domain commands, IndexedDB, UI and tests | Regression verification; preserve reward rules |
| Habits | Daily creation/completion and archive; domain schedules | Schedule picker and archive recovery |
| Focus history | Timestamp domain and reports; no recovery UI | Controls for older active sessions; no mandatory focus starts |
| Account sync/auth | Optional login, outbox, CAS, SQL policies | Password recovery and account-transition safeguards |
| AI and learning resources | Reviewed drafts, templates, server Gemini, YouTube discovery, embeds | Regression checks; live verification requires working backend credentials/database |
| Activity reports | Automatic opt-in observation, JSON imports, per-source reports | CSV, AFK filtering and import review controls |
| Lifestyle | Opt-in meal notes and recipe names | Curated preparation steps and personal fasting preference |
| PWA/accessibility | Offline shell, install/update prompt, responsive themes | Production browser checks and installation guidance |

Conditional roadmap ideas are not silently promoted to requirements: native/mobile device observation remains outside scope; a separate desktop connector, TikTok creator OAuth, camera/voice recognition, and push delivery still require their stated use cases/provider setup. A fasting calendar is not implied by personal preferences. Real-device testing cannot be replaced by viewport emulation. Deployment and owner-controlled service provisioning remain distinct from local code completion.

Status: local checklist complete and verified. Build, lint (no warnings), Worker types, all 72 unit/database/backend tests, and all 30 production-preview browser journeys pass. After the final provider-account guard and cancellation cleanup, all six affected browser journeys passed again. Existing tests passed before changes (57); new coverage checks account-token mismatch (including private assistant context), late sync after logout, scoped acknowledgments, schema-3 migration, habit restore/schedules, CSV/AFK validation, preference persistence, password recovery before onboarding, and saved-timer recovery. Desktop Chromium and Pixel 7 viewport emulation were used. Password-recovery and playback fixtures are simulated and never establish real provider delivery or connectivity. Private provider keys were absent from the browser build and local documentation links resolve. The new import and lifestyle flows were visually reviewed at 390 px without horizontal overflow.

Changes use state/IndexedDB/sync protocol 4. Deploy Worker before frontend, export before upgrading, and do not downgrade local storage. Earlier clients are rejected safely. The Vite large-chunk warning remains (main bundle about 585 kB minified); a modest-device performance check remains open.

**Release blockers, checked October 22:** the service-role key is empty; read-only Supabase checks returned HTTP 200 for Auth settings and HTTP 404 for the Growth table. Apply the SQL migration, configure the server-only key, and configure recovery redirects/email before live sign-in/recovery, two-device sync, genuine AI generation, and YouTube discovery verification. No deployment or provider generation was performed. Real-device installation, screen-reader review, and the wider browser matrix remain open. These are not labeled complete by local tests. Earlier iteration records below are historical evidence, not results for this change.

## Previous iteration: coral, daily wins, and credential configuration

The user rejected the neutral blue palette. The current interface uses coral actions, cream surfaces, sunshine welcome/recovery cards, and a cozy dusk alternative. Today leads with real daily habits and their completion progress, with the living companion alongside and time reporting below. No new rewards or tracking behaviors were introduced. Existing appearance preferences and accessible text scaling remain intact.

The root `.env` now contains the user-supplied credentials under custom names. They were mapped into ignored `.env.local` (public configuration only) and `worker/.dev.vars` (private provider credentials), preserving the original file. Read-only live checks returned HTTP 200 for Supabase Auth settings, Gemini model metadata with generation support, and a YouTube public video lookup. No AI generation was requested. The Growth table check returned HTTP 404 / PGRST205; applying the SQL migration and adding the backend service-role key remain required. No services were deployed and authenticated AI/search/sync remain unverified. See README for exact remaining setup steps.

Verification: build, lint, Worker type checks, all 57 unit/database/backend tests, and all 18 production-preview browser tests pass. After the final phone-spacing and app-icon changes, the build/lint and all four responsive browser checks passed again. Desktop, phone, and dusk-theme screenshots were reviewed; widths from 320 to 1440 px, enlarged text, landscape dialogs, offline workflows, and appearance persistence were checked. Generated app-icon dimensions and README migration links were verified. Private provider keys were absent from the browser build; checked text/action color pairs exceed 5.7:1 contrast in both themes. The configured Supabase client increases the main bundle to about 696 kB minified and triggers Vite’s chunk-size warning; a modest-device performance check remains part of the release gate. Browser emulation does not replace real-device checks.

## Previous iteration: neutral palette and responsive layout

The previous teal/apricot interface was rejected. The replacement uses mostly neutral warm-white surfaces with blue accents, plus a charcoal dark mode. New workspaces default to light; existing appearance preferences remain intact, and the header has a light/dark switch.

Companion and activity cards use less vertical space on phones. Tracking explanations remain accessible in a disclosure. Tablet navigation, safe-area spacing, narrow forms, wrapping text, landscape dialogs, and tab navigation scroll position were revised.

Verification: build, lint, Worker type checks, all 57 unit/database/backend tests, and all 18 production-preview browser tests pass. Every tab and the assistant dialog were checked at 320, 390, 768, 1024, and 1440 px; 360 px with 200% text size and a 640 × 360 landscape dialog were also tested. Light/dark appearance persistence and offline workflows pass. Desktop and phone screenshots were reviewed. Browser emulation is not a real-device release check.

Environment inspection found the root `.env` empty on disk and no `.env.local` or `worker/.dev.vars`. No credentials were displayed or changed; live provider checks and deployment remain pending saved configuration.

## Previous iteration: automatic observation and a softer visual identity

October 15, 2026 follow-up: replace the manual focus-start journey with opt-in automatic in-app observation. Use a shaded plant or animal that responds locally, a teal/ivory/apricot palette, and a responsive activity overview. No claim is made that colors universally improve psychology.

Verified locally: `npm run build`, `npm run lint`, and `npm run check:worker` pass; all 57 unit/database/Worker tests and 14 production-preview browser journeys pass. Checks include v1/v2 storage migration, protocol-1/2 rejection, concurrent minute deduplication, pause/exclusions, reload persistence, ActivityWatch export formats/privacy, offline use, and 360 px layouts with enlarged text. Desktop and phone-sized companion scenes were visually reviewed. Checked body/supporting/action/warm-accent text pairs range from 4.92:1 to 11.92:1 contrast. This does not replace real-device, screen-reader, full browser-matrix, or live-provider checks. Tracking uses only the observed screen (Today, Learn, Progress, Settings, assistant), visibility, focus, and recent interaction timestamps. It stores daily counts, not typed text, URLs, or raw input. Hidden/idle/unfocused periods and sleep gaps are excluded; incomplete minutes are dropped. Settings screens are excluded by default. Users can pause, exclude screens, export, and delete. Older totals remain unclassified.

The lamp chapter now opens after three distinct rewarded practice completions. Previously earned focus-based chapters and saved timer history remain intact; new users do not need a timer. Observation never grants XP or coins. State/IndexedDB and sync protocol are version 3, with migration from versions 1 and 2 and rejection of older clients.

Desktop activity collection still requires an external tracker. ActivityWatch setup and reviewed-import instructions are in README and Settings. A live desktop bridge and device-wide mobile observation are not implemented. Live AI, provider, account, and real-device release checks remain open.

## Next iteration: a companion whose life grows with yours

October 15, 2026 scope, now implemented locally for the core UI, story, linked assignments, and time reports. Live service rollout and the full acceptance gate remain open. This expands the original Phase 3 while preserving existing progress, offline use, account isolation, and reward rules.

### Implementation record for this iteration

- Replaced floating faces with locally animated plant and full-body panda/dog/fox scenes. Habit/practice/focus/goal milestones add leaves, a path or cozy corner, books, a lamp, and a wider-world scene. Greeting is optional; the feeding action was removed.
- Added five authored story chapters with distinct moments, visible next steps, and pending-sync labeling. Unlocks are recorded through the shared command handler using stable milestone/action identities, with no additional coin issuance.
- Added state/IndexedDB version-2 migration and a two-way sync protocol guard. Existing rewards and inventory survive migration; only supported history produces retrospective unlocks. See README for coordinated Worker/frontend rollout.
- Added resource-linked reviewed assignments, editable instructions/time/criteria, reflections, and atomic plan saving. Backend resource ownership and selected-context checks keep unselected notes out of AI requests. Templates remain explicitly labeled and topic-based.
- Added larger relative text, a larger-text preference, warm themes, reduced-motion/hidden-animation handling, and responsive layouts.
- Added timezone-aware 1/7/30-day reports, focus intervals, source labels, and conservative opt-in playback adapters. Imported and playback overlaps are combined within their own source, never added to focus/app totals. Missing measurements remain unknown.
- Live AI, YouTube discovery, provider playback, deployed account sync, and real-device installation/performance remain unverified. No service credentials were configured or services deployed. TikTok creator OAuth remains optional and deferred.

Verification: `npm run build`, `npm run lint`, and `npm run check:worker` pass. All 45 unit/database/Worker tests and 14 production-preview browser journeys pass in desktop Chromium and Pixel 7 viewport emulation. Coverage includes migration, server replay, resource ownership/privacy, atomic saves, offline restart, source-window validation, and 360 px layouts with enlarged text. Core body/supporting text and primary button color pairs exceed 4.5:1 in both themes. Visual desktop/mobile review was performed; screen-reader narration, real browser zoom, real devices, and live providers remain separate checks.

The delivery details and acceptance criteria below remain the reference for release checks; a local implementation alone does not close the production gate.

### Confirmed direction and original gaps

The companion may be a plant or animal. It needs a visible life, personality, story, and evolving environment. Meaningful completed activities improve that life automatically. Feeding is not a daily responsibility. Use larger text and a warmer atmosphere; an isolated animal face is insufficient.

Before this iteration, Companion.tsx had five chapter titles but only two story variants, driven by XP. Feeding awarded no XP. Many labels/buttons were 10–12 px, resources and exercises were separate, and daily/weekly breakdowns and playback measurements were absent. These local gaps are addressed above; deployed AI/auth/sync/provider checks remain unverified.

### 1. Readable UI and a living scene

- Use relative text sizes: body, inputs, and buttons around 16–18 px; supporting text at least 14 px; section titles 22–26 px. Add a larger-text preference, preserve browser zoom, and retain 44 px controls.
- Use warm ivory/teal in light mode and deep teal in dark mode, restrained apricot highlights, comfortable spacing, and measured contrast.
- Build one complete plant scene and one full-body animal scene first. An animal walks, reads, rests, and works; a plant sways, develops leaves, blooms, and gains a garden. Preserve existing names and choices.
- Show the current chapter, last earned scene change, and next milestone directly. Main action: “Continue my next step.” Secondary actions: “Our story” and “Our home.” Greeting remains optional; remove snack duty.
- Use local SVG/CSS animations, hidden-page pauses, reduced motion, muted audio, and a lightweight fallback.

Acceptance: usable at 360 px and 200% zoom without lost controls; keyboard, screen-reader, and contrast checks pass. A completion visibly changes the scene and explains why.

### 2. Persistent story driven by meaningful actions

Proposed arc: **A place to begin → Finding a rhythm → Room to learn → A flourishing home → A wider world**. Write distinct scenes and several short moments per chapter, with plant/animal variants.

| One-time milestone | Plant example | Animal example |
| --- | --- | --- |
| First eligible habit completion | A leaf opens | Settles into its home |
| Habits completed on three distinct days, not necessarily consecutive | Garden path | Cozy corner |
| First independent practice completion | Reading nook beside the plant | Desk and book |
| Three distinct independent practice completions (previous focus unlocks retained) | Garden light | Reading lamp |
| First completed goal | New garden area | Home expansion |

These proposed unlocks add no extra coin awards. Keep existing reward amounts initially. XP remains level progression; core story/world upgrades follow meaningful milestones and do not require purchases. Growth Coins buy optional cosmetics.

Implement versioned story rules, stable milestone/action IDs, and durable unlock records, applied atomically through validated domain actions and server replay. Never award from renders or animations. Account-offline development remains pending until reconciliation.

Migrate old saves without resetting identity, XP, coins, or inventory. Reconstruct milestones only where saved records support them; never invent history or reissue rewards. Local authored text is the baseline; optional labeled AI dialogue cannot invent remembered actions or unlock progress. No hunger duty, decay, distress after absence, or mandatory consecutive streaks.

Acceptance: story/world changes survive offline restart and backup restore. Duplicate clicks, multiple tabs, retries, and two-device replay unlock/reward once. Existing saves migrate safely.

### 3. Resource-linked AI assignments

Journey: choose goal/time → select optional resource → request draft → review/edit/save → do independent practice → explicitly complete it → advance the story.

Extend assignments with optional resource IDs, objective, instructions, estimated minutes, completion criteria, and optional reflection; preserve plain tasks. Add “Create practice from this resource.” Send only approved topic/time and selected excerpts or summaries; exclude private notes by default and validate resource ownership server-side.

Label what the AI used: topic, metadata, user-provided notes, or permitted transcript. A URL/title alone does not mean the AI analyzed the video. Never invent quotations, timestamps, transcripts, or links. Validate structured drafts, save reviewed plans/tasks atomically with stable IDs, and keep completion an explicit user action. AI feedback is advisory and cannot award rewards.

Retain timeouts, cancellation, quotas, safe rendering, and labeled offline templates. No provider call per animation or habit completion.

Acceptance: assignment/resource links survive sync; interrupted saves cannot create partial duplicate plans; unavailable videos leave exercises usable. Verify a genuine deployed AI response before calling the integration connected.

### 4. YouTube and TikTok setup

**YouTube:** enable Data API v3 in a Google Cloud project, store a restricted YOUTUBE_API_KEY in Worker secrets, and configure the existing authenticated discovery endpoint/frontend API URL. Verify real search, attribution, unavailable embeds, quotas, and manual-link fallback. Public search needs no learner OAuth login. Google's current overview lists 100 default search.list calls/day; check the actual project quota before choosing caps. The existing global app cap of 80 searches/day is not evidence of provider capacity. [Setup and quotas](https://developers.google.com/youtube/v3/getting-started).

A search key does not provide arbitrary transcripts. YouTube caption downloads require permission to edit the video. Start assignments from reviewed notes/summaries or topics; add authorized content sources only when available. [Caption permissions](https://developers.google.com/youtube/v3/docs/captions/download).

**TikTok:** retain validated pasted links and official embeds first. For importing a user's own public creator videos, register an app, obtain Login Kit/Display API approval and minimal scopes, configure redirect URLs, and implement server-side OAuth state validation, protected token storage/refresh, and revocation/deletion. Display API exposes creator profiles/videos, not general search or personal For You/watch-history access. Creator linking is optional and must not block learning. [Capabilities](https://developers.tiktok.com/docs/en/display-api-overview), [setup](https://developers.tiktok.com/docs/en/display-api-get-started).

Preserve player controls/attribution, load embeds on demand, and never reward views/likes/follows/shares. Independent practice must be possible without watching. Do not scrape or cache video streams to fill API gaps. [YouTube policies](https://developers.google.com/youtube/terms/developer-policies).

### 5. Time spent with clear sources

Show today's automatically observed in-app time on Today; retain old focus history separately. Add Today / 7 days / 30 days in Progress, a daily chart, and task/category breakdowns where measured.

| Metric | Meaning |
| --- | --- |
| Focus session time | Timestamp-based elapsed time excluding pauses; self-reported, not proof of attention |
| Active in-app time | Opt-in approximate visible/recently active time; excludes hidden/idle periods and duplicate tabs |
| Video playback in this app | Optional estimate while visible/playing; excludes pauses, buffering, and seek jumps; not proof of learning |
| Imported desktop time | Reviewed intervals with device/source/freshness, overlaps counted once |
| Other mobile app usage | Unknown unless a supported import or labeled manual report is supplied |

Never add overlapping focus/visible/playback metrics into an inflated total. Historical daily visible-minute totals cannot be retroactively split by task/video. Include tracking pause, applicable exclusions, export, and deletion.

Use official player events for in-app playback estimates. Validate TikTok message origins, source windows, and payloads; handle seeking, loops, playback speed, hidden pages, crashes, and multiple tabs conservatively. Missing events mean unavailable measurement, not zero. [YouTube player API](https://developers.google.com/youtube/iframe_api_reference), [TikTok player events](https://developers.tiktok.com/docs/en/embed-player).

A PWA observes its own visibility, not native YouTube/TikTok or other mobile apps' usage. Automatic desktop tracking remains a separate optional connector with a private local server. [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API).

Acceptance: date ranges honor the user's timezone; overlap is explained; unavailable values show Unknown/Not connected; hidden/idle/paused/seek periods do not inflate time. Tracking never automatically awards XP.

### 6. Delivery order and release evidence

**Production readiness is not established.** Local implementation and automated checks are recorded above. Live service setup, real Android installation/performance, full screen-reader review, and the wider browser matrix remain open. Automated text enlargement is not a substitute for real browser/device zoom testing.

Order: readable UI and complete scenes → persistent story/world → resource-linked assignments → daily/weekly time views → deployed AI/YouTube checks → release verification. TikTok creator OAuth is optional. Stage schema migrations and frontend/Worker compatibility together so old clients cannot erase new fields.

Before release:

- Run build, lint, Worker type checks, relevant unit/PostgreSQL tests, and production-preview Playwright. Add milestone migration/idempotency, atomic plan saving, time-boundary, and isolation coverage.
- Configure Supabase migrations/auth/email, exact allowed URLs, Worker secrets, HTTPS origins, and production CSP/CORS. Verify actual AI model availability, region, data handling, and free-tier budgets.
- Test deployed sign-in/reset/sign-out, two-account isolation, two-device offline conflicts, duplicate rewards, concurrent spending, genuine AI drafts, and real video discovery/playback. Mocks do not satisfy this gate.
- Verify installation, offline restart, updates, zoom/accessibility, reduced motion, and performance on a real modest Android device and desktop Chrome/Edge/Firefox.
- Exercise export, deletion, applicable connection revocation, backup restoration, redacted error/quota monitoring, and rollback.

Live setup requires owner-controlled Supabase, Cloudflare, Google Cloud, and AI provider accounts and configured secret stores. TikTok approval is needed for creator linking only. Never request secret values in chat. Record successful deployed checks before labeling integrations connected.

## Implementation record

The local app now uses feature modules, a shared validated command handler, transactional IndexedDB persistence, virtual coins, and a responsive four-tab UI. Tests cover the domain and production offline journeys; setup is documented in `README.md`.

Implementation adjustments:

- The pilot cloud store uses a bounded per-user JSON document with revision-based compare-and-swap, rather than separate entity tables. Ordinary clients cannot write it directly; the Worker validates commands before committing. Normalize and partition long histories before a large rollout.
- Guest-to-account import deliberately excludes coins, XP, completions, and notes. Goals, habits, practice tasks, and resource links retain stable IDs; notes stay recoverable in the guest backup.
- Account edits use command replay; notes have explicit revision conflicts. Pending purchases are not applied optimistically. Synchronization accepts changes up to 90 days old.
- Companion levels are derived from XP; versioned story milestones are derived from validated reward evidence and persisted separately. Local SVG scenes keep animation independent of AI.
- No live credentials were supplied or cloud resources deployed. Account sync, Gemini responses, and API discovery cannot be marked live-verified.

The first-release gate is still open for deployed service checks, real Android installation/performance, Firefox/Edge validation, and operational backups. Optional later-phase features are not implied complete by the initial local implementation.

## Product decisions

| Topic | Decision |
| --- | --- |
| Platform | One responsive PWA for mobile and desktop browsers; no native apps or iOS project |
| Currency | Fictional Growth Coins, earned through activities and spent on game items; no financial deposits or refunds |
| Progression | XP levels the companion; coins support customization and optional game purchases |
| AI | Required in the first release through a server-side provider, with quotas and explicit offline alternatives |
| Companion | Plant or animal in a living scene; meaningful actions advance story/home automatically; no feeding duty; optional AI dialogue |
| Tracking | In-app activity and focus sessions first; imported/connected desktop usage later; no automatic mobile-wide app tracking |
| Learning | User-selected resources, short learning plans, notes, independent practice, and milestones |
| Lifestyle | Optional meal logs, Ethiopian recipes, and carefully validated fasting preferences |
| Budget | Free-tier pilot with bounded usage; do not promise unlimited free operation |

“Growth Coins” is a proposed display name and can change without changing the wallet model. Coins have no exchange rate, cash value, transfer, purchase, or redemption mechanism. Personal treats are user-managed goals, separate from virtual inventory.

The Figma Make reference is [Responsive PWA Layout Design](https://www.figma.com/make/8SMEIytPreHpT3nieafzE5/Responsive-PWA-Layout-Design). It was not accessible during the earlier review. Exact visual matching and the unidentified “ruzz” inspiration remain nonblocking design inputs; use the local interface as the starting reference.

## User journeys

1. Open the PWA, choose a goal, name a companion, and create a habit without registration.
2. Complete an independent practice activity; optional in-app observation records automatically without a timer start. Receive the eligible XP and/or coins once.
3. See the companion respond; customize its habitat using earned virtual coins.
4. Ask the AI assistant for a smaller next step, a learning outline, or encouragement. Review suggested changes before saving them.
5. Save a YouTube or TikTok resource, take notes, and complete a separate exercise without requiring video engagement.
6. Close and reopen the app offline without losing progress. Optionally create an account to synchronize devices.
7. View clearly sourced progress and activity summaries. Import desktop usage only if the user chooses to do so.

## Architecture and stack

| Responsibility | Choice | Implementation note |
| --- | --- | --- |
| Frontend | Existing React, TypeScript, Vite, Tailwind, Lucide | Refactor incrementally; retain the working UI foundation |
| PWA | Existing Workbox integration through `vite-plugin-pwa` | Complete manifest assets, offline shell, and safe update flow |
| Local persistence | Dexie over IndexedDB | Versioned records, transactional writes, local event outbox |
| Companion rendering | Existing SVG characters and CSS/Web Animations initially | Add a behavior controller; adopt PixiJS only if richer scenes justify it |
| Accounts and shared data | Supabase Auth and PostgreSQL | Optional login, row-level security, explicit synchronization |
| Backend | One TypeScript Cloudflare Worker | AI proxy, bounded provider queries, authorization, rate limits |
| Frontend hosting | Cloudflare Workers Static Assets | Free provider subdomain for the pilot |
| Validation | Shared runtime schemas such as Zod | Validate API payloads, imports, AI responses, and stored migrations |
| Tests | Vitest/PGlite for domain and database logic, Playwright for key journeys | Suites exist; extend for new behavior and rerun relevant checks |

Use a configurable Gemini provider as the initial AI candidate, subject to verified account/region availability and current free-tier terms. Keep the provider replaceable. General plan generation should require only a topic, available time, and user-selected context.

Cloudflare handles external service calls; Supabase owns account data and transactional database operations. Ordinary owner-scoped data access may use Supabase with RLS. Reward issuance and spending use narrowly scoped transactional server/database operations rather than unrestricted client writes to balances.

Suggested organization, introduced only as features are implemented:

```text
src/
  app/                     navigation and application composition
  features/
    today/ habits/ goals/ focus/ companion/
    wallet/ learn/ assistant/ insights/ settings/ lifestyle/
  domain/                  pure progress, reward, wallet, and timer rules
  data/                    local database, migrations, repositories, outbox
  services/                typed backend client and sync coordination
  components/              shared accessible UI
worker/                    provider adapters, authorization, API endpoints
supabase/migrations/       tables, indexes, policies, transactional functions
tests/                     domain and critical browser journeys
```

## Data and consistency rules

| Record | Essential fields or rules |
| --- | --- |
| Goal | ID, owner, title, target, status, optional companion assignment |
| Habit and occurrence | Schedule, timezone, occurrence key, completion state; daily reset must not depend on leaving the app open |
| Focus session | ID, start/end timestamps, pauses, intended duration, lifecycle state, source |
| Progress event | Stable event ID, owner, source action, occurrence ID, policy version, verification/sync state |
| Companion | Identity, appearance, accumulated XP, derived level, story position, equipped items |
| Wallet transaction | Integer delta, event/reference ID, reason, status, timestamp; unique issuance key |
| Inventory | Owner, item ID, quantity/ownership, linked purchase transaction |
| Learning plan and exercise | Resource references, independent exercise definition, completion event |
| AI request metadata | Owner, capability, result status, bounded usage counters; no raw prompt logging by default |
| Activity summary | Device/source, time range, duration, category, freshness, import/connector provenance |
| Outbox entry | Stable operation ID, owner, payload version, retry state |

- Use integer amounts and transactional ledger writes. A displayed balance must reconcile with accepted ledger entries.
- Reward a habit occurrence or exercise once. Toggling completion off and on must not create a new earning opportunity. Record any permitted correction explicitly.
- Draft default policy: a completed habit can award XP; an independent practice exercise can award XP and coins; a goal milestone can award coins. Keep amounts configurable and versioned rather than scattered in UI components.
- Derive levels correctly even when an award crosses multiple thresholds. Apply awards to the assigned companion, not whichever companion happens to be selected.
- Never issue rewards inside React state updater callbacks; use domain commands and transactions.
- Guest activity is stored locally. Account migration requires an explicit import decision and stable IDs to avoid duplicate rewards.
- Offline signed-in earnings remain pending. Require an online atomic transaction for synchronized purchases in the first release; this prevents competing devices spending the same balance.
- Store times in UTC with the relevant user timezone/occurrence context. Define schedule changes without retroactively duplicating completed occurrences.
- Treat device-provided timestamps as untrusted input, and label self-reported activity. No client-only system can prove real-world attention.

## Phase 1 Scope correction and usable daily flow

Status: implemented and covered by domain and browser tests. Real-money types and demo flows have been replaced.

- Replace payment-oriented `CommitmentVault` with wallet, reward, and inventory types. Rename or replace `GoalsVault.tsx` and `CommitmentVaultModal.tsx` appropriately.
- Remove deposit/refund mechanics, USD symbols, payment promises, and stake options from `App.tsx`, `LearnHub.tsx`, `CourseGeneratorModal.tsx`, `ProfileEngine.tsx`, mock data, notifications, and AI story templates.
- Organize navigation into Today, Learn, Progress, and Settings; expose the wallet beside the companion and goals within daily/progress flows.
- Replace fixed profile identity and hard-coded metrics with actual state or honest empty states. Keep sample content in a clearly labeled demo mode.
- Extract pure reward/progression functions and domain commands from `App.tsx`; fix repeated-action rewards and incorrect companion attribution.
- Add basic guest onboarding, accessible form validation, and useful loading/error/empty states.

Acceptance: a new user can create a habit and goal, complete an eligible occurrence once, and see the correct reward and companion response. Repeating the action does not award twice. No active product flow implies real money.

## Phase 2 Persistence and reliable PWA behavior

Status: implemented and verified in production-preview Chromium, including offline restart. Real-device installation and the wider browser matrix remain unverified.

- Add versioned Dexie tables and transactional repositories for durable records. Handle migrations, storage errors, and export/import.
- Preserve guest progress across reloads and offline restarts. Request persistent storage where available without treating it as guaranteed; provide backups/export.
- Supply actual manifest icons and install metadata. Support narrow phones and wide desktop layouts without forcing portrait on desktop.
- Cache the application shell and local companion assets. Show which learning resources require connectivity; embedded provider video is not an offline download feature.
- Add a safe service-worker update prompt that preserves active work and explains when a reload is needed.
- Separate elapsed focus timers from visible in-app activity. Store timestamps and pauses, reconcile after sleep/reload, and stop counting visible usage when hidden or idle.
- Prevent multiple open tabs from duplicating session events. Support reduced motion and graceful failure when storage is unavailable.

Acceptance: after an initial online visit, the production PWA reopens offline, saves habits/notes, restores a session coherently, and retains wallet history. Updates do not silently discard work. Browser storage clearing remains a documented data-loss condition for unsynced guests.

## Phase 3 Living companion and virtual economy

Status: the October 15 living scenes, five persistent story milestones, larger typography, and reviewed assignment/time workflows are implemented locally. The verification record above distinguishes automated checks from the still-open deployed and real-device release gate.

- Build a behavior controller around the existing SVG mascots. Start with one complete character before applying the system to every character.
- Implement idle breathing/blinking, looking, movement, focus, celebration, greeting, and resting states with sensible transitions.
- Save appearance, level, story progress, and inventory; keep frame-by-frame animation transient.
- React to domain events, not arbitrary re-renders. Welcome returning users without punishment for absence.
- Add a small fixed-price shop of virtual habitat decorations/accessories. Use explicit confirmation for spending, balance checks, and atomic inventory updates.
- Offer keyboard/touch interaction, reduced-motion behavior, paused animation while hidden, and a simple fallback on constrained devices.
- Use bounded rewards for meaningful actions; pet interaction is mainly expressive and cannot mint unlimited coins.

Acceptance: the companion appears active without repeated taps, responds to focus and achievements, and retains development after reload. A purchase deducts coins and grants its item exactly once; insufficient balance changes neither wallet nor inventory. All core behavior works offline for a guest.

## Phase 4 Accounts and cloud synchronization

Status: client, Worker, SQL migration, authorization rules, CAS synchronization, and conflict handling implemented. Local PostgreSQL security/transaction tests pass. Live Supabase/auth configuration and two-device connected validation remain required.

- Create Supabase migrations, owner-scoped policies, indexes, and transactional operations. Test policies using two unrelated accounts.
- Provide optional login and a reviewed guest-data import. Configure a production-capable sign-in method; do not assume a development email sender is a production delivery service.
- Implement an outbox with idempotent uploads, bounded retries, foreground reconnect handling, and visible pending/conflict states.
- Merge progress events by stable identity. Use record revisions for edits, preserve concurrent note edits for review, and use tombstones to prevent deleted records reappearing.
- Make the server authoritative for synchronized reward acceptance and coin spending. Reconcile pending earnings explicitly.
- Separate local data per account; clear sensitive memory, caches, and tokens appropriately on logout. Never upload another account's pending queue.
- Add account export, deletion, device/session revocation, retention settings, and tested recovery procedures.

Acceptance: two devices converge after reconnect without duplicate earnings; concurrent spending cannot overdraw; one account cannot read or mutate another's data; deleted records stay deleted. Guest use remains available.

## Phase 5 AI assistance for the first release

Status: structured Gemini adapter, reviewed assistant UI, local fallback, daily budgets, and expiring concurrency leases implemented. Backend tests use mocked provider responses. Genuine provider output remains unverified until credentials and an available model are configured.

- Replace the simulated `aiService.ts` contract with an assistant interface and clearly named local fallback. Do not label keyword matching as a provider response.
- Implement a Worker endpoint that authenticates requests, validates payloads, enforces atomic user/global budgets, limits tokens/concurrency, and calls the configured provider.
- Deliver three initial capabilities: break a goal into small actions; draft a learning plan; give brief companion encouragement using user-approved context.
- Return validated structured drafts. Require the user to confirm before creating or changing goals, habits, schedules, or plans.
- Keep the model unable to change XP, coins, inventory, or completion records. Avoid an autonomous tool-execution system for the initial assistant.
- Bound conversation context and offer history deletion. Exclude raw tracker data, private notes, and meal records unless the user deliberately includes relevant information.
- Add timeout, cancellation, malformed-response, quota-exhaustion, unavailable-provider, and offline flows. Fallback templates must be labeled as such.
- Use provider URLs only from verified metadata or user input. Keep untrusted resource text separate from application instructions.

Acceptance: an authenticated user receives a genuine provider-generated draft when configured, can review/apply it, and retains control over changes. Provider keys are absent from browser assets. Invalid responses and exhausted budgets leave progress intact and offer a clear alternative. If credentials are unavailable, mark live AI integration unverified rather than complete.

## Phase 6 YouTube and TikTok learning resources

Status: saved links, official embeds, notes, independent exercises, and bounded YouTube discovery implemented. Live discovery requires a configured key; external playback/API access remains unverified. TikTok creator linking is deferred until a concrete use case exists.

- Let users paste supported video URLs into resource collections. Validate hosts/IDs and use official embed players with attribution and an open-original fallback.
- Add notes, independent exercises, practice check-ins, and learning-plan organization. Do not require watching, liking, following, or sharing to earn rewards.
- Add bounded YouTube metadata/discovery calls through the backend, with caching and refresh/deletion behavior consistent with current provider policies.
- Use TikTok embeds first. Add Display API account linking only when creator-owned content has a clear use case and the required approval exists.
- Do not promise a TikTok For You feed, unrestricted search, or general YouTube/TikTok watch-history synchronization.
- Preserve provider player controls/ads. Handle removed/private/non-embeddable videos and reject arbitrary HTML or unsafe external URLs.
- Do not download or cache third-party video streams for offline use. Cache the user's notes and allowed metadata separately.

Acceptance: a valid resource plays when the provider permits it, an unavailable resource fails clearly, and independent practice remains usable without watching a video. Quota exhaustion does not block existing notes or goals.

## First release gate

Complete Phases 1 through 6 before calling the initial release complete. The gate includes real AI assistance, not only a template-based demo. Live provider validation requires configured accounts/secrets; public API access or OAuth may require separate provider approval.

- Guest onboarding, habit completion, offline persistence, animated companion, wallet earning/spending, optional sync, assistant drafts, and saved learning resources work end to end.
- Build and lint pass; targeted domain, authorization, and browser tests pass.
- Test current Android Chrome and desktop Chrome/Edge/Firefox as the initial browser matrix. Show installation guidance according to browser support; no native iOS work is included.
- Verify mobile layout, keyboard navigation, reduced motion, offline/reconnect behavior, multi-tab recovery, data export/deletion, and account separation.
- Measure startup and companion responsiveness on a modest Android device. Lazy-load optional scenes and third-party embeds; avoid a provider network request on every interaction.
- No fake sync badges, fabricated AI output labels, real-money promises, or claims of device-wide PWA tracking remain.

## Phase 7 Optional external activity and better insights

Status: reviewed JSON/ActivityWatch window imports and overlap-adjusted summaries implemented. CSV support, matching-host AFK filtering, import review exclusions/categories, and overlap-adjusted preview totals were added October 22. Automatic desktop connection and richer weekly insights remain conditional future work.

- Add user-reviewed, size-limited JSON/CSV imports for normalized desktop activity summaries, beginning with a documented ActivityWatch format.
- Deduplicate imported time ranges and handle timezone boundaries, idle periods, excluded apps, and overlapping devices.
- Display per-device totals separately from overlap-adjusted active time. Allow user-defined productive/distracting categories rather than assuming every minute in a named app has the same purpose.
- If automatic desktop synchronization is needed, build a separately installed, explicitly authorized local connector that sends summaries over HTTPS. Never expose the tracker's local API or require weakening its CORS policy for the hosted PWA.
- Automatic usage of other mobile apps remains unavailable. Offer a manual daily total/import where a usable export exists, with clear provenance.
- Add weekly summaries, practical next steps, and honest last-sync indicators. Imported data must not silently become trusted reward evidence.

Acceptance: imported or connected summaries are accurately labeled, repeated imports do not duplicate time, and disconnect/delete controls work. No screen-time claim exceeds the available source data.

## Phase 8 Optional lifestyle and polish

Status: optional manual meal notes, curated recipe instructions, and personal fasting preferences implemented. Complete fasting-calendar rules, camera/voice recognition, and push reminders remain deferred; the app makes no claims to provide them.

- Make fasting and nutrition modules opt-in. Replace the weekday-only fasting simulation with reviewed rules and user preferences before claiming a complete calendar.
- Start with manual meal records and curated recipes. Any macro values must have an identifiable source or be explicitly user-entered estimates.
- Add photo/voice entry only after testing a real browser/provider path; do not leave simulation buttons presented as working recognition.
- Expand companion stories, assets, reminders, themes, and personal goals based on observed use. Browser push is optional and requires permission; exact delivery while closed is not guaranteed.

Acceptance: optional features do not crowd the daily flow, simulated recognition is absent, and cultural/meal guidance is qualified according to its actual data source.

## Cost and operational controls

- Remain on free plans for the pilot; do not enable paid overages without an explicit budget decision.
- Check current limits before setup rather than embedding stale quota numbers in business logic. Enforce application-level limits below available provider ceilings.
- Aggregate activity locally, batch sync, paginate history, and keep retention bounded. Do not upload second-by-second usage or animation events.
- Cache public metadata only as provider policies permit. Keep user-specific AI responses scoped to that user and expire unnecessary records.
- Treat AI outages and quota limits as expected states. Curated plans, focus, habits, and companion reactions must continue working.
- Observe error counts, latency, quota use, and pending sync volume without logging private content. Use request IDs and redacted diagnostics.
- Keep SQL migrations and portable exports; test backups and restoration. Free-tier availability and backup provisions are not a production uptime guarantee.
- Scale from evidence: improve indexes, payload sizes, retention, and batching before adding queues, services, or paid infrastructure.

## Verification priorities

| Area | Required behavior to verify |
| --- | --- |
| Rewards | Repeat click, toggle, StrictMode, retry, and duplicate-device submission award once |
| Wallet | Atomic spend, insufficient funds, duplicate purchase, concurrent devices, ledger reconciliation |
| Persistence | Migration, reload, offline changes, storage failure, export/import |
| Focus | Pause/resume, hidden page, sleep, reload, clock changes, multiple tabs |
| Sync | Duplicate messages, conflict, reconnect, deletion tombstones, guest import, account switching |
| Authorization | Cross-user reads/writes denied; privileged operations require authenticated ownership |
| AI | Invalid schema, fabricated links, timeout, cancellation, prompt injection, quota cap, secret leakage |
| PWA | Real icons, production install, offline shell, update with unsaved/active work |
| Accessibility | Keyboard flow, focus management, screen-reader labels, contrast, reduced motion |
| Providers | Removed/blocked embeds, quota errors, safe URLs, no rewarded engagement |

## Reference constraints

Verify current documentation during implementation; these sources establish the platform and service boundaries behind this plan.

- [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) describes visibility of this document, not a device-wide application tracker.
- [ActivityWatch security](https://docs.activitywatch.net/en/latest/security.html) explains local API authentication and access restrictions relevant to an optional connector.
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security) describes database access policies.
- [Supabase pricing](https://supabase.com/pricing) and [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) define current free-tier constraints.
- [Gemini pricing and data handling](https://ai.google.dev/gemini-api/docs/pricing) describes model-specific free access and data-use conditions. Do not send private activity data by default.
- [YouTube developer policies](https://developers.google.com/youtube/terms/developer-policies) prohibit rewarded video engagement; keep independent learning exercises separate.
- [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference) and [search API](https://developers.google.com/youtube/v3/docs/search/list) define playback and discovery capabilities.
- [TikTok embeds](https://developers.tiktok.com/docs/en/embed-videos) and [Display API](https://developers.tiktok.com/docs/en/display-api-overview) support resource presentation rather than unrestricted personal feeds.
