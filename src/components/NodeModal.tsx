import { useEffect, useRef } from 'react'
import {
  about, contact, contactNode, projects, projectsNode, routes, stack, stackNode, switchNode, workLabels, type RouteId,
} from '../content'
import { NODES, type ModalId } from '../flow/config'
import { READ } from '../flow/useAutoRun'
import { CodeOutput, JsonOutput } from './Output'
import { ProjectBadge } from './ProjectBadge'

interface NodeModalProps {
  id: ModalId | null
  /** Modo apresentação: mostra a barra de tempo até o próximo nó */
  presenting: boolean
  route: RouteId | null
  onOpen(id: ModalId): void
  onClose(): void
}

const ROUTE_IDS: RouteId[] = ['web', 'auto']

/** Detalhes de um nó do fluxo, no estilo do painel de nó do n8n */
export function NodeModal({ id, presenting, route, onOpen, onClose }: NodeModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (id && !dialog.open) {
      dialog.showModal()
      // O navegador foca o primeiro botão (o X) e ele parecia sempre selecionado
      dialog.focus()
    }
    if (!id && dialog.open) dialog.close()
    document.documentElement.classList.toggle('modal-open', !!id)
    bodyRef.current?.scrollTo(0, 0)
  }, [id])

  const node = NODES.find(n => n.id === id)

  return (
    <dialog
      ref={dialogRef}
      className="node-modal"
      tabIndex={-1}
      aria-labelledby="node-modal-title"
      onClose={onClose}
      // Clique no fundo escurecido fecha
      onClick={e => { if (e.target === e.currentTarget) e.currentTarget.close() }}
    >
      {node && id && (
        <>
          {presenting && <div className="modal-progress" aria-hidden="true"><span key={id} style={{ animationDuration: `${READ}s` }} /></div>}
          <header className="modal-head">
            <p className="node-ref"><i></i>{node.type}: {node.title}</p>
            <button type="button" className="modal-close" aria-label="Fechar" onClick={() => dialogRef.current?.close()}>
              <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </button>
          </header>
          <div className="modal-body" ref={bodyRef}>
            <ModalContent id={id} route={route} onOpen={onOpen} />
          </div>
          <footer className="modal-foot">
            <span className="modal-status">
              <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="currentColor" /><path d="M6 10.3l2.6 2.6L14.2 7" fill="none" stroke="var(--surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Nó executado
            </span>
            <button type="button" className="btn btn--small" onClick={() => dialogRef.current?.close()}>Continuar o fluxo</button>
          </footer>
        </>
      )}
    </dialog>
  )
}

function ModalContent({ id, route, onOpen }: { id: ModalId; route: RouteId | null; onOpen(id: ModalId): void }) {
  switch (id) {
    case 'sobre':
      return (
        <>
          <h2 id="node-modal-title">{about.title}</h2>
          <p>{about.text}</p>
          <JsonOutput data={about.output} />
        </>
      )
    case 'switch':
      return (
        <>
          <h2 id="node-modal-title">{switchNode.title}</h2>
          <p>{switchNode.text}</p>
          <div className="route-options">
            {ROUTE_IDS.map(r => (
              <button key={r} type="button" className="route-option" aria-pressed={route === r} onClick={() => onOpen(r)}>
                <small>{routes[r].label}</small>
                <strong>{routes[r].title}</strong>
                <span>{routes[r].summary}</span>
                <em>Seguir por esta rota →</em>
              </button>
            ))}
          </div>
        </>
      )
    case 'web':
    case 'auto': {
      const r = routes[id]
      const other: RouteId = id === 'web' ? 'auto' : 'web'
      return (
        <>
          <h2 id="node-modal-title">{r.headline}</h2>
          <p>{r.text}</p>
          <ul className="checklist">{r.items.map(item => <li key={item}>{item}</li>)}</ul>
          <div className="route-foot">
            <div className="tags">{r.tags.map(t => <span key={t}>{t}</span>)}</div>
            <button type="button" className="link-btn" onClick={() => onOpen(other)}>
              Ver a outra rota: {routes[other].title} →
            </button>
          </div>
        </>
      )
    }
    case 'merge':
      return (
        <>
          <h2 id="node-modal-title">{projectsNode.title}</h2>
          <p className="items-count">{projects.length} itens combinados</p>
          <ul className="badges">
            {projects.map(p => (
              <li key={p.name}>
                <a className="badge" href={p.url} target="_blank" rel="noopener noreferrer" title={'linkTitle' in p ? p.linkTitle : undefined}>
                  <span className="ribbons">
                    {p.work.map(w => <span key={w} className={`ribbon ribbon--${w}`}>{workLabels[w]}</span>)}
                  </span>
                  <ProjectBadge id={p.badge} />
                  <strong>{p.name}</strong>
                  <span className="badge-role">{p.role}</span>
                  {'note' in p && <span className="badge-note">{p.note}</span>}
                </a>
              </li>
            ))}
          </ul>
        </>
      )
    case 'code':
      return (
        <>
          <h2 id="node-modal-title">{stackNode.title}</h2>
          <CodeOutput file="stack.ts" name="stack" data={stack} />
        </>
      )
    case 'send':
      return (
        <>
          <h2 id="node-modal-title">{contactNode.title}</h2>
          <p>{contactNode.text}</p>
          <div className="actions">
            <a className="btn btn--primary" href={contact.whatsapp} target="_blank" rel="noopener noreferrer">{contactNode.whatsappLabel}</a>
            <a className="btn" href={`mailto:${contact.email}`}>{contactNode.emailLabel}</a>
          </div>
          <p className="footer-note">{contactNode.note}</p>
        </>
      )
  }
}
