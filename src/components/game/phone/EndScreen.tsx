/**
 * @file End-of-round overlay for the phone: winner, the Desync revealed, the player's points.
 * @exports EndScreen
 * @usedBy src/routes/report.tsx
 */
import { Button } from '#/components/ui/Button.tsx'
import type { MyGameView, PublicGameState } from '#/lib/game.ts'

export function EndScreen({ state, view, score, onClose }: { state: PublicGameState; view: MyGameView | null; score: number; onClose: () => void }) {
  const defendersWon = state.winner === 'defenders'
  const iWon = view?.role ? (view.role === 'desync' ? !defendersWon : defendersWon) : defendersWon
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center overflow-hidden bg-app px-6 pt-[14vh] text-center">
      {!defendersWon && (
        <img
          src="/htf/lightning-right.avif"
          alt=""
          aria-hidden
          width={400}
          height={800}
          className="pointer-events-none absolute inset-y-0 right-0 h-full w-auto max-w-[45%] object-cover object-left opacity-80"
        />
      )}
      <span className="label relative z-10">Round over</span>
      <h1 className={`relative z-10 mt-2 font-gothic text-6xl leading-none ${defendersWon ? 'text-accent-ink' : 'text-magic-soft'}`}>
        {defendersWon ? 'ACHRONA HOLDS' : 'DESYNC WINS'}
      </h1>
      <p className="relative z-10 mt-3 text-lg font-semibold">
        {view?.role ? (iWon ? 'Your side won.' : 'Your side lost.') : defendersWon ? 'The defenders won.' : 'The Desync won.'}
      </p>
      {state.endReason && <p className="relative z-10 mt-1 max-w-xs text-sm text-muted">{state.endReason}</p>}

      <div className="glass hud relative z-10 mt-6 w-full max-w-xs rounded-lg px-4 py-3 text-left">
        <span className="label block">The Desync was</span>
        <span className="block font-display text-2xl leading-tight font-bold break-words text-magic-soft">{state.desyncCodename ?? 'unknown'}</span>
        <span className="label mt-3 block">Your points</span>
        <span className="block font-display text-5xl leading-none font-bold text-accent-ink tabular-nums">{score}</span>
      </div>

      <Button size="lg" className="relative z-10 mt-6 h-14 w-56" onClick={onClose}>
        Continue
      </Button>
      <img
        src={defendersWon ? '/htf/character-2.avif' : '/htf/character-3.avif'}
        alt=""
        aria-hidden
        width={420}
        height={560}
        className="pointer-events-none absolute bottom-0 left-1/2 h-[34vh] w-auto -translate-x-1/2 object-contain object-bottom"
      />
    </div>
  )
}
