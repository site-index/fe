export type BoqItemRow = {
    id: string
    rubro: string
    item: string
    unidad: string
    cantidad: number
    precioUnit: number
    total: number
    flaky: boolean
    mixDesignId: string | null
    mixDesignName: string | null
    pillars: { materiales: number; manoDeObra: number; equipo: number }
}
