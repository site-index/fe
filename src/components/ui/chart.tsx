import {
    type ComponentProps,
    type ComponentType,
    createContext,
    type CSSProperties,
    forwardRef,
    type ReactNode,
    useContext,
    useId,
    useMemo,
} from 'react'
import type { LegendPayload, TooltipContentProps } from 'recharts'
import * as RechartsPrimitive from 'recharts'

import { cn } from '@/lib/utils'

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: '', dark: '.dark' } as const

export type ChartConfig = {
    [k in string]: {
        label?: ReactNode
        icon?: ComponentType
    } & (
        | { color?: string; theme?: never }
        | { color?: never; theme: Record<keyof typeof THEMES, string> }
    )
}

type ChartContextProps = {
    config: ChartConfig
}

const ChartContext = createContext<ChartContextProps | null>(null)

function useChart() {
    const context = useContext(ChartContext)

    if (!context) {
        throw new Error('useChart must be used within a <ChartContainer />')
    }

    return context
}

const ChartContainer = forwardRef<
    HTMLDivElement,
    ComponentProps<'div'> & {
        config: ChartConfig
        children: ComponentProps<
            typeof RechartsPrimitive.ResponsiveContainer
        >['children']
    }
>(({ id, className, children, config, ...props }, ref) => {
    const uniqueId = useId()
    const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`

    return (
        <ChartContext.Provider value={{ config }}>
            <div
                data-chart={chartId}
                ref={ref}
                className={cn(
                    "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
                    className
                )}
                {...props}
            >
                <ChartStyle id={chartId} config={config} />
                <RechartsPrimitive.ResponsiveContainer>
                    {children}
                </RechartsPrimitive.ResponsiveContainer>
            </div>
        </ChartContext.Provider>
    )
})
ChartContainer.displayName = 'Chart'

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
    const colorConfig = Object.entries(config).filter(
        ([_, config]) => config.theme || config.color
    )

    if (!colorConfig.length) {
        return null
    }

    return (
        <style
            dangerouslySetInnerHTML={{
                __html: Object.entries(THEMES)
                    .map(
                        ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
    .map(([key, itemConfig]) => {
        const color =
            itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
            itemConfig.color
        return color ? `  --color-${key}: ${color};` : null
    })
    .join('\n')}
}
`
                    )
                    .join('\n'),
            }}
        />
    )
}

const ChartTooltip = RechartsPrimitive.Tooltip

function isChartPayloadRecord(
    value: unknown
): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function resolveConfigLabelKeyFromPayload(
    payload: Record<string, unknown>,
    key: string
): string {
    const direct = payload[key]
    if (typeof direct === 'string') {
        return direct
    }
    const nested = payload.payload
    if (isChartPayloadRecord(nested)) {
        const nestedVal = nested[key]
        if (typeof nestedVal === 'string') {
            return nestedVal
        }
    }
    return key
}

function resolveTooltipLabelDisplayValue(
    labelKey: string | undefined,
    label: unknown,
    config: ChartConfig,
    itemConfig: ChartConfig[string] | undefined
): ReactNode {
    if (!labelKey && typeof label === 'string') {
        return config[label as keyof typeof config]?.label || label
    }
    return itemConfig?.label
}

function buildTooltipLabelElement(
    config: ChartConfig,
    hideLabel: boolean,
    payload: ReadonlyArray<{ dataKey?: unknown; name?: unknown }> | undefined,
    labelKey: string | undefined,
    label: unknown,
    labelFormatter:
        | ((label: unknown, payload: unknown) => ReactNode)
        | undefined,
    labelClassName: string | undefined
): ReactNode {
    if (hideLabel || !payload?.length) {
        return null
    }

    const [item] = payload
    const key = `${labelKey || item.dataKey || item.name || 'value'}`
    const itemConfig = getPayloadConfigFromPayload(config, item, key)
    const value = resolveTooltipLabelDisplayValue(
        labelKey,
        label,
        config,
        itemConfig
    )

    if (labelFormatter) {
        return (
            <div className={cn('font-medium', labelClassName)}>
                {labelFormatter(value, payload)}
            </div>
        )
    }

    if (!value) {
        return null
    }

    return <div className={cn('font-medium', labelClassName)}>{value}</div>
}

