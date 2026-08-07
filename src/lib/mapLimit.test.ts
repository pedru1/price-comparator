import { mapLimit } from './mapLimit.ts'

function iguales(actual: unknown, esperado: unknown, msg: string): void {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(esperado)
  if (a !== e) {
    throw new Error(`FAIL ${msg}: esperaba ${e}, recibí ${a}`)
  }
}

const items = [1, 2, 3, 4, 5, 6]
let concurrentes = 0
let maxConcurrentes = 0
const progresos: number[] = []
const resultados = await mapLimit(
  items,
  3,
  async (x) => {
    concurrentes++
    maxConcurrentes = Math.max(maxConcurrentes, concurrentes)
    await new Promise((r) => setTimeout(r, 2))
    concurrentes--
    return x * 2
  },
  (hechos) => progresos.push(hechos),
)
iguales(resultados, [2, 4, 6, 8, 10, 12], 'resultados en orden')
iguales(maxConcurrentes, 3, 'máximo 3 en paralelo')
iguales(progresos, [1, 2, 3, 4, 5, 6], 'progreso incremental')

const vacio = await mapLimit([], 3, async (x: number) => x)
iguales(vacio, [], 'lista vacía')

console.log('mapLimit.test.ts: OK')
