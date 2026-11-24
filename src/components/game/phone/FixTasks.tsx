/**
 * @file "Fix a glitch" section for /report during a round: lists `listFixable()` and runs the ~5s
 * mini-task (hold a button while a rune ring fills 2.5s, then tap 3 runes in the shown order) before
 * calling `completeFix`. The Desync sees identical UI and a "+10" success (no points are awarded server-side).
 * @exports FixTasks
 * @usedBy src/routes/report.tsx
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Flame, Gem, Moon, Snowflake, Star, Sun, X, type LucideIcon } from 'lucide-react'
import { Button } from '#/components/ui/Button.tsx'
import { GlitchTypeIcon } from '#/components/glitches/badges.tsx'
import { completeFix, listFixable } from '#/lib/game.functions.ts'
import { GAME_RULES, type FixableGlitch } from '#/lib/game.ts'
import { DISTRICTS } from '#/lib/glitch.ts'
import { useLiveEvents } from '#/lib/useLiveEvents.ts'

const HOLD_MS = 2500
const RUNES: { Icon: LucideIcon; name: string }[] = [
  { Icon: Flame, name: 'Flame' },
  { Icon: Moon, name: 'Moon' },
  { Icon: Sun, name: 'Sun' },
  { Icon: Star, name: 'Star' },
  { Icon: Snowflake, name: 'Frost' },
  { Icon: Gem, name: 'Gem' },
]

function pickSequence(): number[] {
  const idx = RUNES.map((_, i) => i)
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j]!, idx[i]!]
  }
  return idx.slice(0, 3)
}

const buzz = (p: number | number[]) => {
  try {
    navigator.vibrate?.(p)
  } catch {
    /* ignore */
  }
}

type Stage = 'hold' | 'runes' | 'sending' | 'done' | 'error'

