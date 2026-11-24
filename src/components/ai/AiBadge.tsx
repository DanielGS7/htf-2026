/**
 * @file Compact squared tag showing whether Claude is online ("AI online · model") or the offline heuristics are active.
 * @exports AiBadge
 * @usedBy src/routes/oracle.tsx, other work packages
 */
import { useEffect, useState } from 'react'
import { getAiStatus, type AiStatus } from '#/lib/ai.functions.ts'

const TAG = 'inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-[11px] font-semibold uppercase leading-none tracking-[0.1em]'

export function AiBadge() {
  const [status, setStatus] = useState<AiStatus | null>(null)
  useEffect(() => {
    let alive = true
    getAiStatus().then((s) => alive && setStatus(s)).catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  if (!status) return <span className="inline-block h-6 w-28 animate-pulse rounded-sm bg-subtle" />
  return status.enabled ? (
    <span className={`${TAG} border-success/50 bg-success/15 text-success`}>
      <span className="size-1.5 bg-success" /> AI online · {status.model}
    </span>
  ) : (
    <span className={`${TAG} border-line bg-subtle text-muted`}>
      <span className="size-1.5 bg-muted" /> Offline heuristics
    </span>
  )
}
