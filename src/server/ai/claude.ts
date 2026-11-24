/**
 * @file Claude-backed implementations of the AI contracts (src/server/ai/types.ts).
 * SERVER-ONLY; loaded lazily by src/server/ai/index.ts, which handles fallback.
 * STATUS: stub, implemented in work package WP-D (see PRD.md).
 * @exports triageClaude, runbookClaude, oracleClaude
 */
import type { OracleInput, RunbookInput, TriageInput, TriageResult } from './types.ts'

export async function triageClaude(_input: TriageInput): Promise<TriageResult> {
  throw new Error('not implemented')
}

export async function runbookClaude(_input: RunbookInput): Promise<string> {
  throw new Error('not implemented')
}

export async function oracleClaude(_input: OracleInput): Promise<string> {
  throw new Error('not implemented')
}
