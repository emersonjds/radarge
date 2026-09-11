# Pivô Radarge: de "presença escolar" para "gestão de reforço em ONG"

> Documento de análise (charter). Precede spec formal e plano de implementação.
> **Status:** aguardando validação das decisões-chave marcadas com ❓.

## 1. Por que estamos mudando

O Radarge foi desenhado com hipóteses de escola tradicional: turmas rígidas (série, turno,
regente), alunos ligados 1:1 a uma turma-mãe, matrícula por aluno, matérias fechadas em áreas
canônicas. Na prática o produto vai atender uma **ONG de reforço escolar** no contra-turno,
onde:

- **Não existe ano letivo com aprovação/reprovação.** Notas de prova/trabalho servem para
  acompanhar progresso e sinalizar quem precisa de mais atenção, não para promoção.
- **Não existe turma-mãe.** Um aluno pode participar de uma ou várias oficinas/aulas de reforço
  (matemática, redação, inglês…), com composições diferentes de colegas em cada uma.
- **A ONG cadastra livremente matérias e professores.** Um mesmo professor pode conduzir
  matérias diferentes; não é preciso "área de especialização" travando nada.
- **O cadastro do aluno é uma ficha da pessoa** (com responsável), não um registro escolar.
  A associação a uma aula/matéria é um passo posterior, feito quando faz sentido.

Consequência: o modelo atual (`Group` rígido, `Student.groupId` obrigatório, `enrollment`,
`gradeLevel`) precisa ser reformado. As mecânicas de chamada, avaliações e analytics podem
ser preservadas — mudam os "recipientes" (o que é uma turma, o que é um aluno), não a
mecânica.

## 2. O que muda no domínio

### 2.1 Aluno — vira ficha de pessoa

**Hoje:** `{ id, name, enrollment, groupId, active }`

**Proposto:**

```
Student {
  id,
  name,
  birthDate,        // ISO date; idade é derivada, não persistida
  guardianName,     // nome do responsável
  guardianPhone,    // telefone do responsável, formato BR
  notes?,           // observações livres do admin (opcional)
  active
}
```

Sai `enrollment` (matrícula não tem significado numa ONG). Sai `groupId` (aluno não pertence
a uma turma; ele participa de aulas). Entra o bloco de responsável.

**Idade x data de nascimento:** guardamos **data de nascimento** e exibimos a idade
calculada. Se guardarmos "idade" como número, ela envelhece errado no ano seguinte.

### 2.2 Turma — vira "aula/oficina de reforço"

**Hoje:** `Group { id, name, gradeLevel, shift, teacherId }` + `Assignment { groupId,
subjectId, teacherId }`

O modelo escolar assume que uma turma é uma sala de várias matérias com um regente. Numa
ONG, "turma" é mais próximo de **uma aula específica** — "Reforço de Matemática — terça 14h,
prof. Ricardo". A gente tem duas opções, com trade-offs bem diferentes:

**Opção A (mínima) — mantém `Group`, muda a semântica:**

- `Group` continua sendo o "container" de alunos + chamada + avaliações.
- Remove `gradeLevel`. Torna `shift` opcional (ou renomeia pra `schedule` livre: "terça 14h").
- Mantém o `assignment` (turma × matéria × professor) como está.
- Renomeia o rótulo "Turma" na UI para **"Aula"** (ou "Oficina" / "Grupo de reforço").

**Opção B (radical) — colapsa `Group` em `Class`:**

- Elimina `Group`; cria `Class { id, subjectId, teacherId, schedule }` (a matéria e o
  professor viram dado direto da classe).
- `Assignment` some (o vínculo já mora na `Class`).
- Migra `AttendanceSession`, `Evaluation` etc. de `groupId` para `classId`.

Ganho da B: modelo mais fiel ao real. Custo: refatoração enorme, atinge quase todos os
entities e widgets do repo.

### 2.3 Aluno ↔ Turma — precisa ser N:N

Independente da opção acima, o aluno passa a poder participar de várias aulas. Precisamos
de uma tabela de matrícula:

```
Enrollment {
  id,
  studentId,
  groupId,           // ou classId, dependendo da opção
  joinedAt,          // data de entrada
  active             // permite arquivar sem apagar histórico
}
```

Impacto direto:

- `fetchStudentsByGroup(groupId)` passa a ser um JOIN via `enrollments` (não `students.groupId`).
- Fluxo de "adicionar aluno" não pede mais turma — é ficha limpa.
- Novo fluxo "matricular aluno numa aula" (admin escolhe aluno + aula), e "gerir alunos da
  aula" (dentro da aula, admin/professor adiciona/remove alunos).

### 2.4 Chamada, avaliações, analytics

- **Chamada**: continua por `(group, date)`. Muda só a semântica ("aula do dia" em vez de
  "chamada da turma"). Os alunos elegíveis vêm do `enrollment`, não de `students.groupId`.
- **Avaliações e notas**: intactas. Continuam por lecionamento (`group × subject`) ou
  simplesmente por `class` na Opção B.
- **Analytics**: frequência e derivação de nota por matéria seguem funcionando. Some o conceito
  de "aluno em risco = alunos da turma X com Y+ faltas"; passa a ser "aluno em risco = aluno
  com Y+ faltas somando todas as aulas em que está matriculado".

## 3. O que **não** muda

- Papéis: `admin`, `teacher`, `coordinator`. Cadastro de professores pelo admin.
- Matérias já são maleáveis (CRUD existe). Só vou revisar as **áreas** para não soarem
  presunçosas ("exatas"/"humanas" pode ficar, ou trocar por rótulos mais neutros — decisão
  ❓4 abaixo).
