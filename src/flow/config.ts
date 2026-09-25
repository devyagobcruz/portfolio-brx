export type Vec3 = [number, number, number]

export type IconName =
  | 'bolt' | 'fields' | 'fork' | 'browser' | 'nodes' | 'merge' | 'code' | 'send' | 'default'
  // ícones do fluxo de fundo
  | 'webhook' | 'switch' | 'whatsapp' | 'sheets' | 'video' | 'edit' | 'aggregate'
  | 'agent' | 'brain' | 'database' | 'if' | 'filter' | 'globe'
  // nó final BRX
  | 'flask'

export interface NodeDef {
  id: string
  title: string
  type: string
  icon: IconName
  pos: Vec3
  /** Valor de t (0..N-1) em que o nó começa a executar */
  at: number
  input?: boolean
  output?: boolean
  /** Cor fixa do ícone (nós de fundo). Sem ela, o ícone segue o estado do nó. */
  color?: string
  /** 'sub': sub-nó redondo do n8n (modelo, memória, ferramenta), pendurado embaixo de um agente */
  kind?: 'sub'
}

/* ---------- Definição do fluxo ---------- */
export const NODES: NodeDef[] = [
  { id: 'webhook', title: 'Visitante chegou', type: 'Webhook', icon: 'bolt', pos: [0, 0, 0], at: 0, input: false },
  { id: 'sobre', title: 'Quem é a BRX', type: 'Editar campos', icon: 'fields', pos: [8, 1.4, -1], at: 1 },
  { id: 'switch', title: 'Qual é o seu caso?', type: 'Switch', icon: 'fork', pos: [16, 0, 0], at: 2 },
  { id: 'web', title: 'Desenvolvimento web', type: 'Rota 1', icon: 'browser', pos: [21.5, 2.4, -0.6], at: 2.5 },
  { id: 'auto', title: 'Automação', type: 'Rota 2', icon: 'nodes', pos: [21.5, -2.4, -0.6], at: 2.5 },
  { id: 'merge', title: 'Projetos entregues', type: 'Merge', icon: 'merge', pos: [27, 0, -1], at: 3 },
  { id: 'code', title: 'Stack', type: 'Código', icon: 'code', pos: [35, 1.6, 0], at: 4 },
  { id: 'send', title: 'Enviar mensagem', type: 'WhatsApp', icon: 'send', pos: [43, 0, 0], at: 5 },
]

/** [origem, destino, t inicial, t final] */
export const EDGES: [string, string, number, number][] = [
  ['webhook', 'sobre', 0, 1], ['sobre', 'switch', 1, 2],
  ['switch', 'web', 2, 2.5], ['switch', 'auto', 2, 2.5],
  ['web', 'merge', 2.5, 3], ['auto', 'merge', 2.5, 3],
  ['merge', 'code', 3, 4], ['code', 'send', 4, 5],
]

// Paradas da câmera (uma por seção): ponto de foco e distância
// portraitLook / portraitDist: foco e distância alternativos para telas em pé, onde nem tudo cabe na largura
export const STOPS: { look: Vec3; dist: number; portraitLook?: Vec3; portraitDist?: number }[] = [
  { look: [0, 0, 0], dist: 8 },
  { look: [8, 1.4, -1], dist: 8.5 },
  { look: [18.6, 0, -0.3], dist: 12.5, portraitLook: [17.4, 0, -0.3], portraitDist: 14 },
  { look: [27, 0, -1], dist: 9 },
  { look: [35, 1.6, 0], dist: 8.5 },
  { look: [43, 0, 0], dist: 8 },
]

/* ---------- Nó final BRX ----------
   Fica depois de "Enviar mensagem", ligado por uma conexão em arco. Não é uma parada do HUD: é o
   destino da transição para a página final (a câmera viaja até ele e mergulha no cartão). */
export const BRX_NODE = { pos: [51, -1.8, 0] as Vec3, size: 2.5 }

/* ---------- Fluxo de fundo ----------
   Um segundo fluxo, decorativo, atrás do principal (mais longe da câmera e translúcido).
   Webhook → Switch → 4 canais → Aggregate → Agente de IA (+ modelo, memória e ferramenta) → If → Filter / HTTP.
   Posições em [x, y]; todos ficam na profundidade BACKGROUND_Z. Para adicionar um nó, inclua-o em
   BACKGROUND_NODES e ligue-o em BACKGROUND_EDGES. */
