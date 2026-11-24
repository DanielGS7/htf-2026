/**
 * @file Desktop "Report echo" dialog (key `n`). Submits via createEcho and shows what the AI did with it.
 * @exports ReportEchoDialog
 * @usedBy src/routes/index.tsx
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { Loader2, Send, X } from 'lucide-react'
import { createEcho } from '#/lib/echoes.functions.ts'
import { DISTRICTS, type DistrictId } from '#/lib/glitch.ts'

const OUTCOME: Record<string, string> = {
  rejected: 'Rejected by moderation',
  'new-glitch': 'New glitch opened',
  grouped: 'Grouped with an existing glitch',
  resolved: 'Glitch marked as resolved',
  reopened: 'Glitch reopened',
}

export function ReportEchoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [district, setDistrict] = useState<DistrictId | ''>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Awaited<ReturnType<typeof createEcho>> | null>(null)
  const area = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!open) return
    setResult(null)
    setError(null)
    setTimeout(() => area.current?.focus(), 30)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      const r = await createEcho({ data: { description: text, districtId: district || null } })
      setResult(r)
      setText('')
      void router.invalidate()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the echo')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-label="Report an echo"
        className="w-full max-w-lg rounded-2xl border border-line bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-fg">Report an echo</h2>
          <button type="button" onClick={onClose} title="Close (Esc)" aria-label="Close" className="text-muted hover:text-fg">
            <X className="size-5" />
          </button>
        </div>
        {result ? (
          <div className="space-y-3">
            <div className={`rounded-xl border p-3 text-sm ${result.outcome === 'rejected' ? 'border-red-500/40 text-red-500' : 'border-emerald-500/40 text-emerald-500'}`}>
              <div className="font-semibold">{OUTCOME[result.outcome]}</div>
              {result.outcome === 'rejected' && result.echo.moderationReason && (
                <div className="mt-1 text-muted">{result.echo.moderationReason}</div>
              )}
              {result.glitch && (
                <Link to="/glitches/$glitchId" params={{ glitchId: result.glitch.glitchId }} onClick={onClose} className="mt-1 block underline">
                  {result.glitch.glitchId}: {result.glitch.description}
                </Link>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setResult(null)} className="rounded-lg bg-subtle px-3 py-1.5 text-sm text-fg hover:bg-subtle-hover">
                Report another
              </button>
              <button type="button" onClick={onClose} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white">
                Done
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (text.trim().length >= 3 && !busy) void submit()
            }}
            className="space-y-3"
          >
            <label className="block text-sm text-muted">
              What did you see, hear or feel?
              <textarea
                ref={area}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && text.trim().length >= 3 && void submit()}
                rows={4}
                placeholder="The clock tower bells keep ringing the same hour..."
                className="mt-1 w-full resize-none rounded-xl border border-line bg-app p-3 text-fg outline-none focus:border-accent"
              />
            </label>
            <label className="block text-sm text-muted">
              District (optional, AI guesses if empty)
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value as DistrictId | '')}
                className="mt-1 w-full rounded-xl border border-line bg-app p-2 text-fg"
              >
                <option value="">Unknown</option>
                {DISTRICTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Ctrl+Enter to send</span>
              <button
                type="submit"
                disabled={busy || text.trim().length < 3}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                Send echo
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
