import {
    createContext,
    type CSSProperties,
    forwardRef,
    type HTMLAttributes,
    type ReactNode,
    type RefObject,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react'
import { createPortal } from 'react-dom'

import { Slot } from '@/lib/slot'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  Context                                                           */
/* ------------------------------------------------------------------ */

type TooltipDelayCtx = { delayDuration: number }
const TooltipDelayContext = createContext<TooltipDelayCtx>({
    delayDuration: 400,
})

type TooltipCtx = {
    open: boolean
    setOpen: (v: boolean) => void
    triggerRef: RefObject<HTMLElement | null>
}
const TooltipContext = createContext<TooltipCtx>({
    open: false,
    setOpen: () => {},
    triggerRef: { current: null },
})

/* ------------------------------------------------------------------ */
/*  Provider                                                          */
/* ------------------------------------------------------------------ */

function TooltipProvider({
    delayDuration = 400,
    children,
}: {
    delayDuration?: number
    children: ReactNode
}) {
    return (
        <TooltipDelayContext.Provider value={{ delayDuration }}>
            {children}
        </TooltipDelayContext.Provider>
    )
}

/* ------------------------------------------------------------------ */
/*  Root                                                              */
/* ------------------------------------------------------------------ */

function Tooltip({ children }: { children: ReactNode }) {
    const [open, setOpen] = useState(false)
    const triggerRef = useRef<HTMLElement>(null)
    return (
        <TooltipContext.Provider value={{ open, setOpen, triggerRef }}>
            {children}
        </TooltipContext.Provider>
    )
}

/* ------------------------------------------------------------------ */
/*  Trigger                                                           */
/* ------------------------------------------------------------------ */

const TooltipTrigger = forwardRef<
    HTMLElement,
    HTMLAttributes<HTMLElement> & { asChild?: boolean; children?: ReactNode }
>(({ asChild, children, ...props }, _ref) => {
    const { setOpen, triggerRef } = useContext(TooltipContext)
    const { delayDuration } = useContext(TooltipDelayContext)
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
        undefined
    )

    const onEnter = useCallback(() => {
        clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => setOpen(true), delayDuration)
    }, [delayDuration, setOpen])

    const onLeave = useCallback(() => {
        clearTimeout(timerRef.current)
        setOpen(false)
    }, [setOpen])

    useEffect(() => () => clearTimeout(timerRef.current), [])

    const shared = {
        onMouseEnter: onEnter,
        onMouseLeave: onLeave,
        onFocus: onEnter,
        onBlur: onLeave,
        ref: triggerRef,
        ...props,
    }

    if (asChild) {
        return (
            <Slot {...shared} ref={triggerRef}>
                {children}
            </Slot>
        )
    }

    return (
        <button
            type="button"
            {...shared}
            ref={triggerRef as RefObject<HTMLButtonElement>}
        >
            {children}
        </button>
    )
})
TooltipTrigger.displayName = 'TooltipTrigger'

/* ------------------------------------------------------------------ */
/*  Content                                                           */
/* ------------------------------------------------------------------ */

const TooltipContent = forwardRef<
    HTMLDivElement,
    HTMLAttributes<HTMLDivElement> & {
        side?: 'top' | 'right' | 'bottom' | 'left'
        align?: 'start' | 'center' | 'end'
        sideOffset?: number
        hidden?: boolean
    }
>(
    (
        {
            className,
            side = 'top',
            sideOffset = 4,
            hidden: isHidden,
            children,
            ...props
        },
        ref
    ) => {
        const { open, triggerRef } = useContext(TooltipContext)
        const [style, setStyle] = useState<CSSProperties>({
            position: 'fixed',
            visibility: 'hidden',
        })

        useEffect(() => {
            if (!open || isHidden || !triggerRef.current) return
            const rect = triggerRef.current.getBoundingClientRect()
            const next: CSSProperties = { position: 'fixed' }

            switch (side) {
                case 'top':
                    next.left = rect.left + rect.width / 2
                    next.top = rect.top - sideOffset
                    next.transform = 'translate(-50%, -100%)'
                    break
                case 'bottom':
                    next.left = rect.left + rect.width / 2
                    next.top = rect.bottom + sideOffset
                    next.transform = 'translateX(-50%)'
                    break
                case 'left':
                    next.left = rect.left - sideOffset
                    next.top = rect.top + rect.height / 2
                    next.transform = 'translate(-100%, -50%)'
                    break
                case 'right':
                    next.left = rect.right + sideOffset
                    next.top = rect.top + rect.height / 2
                    next.transform = 'translateY(-50%)'
                    break
            }
            queueMicrotask(() => setStyle(next))
        }, [open, isHidden, side, sideOffset, triggerRef])

        if (!open || isHidden) return null

        return createPortal(
            <div
                ref={ref}
                role="tooltip"
                style={style}
                className={cn(
                    'z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95',
                    className
                )}
                {...props}
            >
                {children}
            </div>,
            document.body
        )
    }
)
TooltipContent.displayName = 'TooltipContent'

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
