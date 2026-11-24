/**
 * @file Commander-only controls on the glitch detail: advance status, status dropdown, assign defender
 * (with the suggested defender = fewest open assignments highlighted).
 * @exports CommanderPanel
 * @usedBy src/routes/glitches.$glitchId.tsx
 */
import { useEffect, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { ChevronsRight } from 'lucide-react'
import { AssigneeSuggestion } from '#/components/ai/AssigneeSuggestion.tsx'
import { Button } from '#/components/ui/Button.tsx'
import { assignGlitch, listDefenders, setGlitchStatus, type DefenderOption } from '#/lib/glitches.functions.ts'
import { GLITCH_STATUSES, nextStatus, type Glitch, type GlitchStatus } from '#/lib/glitch.ts'

export function CommanderPanel({ glitch }: { glitch: Glitch }) {
  const router = useRouter()
  const [defs, setDefs] = useState<{ defenders: DefenderOption[]; suggestedId: string | null } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const next = nextStatus(glitch.status)

  useEffect(() => {
    void listDefenders({ data: { glitchId: glitch.glitchId } }).then(setDefs)
  }, [glitch.glitchId, glitch.assigneeId, glitch.status])

  async function run(fn: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await router.invalidate()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }
  const setStatus = (status: GlitchStatus) => run(() => setGlitchStatus({ data: { glitchId: glitch.glitchId, status } }))
  const assign = (assigneeId: string | null) => run(() => assignGlitch({ data: { glitchId: glitch.glitchId, assigneeId } }))
  const field = 'w-full rounded-md border border-line bg-app px-2.5 py-2 text-sm text-fg outline-none focus:border-accent disabled:opacity-60'

  return (
    <section className="glass hud space-y-4 rounded-lg p-4">
      <h2 className="font-display text-sm font-semibold tracking-wide uppercase text-fg">Commander controls</h2>

      <div className="space-y-2">
        <p className="label">Status</p>
        <Button className="w-full" disabled={busy || !next} onClick={() => next && void setStatus(next)}>
          <ChevronsRight className="size-4" />
          {next ? `Advance to ${next}` : 'Fixed'}
        </Button>
        <select aria-label="Set status" disabled={busy} value={glitch.status} onChange={(e) => void setStatus(e.target.value as GlitchStatus)} className={field}>
          {GLITCH_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2 border-t border-line pt-3">
        <p className="label">Defender</p>
        <select aria-label="Assign defender" disabled={busy || !defs} value={glitch.assigneeId ?? ''} onChange={(e) => void assign(e.target.value || null)} className={field}>
          <option value="">Unassigned</option>
          {defs?.defenders.map((d) => (
            <option key={d.guardianId} value={d.guardianId}>
              {d.codename} ({d.openCount} open){d.guardianId === defs.suggestedId ? ' - suggested' : ''}
            </option>
          ))}
        </select>
        <AssigneeSuggestion glitchId={glitch.glitchId} onPick={(id) => void assign(id)} />
      </div>
      {error && <p className="text-danger">{error}</p>}
    </section>
  )
}
