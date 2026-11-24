/**
 * @file Shared types + constants for the "Desync Protocol" game mode (F33, Among Us-style).
 * Client + server safe (no imports with side effects). Engine: src/server/game.ts;
 * server fns: src/lib/game.functions.ts. Spec: PRD.md §5 F33.
 * @exports GamePhase, PlayerRole, CrewMember, MeetingResult, MeetingState, PublicGameState,
 *   ActiveSabotage, MyGameView, FixableGlitch, GAME_RULES, IDLE_GAME_STATE
 */
import type { DistrictId, GlitchType, Severity } from './glitch.ts'

/** idle = no game; lobby = crew chosen, not started; playing; meeting = vote in progress; ended. */
export type GamePhase = 'idle' | 'lobby' | 'playing' | 'meeting' | 'ended'

export type PlayerRole = 'defender' | 'desync'

/** A teammate in the crew: the only possible suspects. */
export type CrewMember = { guardianId: string; codename: string; ejected: boolean }

export type MeetingResult = {
  /** null = skipped / tie (nobody ejected). */
  ejectedId: string | null
  ejectedCodename: string | null
  /** Revealed with the ejection; null when nobody was ejected. */
  wasDesync: boolean | null
}

export type MeetingState = {
  calledById: string
  calledByCodename: string
  /** ISO time the vote closes. */
  endsAt: string
  /** Live tally: suspect guardianId (or 'skip') -> votes. Public: who voted for whom is NOT. */
  tally: Record<string, number>
  votesCast: number
  /** Set once the vote closed (shown for a few seconds before play resumes). */
  result: MeetingResult | null
}

/** Broadcast to everyone (LiveEvent `game.state`). Never contains secret roles while playing. */
export type PublicGameState = {
  phase: GamePhase
  crew: CrewMember[]
  roundMs: number
  /** ISO; null outside a round. While a meeting runs the round clock is paused (endsAt is pushed back). */
  roundEndsAt: string | null
  /** Hidden sabotages still undiscovered (count only, never where). */
  hiddenSabotages: number
  discoveredSabotages: number
  fixedSabotages: number
  meeting: MeetingState | null
  meetingsLeft: number
  winner: 'defenders' | 'desync' | null
  endReason: string | null
  /** Only filled once phase === 'ended'. */
  desyncId: string | null
  desyncCodename: string | null
}

/** A sabotage as the Desync sees it in their console. */
export type ActiveSabotage = {
  glitchId: string
  districtId: DistrictId
  type: GlitchType
  startedAt: string
  discovered: boolean
}

/** Private, per-player view (server fn `getMyGameView`). */
export type MyGameView = {
  /** null when no round is running or the player isn't signed in. */
  role: PlayerRole | null
  isCrew: boolean
  ejected: boolean
  canCallMeeting: boolean
  /** The player's vote in the current meeting (suspect id or 'skip'), null if not voted. */
  myVote: string | null
  /** Desync only. */
  sabotageCooldownUntil: string | null
  /** Desync only. */
  sabotages: ActiveSabotage[]
}

/** A discovered, unresolved glitch a player can try to fix with the phone mini-task. */
export type FixableGlitch = {
  glitchId: string
  description: string
  type: GlitchType
  severity: Severity
  districtId: DistrictId | null
  sabotage: boolean
}

export const GAME_RULES = {
  defaultRoundMs: 4 * 60_000,
  sabotageCooldownMs: 30_000,
  meetingMs: 30_000,
  /** How long the ejection reveal stays up before play resumes. */
  meetingResultMs: 6_000,
  meetingsPerRound: 3,
  meetingCooldownMs: 60_000,
  /** Magic drained per simulator tick (3s) from a district with an unfixed sabotage. */
  sabotageDrainPerTick: 6,
  points: { discover: 5, fix: 10 },
} as const

export const IDLE_GAME_STATE: PublicGameState = {
  phase: 'idle',
  crew: [],
  roundMs: GAME_RULES.defaultRoundMs,
  roundEndsAt: null,
  hiddenSabotages: 0,
  discoveredSabotages: 0,
  fixedSabotages: 0,
  meeting: null,
  meetingsLeft: GAME_RULES.meetingsPerRound,
  winner: null,
  endReason: null,
  desyncId: null,
  desyncCodename: null,
}
