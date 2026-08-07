import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ShoppingCart } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import EmptyState from '@/components/EmptyState'
import { RefrescarTodos } from '@/components/RefrescarTodos'
import { SkeletonCards } from '@/components/SkeletonCards'
import { hace } from '@/lib/tiempo'
import { listarComparar, ultimaActualizacion, type ProductoComparar } from '@/db/productos'
import { NOMBRES_CADENAS } from '@/db/cadenas'
import { calcularResumenDetallado } from '@/db/resumen'
import { cadenasActivas, filtrarPrecios } from '@/db/configuracion'

const formatoPrecio = (n: number) => `$${n.toLocaleString('es-AR')}`
const ORDEN_CADENAS = [...NOMBRES_CADENAS, 'Otras']

function Resumen() {
  const [items, setItems] = useState<ProductoComparar[] | null>(null)
  const [seleccionadas, setSeleccionadas] = useState<Set<string> | null>(null)
  const [ultimaFecha, setUltimaFecha] = useState<Date | null>(null)

  useEffect(() => {
    let activo = true
    listarComparar().then((lista) => {
      if (activo) setItems(lista)
    })
    cadenasActivas().then((c) => {
      if (activo) setSeleccionadas(c)
    })
    ultimaActualizacion().then((f) => {
      if (activo) setUltimaFecha(f)
    })
    return () => {
      activo = false
    }
  }, [])

  const onTerminado = async () => {
    const [lista, ultima] = await Promise.all([listarComparar(), ultimaActualizacion()])
    setItems(lista)
    setUltimaFecha(ultima)
  }

  const itemsVisibles = useMemo(
    () => (seleccionadas && items ? filtrarPrecios(items, seleccionadas) : items),
    [items, seleccionadas],
  )

  const resumen = useMemo(
    () => (itemsVisibles ? calcularResumenDetallado(itemsVisibles) : null),
    [itemsVisibles],
  )

  if (!items || !resumen) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Resumen</h1>
        <SkeletonCards cantidad={2} />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Resumen</h1>
        <EmptyState
          icon={ShoppingCart}
          title="Todavía no hay productos"
          description="Cargá algunos productos en la pestaña Productos para ver dónde te conviene comprar."
        />
        <Button asChild className="w-full">
          <Link to="/productos">Cargar productos</Link>
        </Button>
      </div>
    )
  }

  const grupos = new Map<string, string[]>()
  for (const a of resumen.asignacion) {
    const arr = grupos.get(a.cadena) ?? []
    arr.push(a.nombreMostrado)
    grupos.set(a.cadena, arr)
  }
  const cadenaDestacada = resumen.mejorCadena ?? resumen.cadenas[0]?.cadena

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Resumen</h1>
        {ultimaFecha && <p className="text-xs text-muted-foreground">Actualizados {hace(ultimaFecha)}</p>}
      </div>

      <RefrescarTodos onTerminado={onTerminado} />

      {resumen.totalProductos === 0 ? (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Todavía no hay precios para calcular un resumen.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="text-lg font-semibold tracking-tight">Todo en un solo lugar</h2>
            {resumen.cadenas.map((c) => (
              <Card key={c.cadena}>
                <CardContent className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium">{c.cadena}</p>
                      {c.cadena === cadenaDestacada && (
                        <Badge className="animate-in fade-in zoom-in-95 duration-300 bg-ahorro text-white">
                          Más barata
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {c.faltan === 0
                        ? 'Toda tu lista'
                        : `Le faltan ${c.faltan} producto${c.faltan === 1 ? '' : 's'}`}
                    </p>
                  </div>
                  <p className="shrink-0 text-lg font-semibold tabular-nums">
                    {formatoPrecio(c.total)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </section>

          <Card className="border-ahorro/40">
            <CardContent className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Óptimo combinado
              </p>
              <p className="text-2xl font-semibold tabular-nums text-ahorro-fuerte">
                {formatoPrecio(resumen.optimoCombinado)}
              </p>
              {resumen.ahorroExtra !== null ? (
                <p className="text-sm text-muted-foreground">
                  Ahorrás {formatoPrecio(resumen.ahorroExtra)} vs comprar todo en{' '}
                  {resumen.mejorCadena}.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ninguna cadena tiene el 100% de tu lista, así que no hay ahorro extra que
                  calcular.
                </p>
              )}
            </CardContent>
          </Card>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold tracking-tight">Qué comprar dónde</h2>
            {ORDEN_CADENAS.filter((cadena) => grupos.has(cadena)).map((cadena) => {
              const nombres = grupos.get(cadena)!
              return (
                <details
                  key={cadena}
                  className="group rounded-xl bg-card ring-1 ring-foreground/10"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
                    <p className="text-sm font-medium">
                      {cadena}{' '}
                      <span className="text-xs font-normal text-muted-foreground">
                        ({nombres.length} producto{nombres.length === 1 ? '' : 's'})
                      </span>
                    </p>
                    <ChevronDown
                      size={18}
                      className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <div className="space-y-1 px-4 pb-3">
                    {nombres.map((nombre) => (
                      <p key={nombre} className="text-sm">
                        {nombre}
                      </p>
                    ))}
                  </div>
                </details>
              )
            })}
          </section>
        </>
      )}

      {resumen.sinDatos.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold tracking-tight">Sin datos disponibles</h2>
          <div className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
            <p className="text-sm text-muted-foreground">
              {resumen.sinDatos.join(', ')} — sin precios en ninguna cadena cercana.
            </p>
          </div>
        </section>
      )}
    </div>
  )
}

export default Resumen
