import SidebarContent from './SidebarContent'

export default function AppSidebar() {
    return (
        <aside className="fixed inset-y-0 left-0 z-30 hidden md:flex w-60 flex-col bg-sidebar border-r border-sidebar-border">
            <SidebarContent />
        </aside>
    )
}
