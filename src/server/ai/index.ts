/**
 * @file Public entry point of the AI layer. SERVER-ONLY.
 * Every function tries Claude (src/server/ai/claude.ts) and falls back to
 * heuristics.ts on missing key / error / timeout, so the demo never breaks.
 * @exports triageEcho, generateRunbook, askOracle, suggestAssignee, aiEnabled, aiModel
 * @usedBy src/server/echo-pipeline.ts, src/lib/ai.functions.ts
 */
import { assigneeHeuristic, oracleHeuristic, runbookHeuristic, triageHeuristic } from './heuristics.ts'
import type { AssigneeInput, AssigneeResult, OracleInput, RunbookInput, TriageInput, TriageResult } from './types.ts'

export const aiEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY) && process.env.AI_DISABLED !== '1'

export const aiModel = () => process.env.AI_MODEL || 'claude-opus-5-5'

/** Resolves the Claude implementation lazily so a missing SDK/key never crashes boot. */
async function claude() {
  return import('./claude.ts')
}

async function withFallback<T>(label: string, fn: () => Promise<T>, fallback: () => T, timeoutMs: number): Promise<T> {
  if (!aiEnabled()) return fallback()
  try {
    return await Promise.race([
      fn(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
    ])
  } catch (err) {
    console.warn(`[ai] ${label} fell back to heuristics:`, (err as Error).message)
    return fallback()
  }
}

export function triageEcho(input: TriageInput): Promise<TriageResult> {
  return withFallback('triage', async () => (await claude()).triageClaude(input), () => triageHeuristic(input), 12_000)
}

export function generateRunbook(input: RunbookInput): Promise<string> {
  return withFallback('runbook', async () => (await claude()).runbookClaude(input), () => runbookHeuristic(input), 45_000)
}

export function askOracle(input: OracleInput): Promise<string> {
  return withFallback('oracle', async () => (await claude()).oracleClaude(input), () => oracleHeuristic(input), 45_000)
}

export function suggestAssignee(input: AssigneeInput): Promise<AssigneeResult> {
  return withFallback('assignee', async () => (await claude()).assigneeClaude(input), () => assigneeHeuristic(input), 15_000)
}
