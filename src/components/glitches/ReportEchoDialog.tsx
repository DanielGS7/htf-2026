/**
 * @file Desktop "Report echo" dialog (key `n`). Submits via createEcho and shows what the AI did with it. Built on the shared Modal.
 * @exports ReportEchoDialog
 * @usedBy src/routes/index.tsx
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { Loader2, Send } from 'lucide-react'
import { Button } from '#/components/ui/Button.tsx'
import { Modal } from '#/components/ui/Modal.tsx'
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
  }, [open])

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

  const field = 'mt-1 w-full rounded-md border border-line bg-app p-2.5 text-fg outline-none focus:border-accent'
  return (
    <Modal open={open} onClose={onClose} title="Report an echo">
      {result ? (
        <div className="space-y-4">
          <div className={`rounded-md border p-3 ${result.outcome === 'rejected' ? 'border-danger/50 bg-danger/10 text-danger' : 'border-success/50 bg-success/10 text-success'}`}>
            <p className="label !text-current">Oracle verdict</p>
            <div className="font-display text-lg font-bold">{OUTCOME[result.outcome]}</div>
            {result.outcome === 'rejected' && result.echo.moderationReason && <div className="mt-1 text-fg">{result.echo.moderationReason}</div>}
            {result.glitch && (
              <Link to="/glitches/$glitchId" params={{ glitchId: result.glitch.glitchId }} onClick={onClose} className="mt-1 block text-fg underline">
                <span className="font-mono">{result.glitch.glitchId}</span>: {result.glitch.description}
              </Link>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setResult(null)}>
              Report another
            </Button>
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (text.trim().length >= 3 && !busy) void submit()
          }}
          className="space-y-4"
        >
          <label className="block">
            <span className="label">What did you see, hear or feel?</span>
            <textarea
              ref={area}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && text.trim().length >= 3 && void submit()}
              rows={4}
              placeholder="The clock tower bells keep ringing the same hour..."
              className={`${field} resize-none`}
            />
          </label>
          <label className="block">
            <span className="label">District (optional, AI guesses if empty)</span>
            <select value={district} onChange={(e) => setDistrict(e.target.value as DistrictId | '')} className={field}>
              <option value="">Unknown</option>
              {DISTRICTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          {error && <p className="text-danger">{error}</p>}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">Ctrl+Enter to send</span>
            <Button type="submit" disabled={busy || text.trim().length < 3}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Send echo
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
