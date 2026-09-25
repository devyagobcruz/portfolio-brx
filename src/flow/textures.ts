import * as THREE from 'three'
import type { IconName, NodeDef } from './config'
import { findCounter, type Counter } from './letterCounter'

export type NodeStatus = 'idle' | 'running' | 'done'

export interface Theme {
  canvas: string
  dots: string
  surface: string
  tile: string
  border: string
  text: string
  muted: string
  accent: string
  done: string
}

/** Lê os tokens de cor definidos em index.css */
export function readTheme(): Theme {
  const cs = getComputedStyle(document.documentElement)
  const g = (n: string) => cs.getPropertyValue(n).trim()
  return {
    canvas: g('--canvas'), dots: g('--dots'), surface: g('--surface'), tile: g('--tile'), border: g('--border'),
    text: g('--text'), muted: g('--muted'), accent: g('--accent'), done: g('--done'),
  }
}

/* Desenho de ícones no canvas (coordenadas normalizadas -0.5..0.5).
   `inner` é a cor dos detalhes desenhados por cima de um ícone preenchido (fone do WhatsApp, play do vídeo...). */
function drawIcon(ctx: CanvasRenderingContext2D, icon: IconName, cx: number, cy: number, s: number, color: string, inner = '#fff') {
  ctx.save()
  ctx.translate(cx, cy); ctx.scale(s, s)
  ctx.strokeStyle = color; ctx.fillStyle = color
  ctx.lineWidth = 0.08; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  const circle = (x: number, y: number, r: number) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill() }
  ctx.beginPath()
  switch (icon) {
    case 'bolt':
      ctx.moveTo(0.1, -0.5); ctx.lineTo(-0.3, 0.08); ctx.lineTo(0, 0.08); ctx.lineTo(-0.1, 0.5); ctx.lineTo(0.3, -0.08); ctx.lineTo(0, -0.08); ctx.closePath(); ctx.fill(); break
    case 'fields':
      for (let k = -1; k <= 1; k++) { circle(-0.35, k * 0.3, 0.07); ctx.beginPath(); ctx.moveTo(-0.16, k * 0.3); ctx.lineTo(0.42, k * 0.3); ctx.stroke() } break
    case 'fork':
      ctx.moveTo(-0.45, 0); ctx.lineTo(-0.1, 0)
      ctx.bezierCurveTo(0.12, 0, 0.12, -0.34, 0.36, -0.34)
      ctx.moveTo(-0.1, 0); ctx.bezierCurveTo(0.12, 0, 0.12, 0.34, 0.36, 0.34); ctx.stroke()
      circle(0.4, -0.34, 0.08); circle(0.4, 0.34, 0.08); break
    case 'browser':
      ctx.rect(-0.45, -0.34, 0.9, 0.68); ctx.moveTo(-0.45, -0.14); ctx.lineTo(0.45, -0.14); ctx.stroke()
      circle(-0.33, -0.24, 0.035); circle(-0.23, -0.24, 0.035); break
    case 'nodes':
      ctx.moveTo(-0.33, 0.24); ctx.lineTo(0, -0.24); ctx.lineTo(0.33, 0.24); ctx.stroke()
      circle(-0.33, 0.24, 0.11); circle(0, -0.24, 0.11); circle(0.33, 0.24, 0.11); break
    case 'merge':
      // Espelho do fork: duas entradas que se juntam numa saída
      ctx.moveTo(-0.36, -0.34); ctx.bezierCurveTo(-0.12, -0.34, -0.12, 0, 0.1, 0)
      ctx.moveTo(-0.36, 0.34); ctx.bezierCurveTo(-0.12, 0.34, -0.12, 0, 0.1, 0)
      ctx.moveTo(0.1, 0); ctx.lineTo(0.45, 0); ctx.stroke()
      circle(-0.4, -0.34, 0.08); circle(-0.4, 0.34, 0.08); break
    case 'code':
      ctx.moveTo(-0.2, -0.3); ctx.lineTo(-0.45, 0); ctx.lineTo(-0.2, 0.3)
      ctx.moveTo(0.2, -0.3); ctx.lineTo(0.45, 0); ctx.lineTo(0.2, 0.3)
      ctx.moveTo(0.08, -0.38); ctx.lineTo(-0.08, 0.38); ctx.stroke(); break
    case 'send':
      ctx.moveTo(-0.45, -0.02); ctx.lineTo(0.45, -0.38); ctx.lineTo(0.12, 0.44); ctx.lineTo(0.02, 0.1); ctx.closePath(); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0.02, 0.1); ctx.lineTo(0.45, -0.38); ctx.stroke(); break

    /* ---------- Ícones do fluxo de fundo ---------- */
    case 'webhook': {
      // Três pontos ligados em triângulo, como o ícone de webhook do n8n
      const pts: [number, number][] = [[0, -0.28], [-0.3, 0.24], [0.3, 0.24]]
      ctx.lineWidth = 0.09
      ctx.moveTo(-0.05, -0.18); ctx.lineTo(-0.22, 0.12)
      ctx.moveTo(-0.17, 0.26); ctx.lineTo(0.17, 0.26)
      ctx.moveTo(0.22, 0.12); ctx.lineTo(0.05, -0.18); ctx.stroke()
      pts.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 0.12, 0, Math.PI * 2); ctx.stroke() })
      break
    }
    case 'switch': {
      // Uma entrada que se divide em três setas
      const tip = (y: number) => { ctx.moveTo(0.26, y - 0.1); ctx.lineTo(0.38, y); ctx.lineTo(0.26, y + 0.1) }
      ctx.moveTo(-0.42, -0.3); ctx.lineTo(0.38, -0.3)
      ctx.moveTo(-0.2, -0.3); ctx.bezierCurveTo(-0.06, -0.3, -0.06, 0, 0.08, 0); ctx.lineTo(0.38, 0)
      ctx.moveTo(-0.2, -0.3); ctx.bezierCurveTo(-0.14, 0.3, -0.06, 0.3, 0.08, 0.3); ctx.lineTo(0.38, 0.3)
      tip(-0.3); tip(0); tip(0.3); ctx.stroke(); break
    }
    case 'whatsapp':
      // Balão de conversa com fone
      ctx.arc(0.02, -0.02, 0.4, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.moveTo(-0.3, 0.22); ctx.lineTo(-0.42, 0.44); ctx.lineTo(-0.14, 0.36); ctx.closePath(); ctx.fill()
      ctx.strokeStyle = inner; ctx.lineWidth = 0.1
      ctx.beginPath(); ctx.arc(0.02, -0.02, 0.19, Math.PI * 0.6, Math.PI * 1.35); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(-0.14, 0.12); ctx.lineTo(-0.05, 0.05); ctx.moveTo(-0.08, -0.2); ctx.lineTo(-0.03, -0.12); ctx.stroke()
      break
    case 'sheets':
      // Documento com canto dobrado e tabela
      ctx.moveTo(-0.3, -0.46); ctx.lineTo(0.12, -0.46); ctx.lineTo(0.3, -0.28); ctx.lineTo(0.3, 0.46); ctx.lineTo(-0.3, 0.46); ctx.closePath(); ctx.fill()
      ctx.strokeStyle = inner; ctx.lineWidth = 0.05
      ctx.beginPath(); ctx.rect(-0.17, -0.02, 0.34, 0.3)
      ctx.moveTo(-0.17, 0.08); ctx.lineTo(0.17, 0.08); ctx.moveTo(-0.17, 0.18); ctx.lineTo(0.17, 0.18)
      ctx.moveTo(-0.02, -0.02); ctx.lineTo(-0.02, 0.28); ctx.stroke(); break
    case 'video':
      // Tela arredondada com o botão de play
      roundRect(ctx, -0.46, -0.32, 0.92, 0.64, 0.16); ctx.fill()
      ctx.fillStyle = inner; ctx.beginPath(); ctx.moveTo(-0.11, -0.16); ctx.lineTo(0.19, 0); ctx.lineTo(-0.11, 0.16); ctx.closePath(); ctx.fill()
      break
    case 'edit':
      // Quadro com lápis
      ctx.moveTo(0.04, -0.36); ctx.lineTo(-0.36, -0.36); ctx.lineTo(-0.36, 0.38); ctx.lineTo(0.38, 0.38); ctx.lineTo(0.38, -0.02)
      ctx.moveTo(0.27, -0.44); ctx.lineTo(0.43, -0.28); ctx.lineTo(0, 0.15); ctx.lineTo(-0.19, 0.2); ctx.lineTo(-0.15, 0.01); ctx.closePath(); ctx.stroke()
      break
    case 'aggregate':
      // Três linhas que convergem numa saída
      for (const y of [-0.28, 0, 0.28]) { ctx.moveTo(-0.42, y); ctx.lineTo(-0.08, y) }
      ctx.moveTo(-0.08, -0.28); ctx.quadraticCurveTo(0.12, -0.28, 0.14, 0)
      ctx.moveTo(-0.08, 0.28); ctx.quadraticCurveTo(0.12, 0.28, 0.14, 0)
      ctx.moveTo(-0.08, 0); ctx.lineTo(0.44, 0); ctx.stroke(); break
    case 'agent':
      // Cabeça de robô
      roundRect(ctx, -0.36, -0.14, 0.72, 0.48, 0.18); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, -0.14); ctx.lineTo(0, -0.3); ctx.stroke()
      circle(0, -0.36, 0.07); circle(-0.14, 0.1, 0.065); circle(0.14, 0.1, 0.065)
      ctx.beginPath(); ctx.moveTo(-0.46, 0.02); ctx.lineTo(-0.46, 0.18); ctx.moveTo(0.46, 0.02); ctx.lineTo(0.46, 0.18); ctx.stroke()
      break
    case 'brain':
      // Cérebro: dois hemisférios com dobras
      ctx.ellipse(-0.17, 0, 0.22, 0.36, 0, 0, Math.PI * 2); ctx.stroke()
      ctx.beginPath(); ctx.ellipse(0.17, 0, 0.22, 0.36, 0, 0, Math.PI * 2); ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(-0.3, -0.1); ctx.quadraticCurveTo(-0.17, -0.02, -0.06, -0.12)
      ctx.moveTo(-0.3, 0.14); ctx.quadraticCurveTo(-0.17, 0.06, -0.06, 0.16)
      ctx.moveTo(0.3, -0.1); ctx.quadraticCurveTo(0.17, -0.02, 0.06, -0.12)
      ctx.moveTo(0.3, 0.14); ctx.quadraticCurveTo(0.17, 0.06, 0.06, 0.16); ctx.stroke(); break
    case 'database':
      // Cilindro de banco de dados
      ctx.ellipse(0, -0.3, 0.3, 0.11, 0, 0, Math.PI * 2)
      ctx.moveTo(-0.3, -0.3); ctx.lineTo(-0.3, 0.3); ctx.moveTo(0.3, -0.3); ctx.lineTo(0.3, 0.3); ctx.stroke()
      for (const y of [-0.1, 0.1, 0.3]) { ctx.beginPath(); ctx.ellipse(0, y, 0.3, 0.11, 0, 0, Math.PI); ctx.stroke() }
      break
    case 'if': {
      // Uma entrada, duas saídas
      const tip = (y: number) => { ctx.moveTo(0.26, y - 0.1); ctx.lineTo(0.38, y); ctx.lineTo(0.26, y + 0.1) }
      ctx.moveTo(-0.42, -0.26); ctx.lineTo(0.38, -0.26)
      ctx.moveTo(-0.14, -0.26); ctx.bezierCurveTo(0.02, -0.26, -0.04, 0.26, 0.12, 0.26); ctx.lineTo(0.38, 0.26)
      tip(-0.26); tip(0.26); ctx.stroke(); break
    }
    case 'filter':
      // Linhas que afunilam
      ctx.moveTo(-0.4, -0.26); ctx.lineTo(0.4, -0.26)
      ctx.moveTo(-0.24, 0); ctx.lineTo(0.24, 0)
      ctx.moveTo(-0.08, 0.26); ctx.lineTo(0.08, 0.26); ctx.stroke(); break
    case 'globe':
      // Globo com meridiano e linha do equador
      ctx.arc(0, 0, 0.4, 0, Math.PI * 2)
      ctx.moveTo(0.17, 0); ctx.ellipse(0, 0, 0.17, 0.4, 0, 0, Math.PI * 2)
      ctx.moveTo(-0.4, 0); ctx.lineTo(0.4, 0); ctx.stroke(); break
    case 'hourglass':
      // Ampulheta: barras em cima e embaixo, vidro em X e a areia no fundo
      ctx.moveTo(-0.3, -0.42); ctx.lineTo(0.3, -0.42)
      ctx.moveTo(-0.3, 0.42); ctx.lineTo(0.3, 0.42)
      ctx.moveTo(-0.22, -0.42); ctx.bezierCurveTo(-0.22, -0.12, 0.2, -0.1, 0.2, 0.42)
      ctx.moveTo(0.22, -0.42); ctx.bezierCurveTo(0.22, -0.12, -0.2, -0.1, -0.2, 0.42); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(-0.14, 0.4); ctx.quadraticCurveTo(0, 0.2, 0.14, 0.4); ctx.closePath(); ctx.fill()
      break
    case 'flask':
      // Frasco de laboratório com líquido e bolhas (o "Labs" da BRX)
      ctx.moveTo(-0.11, -0.36); ctx.lineTo(-0.11, -0.08); ctx.lineTo(-0.38, 0.36)
      ctx.quadraticCurveTo(-0.42, 0.44, -0.32, 0.44); ctx.lineTo(0.32, 0.44)
      ctx.quadraticCurveTo(0.42, 0.44, 0.38, 0.36); ctx.lineTo(0.11, -0.08); ctx.lineTo(0.11, -0.36)
      ctx.moveTo(-0.19, -0.36); ctx.lineTo(0.19, -0.36)
      ctx.moveTo(-0.27, 0.17); ctx.lineTo(0.27, 0.17); ctx.stroke()
      ctx.lineWidth = 0.05
      ;[[0.09, 0.31, 0.045], [-0.13, 0.33, 0.03], [0.04, -0.48, 0.035], [0.15, -0.56, 0.028]].forEach(([x, y, r]) => {
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke()
      })
      break
    default:
      ctx.rect(-0.3, -0.3, 0.6, 0.6); ctx.stroke()
  }
  ctx.restore()
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}

