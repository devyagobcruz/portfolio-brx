// Todo o texto do site fica aqui. Edite este arquivo para trocar conteúdo sem mexer nos componentes.
// A voz é sempre a da BRX Labs (nós), nunca a de uma pessoa.

export const contact = {
  // WhatsApp da BRX: +55 47 8862-2961 (no link, só dígitos: 55 + DDD + número)
  whatsapp: 'https://wa.me/554788622961',
  email: 'contato@brxlabs.com.br',
  cta: 'Fale com a gente',
}

export const hero = {
  lines: ['Construímos sites', 'e tudo o que', 'acontece depois', 'do clique.'],
  lede: 'A BRX Labs desenvolve sites rápidos e automações que tiram o trabalho repetitivo da sua equipe. Este site é um fluxo: segure o botão para executá-lo, ou role a página e clique em cada nó.',
}

/** Texto do botão que aparece embaixo do nó atual */
export const nodeHint = {
  default: 'Clique para abrir',
  switch: 'Clique para escolher o caminho',
}

export const about = {
  title: 'BRX Labs',
  text: 'A BRX Labs é uma empresa de desenvolvimento web e automação. Com clientes até onde a internet alcançar. Antes de escrever código, mapeamos o processo, entendemos o que pode ser automatizado, desenhamos a estratégia e então desenvolvemos a solução.',
  output: {
    empresa: 'BRX Labs',
    base: 'Rio Grande/RS',
    atendimento: 'Remoto/Presencial',
    foco: ['web', 'automação'],
  },
}

export const switchNode = {
  title: 'Cada pedido segue a rota certa.',
  text: 'Escolha o caminho que mais se parece com o que você precisa. Se forem os dois, a gente conecta um no outro.',
}

export type RouteId = 'web' | 'auto'

export const routes: Record<RouteId, {
  label: string
  title: string
  summary: string
  headline: string
  text: string
  items: string[]
  tags: string[]
}> = {
  web: {
    label: 'Rota 1',
    title: 'Desenvolvimento web',
    summary: 'Landing pages, sites institucionais e redesigns.',
    headline: 'Sites que carregam rápido e convertem.',
    text: 'Desenvolvemos em React e TypeScript, com foco em velocidade, SEO e em levar o visitante até o contato. Cada formulário já nasce ligado ao seu WhatsApp, e-mail ou CRM.',
    items: [
      'Landing pages para campanhas e lançamentos',
      'Sites institucionais',
      'Redesign de sites que já existem',
      'Formulários integrados a WhatsApp, e-mail e CRM',
    ],
    tags: ['React', 'TypeScript', 'SEO', 'Performance'],
  },
  auto: {
    label: 'Rota 2',
    title: 'Automação',
    summary: 'Fluxos em n8n que conectam WhatsApp, e-mail, CRM e planilhas.',
    headline: 'Automação de processos.',
    text: 'Mapeamos o trabalho repetitivo da sua equipe e montamos fluxos automatizados. ',
    items: [
      'Triagem de mensagens e e-mails com IA',
      'Follow-up automático de leads',
      'Relatórios que chegam sozinhos',
      'Integração entre sistemas que não conversam',
    ],
    tags: ['n8n', 'IA', 'WhatsApp', 'CRM'],
  },
}

export const projectsNode = {
  title: 'Projetos entregues & parcerias formadas.',
}

export const projects = [
  { title: 'Triagem de e-mails com IA', text: 'Classificação automática de e-mails para um escritório de contabilidade.', tags: ['Automação', 'IA'] },
  { title: 'Comunidade Daniel Burlini', text: 'Site e comunidade para um editor de vídeo.', tags: ['Web', 'Comunidade'] },
  { title: 'Psicóloga Debora', text: 'Landing page para uma psicóloga.', tags: ['Web', 'Landing page'] },
  { title: 'Setor de automações da HBS', text: 'Desenvolvemos todo o ecossistema de fluxos de automação da High Business School, escola da Victória Ferrari.', tags: ['Automação', 'Parceria'] },
]

export const stackNode = {
  title: 'As ferramentas por trás.',
}

export const stack = {
  web: ['React', 'TypeScript', 'Vite', 'Tailwind'],
  movimento: ['GSAP', 'Three.js'],
  automação: ['n8n', 'Webhooks', 'APIs', 'IA'],
}

export const contactNode = {
  title: 'Qual processo toma mais tempo da sua equipe hoje?',
  text: 'Agende uma conversa com a gente e vamos entender o que funciona para o seu negócio.',
  whatsappLabel: 'Chamar no WhatsApp',
  emailLabel: 'Enviar e-mail',
  note: 'BRX Labs soluções tecnológicas. Todos os direitos reservados.',
}

/** Seção final: "BRX LABS" faz zoom out e revela o chamado para contato e o rodapé */
export const outro = {
  // A palavra animada é um contorno pronto (components/outroWordPath.ts); mudar aqui só muda o título acessível
  word: 'BRX LABS',
  label: 'Fluxo concluído',
  title: 'Seu próximo processo pode rodar sozinho.',
  text: 'Conte o que toma tempo da sua equipe. Respondemos com uma ideia de como automatizar, sem compromisso.',
  whatsappLabel: 'Chamar no WhatsApp',
  emailLabel: 'Enviar e-mail',
  place: 'Rio Grande/RS · atendimento remoto em todo o Brasil',
  copyright: `© ${new Date().getFullYear()} BRX Labs. Todos os direitos reservados.`,
  backToTop: 'Voltar ao início',
}
