# Ficha do aluno (clique do professor) — Design

**Data**: 2026-07-02
**Status**: aprovado

## Problema

O professor não tem como abrir os dados de um aluno a partir da lista: hoje a
coluna de ação com "Ver relatório" só aparece para o admin (`!isProfessor` em
`ListaAlunos.tsx`). Além disso, o modelo `Aluno` não guarda idade nem nada sobre
reforço. O professor precisa, ao clicar num aluno, ver uma ficha rápida com
nome, idade, turma, resumo de frequência e os dados de reforço — e poder editar
o reforço.

## Escopo

Ficha rápida em **drawer lateral** aberta ao clicar no aluno (persona professor),
com dados de reforço **editáveis** e persistidos no localStorage.

**Fora de escopo** (follow-up): substituir os campos chumbados do
`DetalheAluno` (`/relatorios/[alunoId]` — "Sala 12", "Ano letivo") e exibir idade
naquela página.

## Modelo de dados

`entities/aluno/model.ts` — novos campos no `alunoSchema`:

- `dataNascimento: string` — ISO `YYYY-MM-DD`. **Idade é sempre derivada desta
  data, nunca armazenada** — idade muda sozinha com o tempo, a data não.
- `reforco: Reforco | null` — `null` significa "não está em reforço"; a presença
  do objeto já codifica o "sim/não", evitando um booleano redundante.

```ts
interface Reforco {
  materias: string[]; // subconjunto de MATERIAS_REFORCO
  horario: string | null; // texto livre curto, ex.: "Terça, 14h"
  observacao: string | null; // anotação livre do professor
}
```

Constante `MATERIAS_REFORCO` (lista fixa pequena: Matemática, Português,
Ciências, História, Geografia, Física) para alimentar os checkboxes do form.

### Seed (`shared/lib/storage/seed.ts`)

- Gera `dataNascimento` determinístico por índice do aluno (idades ~14–17, sem
  randomness — recarregar dá sempre o mesmo dado).
- Coloca alguns alunos em reforço para dado de demonstração: os alunos "em risco"
  (`EM_RISCO`) recebem `reforco` com Matemática + observação; os demais ficam
  `null`.
- **Bump da chave** `radarge.db.v2` → `radarge.db.v3` (o shape do seed mudou; blobs
  antigos são descartados no primeiro load, como já é feito com a legacy key).

### Derivação de idade (`shared/lib/format.ts`)

`calcularIdade(dataNascimento: string): number` — função pura que compara com a
data atual considerando mês/dia (aniversário ainda não ocorrido no ano conta um
ano a menos).

## Persistência

`entities/aluno/api.ts`:

- `atualizarReforcoAluno(alunoId: string, reforco: Reforco | null): Promise<Aluno>`
  — usa `mutateCollection("alunos", ...)` para dar upsert do campo `reforco` no
  aluno alvo, revalidando pelo `alunoSchema`.

`entities/aluno/queries.ts`:

- `useAtualizarReforco()` — `useMutation` que chama `atualizarReforcoAluno` e no
  sucesso invalida `alunoKeys.all` e `alunoKeys.porId(id)`.

## UI

Nova feature `features/ficha-aluno/`.

### `FichaAluno.tsx` (drawer)

- Props: `{ alunoId: string; onClose: () => void }`.
- Overlay lateral simples (CSS module, mobile-first, sem lib de modal): backdrop
  clicável + painel deslizante à direita. Fecha por backdrop, botão X e Esc.
- Conteúdo:
  - Cabeçalho: `Avatar` + nome; abaixo `idade anos · turma · matrícula`.
  - Resumo: frequência, faltas e média — reusa `usePresencasPorAluno`,
    `useNotasPorAluno`, `useAvaliacoesPorTurma` e as funções de
    `features/analytics/model` (`taxaFrequencia`, `contarFaltas`,
    `mediaPonderada`), como o `DetalheAluno` já faz.
  - Bloco reforço editável: toggle "Em reforço" → quando ligado exibe checkboxes
    de `MATERIAS_REFORCO`, input de horário e textarea de observação. Estado de
    edição local; botão **Salvar** chama `useAtualizarReforco`. Desligar o toggle
    salva `reforco: null`.
  - Rodapé: link "Ver relatório completo" → `/relatorios/[alunoId]`.

### `ListaAlunos.tsx`

- Para a persona **professor**, a linha do aluno fica clicável (cursor/hover,
  `role="button"` + teclado) e abre a ficha; estado local
  `alunoSelecionado: string | null` controla o drawer.
- Admin permanece com a coluna "Ver relatório" atual, sem mudança de comportamento.

## Testes (três camadas obrigatórias)

1. **Unit** (`shared/lib/format.test.ts` + model): `calcularIdade` com
   aniversário antes e depois da data atual no ano; presença/ausência de
   `reforco` refletindo o "em reforço".
2. **Integração** (`features/ficha-aluno/*.integration.test.tsx`):
   `useAtualizarReforco` grava o reforço e a query do aluno reflete o novo valor;
   desligar salva `null`. Padrão `renderHookComQuery` + `resetDb`.
3. **E2E Playwright** (`e2e/ficha-aluno/`): professor abre a lista → clica no
   aluno → ficha abre → edita reforço (liga, marca matéria, escreve observação) →
   salva → fecha e reabre, dado persiste. Prints de evidência em
   `e2e/ficha-aluno/evidencias/*.png` (gerados rodando o spec).

## Verificação final

- `npm run type-check` sem erros; `npx vitest run` verde; E2E com evidências.
- Textos em PT-BR; responsivo (375/768/1280); sem `console.log`; imports limpos.
