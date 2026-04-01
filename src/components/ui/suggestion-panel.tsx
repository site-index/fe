import { forwardRef, type HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

const SuggestionPanel = forwardRef<
    HTMLDivElement,
    HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            'flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground',
            className
        )}
        {...props}
    />
))
SuggestionPanel.displayName = 'SuggestionPanel'

const SuggestionPanelList = forwardRef<
    HTMLDivElement,
    HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            'max-h-[min(300px,50dvh)] overflow-y-auto overflow-x-hidden overscroll-contain',
            className
        )}
        {...props}
    />
))
SuggestionPanelList.displayName = 'SuggestionPanelList'

const SuggestionPanelEmpty = forwardRef<
    HTMLDivElement,
    HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            'py-3 text-center text-xs text-muted-foreground',
            className
        )}
        {...props}
    />
))
SuggestionPanelEmpty.displayName = 'SuggestionPanelEmpty'

function SuggestionPanelGroup({
    className,
    heading,
    children,
    ...props
}: HTMLAttributes<HTMLDivElement> & { heading?: string }) {
    return (
        <div
            className={cn('overflow-hidden p-1 text-foreground', className)}
            {...props}
        >
            {heading ? (
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    {heading}
                </div>
            ) : null}
            {children}
        </div>
    )
}

const suggestionItemClass =
    'relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-left text-sm outline-none focus-visible:bg-accent focus-visible:text-accent-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50'

const SuggestionPanelItem = forwardRef<
    HTMLButtonElement,
    HTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
    <button
        ref={ref}
        type="button"
        className={cn(suggestionItemClass, className)}
        {...props}
    />
))
SuggestionPanelItem.displayName = 'SuggestionPanelItem'

export {
    SuggestionPanel,
    SuggestionPanelEmpty,
    SuggestionPanelGroup,
    SuggestionPanelItem,
    SuggestionPanelList,
}
