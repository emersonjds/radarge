# Linguagem visual do Radarge

Documento normativo. Toda tela do painel segue estas regras — quem implementa não escolhe
tipografia, espaçamento, cor ou container por conta própria. As specs de tela (`docs/specs/*.md`)
decidem **o que** aparece e em que ordem; este documento decide **como** aparece.

## Direção estética

Minimalismo refinado com alta densidade de informação.

O professor usa isto **em pé, entre duas aulas, com uma mão, num celular de 375px**. A
coordenação usa as mesmas telas no desktop para caçar buracos. Ninguém está aqui para admirar.
A qualidade memorável desta interface é **ser mais rápida de ler do que o papel que ela
substitui** — não ser decorada.

Portanto: sem ornamento, sem hero, sem gradiente decorativo, sem ícone que não carrega
informação, sem animação de entrada. Toda escolha se justifica por deixar algo mais rápido de ler
ou mais seguro de tocar. Essa contenção **é** a direção estética, e precisa ser executada com
precisão — contenção mal executada não é minimalismo, é tela inacabada.

## Os sete defeitos que este documento existe para eliminar

Medidos em capturas reais de E2E a 375px e 1280px. Cada seção abaixo cita quais resolve.

| # | Defeito | Evidência no código |
|---|---|---|
| 1 | Informação solta sem agrupamento | `StudentDetail.tsx:191` — `dl.grid-cols-3` com Idade/Responsável/Telefone; o nome do responsável quebra em 3 linhas e o telefone parte no meio |
| 2 | Ausência de dado com o peso de dado | `StudentDetail.tsx:214` — `—` em `text-2xl font-bold`; um travessão gritando como número |
| 3 | Estado vazio fora de proporção | `AcademicPanel.tsx:38-45` — "Sem notas lançadas." ocupa um cartão inteiro |
| 4 | Container que não contém | `StudentDetail.tsx:213` — tiles em `bg-muted` (`#f2f4f7`) sobre `bg-card` (`#ffffff`): 1,08:1 de contraste, não existe limite visível |
| 5 | Densidade que ignora a largura disponível | `ClassOverview` em `md:grid-cols-2` até 1280px, enquanto o bloco de identidade do aluno espreme 3 campos numa coluna estreita |
| 6 | Mobile tratado como desktop estreito | `StudentRow.tsx:38` — `truncate` no nome para caber 4 botões de letra (`h-10 w-10` × 4 + gaps = 178px de 343px) |
| 7 | Lista longa sem limite | `StudentsReportTable` renderiza todos os alunos — 2194px de altura com 21 |

## Pré-requisitos (divergências entre o combinado e o código de hoje)

Três coisas estão fora do lugar e travam a aplicação desta linguagem. Não são tarefa desta spec,
mas nenhuma tela fica correta enquanto existirem:

1. **A fonte não é Outfit.** `src/app/layout.tsx:2,7` carrega `Inter` e `globals.css:8` define
   `--font-sans: Inter, sans-serif`. O combinado (CLAUDE.md §2) é Outfit via `next/font`. Corrigir
   as duas linhas — a família não muda, só passa a ser a que já foi decidida.
2. **`--radius` é `0.625rem`** (`globals.css:165`), não `0.5rem` como diz o CLAUDE.md. Este
   documento assume **`0.5rem`**; ajustar o token.
3. **Existem duas escalas tipográficas em paralelo**: a padrão do Tailwind e os resíduos do
   template (`--text-theme-*`, `--text-title-*`). Esta linguagem usa **só a escala padrão**. Os
   tokens `text-theme-*` e `text-title-*` ficam **depreciados**: não usar em código novo, remover
   conforme cada tela for tocada.

---

## 1. Escala tipográfica

Família única: **Outfit**. Sem segunda família, sem monoespaçada para dados — `tabular-nums` no
Outfit já alinha coluna de número, e uma mono para rótulo pequeno é enfeite de template.

