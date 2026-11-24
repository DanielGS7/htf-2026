/**
 * @file Emergency meeting UI for the phone: `MeetingCallButton` (danger plate + confirm step) and
 * `VoteScreen` (full-screen vote: crew cards + Skip, own vote highlighted, countdown, votes cast;
 * after the vote closes it shows the ejection reveal; ejected players see a muted state and cannot vote).
 * @exports MeetingCallButton, VoteScreen
 * @usedBy src/routes/report.tsx
 */
import { useState } from 'react'
import { Check, Siren } from 'lucide-react'
import { Button } from '#/components/ui/Button.tsx'
import { callMeeting, castVote } from '#/lib/game.functions.ts'
import type { MyGameView, PublicGameState } from '#/lib/game.ts'
import { fmtClock, useCountdown } from './useCountdown.ts'

export function MeetingCallButton({ enabled, meetingsLeft, onDone }: { enabled: boolean; meetingsLeft: number; onDone: () => void }) {
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function call() {
    setBusy(true)
    setError(null)
    try {
      await callMeeting()
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not call a meeting')
    } finally {
      setBusy(false)
      setConfirm(false)
    }
  }
  return (
    <section aria-label="Emergency meeting">
      {confirm ? (
        <div className="glass flex flex-col gap-3 rounded-lg border-danger/60 p-4">
          <p className="text-lg font-semibold">Stop the round and vote on who the Desync is?</p>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" size="lg" className="h-14" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="lg" className="h-14" disabled={busy} onClick={call}>
              Call it
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="danger" size="lg" className="h-16 w-full text-lg" disabled={!enabled} onClick={() => setConfirm(true)}>
          <Siren className="size-6" />
          Emergency meeting
        </Button>
      )}
      <p className="mt-1.5 px-1 text-sm text-muted">
        {enabled
          ? `${meetingsLeft} meeting${meetingsLeft === 1 ? '' : 's'} left this round.`
          : meetingsLeft === 0
            ? 'No meetings left this round.'
            : 'Not available right now.'}
      </p>
      {error && <p className="mt-1 px-1 text-sm font-semibold text-danger">{error}</p>}
    </section>
  )
}

export function VoteScreen({ state, view, myId, onVoted }: { state: PublicGameState; view: MyGameView | null; myId: string | null; onVoted: () => void }) {
  const meeting = state.meeting
  const left = useCountdown(meeting?.endsAt ?? null)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  if (!meeting) return null
  const result = meeting.result
  const ejectedMe = view?.ejected ?? false
  const myVote = pending ?? view?.myVote ?? null

  async function vote(id: string) {
    if (ejectedMe || result) return
    setPending(id)
    setError(null)
    try {
      await castVote({ data: { suspectId: id } })
      onVoted()
    } catch (e) {
      setPending(null)
      setError(e instanceof Error ? e.message : 'Vote failed')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-app px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <header className="flex items-start justify-between gap-3">
        <div>
          <span className="label block text-danger">Emergency meeting</span>
          <h1 className="font-display text-2xl leading-tight font-bold">Who is the Desync?</h1>
          <span className="text-sm text-muted">Called by {meeting.calledByCodename}</span>
        </div>
        {!result && (
          <span className={`font-display text-5xl leading-none font-bold tabular-nums ${left <= 10 ? 'text-danger' : 'text-fg'}`}>{fmtClock(left)}</span>
        )}
      </header>

      {result ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <span className="label">The vote is in</span>
          {result.ejectedId === null ? (
            <h2 className="font-display text-4xl leading-tight font-bold">Nobody was ejected</h2>
          ) : (
            <>
              <h2 className="font-display text-4xl leading-tight font-bold break-words">{result.ejectedCodename}</h2>
              <span
                className={`float-in rounded-sm border-2 px-4 py-2 font-display text-2xl font-bold uppercase ${result.wasDesync ? 'border-success bg-success/15 text-success' : 'border-danger bg-danger/15 text-danger'}`}
              >
                {result.wasDesync ? 'was the Desync!' : 'was not the Desync'}
              </span>
              <p className="max-w-xs text-fg">{result.wasDesync ? 'The defenders win.' : 'The Desync is still among you.'}</p>
            </>
          )}
        </div>
      ) : ejectedMe ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted">
          <h2 className="font-display text-3xl font-bold">You were ejected</h2>
          <p>You can watch, but not vote.</p>
          <p className="label mt-3">{meeting.votesCast} voted</p>
        </div>
      ) : (
        <>
          <ul className="mt-4 flex flex-col gap-2.5">
            {state.crew.map((c) => {
              const mine = c.guardianId === myId
              const selected = myVote === c.guardianId
              return (
                <li key={c.guardianId}>
                  <button
                    type="button"
                    disabled={c.ejected || mine}
                    onClick={() => vote(c.guardianId)}
                    aria-pressed={selected}
                    className={`flex min-h-16 w-full items-center justify-between gap-3 rounded-md border-2 px-4 py-3 text-left disabled:opacity-40 ${selected ? 'border-accent bg-accent/20' : 'border-line bg-card-strong'}`}
                  >
                    <span className="min-w-0">
                      <span className="block font-display text-xl leading-tight font-bold break-words">{c.codename}</span>
                      {(mine || c.ejected) && <span className="label">{c.ejected ? 'ejected' : 'you'}</span>}
                    </span>
                    {selected && <Check className="size-7 shrink-0 text-accent-ink" />}
                  </button>
                </li>
              )
            })}
            <li>
              <button
                type="button"
                onClick={() => vote('skip')}
                aria-pressed={myVote === 'skip'}
                className={`flex min-h-16 w-full items-center justify-between gap-3 rounded-md border-2 px-4 py-3 text-left ${myVote === 'skip' ? 'border-accent bg-accent/20' : 'border-line bg-subtle'}`}
              >
                <span className="font-display text-xl font-bold uppercase">Skip</span>
                {myVote === 'skip' && <Check className="size-7 shrink-0 text-accent-ink" />}
              </button>
            </li>
          </ul>
          {error && <p className="mt-2 text-sm font-semibold text-danger">{error}</p>}
          <p className="label mt-4 text-center">
            {meeting.votesCast} {meeting.votesCast === 1 ? 'vote' : 'votes'} cast
          </p>
        </>
      )}
    </div>
  )
}
