import {
    Listbox,
    ListboxButton,
    ListboxOption,
    ListboxOptions,
} from '@headlessui/react'
import { Check, ChevronDown } from 'lucide-react'
import {
    createContext,
    forwardRef,
    type HTMLAttributes,
    type ReactNode,
    type RefObject,
    useCallback,
    useContext,
    useRef,
} from 'react'

import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  Internal context to track item texts for SelectValue              */
/* ------------------------------------------------------------------ */

type SelectContextValue = {
    value?: string
    itemTexts: RefObject<Map<string, string>>
    registerItem: (value: string, text: string) => void
}

const SelectContext = createContext<SelectContextValue>({
    itemTexts: { current: new Map() },
    registerItem: () => {},
})

/* ------------------------------------------------------------------ */
/*  Select (root)                                                     */
/* ------------------------------------------------------------------ */

interface SelectProps {
    value?: string
    defaultValue?: string
    onValueChange?: (value: string) => void
    children: ReactNode
    disabled?: boolean
    required?: boolean
    name?: string
}

function Select({
    value,
    defaultValue,
    onValueChange,
    disabled,
    required: _required,
    name: _name,
    children,
}: SelectProps) {
    const itemTexts = useRef(new Map<string, string>())
    const registerItem = useCallback((val: string, text: string) => {
        itemTexts.current.set(val, text)
    }, [])

    return (
        <SelectContext.Provider
            value={{ value: value ?? defaultValue, itemTexts, registerItem }}
        >
            <Listbox
                value={value ?? defaultValue ?? ''}
                onChange={onValueChange ?? (() => {})}
                disabled={disabled}
            >
                {children}
            </Listbox>
        </SelectContext.Provider>
    )
}

/* ------------------------------------------------------------------ */
/*  SelectGroup                                                       */
/* ------------------------------------------------------------------ */

function SelectGroup({ children, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div role="group" {...props}>
            {children}
        </div>
    )
}

/* ------------------------------------------------------------------ */
/*  SelectValue                                                       */
/* ------------------------------------------------------------------ */

function SelectValue({ placeholder }: { placeholder?: string }) {
    const { value, itemTexts } = useContext(SelectContext)
    const text = value ? itemTexts.current.get(value) : undefined
    return (
        <span className="pointer-events-none line-clamp-1">
            {text ?? placeholder ?? ''}
        </span>
    )
}

/* ------------------------------------------------------------------ */
/*  SelectTrigger                                                     */
/* ------------------------------------------------------------------ */

const SelectTrigger = forwardRef<
    HTMLButtonElement,
    HTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => (
    <ListboxButton
        ref={ref}
        className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
            className
        )}
        {...props}
    >
        {children}
        <ChevronDown className="h-4 w-4 opacity-50" />
    </ListboxButton>
))
SelectTrigger.displayName = 'SelectTrigger'

/* ------------------------------------------------------------------ */
/*  SelectContent                                                     */
/* ------------------------------------------------------------------ */

const SelectContent = forwardRef<
    HTMLDivElement,
    HTMLAttributes<HTMLDivElement> & {
        position?: string
        container?: Element | null
    }
>(
    (
        {
            className,
            children,
            position: _position,
            container: _container,
            ...props
        },
        ref
    ) => (
        <ListboxOptions
            ref={ref}
            anchor="bottom start"
            className={cn(
                'z-50 max-h-96 min-w-[var(--button-width)] overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
                'transition duration-100 ease-in data-[closed]:opacity-0',
                className
            )}
            {...props}
        >
            {children}
        </ListboxOptions>
    )
)
SelectContent.displayName = 'SelectContent'

/* ------------------------------------------------------------------ */
/*  SelectLabel                                                       */
/* ------------------------------------------------------------------ */

const SelectLabel = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn('py-1.5 pl-8 pr-2 text-sm font-semibold', className)}
            {...props}
        />
    )
)
SelectLabel.displayName = 'SelectLabel'

/* ------------------------------------------------------------------ */
/*  SelectItem                                                        */
/* ------------------------------------------------------------------ */

const SelectItem = forwardRef<
    HTMLDivElement,
    HTMLAttributes<HTMLDivElement> & { value: string; disabled?: boolean }
>(({ className, children, value, disabled, ...props }, ref) => {
    const ctx = useContext(SelectContext)

    // Register text synchronously for SelectValue display
    if (typeof children === 'string') {
        ctx.registerItem(value, children)
    }

    return (
        <ListboxOption
            ref={ref}
            value={value}
            disabled={disabled}
            className={cn(
                'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[focus]:bg-accent data-[focus]:text-accent-foreground',
                className
            )}
            {...props}
        >
            {({ selected }) => (
                <>
                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                        {selected && <Check className="h-4 w-4" />}
                    </span>
                    <span>{children}</span>
                </>
            )}
        </ListboxOption>
    )
})
SelectItem.displayName = 'SelectItem'

/* ------------------------------------------------------------------ */
/*  SelectSeparator                                                   */
/* ------------------------------------------------------------------ */

const SelectSeparator = forwardRef<
    HTMLDivElement,
    HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn('-mx-1 my-1 h-px bg-muted', className)}
        {...props}
    />
))
SelectSeparator.displayName = 'SelectSeparator'

/* ------------------------------------------------------------------ */
/*  Scroll buttons (no-op stubs for API compat)                       */
/* ------------------------------------------------------------------ */

function SelectScrollUpButton(_props: Record<string, unknown>) {
    return null
}
function SelectScrollDownButton(_props: Record<string, unknown>) {
    return null
}

export {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectScrollDownButton,
    SelectScrollUpButton,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
}
