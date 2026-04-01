import {
    Disclosure,
    DisclosureButton,
    DisclosurePanel,
} from '@headlessui/react'
import { ChevronDown } from 'lucide-react'
import { forwardRef, type HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  Accordion root — wrapper div (coordination handled by Disclosure) */
/* ------------------------------------------------------------------ */

interface AccordionProps extends HTMLAttributes<HTMLDivElement> {
    type?: 'single' | 'multiple'
    collapsible?: boolean
    value?: string
    defaultValue?: string
    onValueChange?: (value: string) => void
}

const Accordion = forwardRef<HTMLDivElement, AccordionProps>(
    (
        {
            type: _type,
            collapsible: _collapsible,
            value: _value,
            defaultValue: _defaultValue,
            onValueChange: _onValueChange,
            className,
            ...props
        },
        ref
    ) => <div ref={ref} className={cn('', className)} {...props} />
)
Accordion.displayName = 'Accordion'

/* ------------------------------------------------------------------ */
/*  AccordionItem — single Disclosure                                 */
/* ------------------------------------------------------------------ */

interface AccordionItemProps extends HTMLAttributes<HTMLDivElement> {
    value: string
    disabled?: boolean
}

const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProps>(
    (
        { value: _value, disabled: _disabled, className, children, ...props },
        ref
    ) => (
        <Disclosure
            as="div"
            ref={ref}
            defaultOpen={false}
            className={cn('border-b', className)}
            {...props}
        >
            {children}
        </Disclosure>
    )
)
AccordionItem.displayName = 'AccordionItem'

/* ------------------------------------------------------------------ */
/*  AccordionTrigger                                                  */
/* ------------------------------------------------------------------ */

const AccordionTrigger = forwardRef<
    HTMLButtonElement,
    HTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => (
    <h3 className="flex">
        <DisclosureButton
            ref={ref}
            className={cn(
                'flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-open]>svg]:rotate-180',
                className
            )}
            {...props}
        >
            {children}
            <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
        </DisclosureButton>
    </h3>
))
AccordionTrigger.displayName = 'AccordionTrigger'

/* ------------------------------------------------------------------ */
/*  AccordionContent                                                  */
/* ------------------------------------------------------------------ */

const AccordionContent = forwardRef<
    HTMLDivElement,
    HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
    <DisclosurePanel ref={ref} className="overflow-hidden text-sm" {...props}>
        <div className={cn('pb-4 pt-0', className)}>{children}</div>
    </DisclosurePanel>
))
AccordionContent.displayName = 'AccordionContent'

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger }
