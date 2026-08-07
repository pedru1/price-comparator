export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
  onProgreso?: (hechos: number, total: number) => void,
): Promise<R[]> {
  const resultados = new Array<R>(items.length)
  let indice = 0
  let hechos = 0
  const cantidad = Math.min(Math.max(limit, 1), items.length)
  const worker = async () => {
    while (true) {
      const i = indice++
      if (i >= items.length) return
      resultados[i] = await fn(items[i])
      hechos++
      onProgreso?.(hechos, items.length)
    }
  }
  await Promise.all(Array.from({ length: cantidad }, worker))
  return resultados
}
