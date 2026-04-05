import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

import type { BudgetLineRow } from '@/types/budget-line'

import BudgetLineDesktopRow from './BudgetLineDesktopRow'
import BudgetLineMobileRow from './BudgetLineMobileRow'
import type { BudgetSection } from './helpers'
import { subtotalFromLines } from './helpers'

interface BudgetSectionBlockProps {
    section: BudgetSection
    isCollapsed: boolean
    onToggle: () => void
    onOpen: (line: BudgetLineRow) => void
    onAdd: ReactNode
}

export default function BudgetSectionBlock({
    section,
    isCollapsed,
    onToggle,
    onOpen,
    onAdd,
}: BudgetSectionBlockProps) {
    const sectionSubtotal = subtotalFromLines(section.lines)
    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 bg-muted/50 px-3 py-2.5 print:px-2 print:py-1">
                <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-left active:bg-muted/70 rounded-md md:hidden"
                    onClick={onToggle}
                    aria-expanded={!isCollapsed}
                    aria-label={`Alternar rubro ${section.name}`}
                >
                    <ChevronRight
                        className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                            isCollapsed ? '' : 'rotate-90'
                        }`}
                    />
                    <span className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {section.name}
                    </span>
                </button>
                <span className="hidden min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground md:inline">
                    {section.name}
                </span>
                <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold">
                        ${sectionSubtotal.toLocaleString('es-AR')}
                    </span>
                    {onAdd}
                </div>
            </div>
            {section.lines.length === 0 ? (
                <p className="border-b border-border/50 px-3 py-2 text-xs text-muted-foreground print:px-2 print:py-1.5">
                    Sin ítems todavía en este rubro.
                </p>
            ) : (
                section.lines.map((line) => (
                    <div key={line.id}>
                        <BudgetLineDesktopRow
                            line={line}
                            categoryNumber={section.categoryNumber}
                            onOpen={onOpen}
                        />
                        {isCollapsed ? null : (
                            <BudgetLineMobileRow
                                line={line}
                                showBreakdown
                                onOpen={onOpen}
                            />
                        )}
                    </div>
                ))
            )}
        </div>
    )
}
