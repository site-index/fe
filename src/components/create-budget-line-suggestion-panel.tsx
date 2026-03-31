import { useEffect } from 'react'

import {
    budgetLineSuggestionRowKey,
    type SuggestionRow,
} from '@/components/use-budget-line-description-suggestions'

export type CreateBudgetLineSuggestionPanelProps = {
    listboxId: string
    rows: SuggestionRow[]
    activeIndex: number
    onActiveIndexChange: (index: number) => void
    onPick: (row: SuggestionRow) => void
}

/** Inline suggestion list for combobox-style description field (keyboard + mouse). */
export function CreateBudgetLineSuggestionPanel({
    listboxId,
    rows,
    activeIndex,
    onActiveIndexChange,
    onPick,
}: CreateBudgetLineSuggestionPanelProps) {
    useEffect(() => {
        if (activeIndex >= rows.length && rows.length > 0) {
            onActiveIndexChange(rows.length - 1)
        }
        if (rows.length === 0 && activeIndex !== -1) {
            onActiveIndexChange(-1)
        }
    }, [rows.length, activeIndex, onActiveIndexChange])

    if (rows.length === 0) {
        return (
            <div className="px-2 py-3 text-xs text-muted-foreground">
                No hay coincidencias. Seguí escribiendo o elegí texto libre.
            </div>
        )
    }

    return (
        <ul
            id={listboxId}
            role="listbox"
            aria-label="Sugerencias de biblioteca"
            className="max-h-[min(280px,50vh)] overflow-y-auto overscroll-contain py-1"
        >
            {rows.map((row, index) => {
                const optionId = `${listboxId}-option-${budgetLineSuggestionRowKey(row)}`
                const isActive = index === activeIndex
                return (
                    <li
                        key={budgetLineSuggestionRowKey(row)}
                        role="presentation"
                    >
                        <button
                            id={optionId}
                            type="button"
                            role="option"
                            aria-selected={isActive}
                            className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-accent ${isActive ? 'bg-accent' : ''}`}
                            onMouseDown={(event) => {
                                event.preventDefault()
                                onPick(row)
                            }}
                            onMouseEnter={() => onActiveIndexChange(index)}
                        >
                            <span className="text-sm font-medium">
                                {row.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {row.workCategoryName}
                                {row.kind === 'yield'
                                    ? ' · Rendimiento'
                                    : ' · Catálogo'}
                            </span>
                            {row.kind === 'yield' &&
                            row.description.trim() !== '' ? (
                                <span className="text-xs text-muted-foreground line-clamp-2">
                                    {row.description}
                                </span>
                            ) : null}
                        </button>
                    </li>
                )
            })}
        </ul>
    )
}
