# Arquitetura

A Bíblia PRO é um plugin do Spresenter e, como todo plugin, roda em **dois
contextos isolados**:

```
┌──────────────────────────────┐        ┌───────────────────────────────┐
│  Thread de lógica            │        │  Painel (iframe)              │
│  src/code.ts                 │◀──────▶│  src/ui/ (React)              │
│  sem DOM, sem React          │  SDK   │  DOM, React, CSS              │
│                              │  msgs  │                               │
│  • estado (listas, favoritos)│        │  • busca e navegação          │
│  • histórico                 │        │  • marcação de versículos     │
│  • projeção (live/outputs)   │        │  • entrada de teclado         │
└──────────────┬───────────────┘        └───────────────┬───────────────┘
               │                                        │
               │ rotas locais /bible/*                  │
               ▼                                        ▼
        Bíblia do Spresenter                     config.json local
        (versões, livros, capítulos)             (tema, fundo, camada)
```

## 1. Thread de lógica — `src/code.ts`

Executa sem acesso ao DOM. Responsabilidades:

- **Estado persistido** — pregações (listas), favoritos, histórico e
  configurações de layout (alturas das seções, largura do Texto, etc.).
- **Projeção** — recebe um plano da UI e aplica nas saídas configuradas
  (`live:write`), além de limpar a projeção.
- **Aprendizado de tema/camada** — observa o que o painel nativo de Bíblia do
  app projeta (`live:read`, `outputs:read`) e reutiliza tema, fundo e camada.
- **Contrato de mensagens** — recebe comandos da UI (`fav-add`, `play`, `clear`,
  `settings`, …) e devolve o estado atualizado.

O texto do versículo é enviado **já pronto** pela UI. Um favorito guarda o texto
no momento em que foi salvo, então projetar não depende de nova consulta à
Bíblia nem de rede.

## 2. Painel — `src/ui/`

Um app React montado em um iframe servido pelo próprio Spresenter. Principais
módulos:

| Arquivo | Papel |
| --- | --- |
| `main.tsx` | Bootstrap React, `ErrorBoundary` e montagem do app. |
| `App.tsx` | Painel completo: abas, busca, favoritos, histórico, teclado, projeção. |
| `appConfig.ts` | Lê `config.json` e monta o plano de projeção (tema, fundo, camada). |
| `bibleThemes.ts` | Catálogo de temas de Bíblia conhecidos como fallback. |
| `TypeToJump.tsx` | Digitação direta (livro → capítulo → versículo). |
| `Resizer.tsx` | Alças de redimensionamento com mouse, toque e teclado. |
| `useGridColumns.ts` | Cálculo de colunas uniformes minimizando células vazias. |
| `index.css` | Tema visual do painel, herdando as variáveis `--sp-*`. |

### Comunicação

A UI usa `postMessage` / `onMessage` do SDK (`@spresenter/plugin-sdk/ui`):

```ts
// UI → lógica
postMessage({ type: 'fav-add', fav: { version, abbrev, book, chapter, verses } });
postMessage({ type: 'play', fav });
postMessage({ type: 'clear' });

// lógica → UI
onMessage((msg) => { /* state, notice, live-state, ... */ });
```

Sempre trate as mensagens como **não confiáveis**: valide formato e ignore o que
não reconhecer. A thread de lógica é a fonte da verdade do estado.

## 3. Dados da Bíblia

A UI consulta as rotas locais do Spresenter:

| Rota | Uso |
| --- | --- |
| `/bible/versions` | Versões instaladas (NVI, ARA, KJA…). |
| `/bible/books` | Livros e quantidade de capítulos. |
| `/bible/chapters` | Capítulos de um livro. |
| `/bible/verses` | Versículos de um capítulo. |

As respostas são normalizadas em estruturas simples (`Book`, `Verse`) e
cacheadas apenas em memória durante a sessão do painel.

## 4. Projeção

O plano de projeção é montado na UI (`appConfig.ts`):

1. Lê o `config.json` publicado pelo app.
2. Resolve o **tema** de Bíblia de cada saída (sistema ou salvo).
3. Resolve o **fundo por tipo de mídia** (enviado uma vez para a camada de
   fundo, para não reiniciar a cada versículo).
4. Resolve a **camada** padrão da Bíblia (ou a fixada pelo usuário).
5. Envia o plano para a thread de lógica, que aplica via `live:write`.

O tema é resolvido **a cada projeção**, então trocas de configuração durante o
culto valem já no próximo versículo.

## 5. Estado e resiliência

- O estado é mantido na thread de lógica e espelhado na UI.
- Alterações de layout são salvas com debounce para não sobrecarregar o armazenamento.
- A UI tem `ErrorBoundary` e um fallback "Carregando…" no HTML.
- `useGridColumns` usa `ResizeObserver` com fallback para `window.resize`.
- Hooks React ficam **sempre antes** de retornos condicionais (evita o erro
  “Rendered fewer hooks than expected”).

## 6. Decisões de projeto

| Decisão | Motivo |
| --- | --- |
| Texto do versículo salvo no favorito | Projeção independente de consultas e de mudanças na Bíblia instalada. |
| Tema resolvido por projeção | Acompanha mudanças do operador em tempo real. |
| `emptyOutDir: false` no build da UI | Evita painel em branco por `index.html` em cache apontando para assets apagados. |
| Grade calculada em JS | Distribui melhor as células e evita “buracos” no fim da lista. |
| Sem telemetria e sem rede | Privacidade e previsibilidade em ambiente de culto. |

## 7. Limites conhecidos

- A UI depende das rotas locais da Bíblia do Spresenter; sem Bíblia instalada o
  painel não lista versões.
- O estado não migra automaticamente entre `id` diferentes de plugin.
- A projeção depende das permissões declaradas no `manifest.json`.
