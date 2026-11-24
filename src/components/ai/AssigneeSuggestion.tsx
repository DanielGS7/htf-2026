/**
 * @file Small commander button "Suggest assignee": asks the AI (or heuristic) for the best defender
 * and shows the pick with a one-line reason. Optional onPick lets the host assign the suggestion.
 * @exports AssigneeSuggestion
 * @usedBy any glitch UI (mountable by the glitch workflow)
 */
import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { suggestAssigneeFn, type AssigneeSuggestionResult } from '#/lib/ai.functions.ts'

export function AssigneeSuggestion({ glitchId, onPick }: { glitchId: string; onPick?: (guardianId: string) => void }) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<AssigneeSuggestionResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function ask() {
    setBusy(true)
    setError(null)
    try {
      setResult(await suggestAssigneeFn({ data: { glitchId } }))
    } catch (e) {
      setError((e as Error).message || 'No suggestion available.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-1.5 text-xs">
      <button
        type="button"
        onClick={ask}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-subtle px-2.5 py-1.5 font-medium text-fg transition hover:bg-subtle-hover disabled:opacity-60"
      >
        <Sparkles className={`size-3.5 text-accent ${busy ? 'animate-pulse' : ''}`} />
        {busy ? 'Thinking...' : 'Suggest assignee'}
      </button>
      {result?.guardianId && (
        <p className="text-muted">
          <span className="font-semibold text-fg">{result.codename}</span> · {result.reason}
          {onPick && (
            <button type="button" onClick={() => onPick(result.guardianId!)} className="ml-2 text-accent underline">
              Assign
            </button>
          )}
        </p>
      )}
      {result && !result.guardianId && <p className="text-muted">{result.reason}</p>}
      {error && <p className="text-danger">{error}</p>}
    </div>
  )
}
