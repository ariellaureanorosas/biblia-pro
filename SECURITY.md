# Política de Segurança

## Versões suportadas

Apenas a versão mais recente publicada recebe correções de segurança.

| Versão | Suporte |
| --- | --- |
| 1.x | ✅ |
| &lt; 1.0 | ❌ |

## Reportando uma vulnerabilidade

**Não abra uma issue pública para vulnerabilidades.**

Envie um e-mail para **ariellaureanorosas@gmail.com** com:

- Descrição da vulnerabilidade e impacto potencial.
- Passos para reproduzir ou prova de conceito.
- Versão da Bíblia PRO e do Spresenter.
- Sistema operacional e versão do Node.js (se relevante).
- Se possível, uma sugestão de correção.

Você pode esperar:

- **Confirmação de recebimento** em até 72 horas.
- **Avaliação inicial** em até 7 dias.
- Crédito público na nota de correção, se desejar.

Pedimos que não divulgue o problema publicamente antes de uma correção ser
publicada.

## Escopo

A Bíblia PRO é um plugin que roda dentro do Spresenter, em dois contextos
isolados (thread de lógica e UI em iframe). As permissões declaradas no
`manifest.json` são:

- `outputs:read` — ler as saídas configuradas.
- `live:read` — ler o estado ao vivo.
- `live:write` — projetar e limpar a projeção.

O plugin não coleta telemetria, não faz requisições a servidores externos e não
armazena dados fora da configuração local do Spresenter.

Vulnerabilidades no próprio Spresenter devem ser reportadas aos mantenedores do
app.
