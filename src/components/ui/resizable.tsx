import { GripVertical } from 'lucide-react'
import { type ComponentProps, type FC } from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'

import { cn } from '@/lib/utils'

const ResizablePanelGroup: FC<ComponentProps<typeof Group>> = ({
    className,
    ...props
}) => <Group className={cn('flex h-full w-full', className)} {...props} />

const ResizablePanel = Panel

const ResizableHandle = ({
    withHandle,
    className,
    orientation = 'horizontal',
    ...props
}: ComponentProps<typeof Separator> & {
    withHandle?: boolean
    orientation?: 'horizontal' | 'vertical'
}) => (
    <Separator
        className={cn(
            'relative flex items-center justify-center bg-border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1',
            orientation === 'horizontal' &&
                'w-px after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2',
            orientation === 'vertical' &&
                'h-px w-full after:absolute after:left-0 after:top-1/2 after:h-1 after:w-full after:-translate-y-1/2 after:translate-x-0',
            orientation === 'vertical' && withHandle && '[&>div]:rotate-90',
            className
        )}
        {...props}
    >
        {withHandle && (
            <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
                <GripVertical className="h-2.5 w-2.5" />
            </div>
        )}
    </Separator>
)

export { ResizableHandle, ResizablePanel, ResizablePanelGroup }
