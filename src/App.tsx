import { useCallback, useEffect, useRef, useState } from 'react'
import { Hero } from './components/Sections'
import { Hud } from './components/Hud'
import LatticeLoader from './components/LatticeLoader'
import { Intro } from './components/Intro'
import { shouldPlayIntro } from './components/introFrames'
import { NodeModal } from './components/NodeModal'
import { Outro } from './components/Outro'
import { Topbar } from './components/Topbar'
import { nodeHint, type RouteId } from './content'
import { MAIN_TITLES, MODAL_NODES, SECTION_NODES, type ModalId } from './flow/config'
import { useAutoRun } from './flow/useAutoRun'
import { useFlow } from './flow/useFlow'

// Uma seção por parada da câmera, na mesma ordem de STOPS em src/flow/config.ts.
// Só o hero tem conteúdo na página; as outras abrem o modal do nó.
const SECTIONS = ['sobre', 'servicos', 'projetos', 'stack', 'contato']

export default function App() {
  const mainRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hintRef = useRef<HTMLButtonElement>(null)
  const waitChipRef = useRef<HTMLDivElement>(null)
  const [modal, setModal] = useState<ModalId | null>(null)
  const [route, setRoute] = useState<RouteId | null>(null)
  const [playIntro] = useState(shouldPlayIntro)
  /** A intro saiu do DOM */
  const [introDone, setIntroDone] = useState(!playIntro)
  /** O hero pode aparecer: vira true quando a intro começa o fade de saída */
  const [heroRevealed, setHeroRevealed] = useState(!playIntro)
  const finishIntro = useCallback(() => setIntroDone(true), [])
  const revealHero = useCallback(() => setHeroRevealed(true), [])

  const openNode = useCallback((id: string) => {
    if (!MODAL_NODES.has(id)) return
    if (id === 'web' || id === 'auto') setRoute(id)
    setModal(id as ModalId)
  }, [])
  const closeModal = useCallback(() => setModal(null), [])
  const openContact = useCallback(() => openNode('send'), [openNode])

  const { hud, ready, waitPhase, setRoute: setSceneRoute, setFinale } = useFlow(mainRef, canvasRef, { onNodeClick: openNode, hintRef, waitChipRef, revealHero: heroRevealed })
  useEffect(() => setSceneRoute(route), [route, setSceneRoute])
  const autoRun = useAutoRun({ open: openNode, close: closeModal })

  const hintNode = hud ? SECTION_NODES[hud.index] : null
  const hintLabel = hintNode === 'switch' ? nodeHint.switch : nodeHint.default

  return (
    <>
      <canvas id="scene" ref={canvasRef} aria-hidden="true"></canvas>
      <Topbar onContact={openContact} />
      <main id="flow" ref={mainRef}>
        <Hero onRun={autoRun.start} onContact={openContact} />
        {SECTIONS.map((id, i) => (
          <section key={id} className="step" id={id} aria-label={MAIN_TITLES[i + 1]}></section>
        ))}
      </main>
      <Outro onFinale={setFinale} />
      <button
        ref={hintRef}
        type="button"
        className="node-hint"
        aria-label={hud ? `${hintLabel}: ${MAIN_TITLES[hud.index]}` : hintLabel}
        onClick={() => { if (hintNode) openNode(hintNode) }}
      >
        {hintLabel}
      </button>
      {/* Status do nó Wait na transição final (LatticeLoader do React Bits) */}
      <div ref={waitChipRef} className="wait-chip" aria-hidden={waitPhase === 'idle'}>
        {waitPhase !== 'idle' && (
          <LatticeLoader
            status={waitPhase === 'done' ? 'done' : 'working'}
            label="Aguardando"
            doneLabel="Concluído em"
            errorLabel="Falhou após"
            pattern="orbit"
            grid={3}
            shape="round"
            color="var(--accent)"
            doneColor="var(--done)"
            cellSize={6}
            gap={2}
            fontSize={14}
            step={90}
          />
        )}
      </div>
      <NodeModal id={modal} presenting={autoRun.running} route={route} onOpen={openNode} onClose={closeModal} />
      <Hud state={hud} autoRunning={autoRun.running} />
      {!introDone && <Intro ready={ready} onReveal={revealHero} onDone={finishIntro} />}
    </>
  )
}
