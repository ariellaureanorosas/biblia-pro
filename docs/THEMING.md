# Tema, fundo e camada

A Bíblia PRO foi feita para **parecer parte do Spresenter**. Em vez de ter um
tema próprio para a projeção, ela reaproveita a configuração do painel de Bíblia
nativo do app.

## Como funciona

A cada projeção, a UI lê o `config.json` publicado localmente pelo Spresenter e
resolve três coisas:

1. **Tema de Bíblia** — o tema configurado para cada saída (do sistema ou salvo
   pelo usuário).
2. **Fundo por tipo de mídia** — o fundo configurado para Bíblia em
   *Configurações → Camadas*. Ele é enviado **uma vez** para a camada de fundo,
   para não reiniciar a animação a cada versículo.
3. **Camada de projeção** — a camada padrão da Bíblia, ou a que o usuário fixar
   em *Onde projetar*.

O plano é montado em `src/ui/appConfig.ts` e aplicado pela thread de lógica
(`src/code.ts`) via `live:write`.

## Por que ler a cada projeção

Durante o culto o operador pode trocar o tema, o fundo ou a camada. Ler a
configuração a cada versículo significa que a próxima projeção já reflete a
mudança, sem precisar reiniciar o plugin.

## Aprendizado de tema

Quando um versículo é projetado pelo **painel nativo** de Bíblia do app, a
thread de lógica observa o estado ao vivo (`live:read` / `outputs:read`) e
aprende o tema e a camada usados. Antes de aprender, usa o tema padrão de Bíblia
do Spresenter.

`src/ui/bibleThemes.ts` mantém um catálogo dos temas conhecidos como fallback,
para o caso de a configuração ainda não estar disponível.

## Fallback

Se a configuração não puder ser lida:

- Usa-se o tema padrão de Bíblia do Spresenter.
- Usa-se o catálogo local (`bibleThemes.ts`) quando o identificador do tema é
  conhecido.
- A projeção continua, sem interromper o culto.

## Estilo do painel

O painel (UI) também segue o tema do Spresenter:

- Cores e bordas vêm das variáveis CSS `--sp-*` (`--sp-primary`, `--sp-border`,
  `--sp-text-muted`, …).
- Tamanhos de fonte usam container queries para se adaptar ao botão.
- Não introduza cores fixas; use `color-mix` com as variáveis do tema para
  variações.

## Testando mudanças de tema

1. Abra o painel e projete um favorito.
2. Troque o tema de Bíblia nas configurações do Spresenter.
3. Projete novamente: o novo tema deve valer imediatamente.
4. Troque o fundo de Bíblia em *Camadas* e reprojete.
5. Fixe outra camada em *Onde projetar* e confirme que a projeção respeita a
   escolha.

## Limitações

- Se o Spresenter mudar o formato do `config.json`, o plugin pode cair no
  fallback até ser atualizado.
- Temas muito novos (desconhecidos pelo catálogo) dependem da leitura da
  configuração em tempo real.
