import { MAIN_TITLES, N } from '../flow/config'
import type { HudState } from '../flow/useFlow'

/** Barra de execução no canto inferior: mostra em qual nó do fluxo o visitante está */
export function Hud({ state, autoRunning }: { state: HudState | null; autoRunning: boolean }) {
  return (
    <div className="hud" aria-live="polite">
      <div className="hud-box">
        <div className="hud-bars">
          {Array.from({ length: N }, (_, i) => {
            let cls = ''
            if (state) cls = state.finished || i < state.index ? 'on' : i === state.index ? 'run' : ''
            return <span key={i} className={cls}></span>
          })}
        </div>
        <div className="hud-text">
          {!state ? <b>Aguardando</b>
            : state.finished ? <><b>Fluxo concluído</b> em {N} de {N} nós</>
            : <><b>{state.index + 1} de {N}</b> executando {MAIN_TITLES[state.index]}</>}
        </div>
        {autoRunning && <span className="hud-stop">Toque para parar</span>}
      </div>
    </div>
  )
}
