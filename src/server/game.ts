/**
 * @file "Desync Protocol" game engine (F33). SERVER-ONLY. In-memory state on globalThis (single process).
 * STATUS: STUB with the final signatures. Implemented by work package G1 (see PRD.md F33 + TASKS.md).
 * @exports getPublicState, getPlayerView, listCrewCandidates, setup, start, stop, sabotage, listFixable,
 *   completeFix, callMeeting, castVote, isSabotaged, onSimulatorTick, onEchoMatchedHidden
 * @usedBy src/lib/game.functions.ts, src/server/simulator.ts, src/server/echo-pipeline.ts
 */
import type { DistrictId, GlitchType } from '#/lib/glitch.ts'
import { IDLE_GAME_STATE, type FixableGlitch, type MyGameView, type PublicGameState } from '#/lib/game.ts'

const NOT_YET = 'Game engine not implemented yet'

export function getPublicState(): PublicGameState {
  return IDLE_GAME_STATE
}

export async function getPlayerView(_guardianId: string): Promise<MyGameView> {
  return { role: null, isCrew: false, ejected: false, canCallMeeting: false, myVote: null, sabotageCooldownUntil: null, sabotages: [] }
}

export async function listCrewCandidates(): Promise<{ guardianId: string; codename: string; role: string }[]> {
  return []
}

export async function setup(_crewIds: string[], _roundMs: number): Promise<PublicGameState> {
  throw new Error(NOT_YET)
}

export async function start(): Promise<PublicGameState> {
  throw new Error(NOT_YET)
}

export async function stop(): Promise<PublicGameState> {
  return IDLE_GAME_STATE
}

export async function sabotage(_guardianId: string, _districtId: DistrictId, _type: GlitchType): Promise<MyGameView> {
  throw new Error(NOT_YET)
}

export async function listFixable(): Promise<FixableGlitch[]> {
  return []
}

export async function completeFix(_guardianId: string, _glitchId: string): Promise<{ ok: true; points: number }> {
  throw new Error(NOT_YET)
}

export async function callMeeting(_guardianId: string): Promise<PublicGameState> {
  throw new Error(NOT_YET)
}

export async function castVote(_guardianId: string, _suspectId: string): Promise<MyGameView> {
  throw new Error(NOT_YET)
}

/** For the simulator: is this district currently sabotaged (unfixed)? */
export function isSabotaged(_districtId: DistrictId): boolean {
  return false
}

/** Called by the simulator every tick (drains, round timer, win check). */
export async function onSimulatorTick(): Promise<void> {}

/** Called by the echo pipeline when an echo matched a hidden sabotage glitch (reveal + points). */
export async function onEchoMatchedHidden(_glitchId: string, _reporterId: string): Promise<void> {}
