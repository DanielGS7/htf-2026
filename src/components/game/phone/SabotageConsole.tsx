/**
 * @file Hidden sabotage console for the Desync: `useHoldGesture` (1s long-press with a subtle progress
 * bar, only active for the Desync) and the bottom sheet to pick a district + catastrophe, a cooldown ring
 * and the list of own sabotages with "discovered" marks.
 * @exports useHoldGesture, SabotageSheet
 * @usedBy src/routes/report.tsx
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { BatteryLow, CircleDashed, Droplets, Hourglass, HelpCircle, Radio, X, Zap, type LucideIcon } from 'lucide-react'
import { Button } from '#/components/ui/Button.tsx'
import { Badge } from '#/components/ui/Badge.tsx'
import { sabotage } from '#/lib/game.functions.ts'
import { GAME_RULES, type MyGameView } from '#/lib/game.ts'
import { DISTRICTS, GLITCH_TYPES, GLITCH_TYPE_META, type DistrictId, type GlitchType } from '#/lib/glitch.ts'
import { useCountdown } from './useCountdown.ts'

const ICONS: Record<string, LucideIcon> = {
  Hourglass,
  BatteryLow,
  CircleDashed,
  Radio,
  Droplets,
  Zap,
  HelpCircle,
}
const HOLD_MS = 1000

/**
 * Long-press gesture. Spread `bind` on the element; `progress` (0..1) drives a thin bar only the holder sees.
 * When `enabled` is false nothing happens or shows. `consumed()` tells a click handler the press was a hold.
 */
export function useHoldGesture(enabled: boolean, onOpen: () => void) {
  const [progress, setProgress] = useState(0)
  const raf = useRef(0)
  const start = useRef(0)
  const fired = useRef(false)
  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current)
    setProgress(0)
  }, [])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const bind = enabled
    ? {
        onPointerDown: () => {
          fired.current = false
          start.current = performance.now()
          const tick = () => {
            const p = Math.min(1, (performance.now() - start.current) / HOLD_MS)
            setProgress(p)
            if (p >= 1) {
              fired.current = true
              setProgress(0)
              onOpen()
              return
            }
            raf.current = requestAnimationFrame(tick)
          }
          raf.current = requestAnimationFrame(tick)
        },
        onPointerUp: stop,
        onPointerLeave: stop,
        onPointerCancel: stop,
        onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
      }
    : {}
  return {
    bind,
    progress: enabled ? progress : 0,
    consumed: () => fired.current,
  }
}

function CooldownRing({ until }: { until: string | null }) {
  const left = useCountdown(until)
  const frac = left / (GAME_RULES.sabotageCooldownMs / 1000)
  const r = 22
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 56 56" className="size-14 shrink-0 -rotate-90" aria-label={left > 0 ? `Cooldown ${left} seconds` : 'Ready'}>
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--line)" strokeWidth="5" />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        stroke="var(--magic)"
        strokeWidth="5"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(1, frac))}
        className="transition-[stroke-dashoffset]"
      />
      <text x="28" y="28" textAnchor="middle" dominantBaseline="central" transform="rotate(90 28 28)" className="fill-fg font-mono text-[15px] font-bold">
        {left > 0 ? left : 'OK'}
      </text>
    </svg>
  )
}

export function SabotageSheet({ view, onClose, onChanged }: { view: MyGameView; onClose: () => void; onChanged: () => void }) {
  const [district, setDistrict] = useState<DistrictId | null>(null)
  const [type, setType] = useState<GlitchType | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const left = useCountdown(view.sabotageCooldownUntil)
  const busyDistricts = new Set(view.sabotages.filter((s) => !s.discovered).map((s) => s.districtId))
  const can = district && type && left === 0 && !busy && !busyDistricts.has(district)

  async function go() {
    if (!district || !type) return
    setBusy(true)
    setError(null)
    try {
      await sabotage({ data: { districtId: district, type } })
      setDistrict(null)
      setType(null)
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sabotage failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Console"
        onClick={(e) => e.stopPropagation()}
        className="float-in max-h-[92dvh] w-full overflow-y-auto rounded-t-lg border-t-2 border-magic bg-[#1b0b2b] px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="label block text-magic-soft">The Desync</span>
            <h2 className="font-display text-2xl leading-tight font-bold">Sabotage console</h2>
          </div>
          <div className="flex items-center gap-2">
            <CooldownRing until={view.sabotageCooldownUntil} />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close console"
              className="grid size-11 place-items-center rounded-md border border-line text-fg"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <h3 className="label mt-4 mb-2">1. District</h3>
        <div className="grid grid-cols-2 gap-2">
          {DISTRICTS.map((d) => {
            const taken = busyDistricts.has(d.id)
            return (
              <button
                key={d.id}
                type="button"
                disabled={taken}
                aria-pressed={district === d.id}
                onClick={() => setDistrict(d.id)}
                className={`min-h-12 rounded-sm border px-2 text-left text-sm font-semibold disabled:opacity-40 ${district === d.id ? 'border-magic bg-magic/30 text-fg' : 'border-line bg-subtle text-fg'}`}
              >
                {d.name}
                {taken && <span className="label block">already hit</span>}
              </button>
            )
          })}
        </div>

        <h3 className="label mt-4 mb-2">2. Catastrophe</h3>
        <div className="grid grid-cols-2 gap-2">
          {GLITCH_TYPES.filter((t) => t !== 'UNKNOWN').map((t) => {
            const meta = GLITCH_TYPE_META[t]
            const Icon = ICONS[meta.icon] ?? HelpCircle
            return (
              <button
                key={t}
                type="button"
                aria-pressed={type === t}
                onClick={() => setType(t)}
                className={`flex min-h-12 items-center gap-2 rounded-sm border px-2 text-left text-sm font-semibold ${type === t ? 'border-magic bg-magic/30' : 'border-line bg-subtle'}`}
              >
                <Icon className="size-5 shrink-0" style={{ color: meta.color }} />
                {meta.label}
              </button>
            )
          })}
        </div>

        {error && <p className="mt-3 text-sm font-semibold text-danger">{error}</p>}
        <Button variant="danger" size="lg" className="mt-4 h-14 w-full text-lg" disabled={!can} onClick={go}>
          {left > 0 ? `Cooling down ${left}s` : busy ? 'Sending...' : 'Sabotage'}
        </Button>

        <h3 className="label mt-5 mb-2">Your sabotages</h3>
        {view.sabotages.length === 0 ? (
          <p className="pb-2 text-sm text-muted">None yet.</p>
        ) : (
          <ul className="flex flex-col gap-2 pb-2">
            {view.sabotages.map((s) => {
              const meta = GLITCH_TYPE_META[s.type]
              return (
                <li key={s.glitchId} className="flex items-center justify-between gap-2 rounded-sm border border-line bg-subtle px-3 py-2 text-sm">
                  <span className="min-w-0 font-semibold">
                    {meta.label}
                    <span className="block text-xs font-normal text-muted">{DISTRICTS.find((d) => d.id === s.districtId)?.name}</span>
                  </span>
                  <Badge tone={s.discovered ? 'danger' : 'magic'}>{s.discovered ? 'Discovered' : 'Hidden'}</Badge>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
