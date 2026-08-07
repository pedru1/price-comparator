import { useEffect, useMemo, useState } from 'react'
import { Loader2, MapPin, RefreshCw, Search, ShoppingCart, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import EmptyState from '@/components/EmptyState'
import { RefrescarTodos } from '@/components/RefrescarTodos'
import { SkeletonCards } from '@/components/SkeletonCards'
import { UbicacionManual } from '@/components/UbicacionManual'
import { useUbicacion } from '@/hooks/useUbicacion'
import { hace } from '@/lib/tiempo'
import { buscarProductos, type Producto } from '@/services/preciosClaros'
import { cadenasActivas, filtrarPrecios } from '@/db/configuracion'
import { cn } from '@/lib/utils'
import {
  agregarProducto,
  eliminarProducto,
  listarProductos,
  refrescarPrecios,
  ultimaActualizacion,
  type ProductoListado,
} from '@/db/productos'

const formatoPrecio = (n: number | null) => (n === null ? '—' : `$${n.toLocaleString('es-AR')}`)

function Productos() {
  const { ubicacion, geoError, sucursales, cargandoSucursales, pedirUbicacion, usarUbicacion } =
    useUbicacion()

  const [texto, setTexto] = useState('')
  const [resultados, setResultados] = useState<Producto[] | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null)

  const [guardados, setGuardados] = useState<ProductoListado[]>([])
  const [cargandoGuardados, setCargandoGuardados] = useState(true)
  const [seleccionadas, setSeleccionadas] = useState<Set<string> | null>(null)
  const [ultimaFecha, setUltimaFecha] = useState<Date | null>(null)
  const [agregando, setAgregando] = useState<string | null>(null)
  const [refrescando, setRefrescando] = useState<number | null>(null)
  const [eliminando, setEliminando] = useState<number | null>(null)
  const [errorRefresco, setErrorRefresco] = useState<Record<number, string>>({})
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    void cargarGuardados()
    void cadenasActivas().then(setSeleccionadas)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 4000)
    return () => clearTimeout(t)
  }, [aviso])

  const buscar = async () => {
    if (!ubicacion || buscando) return
    setBuscando(true)
    setErrorBusqueda(null)
    setResultados(null)
    const r = await buscarProductos(texto, ubicacion.lat, ubicacion.lng)
    setBuscando(false)
    if (r.ok) setResultados(r.data)
    else setErrorBusqueda(r.error)
  }

  const cargarGuardados = async () => {
    const [lista, ultima] = await Promise.all([listarProductos(), ultimaActualizacion()])
    setGuardados(lista)
    setUltimaFecha(ultima)
    setCargandoGuardados(false)
  }

  const guardar = async (p: Producto) => {
    if (sucursales.length === 0) return
    setAgregando(p.id)
    try {
      const resultado = await agregarProducto({
        idProductoPreciosClaros: p.id,
        nombreBusqueda: texto,
        producto: p,
        sucursales,
      })
      setAviso(resultado === 'agregado' ? `«${p.nombre}» guardado.` : 'Ese producto ya está guardado.')
      setResultados(null)
      setTexto('')
      await cargarGuardados()
    } catch (err) {
      setAviso(err instanceof Error ? err.message : 'No se pudo guardar el producto.')
    } finally {
      setAgregando(null)
    }
  }

  const refrescar = async (p: ProductoListado) => {
    if (sucursales.length === 0) {
      setAviso('Necesitás ubicación para actualizar precios.')
      return
    }
    setRefrescando(p.id)
    setErrorRefresco((e) => ({ ...e, [p.id]: '' }))
    try {
      await refrescarPrecios(p.id, p.idProductoPreciosClaros, sucursales)
      await cargarGuardados()
    } catch (err) {
      setErrorRefresco((e) => ({ ...e, [p.id]: err instanceof Error ? err.message : 'Error de red' }))
    } finally {
      setRefrescando(null)
    }
  }

  const eliminar = async (p: ProductoListado) => {
    setEliminando(p.id)
    await new Promise((r) => setTimeout(r, 180))
    await eliminarProducto(p.id)
    setAviso('Producto eliminado.')
    await cargarGuardados()
  }

  const guardadosFiltrados = useMemo(
    () => (seleccionadas ? filtrarPrecios(guardados, seleccionadas) : guardados),
    [guardados, seleccionadas],
  )

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Productos</h1>

      <Card>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Buscar producto (ej: fideos)"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && buscar()}
              className="flex-1"
            />
            <Button onClick={buscar} disabled={!ubicacion || buscando}>
              {buscando ? <Loader2 className="animate-spin" /> : <Search />}
              Buscar
            </Button>
          </div>

          {!ubicacion && !geoError && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" /> Obteniendo tu ubicación…
            </p>
          )}

          {!ubicacion && geoError && (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm text-destructive">
                <MapPin size={14} /> {geoError}
              </p>
              <Button variant="secondary" size="sm" onClick={pedirUbicacion}>
                Reintentar ubicación
              </Button>
              <UbicacionManual onUbicar={(loc) => void usarUbicacion(loc)} />
            </div>
          )}

          {ubicacion && cargandoSucursales && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" /> Buscando sucursales cercanas…
            </p>
          )}

          {ubicacion && !cargandoSucursales && geoError && (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm text-destructive">
                <MapPin size={14} /> {geoError}
              </p>
              <Button variant="secondary" size="sm" onClick={() => void usarUbicacion(ubicacion)}>
                Reintentar sucursales
              </Button>
            </div>
          )}

          {ubicacion && !cargandoSucursales && !geoError && sucursales.length > 0 && !resultados && (
            <p className="text-sm text-muted-foreground">
              Buscando en las {sucursales.length} sucursales más cercanas.
            </p>
          )}

          {buscando && !resultados && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" /> Buscando…
            </p>
          )}

          {errorBusqueda && (
            <div className="flex items-center justify-between gap-2 rounded-md bg-destructive/10 px-3 py-2">
              <p className="text-sm text-destructive">{errorBusqueda}</p>
              <Button variant="secondary" size="sm" onClick={buscar}>
                Reintentar
              </Button>
            </div>
          )}

          {resultados && (
            <ul>
              {resultados.length === 0 && (
                <li className="py-2 text-sm text-muted-foreground">Sin resultados para «{texto}».</li>
              )}
              {resultados.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => guardar(p)}
                    disabled={agregando === p.id}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-2 text-left transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium">{p.nombre}</span>
                      <span className="block text-xs text-muted-foreground">
                        {p.presentacion} · desde {formatoPrecio(p.precioMin)}
                      </span>
                    </span>
                    {agregando === p.id ? (
                      <Loader2 className="shrink-0 animate-spin" />
                    ) : (
                      <Badge variant="secondary">Agregar</Badge>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Guardados</h2>
          {ultimaFecha && <p className="text-xs text-muted-foreground">Precios actualizados {hace(ultimaFecha)}</p>}
        </div>

        {!cargandoGuardados && guardados.length > 0 && <RefrescarTodos onTerminado={cargarGuardados} />}
        {aviso && <p className="text-sm text-muted-foreground">{aviso}</p>}

        {cargandoGuardados ? (
          <SkeletonCards cantidad={3} />
        ) : guardados.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Tus productos"
            description="Buscá un producto arriba y tocá «Agregar» para empezar a comparar precios."
          />
        ) : (
          <ul className="space-y-3">
            {guardadosFiltrados.map((p) => (
              <li
                key={p.id}
                className={cn(
                  'animate-in fade-in slide-in-from-bottom-1 duration-200',
                  eliminando === p.id && 'animate-out fade-out zoom-out-95',
                )}
              >
                <Card>
                  <CardContent className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium leading-snug">{p.nombreMostrado}</p>
                        <p className="text-xs text-muted-foreground">Búsqueda: {p.nombreBusqueda}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Actualizar precios de ${p.nombreMostrado}`}
                          onClick={() => refrescar(p)}
                          disabled={refrescando === p.id}
                        >
                          <RefreshCw className={refrescando === p.id ? 'animate-spin' : ''} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Eliminar ${p.nombreMostrado}`}
                          onClick={() => eliminar(p)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                    {p.precios.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Sin precios disponibles por ahora. Tocá el botón de actualizar.
                      </p>
                    ) : (
                      <ul className="flex flex-wrap gap-1.5">
                        {p.precios.map((pr, i) => (
                          <li key={pr.cadena}>
                            <Badge variant={i === 0 ? 'default' : 'secondary'}>
                              {pr.cadena} · {formatoPrecio(pr.precio)}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                    {errorRefresco[p.id] && (
                      <p className="text-xs text-destructive">
                        No se pudieron actualizar los precios: {errorRefresco[p.id]}
                      </p>
                    )}
                    {p.fechaUltimaConsulta && (
                      <p className="text-xs text-muted-foreground">
                        Consultada el {p.fechaUltimaConsulta.toLocaleString('es-AR')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default Productos
