import { useEffect, useLayoutEffect, useState } from 'react'
import ElectricLogo from './ElectricLogo'
import { buildIntroFrames } from './introFrames'
import { currentTheme } from '../theme'

/** Quando cada quadro entra (ms depois dos quadros ficarem prontos): B, R, X, BRX LABS */
const FRAME_AT = [0, 1100, 2100, 3100]
/** Tempo com o logo completo na tela antes de abrir o site (inclui a transição de 0,9 s) */
const HOLD = 2300
/** Duração do fade de saída (igual ao CSS .intro--leaving) */
const LEAVE = 650
/** Espera máxima pela cena 3D depois da sequência terminar */
const MAX_WAIT = 5000

/* ---------- Tamanho das letras ----------
   Fração da largura da tela ocupada pela maior dimensão de cada forma (letra ou logo completo).
   As letras soltas e o logo usam o mesmo valor. Menos que ~0.7 no celular deixa o LABS ilegível. */
/** Celular e telas estreitas */
const PHONE_SIZE = 0.56
/** Largura máxima, em px, do logo em telas grandes */
const DESKTOP_MAX_WIDTH = 620

interface IntroProps {
  /** O site terminou de carregar (cena 3D pronta) */
  ready: boolean
  /** O fade de saída começou: o hero pode animar por baixo */
  onReveal(): void
  /** A intro terminou de sair */
  onDone(): void
}

/** Tela de abertura: o raio desenha B, R, X e fecha no logo BRX LABS; depois abre o site */
export function Intro({ ready, onReveal, onDone }: IntroProps) {
  const [frames, setFrames] = useState<string[] | null>(null)
  const [step, setStep] = useState(0)
  const [sequenceDone, setSequenceDone] = useState(false)
  const [skipped, setSkipped] = useState(false)
  const leaving = skipped || (sequenceDone && ready)
  const [dark] = useState(() => currentTheme() === 'dark')
  // A área da animação é a tela inteira (o brilho não é cortado); o tamanho vem das constantes do topo
  const [scale] = useState(() => Math.min(PHONE_SIZE, DESKTOP_MAX_WIDTH / innerWidth))
  // Celular: GPU e CPU mais fracas. Canvas em resolução menor, contorno mais leve e um filamento a menos
  const [phone] = useState(() => matchMedia('(pointer: coarse)').matches || innerWidth < 760)

  useEffect(() => {
    let alive = true
    buildIntroFrames().then(f => { if (alive) setFrames(f) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!frames) return
    const timers = FRAME_AT.slice(1).map((at, i) => setTimeout(() => setStep(i + 1), at))
    timers.push(setTimeout(() => setSequenceDone(true), FRAME_AT[FRAME_AT.length - 1] + HOLD))
    // Se a cena 3D demorar demais (rede lenta), abre o site mesmo assim
    timers.push(setTimeout(() => setSkipped(true), FRAME_AT[FRAME_AT.length - 1] + HOLD + MAX_WAIT))
    return () => timers.forEach(clearTimeout)
  }, [frames])

  // O hero começa a animar junto com o fade de saída. useLayoutEffect: roda antes da pintura, então
  // o texto sai de escondido (intro-cover) direto para o estado inicial da animação, sem piscar pronto.
  useLayoutEffect(() => {
    if (!leaving) return
    document.documentElement.classList.remove('intro-cover')
    onReveal()
  }, [leaving, onReveal])

  useEffect(() => {
    if (!leaving) return
    const id = setTimeout(onDone, LEAVE)
    return () => clearTimeout(id)
  }, [leaving, onDone])

  // Trava a rolagem e esconde o texto do hero enquanto a intro cobre o site; Esc pula.
  // useLayoutEffect: as classes entram antes da primeira pintura.
  useLayoutEffect(() => {
    document.documentElement.classList.add('intro-open', 'intro-cover')
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSkipped(true) }
    addEventListener('keydown', onKey)
    return () => {
      document.documentElement.classList.remove('intro-open', 'intro-cover')
      removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div className={leaving ? 'intro intro--leaving' : 'intro'} role="status" aria-label="Carregando BRX Labs">
      <div className="intro-logo">
        {frames && (
          <ElectricLogo
            src={frames[step]}
            preload={frames}
            raster={phone ? 360 : 560}
            maxDpr={phone ? 1.25 : 2}
            theme={dark ? 'dark' : 'light'}
            color={dark ? '#EFE9FF' : '#6D4AFF'}
            glowColor={dark ? '#A48BFF' : '#6D4AFF'}
            scale={scale}
            strands={phone ? 3 : 4}
            bend={0.5}
            crackle={1.3}
            arcs={1}
            speed={2.5}
            morphDuration={0.9}
          />
        )}
      </div>
      <button type="button" className="intro-skip" onClick={() => setSkipped(true)}>Pular intro</button>
    </div>
  )
}