type TooltipPayloadEntry = {
    dataKey?: unknown
    name?: unknown
    value?: unknown
    payload?: Record<string, unknown>
    color?: string
}

function ChartTooltipSwatch({
    itemConfig,
    hideIndicator,
    indicator,
    nestLabel,
    indicatorColor,
}: {
    itemConfig: ChartConfig[string] | undefined
    hideIndicator: boolean
    indicator: 'line' | 'dot' | 'dashed'
    nestLabel: boolean
    indicatorColor: string | undefined
}) {
    if (itemConfig?.icon) {
        return <itemConfig.icon />
    }
    if (hideIndicator) {
        return null
    }
    return (
        <div
            className={cn(
                'shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]',
                {
                    'h-2.5 w-2.5': indicator === 'dot',
                    'w-1': indicator === 'line',
                    'w-0 border-[1.5px] border-dashed bg-transparent':
                        indicator === 'dashed',
                    'my-0.5': nestLabel && indicator === 'dashed',
                }
            )}
            style={
                {
                    '--color-bg': indicatorColor,
                    '--color-border': indicatorColor,
                } as CSSProperties
            }
        />
    )
}

function ChartTooltipPayloadDefaultCells({
    itemConfig,
    item,
    indicator,
    hideIndicator,
    nestLabel,
    tooltipLabel,
    indicatorColor,
}: {
    itemConfig: ChartConfig[string] | undefined
    item: TooltipPayloadEntry
    indicator: 'line' | 'dot' | 'dashed'
    hideIndicator: boolean
    nestLabel: boolean
    tooltipLabel: ReactNode
    indicatorColor: string | undefined
}) {
    return (
        <>
            <ChartTooltipSwatch
                itemConfig={itemConfig}
                hideIndicator={hideIndicator}
                indicator={indicator}
                nestLabel={nestLabel}
                indicatorColor={indicatorColor}
            />
            <div
                className={cn(
                    'flex flex-1 justify-between leading-none',
                    nestLabel ? 'items-end' : 'items-center'
                )}
            >
                <div className="grid gap-1.5">
                    {nestLabel ? tooltipLabel : null}
                    <span className="text-muted-foreground">
                        {itemConfig?.label ??
                            (item.name != null ? String(item.name) : '')}
                    </span>
                </div>
                {item.value ? (
                    <span className="font-mono font-medium tabular-nums text-foreground">
                        {item.value.toLocaleString()}
                    </span>
                ) : null}
            </div>
        </>
    )
}

type ChartTooltipPayloadRowProps = {
    item: TooltipPayloadEntry
    index: number
    config: ChartConfig
    nameKey: string | undefined
    color: string | undefined
    indicator: 'line' | 'dot' | 'dashed'
    hideIndicator: boolean
    nestLabel: boolean
    formatter:
        | ((
              value: unknown,
              name: unknown,
              item: unknown,
              index: number,
              payload: unknown
          ) => ReactNode)
        | undefined
    tooltipLabel: ReactNode
}

function tooltipPayloadRowClassName(
    indicator: 'line' | 'dot' | 'dashed'
): string {
    return cn(
        'flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground',
        indicator === 'dot' && 'items-center'
    )
}

function tooltipIndicatorColor(
    color: string | undefined,
    item: TooltipPayloadEntry
): string | undefined {
    if (color) {
        return color
    }
    const fill = item.payload?.fill
    if (typeof fill === 'string') {
        return fill
    }
    return typeof item.color === 'string' ? item.color : undefined
}

function tooltipPayloadUsesFormatter(
    formatter: ChartTooltipPayloadRowProps['formatter'],
    item: TooltipPayloadEntry
): boolean {
    return Boolean(formatter && item.value !== undefined && item.name)
}

function ChartTooltipPayloadRow({
    item,
    index,
    config,
    nameKey,
    color,
    indicator,
    hideIndicator,
    nestLabel,
    formatter,
    tooltipLabel,
}: ChartTooltipPayloadRowProps) {
    const key = `${nameKey || item.name || item.dataKey || 'value'}`
    const itemConfig = getPayloadConfigFromPayload(config, item, key)
    const indicatorColor = tooltipIndicatorColor(color, item)
    const useFormatter = tooltipPayloadUsesFormatter(formatter, item)

    return (
        <div className={tooltipPayloadRowClassName(indicator)}>
            {useFormatter ? (
                formatter!(item.value, item.name, item, index, item.payload)
            ) : (
                <ChartTooltipPayloadDefaultCells
                    itemConfig={itemConfig}
                    item={item}
                    indicator={indicator}
                    hideIndicator={hideIndicator}
                    nestLabel={nestLabel}
                    tooltipLabel={tooltipLabel}
                    indicatorColor={indicatorColor}
                />
            )}
        </div>
    )
}

