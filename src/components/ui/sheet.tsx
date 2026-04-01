import {
    Description,
    Dialog,
    DialogPanel,
    DialogTitle,
    Transition,
    TransitionChild,
} from '@headlessui/react'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import {
    type ButtonHTMLAttributes,
    createContext,
    type HTMLAttributes,
    type ReactNode,
    useContext,
} from 'react'

import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  Context – lets SheetClose call onOpenChange                       */
/* ------------------------------------------------------------------ */
const SheetContext = createContext<{
    onOpenChange: (open: boolean) => void
}>({ onOpenChange: () => {} })

/* ------------------------------------------------------------------ */
/*  Root                                                               */
/* ------------------------------------------------------------------ */
interface SheetProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children: ReactNode
}

function Sheet({ open = false, onOpenChange, children, ...rest }: SheetProps) {
    const handler = onOpenChange ?? (() => {})
    return (
        <SheetContext.Provider value={{ onOpenChange: handler }}>
            <Transition show={open}>
                <Dialog
                    onClose={() => handler(false)}
                    className="relative z-50"
                    {...rest}
                >
                    {children}
                </Dialog>
            </Transition>
        </SheetContext.Provider>
    )
}

/* ------------------------------------------------------------------ */
/*  Variants                                                           */
/* ------------------------------------------------------------------ */
const sheetVariants = cva(
    'fixed z-50 flex max-h-[100dvh] min-h-0 flex-col gap-4 overflow-hidden bg-background p-6 shadow-lg transition duration-300 ease-in-out',
    {
        variants: {
            side: {
                top: 'inset-x-0 top-0 border-b data-[closed]:-translate-y-full',
                bottom: 'inset-x-0 bottom-0 border-t data-[closed]:translate-y-full',
                left: 'inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm data-[closed]:-translate-x-full',
                right: 'inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm data-[closed]:translate-x-full',
            },
        },
        defaultVariants: {
            side: 'right',
        },
    }
)

/* ------------------------------------------------------------------ */
/*  SheetContent                                                       */
/* ------------------------------------------------------------------ */
interface SheetContentProps
    extends
        Omit<HTMLAttributes<HTMLDivElement>, 'className'>,
        VariantProps<typeof sheetVariants> {
    className?: string
    children?: ReactNode
}

function SheetContent({
    side = 'right',
    className,
    children,
    ...props
}: SheetContentProps) {
    const { onOpenChange } = useContext(SheetContext)
    return (
        <>
            {/* Overlay */}
            <TransitionChild>
                <div className="fixed inset-0 bg-black/80 transition duration-300 data-[closed]:opacity-0" />
            </TransitionChild>

            {/* Panel */}
            <TransitionChild>
                <DialogPanel
                    className={cn(sheetVariants({ side }), className)}
                    {...props}
                >
                    {children}
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </button>
                </DialogPanel>
            </TransitionChild>
        </>
    )
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */
function SheetHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                'flex flex-col space-y-2 text-center sm:text-left',
                className
            )}
            {...props}
        />
    )
}

function SheetFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
                className
            )}
            {...props}
        />
    )
}

function SheetTitle({
    className,
    ...props
}: HTMLAttributes<HTMLHeadingElement>) {
    return (
        <DialogTitle
            className={cn('text-lg font-semibold text-foreground', className)}
            {...props}
        />
    )
}

function SheetDescription({
    className,
    ...props
}: HTMLAttributes<HTMLParagraphElement>) {
    return (
        <Description
            className={cn('text-sm text-muted-foreground', className)}
            {...props}
        />
    )
}

function SheetClose({
    className,
    onClick,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    const { onOpenChange } = useContext(SheetContext)
    return (
        <button
            type="button"
            onClick={(e) => {
                onOpenChange(false)
                onClick?.(e)
            }}
            className={className}
            {...props}
        />
    )
}

export {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
}
