# Desenvolvimento

## Requisitos

| Ferramenta | Versão |
| --- | --- |
| Node.js | 20+ (veja `.nvmrc`) |
| npm | 10+ |
| Git | 2.40+ |
| Spresenter | 0.3.45+ |

## Configuração inicial

```bash
git clone https://github.com/ariellaureanorosas/biblia-pro.git
cd biblia-pro
npm ci
```

O SDK de plugins é instalado a partir de `sdk/spresenter-plugin-sdk.tgz`
(dependência `file:`), então não é necessário publicar nem baixar nada externo.

## Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` | Build em modo watch do código e da UI, em paralelo. |
| `npm run build` | Build de produção: `dist/code.js` + `dist/ui/`. |
| `npm run typecheck` | `tsc --noEmit` em todo o projeto. |
| `npm run package` | `build` + zip em `release/<nome>-<versão>.zip`. |
| `npm run watch:code` | Watch apenas da thread de lógica. |
| `npm run watch:ui` | Watch apenas da UI. |

## Rodando dentro do Spresenter

1. Rode `npm run dev` (ou `npm run build` uma vez).
2. No Spresenter: **Configurações → Plugins → Load folder (dev)**.
3. Selecione a pasta do repositório (`manifest.json` aponta para `dist/`).
4. Abra o painel pelo ícone `sparkles`.
5. Para ver mudanças: recarregue o painel. Com `npm run dev`, o build acontece a
   cada salvamento; às vezes é preciso fechar e reabrir o painel.

### Instalando pelo zip

```bash
npm run package
```

Instale `release/biblia-pro-1.0.0.zip` em **Configurações → Plugins**.

## Build por dentro

```
npm run build
├─ vite.code.config.ts   → dist/code.js        (IIFE, thread de lógica)
└─ vite.ui.config.ts     → dist/ui/index.html  (React + CSS com hash)
```

- `vite.ui.config.ts` usa `emptyOutDir: false` para **preservar assets antigos**.
  Isso evita que um painel aberto com `index.html` em cache fique em branco após
  um rebuild. Faça uma limpeza manual de `dist/ui/assets` se quiser um pacote
  enxuto.
- `scripts/package.mjs` monta o zip com `manifest.json` na raiz, `dist/`,
  `README.md` e `LICENSE`.

## Depuração

| Onde | Como |
| --- | --- |
| Painel (UI) | DevTools do Spresenter (se disponível) ou console do iframe. |
| Thread de lógica | Logs do Spresenter / console do processo. |
| Mensagens | Instrumente temporariamente `postMessage`/`onMessage`. |
| Build | `npm run typecheck` antes de culpar o runtime. |

### Sintomas comuns

- **Painel em branco** — normalmente asset antigo em cache. Feche/reabra o
  painel ou reinicie o Spresenter; confira se `dist/ui/index.html` aponta para
  um asset existente em `dist/ui/assets/`.
- **“Carregando…” infinito** — o JS não executou. Verifique o console e se o
  `index.html` foi servido corretamente.
- **“Não consegui abrir o painel”** — erro de runtime capturado pelo
  `ErrorBoundary`; a mensagem aparece no painel.
- **Erro React #310** — hooks chamados fora de ordem; garanta que todo hook
  esteja antes de qualquer `return` condicional.

## Convenções

- Hooks React sempre no topo do componente, antes de retornos condicionais.
- A thread de lógica é a **fonte da verdade** do estado.
- Não introduza dependências sem necessidade; bundle pequeno importa.
- Use as variáveis de tema do Spresenter (`--sp-*`) em vez de cores fixas.
- Textos da interface em português do Brasil.

## Limpeza

```bash
# reinstalação limpa
rm -rf node_modules dist release
npm ci
npm run package
```

No Windows (PowerShell):

```powershell
Remove-Item -Recurse -Force node_modules, dist, release -ErrorAction SilentlyContinue
npm ci
npm run package
```

## Checklist antes de abrir um PR

- [ ] `npm run typecheck` sem erros
- [ ] `npm run build` sem erros
- [ ] `npm run package` gera o zip
- [ ] Testado no Spresenter (painel abre, busca funciona, projeção funciona)
- [ ] `CHANGELOG.md` atualizado (se aplicável)
- [ ] Diff focado e commits no padrão Conventional Commits
