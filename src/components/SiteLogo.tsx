import { cn } from '@/lib/utils'

type SiteLogoProps = {
    className?: string
    /** Use on dark backgrounds (logo asset is black-filled). */
    invertOnDark?: boolean
}

export default function SiteLogo({ className, invertOnDark }: SiteLogoProps) {
    return (
        <img
            src="/logo.svg"
            alt="SITE INDEX"
            className={cn(
                'object-contain shrink-0',
                invertOnDark && 'brightness-0 invert',
                className
            )}
        />
    )
}