| Papel | Classe | Tamanho / entrelinha | Peso | Onde |
|---|---|---|---|---|
| **Número de destaque** | `text-3xl font-semibold tracking-tight tabular-nums` | 30px / 36px | 600 | O número que responde à pergunta principal da tela. **No máximo um por tela.** |
| **Número secundário** | `text-xl font-semibold tabular-nums` | 20px / 28px | 600 | Valor de tile num grupo comparativo (Presentes / Faltas / Atrasos) |
| **Número em linha** | `text-sm font-medium tabular-nums` | 14px / 20px | 500 | Célula de tabela, valor dentro de par rótulo+valor |
| **Título de página** (`h1`) | `text-xl font-semibold sm:text-2xl` | 20→24px / 28→32px | 600 | Um por rota |
| **Título de cartão** (`h2`) | `text-base font-semibold` | 16px / 24px | 600 | Cabeçalho de cartão |
| **Valor de corpo** | `text-sm font-medium text-foreground` | 14px / 20px | 500 | Nome de pessoa, valor de campo, item de lista |
| **Corpo** | `text-sm text-foreground` | 14px / 20px | 400 | Frase corrida, `max-w-[68ch]` |
| **Rótulo** | `text-xs font-medium text-muted-foreground` | 12px / 16px | 500 | `dt`, `label`, rótulo de tile, cabeçalho de grupo |
| **Legenda / meta** | `text-xs text-muted-foreground` | 12px / 16px | 400 | Data, contagem, texto de ajuda, subtítulo |

### Número versus o rótulo dele — regra explícita

Todo par número+rótulo obedece a três regras simultâneas:

1. **O número fica exatamente um degrau acima do rótulo** na tabela acima, nunca dois.
   `text-3xl` ↔ `text-xs`; `text-xl` ↔ `text-xs`; `text-sm` (célula) ↔ `text-xs` (`th`).
2. **O número é `font-semibold` (600); o rótulo é no máximo `font-medium` (500).** Nada nesta
   interface usa `font-bold` (700) — a hierarquia vem de tamanho + cor, e 700 no Outfit em
   `text-3xl` já pesa demais numa tela operacional.
3. **`tabular-nums` só no número.** Rótulo nunca leva. É o que faz coluna de porcentagem alinhar.

O rótulo vem **acima** do número quando o bloco é vertical (tile, KPI) e **à esquerda** quando é
horizontal (par rótulo+valor numa lista de campos). Nunca os dois padrões na mesma fileira.

> Resolve o defeito 2 (`—` herdando `text-2xl font-bold` porque não havia degrau definido para
> "valor ausente") e o defeito 1 (rótulo e valor sem relação tipográfica declarada).

### Caixa alta

Proibida, com **uma exceção**: o cabeçalho de coluna de tabela (`<th>`), em
`text-xs font-medium uppercase tracking-wide text-muted-foreground`.

Escolha: mantive caixa alta só no `th` porque ela separa a faixa de cabeçalho das linhas de dado
sem custar uma segunda borda, e é convenção de tabela de dados que a coordenação já lê em planilha.
Fora daí — "AULAS" em `StudentDetail.tsx:224`, "ATIVO"/"INATIVO" no `Badge` de
`StudentDetail.tsx:177` — vira **caixa de frase**: "Aulas", "Ativo", "Inativo".

### Linha e alinhamento

- Texto corrido: `max-w-[68ch]`. Nenhuma frase atravessa 1280px inteiros.
- Tudo alinhado à esquerda. Centralizado **apenas** em estado vazio de bloco/página e em célula de
  tabela que ocupa `colSpan` inteiro. Número em coluna de tabela: `text-right`.
- Sem justificado, sem `tracking` customizado além de `tracking-tight` no número de destaque e
  `tracking-wide` no `th`.

---

## 2. Ritmo de espaçamento

Passos permitidos: **1 (4px), 2 (8px), 3 (12px), 4 (16px), 5 (20px), 6 (24px), 8 (32px), 12 (48px)**.
Nenhum outro. Sem valor arbitrário (`p-[13px]`), sem `space-y-7`.

| Relação | Valor | Classe |
|---|---|---|
| Rótulo → seu valor | 4px | `gap-1` (bloco vertical) |
| Ícone → texto ao lado | 8px | `gap-2` |
| Entre dois alvos de toque adjacentes | 8px | `gap-2` (mínimo absoluto — ver §8) |
| Entre campos de um mesmo grupo | 12px | `gap-3` |
| Padding interno de cartão | 16px → 20px | `p-4 md:p-5` |
| Entre grupos dentro de um cartão | 16px + divisória | `mt-4 pt-4 border-t border-border` |
| Entre título de cartão e conteúdo | 16px | `mt-4` |
| Entre cartões | 16px → 24px | `gap-4 md:gap-6` |
| Padding lateral da página | 16px → 24px | `px-4 md:px-6` |
| Cabeçalho da página → primeiro cartão | 24px | `mt-6` |
| Respiro vertical de estado vazio de página | 48px | `py-12` |

