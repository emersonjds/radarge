# Bloco de indicadores — Detalhe do evento

Escopo: `src/widgets/events/EventDetail.tsx`, a faixa de indicadores entre o cabeçalho do
evento e a lista de alunos. Não mexe no cabeçalho nem na lista.

## Decisões (resumo)

1. **`Arrecadado` vira um cartão de destaque próprio**, não mais um tile igual aos outros — é
   a resposta à primeira pergunta de leitura ("dá pra ir?").
2. **O valor `R$ 25,00` e o total esperado `de R$ 50,00 esperados` são dois parágrafos
   separados**, nunca uma string concatenada — é isso que elimina a quebra de linha.
3. **Sete indicadores viram três grupos**: cartão de dinheiro (1) → autorização (3) →
   pagamento (3). Cada grupo é um `grid-cols-3` fechado — acabou o órfão de grid.
4. **Cor entra como reforço, nunca como único portador de significado** — todo tile tem
   rótulo em texto; a cor (sucesso/aviso/erro/neutro) é decoração adicional.
5. **O bloco inteiro ganha o mesmo cartão (`border` + `bg-card` + `shadow-sm`) do cabeçalho
   e da lista** — os tiles deixam de flutuar em `bg-muted` solto.
6. Nenhum ícone novo nos tiles de contagem — rótulo + cor de fundo já resolvem a leitura
   rápida; ícone por tile é enfeite não pedido (YAGNI). Reavaliar só se teste com usuário
   mostrar que a cor sozinha não basta.
7. Barra de progresso é dois `div`s com token de cor, não um componente novo — é estática,
   não interativa; não justifica `pnpm dlx shadcn add progress`.

## Mapeamento de dados (`EventSummary`)

| Campo `EventSummary` | Rótulo PT-BR | Grupo |
|---|---|---|
| `collected` + `expected` | "Arrecadado" / "de {expected} esperados" | Dinheiro (topo) |
| `authorized` | "Autorizados" | Autorização |
| `pendingAuthorization` | "Aguardando" | Autorização |
| `denied` | "Não autorizados" | Autorização |
| `paid` | "Pagos" | Pagamento |
| `pendingPayment` | "Pendentes de pagamento" | Pagamento |
| `waived` | "Isentos" | Pagamento |
| `total` | "Total de alunos" | Só no evento gratuito |

Ordem de leitura, de cima para baixo, sempre: **dinheiro → autorização → pagamento**. É a
ordem da pergunta do professor ("dá pra ir? quem falta autorizar? o resto é detalhe").

---

## Layout 375px (evento pago)

Largura de conteúdo assumida: 343px (viewport 375 − 16px de padding em cada lado, herdado
do container da página).

```
┌ Cartão de dinheiro ───────────────────────────┐ 343px, p-4, rounded-xl
│ Arrecadado                             [50%]  │  label text-sm + badge %
│ R$ 25,00                                      │  text-2xl font-bold text-brand-700
│ de R$ 50,00 esperados                         │  text-sm text-muted-foreground
│ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  barra h-2 rounded-full, decorativa
└────────────────────────────────────────────────┘
  mt-4

AUTORIZAÇÃO                                          text-xs font-semibold uppercase
                                                      tracking-wide text-muted-foreground
┌─────────────┬─────────────┬─────────────┐  gap-2 (8px), cada coluna ≈ 109px
│ Autorizados │  Aguardando │Não autoriz. │  label text-xs, cor por tom (ver tabela)
│      8      │      3      │      1      │  text-2xl font-bold text-foreground
└─────────────┴─────────────┴─────────────┘
  mt-4, border-t pt-4

PAGAMENTO
┌─────────────┬─────────────┬─────────────┐
│    Pagos    │ Pend. pag.  │   Isentos   │  label text-xs text-muted-foreground
│      5      │      5      │      2      │  text-2xl font-semibold text-foreground
└─────────────┴─────────────┴─────────────┘
```

O rótulo "Pendentes de pagamento" e "Não autorizados" podem quebrar em 2 linhas dentro dos
109px — aceitável e esperado: o bug era o **valor** quebrando, não o rótulo. Como é grid, as
três colunas da mesma linha esticam juntas para a mesma altura; não distorce o layout.

## Layout ≥1024px (evento pago)

