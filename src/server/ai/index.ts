/**
 * @file Public entry point of the AI layer. SERVER-ONLY.
 * Provider via AI_PROVIDER: `cli` (default: `claude -p --model haiku`, claude-cli.ts),
 * `api` (Anthropic SDK + ANTHROPIC_API_KEY, claude.ts) or `off`. AI_DISABLED=1 also forces `off`.
 * Every function falls back to heuristics.ts on unavailable provider / error / timeout,
 * so the demo never breaks.
 * @exports triageEcho, generateRunbook, askOracle, suggestAssignee, aiEnabled, aiModel, aiProvider
 * @usedBy src/server/echo-pipeline.ts, src/lib/ai.functions.ts
 */
import { cliAvailable } from './claude-cli.ts'
import { assigneeHeuristic, oracleHeuristic, runbookHeuristic, triageHeuristic } from './heuristics.ts'
import type { AssigneeInput, AssigneeResult, OracleInput, RunbookInput, TriageInput, TriageResult } from './types.ts'

export type AiProvider = 'cli' | 'api' | 'off'

export function aiProvider(): AiProvider {
  if (process.env.AI_DISABLED === '1') return 'off'
  const p = (process.env.AI_PROVIDER || 'cli').toLowerCase()
  return p === 'api' || p === 'off' ? p : 'cli'
}

export function aiEnabled(): boolean {
  const p = aiProvider()
  if (p === 'cli') return cliAvailable()
  if (p === 'api') return Boolean(process.env.ANTHROPIC_API_KEY)
  return false
}

export function aiModel(): string {
  if (process.env.AI_MODEL) return process.env.AI_MODEL
  return aiProvider() === 'api' ? 'claude-opus-5-5' : 'haiku'
}

/** The active Claude implementation, loaded lazily so a missing SDK/key never crashes boot. */
async function impl() {
  return aiProvider() === 'api' ? import('./claude.ts') : import('./claude-cli.ts')
}

async function withFallback<T>(label: string, fn: () => Promise<T>, fallback: () => T, timeoutMs: number): Promise<T> {
  if (!aiEnabled()) return fallback()
  const started = Date.now()
  try {
    const result = await Promise.race([
      fn(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
    ])
    console.info(`[ai] ${label} via ${aiProvider()} in ${Date.now() - started}ms`)
    return result
  } catch (err) {
    console.warn(`[ai] ${label} fell back to heuristics after ${Date.now() - started}ms:`, (err as Error).message)
    return fallback()
  }
}

// Timeouts include queueing behind other CLI calls (~3s each, 3 in parallel).
export function triageEcho(input: TriageInput): Promise<TriageResult> {
  return withFallback('triage', async () => (await impl()).triageClaude(input), () => triageHeuristic(input), 20_000)
}

export function generateRunbook(input: RunbookInput): Promise<string> {
  return withFallback('runbook', async () => (await impl()).runbookClaude(input), () => runbookHeuristic(input), 45_000)
}

export function askOracle(input: OracleInput): Promise<string> {
  return withFallback('oracle', async () => (await impl()).oracleClaude(input), () => oracleHeuristic(input), 45_000)
}

export function suggestAssignee(input: AssigneeInput): Promise<AssigneeResult> {
  return withFallback('assignee', async () => (await impl()).assigneeClaude(input), () => assigneeHeuristic(input), 20_000)
}
