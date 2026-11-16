# Changelog

Todas as mudanças notáveis deste projeto são documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)
e o projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não publicado]

## [1.0.0] — 2026-11-16

Primeira versão pública, publicada como **Bíblia PRO**.

### Adicionado

- Painel de Bíblia unificado com abas **Livros**, **Capítulo**, **Versículo** e
  **Texto**, no visual do painel nativo do Spresenter.
- Busca rápida no estilo Spotlight: livros, versículos e trechos por referência
  (`jo 3:16`, `1co 13 4-7`) ou por texto (`amor de deus`).
- Digitação direta com o painel em foco (`joa` `3` `16`).
- Favoritos organizados por **pregação**, com renomear, reordenar, excluir e
  **Desfazer**.
- Vários versículos em um único favorito, com projeção **Juntos** ou **1 a 1**.
- Projeção com um clique e navegação por **◀ ▶** / **← →**.
- Herança de **tema**, **fundo por tipo** e **camada** a cada projeção.
- Seções redimensionáveis (altura de Livros, Capítulo/Versículo e Texto; largura
  do Texto), com duplo clique para restaurar e suporte ao teclado.
- Barras de rolagem que aparecem apenas ao rolar ou passar o mouse.
- Grade responsiva com colunas uniformes e números de capítulo/versículo
  contidos nos botões.
- Histórico de projeções com remoção individual e limpeza total.
- `ErrorBoundary` na UI e fallback "Carregando…" para falhas de carregamento.
- Documentação completa (`docs/`), CI, templates de issue/PR e licença MIT.

### Alterado

- Nome de exibição alterado para **Bíblia PRO**.
- Identificador do plugin alterado para `com.beone.biblia-pro`.
- Versão reiniciada em **1.0.0** como primeira versão pública.

### Notas de migração

- O novo `id` faz com que o plugin seja instalado como um plugin novo. Listas,
  favoritos e configurações da versão anterior **não são migrados
  automaticamente**.

[1.0.0]: https://github.com/ariellaureanorosas/biblia-pro/releases/tag/v1.0.0
