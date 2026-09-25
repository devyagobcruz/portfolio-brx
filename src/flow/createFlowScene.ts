import * as THREE from 'three'
import { BACKGROUND_DESKTOP_LIFT, BACKGROUND_EDGES, BRX_NODE, BACKGROUND_NODES, BACKGROUND_Z, EDGES, N, NODES, STOPS, type NodeDef, type Vec3 } from './config'
import { createNodeEffects } from './effects'
import { BRX_CANVAS, brxOutlineTexture, brxTitleCounter, NODE_CANVAS, SUB_CANVAS, brxNodeTexture, SUB_CIRCLE, nodeTexture, readTheme, softTexture, subNodeTexture, type NodeStatus } from './textures'

export interface FlowScene {
  /** Atualiza e desenha um quadro. `t` vai de 0 a N-1; `pointer` em -1..1. */
  update(t: number, time: number, dt: number, pointer: { x: number; y: number }): void
  /** Posição na tela (px) do ponto logo abaixo do nó, para ancorar a dica de clique */
  project(id: string): { x: number; y: number }
  /** Destaca uma das rotas do Switch e apaga a outra (null mostra as duas) */
  setRoute(id: string | null): void
  /** Transição para a página final (0..1): viagem até o nó BRX e mergulho no cartão dele */
  setFinale(amount: number): void
  dispose(): void
}

export interface FlowSceneOptions {
  reduced: boolean
  /** Nós que podem ser clicados (só respondem depois que o fluxo chega neles) */
  clickable: ReadonlySet<string>
  onNodeClick(id: string): void
}

interface NodeObj {
  def: NodeDef
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  glow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null
  ghost: boolean
  tex: Partial<Record<NodeStatus, THREE.CanvasTexture>>
  status: NodeStatus | null
  scale: number
}

const TUB = 90, RAD = 6
const PW = 3.6, PH = PW * NODE_CANVAS.h / NODE_CANVAS.w, HANDLE = PW * 360 / NODE_CANVAS.w
/** Sub-nó (círculo): largura do plano e a distância do centro do plano até o topo do círculo */
const SW = 1.5, SH = SW * SUB_CANVAS.h / SUB_CANVAS.w, SUB_TOP = SH / 2 - (SUB_CIRCLE.cy - SUB_CIRCLE.r) / SUB_CANVAS.h * SH
const ROUTES = ['web', 'auto']
/** Nós cujo efeito de parada já marca a execução: não recebem o brilho pulsante de "em execução" */
const NO_RUNNING_GLOW = new Set(['webhook'])
const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
const smoothstep = (x: number) => { const k = clamp01(x); return k * k * (3 - 2 * k) }
/** Layout empilhado (celular e tablet em pé). Mesmo critério da media query em index.css. */
const isStacked = () => innerWidth < 761 || (innerWidth <= 1024 && innerHeight > innerWidth)

