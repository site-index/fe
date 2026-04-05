import { ChevronRight } from 'lucide-react'

import type { BudgetLineRow } from '@/types/budget-line'

interface BudgetLineDesktopRowProps {
    line: BudgetLineRow
    categoryNumber: number | null
    onOpen: (l: BudgetLineRow) => void
}

export default function BudgetLineDesktopRow({
    line,
    categoryNumber,
    onOpen,
}: BudgetLineDesktopRowProps) {
    const code =
        categoryNumber != null
            ? `${categoryNumber}.${line.itemNumber}`
            : `—.${line.itemNumber}`

    return (
        <button
            type="button"
            onClick={() => onOpen(line)}
            className="hidden w-full grid-cols-[90px_minmax(260px,1.6fr)_90px_110px_repeat(3,110px)_130px_130px_36px] items-center gap-2 border-b border-border/50 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40 md:grid print:grid-cols-[70px_minmax(220px,1.6fr)_60px_80px_repeat(3,80px)_90px_90px_24px] print:gap-1 print:px-2 print:py-1.5"
        >
            <span className="font-mono text-xs text-muted-foreground">
                {code}
            </span>
            <span className={`truncate ${line.flaky ? 'data-flaky' : ''}`}>
                {line.description}
                {line.usesUnitPriceOverride ? (
                    <span className="ml-2 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-700 print:hidden">
                        Costo manual
                    </span>
                ) : null}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
                {line.measureUnit?.name ?? '—'}
            </span>
            <span className="font-mono text-xs text-right">
                {line.quantity.toLocaleString('es-AR')}
            </span>
            <span className="font-mono text-xs text-right">
                ${line.amountMaterial.toLocaleString('es-AR')}
            </span>
            <span className="font-mono text-xs text-right">
                ${line.amountLabor.toLocaleString('es-AR')}
            </span>
            <span className="font-mono text-xs text-right">
                ${line.amountEquipment.toLocaleString('es-AR')}
            </span>
            <span
                className={`font-mono text-xs text-right ${line.flaky ? 'data-flaky' : ''}`}
            >
                ${line.unitPrice.toLocaleString('es-AR')}
            </span>
            <span className="font-mono text-xs font-semibold text-right">
                ${line.total.toLocaleString('es-AR')}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground print:hidden" />
        </button>
    )
}
