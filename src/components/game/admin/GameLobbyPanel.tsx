/**
 * @file Commander panel "Desync Protocol" for /admin: pick the crew (checkboxes from listCrewCandidates,
 * pre-checked when there are exactly 3), choose the round length (2-8 min), "Set up crew" -> big
 * "Start round", and "End game". Shows the live phase, countdown and counters. Buttons only offer the
 * step that makes sense for the current phase, and ending a running game asks for a second click.
 * @exports GameLobbyPanel
 * @usedBy src/routes/admin.tsx
 */
import { useEffect, useState } from 'react'
import { Gamepad2, Play, Square, Users } from 'lucide-react'
import { Badge } from '#/components/ui/Badge.tsx'
import { Button } from '#/components/ui/Button.tsx'
import { useToast } from '#/components/ui/Toast.tsx'
import { gameSetup, gameStart, gameStop, listCrewCandidates } from '#/lib/game.functions.ts'
import { GAME_RULES, type GamePhase } from '#/lib/game.ts'
import { formatClock, useGameLive, useNow } from '#/components/game/projector/useGameLive.ts'

type Candidate = { guardianId: string; codename: string; role: string }

const PHASE_LABEL: Record<
  GamePhase,
  {
    text: string
    tone: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'magic'
  }
> = {
  idle: { text: 'No game', tone: 'neutral' },
  lobby: { text: 'Lobby: waiting for you', tone: 'warning' },
  playing: { text: 'Round running', tone: 'success' },
  meeting: { text: 'Emergency meeting', tone: 'danger' },
  ended: { text: 'Round over', tone: 'magic' },
}

export function GameLobbyPanel() {
  const toast = useToast()
  const { state: game } = useGameLive()
  const now = useNow(500)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [minutes, setMinutes] = useState(GAME_RULES.defaultRoundMs / 60_000)
  const [busy, setBusy] = useState<string | null>(null)
  const [confirmEnd, setConfirmEnd] = useState(false)

  useEffect(() => {
    let alive = true
    listCrewCandidates()
      .then((c) => {
        if (!alive) return
        setCandidates(c)
        if (c.length === 3) setPicked(new Set(c.map((x) => x.guardianId)))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key)
    try {
      await fn()
      if (ok) toast({ tone: 'success', message: ok })
    } catch (err) {
      toast({
        tone: 'danger',
        message: err instanceof Error ? err.message : 'Action failed',
      })
    } finally {
      setBusy(null)
      setConfirmEnd(false)
    }
  }

  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const phase = game.phase
  const label = PHASE_LABEL[phase]
  const left = game.roundEndsAt ? new Date(game.roundEndsAt).getTime() - now : game.roundMs
  const pickOk = picked.size >= 2 && picked.size <= 6

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={label.tone} className="text-sm!">
          {label.text}
        </Badge>
        {(phase === 'playing' || phase === 'meeting') && (
          <span className="font-display text-3xl font-black tabular-nums text-fg" role="timer" aria-label="Round time left">
            {formatClock(left)}
          </span>
        )}
        {phase !== 'idle' && (
          <span className="text-sm text-muted">
            hidden threats {game.hiddenSabotages} · discovered {game.discoveredSabotages} · fixed {game.fixedSabotages}
          </span>
        )}
      </div>

      {phase === 'idle' && (
        <div className="mt-4">
          <h3 className="label mb-2 flex items-center gap-2 text-fg!">
            <Users className="size-4" /> Crew (pick 2 to 6): the Desync is chosen at random from them
          </h3>
          {candidates.length === 0 ? (
            <p className="border border-line bg-subtle/60 p-3 text-sm text-muted">No teammates found yet. Sign the team accounts in first.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {candidates.map((c) => (
                <li key={c.guardianId}>
                  <label
                    className={`flex cursor-pointer items-center gap-3 border px-3 py-2 text-lg font-semibold ${picked.has(c.guardianId) ? 'border-accent bg-accent/10 text-fg' : 'border-line text-muted'}`}
                  >
                    <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={picked.has(c.guardianId)} onChange={() => toggle(c.guardianId)} />
                    {c.codename}
                  </label>
                </li>
              ))}
            </ul>
          )}
          <label className="mt-4 flex items-center gap-3 text-sm font-semibold text-fg">
            Round length
            <input
              type="range"
              min={2}
              max={8}
              step={1}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="w-48 accent-[var(--accent)]"
              aria-label="Round length in minutes"
            />
            <span className="font-display text-2xl font-bold tabular-nums">{minutes} min</span>
          </label>
          <Button
            size="lg"
            className="mt-4 w-full"
            disabled={busy !== null || !pickOk}
            onClick={() =>
              run(
                'setup',
                () =>
                  gameSetup({
                    data: { crewIds: [...picked], roundMinutes: minutes },
                  }),
                'Crew set. The big screen shows the lobby.',
              )
            }
          >
            <Gamepad2 className="size-5" /> Set up crew
          </Button>
          {!pickOk && candidates.length > 0 && <p className="mt-2 text-xs text-muted">Pick between 2 and 6 crew members.</p>}
        </div>
      )}

      {phase === 'lobby' && (
        <div className="mt-4">
          <p className="mb-2 text-sm text-muted">Crew locked in. Wait until the room has scanned the QR, then start.</p>
          <ul className="mb-4 flex flex-wrap gap-2">
            {game.crew.map((c) => (
              <li key={c.guardianId} className="border border-accent/50 bg-accent/10 px-3 py-1 text-lg font-semibold text-fg">
                {c.codename}
              </li>
            ))}
          </ul>
          <Button size="lg" className="h-16 w-full text-2xl" disabled={busy !== null} onClick={() => run('start', gameStart, 'Round started')}>
            <Play className="size-6" /> Start round
          </Button>
          <Button variant="ghost" className="mt-2 w-full" disabled={busy !== null} onClick={() => run('end', gameStop, 'Game ended')}>
            End game
          </Button>
        </div>
      )}

      {(phase === 'playing' || phase === 'meeting') && (
        <div className="mt-4">
          <ul className="mb-4 flex flex-wrap gap-2">
            {game.crew.map((c) => (
              <li
                key={c.guardianId}
                className={`border px-3 py-1 text-lg font-semibold ${c.ejected ? 'border-line text-muted line-through' : 'border-accent/50 bg-accent/10 text-fg'}`}
              >
                {c.codename}
              </li>
            ))}
          </ul>
          {confirmEnd ? (
            <div className="flex gap-2">
              <Button variant="danger" size="lg" className="flex-1" disabled={busy !== null} onClick={() => run('end', gameStop, 'Game ended')}>
                <Square className="size-4" /> Yes, end the game now
              </Button>
              <Button variant="ghost" onClick={() => setConfirmEnd(false)}>
                Keep playing
              </Button>
            </div>
          ) : (
            <Button variant="secondary" className="w-full" disabled={busy !== null} onClick={() => setConfirmEnd(true)}>
              End game
            </Button>
          )}
        </div>
      )}

      {phase === 'ended' && (
        <div className="mt-4">
          <p className="mb-3 text-lg text-fg">
            {game.winner === 'defenders' ? 'The defenders won.' : 'The Desync won.'} It was{' '}
            <strong className="text-magic-soft">{game.desyncCodename ?? 'unknown'}</strong>.
          </p>
          <Button variant="secondary" size="lg" className="w-full" disabled={busy !== null} onClick={() => run('end', gameStop, 'Game cleared')}>
            End game and clear the screen
          </Button>
        </div>
      )}
    </div>
  )
}
