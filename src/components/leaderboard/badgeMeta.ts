/**
 * @file Badge catalogue for the leaderboard (client + server safe, no imports).
 * Ids are computed server-side in field.functions.ts; this file only describes them.
 * @exports BADGE_META, BadgeId (type)
 * @usedBy src/lib/field.functions.ts, src/components/leaderboard/BadgeChip.tsx
 */
export type BadgeId = 'first-responder' | 'storm-chaser' | 'fixer' | 'sharp-eye' | 'commander'

export const BADGE_META: Record<BadgeId, { label: string; hint: string; icon: string; color: string }> = {
  'first-responder': { label: 'First Responder', hint: 'Opened a brand-new glitch: you were first to report it.', icon: 'Siren', color: '#f59e0b' },
  'storm-chaser': { label: 'Storm Chaser', hint: 'Reported 5 or more echoes.', icon: 'CloudLightning', color: '#ec4899' },
  fixer: { label: 'Fixer', hint: 'Got a glitch assigned to you and saw it through to FIXED.', icon: 'Wrench', color: '#34d399' },
  'sharp-eye': { label: 'Sharp Eye', hint: 'At least 3 echoes and none rejected by moderation.', icon: 'Eye', color: '#38bdf8' },
  commander: { label: 'Commander', hint: 'Leads the guardians of Achrona.', icon: 'Crown', color: '#a78bfa' },
}
