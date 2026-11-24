/**
 * @file The 3-second full-width "SABOTAGE DISCOVERED in <district>" moment on the projector, with the
 * reporter's codename, `.glitch` jitter and purple voxel lightning on both edges (behind the plate).
 * @exports DiscoveryBanner
 * @usedBy src/routes/mission.tsx
 */
import { Skull } from 'lucide-react'
import type { Discovery } from './useGameLive.ts'

export function DiscoveryBanner({ discovery }: { discovery: Discovery | null }) {
  if (!discovery) return null
  return (
    <div key={discovery.seq} className="pointer-events-none absolute inset-x-0 top-1/3 z-40 flex -translate-y-1/2 items-center" role="alert">
      <div className="glitch relative z-10 mx-6 flex w-full flex-col items-center gap-1 border-y-4 border-magic bg-app px-8 py-5 text-center shadow-[0_0_0_9999px_rgb(22_15_31/0.6)] [@media(max-height:800px)]:py-3">
        <div className="flex items-center gap-4">
          <Skull className="size-12 shrink-0 text-magic-soft [@media(max-height:800px)]:size-9" />
          <div className="font-display text-6xl leading-none font-black tracking-[0.12em] text-fg uppercase 2xl:text-7xl [@media(max-height:800px)]:text-4xl">
            Sabotage discovered
          </div>
        </div>
        <div className="font-display text-7xl leading-none font-black tracking-[0.08em] text-magic-soft uppercase 2xl:text-8xl [@media(max-height:800px)]:text-5xl">
          in {discovery.district}
        </div>
        {discovery.byCodename && (
          <div className="mt-1 font-display text-3xl font-bold tracking-wide text-fg uppercase [@media(max-height:800px)]:text-xl">
            Reported by {discovery.byCodename}
          </div>
        )}
      </div>
      <img
        src="/htf/lightning-left.avif"
        alt=""
        aria-hidden
        className="absolute top-1/2 left-0 z-20 h-[75vh] w-auto max-w-none -translate-y-1/2"
        style={{ maskImage: 'linear-gradient(to right, #000 40%, transparent)' }}
      />
      <img
        src="/htf/lightning-right.avif"
        alt=""
        aria-hidden
        className="absolute top-1/2 right-0 z-20 h-[75vh] w-auto max-w-none -translate-y-1/2"
        style={{ maskImage: 'linear-gradient(to left, #000 40%, transparent)' }}
      />
    </div>
  )
}