Regra de agrupamento (a que resolve o defeito 1): **a distância entre elementos relacionados é
sempre menor que a distância até o grupo vizinho.** Se rótulo e valor estão a 4px e o próximo par
está a 12px, a leitura agrupa sozinha. Um `grid gap-3` uniforme entre três pares rótulo+valor não
agrupa nada — é o que produz "Idade / Responsável / Telefone" flutuando.

Espaçamento vertical dentro de cartão usa `flex flex-col gap-*`, não `margin` em filho — margem
solta é o que cancela entre si quando duas telas empilham o mesmo componente.

> Resolve os defeitos 1 e 4.

---

## 3. Cor com significado

Toda cor sai de `@theme` (`globals.css`). **Nunca hex cru.**

| Papel | Token | O que ganha | O que nunca ganha |
|---|---|---|---|
| **Marca** | `brand-500` / `primary` | Ação primária, link, `ring` de foco, item de navegação ativo, estado selecionado, **e no máximo um número de destaque por tela** | Status de aluno, decoração, fundo de bloco grande |
| **Sucesso** | `success-*` | Presente, situação regular, salvo com sucesso | Qualquer coisa que não seja "está tudo certo" |
| **Aviso** | `warning-*` | Atrasado, aguardando ação, aluno próximo do limite de faltas | Erro real |
| **Erro** | `error-*` / `destructive` | Ausente, aluno em risco, falha de validação, ação destrutiva | Ênfase genérica |
| **Neutro** | `gray-*` / `muted-foreground` | Tudo mais: rótulo, meta, divisória, valor sem carga de status, **justificado** | — |

Receita de tom (a mesma do `Badge`, reaproveitar): fundo `-50`, borda `-200`, texto `-700`.
Preenchimento sólido (`bg-*-500 text-white`) só em botão de status ativo e badge de contagem —
nunca em bloco grande de fundo.

**Justificado usa neutro, não marca.** Hoje é `bg-primary` (`StudentRow.tsx:19`).
Escolha: justificado é uma falta que não pede ação nenhuma, então não pode competir visualmente
com as duas que pedem (ausente, atrasado); e usar a cor de marca para um status faria a única cor
interativa da interface significar duas coisas. Vai para `bg-gray-500 text-white` no estado ativo,
`bg-gray-100 text-gray-700` como tint. A spec da tela de chamada atualiza o E2E junto.

### A regra que impede a cor de ser o único portador

**Todo significado carregado por cor aparece também em texto no mesmo elemento.** Não em `title`,
não em `aria-label` só — em texto visível ou em glifo com rótulo acessível adjacente.

Na chamada, cada botão de status tem a letra (P/A/F/J), o `aria-label` completo e
`aria-pressed` — a cor é o terceiro reforço, não o primeiro. Numa tabela, "Em risco" é a palavra;
o `error-50` é o fundo dela. Se você remover toda a cor da tela em escala de cinza, nenhuma
informação pode sumir. Esse é o teste.

Contraste: texto sobre tint sempre no degrau `-700` (≥4,5:1 sobre o `-50` correspondente). Texto
`muted-foreground` (`gray-500`, 4,6:1 sobre branco) é o cinza mais claro permitido para texto;
`gray-400` é permitido **apenas** para o travessão de ausência (§4), que não é texto informativo.

> Resolve o defeito 4 (tint sem borda) e sustenta o 6 (status legível sem depender de largura).

---

## 4. Ausência de dado

Um tratamento único para toda a aplicação. **"Não existe valor aqui" nunca se parece com um valor.**

```tsx
// src/shared/ui/empty-value.tsx
export function EmptyValue({ label = "sem dados" }: { label?: string }) {
  return (
    <span className="text-sm font-normal text-gray-400 tabular-nums" aria-label={label}>
      —
    </span>
  );
}
```

Regras:

1. **O travessão assume o degrau do rótulo, nunca o do valor.** Onde caberia um
   `text-3xl font-semibold`, entra `text-sm font-normal text-gray-400`. Um travessão de 30px é o
   defeito 2 inteiro.
