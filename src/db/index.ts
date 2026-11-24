/**
 * @file PostgreSQL connection pool (node-postgres) wrapped in Drizzle. SERVER-ONLY.
 * Reads DATABASE_URL (default: the docker-compose database).
 * All queries are async: `await db.select()...`, use `.returning()` for inserted rows.
 * @exports db, DEFAULT_DATABASE_URL
 */
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema.ts'

export const DEFAULT_DATABASE_URL = 'postgres://guardian:guardian@localhost:5432/achrona'

// globalThis keeps one pool across Vite HMR reloads.
const g = globalThis as unknown as { __ggPool?: Pool }
const pool = (g.__ggPool ??= new Pool({ connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL, max: 10 }))

export const db = drizzle(pool, { schema })
