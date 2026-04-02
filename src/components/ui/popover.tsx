import {
    Children,
    cloneElement,
    createContext,
    type CSSProperties,
    forwardRef,
    type HTMLAttributes,
    isValidElement,
    type MutableRefObject,
    type ReactNode,
    type RefObject,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  Context                                                           */
/* ------------------------------------------------------------------ */

type PopoverCtx = {
    open: boolean
    onOpenChange?: (open: boolean) => void
    anchorRef: RefObject<HTMLElement | null>
}

const PopoverContext = createContext<PopoverCtx>({
    open: false,
    anchorRef: { current: null },
})

/* ------------------------------------------------------------------ */
/*  Root                                                              */
/* ------------------------------------------------------------------ */

function Popover({
    open = false,
    onOpenChange,
    children,
}: {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children: ReactNode
}) {
    const anchorRef = useRef<HTMLElement>(null)
    return (
        <PopoverContext.Provider value={{ open, onOpenChange, anchorRef }}>
            {children}
        </PopoverContext.Provider>
    )
}

/* ------------------------------------------------------------------ */
/*  Anchor (positions content relative to this element)               */
/* ------------------------------------------------------------------ */

const PopoverAnchor = forwardRef<
    HTMLElement,
    HTMLAttributes<HTMLElement> & { asChild?: boolean }
>(({ asChild, children, ...props }, _ref) => {
    const { anchorRef } = useContext(PopoverContext)

    if (asChild && isValidElement(children)) {
        // eslint-disable-next-line react-hooks/refs -- asChild merges ref onto child
        return cloneElement(Children.only(children), {
            ref: anchorRef,
            ...props,
        } as Record<string, unknown>)
    }

    return (
        <div ref={anchorRef as RefObject<HTMLDivElement>} {...props}>
            {children}
        </div>
    )
})
PopoverAnchor.displayName = 'PopoverAnchor'

/* ------------------------------------------------------------------ */
/*  Content                                                           */
/* ------------------------------------------------------------------ */

type PopoverContentProps = HTMLAttributes<HTMLDivElement> & {
    align?: 'start' | 'center' | 'end'
    sideOffset?: number
    onOpenAutoFocus?: (e: Event) => void
    container?: Element | null
}

const PopoverContent = forwardRef<HTMLDivElement, PopoverContentProps>(
    (
        {
            className,
            align = 'center',
            sideOffset = 4,
            onOpenAutoFocus: _onOpenAutoFocus,
            container,
            children,
            ...props
        },
        ref
    ) => {
        const { open, onOpenChange, anchorRef } = useContext(PopoverContext)
        const [style, setStyle] = useState<CSSProperties>({
            position: 'fixed',
            visibility: 'hidden',
        })
        const innerRef = useRef<HTMLDivElement>(null)

        // Close on outside click
        useEffect(() => {
            if (!open) return
            const handler = (e: MouseEvent) => {
                const target = e.target as Node
                if (
                    innerRef.current &&
                    !innerRef.current.contains(target) &&
                    anchorRef.current &&
                    !anchorRef.current.contains(target)
                ) {
                    onOpenChange?.(false)
                }
            }
            document.addEventListener('mousedown', handler)
            return () => document.removeEventListener('mousedown', handler)
        }, [open, onOpenChange, anchorRef])

        // Close on Escape key
        useEffect(() => {
            if (!open) return
            const handler = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    e.stopPropagation()
                    onOpenChange?.(false)
                }
            }
            document.addEventListener('keydown', handler)
            return () => document.removeEventListener('keydown', handler)
        }, [open, onOpenChange])

        // Position relative to anchor
        useEffect(() => {
            if (!open || !anchorRef.current) return
            const rect = anchorRef.current.getBoundingClientRect()
            const next: CSSProperties = {
                position: 'fixed',
                top: rect.bottom + sideOffset,
            }
            // Expose anchor width as a CSS variable for consumer classes
            ;(next as Record<string, unknown>)['--popover-anchor-width'] =
                `${rect.width}px`
            switch (align) {
                case 'start':
                    next.left = rect.left
                    break
                case 'end':
                    next.left = rect.right
                    next.transform = 'translateX(-100%)'
                    break
                default:
                    next.left = rect.left + rect.width / 2
                    next.transform = 'translateX(-50%)'
                    break
            }
            queueMicrotask(() => setStyle(next))
        }, [open, align, sideOffset, anchorRef])

        if (!open) return null

        return createPortal(
            <div
                ref={(node) => {
                    ;(
                        innerRef as MutableRefObject<HTMLDivElement | null>
                    ).current = node
                    if (typeof ref === 'function') ref(node)
                    else if (ref)
                        (
                            ref as MutableRefObject<HTMLDivElement | null>
                        ).current = node
                }}
                className={cn(
                    'z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                    className
                )}
                style={style}
                data-state={open ? 'open' : 'closed'}
                {...props}
            >
                {children}
            </div>,
            container ?? document.body
        )
    }
)
PopoverContent.displayName = 'PopoverContent'

export { Popover, PopoverAnchor, PopoverContent }