2. **Zero real é valor, não ausência.** `0%`, `0 faltas`, `R$ 0,00` usam a formatação completa do
   número. Só usa `EmptyValue` quando não há registro para calcular — a distinção entre "compareceu
   a todas" e "nunca teve chamada" é a informação mais cara desta tela.
3. **Bloco cujo único conteúdo é o valor ausente não mostra travessão** — mostra a razão em uma
   frase: o tile "Frequência" sem registro vira `text-sm text-muted-foreground` com
   "Sem chamadas registradas". Travessão é para quando ele convive com irmãos que têm valor
   (célula de tabela, um par rótulo+valor numa lista).
4. `EmptyValue` nunca leva cor de status. Ausência não é erro.
5. Em CSV exportado, ausência é célula vazia, não `—` (`ReportsCenter.tsx:120` exporta o
   travessão; travessão em planilha é texto que contamina soma).

> Resolve o defeito 2, e resolve para o app inteiro em vez de tela a tela.

---

## 5. Anatomia de estado vazio

Três tamanhos. A escolha não é estética: **conte o que está faltando.**

| Falta… | Tamanho | Anatomia |
|---|---|---|
| um valor | **inline** | `EmptyValue` (§4). Sem padding, sem borda, sem ícone, sem frase. |
| o conteúdo de um cartão que já existe e tem irmãos | **bloco** | `py-6 text-center`, uma frase em `text-sm text-muted-foreground`, opcionalmente um link/botão `size="sm"` abaixo com `mt-3`. Sem ícone, sem título (o cartão já tem `h2`), sem borda tracejada. |
| a rota inteira | **página** | `py-12 text-center`: ícone `size-10 text-gray-300` (`aria-hidden`), título `text-base font-semibold text-foreground`, frase `mt-2 text-sm text-muted-foreground max-w-sm mx-auto`, ação primária `mt-6`. |

Regras que valem para os três:

- **Estado vazio nunca cresce para igualar a altura de um irmão.** Nada de `h-full`, `min-h-*`,
  `flex-1`, `items-stretch` num container cujo filho é um estado vazio. É exatamente isso que faz
  "Sem notas lançadas." ocupar um cartão inteiro (defeito 3).
- **Borda tracejada só no tamanho página.** No tamanho bloco ela desenha uma segunda caixa dentro
  de uma caixa que já tem borda.
- **A frase diz o que fazer, não pede desculpa.** "Nenhuma nota lançada nesta aula. Lance a
  primeira em Avaliações." — não "Ainda não há dados disponíveis no momento."
- **Estado de erro usa a mesma anatomia**, trocando a cor da frase para `text-destructive` e
  incluindo sempre uma ação de recuperação ("Tentar de novo"). A `message` da API não vai para a
  tela (CLAUDE.md §6) — o texto é nosso, roteado por `code`.
- **Estado de carregamento não usa esta anatomia**: tabela e lista carregam com `skeleton` na forma
  do conteúdo; todo o resto carrega com uma linha `text-sm text-muted-foreground`. Nunca spinner
  centralizado em cartão.

> Resolve o defeito 3.

---

## 6. Hierarquia de containers

**Duas superfícies, no máximo.** Página (`bg-background`, branco) → cartão (`bg-card` + borda +
sombra). Não existe terceira superfície empilhada.

| Nível | O que é | Classes |
|---|---|---|
| **Cartão** | Uma unidade de conteúdo que faria sentido sozinha noutra tela | `rounded-xl border border-border bg-card p-4 shadow-sm md:p-5` |
| **Grupo simples** | Subdivisão dentro de um cartão | Sem fundo, sem borda. Separado por `mt-4 pt-4 border-t border-border`, ou só por espaçamento + rótulo |
| **Tile de valor** | Um valor num conjunto de **dois ou mais** comparáveis, lado a lado | `rounded-lg border border-border bg-gray-50 p-3` — **borda obrigatória** |
| **Nada** | Cabeçalho de página, título de seção, estado vazio de bloco | Texto direto sobre a superfície pai |

Regras:

- **Cartão nunca dentro de cartão.** Se precisou, o de dentro é grupo simples.
- **Um valor sozinho não é tile.** É par rótulo+valor num grupo simples. Tile existe para
  comparação lado a lado; um tile solitário é uma caixa em volta de nada.
