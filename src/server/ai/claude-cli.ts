/**
 * @file Claude Code CLI provider (AI_PROVIDER=cli, the default): runs `claude -p --model haiku` as a
 * subprocess on the presenter's logged-in subscription, so no API key is needed. SERVER-ONLY.
 * Each call: no tools, no settings/CLAUDE.md, no MCP servers, no session files, cwd = OS temp dir.
 * User text goes over stdin (never argv). Structured output via --json-schema (`structured_output`).
 * At most AI_CLI_CONCURRENCY (default 3) calls run at once; the rest queue.
 * Env: CLAUDE_BIN (default `claude`), AI_MODEL (default `haiku`).
 * @exports triageClaude, runbookClaude, oracleClaude, assigneeClaude, cliAvailable
 * @usedBy src/server/ai/index.ts (dynamic import)
 */
import { spawn, spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { z } from 'zod'
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

const bin = () => process.env.CLAUDE_BIN || 'claude'
const model = () => process.env.AI_MODEL || 'haiku'
const MAX_PARALLEL = Math.max(1, Number(process.env.AI_CLI_CONCURRENCY) || 3)
/** Hard kill for a stuck subprocess (index.ts applies its own, shorter, fallback timeout). */
const KILL_AFTER_MS = 60_000

let cliChecked: boolean | null = null
/** True when the `claude` binary runs (checked once per server process). */
export function cliAvailable(): boolean {
  if (cliChecked === null) {
    const r = spawnSync(bin(), ['--version'], { timeout: 10_000, encoding: 'utf8' })
    cliChecked = r.status === 0
    if (!cliChecked) console.warn(`[ai] '${bin()}' not runnable, using heuristics`, r.error?.message ?? r.stderr)
  }
  return cliChecked
}

// ---------------------------------------------------------------- concurrency gate
let active = 0
const waiting: (() => void)[] = []
async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_PARALLEL) await new Promise<void>((resolve) => waiting.push(resolve))
  active++
  try {
    return await fn()
  } finally {
    active--
    waiting.shift()?.()
  }
}

type CliResult = { is_error?: boolean; subtype?: string; result?: string; structured_output?: unknown; stop_reason?: string | null }

function runCli(opts: { system: string; prompt: string; schema?: object }): Promise<CliResult> {
  const args = [
    '-p',
    '--model', model(),
    '--output-format', 'json',
    '--tools', '',
    '--setting-sources', '',
    '--strict-mcp-config',
    '--no-session-persistence',
    '--disable-slash-commands',
    '--system-prompt', opts.system,
  ]
  if (opts.schema) args.push('--json-schema', JSON.stringify(opts.schema))

  return withSlot(
    () =>
      new Promise<CliResult>((resolve, reject) => {
        const child = spawn(bin(), args, { cwd: tmpdir(), stdio: ['pipe', 'pipe', 'pipe'] })
        let out = ''
        let err = ''
        const killer = setTimeout(() => child.kill('SIGKILL'), KILL_AFTER_MS)
        child.stdout.on('data', (d) => (out += d))
        child.stderr.on('data', (d) => (err += d))
        child.on('error', (e) => {
          clearTimeout(killer)
          reject(e)
        })
        child.on('close', (code) => {
          clearTimeout(killer)
          let parsed: CliResult
          try {
            parsed = JSON.parse(out)
          } catch {
            return reject(new Error(`claude exited ${code}: ${(err || out).slice(0, 300)}`))
          }
          if (parsed.is_error || parsed.subtype !== 'success') {
            return reject(new Error(`claude error (${parsed.subtype}): ${String(parsed.result ?? '').slice(0, 300)}`))
          }
          if (parsed.stop_reason === 'refusal') return reject(new Error('model refused the request'))
          resolve(parsed)
        })
        child.stdin.end(opts.prompt)
      }),
  )
}

/** JSON Schema for --json-schema; the CLI's validator rejects zod's draft 2020-12 `$schema` header. */
function cliSchema(schema: z.ZodType): object {
  const { $schema: _drop, ...rest } = z.toJSONSchema(schema) as Record<string, unknown>
  return rest
}

function textOf(r: CliResult): string {
  const text = (r.result ?? '').trim()
  if (!text) throw new Error('empty response')
  return text
}

function structured<T extends z.ZodType>(r: CliResult, schema: T): z.infer<T> {
  const raw = r.structured_output ?? JSON.parse(r.result ?? 'null')
  return schema.parse(raw)
}

export async function triageClaude(input: TriageInput): Promise<TriageResult> {
  const schema = triageSchema()
  const r = await runCli({ system: TRIAGE_SYSTEM, prompt: triageUserMessage(input), schema: cliSchema(schema) })
  return finalizeTriage(structured(r, schema), input)
}

export async function runbookClaude(input: RunbookInput): Promise<string> {
  return textOf(await runCli({ system: RUNBOOK_SYSTEM, prompt: runbookUserMessage(input) }))
}

export async function oracleClaude(input: OracleInput): Promise<string> {
  // The CLI takes one prompt, so earlier turns are inlined as a transcript.
  const history = (input.history ?? []).slice(-10)
  const transcript = history.length
    ? `<conversation_so_far>\n${history.map((t) => `${t.role === 'user' ? 'Guardian' : 'Oracle'}: ${t.content}`).join('\n')}\n</conversation_so_far>\n\n`
    : ''
  return textOf(await runCli({ system: ORACLE_SYSTEM, prompt: transcript + oracleUserMessage(input) }))
}

export async function assigneeClaude(input: AssigneeInput): Promise<AssigneeResult> {
  const schema = assigneeSchema()
  const r = await runCli({ system: ASSIGNEE_SYSTEM, prompt: JSON.stringify(input), schema: cliSchema(schema) })
  return finalizeAssignee(structured(r, schema), input)
}
