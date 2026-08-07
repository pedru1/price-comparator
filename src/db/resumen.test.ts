import { calcularResumen, calcularResumenDetallado } from './resumen.ts'

function iguales(actual: unknown, esperado: unknown, msg: string): void {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(esperado)
  if (a !== e) {
    throw new Error(`FAIL ${msg}: esperaba ${e}, recibí ${a}`)
  }
}

// 3 productos: 2 con >=2 cadenas (aportan ahorro), 1 con una sola cadena (se descarta)
const items = [
  { precios: [{ precio: 1000 }, { precio: 1300 }] }, // ahorro 300
  { precios: [{ precio: 500 }, { precio: 800 }, { precio: 700 }] }, // ahorro 300
  { precios: [{ precio: 900 }] }, // descartado
  { precios: [] }, // descartado
]

iguales(calcularResumen(items), { productos: 2, ahorro: 600 }, 'resumen con 3 productos')

iguales(calcularResumen([]), { productos: 0, ahorro: 0 }, 'resumen vacío')
iguales(calcularResumen([{ precios: [{ precio: 10 }] }]), { productos: 0, ahorro: 0 }, 'resumen sin comparación')

// ---- calcularResumenDetallado: verificado a mano ----
// Fideos: Coto 100 / Carrefour 120 | Arroz: Carrefour 150 / Jumbo 140 | Leche: Coto 200 | Pan: sin precios
const detallado = calcularResumenDetallado([
  { nombreMostrado: 'Fideos', precios: [{ cadena: 'Coto', precio: 100 }, { cadena: 'Carrefour', precio: 120 }] },
  { nombreMostrado: 'Arroz', precios: [{ cadena: 'Carrefour', precio: 150 }, { cadena: 'Jumbo', precio: 140 }] },
  { nombreMostrado: 'Leche', precios: [{ cadena: 'Coto', precio: 200 }] },
  { nombreMostrado: 'Pan', precios: [] },
])
iguales(detallado.cadenas, [
  { cadena: 'Jumbo', total: 140, faltan: 2 },
  { cadena: 'Carrefour', total: 270, faltan: 1 },
  { cadena: 'Coto', total: 300, faltan: 1 },
], 'totales por cadena ordenados')
iguales(detallado.optimoCombinado, 440, 'óptimo combinado (100+140+200)')
iguales(detallado.mejorCadena, null, 'ninguna cadena completa')
iguales(detallado.ahorroExtra, null, 'sin ahorro extra')
iguales(detallado.sinDatos, ['Pan'], 'sin datos disponibles')
iguales(detallado.asignacion, [
  { nombreMostrado: 'Fideos', cadena: 'Coto' },
  { nombreMostrado: 'Arroz', cadena: 'Jumbo' },
  { nombreMostrado: 'Leche', cadena: 'Coto' },
], 'asignación: 3 productos, sin pérdidas ni duplicados')

// caso con cadena completa: Coto tiene A y B -> 200; óptimo 90+80=170 -> ahorro extra 30
const conCompleta = calcularResumenDetallado([
  { nombreMostrado: 'A', precios: [{ cadena: 'Coto', precio: 100 }, { cadena: 'Carrefour', precio: 90 }] },
  { nombreMostrado: 'B', precios: [{ cadena: 'Coto', precio: 100 }, { cadena: 'Jumbo', precio: 80 }] },
])
iguales(conCompleta.cadenas, [
  { cadena: 'Jumbo', total: 80, faltan: 1 },
  { cadena: 'Carrefour', total: 90, faltan: 1 },
  { cadena: 'Coto', total: 200, faltan: 0 },
], 'totales con cadena completa')
iguales(conCompleta.optimoCombinado, 170, 'óptimo combinado (90+80)')
iguales(conCompleta.mejorCadena, 'Coto', 'mejor cadena completa y más barata')
iguales(conCompleta.ahorroExtra, 30, 'ahorro extra vs Coto (200-170)')
iguales(conCompleta.asignacion, [
  { nombreMostrado: 'A', cadena: 'Carrefour' },
  { nombreMostrado: 'B', cadena: 'Jumbo' },
], 'asignación óptima')

// empate de precio mínimo: gana la primera en orden canónico (Coto antes que Carrefour)
const empate = calcularResumenDetallado([
  { nombreMostrado: 'X', precios: [{ cadena: 'Carrefour', precio: 100 }, { cadena: 'Coto', precio: 100 }] },
])
iguales(empate.asignacion, [{ nombreMostrado: 'X', cadena: 'Coto' }], 'empate resuelto por orden canónico')

console.log('resumen.test.ts: OK')
