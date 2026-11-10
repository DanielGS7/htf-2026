import { Moon, Sun } from 'lucide-react'
import { IconButton } from '#/components/ui/IconButton'
import { useTheme } from '#/lib/theme'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const label =
    theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'

  return (
    <IconButton
      aria-label={label}
      title={label}
      onClick={toggle}
      className="size-9"
    >
      {/* Icon is chosen via CSS so it's right before hydration. */}
      <Sun className="hidden size-5 dark:block" strokeWidth={1.5} />
      <Moon className="size-5 dark:hidden" strokeWidth={1.5} />
    </IconButton>
  )
}
