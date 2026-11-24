/**
 * @file Runbook section of the glitch detail page: renders the saved Markdown runbook as in-world "field orders" and lets
 * a commander generate or regenerate it (server fn saves it and broadcasts glitch.updated).
 * @exports RunbookPanel
 * @usedBy src/routes/glitches.$glitchId.tsx
 */
import { useEffect, useState } from 'react'
import { BookOpen, RefreshCw } from 'lucide-react'
import { Button } from '#/components/ui/Button.tsx'
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
    <section className="glass hud rounded-lg p-4" aria-label="Runbook: field orders">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <img src="/htf/character-4.avif" alt="" aria-hidden className="size-10 shrink-0 object-contain" />
          <div className="min-w-0">
            <p className="label">Field orders</p>
            <h2 className="font-display text-lg leading-tight font-bold tracking-wide uppercase">Runbook</h2>
          </div>
        </div>
        {canGenerate && (
          <Button size="sm" onClick={generate} disabled={busy} className="whitespace-nowrap">
            {runbook ? <RefreshCw className={`size-3.5 ${busy ? 'animate-spin' : ''}`} /> : <BookOpen className="size-3.5" />}
            {busy ? 'Consulting...' : runbook ? 'Regenerate' : 'Generate runbook'}
          </Button>
        )}
      </div>
      {busy ? (
        <div className="space-y-2" aria-busy="true" aria-label="Generating runbook">
          {[90, 100, 70, 95, 60].map((w, i) => (
            <div key={i} className="h-3 animate-pulse rounded-sm bg-subtle" style={{ width: `${w}%`, animationDelay: `${i * 120}ms` }} />
          ))}
        </div>
      ) : runbook ? (
        <Markdown>{runbook}</Markdown>
      ) : (
        <p className="text-sm text-muted">{canGenerate ? 'No runbook yet. Let the Oracle draft one.' : 'No runbook yet. A commander can generate one.'}</p>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </section>
  )
}
