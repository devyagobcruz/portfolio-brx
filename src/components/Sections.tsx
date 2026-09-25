import { useEffect, useState } from 'react'
import { contact, hero } from '../content'
import HoldButton from './HoldButton'
import { Step } from './Step'

interface HeroProps {
  /** Inicia o modo apresentação */
  onRun(): void
  onContact(): void
}

export function Hero({ onRun, onContact }: HeroProps) {
  // Um clique rápido no botão troca o rótulo por uma dica de que é preciso segurar
  const [tapped, setTapped] = useState(false)
  useEffect(() => {
    if (!tapped) return
    const id = setTimeout(() => setTapped(false), 1600)
    return () => clearTimeout(id)
  }, [tapped])

  return (
    <Step id="inicio" node="Webhook: aguardando visitante" hero>
      <h1>
        {hero.lines.map(line => <span className="line" key={line}><span>{line}</span></span>)}
      </h1>
      <p className="lede">{hero.lede}</p>
      <div className="actions">
        <HoldButton
          className="btn-hold"
          size="lg"
          radius={10}
          backgroundColor="var(--accent)"
          fillColor="var(--done)"
          textColor="var(--on-accent)"
          fillTextColor="var(--on-done)"
          holdTime={1500}
          resetAfter={1800}
          doneLabel="Executando…"
          onHold={onRun}
          onTap={() => setTapped(true)}
        >
          {tapped ? 'Segure até carregar' : 'Segure para executar'}
        </HoldButton>
        <a className="btn" href="#contato" onClick={e => { e.preventDefault(); onContact() }}>{contact.cta}</a>
      </div>
    </Step>
  )
}
