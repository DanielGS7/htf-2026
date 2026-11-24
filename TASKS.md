# Task board

How to use it: put your name in **Owner** to claim a task, and change `[ ]` to `[x]` when it's done. Commit small and often.
**Ref** points to the requirement or work package in [PRD.md](PRD.md).

## Foundation (done)
| Done | Task | Ref | Owner | Notes |
|:---:|---|---|---|---|
| [x] | Postgres schema, seed, docker-compose | §6 | Claude | `npm run db:up && npm run db:reset` |
| [x] | Session auth helpers, live event bus + SSE `/api/events` | §6 | Claude | |
| [x] | Echo pipeline (triage → group / new / resolve / reopen) | F3, F17, F20 | Claude | heuristic AI until WP-D |
| [x] | File descriptors + `npm run filemap`, `npm run routes` | §3 | Claude | |

## WP-A — Auth, shell and theming
| Done | Task | Ref | Owner | Notes |
|:---:|---|---|---|---|
| [x] | Login / logout, route guard, `useMe()` | F1, F2 | Claude | |
| [x] | Quick-join with generated codename | F1, F30 | Claude | |
| [x] | Sidebar + mobile tab bar, user menu | §7 | Claude | |
| [x] | Dark / light / lockdown theme, toasts, offline pill | F10, F11, F16 | Claude | |
| [ ] | Visual check in browser (desktop + phone) | §7 | | not tested yet |

## WP-B — Glitch workflow
| Done | Task | Ref | Owner | Notes |
|:---:|---|---|---|---|
| [x] | Overview list with search / filter / sort | F4, F7 | Claude | |
| [x] | Glitch detail, echo timeline, status stepper | F5, F6 | Claude | |
| [x] | Commander: status, assign, move echo | F6, F8, F17 | Claude | |
| [x] | Keyboard shortcuts | F9 | Claude | |
| [x] | Browser test of the full lifecycle (commander + defender) | §7 | Claude | covered by `npm run e2e` |

## WP-C — Real-time ops
| Done | Task | Ref | Owner | Notes |
|:---:|---|---|---|---|
| [x] | Desync simulator + scenarios + reset | F14, F21 | Claude (agent) | Total Desync = best demo scenario (lockdown at ~30s) |
| [x] | Magic gauge component | F12 | Claude (agent) |  |
| [x] | Achrona SVG map (districts, pulsing markers) | F13 | Claude (agent) | art can still be polished by a teammate |
| [x] | `/mission` big-screen dashboard + join QR | F30 | Claude (agent) | use `/mission?host=<public url>` when projecting from localhost |
| [x] | `/admin` command deck (simulator, lockdown, roles) | §7 | Claude (agent) | defender 'forbidden' view only checked by E2E |
| [x] | `getLockdownState()` + seed it in AppProviders | §7 | Claude (agent) |  |

## WP-D — AI layer
| Done | Task | Ref | Owner | Notes |
|:---:|---|---|---|---|
| [x] | Claude triage (grouping, type, severity, moderation) | F17–F20 | Claude (agent) | live Claude untested: needs `ANTHROPIC_API_KEY` |
| [x] | Runbook generation + panel | F23 | Claude (agent) | |
| [x] | Oracle chatbot page | F24 | Claude (agent) | |
| [x] | Auto-assignment suggestion via AI | F22 | Claude (agent) | `AssigneeSuggestion` not mounted on detail page yet |

## WP-E — Field and engagement
| Done | Task | Ref | Owner | Notes |
|:---:|---|---|---|---|
| [x] | `/report` mobile echo form | F15 | Claude (agent) | submit path not tested live |
| [x] | Speech-to-text | F25 | Claude (agent) | test on a real phone |
| [x] | Photo upload (client-side resize) | F26 | Claude (agent) | test on a real phone |
| [x] | Offline queue for echoes | F16 | Claude (agent) | reconnect flush untested |
| [x] | Leaderboard + badges | F27 | Claude (agent) | |
| [x] | Browser notifications for critical glitches | F28 | Claude (agent) | only while `/report` is open; Android shows toast + vibrate only |
| [x] | `/council` printable PDF report | F29 | Claude (agent) | check print preview |

## Ship and present
| Done | Task | Ref | Owner | Notes |
|:---:|---|---|---|---|
| [ ] | Check Optis: Node version, env vars, SSE support | §10 | | do this early |
| [ ] | Deploy to Optis + public URL for the QR | §10 | | |
| [ ] | Get an Anthropic API key and set `ANTHROPIC_API_KEY` | WP-D | | then smoke-test triage, runbook, Oracle |
| [ ] | Load test: 50 simulated phones | Phase 2 | | |
| [x] | Headless E2E suite (13 flows) | Phase 2 | Claude | `npm run e2e` (Playwright, reseeds DB) |
| [ ] | Fix /mission layout: lockdown banner covers map, empty space under map | Phase 2 | | seen in E2E screenshots |
| [ ] | Demo script + timings | §9 | | |
| [ ] | Slides (story, architecture, who built what) | §9 | | |
| [ ] | Two full rehearsals incl. hotspot fallback | §9 | | |