```
┌ Cartão de dinheiro ──────────────────────────────────────────────────────────┐
│ Arrecadado                                                          [50%]    │
│ R$ 25,00   de R$ 50,00 esperados      ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░ (w-48)      │
└────────────────────────────────────────────────────────────────────────────────┘
  mt-4, grid-cols-2 gap-6

┌ AUTORIZAÇÃO ───────────────────────┐   ┌ PAGAMENTO ──────────────────────────┐
│ ┌─────────┬─────────┬─────────┐   │   │ ┌─────────┬─────────┬─────────┐    │
│ │Autorizad│Aguardand│Não autor│   │   │ │  Pagos  │Pend.pag.│ Isentos │    │
│ │    8    │    3    │    1    │   │   │ │    5    │    5    │    2    │    │
│ └─────────┴─────────┴─────────┘   │   │ └─────────┴─────────┴─────────┘    │
└─────────────────────────────────────┘   └───────────────────────────────────┘
```

No cartão de dinheiro em desktop, o conteúdo vira `flex items-center justify-between
gap-6`: bloco de texto (rótulo, valor, "de X esperados") à esquerda, badge de porcentagem +
barra (largura fixa `w-48`) à direita — usa a largura extra em vez de crescer o texto.

---

## Hierarquia visual

| Camada | O que é | Tamanho/peso | Cor |
|---|---|---|---|
| **Headline** | valor de `Arrecadado` | `text-2xl font-bold` | `text-brand-700` (única cor de marca no bloco — é o número que mais importa) |
| **Secundário** | "de X esperados", badge %, rótulos de autorização | `text-sm` / `text-xs font-semibold` | `text-muted-foreground`, tom success/warning/error nos rótulos de autorização |
| **Terciário** | valores de Autorizados/Aguardando/Não autorizados | `text-2xl font-bold text-foreground` | tint de fundo por tom, texto neutro |
| **Quaternário** | grupo Pagamento inteiro (rótulo e valor) | `text-2xl font-semibold text-foreground` (peso 600, não 700) | neutro, sem tint de fundo |

Nota de tamanho: `Autorizados` e `Pagos` têm o valor travado em `text-2xl` pelo contrato de
E2E (ver seção final) — por isso a hierarquia entre os grupos de autorização e pagamento não
vem do tamanho da fonte (igual nos dois), e sim de **peso** (700 vs 600), **cor** (tint vs
neutro) e **posição** (autorização vem antes, pagamento é o último grupo). Deixar os três
tiles de uma mesma fileira com tamanhos diferentes ficaria visualmente quebrado — por isso
`Aguardando` e `Não autorizados` também usam `text-2xl`, mesmo sem exigência de teste.

## Tom por tile (grupo Autorização)

| Tile | `border` | `bg` | cor do rótulo |
|---|---|---|---|
| Autorizados | `border-success-200` | `bg-success-50` | `text-success-700` |
| Aguardando | `border-warning-300` | `bg-warning-50` | `text-warning-700` |
| Não autorizados | `border-error-200` | `bg-error-50` | `text-error-700` |

`Aguardando` usa `border-warning-300` (um tom mais forte que os `-200` dos vizinhos) —
é o número acionável que o professor precisa ver primeiro ("quem falta autorizar"), o único
tom com ênfase própria no grupo.

Grupo Pagamento: todos os três tiles neutros — `border-border bg-gray-50`, rótulo
`text-muted-foreground`. Reforça que, com o cartão de dinheiro já no topo, esse grupo é
detalhe de apoio, não a resposta principal.

Reaproveite o padrão de cor de `src/shared/ui/badge.tsx` (`success: bg-success-50
text-success-700`, `danger: bg-error-50 text-error-700`) — mesmos tokens, mesma lógica,
apenas aplicados a um `div` de tile em vez de um `span` de badge.

---

## Composição de `collected` / `expected` (o núcleo do trabalho)

O bug original era uma única string `${formatCurrency(collected)} de ${formatCurrency(expected)}`
dentro do mesmo `p.text-2xl`. A correção é estrutural, não tipográfica:

```
<div>                                          ← parent compartilhado (contrato de E2E)
  <div class="flex items-center justify-between">
    <p class="text-sm font-medium text-muted-foreground">Arrecadado</p>
    <span class="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
      {porcentagem}%
    </span>
  </div>
  <p class="mt-1 text-2xl font-bold text-brand-700">{formatCurrency(collected)}</p>
  <p class="text-sm text-muted-foreground">de {formatCurrency(expected)} esperados</p>
  <div class="mt-3 h-2 w-full overflow-hidden rounded-full bg-brand-100" aria-hidden="true">
    <div class="h-full rounded-full bg-brand-500" style="width: {porcentagem}%" />
  </div>
</div>
```

