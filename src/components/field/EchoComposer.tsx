/**
 * @file The phone echo form for /report: big textarea, district tags, mic (F25), photo (F26),
 * haptic submit, animated outcome card and the offline queue (F16).
 * Network failures queue the echo in localStorage; it auto-sends when the connection returns.
 * @exports EchoComposer
 * @usedBy src/routes/report.tsx
 */
import { useRef, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Camera, Loader2, Mic, MicOff, Send, X } from 'lucide-react'
import { OutcomeCard, type Outcome } from '#/components/field/OutcomeCard.tsx'
import { isNetworkError, useEchoQueue } from '#/components/field/useEchoQueue.ts'
import { Button } from '#/components/ui/Button.tsx'
import { useToast } from '#/components/ui/Toast.tsx'
import { createEchoField } from '#/lib/field.functions.ts'
import { DISTRICTS } from '#/lib/glitch.ts'
import { resizeImageToDataUrl } from '#/lib/image.ts'
import { useSpeech } from '#/lib/useSpeech.ts'

const buzz = (p: number | number[]) => {
  try {
    navigator.vibrate?.(p)
  } catch {
    /* ignore */
  }
}

export function EchoComposer({ onScore }: { onScore: (score: number) => void }) {
  const router = useRouter()
  const toast = useToast()
  const [text, setText] = useState('')
  const [district, setDistrict] = useState<string | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [sending, setSending] = useState(false)
  const [shown, setShown] = useState<{ o: Outcome; n: number } | null>(null)
  const outcome = shown?.o ?? null
  const setOutcome = (o: Outcome) => setShown((p) => ({ o, n: (p?.n ?? 0) + 1 }))
  const fileRef = useRef<HTMLInputElement>(null)
  const speech = useSpeech(setText)

  const { queue, enqueue } = useEchoQueue({
    onSent: (r, q) => {
      setOutcome({ kind: 'result', data: r, delayed: true })
      onScore(r.score)
      buzz(r.outcome === 'rejected' ? 80 : [15, 40, 15])
      toast({ tone: r.outcome === 'rejected' ? 'warning' : 'success', message: `Queued echo sent: ${q.description.slice(0, 40)}` })
      void router.invalidate()
    },
    onDropped: (q, reason) => toast({ tone: 'danger', message: `A queued echo was discarded (${reason}): ${q.description.slice(0, 40)}` }),
  })

  const canSend = text.trim().length >= 3 && !sending && !photoBusy

  function reset() {
    setText('')
    setDistrict(null)
    setPhoto(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function submit() {
    if (!canSend) return
    if (speech.listening) speech.stop()
    buzz(20)
    const payload = { description: text.trim(), districtId: district, imageUrl: photo }
    const queueIt = () => {
      enqueue(payload)
      setOutcome({ kind: 'queued', count: queue.length + 1 })
      buzz([30, 60, 30])
      reset()
    }
    // Only skip the attempt when the browser itself knows it is offline; an SSE blip alone is not proof.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return queueIt()
    setSending(true)
    try {
      const r = await createEchoField({ data: payload })
      setOutcome({ kind: 'result', data: r })
      onScore(r.score)
      buzz(r.outcome === 'rejected' ? [90] : [15, 40, 15, 40, 60])
      reset()
      void router.invalidate()
    } catch (e) {
      if (isNetworkError(e)) queueIt()
      else setOutcome({ kind: 'error', message: e instanceof Error && e.message ? e.message.slice(0, 160) : 'Something went wrong. Try again.' })
    } finally {
      setSending(false)
    }
  }

  async function pickPhoto(file: File | undefined) {
    if (!file) return
    setPhotoBusy(true)
    try {
      setPhoto(await resizeImageToDataUrl(file))
    } catch {
      toast({ tone: 'warning', message: 'Could not read that photo. Try another one.' })
    } finally {
      setPhotoBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {outcome && <OutcomeCard key={shown?.n} outcome={outcome} />}
      {queue.length > 0 && outcome?.kind !== 'queued' && (
        <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
          {queue.length} echo{queue.length === 1 ? '' : 'es'} waiting for the connection. They will send automatically.
        </p>
      )}

      <div className="glass hud rounded-lg p-3">
        <label htmlFor="echo-text" className="mb-2 block px-1 font-display text-lg leading-snug font-semibold">
          What do you see or hear in Achrona?
        </label>
        <textarea
          id="echo-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit()
          }}
          maxLength={1000}
          rows={5}
          placeholder="The clock tower bells ring backwards and the shadows are late..."
          className="min-h-40 w-full resize-y rounded-md border border-line bg-app p-3 text-base text-fg placeholder:text-muted/80 focus:border-accent focus:outline-none"
        />
        <div className="mt-2 flex items-center gap-2">
          {speech.supported && (
            <button
              type="button"
              onClick={() => (speech.listening ? speech.stop() : speech.start(text))}
              aria-pressed={speech.listening}
              title={speech.listening ? 'Stop listening' : 'Speak your echo'}
              className={`inline-flex min-h-11 items-center gap-2 rounded-md border px-3.5 text-sm font-semibold transition ${speech.listening ? 'animate-pulse border-danger bg-danger/15 text-danger' : 'border-line bg-subtle text-fg hover:border-accent/60 hover:bg-subtle-hover'}`}
            >
              {speech.listening ? <MicOff className="size-5" /> : <Mic className="size-5" />}
              {speech.listening ? 'Listening...' : 'Speak'}
            </button>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={photoBusy}
            title="Attach a photo"
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-subtle px-3.5 text-sm font-semibold text-fg transition hover:border-accent/60 hover:bg-subtle-hover disabled:opacity-60"
          >
            {photoBusy ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
            Photo
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void pickPhoto(e.target.files?.[0])} />
          <span className="label ml-auto tabular-nums">{text.length}/1000</span>
        </div>
        {speech.error && <p className="mt-2 px-1 text-xs text-danger">{speech.error}</p>}
        {photo && (
          <div className="relative mt-3 w-fit">
            <img src={photo} alt="Attached preview" className="max-h-40 rounded-md border border-line" />
            <button
              type="button"
              onClick={() => {
                setPhoto(null)
                if (fileRef.current) fileRef.current.value = ''
              }}
              aria-label="Remove photo"
              title="Remove photo"
              className="absolute -top-2 -right-2 flex size-9 items-center justify-center rounded-md bg-danger text-white shadow-lg"
            >
              <X className="size-5" />
            </button>
          </div>
        )}
      </div>

      <div>
        <p className="label mb-2 px-1">
          Where? <span className="normal-case tracking-normal">(optional)</span>
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="District">
          {DISTRICTS.map((d) => (
            <button
              key={d.id}
              type="button"
              aria-pressed={district === d.id}
              onClick={() => setDistrict(district === d.id ? null : d.id)}
              className={`min-h-11 rounded-sm border px-3.5 text-sm font-semibold tracking-wide uppercase transition [font-stretch:92%] ${district === d.id ? 'border-accent bg-accent/20 text-accent-ink' : 'border-line bg-subtle text-muted hover:border-accent/50 hover:text-fg'}`}
            >
              {d.name}
            </button>
          ))}
        </div>
      </div>

      <Button type="button" size="lg" onClick={() => void submit()} disabled={!canSend} className="h-14 w-full text-lg">
        {sending ? <Loader2 className="size-6 animate-spin" /> : <Send className="size-6" />}
        {sending ? 'Sending...' : 'Send echo'}
      </Button>
    </div>
  )
}
