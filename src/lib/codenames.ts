/**
 * @file Fantasy codename generator for quick-join guardians ("Swift Lantern").
 * @exports generateCodename
 * @usedBy src/lib/auth.functions.ts
 */
const ADJECTIVES = [
  'Swift', 'Silent', 'Brave', 'Gilded', 'Lunar', 'Ember', 'Frost', 'Verdant', 'Crimson', 'Azure',
  'Wandering', 'Radiant', 'Hollow', 'Stormborn', 'Starlit', 'Ancient', 'Clever', 'Fierce', 'Gentle', 'Misty',
  'Twilight', 'Solar', 'Arcane', 'Iron', 'Velvet', 'Wild', 'Noble', 'Shimmering', 'Dusk', 'Golden',
]
const NOUNS = [
  'Lantern', 'Falcon', 'Rune', 'Warden', 'Comet', 'Griffin', 'Willow', 'Phoenix', 'Raven',
  'Wisp', 'Talisman', 'Fox', 'Beacon', 'Drake', 'Sage', 'Compass', 'Thistle', 'Oracle', 'Cipher',
  'Pilgrim', 'Spark', 'Harbor', 'Quill', 'Wyrm', 'Lynx', 'Aegis', 'Meteor', 'Herald', 'Owl',
]

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

/** Random "Adjective Noun". Pass `attempt > 2` to append a number and escape collisions. */
export function generateCodename(attempt = 0): string {
  const base = `${pick(ADJECTIVES)} ${pick(NOUNS)}`
  return attempt > 2 ? `${base} ${Math.floor(10 + Math.random() * 90)}` : base
}
