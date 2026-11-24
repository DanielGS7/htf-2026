/**
 * @file Pure helpers for the radio desk: detect the end-of-transmission word ("over", "over and out"),
 * strip it, count words (squelch filter) and guess the district from the spoken text. No imports from
 * React or the browser so it can be unit-checked in Node.
 * @exports stripOver, wordCount, detectDistrict, MIN_WORDS
 * @usedBy src/lib/useRadio.ts
 */

/** Transmissions shorter than this are treated as squelch noise and dropped. */
export const MIN_WORDS = 3

const OVER_RE = /[\s,.!?;:-]*\bover(?:\s*(?:and|&)\s*out)?[\s.,!?;:-]*$/i

/** Strips a trailing "over" / "over." / "over and out". `ended` tells whether it was present. */
export function stripOver(text: string): { text: string; ended: boolean } {
  const t = text.trim()
  const m = OVER_RE.exec(t)
  if (!m) return { text: t, ended: false }
  return { text: t.slice(0, m.index).trim(), ended: true }
}

export function wordCount(text: string): number {
  const t = text.trim()
  return t ? t.split(/\s+/).length : 0
}

const DISTRICT_WORDS: ReadonlyArray<readonly [string, RegExp]> = [
  ['clocktower', /\bclock\s*tower\b|\bclocktower\b/i],
  ['archives', /\barchives?\b|\bvaults?\b/i],
  ['citadel', /\bcitadel\b|\bcrystal\b/i],
  ['harbor', /\bharbou?r\b|\bmistveil\b/i],
  ['market', /\b(?:rune\s+)?market\b/i],
  ['forest', /\bforest\b|\bwoods\b/i],
]

/** First district whose name appears in the text (by earliest position), or null. */
export function detectDistrict(text: string): string | null {
  let best: { id: string; at: number } | null = null
  for (const [id, re] of DISTRICT_WORDS) {
    const at = text.search(re)
    if (at >= 0 && (!best || at < best.at)) best = { id, at }
  }
  return best?.id ?? null
}
