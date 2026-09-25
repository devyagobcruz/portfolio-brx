import { contact } from '../content'

export function Topbar({ onContact }: { onContact(): void }) {
  return (
    <header className="topbar">
      <a className="logo" href="#inicio">BRX <span>Labs</span></a>
      <a className="toplink" href="#contato" onClick={e => { e.preventDefault(); onContact() }}>{contact.cta}</a>
    </header>
  )
}
