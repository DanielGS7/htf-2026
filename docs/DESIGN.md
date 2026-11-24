# Design brief: Achrona Mission Control

> Read this before touching any UI. The look is derived from the **official Hack The Future 2026
> "The Curse of Achrona" branding** (https://www.2026.hackthefuture.be/), with patterns borrowed from
> the `gothic`, `sci-fi-hud` and `pixel` specs of chrismccoy/claude-design-styles.
> Goal for a 5-minute live demo on a projector: **flashy, but instantly readable and obvious to use.**

## 1. The idea in one line
A medieval-fantasy war room running on glitching tech: **extruded blue blackletter titles, plum-black
panels with HUD brackets, purple voxel lightning for the Desync, and the HTF painted characters.**

## 2. Anti-slop rules (non-negotiable)
These are what make a UI look AI-generated. Don't:
- No frosted glass / `backdrop-blur` panels, no soft gradient blobs or orbs, no random glows.
- No violet-to-cyan gradient text. The only special text treatment is `.font-gothic` (titles).
- No `rounded-3xl` bubbles, no pill-everything. Corners are tight (the theme already shrinks radii).
- No emoji, no "✨ sparkles" icons as decoration, no generic stock hero copy ("Unleash...", "Seamless...").
- No more than **one** blackletter title per screen (plus at most one hero moment like a victory banner).
- No grey-on-grey low-contrast text. Body text is `text-fg`; secondary is `text-muted`, never smaller than 12px.
- Don't decorate every card. Brackets (`.hud`) go on the 1-3 most important panels per screen.

Do: commit to the theme, keep layouts calm and aligned, let the art and the data be the stars.

## 3. Tokens (already in `src/styles.css`, use the Tailwind names)
| Token | Dark (default) | Use |
|---|---|---|
| `app` | `#160f1f` | page background (HTF "dark grey") |
| `panel` / `card` / `card-strong` | `#1c1428` / `#20172e` / `#2a1f3c` | surfaces, step up for nesting |
| `line` | `#3a2d50` | borders, dividers |
| `fg` | `#e1e7ff` | text (HTF "light blue") |
| `muted` | `#a3a1bb` | secondary text |
| `accent` | `#4a7dff` | interactive, links, focus, primary buttons (brand `#004fe2` in gradients) |
| `magic` / `magic-soft` | `#a52bd9` / `#e292f4` | the Desync, glitches, lightning, voxel cubes |
| `warning` | `#f48d30` | HTF orange: high severity, time loops |
| `danger` | `#ff5a3c` | critical, lockdown, errors |
| `success` | `#3ccfb4` | fixed, healthy, online |

Light theme = parchment (`#ece3cf`) with ink text; lockdown = orange-red accent + red-tinted surfaces.
Never hard-code colours that exist as tokens. Glitch type colours: `GLITCH_TYPE_META` in `src/lib/glitch.ts`.

**Severity scale (use everywhere):** low = `muted`, medium = `accent`, high = `warning`, critical = `danger` + pulse.
**Status scale:** LEAKED = `danger`, ASSESSING = `warning`, CONTAINING = `accent`, FIXED = `success`.

## 4. Typography
| Role | Font | Rule |
|---|---|---|
| Page title / hero | `font-gothic` (Grenze Gotisch 900, extruded) | via `<PageHeader title>`; ≥ 40px; one per screen |
| UI, headings, numbers | `font-display` / default (Saira, 92% width) | section headings `uppercase tracking-wide font-semibold` |
| Big numbers | `font-display font-bold tabular-nums` | gauges, counts, scores; large and confident |
| Labels / readouts | `.label` (JetBrains Mono, 11px, uppercase, tracked) | small label above a value |
| IDs, codes | `font-mono` | `GL-0142`, timestamps |

## 5. Building blocks
- `<PageHeader label title subtitle actions>` (`src/components/ui/PageHeader.tsx`): every signed-in page starts with it.
- `.glass`: the standard solid panel (name kept for history; it is no longer glass).
- `.hud`: add to a `.glass` panel for corner targeting brackets. Key panels only.
- `.label`: HUD readout label. Pattern: `.label` on top, big value below.
- `.ornament`: divider line with a centre element, e.g. `<div className="ornament"><span className="size-1.5 rotate-45 bg-magic" /></div>`.
- `.glitch-cubes`: three purple voxel cubes breaking off the top-right corner; use on glitch markers/new items.
- `.glitch`: short stepped jitter with a purple/blue split; for newly arrived or critical items.
- `<Button variant>`: chunky plate buttons, uppercase. `danger` is the HTF orange-red plate.
- Lockdown: `[data-lockdown="true"]` on `<html>` re-tints everything automatically.

## 6. Art assets (`public/htf/`, from the HTF 2026 site; transparent backgrounds)
| File | What | Good for |
|---|---|---|
| `curse-of-achrona.avif` | official title art | login/join, mission header |
| `curse-of-achrona-lightning.avif` | title art with lightning (not transparent, plum bg) | victory / splash |
| `htf-logo.svg` | HACK THE FUTURE wordmark (light) | small branding |
| `lightning-left.avif`, `lightning-right.avif` | purple voxel lightning, tall | screen edges during attacks, backdrops |
| `banner-blue.avif`, `banner-orange.avif` | hanging cloth banners | leaderboard podium, rank flags |
| `scroll.avif` | parchment scroll banner | council report header, outcome titles |
| `character-1.avif` | orc knight (spear) | commander / authority |
| `character-2.avif` | lion warrior (sword) | fixers, victory |
| `character-3.avif` | witch (red hat) | magic, Oracle side panel |
| `character-4.avif` | robot archer | defenders, field reports |
| `character-5.avif` / `oracle-orb.png` | the eye-orb drone | the Oracle, AI, brand mark |
| `cursor-32.png` | eye-orb cursor (32px) | optional custom cursor on /mission |

**The character art fades out at the bottom** (the files are "FadeArtboard"s). Always stand a character
**on a bottom edge**: the bottom of the screen, or the bottom of a panel with `overflow-hidden`, ideally
partly **behind** a container (lower z-index) so it peeks out. Never float one mid-page or use it as an icon.
Use characters as **accents** (empty states, a corner of a hero panel, the podium), never as wallpaper,
and never over data. `alt=""` + `aria-hidden` when decorative. Use `<img>` with explicit width/height
classes; they're large files, so keep them to 1-2 per screen.

## 7. Projector + phone readability
- `/mission` is read from the back of a room: key numbers ≥ 48px, labels ≥ 14px, max 4 panels of focus.
- `/report` is used by first-time users on phones: one primary action, 44px+ touch targets, no hover-only UI.
- Contrast: text on surfaces ≥ 4.5:1. Don't put text on the art.
- Motion: purposeful only (new item, attack, lockdown). Respect `prefers-reduced-motion` (already global).
