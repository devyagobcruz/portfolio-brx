import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { contact, outro } from '../content'
import { OUTRO_WORD_PATH as WORD } from './outroWordPath'
import { findCounter } from '../flow/letterCounter'

gsap.registerPlugin(ScrollTrigger)

/*
  Página final. A seção só dá o comprimento da rolagem; o conteúdo fica fixo na tela e entra assim:

  0 ─────── FINALE_END ─────────────── ZOOM_END ────────── 1
  (viagem com pausa no Wait, conclusão do BRX com selo e ondas verdes, e mergulho no R)
  um pulso vai  │ "BRX LABS" faz zoom out a partir │ o chamado e o
  até o nó BRX, │ do centro, de dentro da letra    │ rodapé aparecem
  e a câmera    │ mais próxima do meio             │
  mergulha nele │                                  │

  A câmera mergulha no miolo de cima do R do cartão BRX, e a página final começa dentro do mesmo miolo
  do R de "BRX LABS": a tela ainda está na cor do cartão (um véu que vai sumindo), e o R se abre ao
  redor enquanto o fundo escurece, até a palavra inteira aparecer.
*/
const FINALE_END = 0.56
const ZOOM_END = 0.87
/** Folga na escala inicial: o traço do R começa um pouco além dos cantos da tela */
const EDGE_MARGIN = 1.15

interface Anchor {
  /** Centro do miolo de cima do R, em unidades do contorno (linha de base em y = 0) */
  x: number
  y: number
  /** Raio livre do miolo (distância do centro até o traço), em unidades do contorno */
  r: number
}

