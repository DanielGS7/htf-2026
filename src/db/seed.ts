/**
 * @file `npm run db:seed` — wipe + refill the DB with demo guardians, glitches,
 * echoes and healthy sensor readings. Safe to re-run.
 * Logins: commander "Nova" / password "achrona", defender "Ember" / "achrona".
 */
import { scryptSync, randomBytes } from 'node:crypto'
import { db } from './index.ts'
import { echoes, glitches, guardians, sensorReadings, sessions } from './schema.ts'
import { DISTRICTS } from '../lib/glitch.ts'

function hash(pw: string) {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(pw, salt, 32).toString('hex')}`
}

const now = new Date().toISOString()
const guardianRows: (typeof guardians.$inferInsert)[] = [
  { guardianId: 'GD-0001', codename: 'Nova', role: 'commander', passwordHash: hash('achrona'), score: 42, createdAt: now },
  { guardianId: 'GD-0002', codename: 'Ember', role: 'defender', passwordHash: hash('achrona'), score: 27, createdAt: now },
  { guardianId: 'GD-0003', codename: 'Quill', role: 'defender', passwordHash: hash('achrona'), score: 15, createdAt: now },
]

const glitchRows: (typeof glitches.$inferInsert)[] = [
  { glitchId: 'GL-0142', status: 'LEAKED', description: 'Time loop detected near the eastern clock tower', timestamp: '2026-11-10T13:42:00Z', type: 'TIME_LOOP', severity: 'high', districtId: 'clocktower', updatedAt: '2026-11-10T13:42:00Z' },
  { glitchId: 'GL-0141', status: 'ASSESSING', description: 'Magic reserves dropping faster than expected', timestamp: '2026-11-10T11:05:00Z', type: 'MAGIC_DRAIN', severity: 'medium', districtId: 'citadel', assigneeId: 'GD-0002', updatedAt: '2026-11-10T11:05:00Z' },
  { glitchId: 'GL-0139', status: 'CONTAINING', description: 'Portal flicker in the archive vaults', timestamp: '2026-11-09T22:17:00Z', type: 'PORTAL_FLICKER', severity: 'medium', districtId: 'archives', assigneeId: 'GD-0003', updatedAt: '2026-11-09T22:17:00Z' },
  { glitchId: 'GL-0137', status: 'FIXED', description: 'Echo sensors reporting duplicate signals', timestamp: '2026-11-08T08:30:00Z', type: 'ECHO_STORM', severity: 'low', districtId: 'harbor', updatedAt: '2026-11-08T08:30:00Z' },
]

const echoRows: (typeof echoes.$inferInsert)[] = [
  { echoId: 'EC-0001', glitchId: 'GL-0142', description: 'The clock tower bell rang 12 times... three times in a row', timestamp: '2026-11-10T13:42:00Z', reportingGuardianId: 'GD-0002', districtId: 'clocktower' },
  { echoId: 'EC-0002', glitchId: 'GL-0142', description: 'Same pigeons flying past the tower every minute', timestamp: '2026-11-10T13:50:00Z', reportingGuardianId: 'GD-0003', districtId: 'clocktower' },
  { echoId: 'EC-0003', glitchId: 'GL-0141', description: 'Citadel crystals dimming, mana gauges at 60%', timestamp: '2026-11-10T11:05:00Z', reportingGuardianId: 'GD-0002', districtId: 'citadel' },
  { echoId: 'EC-0004', glitchId: 'GL-0139', description: 'Vault door 7 opens into the harbor for a split second', timestamp: '2026-11-09T22:17:00Z', reportingGuardianId: 'GD-0003', districtId: 'archives' },
  { echoId: 'EC-0005', glitchId: 'GL-0137', description: 'Harbor sensors double-reporting, fixed after recalibration', timestamp: '2026-11-08T08:30:00Z', reportingGuardianId: 'GD-0002', districtId: 'harbor' },
]

await db.transaction(async (tx) => {
  await tx.delete(sessions)
  await tx.delete(echoes)
  await tx.delete(sensorReadings)
  await tx.delete(glitches)
  await tx.delete(guardians)
  await tx.insert(guardians).values(guardianRows)
  await tx.insert(glitches).values(glitchRows)
  await tx.insert(echoes).values(echoRows)
  await tx.insert(sensorReadings).values(DISTRICTS.map((d) => ({ districtId: d.id, magic: 95 + Math.random() * 5, timestamp: now })))
})

console.log(`Seeded ${guardianRows.length} guardians, ${glitchRows.length} glitches, ${echoRows.length} echoes.`)
process.exit(0)
