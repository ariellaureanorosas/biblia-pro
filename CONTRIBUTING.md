# Contribuindo com a Bíblia PRO

Obrigado pelo interesse em contribuir! Este documento descreve o fluxo de
trabalho, os padrões de código e o que esperamos de uma contribuição.

## Antes de começar

- Leia o [`README.md`](README.md) e o [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
- Verifique se já existe uma issue ou pull request tratando do mesmo assunto.
- Para mudanças grandes, abra uma issue primeiro para alinhar a abordagem.

## Ambiente de desenvolvimento

Requisitos: **Node.js 20+** e **npm 10+**.

```bash
git clone https://github.com/ariellaureanorosas/biblia-pro.git
cd biblia-pro
npm ci
npm run dev
```

Para testar no Spresenter, use **Configurações → Plugins → Load folder (dev)** e
aponte para a pasta do repositório. Detalhes em [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md).

## Fluxo de trabalho

1. Crie um branch a partir de `main`:

   ```bash
   git switch -c feat/nome-curto
   ```

   Prefixos sugeridos: `feat/`, `fix/`, `docs/`, `refactor/`, `chore/`, `test/`.

2. Implemente a mudança com escopo pequeno e foco único.
3. Rode as verificações locais:

   ```bash
   npm run lint
   npm run test
   npm run typecheck
   npm run build
   ```

4. Teste o painel no Spresenter (instale o `.zip` de `release/` ou recarregue a
   pasta do plugin).
5. Abra o pull request preenchendo o template.

## Padrões de código

- **TypeScript estrito** — não use `any` sem justificativa; prefira tipos
  explícitos nas fronteiras (mensagens do SDK, respostas de `/bible/*`).
- **React** — componentes funcionais, hooks no topo e antes de qualquer
  retorno condicional. Nunca coloque hooks depois de um `return`.
- **Estilo** — duas espaços, aspas simples em TS/TSX, ponto e vírgula.
  O `.editorconfig` cobre o básico.
- **CSS** — use as variáveis de tema do Spresenter (`--sp-*`) e evite cores
  fixas, para manter a aparência do app.
- **Textos da interface** em **português do Brasil**, claros e curtos.
- **Comentários** apenas quando explicam o “porquê”, não o “o quê”.

## Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/pt-BR/):

```
feat: adiciona atalho para projetar o próximo versículo
fix(ui): corrige número escapando do botão em painéis estreitos
docs: documenta o fluxo de release
chore(deps): atualiza Vite
```

Escopos comuns: `ui`, `core`, `docs`, `ci`, `deps`, `release`.

## Pull requests

Um bom pull request:

- Tem título no padrão Conventional Commits.
- Descreve o problema e a solução.
- Inclui passos para reproduzir/testar.
- Traz screenshots ou GIFs para mudanças visuais.
- Mantém o diff focado — evite reformatações amplas sem relação com a mudança.
- Atualiza `CHANGELOG.md` quando a mudança for perceptível ao usuário.

## Reportando bugs

Use o template de **bug report** e inclua:

- Versão da Bíblia PRO e do Spresenter.
- Sistema operacional.
- Passos para reproduzir, comportamento observado e esperado.
- Mensagens do console/painel e, se possível, screenshots.

## Licença

Ao contribuir, você concorda que sua contribuição será licenciada sob a
licença **MIT** deste projeto.
