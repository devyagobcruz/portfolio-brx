import * as THREE from 'three'
import type { Vec3 } from './config'

/*
  Efeitos de cada parada do fluxo. Cada um representa o que o nó faz e só aparece enquanto a câmera
  está parada nele (some na transição entre paradas):

  0 Webhook ........ ondas de sinal saindo do cartão (um chamado chegando)
  1 Editar campos .. os campos e temas da BRX sobem do nó, em pílulas
  2 Switch ......... um pulso testa as duas rotas, alternando (a decisão sendo avaliada)
  3 Merge .......... pontos chegam pelas duas entradas e o cartão pulsa ao juntar
  4 Código ......... símbolos de código sobem do nó
  5 WhatsApp ....... um aviãozinho de papel sai voando e aparece o selo "entregue"

  Todas as texturas são brancas e recebem a cor pelo material (accent/done), então acompanham o tema.
*/

type Curve = THREE.Curve<THREE.Vector3>

export interface EffectsInput {
  scene: THREE.Scene
  /** Posição de um nó principal pelo id */
  pos(id: string): Vec3
  /** Curva da ligação a → b do fluxo principal */
  curve(a: string, b: string): Curve
  /** Tamanho do cartão de um nó (unidades da cena) */
  card: { w: number; h: number }
}

export interface NodeEffects {
  /** `fade` apaga todos os efeitos (1 = normal, 0 = invisível), usado no mergulho da câmera */
  update(t: number, time: number, route: string | null, accent: THREE.Color, done: THREE.Color, fade?: number): void
  dispose(): void
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
/** Pílulas que sobem do nó "Editar campos" */
const FIELD_LABELS = ['"empresa"', '"automação"', '"base"', '"programação"', '"foco"', '"desenvolvimento web"', '"atendimento"', '"ia"', '"ui/ux"']
/** Ordem das colunas em que os símbolos do nó Código aparecem */
const GLYPH_SLOTS = [2, 5, 0, 3, 1, 4]
/** Sobe de 0 a 1 entre a e b */
const ramp = (a: number, b: number, x: number) => clamp01((x - a) / (b - a))
/** 0 → 1 → 0 ao longo da fase, com entrada e saída suaves */
const bell = (phase: number, fadeIn = 0.15, fadeOut = 0.3) => Math.min(ramp(0, fadeIn, phase), 1 - ramp(1 - fadeOut, 1, phase))

/* ---------- Texturas (brancas) ---------- */

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')!
  ctx.fillStyle = ctx.strokeStyle = '#fff'
  draw(ctx)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}

/** Contorno do cartão do nó (mesma proporção de textures.ts) */
const outlineTexture = () => canvasTexture(800, 300, ctx => {
  ctx.lineWidth = 6
  roundRect(ctx, 40, 30, 720, 240, 40); ctx.stroke()
})

const glowTexture = () => canvasTexture(128, 128, ctx => {
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128)
})

/** Texto (opcionalmente dentro de uma pílula). Devolve a textura e a proporção largura/altura. */
function textTexture(text: string, pill: boolean, font = '600 44px "JetBrains Mono", monospace') {
  const probe = document.createElement('canvas').getContext('2d')!
  probe.font = font
  const pad = pill ? 34 : 8
  const w = Math.ceil(probe.measureText(text).width) + pad * 2, h = 84
  const tex = canvasTexture(w, h, ctx => {
    if (pill) { ctx.lineWidth = 4; roundRect(ctx, 3, 3, w - 6, h - 6, (h - 6) / 2); ctx.stroke() }
    ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(text, w / 2, h / 2 + 2)
  })
  return { tex, aspect: w / h }
}

/** Aviãozinho de papel preenchido */
const planeTexture = () => canvasTexture(128, 128, ctx => {
  ctx.translate(64, 64); ctx.scale(110, 110); ctx.lineJoin = 'round'
  ctx.beginPath(); ctx.moveTo(-0.45, -0.02); ctx.lineTo(0.45, -0.38); ctx.lineTo(0.12, 0.44); ctx.lineTo(0.02, 0.1); ctx.closePath(); ctx.fill()
})