/** Tamanho do canvas de cada nó, em pixels */
export const NODE_CANVAS = { w: 800, h: 300 }

export function nodeTexture(def: NodeDef, status: NodeStatus, th: Theme, anisotropy: number) {
  const { w: CW, h: CH } = NODE_CANVAS
  const c = document.createElement('canvas'); c.width = CW; c.height = CH
  const ctx = c.getContext('2d')!
  const borderColor = status === 'running' ? th.accent : status === 'done' ? th.done : th.border
  // alças de entrada/saída
  ctx.fillStyle = th.surface; ctx.strokeStyle = borderColor; ctx.lineWidth = 5
  if (def.input !== false) { ctx.beginPath(); ctx.arc(40, CH / 2, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke() }
  if (def.output !== false) { ctx.beginPath(); ctx.arc(760, CH / 2, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke() }
  // cartão
  roundRect(ctx, 40, 30, 720, 240, 40)
  ctx.fillStyle = th.surface; ctx.fill()
  ctx.lineWidth = status === 'idle' ? 4 : 7; ctx.strokeStyle = borderColor; ctx.stroke()
  // bloco do ícone
  roundRect(ctx, 72, 62, 176, 176, 30)
  ctx.fillStyle = th.tile; ctx.fill()
  drawIcon(ctx, def.icon, 160, 150, 92, def.color ?? (status === 'idle' ? th.muted : borderColor))
  // textos
  let size = 46
  ctx.font = `700 ${size}px "Play", Arial, sans-serif`
  while (ctx.measureText(def.title).width > 450 && size > 30) { size -= 2; ctx.font = `700 ${size}px "Play", Arial, sans-serif` }
  ctx.fillStyle = th.text; ctx.textBaseline = 'alphabetic'
  // Sem subtítulo (nós de fundo), o título fica centralizado na altura do cartão
  ctx.fillText(def.title, 280, def.type ? 142 : 150 + size * 0.35)
  if (def.type) {
    ctx.font = '400 28px "JetBrains Mono", monospace'
    ctx.fillStyle = th.muted
    ctx.fillText(def.type, 280, 194)
  }
  // selo de sucesso
  if (status === 'done') {
    ctx.fillStyle = th.done; ctx.beginPath(); ctx.arc(712, 78, 26, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = th.surface; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.beginPath(); ctx.moveTo(700, 79); ctx.lineTo(709, 88); ctx.lineTo(725, 69); ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = anisotropy
  return tex
}

/** Tamanho lógico do cartão do nó final BRX (quadrado), em px. O desenho usa essas coordenadas. */
export const BRX_CANVAS = 400
/** Resolução real da textura em relação ao tamanho lógico: alta, porque a câmera chega bem perto do R */
const BRX_TEXTURE_SCALE = 2.5
const BRX_TITLE = { text: 'BRX', font: '400 80px "Zen Dots", "Play", Arial, sans-serif', x: BRX_CANVAS / 2, baseline: 130 }

/** Escreve o título do cartão (mesma posição na textura e na medição do miolo do R) */
function drawBrxTitle(ctx: CanvasRenderingContext2D) {
  ctx.font = BRX_TITLE.font
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
  ctx.fillText(BRX_TITLE.text, BRX_TITLE.x, BRX_TITLE.baseline)
}

let brxCounter: Counter | null | undefined
/**
 * Miolo da parte de cima do R no título do cartão, em px lógicos: é por ali que a câmera mergulha.
 * Precisa da fonte Zen Dots carregada (a cena só é criada depois das fontes).
 */
export function brxTitleCounter(): Counter {
  if (brxCounter) return brxCounter
  const k = 4
  const c = document.createElement('canvas'); c.width = c.height = BRX_CANVAS * k
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.scale(k, k); ctx.fillStyle = '#fff'
  drawBrxTitle(ctx)
  const data = ctx.getImageData(0, 0, c.width, c.height).data
  const found = findCounter((x, y) => data[(y * c.width + x) * 4 + 3], c.width, c.height, 1)
  // Sem a medição (fonte não carregou), usa um ponto aproximado dentro do R
  brxCounter = found ? { x: found.x / k, y: found.y / k, r: found.r / k } : { x: 200, y: 88, r: 6 }
  return brxCounter
}

/** Canvas do nó Wait, em px lógicos: o título fica acima do cartão, como no n8n */
export const WAIT_CANVAS = { w: 400, h: 480, cardY: 104 }
/** Altura (px) do centro do cartão do Wait, onde ficam as alças */
export const WAIT_CARD_CY = WAIT_CANVAS.cardY + (WAIT_CANVAS.w - 48) / 2

/** Nó Wait da transição final: título "Wait" em cima e o cartão quadrado com a ampulheta */
export function waitNodeTexture(status: NodeStatus, th: Theme, anisotropy: number) {
  const { w: W, h: H, cardY } = WAIT_CANVAS
  const scale = 2
  const c = document.createElement('canvas'); c.width = W * scale; c.height = H * scale
  const ctx = c.getContext('2d')!
  ctx.scale(scale, scale)
  const borderColor = status === 'running' ? th.accent : status === 'done' ? th.done : th.border
  const card = W - 48
  // título acima do cartão
  ctx.font = '700 58px "Play", Arial, sans-serif'
  ctx.fillStyle = th.text; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
  ctx.fillText('Wait', W / 2, 74)
  // alças de entrada e saída
  ctx.fillStyle = th.surface; ctx.strokeStyle = borderColor; ctx.lineWidth = 5
  for (const x of [24, W - 24]) { ctx.beginPath(); ctx.arc(x, WAIT_CARD_CY, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke() }
  // cartão
  roundRect(ctx, 24, cardY, card, card, 44)
  ctx.fillStyle = th.surface; ctx.fill()
  ctx.lineWidth = status === 'idle' ? 4 : 7; ctx.strokeStyle = borderColor; ctx.stroke()
  // bloco do ícone
  roundRect(ctx, W / 2 - 90, WAIT_CARD_CY - 90, 180, 180, 32)
  ctx.fillStyle = th.tile; ctx.fill()
  drawIcon(ctx, 'hourglass', W / 2, WAIT_CARD_CY, 120, status === 'idle' ? th.muted : borderColor)
  // selo de concluído
  if (status === 'done') {
    ctx.fillStyle = th.done; ctx.beginPath(); ctx.arc(W - 54, cardY + 30, 21, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = th.surface; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.beginPath(); ctx.moveTo(W - 64, cardY + 31); ctx.lineTo(W - 57, cardY + 38); ctx.lineTo(W - 44, cardY + 23); ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = anisotropy
  return tex
}

/** Contorno branco do cartão BRX (mesma forma), usado nas ondas de conclusão; recebe a cor pelo material */
export function brxOutlineTexture() {
  const S = BRX_CANVAS
  const c = document.createElement('canvas'); c.width = c.height = S
  const ctx = c.getContext('2d')!
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 5
  roundRect(ctx, 24, 24, S - 48, S - 48, 44); ctx.stroke()
  return new THREE.CanvasTexture(c)
}

/** Nó final BRX: cartão quadrado com "BRX" em cima e o frasco no meio */
export function brxNodeTexture(status: NodeStatus, th: Theme, anisotropy: number) {
  const S = BRX_CANVAS
  const c = document.createElement('canvas'); c.width = c.height = S * BRX_TEXTURE_SCALE
  const ctx = c.getContext('2d')!
  ctx.scale(BRX_TEXTURE_SCALE, BRX_TEXTURE_SCALE)
  const borderColor = status === 'running' ? th.accent : status === 'done' ? th.done : th.border
  // alça de entrada
  ctx.fillStyle = th.surface; ctx.strokeStyle = borderColor; ctx.lineWidth = 5
  ctx.beginPath(); ctx.arc(24, S / 2, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  // cartão
  roundRect(ctx, 24, 24, S - 48, S - 48, 44)
  ctx.fillStyle = th.surface; ctx.fill()
  ctx.lineWidth = status === 'idle' ? 4 : 7; ctx.strokeStyle = borderColor; ctx.stroke()
  // título
  ctx.fillStyle = th.text
  drawBrxTitle(ctx)
  // bloco do ícone
  roundRect(ctx, 125, 160, 150, 150, 28)
  ctx.fillStyle = th.tile; ctx.fill()
  drawIcon(ctx, 'flask', S / 2, 235, 100, status === 'idle' ? th.muted : borderColor)
  // selo de sucesso (fluxo concluído)
  if (status === 'done') {
    ctx.fillStyle = th.done; ctx.beginPath(); ctx.arc(S - 54, 54, 21, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = th.surface; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.beginPath(); ctx.moveTo(S - 64, 55); ctx.lineTo(S - 57, 62); ctx.lineTo(S - 44, 47); ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = anisotropy
  return tex
}

/** Tamanho do canvas de um sub-nó (círculo com o nome embaixo), em pixels */
export const SUB_CANVAS = { w: 320, h: 340 }
/** Centro e raio do círculo do sub-nó dentro do canvas */
export const SUB_CIRCLE = { cy: 124, r: 104 }

/** Sub-nó do n8n (modelo, memória, ferramenta de um agente): círculo com ícone e o nome embaixo */
export function subNodeTexture(def: NodeDef, th: Theme, anisotropy: number) {
  const { w, h } = SUB_CANVAS
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const ctx = c.getContext('2d')!
  ctx.beginPath(); ctx.arc(w / 2, SUB_CIRCLE.cy, SUB_CIRCLE.r, 0, Math.PI * 2)
  ctx.fillStyle = th.surface; ctx.fill()
  ctx.lineWidth = 5; ctx.strokeStyle = th.border; ctx.stroke()
  drawIcon(ctx, def.icon, w / 2, SUB_CIRCLE.cy, 104, def.color ?? th.muted, th.surface)
  ctx.font = '700 36px "Play", Arial, sans-serif'
  ctx.fillStyle = th.text; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
  ctx.fillText(def.title, w / 2, h - 18)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = anisotropy
  return tex
}

/** Texturas brancas usadas como máscara: ponto da grade, halo radial e brilho do nó */
export function softTexture(kind: 'dot' | 'radial' | 'glow') {
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')!
  if (kind === 'dot') {
    c.width = c.height = 64
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(32, 32, 28, 0, Math.PI * 2); ctx.fill()
  } else if (kind === 'radial') {
    c.width = c.height = 128
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128)
  } else {
    c.width = 512; c.height = 256
    ctx.shadowColor = '#fff'; ctx.shadowBlur = 48
    roundRect(ctx, 70, 70, 372, 116, 28); ctx.fillStyle = '#fff'; ctx.fill()
  }
  return new THREE.CanvasTexture(c)
}