- **`bg-muted` sem borda nunca é container.** `gray-100` (`#f2f4f7`) sobre `bg-card` (`#ffffff`) dá
  1,08:1 — abaixo do limiar em que o olho enxerga um limite. O tile flutua entre os cartões reais
  em vez de pertencer a um. É o defeito 4. Escolha: resolvi com **borda + `gray-50`** em vez de
  escurecer o fundo para `gray-100`, porque a borda define o limite com 100% de confiabilidade e um
  fundo mais escuro derruba o contraste do texto dentro dele.
- `bg-muted` continua válido onde **não** é container: faixa de cabeçalho de tabela, `hover` de
  linha, trilho de barra de progresso.
- Raio: `rounded-xl` (cartão), `rounded-lg` (tile, botão grande, campo), `rounded-md` (botão
  padrão), `rounded-full` (badge, avatar, chip). Nunca `rounded-2xl` ou `rounded-none`.
- Sombra: **só `shadow-sm`, e só em cartão.** Tile, grupo e badge não têm sombra. Sombra é o sinal
  de "isto é um cartão"; se tudo tem, ela não sinaliza nada.

### Densidade e uso da largura (defeito 5)

- O bloco de identidade do aluno é **um grupo simples de pares rótulo+valor empilhados**
  (`flex flex-col gap-3`), não um `grid-cols-3`. Empilhado, o nome do responsável tem 300px+ para
  ele e não quebra em três linhas.
- Grade de conteúdo da página: `grid-cols-1` → `lg:grid-cols-3` (coluna lateral 1 / principal 2).
  Painéis internos que hoje param em `md:grid-cols-2` seguem para `xl:grid-cols-3` quando têm 3+
  blocos comparáveis — a largura de 1280px é para caber mais coluna, não para esticar a mesma.
- Largura máxima do container da página: `max-w-[1440px] mx-auto`. Sem isso, tabela de 7 colunas
  em monitor ultrawide vira linha de 2000px que ninguém rastreia com o olho.

> Resolve os defeitos 4 e 5.

---

## 7. Densidade de tabela e a quebra para mobile

### ≥768px — tabela

| Elemento | Classes |
|---|---|
| Cabeçalho (`th`) | `px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground` sobre `bg-muted` + `border-b border-border` |
| Célula (`td`) | `px-4 py-3 text-sm text-foreground` → linha de ~44px |
| Linha | `border-t border-border hover:bg-muted` |
| Linha clicável | linha inteira é o alvo; o link cobre a célula identificadora |

Reduz de `px-5 py-4` (linha de ~52px) para `px-4 py-3` (~44px): duas linhas a mais por tela sem
perder o alvo de 44px.

Regras de coluna:

- **Coluna 1 é sempre o identificador** (nome da pessoa), flexível, `min-w-[12rem]`, nunca truncada.
- **Coluna numérica**: `w-24 text-right tabular-nums`. Todas as colunas numéricas alinhadas à
  direita — é o que permite comparar magnitude descendo com o olho.
- **Coluna de status**: `w-32`, um `Badge`.
- **Coluna de ação**: `w-14 text-right`, ícone em alvo de 36px (`size-9`) no desktop.
- **Máximo 7 colunas.** A oitava informação mora na tela de detalhe, não numa coluna a mais.
- **Sem `overflow-x-auto` na tabela.** Escolha: coluna fora da tela é coluna que ninguém descobre, e
  o CLAUDE.md proíbe rolagem horizontal de página. Abaixo de 768px a tabela não rola — ela vira
  outra coisa.

### <768px — lista de cartões

A quebra é exatamente em **768px** (`hidden md:table` na tabela, `md:hidden` na lista). Escolha:
768px e não 640px porque a tabela mínima viável aqui tem 5 colunas legíveis; a 640px elas ficam com
menos de 110px cada e o nome volta a truncar (defeito 6).

Anatomia do cartão de linha:

```
┌──────────────────────────────────────────────┐  rounded-xl border bg-card p-4, min-h-16
│ [AV]  Maria Aparecida dos Santos    [Em risco]│  nome: text-sm font-medium, line-clamp-2
│                                                │  badge à direita, shrink-0
│ Nota 8,5 · Frequência 92% · 2 faltas          │  text-xs text-muted-foreground,
└──────────────────────────────────────────────┘  no máximo 3 pares
```

O cartão inteiro é o alvo (`<Link>` cobrindo). No máximo três pares rótulo+valor na segunda linha —
o quarto vai para a tela de detalhe.

