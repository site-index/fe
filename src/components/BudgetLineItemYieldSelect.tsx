import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import type { BudgetLineRow } from '@/types/budget-line'

type YieldOptionRow = { id: string; name: string }

const YIELD_NONE = '__none__'

type Props = {
    line: BudgetLineRow
    yields: YieldOptionRow[]
    disabled: boolean
    onChange: (budgetLineId: string, itemYieldId: string | null) => void
}

export function BudgetLineItemYieldSelect({
    line,
    yields,
    disabled,
    onChange,
}: Props) {
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
            <SelectContent>
                <SelectItem value={YIELD_NONE}>Sin rendimiento</SelectItem>
                {yields.map((y) => (
                    <SelectItem key={y.id} value={y.id}>
                        {y.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
