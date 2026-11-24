/**
 * @file Route /radio: walkie-talkie radio desk (F31). A walkie's audio out is wired into this laptop's
 * mic input; the page listens continuously (Web Speech, Chrome/Edge), shows a live level meter and
 * transcript, and sends each transmission (ended by "over" or a pause) as a radio echo from the
 * logged-in guardian. Optional spoken replies for a second walkie on VOX.
 * @usedBy router
 */
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Mic, MicOff, Send, Trash2 } from 'lucide-react'
import { PageHeader } from '#/components/ui/PageHeader.tsx'
import { Button } from '#/components/ui/Button.tsx'
import { Badge } from '#/components/ui/Badge.tsx'
import { LevelMeter } from '#/components/radio/LevelMeter.tsx'
import { TransmissionLog } from '#/components/radio/TransmissionLog.tsx'
import { useLevelMeter } from '#/components/radio/useLevelMeter.ts'
import { RADIO_LANGS, useRadio, type RadioStatus } from '#/lib/useRadio.ts'
import { useMe } from '#/lib/auth.functions.ts'

export const Route = createFileRoute('/radio')({
  component: RadioPage,
})

const STATUS_TEXT: Record<RadioStatus, string> = {
  off: 'Off air',
  starting: 'Starting up',
  listening: 'Listening',
  restarting: 'Reconnecting',
  error: 'Trouble',
  unsupported: 'Unsupported browser',
}

const CHECKLIST = [
  'Walkie audio out into the laptop mic input (USB sound card or TRRS splitter).',
  'Set that input as the default microphone in the system sound settings. Chrome ignores the picker below.',
  'Walkie volume low, microphone boost off. Raise it until the meter reaches green to amber.',
  'Press the talk key, speak, and finish with the word "over".',
]

