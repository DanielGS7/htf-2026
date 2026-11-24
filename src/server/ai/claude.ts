/**
 * @file Anthropic SDK provider (AI_PROVIDER=api, needs ANTHROPIC_API_KEY). SERVER-ONLY; loaded lazily
 * by src/server/ai/index.ts, which handles fallback to heuristics. Prompts live in prompts.ts.
 * Uses the beta Messages API so refusals can fall back server-side (`fallbacks: 'default'`,
 * disable with AI_FALLBACKS=0). Structured outputs for triage + assignee; plain text for runbook/oracle.
 * @exports triageClaude, runbookClaude, oracleClaude, assigneeClaude
 * @usedBy src/server/ai/index.ts (dynamic import)
 */
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import {
  ASSIGNEE_SYSTEM,
  ORACLE_SYSTEM,
  RUNBOOK_SYSTEM,
  TRIAGE_SYSTEM,
  assigneeSchema,
  finalizeAssignee,
  finalizeTriage,
  oracleUserMessage,
  runbookUserMessage,
  triageSchema,
  triageUserMessage,
} from './prompts.ts'
import type { AssigneeInput, AssigneeResult, OracleInput, RunbookInput, TriageInput, TriageResult } from './types.ts'

let client: Anthropic | null = null
const getClient = () => (client ??= new Anthropic())
const model = () => process.env.AI_MODEL || 'claude-opus-5-5'

/** Shared request options: beta header + server-side refusal fallbacks (opt-out via AI_FALLBACKS=0). */
function betaOpts() {
  return process.env.AI_FALLBACKS === '0'
    ? {}
    : { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
}

type BetaMessage = { stop_reason: string | null; content: { type: string; text?: string }[] }

function assertNotRefused(res: BetaMessage) {
  if (res.stop_reason === 'refusal') throw new Error('model refused the request')
}

function textOf(res: BetaMessage): string {
  assertNotRefused(res)
  const text = res.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('')
    .trim()
  if (!text) throw new Error('empty response')
  return text
}

export async function triageClaude(input: TriageInput): Promise<TriageResult> {
  const res = await getClient().beta.messages.parse({
    model: model(),
    max_tokens: 1000,
    system: [{ type: 'text', text: TRIAGE_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: triageUserMessage(input) }],
    output_config: { effort: 'low', format: betaZodOutputFormat(triageSchema()) },
    ...betaOpts(),
  })
  assertNotRefused(res)
  if (!res.parsed_output) throw new Error('triage output could not be parsed')
  return finalizeTriage(res.parsed_output, input)
}

export async function runbookClaude(input: RunbookInput): Promise<string> {
  const res = await getClient().beta.messages.create({
    model: model(),
    max_tokens: 2000,
    system: [{ type: 'text', text: RUNBOOK_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: runbookUserMessage(input) }],
    output_config: { effort: 'medium' },
    ...betaOpts(),
  })
  return textOf(res)
}

export async function oracleClaude(input: OracleInput): Promise<string> {
  const history = (input.history ?? []).slice(-10)
  const res = await getClient().beta.messages.create({
    model: model(),
    max_tokens: 1200,
    system: [{ type: 'text', text: ORACLE_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [
      ...history.map((t) => ({ role: t.role, content: t.content })),
      { role: 'user' as const, content: oracleUserMessage(input) },
    ],
    output_config: { effort: 'medium' },
    ...betaOpts(),
  })
  return textOf(res)
}

export async function assigneeClaude(input: AssigneeInput): Promise<AssigneeResult> {
  const res = await getClient().beta.messages.parse({
    model: model(),
    max_tokens: 400,
    system: [{ type: 'text', text: ASSIGNEE_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: JSON.stringify(input) }],
    output_config: { effort: 'low', format: betaZodOutputFormat(assigneeSchema()) },
    ...betaOpts(),
  })
  assertNotRefused(res)
  if (!res.parsed_output) throw new Error('assignee output could not be parsed')
  return finalizeAssignee(res.parsed_output, input)
}
