/**
 * @file Runbook section of the glitch detail page: renders the saved Markdown runbook and lets
 * a commander generate or regenerate it (server fn saves it and broadcasts glitch.updated).
 * @exports RunbookPanel
 * @usedBy src/routes/glitches.$glitchId.tsx
 */
import { useEffect, useState } from 'react'
import { BookOpen, RefreshCw, Sparkles } from 'lucide-react'
import type { Glitch } from '#/lib/glitch.ts'
import { generateRunbookFn } from '#/lib/ai.functions.ts'
import { Markdown } from './Markdown.tsx'

export function RunbookPanel({ glitch, canGenerate }: { glitch: Glitch; canGenerate: boolean }) {
  const [runbook, setRunbook] = useState<string | null>(glitch.runbook)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => setRunbook(glitch.runbook), [glitch.runbook])

  async function generate() {
    setBusy(true)
    setError(null)
    try {
      setRunbook((await generateRunbookFn({ data: { glitchId: glitch.glitchId } })).runbook)
    } catch (e) {
      setError((e as Error).message || 'Could not generate the runbook.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted">
          <BookOpen className="size-4" /> Runbook
        </h2>
        {canGenerate && (
          <button
            type="button"
            onClick={generate}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-2.5 py-1.5 text-xs font-semibold text-on-accent transition hover:opacity-90 disabled:opacity-60"
          >
            {runbook ? <RefreshCw className={`size-3.5 ${busy ? 'animate-spin' : ''}`} /> : <Sparkles className="size-3.5" />}
            {busy ? 'Consulting...' : runbook ? 'Regenerate' : 'Generate runbook'}
          </button>
        )}
      </div>
      {busy ? (
        <div className="space-y-2" aria-busy="true" aria-label="Generating runbook">
          {[90, 100, 70, 95, 60].map((w, i) => (
            <div key={i} className="h-3 animate-pulse rounded bg-subtle" style={{ width: `${w}%`, animationDelay: `${i * 120}ms` }} />
          ))}
        </div>
      ) : runbook ? (
        <Markdown>{runbook}</Markdown>
      ) : (
        <p className="text-sm text-muted">{canGenerate ? 'No runbook yet. Let the Oracle draft one.' : 'No runbook yet. A commander can generate one.'}</p>
      )}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </section>
  )
}
