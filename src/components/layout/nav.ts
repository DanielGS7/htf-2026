/**
 * @file Navigation model shared by the desktop Sidebar and the mobile TabBar.
 * @exports NAV_ITEMS, NavItem (type), visibleNav
 * @usedBy src/components/layout/Sidebar.tsx, src/components/layout/TabBar.tsx, UserMenu.tsx
 */
import { Gauge, LayoutGrid, MessageCircleQuestion, Radio, ScrollText, Swords, Trophy, type LucideIcon } from 'lucide-react'
import type { Guardian } from '#/lib/glitch.ts'

export type NavItem = {
  label: string
  icon: LucideIcon
  to: '/' | '/report' | '/mission' | '/oracle' | '/leaderboard' | '/council' | '/admin'
  commanderOnly?: boolean
  /** Shown directly in the mobile tab bar (others go in the user menu). */
  primary?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', icon: LayoutGrid, to: '/', primary: true },
  { label: 'Report echo', icon: Radio, to: '/report', primary: true },
  { label: 'Mission control', icon: Gauge, to: '/mission' },
  { label: 'Oracle', icon: MessageCircleQuestion, to: '/oracle', primary: true },
  { label: 'Leaderboard', icon: Trophy, to: '/leaderboard', primary: true },
  { label: 'High Council', icon: ScrollText, to: '/council', commanderOnly: true },
  { label: 'Command deck', icon: Swords, to: '/admin', commanderOnly: true },
]

export const visibleNav = (me: Guardian | null): NavItem[] =>
  NAV_ITEMS.filter((i) => !i.commanderOnly || me?.role === 'commander')