function MiniTask({ glitch, onClose, onFixed }: { glitch: FixableGlitch; onClose: () => void; onFixed: () => void }) {
  const [stage, setStage] = useState<Stage>('hold')
  const [progress, setProgress] = useState(0)
  const [seq] = useState(pickSequence)
  const [step, setStep] = useState(0)
  const [wrong, setWrong] = useState<number | null>(null)
  const [points, setPoints] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const raf = useRef(0)
  const t0 = useRef(0)
  const holding = useRef(false)

  const release = useCallback(() => {
    holding.current = false
    cancelAnimationFrame(raf.current)
    setProgress(0)
  }, [])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  function press() {
    if (stage !== 'hold') return
    holding.current = true
    t0.current = performance.now()
    const tick = () => {
      if (!holding.current) return
      const p = Math.min(1, (performance.now() - t0.current) / HOLD_MS)
      setProgress(p)
      if (p >= 1) {
        holding.current = false
        buzz(40)
        setStage('runes')
        return
      }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }

  async function finish() {
    setStage('sending')
    try {
      const r = await completeFix({ data: { glitchId: glitch.glitchId } })
      // The Desync's fix awards nothing; show the same "+10" so the fake is convincing.
      setPoints(r.points > 0 ? r.points : GAME_RULES.points.fix)
      buzz([30, 40, 30])
      setStage('done')
      onFixed()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not complete the fix')
      setStage('error')
    }
  }

  function tapRune(i: number) {
    if (stage !== 'runes') return
    if (i === seq[step]) {
      buzz(15)
      if (step + 1 === seq.length) {
        setStep(step + 1)
        void finish()
      } else setStep(step + 1)
    } else {
      buzz(120)
      setWrong(i)
      setStep(0)
      setTimeout(() => setWrong(null), 350)
    }
  }

  const r = 70
  const c = 2 * Math.PI * r
  const district = DISTRICTS.find((d) => d.id === glitch.districtId)?.name

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-app px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-label="Fix glitch"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="label block">{district ?? 'Achrona'} · fix</span>
          <h2 className="font-display text-xl leading-tight font-bold break-words">{glitch.description}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cancel fix"
          className="grid size-11 shrink-0 place-items-center rounded-md border border-line text-fg"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        {stage === 'hold' && (
          <>
            <p className="text-center text-lg font-semibold">Hold the rune and channel the fix</p>
            <button
              type="button"
              onPointerDown={press}
              onPointerUp={release}
              onPointerLeave={release}
              onPointerCancel={release}
              onContextMenu={(e) => e.preventDefault()}
              aria-label="Hold to channel"
              className="relative grid size-56 touch-none place-items-center select-none"
            >
              <svg viewBox="0 0 160 160" className="absolute inset-0 -rotate-90">
                <circle cx="80" cy="80" r={r} fill="none" stroke="var(--line)" strokeWidth="10" />
                <circle
                  cx="80"
                  cy="80"
                  r={r}
                  fill="none"
                  stroke="var(--magic-soft)"
                  strokeWidth="10"
                  strokeLinecap="butt"
                  strokeDasharray={c}
                  strokeDashoffset={c * (1 - progress)}
                />
              </svg>
              <span
                className={`grid size-36 place-items-center rounded-full border-2 ${progress > 0 ? 'border-magic-soft bg-magic/30' : 'border-accent bg-accent/15'}`}
              >
                <Star className="size-14 text-fg" />
              </span>
            </button>
            <span className="label">{progress > 0 ? 'Keep holding' : 'Press and hold'}</span>
          </>
        )}

        {(stage === 'runes' || stage === 'sending') && (
          <>
            <p className="text-center text-lg font-semibold">Tap the runes in this order</p>
            <div className="flex items-center gap-3">
              {seq.map((ri, k) => {
                const { Icon } = RUNES[ri]!
                return (
                  <span
                    key={k}
                    className={`grid size-16 place-items-center rounded-sm border-2 ${k < step ? 'border-success bg-success/20 text-success' : k === step ? 'border-accent bg-accent/15 text-fg' : 'border-line text-muted'}`}
                  >
                    <Icon className="size-8" />
                  </span>
                )
              })}
            </div>
            <div className="grid w-full max-w-xs grid-cols-3 gap-3">
              {RUNES.map(({ Icon, name }, i) => (
                <button
                  key={name}
                  type="button"
                  aria-label={name}
                  disabled={stage === 'sending'}
                  onClick={() => tapRune(i)}
                  className={`grid aspect-square place-items-center rounded-md border-2 bg-card-strong ${wrong === i ? 'glitch border-danger text-danger' : 'border-line text-fg active:border-accent'}`}
                >
                  <Icon className="size-10" />
                </button>
              ))}
            </div>
          </>
        )}

        {stage === 'done' && (
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="float-in grid size-24 place-items-center rounded-full border-2 border-success bg-success/20 text-success">
              <Check className="size-12" />
            </span>
            <span className="float-in font-display text-7xl leading-none font-bold text-success tabular-nums">+{points}</span>
            <span className="text-lg font-semibold">Glitch fixed</span>
            <Button size="lg" className="mt-3 h-14 w-56" onClick={onClose}>
              Back
            </Button>
          </div>
        )}

        {stage === 'error' && (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-lg font-semibold text-danger">{error}</p>
            <Button variant="secondary" size="lg" onClick={onClose}>
              Back
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export function FixTasks({ onPoints }: { onPoints?: () => void }) {
  const [items, setItems] = useState<FixableGlitch[]>([])
  const [active, setActive] = useState<FixableGlitch | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const load = useCallback(async () => {
    try {
      setItems(await listFixable())
    } catch {
      /* keep list */
    }
  }, [])
  useEffect(() => {
    void load()
    return () => clearTimeout(timer.current)
  }, [load])
  useLiveEvents((e) => {
    if (e.type === 'glitch.created' || e.type === 'glitch.updated' || e.type === 'game.discovered' || e.type === 'game.state') {
      clearTimeout(timer.current)
      timer.current = setTimeout(() => void load(), 300)
    }
  })

  if (items.length === 0 && !active) return null
  return (
    <section aria-labelledby="fix-title">
      <h2 id="fix-title" className="label mb-2 px-1">
        Fix a glitch
      </h2>
      <ul className="flex flex-col gap-2">
        {items.map((g) => (
          <li key={g.glitchId}>
            <button
              type="button"
              onClick={() => setActive(g)}
              className="glass flex min-h-16 w-full items-center gap-3 rounded-md px-3 py-2 text-left active:border-accent"
            >
              <GlitchTypeIcon type={g.type} className="size-7 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-base leading-snug font-semibold break-words">{g.description}</span>
                <span className="label">{DISTRICTS.find((d) => d.id === g.districtId)?.name ?? 'Achrona'}</span>
              </span>
              <span className="shrink-0 rounded-sm bg-accent px-2.5 py-2 text-xs font-bold tracking-wider text-on-accent uppercase">Fix</span>
            </button>
          </li>
        ))}
      </ul>
      {active && (
        <MiniTask
          glitch={active}
          onClose={() => {
            setActive(null)
            void load()
          }}
          onFixed={() => {
            onPoints?.()
            void load()
          }}
        />
      )}
    </section>
  )
}
