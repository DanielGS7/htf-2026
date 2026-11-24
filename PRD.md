# PRD — Guardians of the Grid: Achrona Mission Control

> **Single source of truth** for what we build, how, and who (or which agent) owns which files.
> Every contributor, human or AI, reads this first, then `docs/FILEMAP.md` (`npm run filemap`)
> instead of opening files blind.

---

## 1. Goal and how we win

**The assignment (README):** a mission control web app where *guardians* log in, see a list of *glitches*,
and report *echoes*. `defender` can report echoes; every echo counts as a glitch by default. `commander` = defender + admin rights.

**Scoring:** Creativity 40% · Functionality 30% (intuitive, no manual needed) · Presentation 30% (gripping, clear,
**every team member's input visible**). There is also a **public award** voted by the other participants.

**Our angle: "The room defends Achrona."** During our presentation the audience scans a QR code, becomes
defenders on their phones, and fights a live "Desync" attack that we trigger on the big screen. Their echoes
are grouped, typed and moderated by AI in real time on the map. They aren't watching a demo, they're in it.
This drives the public vote and shows off creativity and functionality at the same time.

**Non-goals:** no real accounts or e-mail, no multi-tenant setup, and no feature that can't be demoed in about 7 minutes.

---

## 2. Tech stack (fixed)

| Layer | Choice |
|---|---|
| Language | TypeScript (strict) |
| UI | React 19, Tailwind 4, lucide-react icons |
| Framework | TanStack Start (file routes, `createServerFn`, server route handlers) |
| DB | **PostgreSQL** via Drizzle ORM (`pg` driver). Local: `docker compose up -d`. Prod: Optis `DATABASE_URL` |
| Real-time | Server-Sent Events: `GET /api/events` + in-process bus (`src/server/bus.ts`) |
| AI | Anthropic SDK (`@anthropic-ai/sdk`), model `process.env.AI_MODEL ?? 'claude-opus-5-5'`, **always with heuristic fallback** |
| Hosting | Optis (single Node instance, since the bus is in-process) |
| Extra libs (preinstalled) | `zod`, `qrcode`, `react-markdown` |

**Do not add npm packages** without listing them in your report; the coordinator installs them (avoids `package.json` conflicts between parallel agents).

### Commands
```
npm run db:up       # start local Postgres (docker)
npm run db:reset    # push schema + seed (Nova/achrona = commander, Ember/achrona = defender)
npm run dev         # http://localhost:3000
npm run routes      # regenerate src/routeTree.gen.ts after adding/removing a route file
npm run typecheck   # tsc --noEmit (must pass)
npm run filemap     # regenerate docs/FILEMAP.md from @file headers
```

---

## 3. Conventions (mandatory)

1. **File descriptor header.** Every `.ts`/`.tsx` file in `src/` starts with:
   ```ts
   /**
    * @file One-line purpose. Extra lines for important behaviour.
    * @exports a, b, C (type)
    * @usedBy who imports it (optional)
    */
   ```
   Keep it accurate when you change a file. Run `npm run filemap` at the end of your task.
2. **Server-only code** lives in `src/server/**` and `src/db/**`. Components never import them directly;
   they call **server functions** in `src/lib/<area>.functions.ts` (`createServerFn`). Type-only imports are fine.
3. **Auth in every mutating server fn:** `await requireGuardian()` / `await requireCommander()` from `src/server/auth.ts`.
4. **Live updates:** after a mutation, `publish({...})` (`src/server/bus.ts`). Clients use `useLiveEvents()` (`src/lib/useLiveEvents.ts`) and usually `router.invalidate()`.
5. **Domain types and constants** come from `src/lib/glitch.ts` only (statuses, roles, types, districts). Add there and don't redefine.
6. **DB access is async** (`await db.select()...`; `const [row] = await ...limit(1)`). Timestamps are ISO strings.
7. **Styling:** use the theme tokens in `src/styles.css` (`bg-app`, `text-fg`, `text-muted`, `bg-card`, `border-line`, `accent`…). Dark mode and lockdown are driven by `data-theme` / `data-lockdown` on `<html>` (WP-A). No hard-coded light-only colours.
8. **Every UI must be self-explanatory** (judging criterion): empty states, loading states, labels, tooltips on icon buttons.
9. **Ownership:** only edit files your work package owns (§7). Need a change elsewhere? Note it in your report.
10. **Never commit.** The coordinator reviews and commits.

---

## 4. Users and roles

| Role | Can |
|---|---|
| **defender** | Log in / quick-join, see glitches + map, report echoes (text, voice, photo), see own score, chat with Oracle |
| **commander** | Everything a defender can + change status, assign glitches, override AI grouping (move echo to another / new glitch), generate runbooks, toggle lockdown, run the Desync simulator, change guardian roles |

Quick-join (`/join`, QR target) creates a passwordless **defender** with a generated codename (e.g. "Swift Lantern").
Commanders log in with codename + password.

---

## 5. Functional requirements

IDs are referenced by work packages. **P0 = base assignment, must be rock solid.**

### P0 — Base
- **F1 Login/logout** with codename + password; session cookie; unauthenticated users are redirected to `/login` (except `/login`, `/join`, `/api/*`).
- **F2 Roles** `defender` / `commander` enforced server-side and reflected in UI (hide commander controls for defenders).
- **F3 Report echo** (timestamp auto, description required, optional district + photo). Goes through `ingestEcho()` (`src/server/echo-pipeline.ts`) → by default it opens a new glitch.
- **F4 Glitch list** (overview) with status, type icon, severity, district, echo count, assignee, age.
- **F5 Glitch detail**: description, status stepper, echo timeline, district on mini-map.

### P1 — Workflow
- **F6 Status workflow** LEAKED → ASSESSING → CONTAINING → FIXED (commander; one-click "advance" + dropdown). FIXED awards the assignee +10 points.
- **F7 Search / filter / sort**: keyword, status, type, district, severity; sort by newest / severity / echo count. State in URL search params.
- **F8 Assign**: commander assigns a defender; the defender sees "Assigned to me" filter.
- **F9 Keyboard shortcuts**: `j`/`k` next/prev glitch, `Enter` open, `n` new echo, `/` focus search, `?` shortcuts help, `g m` mission control.
- **F10 Dark mode** toggle + **lockdown mode** (red pulsing theme + banner) when commander triggers it or magic < 40%.

### P1 — Real-time monitoring
- **F11 Live updates** for everything (glitches, echoes, magic, lockdown, toasts) via SSE.
- **F12 Magic gauge**: 0–100% overall magic (`computeMagicLevel()`), animated, colour-graded.
- **F13 Interactive map of Achrona**: stylised SVG of the six districts (`DISTRICTS`), glitch markers pulsing by severity, click → glitch, district magic as fill colour.
- **F14 Sensor data**: simulator writes `sensor_readings` per district every ~3s; sparkline/line chart per district.
- **F15 Mobile-first** `/report` field view, large touch targets, works at 360px.
- **F16 Offline indicator** when the SSE stream drops; queued echo submission retries when back online.

### P2 — AI automation (all with heuristic fallback, see `src/server/ai/`)
- **F17 Duplicate grouping**: triage matches an echo to an existing open glitch; commander can override (move echo).
- **F18 Glitch types**: AI classifies type + severity; shown with icon + colour (`GLITCH_TYPE_META`).
- **F19 Moderation**: junk/abusive/illegal echoes are rejected with a reason; shown greyed out to commanders, toast to reporter.
- **F20 Auto-close / reopen**: "all good again" echoes close the glitch; a similar new problem reopens it.
- **F21 Predictive glitches**: simulator anomaly detector creates a glitch when a district drops >25 points in 30s (reporter = system guardian "Sentinel").
- **F22 Auto-assignment suggestion**: best defender = least open assignments + most fixes of that type.
- **F23 Runbook**: AI generates a markdown runbook for a glitch (stored in `glitches.runbook`).
- **F24 Oracle chatbot**: answers questions about active incidents using the current situation as context.

### P3 — Engagement
- **F25 Speech-to-text** echo input (Web Speech API; hide button if unsupported).
- **F26 Image upload** on echo (client-side resize to ≤ 800px JPEG, stored as data URL in `image_url`).
- **F27 Leaderboard** with badges (First Responder, Fixer x5, Storm Chaser...).
- **F28 Notifications**: in-app toasts + browser Notification API for critical glitches (opt-in toggle per user, stored in localStorage).
- **F29 High Council report**: printable `/council` page (print CSS → "Save as PDF").
- **F30 Join QR**: `/mission` shows a QR code to `/join` for the audience.

---

## 6. Architecture

```
Browser ──createServerFn──▶ src/lib/*.functions.ts ──▶ src/server/* ──▶ Postgres (Drizzle)
   ▲                                                      │
   └──── EventSource /api/events ◀── src/server/bus.ts ◀──┘ publish(LiveEvent)

Echo in ─▶ ingestEcho() ─▶ triageEcho() [Claude | heuristics] ─▶ reject | group | new | resolve | reopen
Simulator (server interval) ─▶ sensor_readings + scripted echoes ─▶ same pipeline ─▶ bus
```

### Data model (`src/db/schema.ts`)
- **guardians**(guardian_id PK, codename unique, role, password_hash?, score, created_at)
- **sessions**(token PK, guardian_id FK)
- **glitches**(glitch_id PK, status, description, timestamp, type, severity, district_id?, assignee_id? FK, runbook?, updated_at)
- **echoes**(echo_id PK, glitch_id? FK, description, timestamp, reporting_guardian_id FK, district_id?, moderation, moderation_reason?, image_url?)
- **sensor_readings**(id serial, district_id, magic 0–100, timestamp)

This is a superset of the required model (Glitch / Echo / Guardian).

### Routes
| Path | Who | Owner |
|---|---|---|
| `/login`, `/join` | public | WP-A |
| `/` overview (list + filters + mini map + gauge) | all | WP-B |
| `/glitches/$glitchId` | all | WP-B |
| `/mission` big-screen mission control | all | WP-C |
| `/admin` command deck (simulator, lockdown, roles) | commander | WP-C |
| `/oracle` chatbot | all | WP-D |
| `/report` mobile field report | all | WP-E |
| `/leaderboard` | all | WP-E |
| `/council` printable report | commander | WP-E |
| `GET /api/events` SSE | all | foundation (done) |

### Foundation already built (don't rewrite; extend carefully)
`src/lib/glitch.ts`, `src/db/*`, `src/server/bus.ts`, `src/server/auth.ts`, `src/server/repo.ts`,
`src/server/echo-pipeline.ts`, `src/server/ai/{index,types,heuristics}.ts`, `src/lib/useLiveEvents.ts`,
`src/routes/api/events.ts`, `scripts/*`. Placeholder route files exist for every route above.

---

## 7. Work packages (parallel; disjoint file ownership)

Each WP **owns** the files listed (create or replace). Anything else is read-only for that WP.

### WP-A — Auth, shell and theming
Owns: `src/routes/login.tsx`, `src/routes/join.tsx`, `src/lib/auth.functions.ts`, `src/routes/__root.tsx`,
`src/components/layout/**`, `src/components/ui/**` (may add primitives: Button, Badge, Input, Select, Toast, Modal, Kbd),
`src/lib/theme.ts`, `src/lib/codenames.ts`, `src/styles.css`.
- F1, F2 (`getMe` server fn; root `beforeLoad` redirect; expose `me` via route context), quick-join with codename generator, logout.
- Sidebar nav to all routes (§6) with active states; commander-only items hidden for defenders; user menu (codename, role, logout, theme toggle).
- F10 dark / light / lockdown theme: tokens in `styles.css`, `data-theme` + `data-lockdown` on `<html>`, lockdown listens to the `lockdown` live event and shows a banner.
- F11/F16 global toaster fed by `toast` live events; offline pill using `useConnectionStatus()`.
- Mobile: sidebar becomes a bottom tab bar under `md`.
- **Accept:** can log in as Nova/Ember, quick-join works, wrong password shows an error, `/` redirects when logged out, theme persists (localStorage), typecheck passes.

### WP-B — Glitch workflow (overview + detail)
Owns: `src/routes/index.tsx`, `src/routes/glitches.$glitchId.tsx`, `src/lib/glitches.functions.ts`,
`src/lib/echoes.functions.ts`, `src/components/glitches/**`, `src/components/GlitchesTable.tsx` (may delete), `src/lib/useShortcuts.ts`.
- F3 (desktop echo dialog via `createEcho` → `ingestEcho`), F4, F5, F6, F7, F8, F9, F17 override (move echo), F22 suggestion display.
- Server fns: `getGlitches`, `getGlitch`(+echoes), `createEcho`, `setGlitchStatus`, `assignGlitch`, `moveEcho`, `listDefenders`. Publish bus events.
- Live: list and detail refresh on `glitch.*`/`echo.*` events; new rows flash briefly.
- Mount `<RunbookPanel glitchId>` from `src/components/ai/RunbookPanel.tsx` (WP-D) on the detail page, and `<MagicGauge>` / `<AchronaMap compact>` from WP-C on the overview (import paths in §8; render placeholders if not ready yet).
- **Accept:** full status lifecycle by commander, defender cannot change status (server rejects), filters in URL, j/k works, typecheck passes.

### WP-C — Real-time ops: simulator, map, gauge, mission control
Owns: `src/server/simulator.ts`, `src/lib/ops.functions.ts`, `src/routes/mission.tsx`, `src/routes/admin.tsx`,
`src/components/map/**`, `src/components/mission/**`.
- F12 `MagicGauge` (props: `level`; live via `magic.level` event; initial from server fn `getOpsSnapshot`).
- F13 `AchronaMap` (props: `glitches`, `readings`, `compact?`, `onSelect?`): hand-crafted fantasy SVG (1000×700, districts at `DISTRICTS` x/y), pulsing markers, district fill by magic.
- F14 simulator: `startSimulator()` / `stopSimulator()` / `triggerDesync(scenario)`. Ticks every 3s → sensor readings (+ `sensor.reading` events) + magic level. Scenarios script a 90-second attack: districts drain, scripted echoes from a "Sentinel" guardian via `ingestEcho`, lockdown when magic < 40. `resetDemo()` restores the seed state.
- F21 anomaly detector inside the simulator tick.
- `/mission`: full-screen dashboard for the projector (map center, gauge, live echo feed, top glitches, QR code to `/join` (F30) via `qrcode`, big lockdown state).
- `/admin` (commander): simulator start/stop, Desync scenario buttons, reset, lockdown toggle, guardian list with role change.
- `getLockdownState()` server fn in `ops.functions.ts` (lockdown is in-memory server state). Then seed the initial lockdown `useState` in `src/components/layout/AppProviders.tsx` from it. **WP-C may edit that one line** (WP-A is finished).
- **Accept:** triggering a Desync visibly drains the gauge and lights up the map within 5s on a second browser; reset returns to calm.

### WP-D — AI layer
Owns: `src/server/ai/claude.ts`, `src/lib/ai.functions.ts`, `src/routes/oracle.tsx`, `src/components/ai/**`.
- Implement `triageClaude`, `runbookClaude`, `oracleClaude` (contracts in `src/server/ai/types.ts`). Triage uses **structured outputs** (`client.messages.parse` + `zodOutputFormat` from `@anthropic-ai/sdk/helpers/zod`), small `max_tokens`, `output_config.effort: 'low'`; runbook/oracle stream or plain create with `effort: 'medium'`. Model `process.env.AI_MODEL ?? 'claude-opus-5-5'`. Check `stop_reason === 'refusal'` → throw (index.ts falls back). Never use `temperature`, `budget_tokens`, or assistant prefill (rejected by current models).
- Prompts written in-world (Achrona lore) but strict on output. Triage prompt includes the candidate glitches and the matching rules (same phenomenon + place → match; "resolved/all good" → resolves).
- `ai.functions.ts`: `generateRunbookFn(glitchId)` (commander; saves to DB; publishes `glitch.updated`), `askOracleFn(question, history)` (builds context from open glitches, magic level, top defenders), `getAiStatus()`.
- `RunbookPanel` (button → markdown via `react-markdown`, regenerate), `OracleChat` (chat UI, suggested questions like "What's the most critical glitch?"), `/oracle` page, `AiBadge` showing "AI live / offline heuristics".
- **Accept:** works with and **without** `ANTHROPIC_API_KEY` (fallback text), triage returns valid enums, typecheck passes.

### WP-E — Field and engagement
Owns: `src/routes/report.tsx`, `src/routes/leaderboard.tsx`, `src/routes/council.tsx`, `src/lib/field.functions.ts`,
`src/lib/useSpeech.ts`, `src/lib/image.ts`, `src/components/field/**`, `src/components/leaderboard/**`.
- F15 `/report` mobile-first: big textarea, district chips, mic button (F25), photo button (F26), submit → `createEchoField` server fn (calls `ingestEcho`) → shows outcome card ("Grouped with GL-4F2A", "Rejected: ...", "New glitch opened"). Show the user's points.
- F16 offline: queue in localStorage while `useConnectionStatus()` is false and auto-send on reconnect.
- F27 leaderboard (live refresh, top 3 podium, badges computed server-side).
- F28 notification opt-in + browser notification on critical `glitch.created`.
- F29 `/council` printable report (summary stats, open glitches by district, top defenders, print CSS).
- **Accept:** usable on a 360px phone, voice input works in Chrome, offline queue resends, print preview looks clean.

### Phase 2 (after the WPs merge): coordinator
Integration pass, end-to-end demo rehearsal script, deploy to Optis, load test with 50 simulated phones, polish.

---

## 8. Shared component contracts (so WPs can import each other)
```ts
// WP-C
import { MagicGauge } from '#/components/mission/MagicGauge.tsx'      // ({ level?: number, size?: 'sm'|'lg' }) – self-subscribes to live level if `level` omitted
import { AchronaMap } from '#/components/map/AchronaMap.tsx'          // ({ glitches: Glitch[], compact?: boolean, onSelect?: (id: string) => void })
// WP-D
import { RunbookPanel } from '#/components/ai/RunbookPanel.tsx'       // ({ glitch: Glitch, canGenerate: boolean })
import { AiBadge } from '#/components/ai/AiBadge.tsx'                 // ()
// WP-A
import { useMe } from '#/lib/auth.functions.ts'                       // hook → Guardian | null (from root route context)
import { Button, Badge, Input, Select, Modal, Kbd } from '#/components/ui/...'
// WP-B
import { GlitchTypeIcon, StatusBadge, SeverityBadge } from '#/components/glitches/badges.tsx'
```
If a dependency isn't built yet, create **nothing** in another WP's folder. Render a simple inline placeholder and note it in your report.

**Placeholder handoffs (WP-A and WP-B are finished):**
- WP-C may edit `src/components/glitches/OverviewOps.tsx` to swap its dashed boxes for the real `MagicGauge` / `AchronaMap compact`, and the initial lockdown `useState` in `src/components/layout/AppProviders.tsx`.
- WP-D may edit `src/routes/glitches.$glitchId.tsx` only to replace the plain-text runbook block with `<RunbookPanel>`.
- WP-E may add a `/report` link or button where it's missing, but only in `src/components/layout/nav.ts`.

---

## 9. Demo script (presentation, ~7 min, each member presents their part)
1. **Hook (0:00):** Achrona is calm; magic 97%. "You are all guardians now." QR on screen; the audience joins.
2. **Attack (1:00):** commander triggers *The Desync*. Gauge drains, map lights up, lockdown turns the UI red, phones buzz.
3. **The room reports (2:00):** audience sends echoes (voice/text/photo). AI groups 40 echoes into 5 glitches live, rejects trolls on screen.
4. **Command (4:00):** commander assigns, generates a runbook, asks the Oracle "what should we fix first?", advances statuses.
5. **Recovery (5:30):** "all good again" echoes auto-close glitches; magic climbs to 100%; leaderboard crowns the top audience defenders.
6. **Close (6:30):** architecture slide + who built what.

---

## 10. Risks and decisions
| Risk | Mitigation |
|---|---|
| Venue Wi-Fi / Optis down | Demo also runs on laptop + phone hotspot; simulator runs without the audience |
| AI latency or outage | 12s timeout → heuristics; triage runs at low effort; demo works with `AI_DISABLED=1` |
| Optis and long-lived SSE | Verify early; fallback = client polling every 3s (`useLiveEvents` change only) |
| Multiple Optis instances | Run a single instance (bus is in-process); else move to Postgres `LISTEN/NOTIFY` |
| Trolls in the audience | Moderation (F19) is part of the show; commander can also hide echoes |

**Open questions:** hackathon length / presentation time; Anthropic API key availability (and whether the team prefers a cheaper `AI_MODEL`); Optis specifics (Node version, env vars, websocket/SSE support); teammates' strengths for WP assignment.