### Limite de lista longa: paginação de 20 linhas

Cliente-side, com "Mostrando 1–20 de 84" em `text-xs text-muted-foreground` ao lado dos controles.

Escolha, em uma linha: **paginação** em vez de virtualização (que exige biblioteca e altura de linha
medida, para listas de centenas — não milhares) e em vez de altura travada com rolagem interna
(rolagem aninhada no celular é a pior das três e esconde o total, que aqui é informação — a
coordenação precisa saber que são 84 alunos). Vale igual na tabela ≥768px e na lista de cartões
<768px, com os mesmos controles.

O CSV exporta **todas** as linhas do filtro, não a página atual.

> Resolve os defeitos 5, 6 e 7.

---

## 8. Toque e tamanho de alvo

- **44×44 CSS px mínimo** para qualquer elemento interativo abaixo de 768px. `h-11` no mobile,
  `md:h-9` no desktop, em botão, campo, select e botão de ícone. `Button` hoje é `h-9` em toda
  largura (`button.tsx:22`) — a tela mobile passa `className="h-11 md:h-9"` até o `size` ganhar a
  variante responsiva.
- **8px mínimo entre alvos adjacentes** (`gap-2`). Alvo de 44px com 4px de folga produz toque
  errado, e toque errado numa chamada é uma falta lançada no aluno errado.
- **Campo de formulário com `text-base` (16px) até `md:text-sm`.** Abaixo de 16px o iOS dá zoom e
  desloca a tela. `Input` já faz certo (`input.tsx:11`); o `select` de `ReportsCenter.tsx:29` está
  em `text-sm` fixo — é bug, corrigir para `text-base md:text-sm`.
- **Todo campo tem `<label>` visível.** O `<select>` de data flutuando sem rótulo nem borda
  (defeito 6) não existe nesta linguagem: rótulo em `text-xs font-medium text-muted-foreground`
  acima, campo com `border border-input`, sempre.
- **Alcance do polegar em 375px.** A ação primária da tela mora no terço inferior, em barra fixa:
  `sticky bottom-0 border-t border-border bg-card px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]`.
  O canto superior direito recebe apenas ação secundária ou destrutiva — é a zona mais difícil de
  alcançar com uma mão, e é onde um toque acidental custa mais caro.
- **Área segura**: todo layout de rota respeita `env(safe-area-inset-*)` no rodapé fixo e na barra
  de navegação.
- **Foco visível nunca é removido.** `focus-visible:ring-[3px] focus-visible:ring-ring/50` já é
  padrão nos componentes do `shared/ui`; proibido `outline-none` sem substituto.
- **Sem `hover` como único portador de affordance.** O celular não tem hover; se a única indicação
  de que a linha é clicável é `hover:bg-muted`, ela não é clicável no mobile.

> Resolve o defeito 6.

---

## 9. Política de truncamento

**Nunca truncam** (`whitespace-nowrap` sem `truncate`, ou quebra de linha permitida):

- **Nome de pessoa que identifica uma linha.** Nunca. Esta é a regra mais dura do documento:
  `Aluno Ch...` (defeito 6) torna a linha inutilizável — o nome é a razão da linha existir.
- Valor numérico, porcentagem, nota, moeda.
- Telefone e data: `whitespace-nowrap tabular-nums`. Número partido no meio (defeito 1) é ilegível
  e não é copiável.
- Mensagem de erro e rótulo de status.

**Podem truncar**, sempre com `title` contendo o texto completo:

- Nome de aula/matéria em coluna secundária: `truncate`.
- Descrição longa, observação: `line-clamp-2`.
- Nome no breadcrumb (nunca o último segmento).

### A regra que fecha o caso

**Quando o nome não cabe, quem muda é o layout — não o nome.**

Nome em `line-clamp-2 break-words` (nunca `truncate`), e os controles descem para a linha de baixo
em `flex-col`. Na chamada a 375px isso significa: nome numa linha inteira de 343px, os quatro
botões de status em `grid-cols-4 gap-2` na linha seguinte, cada um com 79px de largura e 44px de
altura — mais legível e mais seguro de tocar do que os `h-10 w-10` de hoje, e sem custar o nome.
O desenho detalhado dessa linha é da spec da tela de chamada; a regra aqui é que o nome é
inegociável.

