import {
    Children,
    cloneElement,
    forwardRef,
    type HTMLAttributes,
    isValidElement,
    type ReactNode,
    type Ref,
} from 'react'

import { cn } from '@/lib/utils'

function mergeRefs<T>(...refs: (Ref<T> | undefined | null)[]): Ref<T> {
    return (node: T | null) => {
        for (const ref of refs) {
            if (typeof ref === 'function') ref(node)
            else if (ref && typeof ref === 'object')
                (ref as { current: T | null }).current = node
        }
    }
}

function composeHandlers(
    parentHandler: (...args: unknown[]) => void,
    childHandler: (...args: unknown[]) => void
): (...args: unknown[]) => void {
    return (...args: unknown[]) => {
        parentHandler(...args)
        childHandler(...args)
    }
}

/**
 * Renders the single child element, merging the Slot's props (className,
 * event handlers, ref, etc.) onto it.  Enables the `asChild` pattern.
 */
const Slot = forwardRef<
    HTMLElement,
    HTMLAttributes<HTMLElement> & { children?: ReactNode }
>(({ children, ...props }, ref) => {
    const child = Children.only(children)
    if (!isValidElement(child)) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const childProps = child.props as Record<string, any>

    const merged: Record<string, unknown> = { ...props }

    // Merge className via cn()
    if (props.className || childProps.className) {
        merged.className = cn(props.className, childProps.className)
    }

    // Compose event handlers: parent first, then child
    for (const key of Object.keys(childProps)) {
        const childValue = childProps[key]
        const parentValue = (props as Record<string, unknown>)[key]
        const isComposedEvent =
            key.startsWith('on') &&
            typeof childValue === 'function' &&
            typeof parentValue === 'function'
        if (isComposedEvent) {
            merged[key] = composeHandlers(
                parentValue as (...a: unknown[]) => void,
                childValue as (...a: unknown[]) => void
            )
            continue
        }
        if (!(key in merged)) {
            merged[key] = childProps[key]
        }
    }

    // Merge refs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    merged.ref = mergeRefs(ref, (child as any).ref)

    return cloneElement(child, merged)
})
Slot.displayName = 'Slot'

export { Slot }
