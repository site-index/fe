import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import type { BudgetLineRow } from '@/types/budget-line'

type YieldOptionRow = {
    id: string
    name: string
    workCategoryId: string
    workCategoryName: string
}

const YIELD_NONE = '__none__'

function groupYieldsByCategory(
    yields: YieldOptionRow[]
): Map<string, YieldOptionRow[]> {
    const map = new Map<string, YieldOptionRow[]>()
    for (const y of yields) {
        const key = y.workCategoryName
        const list = map.get(key)
        if (list) {
            list.push(y)
        } else {
            map.set(key, [y])
        }
    }
    return map
}

type Props = {
    line: BudgetLineRow
    yields: YieldOptionRow[]
    disabled: boolean
    onChange: (budgetLineId: string, itemYieldId: string | null) => void
    /** Render the menu inside this node (e.g. sheet content) so touch scroll works with dialog scroll lock. */
    portalContainer?: HTMLElement | null
}

export function BudgetLineItemYieldSelect({
    line,
    yields,
    disabled,
    onChange,
    portalContainer,
}: Props) {
    const grouped = groupYieldsByCategory(yields)
    const groupKeys = [...grouped.keys()].sort((a, b) =>
        a.localeCompare(b, 'es-AR')
    )

    return (
        <Select
            value={line.itemYieldId ?? YIELD_NONE}
            disabled={disabled}
            onValueChange={(v) => {
                onChange(line.id, v === YIELD_NONE ? null : v)
            }}
        >
            <SelectTrigger
                className="h-8 text-xs"
                aria-label="Rendimiento vinculado"
            >
                <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent container={portalContainer ?? undefined}>
                <SelectItem value={YIELD_NONE}>Sin rendimiento</SelectItem>
                {groupKeys.map((categoryName) => (
                    <SelectGroup key={categoryName}>
                        <SelectLabel className="text-xs">
                            {categoryName}
                        </SelectLabel>
                        {grouped.get(categoryName)!.map((y) => (
                            <SelectItem key={y.id} value={y.id}>
                                {y.name}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                ))}
            </SelectContent>
        </Select>
    )
}
