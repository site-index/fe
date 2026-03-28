import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import type { BudgetLineRow } from '@/types/budget-line'

type MixRow = { id: string; name: string }

const MIX_NONE = '__none__'

type Props = {
    line: BudgetLineRow
    mixes: MixRow[]
    disabled: boolean
    onChange: (budgetLineId: string, mixDesignId: string | null) => void
}

export function BudgetLineMixDesignSelect({
    line,
    mixes,
    disabled,
    onChange,
}: Props) {
    return (
        <Select
            value={line.mixDesignId ?? MIX_NONE}
            disabled={disabled}
            onValueChange={(v) => {
                onChange(line.id, v === MIX_NONE ? null : v)
            }}
        >
            <SelectTrigger
                className="h-8 text-xs"
                aria-label="Mezcla vinculada"
            >
                <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value={MIX_NONE}>Sin mezcla</SelectItem>
                {mixes.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                        {m.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
