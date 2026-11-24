/**
 * @file Drizzle PostgreSQL schema: guardians, sessions, glitches (incl. game-mode hidden/sabotage),
 * echoes (incl. source + flag), sensor_readings.
 * @exports guardians, sessions, glitches, echoes, sensorReadings (drizzle tables)
 * @usedBy src/db/index.ts, src/db/seed.ts, src/server/*
 * @note Apply changes with `npm run db:push`. Timestamps are ISO 8601 text
 *   (UTC), so lexical order is chronological order and they serialize as-is.
 */
import { boolean, integer, pgTable, real, serial, text } from 'drizzle-orm/pg-core'
// Relative import: drizzle-kit loads this file and doesn't resolve the `#/` alias.
import { GLITCH_STATUSES, GLITCH_TYPES, ROLES, SEVERITIES } from '../lib/glitch.ts'

export const guardians = pgTable('guardians', {
  guardianId: text('guardian_id').primaryKey(),
  codename: text('codename').notNull().unique(),
  role: text('role', { enum: ROLES }).notNull(),
  /** scrypt hash "salt:hash"; null = passwordless quick-join defender. */
  passwordHash: text('password_hash'),
  /** Points for the leaderboard. */
  score: integer('score').notNull().default(0),
  createdAt: text('created_at').notNull(),
})

export const sessions = pgTable('sessions', {
  token: text('token').primaryKey(),
  guardianId: text('guardian_id')
    .notNull()
    .references(() => guardians.guardianId, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
})

export const glitches = pgTable('glitches', {
  glitchId: text('glitch_id').primaryKey(),
  status: text('status', { enum: GLITCH_STATUSES }).notNull(),
  description: text('description').notNull(),
  timestamp: text('timestamp').notNull(),
  type: text('type', { enum: GLITCH_TYPES }).notNull().default('UNKNOWN'),
  severity: text('severity', { enum: SEVERITIES }).notNull().default('medium'),
  districtId: text('district_id'),
  assigneeId: text('assignee_id').references(() => guardians.guardianId, { onDelete: 'set null' }),
  runbook: text('runbook'),
  updatedAt: text('updated_at').notNull(),
  /** Game mode: a sabotage glitch stays hidden until someone reports it (F33). */
  hidden: boolean('hidden').notNull().default(false),
  /** Game mode: created by the Desync's sabotage (not by an echo). */
  sabotage: boolean('sabotage').notNull().default(false),
})

export const echoes = pgTable('echoes', {
  echoId: text('echo_id').primaryKey(),
  glitchId: text('glitch_id').references(() => glitches.glitchId, { onDelete: 'set null' }),
  description: text('description').notNull(),
  timestamp: text('timestamp').notNull(),
  reportingGuardianId: text('reporting_guardian_id')
    .notNull()
    .references(() => guardians.guardianId, { onDelete: 'cascade' }),
  districtId: text('district_id'),
  moderation: text('moderation', { enum: ['ok', 'rejected'] }).notNull().default('ok'),
  moderationReason: text('moderation_reason'),
  imageUrl: text('image_url'),
  /** 'app' (phone/desktop form) or 'radio' (walkie-talkie via /radio, F31). */
  source: text('source', { enum: ['app', 'radio'] }).notNull().default('app'),
  /** 'unconfirmed' = sensors disagree with this report (game mode: a likely fake by the Desync). */
  flag: text('flag', { enum: ['unconfirmed'] }),
})

export const sensorReadings = pgTable('sensor_readings', {
  id: serial('id').primaryKey(),
  districtId: text('district_id').notNull(),
  magic: real('magic').notNull(),
  timestamp: text('timestamp').notNull(),
})
