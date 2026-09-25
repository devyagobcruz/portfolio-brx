import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { MODAL_NODES, N, SECTION_NODES } from './config'
import type { FlowScene, WaitPhase } from './createFlowScene'

gsap.registerPlugin(ScrollTrigger)

export interface HudState {
  /** Seção em execução (0..N-1) */
  index: number
  finished: boolean
}

interface FlowOptions {
  /** Chamado quando o visitante clica num nó que já foi alcançado */
  onNodeClick(id: string): void
  /** Botão "clique para abrir" que acompanha o nó da seção atual */
  hintRef: RefObject<HTMLElement | null>
  /** Selo de status que acompanha o nó Wait na transição final */
  waitChipRef: RefObject<HTMLElement | null>
  /** O hero pode aparecer (a intro começou a sair ou não existe): dispara a animação de entrada */
  revealHero: boolean
}

const smooth = (a: number, b: number, x: number) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k) }
// Pausa a câmera em cada nó enquanto a seção é lida
const dwell = (raw: number) => { const i = Math.floor(raw); if (i >= N - 1) return N - 1; return i + smooth(0.2, 0.8, raw - i) }

async function fontsReady() {
  try {
    await Promise.race([
      Promise.all([document.fonts.load('700 46px "Play"'), document.fonts.load('400 28px "JetBrains Mono"'), document.fonts.load('400 62px "Zen Dots"')]),
      new Promise(r => setTimeout(r, 2500)),
    ])
  } catch { /* segue com a fonte de fallback */ }
}

/**
 * Liga o scroll da página ao fluxo: anima o painel do hero, move a câmera pela cena 3D,
 * posiciona a dica de clique embaixo do nó atual e devolve o estado do HUD.
 */
