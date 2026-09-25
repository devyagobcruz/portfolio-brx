import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SECTION_NODES, type ModalId } from './config'

gsap.registerPlugin(ScrollToPlugin, ScrollTrigger)

/** Segundos de deslocamento entre um nó e o próximo */
const MOVE = 2.4
/** Segundos com o modal de cada seção aberto para a leitura */
export const READ = 6

interface AutoRunOptions {
  open(id: ModalId): void
  close(): void
}

/**
 * Modo apresentação: rola a página seção por seção, como se o fluxo estivesse rodando,
 * e abre o modal de cada nó ao chegar nele. Qualquer clique, toque, rolagem ou tecla
 * do visitante interrompe (o modal aberto no momento continua aberto).
 */
export function useAutoRun({ open, close }: AutoRunOptions) {
  const [running, setRunning] = useState(false)
  const timeline = useRef<gsap.core.Timeline | null>(null)
  const actions = useRef({ open, close })
  useLayoutEffect(() => { actions.current = { open, close } })

  const stop = useCallback(() => {
    timeline.current?.kill()
    timeline.current = null
    document.documentElement.style.scrollBehavior = ''
    setRunning(false)
  }, [])

  const start = useCallback(() => {
    timeline.current?.kill()
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const max = ScrollTrigger.maxScroll(window)
    const targets = [...document.querySelectorAll<HTMLElement>('.step')].map(s =>
      Math.min(max, Math.max(0, s.getBoundingClientRect().top + scrollY + s.offsetHeight / 2 - innerHeight / 2)),
    )
    // Continua a partir da próxima seção (a atual, que já está na tela, é pulada)
    const next = targets.findIndex(y => y > scrollY + innerHeight * 0.25)
    if (next < 0) return

    // O scroll suave do CSS brigaria com o scroll animado pelo GSAP
    document.documentElement.style.scrollBehavior = 'auto'
    const tl = gsap.timeline({ delay: 0.4, onComplete: stop })
    for (let i = next; i < targets.length; i++) {
      const id = SECTION_NODES[i]
      tl.to(window, { scrollTo: { y: targets[i], autoKill: false }, duration: reduced ? 0 : MOVE, ease: 'power2.inOut' })
      if (!id) continue
      // Espera a câmera assentar no nó antes de abrir
      tl.call(() => actions.current.open(id), undefined, '+=0.5')
      // No último nó o modal fica aberto
      if (i < targets.length - 1) tl.call(() => actions.current.close(), undefined, `+=${READ}`)
    }
    timeline.current = tl
    setRunning(true)
  }, [stop])

  // Interrompe na primeira interação do visitante. Os ouvintes só entram depois que a
  // execução começou, então o próprio gesto de segurar o botão não conta.
  useEffect(() => {
    if (!running) return
    const onKey = (e: KeyboardEvent) => { if (!e.repeat) stop() }
    const opts = { passive: true, capture: true }
    addEventListener('pointerdown', stop, opts)
    addEventListener('wheel', stop, opts)
    addEventListener('touchstart', stop, opts)
    addEventListener('keydown', onKey, true)
    return () => {
      removeEventListener('pointerdown', stop, opts)
      removeEventListener('wheel', stop, opts)
      removeEventListener('touchstart', stop, opts)
      removeEventListener('keydown', onKey, true)
    }
  }, [running, stop])

  useEffect(() => () => { timeline.current?.kill() }, [])

  return { running, start, stop }
}
