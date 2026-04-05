import type { ChangeEvent, Ref } from 'react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
    FormControl,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import {
    SuggestionPanel,
    SuggestionPanelEmpty,
    SuggestionPanelGroup,
    SuggestionPanelItem,
    SuggestionPanelList,
} from '@/components/ui/suggestion-panel'
import {
    type SuggestionRow,
    useBudgetLineDescriptionSuggestions,
} from '@/components/use-budget-line-description-suggestions'
import { filterBudgetLineSuggestionRows } from '@/lib/budget-line-suggestion-filter'
import { cn } from '@/lib/utils'

const POPOVER_SIDE_OFFSET = 4
const EMPTY_ROW_COUNT = 0

function suggestionKey(row: SuggestionRow): string {
    return row.kind === 'yield' ? `y:${row.yieldId}` : `c:${row.catalogItemId}`
}

export type BudgetLineCreateDescriptionFieldProps = {
    name: string
    value: string
    onBlur: () => void
    inputRef: Ref<HTMLInputElement>
    onInputChange: (e: ChangeEvent<HTMLInputElement>) => void
    dialogOpen: boolean
    projectId: string
    accessToken: string | null
    studioSlug: string
    libraryBound: boolean
    onClearLibraryBinding: () => void
    onSuggestionPick: (row: SuggestionRow) => void
}

export function BudgetLineCreateDescriptionField({
    name,
    value,
    onBlur,
    inputRef,
    onInputChange,
    dialogOpen,
    projectId,
    accessToken,
    studioSlug,
    libraryBound,
    onClearLibraryBinding,
    onSuggestionPick,
}: BudgetLineCreateDescriptionFieldProps) {
    const [popoverOpen, setPopoverOpen] = useState(false)

    const {
        fuse,
        suggestionRows,
        suggestionsLoading,
        queryEnabled,
        hasCorpus,
    } = useBudgetLineDescriptionSuggestions(
        dialogOpen,
        projectId,
        accessToken,
        studioSlug
    )

    const showSuggestions =
        popoverOpen &&
        queryEnabled &&
        !suggestionsLoading &&
        hasCorpus &&
        !libraryBound

    const onPick = (row: SuggestionRow) => {
        onSuggestionPick(row)
        setPopoverOpen(false)
    }

    return (
        <FormItem>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <FormLabel>Descripción</FormLabel>
                {libraryBound ? (
                    <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-xs text-muted-foreground sm:text-sm"
                        onClick={onClearLibraryBinding}
                    >
                        Escribir como línea libre
                    </Button>
                ) : null}
            </div>
            <Popover
                open={showSuggestions}
                onOpenChange={(o) => {
                    if (!o) setPopoverOpen(false)
                }}
            >
                <PopoverAnchor asChild>
                    <FormControl>
                        <Input
                            placeholder="Ej. Hormigón H21 — losa"
                            autoComplete="off"
                            aria-autocomplete="list"
                            aria-expanded={showSuggestions}
                            name={name}
                            ref={inputRef}
                            value={value}
                            readOnly={libraryBound}
                            onBlur={onBlur}
                            onChange={(e) => {
                                onInputChange(e)
                                if (!libraryBound) setPopoverOpen(true)
                            }}
                            onFocus={() => {
                                if (!libraryBound) setPopoverOpen(true)
                            }}
                        />
                    </FormControl>
                </PopoverAnchor>
                <PopoverContent
                    className={cn(
                        'p-0 w-[var(--popover-anchor-width)] max-h-[min(280px,50vh)] overflow-hidden',
                        'max-w-[calc(100vw-2rem)]'
                    )}
                    align="start"
                    sideOffset={POPOVER_SIDE_OFFSET}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <DescriptionSuggestionList
                        fuse={fuse}
                        suggestionRows={suggestionRows}
                        description={value}
                        suggestionsLoading={suggestionsLoading}
                        onPick={onPick}
                    />
                </PopoverContent>
            </Popover>
            <FormMessage />
        </FormItem>
    )
}

function DescriptionSuggestionList({
    fuse,
    suggestionRows,
    description,
    suggestionsLoading,
    onPick,
}: {
    fuse: ReturnType<typeof useBudgetLineDescriptionSuggestions>['fuse']
    suggestionRows: SuggestionRow[]
    description: string
    suggestionsLoading: boolean
    onPick: (row: SuggestionRow) => void
}) {
    const rows = useMemo(
        () =>
            filterBudgetLineSuggestionRows(
                fuse,
                suggestionRows,
                description,
                null
            ),
        [fuse, description, suggestionRows]
    )

    if (suggestionsLoading) {
        return (
            <div className="py-3 px-2 text-sm text-muted-foreground">
                Cargando sugerencias…
            </div>
        )
    }

    return (
        <SuggestionPanel className="max-h-[min(280px,50vh)]">
            <SuggestionPanelList>
                {rows.length === EMPTY_ROW_COUNT ? (
                    <SuggestionPanelEmpty className="py-3 px-2 text-xs text-muted-foreground">
                        No hay coincidencias. Seguí escribiendo o elegí texto
                        libre.
                    </SuggestionPanelEmpty>
                ) : null}
                <SuggestionPanelGroup heading="Biblioteca">
                    {rows.map((row) => (
                        <SuggestionPanelItem
                            key={suggestionKey(row)}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => onPick(row)}
                            className="flex flex-col items-start gap-0.5"
                        >
                            <span className="font-medium">{row.name}</span>
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
                        </SuggestionPanelItem>
                    ))}
                </SuggestionPanelGroup>
            </SuggestionPanelList>
        </SuggestionPanel>
    )
}
