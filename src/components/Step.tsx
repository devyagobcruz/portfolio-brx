import type { ReactNode } from 'react'

interface StepProps {
  id: string
  /** Nome do nó do n8n mostrado acima do título */
  node: string
  hero?: boolean
  children: ReactNode
}

/** Uma seção do fluxo. Cada Step corresponde a uma parada da câmera (src/flow/config.ts). */
export function Step({ id, node, hero, children }: StepProps) {
  return (
    <section className={hero ? 'step step--hero' : 'step'} id={id}>
      <div className="panel">
        <p className="node-ref"><i></i>{node}</p>
        {children}
      </div>
    </section>
  )
}