export function useFlow(mainRef: RefObject<HTMLElement | null>, canvasRef: RefObject<HTMLCanvasElement | null>, { onNodeClick, hintRef, waitChipRef, revealHero }: FlowOptions) {
  const [hud, setHud] = useState<HudState | null>(null)
  /** Estado do nó Wait (para o selo de status) */
  const [waitPhase, setWaitPhase] = useState<WaitPhase>('idle')
  /** A cena 3D terminou de carregar (ou falhou e caiu no fallback sem WebGL) */
  const [ready, setReady] = useState(false)
  const hudKey = useRef('')
  const flowRef = useRef<FlowScene | null>(null)
  const routeRef = useRef<string | null>(null)
  const onNodeClickRef = useRef(onNodeClick)
  useLayoutEffect(() => { onNodeClickRef.current = onNodeClick })

  useEffect(() => {
    const main = mainRef.current, canvas = canvasRef.current
    if (!main || !canvas) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const sections = [...main.querySelectorAll<HTMLElement>('.step')]

    /* ---------- Progresso do scroll -> t (0..N-1) ---------- */
    let centers: number[] = []
    const measure = () => {
      centers = sections.map(s => s.getBoundingClientRect().top + scrollY + s.offsetHeight / 2 - innerHeight / 2)
      centers[0] = Math.min(centers[0], 0)
    }
    const rawFromScroll = (y: number) => {
      if (y <= centers[0]) return 0
      for (let i = 0; i < centers.length - 1; i++) {
        if (y < centers[i + 1]) return i + (y - centers[i]) / (centers[i + 1] - centers[i])
      }
      return N - 1
    }
    const state = { raw: 0, t: 0 }
    ScrollTrigger.addEventListener('refreshInit', measure)
    measure()

    const ctx = gsap.context(() => {
      /* ---------- Painel do hero: some ao sair da primeira seção ---------- */
      const shift = reduced ? 0 : 40
      gsap.timeline({ scrollTrigger: { trigger: sections[0], start: 'top 85%', end: 'bottom 15%', scrub: true } })
        .to('.step--hero .panel', { autoAlpha: 1, duration: 0.7 })
        .to('.step--hero .panel', { autoAlpha: 0, y: -shift, duration: 0.3 })
      ScrollTrigger.create({ start: 0, end: 'max', onUpdate: self => { state.raw = rawFromScroll(self.scroll()) } })
    }, main)

    state.raw = rawFromScroll(scrollY)
    state.t = dwell(state.raw)

    /* ---------- Paralaxe do ponteiro ---------- */
    const pointer = { x: 0, y: 0 }
    const onPointer = (e: PointerEvent) => {
      pointer.x = (e.clientX / innerWidth) * 2 - 1
      pointer.y = (e.clientY / innerHeight) * 2 - 1
    }
    addEventListener('pointermove', onPointer, { passive: true })

    /* ---------- Cena 3D (Three.js em chunk separado, criada depois que as fontes carregam) ---------- */
    let cancelled = false
    Promise.all([import('./createFlowScene'), fontsReady()]).then(([{ createFlowScene }]) => {
      if (cancelled) return
      try {
        flowRef.current = createFlowScene(canvas, {
          reduced,
          clickable: MODAL_NODES,
          onNodeClick: id => onNodeClickRef.current(id),
        })
        flowRef.current.setRoute(routeRef.current)
      } catch {
        document.documentElement.classList.add('no-webgl')
      }
      setReady(true)
    })

    /* ---------- Loop no ticker do GSAP ---------- */
    let hintShown = false
    let chipShown = false, lastPhase: WaitPhase = 'idle'
    const tick = (time: number, deltaMs: number) => {
      const dt = Math.min(deltaMs / 1000, 0.05)
      const target = dwell(state.raw)
      state.t = reduced ? target : state.t + (target - state.t) * (1 - Math.exp(-dt * 5))
      if (Math.abs(target - state.t) < 0.0005) state.t = target
      const t = state.t
      const flow = flowRef.current

      flow?.update(t, time, dt, pointer)

      let index = 0
      for (let i = 0; i < N; i++) if (t >= i - 0.02) index = i
      const finished = t >= N - 1 - 0.01
      const key = index + (finished ? 'f' : '')
      if (key !== hudKey.current) {
        hudKey.current = key
        setHud({ index, finished })
      }

      // Dica de clique: aparece embaixo do nó quando a câmera para nele
      const hint = hintRef.current
      if (hint) {
        const id = SECTION_NODES[index]
        const show = !!id && Math.abs(t - index) < 0.08 && !document.documentElement.classList.contains('modal-open')
        if (show) {
          const p = flow ? flow.project(id) : { x: innerWidth / 2, y: innerHeight / 2 }
          // Mantém a dica inteira dentro da tela
          const half = hint.offsetWidth / 2 + 12
          p.x = Math.min(innerWidth - half, Math.max(half, p.x))
          hint.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translateX(-50%)`
        }
        if (show !== hintShown) { hintShown = show; hint.dataset.show = String(show) }
      }
    }
    // O selo do Wait roda no mesmo ticker, logo depois da cena
    const chipTick = () => {
      const chip = waitChipRef.current, flow = flowRef.current
      if (!chip || !flow) return
      const w = flow.waitStatus()
      if (w.visible) chip.style.transform = `translate(${w.x.toFixed(1)}px, ${w.y.toFixed(1)}px) translateX(-50%)`
      if (w.visible !== chipShown) { chipShown = w.visible; chip.dataset.show = String(w.visible) }
      if (w.phase !== lastPhase) { lastPhase = w.phase; setWaitPhase(w.phase) }
    }
    gsap.ticker.add(tick)
    gsap.ticker.add(chipTick)

    return () => {
      cancelled = true
      gsap.ticker.remove(tick)
      gsap.ticker.remove(chipTick)
      removeEventListener('pointermove', onPointer)
      ScrollTrigger.removeEventListener('refreshInit', measure)
      ctx.revert()
      flowRef.current?.dispose()
      flowRef.current = null
      hudKey.current = ''
    }
  }, [mainRef, canvasRef, hintRef, waitChipRef])

  /* ---------- Entrada do hero, no mesmo quadro em que a intro começa a sair ----------
     useLayoutEffect: o estado inicial da animação (texto escondido) é aplicado antes da tela ser pintada,
     então o texto pronto nunca aparece antes de animar. */
  useLayoutEffect(() => {
    const main = mainRef.current
    if (!revealHero || !main || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = gsap.context(() => {
      gsap.from('h1 .line > span', { yPercent: 110, duration: 1.1, stagger: 0.09, ease: 'power3.out', delay: 0.15 })
      gsap.from('.step--hero .lede, .step--hero .actions, .step--hero .node-ref', { autoAlpha: 0, duration: 0.8, delay: 0.7, stagger: 0.1 })
    }, main)
    return () => ctx.revert()
  }, [revealHero, mainRef])

  const setRoute = useCallback((id: string | null) => {
    routeRef.current = id
    flowRef.current?.setRoute(id)
  }, [])

  const setFinale = useCallback((amount: number) => { flowRef.current?.setFinale(amount) }, [])

  return { hud, ready, waitPhase, setRoute, setFinale }
}
