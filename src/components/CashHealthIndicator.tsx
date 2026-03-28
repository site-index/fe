import { cn } from '@/lib/utils'

interface CashHealthProps {
    status: 'ok' | 'warning' | 'critical'
    label: string
    detail?: string
}

export default function CashHealthIndicator({
    status,
    label,
    detail,
}: CashHealthProps) {
    return (
        <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-5 shadow-sm">
            <div
                className={cn(
                    'h-14 w-14 rounded-full flex items-center justify-center text-lg font-black shrink-0',
                    status === 'ok' && 'bg-positive/15 text-positive',
                    status === 'warning' && 'bg-negative/10 text-negative/70',
                    status === 'critical' && 'bg-negative/15 text-negative'
                )}
            >
                {status === 'ok' ? 'OK' : status === 'warning' ? '!' : '!!'}
            </div>
            <div>
                <p className="text-lg font-bold">{label}</p>
                {detail && (
                    <p className="text-sm text-muted-foreground">{detail}</p>
                )}
            </div>
        </div>
    )
}
