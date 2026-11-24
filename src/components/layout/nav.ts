/**
 * @file Navigation model shared by the desktop Sidebar and the mobile TabBar.
 * @exports NAV_ITEMS, NavItem (type), visibleNav
 * @usedBy src/components/layout/Sidebar.tsx, src/components/layout/TabBar.tsx, UserMenu.tsx
 */
import { Gauge, LayoutGrid, MessageCircleQuestion, Radio, ScrollText, Swords, Trophy, type LucideIcon, RadioTower } from 'lucide-react'
import type { Guardian } from '#/lib/glitch.ts'

export type NavItem = {
  label: string
  icon: LucideIcon
  to: '/' | '/report' | '/mission' | '/radio' | '/oracle' | '/leaderboard' | '/council' | '/admin'
  commanderOnly?: boolean
  /** Shown directly in the mobile tab bar (others go in the user menu). */
  primary?: boolean
  /** Short label for the mobile tab bar (must fit 4 tabs + avatar at 360px). */
  short?: string
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', icon: LayoutGrid, to: '/', primary: true, short: 'Home' },
  { label: 'Report echo', icon: Radio, to: '/report', primary: true, short: 'Report' },
  { label: 'Mission control', icon: Gauge, to: '/mission' },
  { label: 'Radio desk', icon: RadioTower, to: '/radio' },
  { label: 'Oracle', icon: MessageCircleQuestion, to: '/oracle', primary: true },
  { label: 'Leaderboard', icon: Trophy, to: '/leaderboard', primary: true, short: 'Ranks' },
  { label: 'High Council', icon: ScrollText, to: '/council', commanderOnly: true },
  { label: 'Command deck', icon: Swords, to: '/admin', commanderOnly: true },
]

export const visibleNav = (me: Guardian | null): NavItem[] =>
  NAV_ITEMS.filter((i) => !i.commanderOnly || me?.role === 'commander')