/* ---------- Efeitos ---------- */

export function createNodeEffects({ scene, pos, curve, card }: EffectsInput): NodeEffects {
  const group = new THREE.Group()
  scene.add(group)
  const textures: THREE.Texture[] = []
  const track = <T extends THREE.Texture>(t: T) => { textures.push(t); return t }

  const outlineTex = track(outlineTexture())
  const glowTex = track(glowTexture())
  const cardGeo = new THREE.PlaneGeometry(card.w, card.h)

  const sprite = (map: THREE.Texture, h: number, aspect = 1) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, opacity: 0 }))
    s.scale.set(h * aspect, h, 1); s.renderOrder = 3; s.visible = false
    group.add(s)
    return s
  }
  const outline = () => {
    const m = new THREE.Mesh(cardGeo, new THREE.MeshBasicMaterial({ map: outlineTex, transparent: true, depthWrite: false, opacity: 0 }))
    m.renderOrder = 1; m.visible = false
    group.add(m)
    return m
  }
  let fadeAll = 1
  const show = (obj: THREE.Sprite | THREE.Mesh, opacity: number) => {
    const mat = obj.material as THREE.SpriteMaterial | THREE.MeshBasicMaterial
    opacity *= fadeAll
    mat.opacity = opacity
    obj.visible = opacity > 0.005
  }
  const tint = (obj: THREE.Sprite | THREE.Mesh, c: THREE.Color) => (obj.material as THREE.SpriteMaterial).color.copy(c)

  /* 0 · Webhook: ondas de sinal */
  const hook = pos('webhook')
  const waves = [0, 1, 2].map(() => outline())

  /* 1 · Editar campos: pílulas subindo do nó */
  const fieldsAt = pos('sobre')
  const fields = FIELD_LABELS.map(label => {
    const { tex, aspect } = textTexture(label, true)
    return sprite(track(tex), 0.21, aspect)
  })

  /* 2 · Switch: pulso testando as duas rotas */
  const probes = ['web', 'auto'].map(id => ({ id, curve: curve('switch', id), glow: sprite(glowTex, 0.7) }))

  /* 3 · Merge: pontos chegando pelas duas entradas + pulso do cartão */
  const mergeAt = pos('merge')
  const arrivals = ['web', 'auto'].flatMap(id => [0, 1, 2].map(k => ({ curve: curve(id, 'merge'), k, glow: sprite(glowTex, 0.45) })))
  const mergePulse = outline()

  /* 4 · Código: símbolos subindo */
  const codeAt = pos('code')
  const glyphs = ['{ }', '</>', '=>', '( )', ';', '[ ]'].map((g, k) => {
    const { tex, aspect } = textTexture(g, false, '700 56px "JetBrains Mono", monospace')
    return { s: sprite(track(tex), 0.3, aspect), k }
  })

  /* 5 · WhatsApp: aviãozinho + selo "entregue" */
  const sendAt = pos('send')
  const paperPlane = sprite(track(planeTexture()), 0.5)
  const delivered = (() => { const { tex, aspect } = textTexture('✓✓ entregue', true, '700 44px "Play", Arial, sans-serif'); return sprite(track(tex), 0.28, aspect) })()

  const v = new THREE.Vector3()

  function update(t: number, time: number, route: string | null, accent: THREE.Color, done: THREE.Color, fade = 1) {
    fadeAll = fade
    // Peso de cada parada: 1 com a câmera parada no nó, 0 durante a transição
    const w = (i: number) => clamp01(1 - Math.abs(t - i) / 0.22)

    /* 0 · Webhook */
    const w0 = w(0)
    waves.forEach((m, k) => {
      const phase = (time * 0.55 + k / 3) % 1
      m.position.set(hook[0], hook[1], hook[2] - 0.03)
      m.scale.set(1 + phase * 0.35, 1 + phase * 0.9, 1)
      tint(m, accent); show(m, w0 * (1 - phase) ** 2 * 0.7)
    })

    /* 1 · Editar campos */
    const w1 = w(1)
    fields.forEach((s, k) => {
      // Três colunas sobre o cartão; pílulas seguidas caem em colunas diferentes e não se sobrepõem
      const phase = (time / 4.5 + k / fields.length) % 1
      const col = k % 3
      const x = fieldsAt[0] + (col - 1) * card.w * 0.35 + Math.sin(time * 1.1 + k) * 0.05
      s.position.set(x, fieldsAt[1] + card.h / 2 + 0.15 + phase * 1.5, fieldsAt[2] + 0.1)
      tint(s, accent); show(s, w1 * bell(phase, 0.2, 0.45) * 0.95)
    })

    /* 2 · Switch */
    const w2 = w(2)
    probes.forEach((p, k) => {
      const phase = (time * 0.62 + k * 0.5) % 1
      p.curve.getPoint(phase * 0.9, v); p.glow.position.copy(v)
      const dimmed = route !== null && route !== p.id
      tint(p.glow, accent); show(p.glow, w2 * Math.sin(Math.PI * phase) * (dimmed ? 0.12 : 1))
    })

    /* 3 · Merge */
    const w3 = w(3)
    let arrivedFlash = 0
    arrivals.forEach(a => {
      const phase = (time * 0.5 + a.k / 3) % 1
      a.curve.getPoint(0.35 + 0.65 * phase, v); a.glow.position.copy(v)
      tint(a.glow, accent); show(a.glow, w3 * bell(phase, 0.2, 0.12))
      arrivedFlash = Math.max(arrivedFlash, ramp(0.85, 1, phase))
    })
    const pulse = (time * 1.5) % 1
    mergePulse.position.set(mergeAt[0], mergeAt[1], mergeAt[2] - 0.03)
    mergePulse.scale.setScalar(1 + pulse * 0.12)
    tint(mergePulse, accent); show(mergePulse, w3 * (1 - pulse) * 0.5 * (0.4 + 0.6 * arrivedFlash))

    /* 4 · Código */
    const w4 = w(4)
    glyphs.forEach(({ s, k }) => {
      const phase = (time / 2.6 + k / glyphs.length) % 1
      // Posição horizontal embaralhada, para os símbolos não subirem em escada
      const slot = GLYPH_SLOTS[k % GLYPH_SLOTS.length]
      const x = codeAt[0] + (slot / (GLYPH_SLOTS.length - 1) - 0.5) * card.w * 0.8 + Math.sin(time * 1.3 + k) * 0.08
      s.position.set(x, codeAt[1] + card.h / 2 + 0.1 + phase * 1.3, codeAt[2] + 0.1)
      tint(s, accent); show(s, w4 * bell(phase, 0.2, 0.45) * 0.9)
    })

    /* 5 · WhatsApp */
    const w5 = w(5)
    const flight = (time / 2.8) % 1
    const fx = ramp(0, 0.75, flight)
    paperPlane.position.set(sendAt[0] + card.w / 2 + fx * 2.4, sendAt[1] + Math.sin(fx * Math.PI * 0.9) * 1.2 + fx * 0.5, sendAt[2] + 0.2)
    paperPlane.scale.setScalar(0.5 * (1 - fx * 0.45))
    tint(paperPlane, accent); show(paperPlane, w5 * bell(fx, 0.1, 0.35))
    const pop = ramp(0.3, 0.42, flight), gone = ramp(0.85, 1, flight)
    delivered.position.set(sendAt[0] + card.w / 2 - 0.55, sendAt[1] + card.h / 2 + 0.28 + pop * 0.08, sendAt[2] + 0.2)
    tint(delivered, done); show(delivered, w5 * pop * (1 - gone))
  }

  function dispose() {
    scene.remove(group)
    group.traverse(obj => {
      if (obj instanceof THREE.Sprite || obj instanceof THREE.Mesh) (obj.material as THREE.Material).dispose()
    })
    cardGeo.dispose()
    textures.forEach(t => t.dispose())
  }

  return { update, dispose }
}
