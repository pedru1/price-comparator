import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { useUbicacion } from '@/hooks/useUbicacion'
import { mapLimit } from '@/lib/mapLimit'
import { listarComparar, refrescarPrecios } from '@/db/productos'
import type { ProductoComparar } from '@/db/productos'

interface Props {
  onTerminado?: () => void
}

export function RefrescarTodos({ onTerminado }: Props) {
  const { obtenerSucursales } = useUbicacion({ auto: false })
  const [corriendo, setCorriendo] = useState(false)
  const [progreso, setProgreso] = useState('')
  const [resumen, setResumen] = useState<string | null>(null)

  const refrescar = async () => {
    if (corriendo) return
    setCorriendo(true)
    setResumen(null)
    try {
      const sucursales = await obtenerSucursales()
      if (!sucursales) return
      const items = await listarComparar()
      const productos = items.filter((p) => p.precios.length > 0)
      if (productos.length === 0) return
      const resultados = await mapLimit(
        productos,
        3,
        async (p: ProductoComparar) => {
          let ok = false
          try {
            await refrescarPrecios(p.id, p.idProductoPreciosClaros, sucursales)
            ok = true
          } catch {
            ok = false
          }
          return { producto: p, ok }
        },
        (hechos, total) => setProgreso(`Actualizando ${hechos} de ${total}…`),
      )
      const fallaron = resultados.filter((r) => !r.ok)
      setProgreso('')
      setResumen(
        fallaron.length === 0
          ? `Actualizados ${resultados.length} de ${resultados.length} productos.`
          : `${resultados.length - fallaron.length} de ${resultados.length} actualizados, ${fallaron.length} fallaron (${fallaron
              .map((r) => r.producto.nombreMostrado)
              .join(', ')}).`,
      )
      onTerminado?.()
    } finally {
      setCorriendo(false)
    }
  }

  const vacio = !!corriendo && progreso === ''

  return (
    <div className="mb-4">
      <Button type="button" variant="outline" onClick={refrescar} disabled={corriendo} className="w-full">
        {corriendo ? (
          <>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            {vacio ? 'Preparando…' : progreso}
          </>
        ) : (
          <>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar todos los precios
          </>
        )}
      </Button>
      {resumen && <p className="mt-2 text-xs text-muted-foreground">{resumen}</p>}
    </div>
  )
}
