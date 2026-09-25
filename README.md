# BRX Labs

Site da **BRX Labs**, estúdio de desenvolvimento web e automação de Rio Grande/RS.

O site é um fluxo de automação no estilo do n8n, desenhado em 3D. O visitante percorre os nós rolando a página (ou segurando o botão "Segure para executar", que faz a apresentação sozinha). Cada nó abre um painel com o conteúdo. No fim, o fluxo chega ao nó **BRX**, a câmera mergulha no R do título e a página final se abre de dentro do R de "BRX LABS".

> Projeto em andamento: textos e alguns ajustes ainda vão mudar.

## Stack

| Camada | Tecnologia | Para quê |
|---|---|---|
| Base | [Vite](https://vite.dev) + [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) | Estrutura, componentes e tipagem |
| 3D | [Three.js](https://threejs.org) | Cena do fluxo: nós, conexões, câmera, efeitos |
| Animação e scroll | [GSAP](https://gsap.com) + ScrollTrigger + ScrollToPlugin | Scroll ligado à câmera, modo apresentação, zoom da página final |
| Intro | [OGL](https://github.com/oframe/ogl) (WebGL2) | Animação "elétrica" de abertura (B → R → X → BRX LABS) |
| Estilo | CSS com variáveis de tema + [Tailwind CSS 4](https://tailwindcss.com) | Tema claro/escuro, layout responsivo |
| Qualidade | ESLint (typescript-eslint, react-hooks) | Lint |

**Fontes:** [Zen Dots](https://fonts.google.com/specimen/Zen+Dots) (títulos), [Play](https://fonts.google.com/specimen/Play) (textos) e [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) (código e rótulos), via Google Fonts. Todas com licença OFL.

**Componentes do [React Bits](https://reactbits.dev):** `HoldButton` (botão de segurar) e `ElectricLogo` (intro). Os dois foram adaptados; as mudanças estão marcadas como "Adição local" no código.

## Destaques técnicos

- **Fluxo 3D guiado pelo scroll.** A posição da rolagem vira um "tempo" do fluxo. A câmera percorre uma curva entre as paradas e pausa em cada nó enquanto o conteúdo é lido.
- **Nós clicáveis com modal.** Os nós já alcançados abrem um `<dialog>` com o conteúdo. No Switch, o visitante escolhe uma rota (Web ou Automação) e a outra é apagada na cena.
- **Modo apresentação.** Segurar o botão do hero faz a página rolar sozinha, abrindo cada nó. Qualquer clique, toque, rolagem ou tecla interrompe.
- **Efeitos por nó.** Cada parada tem um efeito ligado à ação do nó: ondas no Webhook, campos subindo no Editar campos, pulsos testando as rotas no Switch, itens chegando no Merge, símbolos no Código e um avião de papel no WhatsApp.
- **Fluxo de fundo.** Um segundo fluxo decorativo (Webhook, Switch, canais, Aggregate, Agente de IA com sub-nós, If…) com ícones desenhados em canvas.
- **Final "para dentro do R".** Um pulso vai até o nó BRX, que conclui (selo e ondas verdes). A câmera mergulha no miolo do R, e a página final começa dentro do miolo do R de "BRX LABS" e faz zoom out. A palavra é um contorno vetorial (SVG) gerado a partir da fonte, porque o navegador desenha texto errado em ampliações extremas. O miolo do R é encontrado por código ([letterCounter.ts](src/flow/letterCounter.ts)).
- **Acessibilidade e desempenho.** Respeita "reduzir movimento" (desliga intro, efeitos e zoom). Tem fallback sem WebGL, a cena 3D é carregada em um arquivo separado e o celular usa configurações mais leves.

## Rodar localmente

Precisa de Node.js 20 ou mais recente.

```bash
npm install
npm run dev      # servidor de desenvolvimento
npm run build    # gera a versão de produção em dist/
npm run preview  # testa a versão de produção
npm run lint     # verifica o código
```

Para abrir no celular na mesma rede: `npm run dev -- --host` e acesse o endereço de rede que aparecer no terminal.

## Deploy (Vercel)

O projeto não precisa de configuração extra na Vercel. Ao importar o repositório, ela detecta o Vite:

- **Build command:** `npm run build`
- **Output directory:** `dist`

## Onde mexer

| O quê | Onde |
|---|---|
| Todos os textos, projetos, contatos e stack | [src/content.ts](src/content.ts) |
| Cores, fontes e layout | [src/index.css](src/index.css) |
| Nós, conexões, paradas da câmera e fluxo de fundo | [src/flow/config.ts](src/flow/config.ts) |
| Cena 3D (câmera, nós, transição final) | [src/flow/createFlowScene.ts](src/flow/createFlowScene.ts) |
| Desenho dos cartões e ícones | [src/flow/textures.ts](src/flow/textures.ts) |
| Efeitos de cada parada | [src/flow/effects.ts](src/flow/effects.ts) |
| Scroll, HUD e dica de clique | [src/flow/useFlow.ts](src/flow/useFlow.ts) |
| Modo apresentação | [src/flow/useAutoRun.ts](src/flow/useAutoRun.ts) |
| Modais dos nós | [src/components/NodeModal.tsx](src/components/NodeModal.tsx) |
| Intro | [src/components/Intro.tsx](src/components/Intro.tsx) |
| Página final | [src/components/Outro.tsx](src/components/Outro.tsx) |

## Estrutura

```
src/
├── content.ts            textos do site
├── App.tsx               monta a página
├── index.css             tema e layout
├── components/           hero, modais, HUD, intro, página final e componentes do React Bits
└── flow/                 cena 3D: configuração, desenho, efeitos, scroll e modo apresentação
```
