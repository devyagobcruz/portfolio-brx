import { useSyncExternalStore } from 'react'

/*
 * Tema claro/escuro. Sem escolha salva, segue o sistema. A escolha vira data-theme no <html>
 * (index.css troca os tokens e a cena 3D redesenha as texturas ao notar a mudança).
 * O script em index.html aplica a escolha salva antes da primeira pintura, sem piscar.
 */
export type Theme = 'light' | 'dark'
const KEY = 'brx-theme'
const system = matchMedia('(prefers-color-scheme: dark)')

function saved(): Theme | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch { return null }
}

/** Tema em uso agora */
export function currentTheme(): Theme {
  const attr = document.documentElement.dataset.theme
  if (attr === 'light' || attr === 'dark') return attr
  return system.matches ? 'dark' : 'light'
}

const listeners = new Set<() => void>()
function subscribe(cb: () => void) {
  listeners.add(cb)
  system.addEventListener('change', cb)
  return () => { listeners.delete(cb); system.removeEventListener('change', cb) }
}

function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try { localStorage.setItem(KEY, theme) } catch { /* navegador sem armazenamento: vale só nesta visita */ }
  listeners.forEach(cb => cb())
}

// Garante o atributo mesmo se o script do index.html não rodou
if (saved()) document.documentElement.dataset.theme = saved()!

export function useTheme(): [Theme, () => void] {
  const theme = useSyncExternalStore(subscribe, currentTheme)
  return [theme, () => setTheme(theme === 'dark' ? 'light' : 'dark')]
}