- `formatCurrency(collected)` sozinho nunca quebra: o maior valor plausível
  (`R$ 1.234,56`) ainda cabe numa linha em 343px com `text-2xl`.
- `de {formatCurrency(expected)} esperados` é um `<p>` **irmão**, fora do `p.text-2xl` — pode
  quebrar linha à vontade sem afetar o valor nem o teste (que só olha o `p.text-2xl`).
- `porcentagem = Math.round((collected / expected) * 100)`, formatada com `formatPercent`
  (já existe em `src/shared/lib/format.ts` — reaproveitar, não recriar).
- Sem clamp em 100%: o modelo de domínio garante `paid ≤ total - waived`, logo
  `collected ≤ expected` sempre — não vale defender um caso que a regra de negócio já
  impede.
- Barra de progresso é `aria-hidden="true"`: o valor já está por extenso no texto acima,
  anunciar a barra de novo seria redundante para leitor de tela.

### Caso extremo: todos isentos (`expected === 0` com `total > 0`)

Só acontece quando `waived === total` (nesse caso `collected` também é sempre `0`, porque
`paid` e `waived` são status mutuamente exclusivos por aluno). Cartão de dinheiro nesse caso:

```
Arrecadado
R$ 0,00
Todos os alunos estão isentos de pagamento.
```

Sem badge de porcentagem, sem barra (dividir por zero não tem leitura útil). O valor
continua em `p.text-2xl` com "R$ 0,00" — mantém o contrato de E2E (`toContainText("R$")`).

---

## Variante: evento gratuito

Sem cartão de dinheiro, sem grupo Pagamento. A pergunta "dá pra ir" nesse caso é só
autorização — o grupo de autorização sobe para o topo:

```
AUTORIZAÇÃO
┌─────────────┬─────────────┬─────────────┐
│ Autorizados │  Aguardando │Não autoriz. │
│      8      │      3      │      1      │
└─────────────┴─────────────┴─────────────┘
  mt-3

┌ Total de alunos ─────────────────────────┐  ← tile de largura cheia, não entra
│ Total de alunos                      12  │     em nenhum grid — é isso que
└────────────────────────────────────────────┘     elimina o órfão do grid quebrado.
```

O tile "Total de alunos" usa o mesmo padrão rótulo+valor do restante (`label` e
`p.text-2xl` como filhos diretos do mesmo `div`), mas em `flex items-center
justify-between` (rótulo à esquerda, valor à direita, mesma linha) em vez de empilhado —
sozinho numa fileira, empilhado ficaria com muito espaço vazio.

Em ≥1024px o mesmo tile mantém `flex justify-between`, apenas com `max-w-xs` para não
esticar até a borda do card e virar uma barra vazia.

---

## Caso vazio: aula sem alunos matriculados (`total === 0`)

Não renderiza nenhum tile, nenhum cartão de dinheiro — uma parede de zeros não informa
nada. Um único bloco substitui o grupo inteiro:

```
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  border dashed border-border, py-8,
│         Nenhum aluno matriculado          │  text-center, text-sm text-muted-foreground
│   nesta aula ainda. Os indicadores        │
│   aparecem assim que houver alunos.       │
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

Ícone decorativo opcional (`Users`, `lucide-react`, `aria-hidden`) acima do texto — nice-to-have,
não bloqueia a entrega. Essa condição é checada antes de qualquer outra (`free`, isento etc.):
se `total === 0`, é o único conteúdo do bloco.

---

## Tokens, espaçamento, container

- Container do bloco inteiro: `<section aria-label="Indicadores do evento" class="rounded-xl
  border bg-card p-4 shadow-sm md:p-5">` — mesmo tratamento visual do cabeçalho e da lista
  de alunos (`border`, `bg-card`, `shadow-sm`, `rounded-xl`), criando o mesmo ritmo de
  cartões da tela (cabeçalho → indicadores → lista). É essa mudança que resolve os tiles
  "flutuando": eles passam a viver dentro de um cartão real, não soltos em `bg-muted`.
- Espaçamento interno: `gap-4` entre cartão de dinheiro e primeira fileira; `border-t
  pt-4 mt-4` entre fileira de autorização e fileira de pagamento (linha divisória sutil,
  `border-border`).