> Resolve os defeitos 1 e 6.

---

## 10. Lista de "não faça"

Os padrões exatos que produziram os sete defeitos. Se você escrever um destes, você está
reintroduzindo um bug já catalogado.

1. **Não** ponha três ou mais pares rótulo+valor num `grid-cols-*` com gap uniforme. Empilhe.
   *(defeito 1)*
2. **Não** deixe um valor ausente herdar as classes do valor presente. `—` nunca é
   `text-2xl font-bold`. Use `EmptyValue`. *(defeito 2)*
3. **Não** concatene dois dados numa string dentro do mesmo elemento de texto
   (`` `${a} de ${b}` ``). São dois elementos irmãos — é isso que impede a quebra no meio do valor.
   *(defeito 1)*
4. **Não** dê `h-full`, `min-h-*` ou `flex-1` a um container cujo filho é um estado vazio.
   *(defeito 3)*
5. **Não** use `bg-muted` sem borda como container de conteúdo. *(defeito 4)*
6. **Não** aninhe cartão dentro de cartão, nem coloque `shadow-sm` em algo que não é cartão.
   *(defeito 4)*
7. **Não** deixe um layout parar em `md:grid-cols-2` quando há 3+ blocos comparáveis e a tela tem
   1280px. *(defeito 5)*
8. **Não** use `truncate` num nome de pessoa. Nunca, em nenhuma largura. *(defeito 6)*
9. **Não** encolha o conteúdo para caber controles. Mova os controles para outra linha.
   *(defeito 6)*
10. **Não** use `overflow-x-auto` para "resolver" tabela no celular. Abaixo de 768px, tabela vira
    lista de cartões. *(defeito 6)*
11. **Não** renderize uma coleção sem limite. Toda lista tem paginação de 20. *(defeito 7)*
12. **Não** use `<select>` ou `<input>` com `text-sm` no mobile — o iOS dá zoom. *(defeito 6)*
13. **Não** use cor como único portador de significado, e não use a cor de marca para status.
14. **Não** use caixa alta fora do `<th>`, nem `font-bold` (700) em lugar nenhum.
15. **Não** escreva hex cru, nem valor de espaçamento arbitrário (`p-[13px]`), nem
    `text-theme-*` / `text-title-*`.

---

## Componentes do registro shadcn a adicionar

Só o que falta, com a justificativa. Nada inventado à mão que o registro entregue.

| Componente | `pnpm dlx shadcn@latest add …` | Por quê |
|---|---|---|
| `card` | `card` | O padrão `rounded-xl border bg-card p-4 shadow-sm` está copiado em ~10 arquivos. Centralizar é o que faz a §6 ser cumprida por construção, não por disciplina. |
| `pagination` | `pagination` | Requisito da §7. Traz `aria-current` e semântica de navegação prontos. |
| `skeleton` | `skeleton` | Carregamento de tabela e lista (§5). Só para isso. |

**Não** adicionar agora: `progress` (a barra é estática e decorativa — dois `div` resolvem),
`sheet`/`drawer` (nenhuma tela pede), `tooltip` (`title` nativo cobre o caso de truncamento),
`separator` (`border-t` resolve).

`EmptyValue` (§4) é o único componente próprio novo — o registro não tem equivalente, e são seis
linhas. Vai em `src/shared/ui/empty-value.tsx`.

---

## O que fica deliberadamente para as specs de tela

Explicitado para não parecer lacuna:

- **Ordem e escolha de conteúdo**: quais indicadores aparecem, em que sequência, quais colunas a
  tabela tem. Este documento define como um indicador se parece, não qual indicador importa.
- **Layout da linha de chamada a 375px**: a regra aqui é "o nome não trunca" (§9); o arranjo exato
  dos quatro botões é da spec da tela de chamada.
- **Gráficos (ApexCharts)**: tipo de gráfico, eixos, séries e legendas seguem a skill `dataviz`.
  Deste documento herdam apenas a paleta (§3), a escala de rótulo (§1) e o container (§6).
- **Copy**: cada spec de tela escreve seus próprios textos. A regra herdada é tom de frase, voz
  ativa, e a `message` da API nunca chega à tela.
- **Navegação e app shell** (sidebar, header, breadcrumb): fora do escopo desta linguagem, tratados
  em spec própria.
- **Modo escuro**: não existe no v1. Nenhuma classe `dark:` nova.
