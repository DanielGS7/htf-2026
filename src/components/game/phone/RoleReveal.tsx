/**
 * @file Full-screen role card shown when a round starts (tap to dismiss, auto-closes after 7s) plus the
 * discreet role chip that lets the player peek at their role again. Defender = archer art; Desync = purple
 * voxel lightning + witch. Art stands on the bottom edge (docs/DESIGN.md).
 * @exports RoleReveal, RoleChip
 * @usedBy src/routes/report.tsx
 */
import { useEffect, useState } from 'react'
import type { PlayerRole } from '#/lib/game.ts'

export function RoleReveal({ role, onClose }: { role: PlayerRole; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 7000)
    return () => clearTimeout(t)
  }, [onClose])
  const desync = role === 'desync'
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Dismiss role card"
      className={`fixed inset-0 z-50 flex flex-col items-center overflow-hidden px-6 pt-[18vh] text-center ${desync ? 'bg-[#1b0b2b]' : 'bg-app'}`}
    >
      {desync && (
        <>
          <img
            src="/htf/lightning-left.avif"
            alt=""
            aria-hidden
            width={400}
            height={800}
            className="pointer-events-none absolute inset-y-0 left-0 h-full w-auto max-w-[45%] object-cover object-right opacity-90"
          />
          <img
            src="/htf/lightning-right.avif"
            alt=""
            aria-hidden
            width={400}
            height={800}
            className="pointer-events-none absolute inset-y-0 right-0 h-full w-auto max-w-[45%] object-cover object-left opacity-90"
          />
        </>
      )}
      <span className="label relative z-10">Your role this round</span>
      <span className="relative z-10 mt-3 font-display text-2xl font-semibold tracking-wide text-fg uppercase">You are</span>
      <span className={`relative z-10 font-gothic text-6xl leading-none ${desync ? 'text-magic-soft' : 'text-accent-ink'}`}>
        {desync ? 'THE DESYNC' : 'A DEFENDER'}
      </span>
      <span className="relative z-10 mt-5 max-w-xs text-lg font-semibold text-fg">
        {desync ? "Sabotage districts in secret. Don't get caught." : 'Report glitches, fix them, and find the Desync among the crew.'}
      </span>
      {desync && <span className="relative z-10 mt-3 max-w-xs text-sm text-muted">Hold your points tile for one second to open the console.</span>}
      <img
        src={desync ? '/htf/character-3.avif' : '/htf/character-4.avif'}
        alt=""
        aria-hidden
        width={420}
        height={560}
        className="pointer-events-none absolute bottom-0 left-1/2 z-10 h-[46vh] w-auto -translate-x-1/2 object-contain object-bottom"
      />
      <span className="label absolute bottom-4 z-20 rounded-sm bg-app/80 px-2 py-1">Tap to continue</span>
    </button>
  )
}

/** Tiny, low-contrast chip; tap to peek (shows for 2.5s) so a neighbour can't casually read it. */
export function RoleChip({ role }: { role: PlayerRole }) {
  const [peek, setPeek] = useState(false)
  useEffect(() => {
    if (!peek) return
    const t = setTimeout(() => setPeek(false), 2500)
    return () => clearTimeout(t)
  }, [peek])
  return (
    <button
      type="button"
      onClick={() => setPeek((p) => !p)}
      className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line px-3 text-xs font-semibold tracking-wider text-muted uppercase"
    >
      <span className="size-1.5 rotate-45 bg-muted" />
      {peek ? (
        <span className={role === 'desync' ? 'text-magic-soft' : 'text-accent-ink'}>{role === 'desync' ? 'You are the Desync' : 'You are a defender'}</span>
      ) : (
        'Role'
      )}
    </button>
  )
}