- Tiles: `gap-2` em 375px, `gap-3` em `sm:`+; padding `p-3` (fileiras de contagem) e `p-4`
  (cartão de dinheiro, por ser o destaque).
- `--radius` (`0.5rem`) em todos os cantos — `rounded-lg` para tiles pequenos, `rounded-xl`
  para o cartão de dinheiro e o container externo, consistente com o resto da tela.
- Cabeçalhos de grupo ("Autorização", "Pagamento"): `<p>` estilizado (`text-xs
  font-semibold uppercase tracking-wide text-muted-foreground`), não um `<h2>`/`<h3>` real —
  é rótulo visual de agrupamento, não landmark de navegação; a página já tem `h1` (título do
  evento) e não precisa de mais níveis de heading aqui.
- Tiles de contagem não são interativos (não têm `onClick`) — a regra de alvo de toque de
  44px não se aplica a eles. Só passa a valer se algum dia virarem filtro clicável.
- Nenhuma cor em hex cru — toda cor citada nesta spec é um token de `@theme` já existente
  (`--color-brand-*`, `--color-success-*`, `--color-warning-*`, `--color-error-*`,
  `--color-gray-*`) ou um alias do shadcn (`bg-card`, `text-muted-foreground`, `border`).

## Componentes

- Reaproveitar o componente `Stat` já existente em `EventDetail.tsx`, estendendo com uma
  prop `tone?: "neutral" | "success" | "warning" | "danger"` que resolve para as classes da
  tabela de tom acima. Não criar um componente novo por tile.
- Cartão de dinheiro é um bloco à parte (não é uma variação do `Stat`) — estrutura própria
  descrita na seção de composição.
- Barra de progresso: `<div>` + `<div>` com `style={{ width: `${porcentagem}%` }}`, tokens de
  `bg-brand-100`/`bg-brand-500`. Não adicionar `progress` do shadcn — é decorativa, estática,
  sem interação nem `aria-valuenow` a expor.
- Nenhum ícone novo nos tiles de contagem (decisão 6, acima).

---

## Contrato de markup para o E2E (`e2e/events/events.spec.ts`)

O teste faz, para `Autorizados`, `Pagos` e `Arrecadado`:

```ts
page.getByText("<Rótulo>", { exact: true }).locator("..").locator("p.text-2xl")
```

Isso exige, para essas três labels: um elemento de texto com exatamente o rótulo, um
**pai direto comum**, e dentro desse mesmo pai um `<p class="text-2xl">` com o valor.
Regras que a implementação deve seguir para não quebrar isso:

1. **Não envolver o rótulo em um `<div>`/wrapper próprio** (ex.: para colocar um ícone do
   lado) — isso troca o pai que o `locator("..")` encontra e o `p.text-2xl` deixa de estar
   dentro dele. Por isso a spec não usa ícone junto do rótulo de nenhum desses três tiles.
2. **`Autorizados` e `Pagos`**: o `p.text-2xl` deve conter **só o número**, sem sufixo nem
   espaço extra além do trim automático — o teste faz `Number(await
   statAutorizados.textContent())` e `Number(...)` em `statPagos`; qualquer texto além do
   dígito quebra o parse.
3. **`Arrecadado`**: o `p.text-2xl` deve conter `formatCurrency(collected)` **sozinho**
   (ex.: `"R$ 25,00"`) — nunca concatenado com "de X esperados". O teste só exige
   `toContainText("R$")` e que o texto mude quando o valor muda; a frase "de X esperados"
   fica em um `<p>` irmão fora do `p.text-2xl`, o que a spec já define acima.
4. Elementos extras dentro do mesmo pai (badge de %, barra de progresso, segunda linha "de X
   esperados") **não quebram** o contrato — o seletor busca um `p.text-2xl` específico
   dentro do pai, ignora os demais filhos.
5. `Aguardando`, `Não autorizados`, `Pendentes de pagamento`, `Isentos`, `Total de alunos`
   não têm locator fixo no E2E hoje — livres para qualquer marcação, desde que o texto do
   rótulo continue visível (testes de "evento gratuito" fazem `getByText` simples, sem
   `exact`, nessas labels).

Nenhuma mudança no arquivo de teste é necessária — a spec foi desenhada para caber dentro do
contrato existente, não para reescrevê-lo.
