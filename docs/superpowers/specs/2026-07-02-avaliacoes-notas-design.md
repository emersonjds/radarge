# Radarge — Avaliações & Notas · Design (spec)

Data: 2026-07-02 · Status: aprovado pelo usuário

## 1. Contexto

Radarge (presença escolar, duas personas) ganha o domínio acadêmico de
**avaliações** (provas/trabalhos) e **notas** por aluno. Hoje o relatório do
aluno exibe uma tabela mock "Desempenho por atividade"; esta feature a torna
real. Stack e padrões inalterados: FSD, dados em `localStorage` atrás de
fetchers async validados com Zod, hooks TanStack Query, CSS Modules + tokens,
pt-BR.

## 2. Decisões travadas com o usuário

- **Escopo**: avaliações + notas (SEM motor de questões/quiz).
- **Fluxo**: nova tela **`/avaliacoes`** no menu do professor — cria avaliação
  por turma e lança as notas de todos os alunos (estilo Chamada). Coordenação
  consome no relatório do aluno.
- Defaults assumidos: nota **0–10 com uma casa decimal**; **média ponderada**
  pelo peso da avaliação; nota pendente (`null`) fica fora da média.

## 3. Domínio

### Entities novas (`src/entities/`)

**`avaliacao`** — `{ id, turmaId, nome, data (YYYY-MM-DD), peso (1..3 int),
professorId }`. Única por id determinístico
`avaliacao-<turmaId>-<slug(nome)>-<data>`; criar duas vezes a mesma (turma,
nome, data) não duplica (mesmo padrão da chamada).

**`nota`** — `{ id, avaliacaoId, alunoId, valor (number 0..10 múltiplo de 0.1
| null) }`. Única por `(avaliacaoId, alunoId)`, upsert (mesmo padrão da
presença). Id determinístico `nota-<avaliacaoId>-<alunoId>`.

Cada entity segue o trio `model.ts` (zod) / `api.ts` (fetchers async sobre o
store) / `queries.ts` (hooks TanStack com query-key factory e invalidação).

### Storage

- `Collection` ganha `"avaliacoes"` e `"notas"`; seed ganha 2 avaliações por
  turma com notas para a maioria dos alunos (determinístico, alguns pendentes).
- **Migração leve**: `readCollection` retorna `[]` quando a coleção não existe
  no blob salvo (usuários com `radarge.db.v1` antigo não quebram nem precisam de
  reseed).

### Analytics (`features/analytics/model.ts`)

`mediaPonderada(notas: Nota[], avaliacoes: Avaliacao[]): number | null` —
média ponderada pelo `peso`; ignora notas `null`; retorna `null` sem notas
lançadas. Arredonda a 1 casa.

## 4. Personas / UI

### Professor — rota `/avaliacoes` (nova)

- Item "Avaliações" no `navProfessor` (ícone novo `nota` no design system).
- Guarda `useExigirPapel(["professor"])`.
- Tela (`features/lancar-notas/` + página): seletor de turma (padrão primeira),
  lista das avaliações da turma (nome, data, peso, status: N notas lançadas /
  pendentes), botão "Nova avaliação" (formulário inline: nome, data, peso) e,
  ao selecionar uma avaliação, a grade de lançamento: uma linha por aluno
  (Avatar + nome + matrícula) com input numérico 0–10; "Salvar notas" faz
  upsert em lote; feedback de sucesso/erro como na Chamada. Prefill das notas
  existentes.

### Coordenação — relatório do aluno real

- Em `DetalheAluno`, a tabela mock "Desempenho por atividade" passa a listar as
  avaliações da turma do aluno com a nota dele: colunas Avaliação · Data · Peso
  · Nota · Status (Badge: "Lançada" / "Pendente"). Sem coluna de ação (nada de
  quiz/detalhe).
- Card de perfil ganha o mini-stat "Média" (`mediaPonderada`), ao lado de
  Frequência e Faltas; "—" quando null.

## 5. Testes (SDD, 3 camadas)

- **Unit**: `mediaPonderada` (ponderação, pendentes, vazio), zod da nota
  (0..10, uma casa), idempotência de `criarAvaliacao`, upsert de
  `definirNota`.
- **Integração**: hooks `useAvaliacoesPorTurma` + fluxo lançar notas
  (`criarAvaliacao` → `definirNota` ×2 → `useNotasPorAvaliacao` reflete,
  upsert não duplica) via `renderHookComQuery`.
- **E2E (Playwright + evidência PNG)**: professor abre `/avaliacoes`, cria
  avaliação, lança notas, salva → evidência; troca para coordenação → relatório
  do aluno mostra a avaliação e a média → evidência. Guarda: admin em
  `/avaliacoes` redireciona.

## 6. Fora de escopo

Motor de questões/quiz, regras de aprovação/recuperação, boletim/PDF, edição e
exclusão de avaliações (criar + lançar cobre o essencial; editar vem depois se
doer), pesos fracionários.

## 7. Critérios de aceite

- Professor cria avaliação e lança notas de toda a turma; reabrir mostra
  prefill; salvar duas vezes não duplica.
- Relatório do aluno (coordenação) mostra avaliações reais, nota por avaliação
  e média ponderada.
- 3 camadas de teste verdes; `type-check`, `lint`, `test`, `build`, `test:e2e`
  verdes; micro-commits sem traço de LLM; merge na master.
