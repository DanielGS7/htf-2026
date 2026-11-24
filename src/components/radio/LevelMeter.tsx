/**
 * @file Segmented VU meter for the radio desk: green/amber/red LED bar with a peak marker, plus
 * "too loud" and "no signal" warnings.
 * @exports LevelMeter
 * @usedBy src/routes/radio.tsx
 */
const SEGMENTS = 32

export function LevelMeter({
  level,
  peak,
  clipping,
  noSignal,
  running,
}: {
  level: number
  peak: number
  clipping: boolean
  noSignal: boolean
  running: boolean
}) {
  const lit = Math.round(Math.min(1, level) * SEGMENTS)
  const peakAt = Math.min(SEGMENTS - 1, Math.round(Math.min(1, peak) * SEGMENTS))
  return (
    <div>
      <div
        role="meter"
        aria-label="Input level"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(level * 100)}
        className="flex h-16 items-stretch gap-1"
      >
        {Array.from({ length: SEGMENTS }, (_, i) => {
          const zone = i < SEGMENTS * 0.6 ? 'bg-success' : i < SEGMENTS * 0.85 ? 'bg-warning' : 'bg-danger'
          const on = running && (i < lit || i === peakAt)
          return <span key={i} className={`flex-1 rounded-[2px] ${zone} ${on ? (i < lit ? 'opacity-100' : 'opacity-70') : 'opacity-15'}`} />
        })}
      </div>
      <div className="mt-2 flex justify-between font-mono text-xs text-muted">
        <span>quiet</span>
        <span>walkie volume sweet spot: green to amber</span>
        <span>clipping</span>
      </div>
      {clipping && (
        <p role="alert" className="mt-3 rounded-md border-2 border-danger/60 bg-danger/15 px-4 py-3 text-lg font-semibold text-danger">
          Too loud. Lower the walkie volume until the bar stays out of the red.
        </p>
      )}
      {noSignal && !clipping && (
        <p role="alert" className="mt-3 rounded-md border-2 border-warning/60 bg-warning/15 px-4 py-3 text-lg font-semibold text-warning">
          No signal for 10 seconds. Check the cable, the walkie volume and the default input device.
        </p>
      )}
    </div>
  )
}
