import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import type { BoqItemRow } from '@/types/boq-item'

type MixRow = { id: string; name: string }

const MIX_NONE = '__none__'

type Props = {
    item: BoqItemRow
    mixes: MixRow[]
    disabled: boolean
    onChange: (boqItemId: string, mixDesignId: string | null) => void
}

export function BoqMixDesignSelect({ item, mixes, disabled, onChange }: Props) {
    return (
        <Select
            value={item.mixDesignId ?? MIX_NONE}
            disabled={disabled}
            onValueChange={(v) => {
                onChange(item.id, v === MIX_NONE ? null : v)
            }}
        >
            <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value={MIX_NONE}>Sin vínculo</SelectItem>
                {mixes.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                        {m.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