- Fluxo de chamada em si (grade, botões de estado, submissão idempotente).
- Módulo de avaliações e notas (recém entregue).
- Static export + localStorage temporário; Supabase entra depois como adapter.

## 4. Impacto por camada (alto nível, para dimensionar)

| Camada                                      | Arquivos-chave impactados                                            | Tamanho |
| ------------------------------------------- | -------------------------------------------------------------------- | ------- |
| `entities/student`                          | model, api, api.test, queries                                        | médio   |
| `entities/group`                            | model (remove gradeLevel), widgets admin                             | pequeno |
| `entities/enrollment` (novo)                | model, api, api.test, queries                                        | médio   |
| `entities/student` fetchers                 | `fetchStudentsByGroup` migra pra JOIN                                | pequeno |
| `widgets/student-list` + `StudentFormModal` | novo formulário; coluna "Turma" some ou vira "Aulas"                 | médio   |
| `widgets/groups-admin`                      | painel de "Alunos da aula" (add/remove)                              | médio   |
| `widgets/student-detail` / `reports`        | passa a mostrar N aulas em vez de 1 turma                            | médio   |
| Chamada (`take-attendance`)                 | fonte de alunos passa a ser enrollment                               | pequeno |
| Seed + bump `radarge.db.v8`                   | nova coleção `enrollments`, novo shape de student, remove gradeLevel | pequeno |
| Copy PT-BR + `CLAUDE.md`                    | reflete identidade ONG                                               | pequeno |
| E2E                                         | ajustar specs que confiam em "turma X do aluno Y"                    | pequeno |

Nada disso é grande sozinho, mas o encadeamento é substancial. Vamos por fases.

## 5. Roadmap sugerido (3 fases)

**Fase A — Ficha do aluno (independente da alocação).**

- Novos campos no `Student` (birthDate, guardian). Remove `enrollment` e `groupId`
  (compatibilidade: durante a migração, o groupId antigo vira o primeiro `Enrollment`).
- Novo `StudentFormModal` (sem "Turma"). Nova coluna "Idade" / "Responsável" na lista.
- Bump `radarge.db.v8` + migração do seed.
- Cobertura: unit dos schemas + integração dos writers + E2E do fluxo "admin cadastra aluno".

**Fase B — Matrícula N:N.**

- Nova entity `enrollment`. `fetchStudentsByGroup` passa pelo enrollment.
- Fluxo dentro da aula: "adicionar/remover alunos desta aula" (admin).
- `student-detail` lista todas as aulas do aluno.
- Cobertura: unit + integração da entity, E2E "admin matricula um aluno em duas aulas".

**Fase C — Reidentificação: ONG de reforço.**

- Copy PT-BR: "Turmas" → "Aulas" (ou "Oficinas", ver ❓2). Remove "série". Ajusta hero/subtítulos.
- `CLAUDE.md` reescrito para refletir ONG.
- Ajustes de área de matéria se aprovar ❓4.
- Cobertura: nenhum código novo, mas snapshots/E2E precisam do texto novo.

Cada fase é um branch a partir de `developer`, sob SDD (spec → plan → tarefas com testes).

## 6. Decisões que preciso de você para travar antes da spec formal

- **❓1 — Turma:** vou de **Opção A** (renomear semanticamente, manter `Group`) por baixo
  custo e sem regressão. Confirma?
- **❓2 — Rótulo na UI:** "Aula", "Oficina" ou "Grupo de reforço"? (Recomendo **"Aula"** —
  mais curto, casa com "fazer chamada da aula".)
- **❓3 — Aluno independente:** confirmo remoção de `enrollment` (matrícula) e do campo
  obrigatório `groupId` do aluno; alocação passa a viver na nova tabela `enrollment`.
  Guarda-se `birthDate` (não idade em número). OK?
- **❓4 — Áreas de matéria:** hoje temos "exatas / biológicas / linguagens / humanas". Mantenho
  ou removo (áreas somem, matéria é só nome)? Isso afeta o widget "Aptidão por área" no
  relatório. Minha recomendação: **manter** por enquanto — o admin já cria matéria com área,
  e o dashboard usa isso. Mexemos depois se atrapalhar.
- **❓5 — "Série" (`gradeLevel`) no group:** remove de vez ou vira campo livre opcional?
  Recomendo **remover** — combina com "sem promoção".
- **❓6 — Turno (`shift`):** hoje é enum {manhã, tarde, noite}. Reforço geralmente é à
  tarde, mas horários variam. Duas opções: (a) mantenho enum com "tarde" default; (b) troco
  por um campo livre `schedule` ("terça e quinta 14h–15h30"). Recomendo **(a) por agora**,
  e (b) numa fase futura se atrapalhar.
- **❓7 — Responsável:** um responsável por aluno é suficiente pro MVP, ou já precisa
  aceitar 2+ (mãe/pai/outro)? Recomendo **um agora**; N depois se surgir demanda.

## 7. Fora de escopo (por enquanto)

- Pagamentos/mensalidade/bolsa.
- Portal do responsável (login separado).
- Relatórios PDF/impressão.
- Migração Supabase (segue de pé como adapter futuro; nada muda aqui).
- Múltiplos endereços/contatos por aluno.

---

**Próximo passo se você fechar as 7 decisões acima:** eu escrevo a **spec formal** e o
**plano SDD** da Fase A (ficha do aluno), abro o branch a partir de `developer` e sigo o
loop TDD tarefa a tarefa. Fase B e C entram em branches separados depois.