/** Monta a cena 3D do fluxo no canvas. Lança erro se o WebGL não estiver disponível. */
export function createFlowScene(canvas: HTMLCanvasElement, { reduced, clickable, onNodeClick }: FlowSceneOptions): FlowScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  const scene = new THREE.Scene()
  // A névoa vai até 38 para o fluxo de fundo (mais distante) continuar visível, só esmaecido
  const fog = new THREE.Fog(0x000000, 11, 38)
  scene.fog = fog
  // near baixo: no fim do mergulho a câmera fica a poucos centímetros do cartão (dentro do R)
  const camera = new THREE.PerspectiveCamera(40, 1, 0.005, 200)
  const maxAniso = renderer.capabilities.getMaxAnisotropy()

  const dotTex = softTexture('dot'), radialTex = softTexture('radial'), glowTex = softTexture('glow')

  /* Grade de pontos do canvas do n8n */
  const gridPos: number[] = []
  for (let x = -24; x <= 72; x += 1) for (let y = -16; y <= 16; y += 1) gridPos.push(x, y, -2.2)
  const gridGeo = new THREE.BufferGeometry()
  gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridPos, 3))
  const gridMat = new THREE.PointsMaterial({ size: 0.075, map: dotTex, alphaTest: 0.5, transparent: true })
  scene.add(new THREE.Points(gridGeo, gridMat))

  /* Nós */
  const planeGeo = new THREE.PlaneGeometry(PW, PH)
  const glowGeo = new THREE.PlaneGeometry(PW * 1.45, PH * 1.9)
  const subGeo = new THREE.PlaneGeometry(SW, SH)
  const nodes: Record<string, NodeObj> = {}
  const allNodeObjs: NodeObj[] = []
  // Fluxo de fundo num grupo próprio: no desktop ele é deslocado para cima (ver resize)
  const bgGroup = new THREE.Group()
  scene.add(bgGroup)
  function makeNode(def: NodeDef, ghost: boolean): NodeObj {
    const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: ghost ? 0.45 : 1, depthWrite: false })
    const mesh = new THREE.Mesh(def.kind === 'sub' ? subGeo : planeGeo, mat)
    mesh.position.set(...def.pos); mesh.renderOrder = 2
    mesh.userData.id = def.id
    ;(ghost ? bgGroup : scene).add(mesh)
    let glow: NodeObj['glow'] = null
    if (!ghost) {
      glow = new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, depthWrite: false }))
      glow.position.set(def.pos[0], def.pos[1], def.pos[2] - 0.05); glow.renderOrder = 1
      scene.add(glow)
    }
    const obj: NodeObj = { def, mesh, glow, ghost, tex: {}, status: null, scale: 1 }
    allNodeObjs.push(obj)
    return obj
  }
  NODES.forEach(d => { nodes[d.id] = makeNode(d, false) })
  // Fluxo de fundo (decorativo): mesmos cartões, translúcidos e mais longe da câmera
  const ghosts: Record<string, NodeObj> = {}
  BACKGROUND_NODES.forEach(({ pos, ...b }) => {
    ghosts[b.id] = makeNode({ ...b, type: '', pos: [pos[0], pos[1], BACKGROUND_Z], at: Infinity }, true)
  })

  /* Conexões */
  function edgeCurve(a: Vec3, b: Vec3) {
    const p0 = new THREE.Vector3(a[0] + HANDLE, a[1], a[2])
    const p3 = new THREE.Vector3(b[0] - HANDLE, b[1], b[2])
    const dx = Math.max(1.2, (p3.x - p0.x) * 0.5)
    return new THREE.CubicBezierCurve3(p0, new THREE.Vector3(p0.x + dx, p0.y, p0.z), new THREE.Vector3(p3.x - dx, p3.y, p3.z), p3)
  }
  const baseEdgeMat = new THREE.MeshBasicMaterial()
  const ghostEdgeMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.45 })
  const packetMat = new THREE.MeshBasicMaterial()
  const pulseMat = new THREE.MeshBasicMaterial()
  const haloMat = new THREE.SpriteMaterial({ map: radialTex, transparent: true, depthWrite: false })
  const accentC = new THREE.Color(), doneC = new THREE.Color()
  const packetGeo = new THREE.SphereGeometry(0.09, 16, 12)
  const pulseGeo = new THREE.SphereGeometry(0.055, 12, 10)

  const edges = EDGES.map(([a, b, s, e], idx) => {
    const curve = edgeCurve(nodes[a].def.pos, nodes[b].def.pos)
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, TUB, 0.022, RAD, false), baseEdgeMat))
    const progGeo = new THREE.TubeGeometry(curve, TUB, 0.04, RAD, false)
    const prog = new THREE.Mesh(progGeo, new THREE.MeshBasicMaterial())
    progGeo.setDrawRange(0, 0)
    scene.add(prog)
    const packet = new THREE.Group()
    packet.add(new THREE.Mesh(packetGeo, packetMat))
    const halo = new THREE.Sprite(haloMat); halo.scale.set(0.9, 0.9, 1); packet.add(halo)
    packet.visible = false; scene.add(packet)
    const pulse = new THREE.Mesh(pulseGeo, pulseMat)
    pulse.visible = false; scene.add(pulse)
    return { a, b, curve, s, e, prog, progGeo, packet, pulse, phase: idx * 0.37, lastCount: -1 }
  })
  // Ligações do fluxo de fundo. Para um sub-nó, a linha desce tracejada da base do nó até o topo do círculo.
  const subEdgeMat = new THREE.LineDashedMaterial({ dashSize: 0.14, gapSize: 0.1, transparent: true, opacity: 0.6 })
  BACKGROUND_EDGES.forEach(([a, b]) => {
    const from = ghosts[a].def.pos, to = ghosts[b].def.pos
    if (ghosts[b].def.kind === 'sub') {
      const p0 = new THREE.Vector3(from[0], from[1] - PH / 2, from[2])
      const p3 = new THREE.Vector3(to[0], to[1] + SUB_TOP, to[2])
      const dy = (p0.y - p3.y) * 0.5
      const curve = new THREE.CubicBezierCurve3(p0, new THREE.Vector3(p0.x, p0.y - dy, p0.z), new THREE.Vector3(p3.x, p3.y + dy, p3.z), p3)
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(40)), subEdgeMat)
      line.computeLineDistances()
      bgGroup.add(line)
      return
    }
    bgGroup.add(new THREE.Mesh(new THREE.TubeGeometry(edgeCurve(from, to), 60, 0.02, 5, false), ghostEdgeMat))
  })

  /* Nó final BRX e a conexão em arco que leva até ele (percorrida na transição para a página final) */
  const BW = BRX_NODE.size
  const brxPos = new THREE.Vector3(...BRX_NODE.pos)
  const brxMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false })
  const brxMesh = new THREE.Mesh(new THREE.PlaneGeometry(BW, BW), brxMat)
  brxMesh.position.copy(brxPos); brxMesh.renderOrder = 2
  scene.add(brxMesh)
  let brxTex: Partial<Record<NodeStatus, THREE.CanvasTexture>> = {}
  let brxStatus: NodeStatus = 'idle'
  const finaleCurve = (() => {
    const from = nodes.send.def.pos
    const p0 = new THREE.Vector3(from[0] + HANDLE, from[1], from[2])
    // chega na alça de entrada do cartão (24px da borda esquerda do canvas)
    const p3 = new THREE.Vector3(brxPos.x - BW / 2 + (BW * 24) / BRX_CANVAS, brxPos.y, brxPos.z)
    // Arco suave: sobe um pouco depois de "Enviar mensagem" e desce até o BRX
    return new THREE.CubicBezierCurve3(p0, new THREE.Vector3(p0.x + 2.4, p0.y + 2.4, p0.z), new THREE.Vector3(p3.x - 2.6, p3.y + 1.6, p3.z), p3)
  })()
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(finaleCurve, TUB, 0.022, RAD, false), baseEdgeMat))
  const finaleProgGeo = new THREE.TubeGeometry(finaleCurve, TUB, 0.04, RAD, false)
  const finaleProg = new THREE.Mesh(finaleProgGeo, new THREE.MeshBasicMaterial())
  finaleProgGeo.setDrawRange(0, 0)
  scene.add(finaleProg)
  const finalePacket = new THREE.Group()
  finalePacket.add(new THREE.Mesh(packetGeo, packetMat))
  {
    const halo = new THREE.Sprite(haloMat); halo.scale.set(0.9, 0.9, 1); finalePacket.add(halo)
  }
  finalePacket.visible = false
  // Ondas de conclusão: contornos do cartão BRX que se expandem em verde
  const brxOutlineTex = brxOutlineTexture()
  const brxWaves = [0, 1].map(() => {
    const m = new THREE.Mesh(brxMesh.geometry, new THREE.MeshBasicMaterial({ map: brxOutlineTex, transparent: true, depthWrite: false, opacity: 0 }))
    m.position.set(brxPos.x, brxPos.y, brxPos.z - 0.02); m.renderOrder = 1; m.visible = false
    scene.add(m)
    return m
  })
  scene.add(finalePacket)

  /* Tema (claro/escuro) */
  function applyTheme() {
    const th = readTheme()
    renderer.setClearColor(th.canvas, 1)
    fog.color.set(th.canvas)
    gridMat.color.set(th.dots)
    baseEdgeMat.color.set(th.border)
    ghostEdgeMat.color.set(th.border)
    subEdgeMat.color.set(th.border)
    accentC.set(th.accent); doneC.set(th.done)
    packetMat.color.copy(accentC); haloMat.color.copy(accentC); pulseMat.color.copy(doneC)
    Object.values(brxTex).forEach(t => t.dispose())
    brxTex = { idle: brxNodeTexture('idle', th, maxAniso), running: brxNodeTexture('running', th, maxAniso), done: brxNodeTexture('done', th, maxAniso) }
    brxMat.map = brxTex[brxStatus]!
    brxMat.needsUpdate = true
    allNodeObjs.forEach(o => {
      Object.values(o.tex).forEach(t => t.dispose())
      o.tex = o.ghost
        ? { idle: o.def.kind === 'sub' ? subNodeTexture(o.def, th, maxAniso) : nodeTexture(o.def, 'idle', th, maxAniso) }
        : {
            idle: nodeTexture(o.def, 'idle', th, maxAniso),
            running: nodeTexture(o.def, 'running', th, maxAniso),
            done: nodeTexture(o.def, 'done', th, maxAniso),
          }
      o.mesh.material.map = o.tex[o.status || 'idle']!
      o.mesh.material.needsUpdate = true
      if (o.glow) o.glow.material.color.copy(accentC)
    })
  }
  applyTheme()
  const darkQuery = matchMedia('(prefers-color-scheme: dark)')
  darkQuery.addEventListener('change', applyTheme)
  const themeObserver = new MutationObserver(applyTheme)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

  /* Caminho da câmera */
  let camCurve: THREE.CatmullRomCurve3, lookCurve: THREE.CatmullRomCurve3
  function buildPath(portrait: boolean) {
    // Em pé a câmera se afasta para o nó caber na largura da tela
    const mult = portrait ? 1.55 : 0.9
    const focus = STOPS.map(s => (portrait && s.portraitLook) || s.look)
    const look = focus.map(p => new THREE.Vector3(...p))
    const cam = STOPS.map((s, i) => new THREE.Vector3(focus[i][0] - 1.4, focus[i][1] - 0.9, focus[i][2] + ((portrait && s.portraitDist) || s.dist) * mult))
    lookCurve = new THREE.CatmullRomCurve3(look, false, 'centripetal')
    camCurve = new THREE.CatmullRomCurve3(cam, false, 'centripetal')
  }
  let viewShift = -1
  // No hero o nó fica deslocado para dar espaço ao texto (à direita no desktop; no layout empilhado,
  // embaixo do painel, entre ele e o HUD).
  // Depois do hero o texto vai para os modais e o nó volta para o centro da tela.
  function applyViewOffset(shift: number) {
    const w = innerWidth, h = innerHeight
    // Em telas baixas (iPhone SE) o painel do hero ocupa mais da altura: o nó desce um pouco mais
    if (isStacked()) camera.setViewOffset(w, h, 0, -h * (h < 720 ? 0.31 : 0.28) * shift, w, h)
    else camera.setViewOffset(w, h, -w * 0.21 * shift, 0, w, h)
    camera.updateProjectionMatrix()
    viewShift = shift
  }
  function resize() {
    const w = innerWidth, h = innerHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    applyViewOffset(viewShift < 0 ? 1 : viewShift)
    buildPath(w / h < 1)
    bgGroup.position.y = isStacked() ? 0 : BACKGROUND_DESKTOP_LIFT
  }
  resize()
  addEventListener('resize', resize)

  /* Rotas do Switch */
  let route: string | null = null

  /* Efeitos de cada parada (ver effects.ts); desligados para quem prefere menos movimento */
  const edgeByKey = new Map(edges.map(ed => [ed.a + '>' + ed.b, ed.curve]))
  const effects = reduced ? null : createNodeEffects({
    scene,
    pos: id => nodes[id].def.pos,
    curve: (a, b) => edgeByKey.get(a + '>' + b)!,
    card: { w: PW, h: PH },
  })
  const dimmed = (id: string) => route !== null && ROUTES.includes(id) && id !== route

  /* Clique e hover nos nós */
  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  const pickable = NODES.filter(d => clickable.has(d.id)).map(d => nodes[d.id].mesh)
  let hovered: string | null = null
  function pick(clientX: number, clientY: number) {
    const r = canvas.getBoundingClientRect()
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1)
    raycaster.setFromCamera(ndc, camera)
    for (const hit of raycaster.intersectObjects(pickable, false)) {
      const id = hit.object.userData.id as string
      // Só responde depois que o fluxo chegou no nó
      if (nodes[id].status && nodes[id].status !== 'idle') return id
    }
    return null
  }
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return
    hovered = pick(e.clientX, e.clientY)
    canvas.style.cursor = hovered ? 'pointer' : ''
  }
  const onClick = (e: MouseEvent) => {
    const id = pick(e.clientX, e.clientY)
    if (id) onNodeClick(id)
  }
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('click', onClick)

  /* Quadro */
  const vCam = new THREE.Vector3(), vLook = new THREE.Vector3(), vProj = new THREE.Vector3()
  /* Transição para a página final (setFinale, 0..1):
     1ª parte: um pulso percorre o arco até o nó BRX e a câmera acompanha até enquadrá-lo;
     2ª parte: a câmera mergulha numa faixa lisa do cartão BRX (a base, sem texto). No fim a tela fica
     toda na cor do cartão, e a página final assume com as letras nessa mesma cor. */
  // Partes da transição: viagem até o BRX, conclusão (selo + ondas verdes) e mergulho no R
  const TRAVEL_SHARE = 0.5
  const CONCLUDE_SHARE = 0.18
  let finale = 0
  // Mergulho no miolo de cima do R do título: no fim, a tela inteira fica dentro dele (na cor do cartão)
  const rCounter = brxTitleCounter()
  const diveTarget = new THREE.Vector3(brxPos.x + (rCounter.x / BRX_CANVAS - 0.5) * BW, brxPos.y - (rCounter.y / BRX_CANVAS - 0.5) * BW, brxPos.z)
  const rRadius = (rCounter.r / BRX_CANVAS) * BW
  const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(20))
  const followLook = new THREE.Vector3(), followCam = new THREE.Vector3(), pulseAt = new THREE.Vector3()
  const diveCam = new THREE.Vector3()
  const parallax = { x: 0, y: 0 }

  function update(t: number, time: number, dt: number, pointer: { x: number; y: number }) {
    const shift = 1 - smoothstep(t)
    if (Math.abs(shift - viewShift) > 0.0005) applyViewOffset(shift)

    const u = t / (N - 1)
    camCurve.getPoint(u, vCam)
    lookCurve.getPoint(u, vLook)
    if (!reduced) { parallax.x += (pointer.x - parallax.x) * dt * 3; parallax.y += (pointer.y - parallax.y) * dt * 3 }
    const travel = clamp01(finale / TRAVEL_SHARE)
    const conclude = clamp01((finale - TRAVEL_SHARE) / CONCLUDE_SHARE)
    const dive = clamp01((finale - TRAVEL_SHARE - CONCLUDE_SHARE) / (1 - TRAVEL_SHARE - CONCLUDE_SHARE))
    if (travel > 0) {
      // A câmera acompanha o pulso pelo arco: o ponto em movimento fica no centro da tela.
      // Entra no acompanhamento saindo da última parada e, quando o pulso chega, enquadra o nó BRX.
      const portraitMult = innerWidth < innerHeight ? 1.55 : 0.9
      finaleCurve.getPoint(clamp01(travel / 0.85), pulseAt)
      const settle = smoothstep((travel - 0.8) / 0.2)
      followLook.copy(pulseAt).lerp(brxPos, settle)
      const dist = (7.2 + (6.2 - 7.2) * settle) * portraitMult
      followCam.set(followLook.x - 0.8, followLook.y - 0.5, followLook.z + dist)
      const enter = smoothstep(travel / 0.18)
      vLook.lerp(followLook, enter)
      vCam.lerp(followCam, enter)
    }
    const calm = 1 - smoothstep(travel)
    camera.position.set(vCam.x + parallax.x * 0.5 * calm, vCam.y - parallax.y * 0.3 * calm, vCam.z)
    if (dive > 0) {
      // Distância final: o retângulo da tela inteiro cabe dentro do círculo livre do miolo do R
      const aspect = innerWidth / innerHeight
      diveCam.copy(diveTarget).setZ(diveTarget.z + (0.9 * rRadius) / (tanHalfFov * Math.hypot(1, aspect)))
      // Acelera no fim, como quem entra no cartão
      const k = dive * dive * (3 - 2 * dive)
      camera.position.lerp(diveCam, k * k)
      vLook.lerp(diveTarget, k)
    }
    camera.lookAt(vLook)

    edges.forEach(ed => {
      const p = clamp01((t - ed.s) / (ed.e - ed.s))
      const off = dimmed(ed.a) || dimmed(ed.b)
      const count = Math.floor(p * TUB) * RAD * 6
      if (count !== ed.lastCount) { ed.progGeo.setDrawRange(0, count); ed.lastCount = count }
      ed.prog.visible = !off
      ed.prog.material.color.copy(p >= 1 ? doneC : accentC)
      ed.packet.visible = !off && p > 0.001 && p < 0.999
      if (ed.packet.visible) ed.curve.getPoint(p, ed.packet.position)
      ed.pulse.visible = !off && !reduced && p >= 1
      if (ed.pulse.visible) ed.curve.getPoint((time * 0.3 + ed.phase) % 1, ed.pulse.position)
    })

    const pulseGlow = reduced ? 0.45 : 0.35 + 0.2 * Math.sin(time * 3.2)
    NODES.forEach(def => {
      const o = nodes[def.id]
      let status: NodeStatus = 'idle'
      if (def.id === 'send' && t >= N - 1 - 0.01) status = 'done'
      else if (t >= def.at + 0.5) status = 'done'
      else if (t >= def.at - 0.02) status = 'running'
      if (status !== o.status) { o.status = status; o.mesh.material.map = o.tex[status]! }
      const off = dimmed(def.id)
      o.mesh.material.opacity += ((off ? 0.3 : 1) - o.mesh.material.opacity) * Math.min(1, dt * 8)
      // Nós com efeito próprio de chegada (ondas do Webhook) dispensam o brilho pulsante, senão sobrecarrega
      const ownEffect = effects !== null && NO_RUNNING_GLOW.has(def.id)
      const glow = status === 'running' && !ownEffect ? pulseGlow : route === def.id ? 0.35 : 0
      o.glow!.material.opacity = off ? 0 : glow
      // Cresce um pouco sob o cursor
      const target = hovered === def.id && !reduced ? 1.05 : 1
      o.scale += (target - o.scale) * Math.min(1, dt * 12)
      o.mesh.scale.setScalar(o.scale)
    })

    // Pulso no arco até o BRX; chega um pouco antes da câmera parar, e o BRX acende
    const fp = clamp01(travel / 0.85)
    finaleProgGeo.setDrawRange(0, Math.floor(fp * TUB) * RAD * 6)
    finaleProg.material.color.copy(fp >= 1 ? doneC : accentC)
    finalePacket.visible = fp > 0.001 && fp < 0.999
    if (finalePacket.visible) finaleCurve.getPoint(fp, finalePacket.position)
    // Conclusão: o BRX passa de "em execução" para concluído (verde, com selo) e solta duas ondas
    const bs: NodeStatus = conclude >= 0.15 ? 'done' : fp >= 1 ? 'running' : 'idle'
    brxWaves.forEach((m, k) => {
      const local = clamp01((conclude - 0.15 - k * 0.22) / 0.6)
      m.scale.setScalar(1 + local * 0.55)
      m.material.color.copy(doneC)
      m.material.opacity = local > 0 && local < 1 ? (1 - local) ** 1.5 * 0.8 : 0
      m.visible = m.material.opacity > 0.005
    })
    if (bs !== brxStatus) { brxStatus = bs; brxMat.map = brxTex[bs]! }

    effects?.update(t, time, route, accentC, doneC, 1 - Math.min(1, finale * 4))
    renderer.render(scene, camera)
  }

  function project(id: string) {
    const p = nodes[id].def.pos
    vProj.set(p[0], p[1] - PH / 2 - 0.12, p[2]).project(camera)
    return { x: (vProj.x + 1) / 2 * innerWidth, y: (1 - vProj.y) / 2 * innerHeight }
  }

  function setRoute(id: string | null) { route = id }
  function setFinale(amount: number) { finale = clamp01(amount) }

  function dispose() {
    effects?.dispose()
    removeEventListener('resize', resize)
    canvas.removeEventListener('pointermove', onMove)
    canvas.removeEventListener('click', onClick)
    canvas.style.cursor = ''
    darkQuery.removeEventListener('change', applyTheme)
    themeObserver.disconnect()
    const geos = new Set<THREE.BufferGeometry>()
    const mats = new Set<THREE.Material>()
    scene.traverse(obj => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.Sprite || obj instanceof THREE.Line) {
        geos.add(obj.geometry)
        mats.add(obj.material as THREE.Material)
      }
    })
    geos.forEach(g => g.dispose())
    mats.forEach(m => m.dispose())
    allNodeObjs.forEach(o => Object.values(o.tex).forEach(t => t.dispose()))
    ;[dotTex, radialTex, glowTex].forEach(t => t.dispose())
    brxOutlineTex.dispose()
    renderer.dispose()
  }

  return { update, project, setRoute, setFinale, dispose }
}
