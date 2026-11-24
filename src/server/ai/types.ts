/**
 * @file Contracts for the AI layer. Both implementations (claude.ts, heuristics.ts)
 * satisfy these; callers only use src/server/ai/index.ts.
 * @exports TriageInput, TriageResult, OpenGlitchSummary, RunbookInput, OracleInput
 */
import type { DistrictId, GlitchType, Severity } from '#/lib/glitch.ts'

export type OpenGlitchSummary = {
  glitchId: string
  description: string
  type: GlitchType
  districtId: DistrictId | null
  status: string
}

export type TriageInput = {
  description: string
  districtId: DistrictId | null
  /** Open (non-FIXED) glitches plus FIXED ones from the last 30 min (for reopen). */
  candidates: OpenGlitchSummary[]
}

export type TriageResult = {
  /** Moderation: false = junk/abusive/illegal -> echo stored as rejected, no glitch. */
  accept: boolean
  rejectReason: string | null
  /** Existing glitch this echo belongs to, or null to open a new glitch. */
  matchGlitchId: string | null
  /** True if the echo says the problem is resolved ("all good again"). */
  resolves: boolean
  type: GlitchType
  severity: Severity
  /** Best-guess district if the reporter didn't pick one. */
  districtId: DistrictId | null
  /** Short headline (max ~80 chars) for a NEW glitch. */
  title: string
}

export type RunbookInput = {
  description: string
  type: GlitchType
  districtName: string | null
  echoes: string[]
}

export type OracleInput = {
  question: string
  /** Compact JSON-ish text of the current situation (open glitches, magic level...). */
  context: string
}
