// Quadros da intro: B, R, X e o logo completo (BRX com LABS embaixo).
// O ElectricLogo contorna qualquer imagem com fundo transparente, então os quadros são desenhados
// num canvas com a Zen Dots e passados como PNG. Quando existir o logo oficial em SVG, basta trocar
// esta função por uma lista de caminhos, por exemplo ['/intro/b.svg', '/intro/r.svg', ...].

const FONT = '"Zen Dots", "Play", Arial, sans-serif'

function letter(char: string) {
  const c = document.createElement('canvas')
  c.width = c.height = 480
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.font = `400 360px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(char, c.width / 2, c.height / 2)
  return c.toDataURL('image/png')
}

/** Escreve um texto com espaço extra entre as letras, centralizado em x */
function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, gap: number) {
  const widths = [...text].map(ch => ctx.measureText(ch).width)
  const total = widths.reduce((a, b) => a + b, 0) + gap * (text.length - 1)
  let cursor = x - total / 2
  ;[...text].forEach((ch, i) => {
    ctx.fillText(ch, cursor, y)
    cursor += widths[i] + gap
  })
}

function logo() {
  const c = document.createElement('canvas')
  c.width = 1400
  c.height = 640
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.font = `400 300px ${FONT}`
  spaced(ctx, 'BRX', c.width / 2, 400, 24)
  ctx.font = `400 84px ${FONT}`
  spaced(ctx, 'LABS', c.width / 2, 540, 46)
  return c.toDataURL('image/png')
}

export async function buildIntroFrames() {
  try {
    await Promise.race([document.fonts.load(`400 300px ${FONT}`), new Promise(r => setTimeout(r, 2000))])
  } catch { /* segue com a fonte de fallback */ }
  return [letter('B'), letter('R'), letter('X'), logo()]
}

/** A intro só roda com WebGL2 e sem preferência por menos movimento */
export function shouldPlayIntro() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  try {
    return !!document.createElement('canvas').getContext('webgl2')
  } catch {
    return false
  }
}
