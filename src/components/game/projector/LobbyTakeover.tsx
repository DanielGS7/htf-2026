/**
 * @file Projector lobby (phase lobby): "Desync Protocol" title moment, the prominent join QR, the crew
 * listed as suspects and "Waiting for the commander". Replaces the mission grid.
 * @exports LobbyTakeover
 * @usedBy src/routes/mission.tsx
 */
import { Users } from 'lucide-react'
import { JoinQr } from '#/components/mission/JoinQr.tsx'
import type { PublicGameState } from '#/lib/game.ts'

export function LobbyTakeover({ game, host, guardianCount, qrSize }: { game: PublicGameState; host?: string; guardianCount: number; qrSize: number }) {
  return (
    <main className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-6 py-4 text-center [@media(max-height:800px)]:gap-3">
      <div className="label text-base!">Round of {Math.round(game.roundMs / 60_000)} minutes</div>
      <h2 className="font-gothic text-8xl leading-none text-fg 2xl:text-9xl [@media(max-height:800px)]:text-7xl">Desync Protocol</h2>
      <div className="flex flex-wrap items-center justify-center gap-10 [@media(max-height:800px)]:gap-6">
        <div className="glass hud flex flex-col items-center gap-3 rounded-md p-5 [@media(max-height:800px)]:p-3">
          <p className="font-display text-5xl leading-none font-black tracking-wide text-fg uppercase [@media(max-height:800px)]:text-3xl">Join now</p>
          <JoinQr base={host} size={qrSize} showUrl={false} />
          <p className="flex items-center gap-2 text-2xl text-accent-ink">
            <Users className="size-6" />
            <span className="font-display text-4xl font-bold tabular-nums">{guardianCount}</span> guardians
          </p>
        </div>
        <div className="glass min-w-[20rem] rounded-md p-5 text-left [@media(max-height:800px)]:p-3">
          <h3 className="label mb-3 text-base!">One of this crew is the Desync</h3>
          <ul className="grid gap-2">
            {game.crew.map((c) => (
              <li
                key={c.guardianId}
                className="border border-magic/50 bg-magic/10 px-5 py-2 font-display text-4xl leading-tight font-bold tracking-wide text-fg uppercase [@media(max-height:800px)]:py-1 [@media(max-height:800px)]:text-2xl"
              >
                {c.codename}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="font-display text-4xl font-bold tracking-[0.2em] text-muted uppercase [@media(max-height:800px)]:text-2xl">
        Waiting for the commander<span className="animate-pulse">...</span>
      </p>
    </main>
  )
}