export const BACKGROUND_Z = -14
/** No desktop o fluxo de fundo sobe, para ficar acima do principal em vez de atrás dele */
export const BACKGROUND_DESKTOP_LIFT = 6.5

export interface BackgroundNode {
  id: string
  title: string
  icon: IconName
  pos: [number, number]
  color?: string
  kind?: 'sub'
  input?: boolean
  output?: boolean
}

export const BACKGROUND_NODES: BackgroundNode[] = [
  { id: 'bg-webhook', title: 'Webhook', icon: 'webhook', color: '#EA4B71', pos: [-12, 0], input: false },
  { id: 'bg-switch', title: 'Switch', icon: 'switch', color: '#4F9CF9', pos: [-3, 0] },
  { id: 'bg-whatsapp', title: 'WhatsApp', icon: 'whatsapp', color: '#25D366', pos: [6, 6.6] },
  { id: 'bg-sheets', title: 'Google Sheets', icon: 'sheets', color: '#16A765', pos: [6, 2.4] },
  { id: 'bg-video', title: 'Áudio/Vídeo', icon: 'video', color: '#FF2B3A', pos: [6, -2.4] },
  { id: 'bg-edit', title: 'Edit', icon: 'edit', color: '#8083F8', pos: [6, -6.6] },
  { id: 'bg-aggregate', title: 'Aggregate', icon: 'aggregate', color: '#FF7A1A', pos: [15, 0] },
  { id: 'bg-agent', title: 'Agente de IA', icon: 'agent', pos: [24, 0] },
  { id: 'bg-llm', title: 'LLM Model', icon: 'brain', pos: [21, -5], kind: 'sub' },
  { id: 'bg-postgres', title: 'Postgres', icon: 'database', pos: [24, -5.6], kind: 'sub' },
  { id: 'bg-code', title: 'Code tool', icon: 'code', pos: [27, -5], kind: 'sub' },
  { id: 'bg-if', title: 'If', icon: 'if', color: '#22C55E', pos: [34, 0] },
  { id: 'bg-filter', title: 'Filter', icon: 'filter', color: '#4F9CF9', pos: [44, 4.4], output: false },
  { id: 'bg-http', title: 'HTTP Request', icon: 'globe', color: '#8083F8', pos: [44, -4.4], output: false },
]

/** Ligações do fluxo de fundo. Se o destino for um sub-nó, a linha sai tracejada da base do nó de origem. */
export const BACKGROUND_EDGES: [string, string][] = [
  ['bg-webhook', 'bg-switch'],
  ['bg-switch', 'bg-whatsapp'], ['bg-switch', 'bg-sheets'], ['bg-switch', 'bg-video'], ['bg-switch', 'bg-edit'],
  ['bg-whatsapp', 'bg-aggregate'], ['bg-sheets', 'bg-aggregate'], ['bg-video', 'bg-aggregate'], ['bg-edit', 'bg-aggregate'],
  ['bg-aggregate', 'bg-agent'],
  ['bg-agent', 'bg-llm'], ['bg-agent', 'bg-postgres'], ['bg-agent', 'bg-code'],
  ['bg-agent', 'bg-if'],
  ['bg-if', 'bg-filter'], ['bg-if', 'bg-http'],
]

/** Número de seções/paradas */
export const N = STOPS.length

/** Títulos dos nós principais, um por seção (usado no HUD) */
export const MAIN_TITLES = NODES.filter(n => Number.isInteger(n.at)).map(n => n.title)

/** Nós que abrem um modal ao serem clicados */
export type ModalId = 'sobre' | 'switch' | 'web' | 'auto' | 'merge' | 'code' | 'send'
export const MODAL_NODES: ReadonlySet<string> = new Set<ModalId>(['sobre', 'switch', 'web', 'auto', 'merge', 'code', 'send'])

/** Nó principal de cada seção (o hero não abre modal) */
export const SECTION_NODES: (ModalId | null)[] = [null, 'sobre', 'switch', 'merge', 'code', 'send']
