import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import EmptyState from '@/components/EmptyState'
import { SkeletonCards } from '@/components/SkeletonCards'
import { cn } from '@/lib/utils'
import { listarComparar, type ProductoComparar } from '@/db/productos'
import { NOMBRES_CADENAS } from '@/db/cadenas'
import { calcularResumen } from '@/db/resumen'
import { cadenasActivas, filtrarPrecios } from '@/db/configuracion'

const formatoPrecio = (n: number) => `$${n.toLocaleString('es-AR')}`

function Comparar() {
  const [items, setItems] = useState<ProductoComparar[] | null>(null)
  const [seleccionadas, setSeleccionadas] = useState<Set<string> | null>(null)

  useEffect(() => {
    let activo = true
    listarComparar().then((lista) => {
      if (activo) setItems(lista)
    })
    cadenasActivas().then((c) => {
      if (activo) setSeleccionadas(c)
    })
    return () => {
      activo = false
    }
  }, [])

  const itemsVisibles = useMemo(
    () => (seleccionadas && items ? filtrarPrecios(items, seleccionadas) : items),
    [items, seleccionadas],
  )

  const cadenas = useMemo(() => {
    if (!itemsVisibles) return []
    const presentes = new Set<string>()
    for (const p of itemsVisibles) for (const pr of p.precios) presentes.add(pr.cadena)
    const conocidas = NOMBRES_CADENAS.filter((c) => presentes.has(c))
    return presentes.has('Otras') ? [...conocidas, 'Otras'] : conocidas
  }, [itemsVisibles])

  if (items === null) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Comparar</h1>
        <SkeletonCards cantidad={3} />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Comparar</h1>
        <EmptyState
          icon={ShoppingCart}
          title="Todavía no hay productos"
          description="Cargá algunos productos en la pestaña Productos para empezar a comparar precios."
        />
        <Button asChild className="w-full">
          <Link to="/productos">Cargar productos</Link>
        </Button>
      </div>
    )
  }

  const resumen = calcularResumen(itemsVisibles ?? [])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Comparar</h1>

      <Card>
        <CardContent className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Productos comparados</p>
            <p className="text-xl font-semibold tabular-nums">{resumen.productos}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Ahorro potencial total</p>
            <p className="text-xl font-semibold tabular-nums text-ahorro-fuerte">
              {formatoPrecio(resumen.ahorro)}
            </p>
          </div>
        </CardContent>
      </Card>

      <ul className="space-y-3">
        {itemsVisibles?.map((p) => {
          const precioPorCadena = new Map(p.precios.map((pr) => [pr.cadena, pr.precio]))
          const minimo = p.precios.length >= 2 ? Math.min(...p.precios.map((pr) => pr.precio)) : null
          return (
            <li key={p.id}>
              <Card>
                <CardContent className="space-y-1">
                  <p className="mb-1 font-medium leading-snug">{p.nombreMostrado}</p>
                  {p.precios.length === 0 && cadenas.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Sin precios disponibles. Actualizá desde Productos.
                    </p>
                  )}
                  <ul>
                    {cadenas.map((cadena) => {
                      const precio = precioPorCadena.get(cadena) ?? null
                      const esBarato = minimo !== null && precio === minimo
                      return (
                        <li
                          key={cadena}
                          className={cn(
                            'flex items-center justify-between gap-2 rounded-md px-2 py-1.5',
                            esBarato && 'bg-ahorro-fondo',
                          )}
                        >
                          <span className="text-sm">{cadena}</span>
                          {precio === null ? (
                            <span className="text-sm text-muted-foreground">No disponible</span>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              <span
                                className={cn(
                                  'text-sm font-semibold tabular-nums',
                                  esBarato && 'text-ahorro-fuerte',
                                )}
                              >
                                {formatoPrecio(precio)}
                              </span>
                              {esBarato && (
                                <Badge className="animate-in fade-in zoom-in-95 duration-300 bg-ahorro text-white">
                                  Más barato
                                </Badge>
                              )}
                            </span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </CardContent>
              </Card>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default Comparar
