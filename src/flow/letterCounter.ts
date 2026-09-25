/*
  Acha o "miolo" (área vazia fechada) de uma letra numa imagem rasterizada — por exemplo, a parte de
  cima do R. Usado no mergulho da câmera no cartão BRX e no zoom da página final, que começam e
  terminam dentro do mesmo vão do R.
*/

export interface Counter {
  /** Centro do miolo, em px da imagem */
  x: number
  y: number
  /** Raio livre: distância do centro até a tinta mais próxima, em px */
  r: number
}

/**
 * @param alpha canal alfa da imagem (w × h), tinta = alfa alto
 * @param letterIndex qual letra, contando da esquerda (0 = primeira); espaços não contam
 */
export function findCounter(alpha: (x: number, y: number) => number, w: number, h: number, letterIndex: number): Counter | null {
  const ink = (x: number, y: number) => alpha(x, y) > 128

  // Letras = trechos de colunas com tinta
  const letters: [number, number][] = []
  let start = -1
  for (let x = 0; x <= w; x++) {
    let any = false
    for (let y = 0; y < h && x < w && !any; y++) any = ink(x, y)
    if (any && start < 0) start = x
    if (!any && start >= 0) { letters.push([start, x]); start = -1 }
  }
  const letter = letters[letterIndex]
  if (!letter) return null
  const [x0, x1] = letter
  let y0 = h, y1 = 0
  for (let y = 0; y < h; y++) for (let x = x0; x < x1; x++) if (ink(x, y)) { y0 = Math.min(y0, y); y1 = Math.max(y1, y) }

  // Tudo que é vazio e alcançável a partir da borda da caixa da letra é "fora"; o vazio que sobra é o miolo
  const bw = x1 - x0 + 2, bh = y1 - y0 + 3
  const outside = new Uint8Array(bw * bh)
  const stack: number[] = []
  const at = (x: number, y: number) => (y - (y0 - 1)) * bw + (x - (x0 - 1))
  const empty = (x: number, y: number) => x < x0 || x >= x1 || y < y0 || y > y1 || !ink(x, y)
  for (let x = x0 - 1; x <= x1; x++) stack.push(x, y0 - 1, x, y1 + 1)
  for (let y = y0 - 1; y <= y1 + 1; y++) stack.push(x0 - 1, y, x1, y)
  while (stack.length) {
    const y = stack.pop()!, x = stack.pop()!
    if (x < x0 - 1 || x > x1 || y < y0 - 1 || y > y1 + 1) continue
    const i = at(x, y)
    if (outside[i] || !empty(x, y)) continue
    outside[i] = 1
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1)
  }
  let sx = 0, sy = 0, n = 0
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (!ink(x, y) && !outside[at(x, y)]) { sx += x; sy += y; n++ }
    }
  }
  if (!n) return null
  const cx = sx / n, cy = sy / n

  // Raio livre: distância até a tinta mais próxima
  let r2 = Infinity
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (!ink(x, y)) continue
      const q = (x - cx) ** 2 + (y - cy) ** 2
      if (q < r2) r2 = q
    }
  }
  return { x: cx, y: cy, r: Math.sqrt(r2) }
}
