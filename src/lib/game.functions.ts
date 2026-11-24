/**
 * @file Server functions for the "Desync Protocol" game mode (F33). Thin, validated wrappers around
 * the engine in src/server/game.ts. Signatures are the contract for the phone (/report) and
 * projector/admin (/mission, /admin) UIs; keep them stable.
 * @exports getGameState, getMyGameView, gameSetup, gameStart, gameStop, sabotage, listFixable,
 *   completeFix, callMeeting, castVote, listCrewCandidates
 * @usedBy src/routes/report.tsx, src/routes/mission.tsx, src/routes/admin.tsx, src/components/game/**
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { DISTRICTS, GLITCH_TYPES } from '#/lib/glitch.ts'
import type { FixableGlitch, MyGameView, PublicGameState } from '#/lib/game.ts'
import { requireCommander, requireGuardian } from '#/server/auth.ts'
import * as engine from '#/server/game.ts'

const districtIds = DISTRICTS.map((d) => d.id) as [string, ...string[]]

/** Public state (anyone, also signed-out projector fallbacks). */
export const getGameState = createServerFn({ method: 'GET' }).handler(async (): Promise<PublicGameState> => engine.getPublicState())

/** The caller's private view: role, cooldowns, own sabotages (Desync only). */
export const getMyGameView = createServerFn({ method: 'GET' }).handler(async (): Promise<MyGameView> => {
  const me = await requireGuardian()
  return engine.getPlayerView(me.guardianId)
})

/** Commander: guardians that can be picked as crew (everyone with a password = the team). */
export const listCrewCandidates = createServerFn({ method: 'GET' }).handler(async () => {
  await requireCommander()
  return engine.listCrewCandidates()
})

/** Commander: choose the crew (2-6 teammates) and round length -> lobby. */
export const gameSetup = createServerFn({ method: 'POST' })
  .validator((d: unknown) =>
    z.object({ crewIds: z.array(z.string()).min(2).max(6), roundMinutes: z.number().min(1).max(15).default(4) }).parse(d),
  )
  .handler(async ({ data }): Promise<PublicGameState> => {
    await requireCommander()
    return engine.setup(data.crewIds, data.roundMinutes * 60_000)
  })

/** Commander: start the round (picks the Desync at random from the crew). */
export const gameStart = createServerFn({ method: 'POST' }).handler(async (): Promise<PublicGameState> => {
  await requireCommander()
  return engine.start()
})

/** Commander: abort / reset to idle. */
export const gameStop = createServerFn({ method: 'POST' }).handler(async (): Promise<PublicGameState> => {
  await requireCommander()
  return engine.stop()
})

/** Desync only: sabotage a district (silent; creates a hidden glitch). */
export const sabotage = createServerFn({ method: 'POST' })
  .validator((d: unknown) => z.object({ districtId: z.enum(districtIds), type: z.enum(GLITCH_TYPES) }).parse(d))
  .handler(async ({ data }): Promise<MyGameView> => {
    const me = await requireGuardian()
    return engine.sabotage(me.guardianId, data.districtId as (typeof DISTRICTS)[number]['id'], data.type)
  })

/** Discovered, unresolved glitches the caller can try to fix. */
export const listFixable = createServerFn({ method: 'GET' }).handler(async (): Promise<FixableGlitch[]> => {
  await requireGuardian()
  return engine.listFixable()
})

/** After the phone mini-task. A defender's fix resolves the glitch; the Desync's "fix" silently does nothing. */
export const completeFix = createServerFn({ method: 'POST' })
  .validator((d: unknown) => z.object({ glitchId: z.string().min(1) }).parse(d))
  .handler(async ({ data }): Promise<{ ok: true; points: number }> => {
    const me = await requireGuardian()
    return engine.completeFix(me.guardianId, data.glitchId)
  })

export const callMeeting = createServerFn({ method: 'POST' }).handler(async (): Promise<PublicGameState> => {
  const me = await requireGuardian()
  return engine.callMeeting(me.guardianId)
})

/** Vote for a crew member's guardianId, or 'skip'. One vote per player per meeting (re-voting replaces it). */
export const castVote = createServerFn({ method: 'POST' })
  .validator((d: unknown) => z.object({ suspectId: z.string().min(1) }).parse(d))
  .handler(async ({ data }): Promise<MyGameView> => {
    const me = await requireGuardian()
    return engine.castVote(me.guardianId, data.suspectId)
  })
