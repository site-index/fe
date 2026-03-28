import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { startTransition, useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

type ThemeToggleProps = {
    className?: string
}

export default function ThemeToggle({ className }: ThemeToggleProps) {
    const { resolvedTheme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        startTransition(() => {
            setMounted(true)
        })
    }, [])

    return (
        <button
            type="button"
            onClick={() =>
                setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
            }
            className={cn(
                'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                className
            )}
            aria-label={
                mounted && resolvedTheme === 'dark'
                    ? 'Switch to light theme'
                    : 'Switch to dark theme'
            }
        >
            {mounted && resolvedTheme === 'dark' ? (
                <Sun className="h-4 w-4" />
            ) : (
                <Moon className="h-4 w-4" />
            )}
        </button>
    )
}
