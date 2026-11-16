# Bíblia PRO

> **A Bíblia do Spresenter, pronta para pregar.** Busque, marque e projete
> versículos em segundos — com favoritos por pregação, busca rápida no estilo
> Spotlight e projeção herdando o tema, o fundo e a camada do app.

[![CI](https://github.com/ariellaureanorosas/biblia-pro/actions/workflows/ci.yml/badge.svg)](https://github.com/ariellaureanorosas/biblia-pro/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-1.0.0-4f46e5.svg)](https://github.com/ariellaureanorosas/biblia-pro/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-22c55e.svg)](LICENSE)
[![Spresenter](https://img.shields.io/badge/Spresenter-0.3.45%2B-0ea5e9.svg)](https://github.com/ariellaureanorosas/biblia-pro)

---

## Índice

- [Sobre](#sobre)
- [Recursos](#recursos)
- [Requisitos](#requisitos)
- [Instalação](#instalação)
- [Como usar](#como-usar)
- [Atalhos de teclado](#atalhos-de-teclado)
- [Tema, fundo e camada](#tema-fundo-e-camada)
- [Desenvolvimento](#desenvolvimento)
- [Arquitetura](#arquitetura)
- [Solução de problemas](#solução-de-problemas)
- [Contribuindo](#contribuindo)
- [Versionamento](#versionamento)
- [Licença](#licença)

---

## Sobre

**Bíblia PRO** é um plugin para o [Spresenter](https://spresenter.com) que transforma
a preparação do sermão em um fluxo contínuo: escolher o texto, separar os
versículos de cada pregação e projetar — sem sair do painel e sem reconfigurar
tema, fundo ou camada.

O plugin conversa com a Bíblia já instalada no Spresenter (NVI, ARA, KJA e
outras) e projeta exatamente como o painel de Bíblia nativo: o mesmo tema, o
mesmo fundo por tipo de mídia e a mesma camada padrão.

## Recursos

- **Painel de Bíblia completo** — Livros, Capítulo, Versículo e Texto em uma
  única tela, com o visual do painel nativo.
- **Busca rápida** — digite `jo`, `jo 3:16`, `1co 13 4-7` ou `amor de deus` e
  navegue por livros, versículos e trechos encontrados em um pop-up.
- **Digitação direta** — com o painel em foco (fora de campos), digite
  `joa` `3` `16` e o capítulo abre com o versículo marcado.
- **Favoritos por pregação** — listas independentes, com renomear, reordenar e
  excluir com **Desfazer**.
- **Vários versículos em um favorito** — um trecho (ex.: Jo 3:15-16) pode ir
  ao ar junto, em uma tela só, ou um por vez com o botão **Juntos / 1 a 1**.
- **Projeção com um clique** — clique no favorito para colocá-lo no ar; use
  ◀ ▶ (ou ← →) para percorrer o capítulo.
- **Herança de tema, fundo e camada** — lê a configuração atual do Spresenter a
  cada projeção, inclusive trocas feitas durante o culto.
- **Seções redimensionáveis** — alças para altura de Livros, Capítulo/Versículo
  e Texto; largura do Texto ajustável; duplo clique restaura o padrão.
- **Barras de rolagem discretas** — aparecem somente ao rolar ou passar o mouse.
- **Interface responsiva** — funciona em painéis largos e estreitos, com grade
  que se ajusta ao espaço disponível.
- **Acessibilidade** — navegação por teclado, foco visível, alças operáveis com
  as setas e textos com contraste adequado.

## Requisitos

| Item | Versão |
| --- | --- |
| Spresenter | **0.3.45** ou superior |
| SDK de plugins | 0.3.45 |
| Node.js (apenas para desenvolvimento) | 20 ou superior |
| Sistema | Windows, macOS ou Linux (onde o Spresenter roda) |

## Instalação

### Pelo pacote `.zip` (recomendado)

1. Baixe o pacote mais recente em
   [**Releases**](https://github.com/ariellaureanorosas/biblia-pro/releases)
   (`com.beone.biblia-pro-1.0.0.zip`).
2. No Spresenter, abra **Configurações → Plugins**.
3. Instale o `.zip` e ative o plugin **Bíblia PRO**.
4. Abra o painel pelo ícone `sparkles` na barra lateral.

### A partir do código (desenvolvimento)

```bash
git clone https://github.com/ariellaureanorosas/biblia-pro.git
cd biblia-pro
npm ci
npm run build
```

No Spresenter: **Configurações → Plugins → Load folder (dev)** e selecione a
pasta do repositório (o `manifest.json` aponta para `dist/code.js` e
`dist/ui/index.html`).

> Para iterar rápido, rode `npm run dev` em um terminal e recarregue o painel a
> cada alteração.

## Como usar

### 1. Crie as pregações

Cada pregação é uma lista independente — crie com **＋**, renomeie com **✎** e
exclua com **🗑** (com a opção **Desfazer**).

### 2. Escolha o texto

- Toque no **livro**, depois no **capítulo** e marque os **versículos**; ou
- Use a **busca rápida** (`jo 3:16`, `1co 13 4-7`, `amor de deus`):
  **↑ ↓** navegam, **Tab** completa o nome do livro, **Enter** abre o capítulo
  com o versículo marcado e **Esc** fecha; ou
- **Digite direto** com o painel em foco: `joa` `3` `16`.

### 3. Favoritar

O botão de favorito guarda tudo o que está marcado. Vários versículos viram
**um único favorito**, preservando o texto no momento em que foi salvo — a
projeção não depende de consultas externas depois.

### 4. Projetar

Clique no favorito: ele vai ao ar e os quadros inferiores abrem nele.

- Use **Juntos** para projetar o trecho inteiro em uma tela, ou **1 a 1** para
  um versículo por vez.
- **◀ ▶** (ou **← →**) percorrem o capítulo.
- **Tirar do ar** (ou **Esc**) limpa a projeção.

### 5. Organizar

- **↑ ↓** mudam a ordem dos favoritos e das listas.
- **🗑** exclui na hora, com **Desfazer** disponível por alguns segundos.
- **Histórico** guarda o que foi projetado; remova itens individualmente pelo
  **×** ou limpe tudo com **Limpar**.

### 6. Ajustar o painel

- Arraste as alças entre as seções para ajustar alturas e a largura do Texto.
- **Duplo clique** em uma alça restaura o tamanho padrão.
- As alças também respondem às **setas do teclado** (Shift = passo fino).
- Os tamanhos ficam salvos nas configurações do plugin.

## Atalhos de teclado

| Contexto | Tecla | Ação |
| --- | --- | --- |
| Painel em foco | Digitar `joa` `3` `16` | Abre o livro/capítulo e marca o versículo |
| Busca rápida | **↑ / ↓** | Navega pelos resultados |
| Busca rápida | **Tab** | Completa o nome do livro |
| Busca rápida | **Enter** | Abre o capítulo com o versículo marcado |
| Busca rápida | **Esc** | Fecha o pop-up |
| Projeção | **← / →** | Versículo anterior / próximo |
| Projeção | **Esc** | Tira do ar |
| Alças | **Setas** | Ajusta o tamanho (Shift = passo fino) |
| Alças | **Duplo clique** | Restaura o tamanho padrão |
| Renomear lista | **Enter** | Salva · **Esc** cancela |

## Tema, fundo e camada

A cada versículo, o plugin lê a **configuração atual do Spresenter** — o
`config.json` que o app publica localmente — e projeta como o painel de Bíblia
faria:

- **Tema** — o tema de Bíblia de cada saída (do sistema ou salvo).
- **Fundo por tipo** — o fundo configurado para Bíblia em
  *Configurações → Camadas*, enviado uma vez para a camada de fundo (não
  reinicia a cada versículo).
- **Camada** — a camada padrão da Bíblia, ou a que você fixar em
  *Onde projetar*.

Trocou tema ou fundo nas configurações? Vale já no próximo versículo.

Detalhes de implementação em [`docs/THEMING.md`](docs/THEMING.md).

## Desenvolvimento

### Pré-requisitos

- Node.js **20+** (veja `.nvmrc`)
- npm 10+
- Spresenter 0.3.45+ instalado

### Instalação

```bash
npm ci
```

### Scripts

| Script | Descrição |
| --- | --- |
| `npm run dev` | Build em modo watch (código e UI em paralelo) |
| `npm run build` | Build de produção (`dist/code.js` + `dist/ui/`) |
| `npm run typecheck` | Verificação de tipos com TypeScript |
| `npm run package` | Build + pacote `release/<id>-<versão>.zip` |
| `npm run watch:code` | Watch apenas da thread de lógica |
| `npm run watch:ui` | Watch apenas da thread de UI |

### Estrutura do projeto

```
.
├─ src/
│  ├─ code.ts            # thread de lógica (sem DOM): estado, favoritos, projeção
│  ├─ spresenter.d.ts    # tipos do runtime do Spresenter
│  └─ ui/
│     ├─ App.tsx         # painel completo (Bíblia, favoritos, histórico)
│     ├─ main.tsx        # bootstrap React + ErrorBoundary
│     ├─ appConfig.ts    # leitura do config.json e plano de projeção
│     ├─ bibleThemes.ts  # temas de Bíblia conhecidos
│     ├─ TypeToJump.tsx  # digitação direta (livro → capítulo → versículo)
│     ├─ Resizer.tsx     # alças de redimensionamento
│     ├─ useGridColumns.ts # colunas uniformes com menos células vazias
│     ├─ index.css       # tema visual do painel
│     └─ index.html      # entrada da UI (com fallback de carregamento)
├─ scripts/package.mjs   # empacotamento do zip de distribuição
├─ docs/                 # arquitetura, desenvolvimento, tema e releases
├─ manifest.json         # manifesto do plugin
└─ package.json
```

### Fluxo de build

1. `vite.code.config.ts` gera `dist/code.js` (IIFE, thread de lógica).
2. `vite.ui.config.ts` gera `dist/ui/` (React + CSS com hash de conteúdo).
3. `scripts/package.mjs` monta o `.zip` com `manifest.json`, `dist/`,
   `README.md` e `LICENSE`.

> Os assets antigos são **preservados** entre builds (`emptyOutDir: false`) para
> que um painel aberto com `index.html` em cache não fique em branco.

Mais detalhes em [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md).

## Arquitetura

O Spresenter executa plugins em dois contextos isolados:

- **Thread de lógica** (`src/code.ts`) — roda sem DOM, mantém o estado
  (pregações, favoritos, histórico, configurações) e conversa com as APIs de
  saída/live do app.
- **Thread de UI** (`src/ui/`) — um app React em iframe, que envia comandos e
  recebe o estado por mensagens do SDK.

O painel usa as rotas locais `/bible/*` do Spresenter para listar versões,
livros, capítulos e versículos. A projeção resolve tema/fundo/camada a partir do
`config.json` e envia o plano para a thread de lógica.

Diagrama e contratos em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Solução de problemas

| Sintoma | Causa provável | Solução |
| --- | --- | --- |
| Painel em branco | Assets antigos em cache após rebuild | Feche e reabra o painel; reinicie o Spresenter |
| “Carregando…” permanente | JS da UI não executou | Confira o console, recarregue o plugin |
| “Não consegui abrir o painel” | Erro de runtime | A mensagem aparece no painel; abra uma issue com o texto |
| Tema/fundo diferentes do app | Configuração alterada após salvar o favorito | O tema é lido a cada projeção; reprojete |
| Versão da Bíblia não aparece | Bíblia não instalada no Spresenter | Instale em **Configurações → Bíblias** |

## Contribuindo

Contribuições são bem-vindas. Leia [`CONTRIBUTING.md`](CONTRIBUTING.md) e o
[`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) antes de abrir uma issue ou pull
request.

- Use **Conventional Commits** (`feat:`, `fix:`, `docs:`, `chore:` …).
- Rode `npm run typecheck` e `npm run build` antes de enviar.
- Descreva o comportamento observado e o esperado, com passos para reproduzir.

## Versionamento

O projeto segue [SemVer](https://semver.org/lang/pt-BR/):

- **MAJOR** — mudanças incompatíveis (ex.: alteração do `id` do plugin).
- **MINOR** — novos recursos compatíveis.
- **PATCH** — correções compatíveis.

As notas de cada versão ficam em [`CHANGELOG.md`](CHANGELOG.md) e nas
[Releases](https://github.com/ariellaureanorosas/biblia-pro/releases).

## Licença

Distribuído sob a licença **MIT**. Veja [`LICENSE`](LICENSE).

---

Feito com dedicação para quem prepara e projeta a Palavra.
