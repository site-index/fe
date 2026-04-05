import { ChevronRight } from 'lucide-react'

import type { BudgetLineRow } from '@/types/budget-line'

interface BudgetLineMobileRowProps {
    line: BudgetLineRow
    showBreakdown: boolean
    onOpen: (l: BudgetLineRow) => void
}

export default function BudgetLineMobileRow({
    line,
    showBreakdown,
    onOpen,
}: BudgetLineMobileRowProps) {
    return (
        <div className="border-b border-border/50 px-3 py-3 md:hidden">
            <button
                type="button"
                onClick={() => onOpen(line)}
                className="w-full space-y-2 rounded-md p-2 text-left transition-colors hover:bg-muted/40 active:bg-muted/60"
            >
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                        <p
                            className={`line-clamp-2 text-sm ${line.flaky ? 'data-flaky' : ''}`}
                        >
                            {line.description}
                            {line.usesUnitPriceOverride ? (
                                <span className="ml-2 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-700">
                                    Costo manual
                                </span>
                            ) : null}
                        </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>

                <div className="grid grid-cols-4 gap-x-2 gap-y-1 text-xs">
                    <p className="text-muted-foreground">Cant</p>
                    <p className="text-muted-foreground text-center">U</p>
                    <p className="text-muted-foreground text-right">PU</p>
                    <p className="text-muted-foreground text-right">Tot</p>
                    <p className="font-mono">
                        {line.quantity.toLocaleString('es-AR')}
                    </p>
                    <p className="font-mono text-center">
                        {line.measureUnit?.name ?? '—'}
                    </p>
                    <p
                        className={`font-mono text-right ${line.flaky ? 'data-flaky' : ''}`}
                    >
                        ${line.unitPrice.toLocaleString('es-AR')}
                    </p>
                    <p className="font-mono font-semibold text-right">
                        ${line.total.toLocaleString('es-AR')}
                    </p>
                </div>
            </button>

            <details className="mt-1 rounded-md border border-border/60 bg-muted/20 px-2 py-1">
                <summary className="cursor-pointer text-xs text-muted-foreground">
                    Ver detalle de costos
                </summary>
                <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                    <div className="space-y-0.5">
                        <p className="text-muted-foreground">MAT</p>
                        <p className="font-mono">
                            {showBreakdown
                                ? `$${line.amountMaterial.toLocaleString('es-AR')}`
                                : '—'}
                        </p>
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-muted-foreground">MO</p>
                        <p className="font-mono">
                            {showBreakdown
                                ? `$${line.amountLabor.toLocaleString('es-AR')}`
                                : '—'}
                        </p>
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-muted-foreground">EQ</p>
                        <p className="font-mono">
                            {showBreakdown
                                ? `$${line.amountEquipment.toLocaleString('es-AR')}`
                                : '—'}
                        </p>
                    </div>
                </div>
            </details>
        </div>
    )
}
