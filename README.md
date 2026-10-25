# Growth OS

A personal growth PWA with daily habits, automatic in-app activity estimates, an animated companion, learning resources, and fictional Growth Coins. The app runs locally without an account and saves guest progress in IndexedDB.

## Setup checklist for this version

You can use the new companion, colors, and automatic **in-app** activity without creating any service accounts.

1. **Run the app:** use the commands below, open the preview, and complete onboarding. On Today choose **Enable automatic tracking** once. It resumes on later visits; there is no focus timer to start.
2. **Choose privacy settings:** Settings → Comfort and privacy → Tracking exclusions → exclude any screens you do not want counted. Preferences are excluded by default. Excluding Learn also disables video playback estimates. Guest summaries stay on this device; signed-in summaries synchronize.
3. **Track other desktop apps, optionally:** follow [Desktop collection setup](#desktop-collection-setup). ActivityWatch collects automatically on your computer, but transfer into Growth OS currently requires an import. There is no live desktop connection in this release.
4. **Use live AI and account sync:** follow [Connect accounts and live AI](#connect-accounts-and-live-ai). You need a Supabase project, a Google AI Studio API key, and a local or hosted Cloudflare Worker. Guest use and offline templates do not need these.
5. **Add YouTube search, optionally:** enable YouTube Data API v3 in a Google Cloud project and set the Worker’s `YOUTUBE_API_KEY`. Pasted YouTube and TikTok links need no API key. TikTok account linking and watch history are not implemented.
6. **Publish only after verification:** follow [Deployment preparation](#deployment-preparation), deploy the protocol-4 Worker before the matching frontend, and run the live checks listed there. This checkout has not been deployed.

The frontend is organized around one next step and a living companion garden. Today has a direct, self-reported completion action, a simple daily checklist, and optional activity estimates below. Tap the companion to greet it, switch its scene between moonlight and daylight, or complete an eligible activity to see a local celebration. These interactions work without AI; greetings and scene changes award nothing.

Learn has separate Practice and searchable Library views; unsaved resource notes survive searching and switching between these views. Progress separates Journey, Your home, and Activity. Settings opens one group of controls at a time as needed, and onboarding has two steps with a working Back action. New workspaces default to dark mode; saved appearance preferences, enlarged text, reduced motion, and offline data remain supported.

The visual style uses an ink background, oversized rounded typography, lime action cards, and coral/lilac artwork. Today pairs a bold invitation and one featured habit with a large living garden. Habit cards let users choose their next action without earning rewards; validated XP changes trigger companion celebration, with confetti hidden for reduced motion. Nunito is served locally and cached for offline use; its license is in [public/fonts/OFL-Nunito.txt](public/fonts/OFL-Nunito.txt).

## Guided chess lessons

Open **Learn → Learn chess**, choose Beginner, Some basics, or Intermediate, and allow 5, 10, or 15 minutes. The flow offers one concept: rook movement, bishop diagonals, or a knight fork. Choose an optional short lesson, try the local board exercise, explicitly save your practice completion, then save a small follow-up in Learn → Practice. This is a set of three curated exercises, not a chess engine or a complete course. Movement rules reference the [FIDE Laws of Chess](https://handbook.fide.com/chapter/e012023).

Connected search uses the existing authenticated `/youtube/search` route with optional `maxSeconds` (60–239). It applies [YouTube’s short-video filter](https://developers.google.com/youtube/data/reference/rest/v3/search/list#videoDuration), then verifies actual duration and public/processed/embeddable metadata with [videos.list](https://developers.google.com/youtube/data/reference/rest/v3/videos/list). A five-minute session allows up to two minutes of video; ten/fifteen-minute sessions allow up to 3:59, leaving practice time. Results include verified runtimes, but search relevance is not a teaching-quality review. There are at most five candidates, no automatic retries, and the existing per-user/global search limits remain. Metadata and duration-specific cache entries last at most a day. An older backend without runtime metadata produces an explicit error; deploy the updated Worker before the frontend. Protocol remains 4 and no migration is needed.

Guests and offline users can practice without a video. A pasted YouTube link is labeled **length not verified**. Videos require connectivity; opening a player shares information with YouTube. Curated practice is labeled **Offline template**, uses the topic rather than video content, and makes no AI request. Fixed exercise identities preserve unfinished/completed practice across reloads and prevent repeated opening or completion from awarding again. Follow-up saving earns nothing. A video saved before a failed practice save remains in Library; retrying is safe. To resume, reopen Learn chess and choose the same level. Existing tasks retain their original practice-time estimate.

Validation: build, lint, Worker types, all 103 unit/database/backend tests, and 22 production-preview browser checks pass. These include offline resume, keyboard practice, duplicate-reward protection, saved follow-ups, short-search metadata and simulated authenticated search. Live YouTube/search availability still requires the backend setup described below; no new deployment or live integration verification was performed.

## Interactive frontend redesign verification

Build, lint, and 25 targeted domain/companion tests pass. All 30 existing production-preview browser journeys passed; the four new interaction checks passed after fixing onboarding Back navigation and correcting test synchronization. Checks cover keyboard/touch greetings, scene lighting, one-time hero completion, habit/goal dialogs, search and unsaved-note preservation, and expanded settings at 320 px with enlarged text. All four main screens were checked from 320 to 1440 px, and desktop/phone screenshots were reviewed. Reduced motion, offline restart, rewards, account recovery, and imports retain regression coverage.

The subsequent warmth refinement passed build, lint, and 10 targeted production-preview browser checks covering responsive layouts, saved appearance, enlarged text, companion interactions, library state, settings, and guest/offline progress. Desktop and phone screenshots were reviewed in addition to the browser checks.

The subsequent energy redesign passed build, lint, and all 12 targeted production-preview browser checks. These include choosing a habit without rewards, completing the chosen habit, persisted XP after reload, reduced-motion celebration, existing companion actions, responsive layouts, enlarged text, library drafts, and offline guest progress. Desktop and phone screenshots were reviewed; no runtime errors occurred during the visual walkthrough.

The main bundle is about 711 kB minified and still triggers Vite’s size warning (total precached assets are about 879 KiB, including the local font). Physical-device performance and live-provider verification remain open. This redesign was built and previewed locally, not deployed.

## October 22 verification

Build, lint, Worker type checks, 72 unit/database/backend tests, and 30 production-preview browser journeys pass. After the final provider-account guard and cancellation cleanup, all six affected browser journeys passed again. Tests cover the new schedule/recovery/import/lifestyle flows and account isolation regressions. The browser build contains none of the configured private provider keys. The main bundle is about 585 kB minified and still triggers Vite's size warning; physical-device performance is not yet measured.

Live setup remains incomplete: `worker/.dev.vars` has an empty `SUPABASE_SERVICE_ROLE_KEY`. Read-only checks returned HTTP 200 for Auth settings and HTTP 404 for the Growth table. Apply the migration and configure the key locally, then verify real authentication/recovery email, AI, discovery, and two-device synchronization. Nothing was deployed. Browser tests simulate recovery/provider responses and do not replace those live checks or real-device installation/accessibility checks.

## Run locally

Requires Node.js 22 or later.

```bash
npm install
npm run dev
```

For the installable offline app, use the production build:

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

Open http://localhost:4173. Visit once online before testing offline. Installation depends on browser support; Chromium displays an install action when eligible. An HTTPS deployment is required outside localhost.

## What works without service credentials

- Guest onboarding, a named companion, daily habits, goals, and independent practice tasks.
- XP progression and a transactional coin wallet; purchase and equip three virtual habitats.
- Full-body animal and plant scenes, five persistent story milestones, local reactions, reduced motion, warm light/dark themes, and a larger-text preference. Habits, practice, and goals improve the companion’s world automatically; there is no feeding duty.
- Opt-in automatic activity by observed screen, with pause/exclusions and no timer start. Previously saved focus sessions remain available as historical records; unfinished sessions have pause/resume/finish/cancel recovery controls on Today.
- Saved YouTube/TikTok links with official embeds, notes, and original-provider links.
- Reviewed, editable practice plans with resource links, instructions, estimated minutes, completion criteria, and reflections. Saving a plan is atomic; templates are explicitly labeled.
- Offline progress, backup export/restore, storage persistence request, and safe update prompts.
- Today / 7-day / 30-day reports separating focus, visible app activity, optional embedded playback estimates, and reviewed desktop imports.
- Habit schedules and archived-habit recovery under Today → Manage habit schedules; restoring a habit preserves its reward identity.
- Reviewed JSON/CSV imports, ActivityWatch AFK filtering, app exclusions and category selection.
- Optional manual meal notes, curated shiro/misir wot/gomen preparation instructions, and a personal fasting preference. No fasting-calendar, camera/voice recognition, or nutritional-analysis claims.

Coins are game currency only. They cannot be purchased, withdrawn, transferred, or exchanged for money. Rewards recognize self-reported practice and milestones; they are not proof of attention. Video playback and social engagement never issue rewards.

## Connect accounts and live AI

### Finish this workspace’s setup

The supplied root `.env` used custom names. Its values have been copied into ignored local files using the mapping below; the original file was preserved. Edit the canonical destination files for future key changes. Private provider keys belong only in `worker/.dev.vars`, never in a `VITE_*` variable.

| Original name | Canonical destination |
| --- | --- |
| `supabse_pr_url` | `.env.local`: `VITE_SUPABASE_URL`; `worker/.dev.vars`: `SUPABASE_URL` |
| `supabse_publisher_key` | `.env.local`: `VITE_SUPABASE_ANON_KEY` (supports the public publishable key) |
| `gemeni_api` | `worker/.dev.vars`: `GEMINI_API_KEY` |
| `youtube_api_key` | `worker/.dev.vars`: `YOUTUBE_API_KEY` |

Read-only checks on October 15, 2026 succeeded for Supabase Auth settings, Gemini model metadata (`gemini-2.5-flash`, including `generateContent` support), and a YouTube video lookup. This does not verify generation quota, signed-in AI/search, or account sync. The Growth table lookup returned `404 / PGRST205`, and no backend service-role key was configured.

To finish:

1. In Supabase **Project Settings → API Keys**, copy a server-only secret key (`sb_secret_…`) or the legacy `service_role` JWT into `SUPABASE_SERVICE_ROLE_KEY` in `worker/.dev.vars`. Both formats are supported. Keep it out of the frontend and chat; the public publishable key is not a replacement. See [Supabase key types](https://supabase.com/docs/guides/getting-started/api-keys).
2. In the same project’s **SQL Editor**, run the complete [`202610130001_growth.sql`](supabase/migrations/202610130001_growth.sql) migration once, or apply it through your migration workflow. It creates the tables, owner access rules, sync commit function, and AI budget functions.
3. Enable email/password Auth and set its Site URL to `http://localhost:4173`. Run `npm run worker:dev` in one terminal; run `npm run build` then `npm run preview -- --host 127.0.0.1 --port 4173` in another. Open **http://localhost:4173**. The frontend API URL and Worker allowed origin are configured for this local pairing.
4. Sign up/sign in through Settings, verify sync, then test an AI draft and YouTube search. Review AI drafts before saving them. Provider metadata success alone is not an end-to-end connection test.

Replace the Gemini and YouTube keys shared in chat before public deployment; update the canonical Worker file and restart the Worker. [Google’s key-management guidance](https://ai.google.dev/gemini-api/docs/api-key) describes replacement and revocation. No credentials or project-specific key values are stored in this documentation.

### Check saved service configuration

The latest continuation added support for both server-key formats and passed build, lint, Worker checks, and all 77 unit/database/backend tests. Live read-only checks passed for Auth settings, Gemini model metadata, and a YouTube public lookup. Reinspection of the user-identified root `.env` still found no saved role/server-secret key; `worker/.dev.vars` still has an empty role-key entry. Live authenticated checks remain blocked.

Run `npm run check:services` after saving `.env.local` and `worker/.dev.vars`. It reads those canonical files and prints only status labels and setup instructions. It checks public Auth settings, server-key format, required table access without requesting records, RPC metadata where available, Gemini model metadata, and a YouTube public lookup. A blocked prerequisite produces a nonzero exit status. It sends no email, creates no account, makes no AI generation request, applies no migration, and deploys nothing. Passing metadata checks do not prove real sign-in, generation quotas, synchronization, or playback.

If you keep credentials under custom names in root `.env`, copy the role key into the canonical Worker file after saving it. Root `.env` is not automatically loaded by Wrangler. Supabase server-secret keys go only in `apikey`; legacy service-role JWTs also use Bearer authorization. User authentication always uses the signed-in user's own access token, independently of the server key. See [Supabase's key migration guide](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys).

The role/secret key provides application data access; it does not supply a SQL-editor or database-management session. Apply the existing migration in the SQL Editor, or configure a database/management connection for an automated migration. See [database migrations](https://supabase.com/docs/guides/deployment/database-migrations).

### Run the live integration check

Latest verification: build, lint, Worker type checks, and all 83 tests pass, including isolated runner fixtures. An actual invocation stopped before creating accounts because the saved server credential/database prerequisites remain incomplete. No live AI output or connected sync result is claimed.

After `npm run check:services` has no blocked prerequisites, start the matching Worker with `npm run worker:dev` and run `npm run test:live`. It reads `.env.local` and `worker/.dev.vars`; `LIVE_APP_ORIGIN` can override the default `http://localhost:4173` origin when testing your configured HTTPS deployment. It does not deploy or apply migrations.

This is an explicit live test, separate from `npm test`: it creates two uniquely tagged temporary accounts, auto-confirms them through the Admin API without sending email, signs in, verifies two independent sessions of one account, duplicate-reward protection, concurrent spending, two-account isolation, denied direct writes/RPC access, and notes conflicts. It requests at most one AI draft through the authenticated Worker and one YouTube search when configured. Those calls consume the normal application/provider quotas; the runner does not enable billing, raise limits, retry generation, or contact other people. It uses a generic practice topic and temporary test data only. Account creation uses Supabase's [server-side Admin API](https://supabase.com/docs/reference/javascript/auth-admin-createuser).

The runner verifies deletion and removes only accounts it created. Cleanup also runs after ordinary failures. `CLEANUP REQUIRED` lists an exact temporary account ID when cleanup fails; `CHECK CREATION` identifies the unique `growth_verification` marker if a creation response was lost. If the process is forcibly stopped, inspect Supabase Auth for that run marker and remove only those test accounts. No credential or password is printed or persisted by the runner. Quota counters may remain until their normal expiry.

A successful run establishes server/API behavior for this configuration, not real email recovery, actual video playback, browser offline conflict handling on two physical devices, deployment readiness, or phone installation/performance. Those release checks remain separate. The runner's isolated fixture tests are also not evidence of live connectivity.

### General service setup

The source includes the Worker, account UI, sync client, and database migration. Live services are not provisioned or deployed by this checkout. Do not place secrets in the browser environment.

1. Create a Supabase project on an appropriate plan. Apply `supabase/migrations/202610130001_growth.sql` using the Supabase SQL editor or your migration workflow.
2. Enable email/password authentication. Set allowed application URLs and configure reliable email delivery if email confirmation is enabled. Review the provider's current free limits before public use.
3. Copy `.env.example` to `.env.local`. Set the public project URL, public anon/publishable-compatible API key, and Worker URL:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
VITE_API_URL=http://localhost:8787
```

4. Copy `worker/.dev.vars.example` to `worker/.dev.vars` for local Worker development. Set `SUPABASE_URL`, the **server-only** `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, and a currently supported `GEMINI_MODEL`. The example model is configurable, not a promise of availability or free quota.
5. Run `npm run worker:dev`. The Worker allows the exact origin configured as `ALLOWED_ORIGIN` in `worker/wrangler.jsonc`; the default is http://localhost:4173. Change it to http://localhost:5173 if using Vite development instead.
6. Restart/rebuild the frontend after changing its environment. Create an account in Settings. An account has a separate workspace; the first connected load downloads existing data before offering onboarding.
7. Ask the assistant for a next step, learning outline, or encouragement. The submitted topic, available time, and assistance type are sent. For a resource-linked assignment, the Worker verifies account ownership and adds the resource title. Notes are excluded unless the user selects and reviews an excerpt in the form. A title or URL does not mean the AI has watched the video. Suggestions require review before becoming practice assignments.

Before choosing the model, create your key in [Google AI Studio](https://ai.google.dev/gemini-api/docs/api-key), check [regional eligibility](https://ai.google.dev/gemini-api/docs/available-regions), and compare the model’s current [pricing and data-use terms](https://ai.google.dev/gemini-api/docs/pricing). Ethiopia is currently listed as supported, but account eligibility and actual quotas still need verification. Choose a model available to your project that supports `generateContent` and structured JSON. Do not treat the example model name as a verified connection.

For an exact local setup, keep both `ALLOWED_ORIGIN` and Supabase’s Auth Site URL set to `http://localhost:4173`, then run the Worker in one terminal and the production preview in another:

```bash
npm run worker:dev
```

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

Visit **http://localhost:4173**, not a different hostname or port. Configure allowed authentication URLs following [Supabase’s redirect guidance](https://supabase.com/docs/guides/auth/redirect-urls). Open `http://localhost:8787/health` to check configuration and `protocol: 4`; true flags mean keys are present, not that the services work. Then sign in, wait for sync, request a real draft with **Ask AI**, review/save one task, and reload. Check a second signed-in device before relying on sync. If using resource context, sync the saved resource before requesting its assignment.

Existing users can choose **Sign in to an existing account** on the welcome screen without creating guest data. Settings also provides sign-in, account creation, and **Send password reset email**. Add the exact recovery URL (locally `http://localhost:4173/?recovery=1`, or your HTTPS app origin with `?recovery=1`) to Supabase's allowed redirects and configure email delivery. Recovery links open the new-password form before profile/cloud loading; the form validates confirmation and reports expired-session/provider errors. This uses Supabase's [password recovery flow](https://supabase.com/docs/guides/auth/passwords). Local browser fixtures verify the UI; delivery and real recovery links still need a configured project check.

The assistant validates structured output, disallows generated resource URLs, bounds output tokens, times out provider calls, and cannot mutate coins or progress. Daily budgets default to 10 requests per user and 100 globally. One AI request per user and four globally may run simultaneously, with expiring database leases. These application limits may still exceed a provider's current free allowance; reduce them to fit the account. Failed provider attempts still consume a reserved daily request. There are no automatic provider retries or paid overage enrollment.

The fallback is explicitly labeled **Offline template**. A configured but unavailable provider does not silently pretend a template was generated by AI.

## YouTube and TikTok

Known video links do not require a Data API key. Video playback always requires connectivity and may be unavailable if a provider blocks embedding, removes a video, or restricts it regionally.

For optional YouTube discovery: create/select a Google Cloud project, enable **YouTube Data API v3**, create an API key, restrict it to that API, then add `YOUTUBE_API_KEY` to Worker secrets. Follow the [official API setup](https://developers.google.com/youtube/v3/getting-started). Public discovery here uses an API key, not learner OAuth. After restarting/deploying the Worker, sign in and test a search in Learn. Browser-referrer restrictions do not suit this server-side Worker; choose restrictions appropriate to your backend deployment. Discovery returns at most five verified video links per request, with application caps of five searches per user and 80 globally per day. Results are cached in the Worker for at most one day. Quota failures leave manual link saving available.

TikTok currently uses official video embeds; no TikTok developer account is needed for pasted links. Its [Display API](https://developers.tiktok.com/docs/en/display-api-overview) is for approved creator profile/video access and is not a personal watch-history integration. Full `tiktok.com/@creator/video/…` links are accepted; open short links on TikTok first. There is no TikTok login, creator Display API integration, personalized feed, or general watch-history access.

## Companion and saved-data updates

Five one-time milestones now improve the world: the first eligible habit, habit completions on three distinct days (no consecutive streak required), first independent practice, three distinct independent practice completions, and first completed goal. Each has its own story moment and scene change. These unlocks add no coin awards or spending requirements. Existing XP and Growth Coin amounts remain unchanged.

State schema 4 and IndexedDB version 4 migrate existing saves automatically. Only milestones supported by saved reward evidence are reconstructed; balances, inventory, names, and historical records are retained. Backup files keep their version-1 envelope and accept state schemas 1, 2, 3, or 4. Future unknown schemas fail without clearing data.

Deploy the updated Worker and frontend together: update the Worker first, then publish the rebuilt frontend. Sync requests and responses now require protocol 4. Version 4 adds recoverable habit schedules and personal fasting preferences; legacy saves initialize the preference as unspecified and retain their progress. Protocols 1–3 are rejected before replay, so an older Worker cannot silently strip the new fields. Previously earned focus-based lamp chapters are retained. Earlier activity totals remain available with unknown screen categories; migration never guesses what you were doing. Old frontends receive an update-required response, and new frontends reject old Worker responses before acknowledging pending changes. Export before rollout and retain the matching frontend/Worker pair for rollback; do not downgrade the storage schema.

## Account sync and privacy

- IndexedDB transactions serialize local mutations across tabs. Stable command IDs and reward occurrence keys prevent duplicate issuance.
- Pending account changes are uploaded in bounded batches. The backend validates commands using the same domain rules and commits them through a PostgreSQL compare-and-swap operation.
- Authenticated clients may read only their own cloud document. Direct writes, budget changes, and privileged RPCs are denied to ordinary users.
- Account purchases require an online server confirmation. Guest wallets remain local. Pending earnings can change after server reconciliation.
- Notes use revision checks. Conflicting drafts remain in the outbox and appear in Settings for copying/merging or explicit discard.
- Guest import brings over goals, habits, exercises, and resource links without migrating unverified XP, coins, or completion history. Guest notes remain in the guest workspace/export.
- Signing out of this device clears that account's local cache and pending queue after warning about unsynced changes. Global session revocation is also available; existing access tokens may last until expiry.
- Account deletion removes the auth account and associated progress. Offline devices can retain local copies until reconnection; clear those devices as well.
- Backups contain private data and should be stored securely. Restore is guest-only. Browser data clearing can erase unsynced progress.

The pilot uses one bounded JSON document per account, rather than separate relational tables for every feature. This makes transactional command validation and sync reviewable, but is **not** a high-volume event analytics design. Limits include 100 habits, 100 goals, 1,000 practice tasks, 500 resources, 2,000 focus sessions, 10,000 reward/activity occurrence keys, 20,000 command IDs, and a 2 MB cloud document. Export before reaching limits. Partition long histories into relational event/summary tables and implement retention before a large rollout.

## Screen time and imports

A PWA cannot enumerate other apps or automatically collect device-wide mobile screen time. After one opt-in, this app automatically estimates full minutes while visible, focused, and interacted with within the past two minutes. Each minute is grouped by the most observed screen: daily planning, learning/practice, reviewing progress, preferences, or assistant planning. A screen is context, not proof of what task you completed. There is no AI surveillance or automatic completion.

Progress provides Today / 7 days / 30 days, observed-screen and imported-application breakdowns, daily tables, and saved session/resource histories in the profile timezone. Counts use stable minute identities across tabs/devices; the first accepted context owns a shared minute. Backgrounding, inactivity, and sleep gaps reset partial observation. Partial minutes can be lost on reload or pause. Existing interval-based focus records still exclude their saved pauses. Older sessions lack interval detail and are explicitly grouped by completion date; they are not reconstructed as continuous activity.

With activity tracking enabled, official YouTube/TikTok player events support conservative visible-playback estimates inside this app. Pauses, hidden pages, long callback gaps, and detected seek jumps are excluded. Multiple player intervals are combined without double-counting overlapping wall time. Unsupported speed changes or blocked/missing events can undercount; no measurement is shown as unknown rather than zero. Closing/crashing a page can lose the last unsaved fragment (up to about 30 seconds). These estimates are not video completion or attention evidence and never award XP or coins. Provider playback/event availability still needs live verification on target devices.

Focus, visible activity, and playback can overlap and are never added into one total. The playback history is bounded to 5,000 intervals; export and clear recorded activity in Settings when needed. Clearing activity removes visible minutes, screen breakdowns, playback, and imports, but preserves focus sessions and rewards.

Settings accepts a maximum 2 MB JSON file containing 1–2,000 intervals from the last year:

```json
[
  {
    "id": "laptop-editor-20261013-0900",
    "device": "My laptop",
    "app": "Code editor",
    "start": 1791882000000,
    "end": 1791885600000,
    "category": "focus",
    "source": "imported"
  }
]
```

Categories are `focus`, `learning`, or `other`. Times are UTC milliseconds, and each interval must be positive and no longer than 24 hours. Stable IDs make repeat imports idempotent. The review dialog identifies whether approved summaries remain local or synchronize to an account.

ActivityWatch single-bucket exports, bucket maps, and `buckets` wrappers are supported. Window events use `currentwindow`. When `afkstatus` buckets have the same explicit hostname, only intersections with `not-afk` periods are kept; idle periods and unmeasured gaps are excluded, and explicit idle events override conflicting active events. Missing hostnames are never guessed. Without matching AFK data, window intervals can include idle time. Malformed matching AFK data rejects the import. At most 10,000 source events and 2,000 resulting intervals are accepted. The format follows ActivityWatch's [event model](https://docs.activitywatch.net/en/latest/buckets-and-events.html).

CSV uses the header `id,device,app,start,end,category`, with an optional `source` column whose value must be `imported`. Start/end may be UTC milliseconds or ISO timestamps with an explicit timezone. Quoted commas, escaped quotes, and quoted newlines are supported. The JSON size/date bounds also apply to CSV. Example:

```csv
id,device,app,start,end,category
laptop-editor-20261022,Laptop,Editor,2026-10-22T09:00:00Z,2026-10-22T09:30:00Z,learning
```

The review dialog lets you exclude apps and choose focus/learning/other categories. It shows newly added time after combining overlaps with saved imports. These choices apply only to this import, not future automatic filtering. Already saved IDs remain unchanged. To replace an earlier unfiltered import, export first and clear recorded activity before importing filtered data. Repeated IDs with conflicting content within a file are rejected. No imported time earns rewards. Progress keeps per-device totals separate from overlap-adjusted time across devices.

There is no automatic desktop connector yet. Never expose ActivityWatch's local server to the internet.

## Desktop collection setup

1. Download ActivityWatch for your desktop OS from its [official download page](https://activitywatch.net/downloads/). Install, start it, and enable autostart using the [platform instructions](https://docs.activitywatch.net/en/latest/getting-started.html). Keep it running in the background.
2. Open `http://localhost:5600` and confirm that the Activity view shows applications you actually used. Collection works without manually starting a task. On Linux, check your desktop session: the standard window watcher supports X11; Wayland needs a compatible watcher/distribution. Check the [official watcher compatibility list](https://docs.activitywatch.net/en/latest/watchers.html) before installing an alternative.
3. In ActivityWatch’s **Raw Data** screen, export the needed window-event bucket as JSON, or use a bucket-map export containing matching window and AFK buckets. The app accepts single-bucket exports, bucket maps, and the `buckets` wrapper. Use at most 2 MB and 2,000 intervals from the past year. [Export instructions](https://docs.activitywatch.net/en/latest/features/exporting-data.html).
4. In Growth OS go to **Settings → Optional desktop activity import → Choose activity JSON or CSV**. Review the device and interval count, then import. Progress shows application names and device totals with an imported-source label. Reimporting the same intervals does not double-count them.
5. Pause collection in ActivityWatch when needed. Clear Growth OS measurements with **Clear recorded activity**; this does not delete the original ActivityWatch database. Export a Growth OS backup to retain your summaries.

ActivityWatch itself can retain window titles and other details. Growth OS discards window titles and URLs before saving imported app names and intervals. Include matching AFK buckets to filter idle periods; window-only exports can include idle time. Unrelated bucket types are ignored. Keep ActivityWatch’s server on your own machine; do not expose port 5600 publicly or change its CORS policy to connect this website. Automatic secure transfer needs a separate connector that is not implemented here. Other mobile apps remain unavailable to the PWA.

## Validation

```bash
npm run build
npm run check:worker
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
```

Tests cover automatic observation, pause/exclusions, concurrent minute deduplication, ActivityWatch format/privacy validation, v1/v2/v3 storage migration, deterministic rewards, story migration/replay, atomic assignment saving, wallet transactions, timezone/DST boundaries, playback seek/visibility rules, notes conflicts, backup validation, account isolation, selected AI context, protocol compatibility, and PostgreSQL RLS/CAS/budgets using PGlite. Playback and password-recovery browser fixtures are simulated solely in tests; they do not establish live provider connectivity or real email delivery. Account-sync regressions also check token/owner mismatch, late responses after logout, and owner-scoped outbox acknowledgment. Browser tests run against the production preview in desktop Chromium and a Pixel 7 viewport. Android viewport emulation does not substitute for a real device test.

Tests do not call paid AI or video APIs. Live provider credentials, deployed database/auth configuration, real Android installation, Firefox/Edge, and actual provider playback need separate verification before calling the release production-ready.

## Deployment preparation

Frontend and API have separate Wrangler configurations. Nothing is deployed automatically.

- Build the frontend, then deploy the root `wrangler.jsonc` when ready.
- Configure the API's `ALLOWED_ORIGIN` to the exact frontend origin.
- Store API secrets using `wrangler secret put NAME --config worker/wrangler.jsonc`, not in committed configuration.
- Package the API without publishing using `npx wrangler deploy --config worker/wrangler.jsonc --dry-run`.
- Use `npm run worker:deploy` only when deployment is intended.
- Set the frontend's `VITE_API_URL` to the deployed HTTPS Worker and rebuild.
- Before hosting, replace the template wildcard `connect-src` entries in `public/_headers` with the exact Supabase and API origins. Add any custom API origin deliberately.
- Keep provider billing/overages disabled unless an explicit budget is set. Configure quota alerts, tested database backups, and restoration outside the free-tier assumptions.

For a hosted Worker, add these values through prompted secret entry (never paste them into a chat, public frontend file, or command history):

```bash
npx wrangler secret put SUPABASE_URL --config worker/wrangler.jsonc
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config worker/wrangler.jsonc
npx wrangler secret put GEMINI_API_KEY --config worker/wrangler.jsonc
npx wrangler secret put GEMINI_MODEL --config worker/wrangler.jsonc
npx wrangler secret put YOUTUBE_API_KEY --config worker/wrangler.jsonc
```

The last key is optional. Use the [Cloudflare secret setup guide](https://developers.cloudflare.com/workers/configuration/secrets/) for account login and secret management. Set `ALLOWED_ORIGIN` in `worker/wrangler.jsonc` to the exact public frontend origin, without a trailing slash. Update Supabase’s Site URL, rebuild with the public `VITE_*` values, and use matching frontend/API releases. No secret should have a `VITE_` prefix.

Verify actual sign-in/out, a genuine AI draft, a real YouTube search, two-device sync, offline restart, account isolation, export/restore, and account deletion on your deployment. Test installation and readable layouts on a real phone. Health flags and passing local tests do not establish production readiness.

The original source snapshot from before this refactor is at `/tmp/i-growth-os-before-implementation.tar.gz` in the current environment. This temporary archive is not a durable backup.

See [AGENTS.md](AGENTS.md) for coding rules and [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for the roadmap and current verification gaps.
# i_growth_os
