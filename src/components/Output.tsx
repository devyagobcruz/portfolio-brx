import { Fragment, type ReactNode } from 'react'

type Value = string | string[]

function renderValue(v: Value) {
  const str = (s: string) => <span className="s">"{s}"</span>
  if (!Array.isArray(v)) return str(v)
  return <>[{v.map((s, i) => <Fragment key={s}>{i > 0 && ', '}{str(s)}</Fragment>)}]</>
}

/** Caixa de saída estilo n8n: cabeçalho + bloco de código */
function OutputBox({ title, status, children }: { title: string; status: string; children: ReactNode }) {
  return (
    <div className="output">
      <div className="output-head"><span>{title}</span><b>{status}</b></div>
      <pre>{children}</pre>
    </div>
  )
}

/** Objeto mostrado como JSON: { "chave": "valor" } */
export function JsonOutput({ data }: { data: Record<string, Value> }) {
  const entries = Object.entries(data)
  return (
    <OutputBox title="Saída" status="1 item">
      {'{\n'}
      {entries.map(([k, v], i) => (
        <Fragment key={k}>
          {'  '}<span className="k">"{k}"</span>{': '}{renderValue(v)}{i < entries.length - 1 ? ',' : ''}{'\n'}
        </Fragment>
      ))}
      {'}'}
    </OutputBox>
  )
}

/** Objeto mostrado como código TypeScript: export const nome = { ... }; */
export function CodeOutput({ file, name, data }: { file: string; name: string; data: Record<string, Value> }) {
  return (
    <OutputBox title={file} status="executado">
      <span className="k">export const</span>{` ${name} = {\n`}
      {Object.entries(data).map(([k, v]) => (
        <Fragment key={k}>{`  ${k}: `}{renderValue(v)}{',\n'}</Fragment>
      ))}
      {'};'}
    </OutputBox>
  )
}
