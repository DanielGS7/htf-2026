import { Settings, User } from 'lucide-react'
import { IconButton } from '#/components/ui/IconButton'
import { ThemeToggle } from './ThemeToggle'

export function Topbar() {
  return (
    <header className="flex items-center justify-end gap-6 px-8 py-7">
      <div className="flex items-center gap-4">
        <div className="flex items-center rounded-full bg-subtle px-2 py-1.5">
          <ThemeToggle />
          <span className="h-5 w-px bg-line" />
          <IconButton aria-label="Settings" className="size-9">
            <Settings className="size-5" strokeWidth={1.5} />
          </IconButton>
        </div>
        <button
          type="button"
          aria-label="User menu"
          className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-md shadow-amber-900/25 inset-shadow-[0_1px_0_rgb(255_255_255/0.22)]"
        >
          <User className="size-7" strokeWidth={1.5} />
        </button>
      </div>
    </header>
  )
}