const ChartTooltipContent = forwardRef<
    HTMLDivElement,
    ComponentProps<'div'> &
        Partial<TooltipContentProps> & {
            hideLabel?: boolean
            hideIndicator?: boolean
            indicator?: 'line' | 'dot' | 'dashed'
            nameKey?: string
            labelKey?: string
        }
>(
    (
        {
            active,
            payload,
            className,
            indicator = 'dot',
            hideLabel = false,
            hideIndicator = false,
            label,
            labelFormatter,
            labelClassName,
            formatter,
            color,
            nameKey,
            labelKey,
        },
        ref
    ) => {
        const { config } = useChart()

        const tooltipLabel = useMemo(
            () =>
                buildTooltipLabelElement(
                    config,
                    hideLabel,
                    payload,
                    labelKey,
                    label,
                    labelFormatter,
                    labelClassName
                ),
            [
                label,
                labelFormatter,
                payload,
                hideLabel,
                labelClassName,
                config,
                labelKey,
            ]
        )

        if (!active || !payload?.length) {
            return null
        }

        const nestLabel = payload.length === 1 && indicator !== 'dot'

        return (
            <div
                ref={ref}
                className={cn(
                    'grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl',
                    className
                )}
            >
                {!nestLabel ? tooltipLabel : null}
                <div className="grid gap-1.5">
                    {payload.map((item, index) => (
                        <ChartTooltipPayloadRow
                            key={String(item.dataKey)}
                            item={item as TooltipPayloadEntry}
                            index={index}
                            config={config}
                            nameKey={nameKey}
                            color={color}
                            indicator={indicator}
                            hideIndicator={hideIndicator}
                            nestLabel={nestLabel}
                            formatter={formatter}
                            tooltipLabel={tooltipLabel}
                        />
                    ))}
                </div>
            </div>
        )
    }
)
ChartTooltipContent.displayName = 'ChartTooltip'

const ChartLegend = RechartsPrimitive.Legend

const ChartLegendContent = forwardRef<
    HTMLDivElement,
    ComponentProps<'div'> & {
        hideIcon?: boolean
        nameKey?: string
        payload?: LegendPayload[]
        verticalAlign?: 'top' | 'bottom' | 'middle'
    }
>(
    (
        {
            className,
            hideIcon = false,
            payload,
            verticalAlign = 'bottom',
            nameKey,
        },
        ref
    ) => {
        const { config } = useChart()

        if (!payload?.length) {
            return null
        }

        return (
            <div
                ref={ref}
                className={cn(
                    'flex items-center justify-center gap-4',
                    verticalAlign === 'top' ? 'pb-3' : 'pt-3',
                    className
                )}
            >
                {payload.map((item) => {
                    const key = `${nameKey || item.dataKey || 'value'}`
                    const itemConfig = getPayloadConfigFromPayload(
                        config,
                        item,
                        key
                    )

                    return (
                        <div
                            key={item.value}
                            className={cn(
                                'flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground'
                            )}
                        >
                            {itemConfig?.icon && !hideIcon ? (
                                <itemConfig.icon />
                            ) : (
                                <div
                                    className="h-2 w-2 shrink-0 rounded-[2px]"
                                    style={{
                                        backgroundColor: item.color,
                                    }}
                                />
                            )}
                            {itemConfig?.label}
                        </div>
                    )
                })}
            </div>
        )
    }
)
ChartLegendContent.displayName = 'ChartLegend'

function getPayloadConfigFromPayload(
    config: ChartConfig,
    payload: unknown,
    key: string
) {
    if (!isChartPayloadRecord(payload)) {
        return undefined
    }
    const configLabelKey = resolveConfigLabelKeyFromPayload(payload, key)
    return configLabelKey in config
        ? config[configLabelKey]
        : config[key as keyof typeof config]
}

export {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartStyle,
    ChartTooltip,
    ChartTooltipContent,
}
