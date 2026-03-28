import { DollarSign } from 'lucide-react'

/** Settings / configuration page (UI copy in Spanish). */
export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-black tracking-tight">
                    Configuración
                </h1>
                <p className="text-sm text-muted-foreground">
                    Ajustes del proyecto y del estudio
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-3">
                    <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                        <h2 className="font-bold">Monedas</h2>
                    </div>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between border-b border-border pb-2">
                            <span>ARS (Peso argentino)</span>
                            <span className="font-mono text-muted-foreground">
                                Principal
                            </span>
                        </div>
                        <div className="flex justify-between border-b border-border pb-2">
                            <span>USD Oficial</span>
                            <span className="font-mono text-muted-foreground">
                                TC: $870
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>USD Blue</span>
                            <span className="font-mono text-muted-foreground">
                                TC: $1.180
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
