/**
 * @file Commander-only controls on the glitch detail: advance status, status dropdown, assign defender
 * (with the suggested defender = fewest open assignments highlighted).
 * @exports CommanderPanel
 * @usedBy src/routes/glitches.$glitchId.tsx
 */
import { useEffect, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { ChevronsRight, Sparkles } from 'lucide-react'
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
  const suggested = defs?.defenders.find((d) => d.guardianId === defs.suggestedId)
  const field = 'rounded-lg border border-line bg-card px-2 py-1.5 text-sm text-fg'

  return (
    <section className="space-y-3 rounded-2xl border border-line p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Commander controls</h2>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || !next}
          onClick={() => next && void setStatus(next)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          <ChevronsRight className="size-4" />
          {next ? `Advance to ${next}` : 'Fixed'}
        </button>
        <select aria-label="Set status" disabled={busy} value={glitch.status} onChange={(e) => void setStatus(e.target.value as GlitchStatus)} className={field}>
          {GLITCH_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Assign defender" disabled={busy || !defs} value={glitch.assigneeId ?? ''} onChange={(e) => void assign(e.target.value || null)} className={field}>
          <option value="">Unassigned</option>
          {defs?.defenders.map((d) => (
            <option key={d.guardianId} value={d.guardianId}>
              {d.codename} ({d.openCount} open){d.guardianId === defs.suggestedId ? ' - suggested' : ''}
            </option>
          ))}
        </select>
        {suggested && glitch.assigneeId !== suggested.guardianId && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void assign(suggested.guardianId)}
            title="Fewest open assignments, then most fixes of this type"
            className="inline-flex items-center gap-1 rounded-lg border border-accent/50 px-2.5 py-1.5 text-sm text-accent hover:bg-accent/10"
          >
            <Sparkles className="size-3.5" /> Assign {suggested.codename}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </section>
  )
}