function RadioPage() {
  const me = useMe()
  const [lang, setLang] = useState('en-US')
  const [silenceSec, setSilenceSec] = useState(4)
  const [autoOver, setAutoOver] = useState(true)
  const [reply, setReply] = useState(false)
  const [deviceId, setDeviceId] = useState('')
  const [testing, setTesting] = useState(false)

  const radio = useRadio({ lang, silenceSec, autoOver, reply, codename: me?.codename ?? 'guardian' })
  const meter = useLevelMeter(radio.onAir || testing, deviceId)
  const noSignal = radio.onAir && meter.running && meter.silentFor >= 10
  const hasText = Boolean(radio.finalText || radio.interim)

  if (!radio.supported) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <PageHeader label="Mission control" title="Radio desk" />
        <div role="alert" className="glass hud rounded-lg border-2 border-danger/60 p-8">
          <p className="font-display text-3xl font-bold">Use Chrome or Edge</p>
          <p className="mt-3 text-lg text-muted">
            This browser has no speech recognition, so the radio desk cannot listen. Open this page in Chrome or Edge on localhost.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        label="Mission control"
        title="Radio desk"
        subtitle={
          <>
            Transmissions are sent as <span className="font-semibold text-fg">{me?.codename ?? 'the logged-in guardian'}</span>. Say "over" to send.
          </>
        }
        actions={<Badge tone={radio.status === 'error' ? 'danger' : radio.status === 'listening' ? 'success' : 'neutral'}>{STATUS_TEXT[radio.status]}</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-6">
          <button
            type="button"
            aria-pressed={radio.onAir}
            onClick={() => (radio.onAir ? radio.goOffAir() : radio.goOnAir())}
            className={`flex min-h-32 w-full items-center justify-center gap-5 rounded-lg border-2 px-6 py-6 font-display text-5xl font-bold tracking-widest uppercase transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:text-6xl ${
              radio.onAir
                ? 'border-danger bg-[linear-gradient(180deg,#f48d30,#eb4c2d_70%,#d2341b)] text-white shadow-[inset_0_-4px_0_rgb(0_0_0/0.28)]'
                : 'border-line bg-subtle text-muted hover:border-accent/60 hover:text-fg'
            }`}
          >
            {radio.onAir ? <Mic className="size-12" aria-hidden /> : <MicOff className="size-12" aria-hidden />}
            {radio.onAir ? 'On air' : 'Off air'}
          </button>

          {radio.statusNote && (
            <p role="alert" className="rounded-md border-2 border-warning/60 bg-warning/15 px-4 py-3 text-lg font-semibold text-warning">
              {radio.statusNote}
            </p>
          )}

          <section className="glass hud rounded-lg p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="label">Input level</h2>
              {!radio.onAir && (
                <Button size="sm" variant="secondary" onClick={() => setTesting((t) => !t)}>
                  {testing ? 'Stop level test' : 'Test level'}
                </Button>
              )}
            </div>
            {meter.error && <p className="mb-3 text-lg text-danger">{meter.error}</p>}
            <LevelMeter level={meter.level} peak={meter.peak} clipping={meter.clipping} noSignal={noSignal} running={meter.running} />
          </section>

          <section className="glass hud rounded-lg p-5" aria-live="polite">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="label">Live transcript</h2>
              <div className="flex gap-2">
                <Button size="sm" onClick={radio.sendNow} disabled={!hasText}>
                  <Send className="size-4" aria-hidden /> Send now
                </Button>
                <Button size="sm" variant="secondary" onClick={radio.discard} disabled={!hasText}>
                  <Trash2 className="size-4" aria-hidden /> Discard
                </Button>
              </div>
            </div>
            <p className="min-h-28 text-3xl leading-snug break-words">
              {hasText ? (
                <>
                  <span>{radio.finalText}</span> <span className="opacity-50">{radio.interim}</span>
                </>
              ) : (
                <span className="text-muted">{radio.onAir ? 'Waiting for a transmission...' : 'Go on air to start listening.'}</span>
              )}
            </p>
            {radio.squelched > 0 && <p className="mt-2 font-mono text-xs text-muted">{radio.squelched} short burst(s) ignored as squelch noise</p>}
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="glass rounded-lg p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="label">Transmissions</h2>
              {radio.log.length > 0 && (
                <Button size="sm" variant="ghost" onClick={radio.clearLog}>
                  Clear
                </Button>
              )}
            </div>
            <TransmissionLog log={radio.log} />
          </section>

          <section className="glass rounded-lg p-5">
            <h2 className="label mb-3">Settings</h2>
            <div className="grid gap-4 text-base">
              <label className="grid gap-1">
                <span className="font-semibold">Language</span>
                <select value={lang} onChange={(e) => setLang(e.target.value)} className="h-11 rounded-md border border-line bg-subtle px-3 text-fg">
                  {RADIO_LANGS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="font-semibold">
                  Send after silence: <span className="font-mono">{silenceSec}s</span>
                </span>
                <input type="range" min={2} max={15} value={silenceSec} onChange={(e) => setSilenceSec(Number(e.target.value))} className="accent-[var(--accent)]" />
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={autoOver} onChange={(e) => setAutoOver(e.target.checked)} className="size-5 accent-[var(--accent)]" />
                <span>Send automatically when the transmission ends with "over"</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={reply} onChange={(e) => setReply(e.target.checked)} className="size-5 accent-[var(--accent)]" />
                <span>Reply over the air (spoken confirmation, for a second walkie on VOX)</span>
              </label>
              <label className="grid gap-1">
                <span className="font-semibold">Level meter input</span>
                <select
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  onFocus={() => void meter.refreshDevices()}
                  className="h-11 rounded-md border border-line bg-subtle px-3 text-fg"
                >
                  <option value="">System default</option>
                  {meter.devices.filter((d) => d.deviceId && d.deviceId !== 'default').map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-muted">
                  Speech recognition always listens to the system default microphone. Pick the walkie input in the system sound settings; this only changes the meter.
                </span>
              </label>
            </div>
          </section>

          <section className="glass rounded-lg p-5">
            <h2 className="label mb-3">Setup checklist</h2>
            <ol className="list-decimal space-y-2 pl-6 text-lg">
              {CHECKLIST.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  )
}
