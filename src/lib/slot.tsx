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
        if (
            key.startsWith('on') &&
            typeof childProps[key] === 'function' &&
            typeof (props as Record<string, unknown>)[key] === 'function'
        ) {
            const parentHandler = (props as Record<string, unknown>)[key] as (
                ...a: unknown[]
            ) => void
            const childHandler = childProps[key] as (...a: unknown[]) => void
            merged[key] = (...args: unknown[]) => {
                parentHandler(...args)
                childHandler(...args)
            }
        } else if (!(key in merged)) {
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
