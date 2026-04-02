import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { X } from 'lucide-react'
import type { FormEventHandler, ReactNode } from 'react'

import { Button } from '@/components/ui/button'

interface BudgetLineDialogShellProps {
    open: boolean
    onClose: () => void
    title: string
    description?: ReactNode
    onSubmit: FormEventHandler<HTMLFormElement>
    children: ReactNode
    submitLabel: string
    submittingLabel: string
    isSubmitting: boolean
    submitDisabled?: boolean
}

export default function BudgetLineDialogShell({
    open,
    onClose,
    title,
    description,
    onSubmit,
    children,
    submitLabel,
    submittingLabel,
    isSubmitting,
    submitDisabled = false,
}: BudgetLineDialogShellProps) {
    return (
        <Dialog open={open} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
            <div className="fixed inset-0 flex items-start justify-center p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-4 sm:pt-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))]">
                <DialogPanel className="flex max-h-[min(90vh,100dvh)] w-full max-w-none flex-col rounded-lg border bg-background shadow-lg sm:max-w-md">
                    <div className="flex shrink-0 items-center justify-between border-b px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                        <DialogTitle className="text-lg font-semibold leading-none tracking-tight">
                            {title}
                        </DialogTitle>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Cerrar"
                            onClick={onClose}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    {description ? (
                        <p className="shrink-0 border-b px-4 py-3 text-sm text-muted-foreground">
                            {description}
                        </p>
                    ) : null}
                    <form
                        onSubmit={onSubmit}
                        className="flex min-h-0 flex-1 flex-col"
                    >
                        {children}
                        <div className="flex shrink-0 justify-end border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                            <Button
                                type="submit"
                                disabled={submitDisabled || isSubmitting}
                            >
                                {isSubmitting ? submittingLabel : submitLabel}
                            </Button>
                        </div>
                    </form>
                </DialogPanel>
            </div>
        </Dialog>
    )
}