/** Rasteriza o contorno da palavra e acha o miolo de cima do R (segunda letra). Calculado uma vez. */
let cachedAnchor: Anchor | null | undefined
function findAnchor(): Anchor | null {
  if (cachedAnchor !== undefined) return cachedAnchor
  const k = 2400 / WORD.advance
  const top = -WORD.bbox.y1 + 10
  const w = Math.ceil(WORD.advance * k), h = Math.ceil((WORD.bbox.y2 - WORD.bbox.y1 + 20) * k)
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.scale(k, k); ctx.translate(0, top)
  ctx.fill(new Path2D(WORD.d))
  const data = ctx.getImageData(0, 0, w, h).data
  const counter = findCounter((x, y) => data[(y * w + x) * 4 + 3], w, h, 1)
  cachedAnchor = counter ? { x: counter.x / k, y: counter.y / k - top, r: counter.r / k } : null
  return cachedAnchor
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

export function Outro({ onFinale }: { onFinale(amount: number): void }) {
  const sectionRef = useRef<HTMLElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  const wordRef = useRef<HTMLHeadingElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const footRef = useRef<HTMLElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const veilRef = useRef<HTMLDivElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const onFinaleRef = useRef(onFinale)
  useEffect(() => { onFinaleRef.current = onFinale })

  useEffect(() => {
    const section = sectionRef.current, pin = pinRef.current, word = wordRef.current, body = bodyRef.current, foot = footRef.current
    const svg = svgRef.current, path = pathRef.current, veil = veilRef.current
    if (!section || !pin || !word || !body || !foot || !svg || !path || !veil) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      section.classList.add('outro--static')
      return
    }
    const root = document.documentElement

    // Por que SVG: ampliar o próprio texto 100× cria uma camada gigante que o navegador corta.
    // Aqui o SVG tem o tamanho da tela e o zoom muda só o viewBox, então a letra continua vetorial.
    let startScale = 1, ox = 0, oy = 0, W = 1, H = 1
    const measure = () => {
      const anchor = findAnchor() ?? { x: WORD.advance / 2, y: -360, r: 60 }
      const fontSize = parseFloat(getComputedStyle(word).fontSize)
      const s = fontSize / 1000
      W = pin.clientWidth; H = pin.clientHeight
      // O contorno ocupa o lugar do título (invisível durante a animação): centralizado na largura
      // e com as maiúsculas centralizadas na altura da linha
      const tx = word.offsetLeft + (word.offsetWidth - WORD.advance * s) / 2
      const ty = word.offsetTop + fontSize / 2 - ((WORD.bbox.y1 + WORD.bbox.y2) / 2) * s
      path.setAttribute('transform', `translate(${tx} ${ty}) scale(${s})`)
      ox = tx + anchor.x * s
      oy = ty + anchor.y * s
      // O zoom começa com o miolo do R no centro e cobrindo a tela toda: o traço do R fica logo além
      // dos cantos
      startScale = Math.max(1, (Math.hypot(W / 2, H / 2) / (anchor.r * s)) * EDGE_MARGIN)
      path.style.fill = getComputedStyle(root).getPropertyValue('--outro-word')
    }

    const render = (p: number) => {
      onFinaleRef.current(clamp01(p / FINALE_END))
      root.classList.toggle('in-outro', p > 0.002)
      const visible = p >= FINALE_END
      pin.classList.toggle('is-visible', visible)

      // Começa rápido (o R aparece logo depois da troca, espelhando a entrada) e desacelera no fim
      const zoom = gsap.parseEase('power2.out')(clamp01((p - FINALE_END) / (ZOOM_END - FINALE_END)))
      // Escala em interpolação logarítmica: o zoom parece ter velocidade constante
      const scale = Math.exp(Math.log(startScale) * (1 - zoom))
      // O ponto de origem sai do centro da tela e desliza até a posição final do título
      const sx = W / 2 + (ox - W / 2) * zoom, sy = H / 2 + (oy - H / 2) * zoom
      svg.setAttribute('viewBox', `${ox - sx / scale} ${oy - sy / scale} ${W / scale} ${H / scale}`)
      // Véu na cor do cartão: some enquanto as letras entram, revelando o fundo escuro
      veil.style.opacity = (1 - clamp01(zoom / 0.55)).toFixed(3)

      const reveal = clamp01((p - (ZOOM_END - 0.06)) / 0.14)
      body.style.opacity = reveal.toFixed(3)
      body.style.transform = `translateY(${((1 - reveal) * 24).toFixed(1)}px)`
      foot.style.opacity = reveal.toFixed(3)
      // O topo só troca de cor quando o fundo escuro já ocupa a maior parte da tela
      root.classList.toggle('outro-revealed', visible && zoom > 0.35)
    }

    let progress = 0
    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top bottom',
      end: 'bottom bottom',
      onUpdate: self => { progress = self.progress; render(progress) },
    })
    const onRefresh = () => { measure(); render(progress) }
    ScrollTrigger.addEventListener('refresh', onRefresh)
    // A fonte precisa estar carregada para achar o ponto certo dentro da letra
    document.fonts.load('400 100px "Zen Dots"').catch(() => {}).finally(() => ScrollTrigger.refresh())
    measure(); render(0)

    return () => {
      st.kill()
      ScrollTrigger.removeEventListener('refresh', onRefresh)
      root.classList.remove('in-outro', 'outro-revealed')
      pin.classList.remove('is-visible')
      onFinaleRef.current(0)
      body.style.opacity = ''; body.style.transform = ''; foot.style.opacity = ''
    }
  }, [])

  return (
    <section className="outro" id="final" ref={sectionRef} aria-labelledby="outro-word">
      <div className="outro-pin" ref={pinRef}>
        <h2 className="outro-word" id="outro-word" ref={wordRef}>{outro.word}</h2>
        <div className="outro-body" ref={bodyRef}>
          <div className="outro-cta">
            <p className="outro-label"><i></i>{outro.label}</p>
            <h3>{outro.title}</h3>
            <p>{outro.text}</p>
            <div className="actions">
              <a className="btn btn--primary" href={contact.whatsapp} target="_blank" rel="noopener noreferrer">{outro.whatsappLabel}</a>
              <a className="btn" href={`mailto:${contact.email}`}>{outro.emailLabel}</a>
            </div>
          </div>
        </div>
        <footer className="outro-foot" ref={footRef}>
          <span>{outro.copyright}</span>
          <span>{outro.place}</span>
          <a href={`mailto:${contact.email}`}>{contact.email}</a>
          <a href="#inicio">{outro.backToTop} ↑</a>
        </footer>
        <div className="outro-veil" ref={veilRef} aria-hidden="true" />
        <svg className="outro-svg" ref={svgRef} aria-hidden="true">
          <path ref={pathRef} d={WORD.d} />
        </svg>
      </div>
    </section>
  )
}
