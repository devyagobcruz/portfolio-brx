import { contact } from '../content'
import { useTheme } from '../theme'

export function Topbar({ onContact }: { onContact(): void }) {
  return (
    <header className="topbar">
      <a className="logo" href="#inicio">BRX <span>Labs</span></a>
      <div className="topbar-actions">
        <ThemeToggle />
        <a className="toplink" href="#contato" onClick={e => { e.preventDefault(); onContact() }}>{contact.cta}</a>
      </div>
    </header>
  )
}

/** Alterna entre modo claro e escuro (a escolha fica salva no navegador) */
function ThemeToggle() {
  const [theme, toggle] = useTheme()
  const dark = theme === 'dark'
  return (
    <button type="button" className="theme-toggle" onClick={toggle}
      aria-label={dark ? 'Ativar modo claro' : 'Ativar modo escuro'} title={dark ? 'Modo claro' : 'Modo escuro'}>
      {dark ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z" />
        </svg>
      )}
    </button>
  )
}
