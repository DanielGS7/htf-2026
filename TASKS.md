# Task board

How to use it: put your name in **Owner** to claim a task, and change `[ ]` to `[x]` when it's done. Commit small and often.
**Ref** points to the requirement or work package in [PRD.md](PRD.md).

## Foundation (done)
| Done | Task                                                     | Ref          | Owner  | Notes                               |
| :--: | -------------------------------------------------------- | ------------ | ------ | ----------------------------------- |
| [x]  | Postgres schema, seed, docker-compose                    | §6           | Claude | `npm run db:up && npm run db:reset` |
| [x]  | Session auth helpers, live event bus + SSE `/api/events` | §6           | Claude |                                     |
| [x]  | Echo pipeline (triage → group / new / resolve / reopen)  | F3, F17, F20 | Claude | heuristic AI until WP-D             |
| [x]  | File descriptors + `npm run filemap`, `npm run routes`   | §3           | Claude |                                     |

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

## Integration and polish
| Done | Task | Ref | Owner | Notes |
|:---:|---|---|---|---|
| [x] | Headless E2E suite (13 flows) | Phase 2 | Claude | `npm run e2e` (Playwright, reseeds DB) |
| [x] | AI via `claude -p --model haiku` (no API key) | §2 | Claude | ~4s per echo; live-tested triage, grouping, moderation, auto-close, Oracle, runbook |
| [ ] | Show AI assignment pick + AI badge in the app | F22 | Claude | |
| [ ] | Send photos through moderation too | F19 | Claude | |
| [ ] | Fix /mission layout (lockdown banner over map, empty space) | F30 | Claude (agent) | part of V3 |
| [ ] | README: how to run locally | | Claude | |
| [x] | Visual foundation: HTF 2026 palette, fonts, assets, PageHeader, docs/DESIGN.md | F32 | Claude | |
| [x] | Visual V1: shell, UI primitives, login/join, toasts, lockdown chrome | F32 | Claude (agent) | lockdown strip not screenshot-checked yet |
| [ ] | Visual V2: overview + glitch detail + badges | F32 | Claude (agent) | in progress |
| [ ] | Visual V3: /mission, /admin, map, gauge (+ /mission layout fix) | F32 | Claude (agent) | in progress |
| [x] | Visual V4: /report, /leaderboard, /council, /oracle | F32 | Claude (agent) | |
| [ ] | Radio desk: walkie-talkie → speech-to-text → echoes | F31 | | hardware: walkie audio out → laptop mic in |

## Demo day
| Done | Task | Ref | Owner | Notes |
|:---:|---|---|---|---|
| [ ] | Cloudflare Tunnel (`cloudflared`) to the laptop, HTTPS URL for phones | §2 | colleague | in progress |
| [ ] | Real-phone pass over the tunnel (voice, camera, offline queue, 360px) | F15, F25, F26, F16 | | after the tunnel works |
| [ ] | Wire + level-test the walkie-talkie audio | F31 | | |
| [ ] | Check `claude -p` is logged in on the demo laptop | §10 | | |
| [ ] | Rehearse the 5-minute app-only demo twice | §9 | | |
