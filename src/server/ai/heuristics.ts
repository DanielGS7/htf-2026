/**
 * @file Offline fallback for the AI layer: keyword rules, no network.
 * Used when ANTHROPIC_API_KEY is missing, the call fails or times out.
 * @exports triageHeuristic, runbookHeuristic, oracleHeuristic, assigneeHeuristic
 */
import { DISTRICTS, type GlitchType, type Severity } from '#/lib/glitch.ts'
import type { AssigneeInput, AssigneeResult, OracleInput, RunbookInput, TriageInput, TriageResult } from './types.ts'

const TYPE_KEYWORDS: [GlitchType, RegExp][] = [
  ['TIME_LOOP', /\b(loop|repeat|again and again|déjà|deja|clock|time)\b/i],
  ['MAGIC_DRAIN', /\b(magic|mana|drain|reserve|energy|power)\b/i],
  ['PORTAL_FLICKER', /\b(portal|flicker|gate|door|teleport)\b/i],
  ['ECHO_STORM', /\b(echo|duplicate|signal|noise|storm)\b/i],
  ['MEMORY_LEAK', /\b(memory|forget|leak|lost)\b/i],
  ['REALITY_TEAR', /\b(tear|rift|crack|void|collapse|reality)\b/i],
]
const RESOLVED = /\b(fixed|resolved|back to normal|all good|in orde|opgelost|stable again)\b/i
const JUNK = /^(.)\1{4,}$|^(test|asdf|lol|hi|hello)$|^[^a-z]*$|^[^aeiouy\s]{5,}$/i
const CRITICAL = /\b(collapse|everyone|massive|critical|help|urgent|dying)\b/i

function words(s: string): Set<string> {
  return new Set(s.toLowerCase().split(/\W+/).filter((w) => w.length > 3))
}

export function triageHeuristic(input: TriageInput): TriageResult {
  const text = input.description.trim()
  if (text.length < 4 || JUNK.test(text)) {
    return {
      accept: false,
      rejectReason: 'Too short or not a real report',
      matchGlitchId: null,
      resolves: false,
      type: 'UNKNOWN',
      severity: 'low',
      districtId: input.districtId,
      title: text,
    }
  }
  const type = TYPE_KEYWORDS.find(([, re]) => re.test(text))?.[0] ?? 'UNKNOWN'
  const districtId =
    input.districtId ??
    DISTRICTS.find((d) => text.toLowerCase().includes(d.name.split(' ').at(-1)!.toLowerCase()))?.id ??
    null
  // Same district + same type, or strong word overlap -> same glitch.
  const w = words(text)
  let best: { id: string; score: number } | null = null
  for (const c of input.candidates) {
    let score = 0
    if (c.type === type && type !== 'UNKNOWN') score += 2
    if (districtId && c.districtId === districtId) score += 2
    const cw = words(c.description)
    for (const x of w) if (cw.has(x)) score += 1
    if (score >= 3 && (!best || score > best.score)) best = { id: c.glitchId, score }
  }
  const severity: Severity = CRITICAL.test(text) ? 'critical' : type === 'REALITY_TEAR' ? 'high' : 'medium'
  return {
    accept: true,
    rejectReason: null,
    matchGlitchId: best?.id ?? null,
    resolves: RESOLVED.test(text),
    type,
    severity,
    districtId,
    title: text.length > 80 ? `${text.slice(0, 77)}...` : text,
  }
}

export function runbookHeuristic(input: RunbookInput): string {
  return [
    `## Runbook: ${input.description}`,
    '',
    `1. Secure the area${input.districtName ? ` around **${input.districtName}**` : ''} and keep civilians away.`,
    '2. Deploy a sensor sweep and confirm the anomaly is still active.',
    '3. Stabilise the local ley lines with a containment ward.',
    '4. Report progress as an echo every 10 minutes.',
    '5. When readings are back above 90%, mark the glitch as FIXED.',
  ].join('\n')
}

export function oracleHeuristic(input: OracleInput): string {
  return `The Oracle is offline (no AI connection). Current situation:\n\n${input.context}`
}

/** Fewest open assignments wins; ties go to the most experienced with this glitch type. */
export function assigneeHeuristic(input: AssigneeInput): AssigneeResult {
  const best = [...input.candidates].sort(
    (a, b) => a.openCount - b.openCount || b.fixedOfType - a.fixedOfType || a.codename.localeCompare(b.codename),
  )[0]
  if (!best) return { guardianId: null, reason: 'No defenders available.' }
  return {
    guardianId: best.guardianId,
    reason: `${best.codename} has the lightest load (${best.openCount} open)${best.fixedOfType ? ` and fixed ${best.fixedOfType} similar glitch(es)` : ''}.`,
  }
}
