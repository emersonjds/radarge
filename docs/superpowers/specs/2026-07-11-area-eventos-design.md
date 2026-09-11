# Área de Eventos (SPA-16) — design

**Data**: 11/07/2026
**Status**: aprovado (decisões travadas com o Emerson)

## 1. Problema

A ONG faz passeios e atividades fora da rotina (zoológico, planetário, cinema, feira de ciências). Hoje isso vive em papel e grupo de WhatsApp: a coordenação não sabe quem autorizou, quem pagou e quem ainda não respondeu — e no dia do passeio a lista de embarque é feita de memória.

O Radarge precisa de uma **Área de Eventos**: criar um evento vinculado a uma aula, controlar **autorização do responsável** e **pagamento** aluno a aluno, e **avisar os responsáveis** com a mensagem já pronta.

## 2. User stories

**US-1 — Criar evento (coordenação/admin)**
Como coordenadora, quero criar um evento para uma aula (título, data, local, valor por aluno) para organizar o passeio com antecedência.
_Aceite_: evento aparece na lista da aula; valor 0 significa gratuito; não é possível criar dois eventos com o mesmo título e data na mesma aula.

**US-2 — Ver os eventos da minha aula (professor)**
Como professor, quero ver só os eventos das aulas que eu leciono, porque é com essas famílias que eu falo.
_Aceite_: professor não vê evento de aula de colega; coordenador e admin veem todos.

**US-3 — Registrar autorização do responsável**
Como professor, quero marcar se o responsável autorizou, negou ou ainda não respondeu, para saber quem pode ir.
_Aceite_: todo aluno matriculado na aula começa como **pendente**; só quem está **autorizado** entra na lista de embarque.

**US-4 — Registrar pagamento**
Como professor/coordenação, quero marcar se o aluno pagou, está pendente ou é isento (bolsa), para fechar a arrecadação.
_Aceite_: painel mostra arrecadado, esperado e quantos faltam pagar; isento não conta no esperado; evento gratuito não mostra pagamento.

**US-5 — Avisar o responsável pelo WhatsApp**
Como professor, quero abrir o WhatsApp do responsável com a mensagem do evento já escrita, para não redigitar o mesmo texto 20 vezes.
_Aceite_: um clique abre a conversa com nome do aluno, evento, data, local e valor; também dá para copiar o texto.

**US-6 — Lista de embarque**
Como professor, quero ver quem está autorizado e pago no dia do passeio, para conferir o embarque.
_Aceite_: contadores de autorizados/pendentes/negados e de pagos/pendentes visíveis no topo do evento.

## 3. Decisões (travadas)

| Tema | Decisão | Por quê |
|---|---|---|
| Pagamento | Custo único por aluno no evento + status por aluno (`pending`/`paid`/`waived`) | Cobre bolsa/isenção, que é realidade de ONG, e responde "quem falta pagar". Contribuição livre não responde isso. |
| Autorização | Status por aluno (`pending`/`authorized`/`denied`) | Distingue "não respondeu" de "não deixou ir" — é a diferença que gera a cobrança. |
| Papéis | Admin e coordenador criam/editam/excluem; professor lê os eventos das aulas dele e marca autorização/pagamento | Segue o escopo por papel que já existe (`visibleGroups`). Quem fala com a família é o professor. |
| Avisos | Link `wa.me` pré-preenchido + copiar texto | Zero backend, zero dependência. Vira o template da Cloud API quando o Supabase entrar (ver `docs/whatsapp-notificacoes.html`). |

## 4. Modelo de dados

**Não reutilizar `school-event`** — aquilo é o calendário acadêmico (férias/reposição/feriado) que colore o calendário de presença do aluno. Não tem aula, nem custo, nem aluno. São conceitos diferentes.

```ts
// entities/event  — Evento
{ id, groupId, title, date: "YYYY-MM-DD", location, cost /* reais, >= 0 */ }

// entities/event-participation — Participação (única por evento+aluno)
{ id, eventId, studentId,
  authorization: "pending" | "authorized" | "denied",
  payment: "pending" | "paid" | "waived" }
```

Participação é **upsert sob demanda**, igual a `evaluation-grade`: a lista de alunos do evento vem das matrículas ativas da aula; a linha só nasce quando alguém muda um status. Ausência de linha = `pending`/`pending`. Isso evita escrever N linhas na criação do evento e mantém o evento correto quando um aluno se matricula depois.

Cascata: excluir evento apaga suas participações.

Coleções novas no `db.ts`: `events`, `eventParticipations` (bump da chave `radar.db.v9` → `v10`).

## 5. Derivações (JS puro, testável)

`features/events/summary.ts`:

- `authorized/pending/denied` — contagem por status de autorização
- `paid/pendingPayment/waived` — contagem por status de pagamento
- `collected` = `paid × cost` — arrecadado
- `expected` = `(total − waived) × cost` — esperado (isento não é esperado)

`features/events/notice.ts`:

- `buildEventNotice(event, group, student)` → texto do aviso em PT-BR
- `whatsappLink(phone, message)` → `https://wa.me/55DDDNUMERO?text=...`, normalizando `(11) 98812-4477` → `5511988124477`

## 6. UI

Rota `/events`, item **Eventos** na navegação dos três papéis.

- **Lista**: eventos agrupados por aula (só as aulas visíveis ao papel), com data, local, valor e contadores. Botão **Novo evento** só para admin/coordenador.
- **Detalhe do evento**: cabeçalho com resumo (autorizações, pagamentos, arrecadado/esperado) + tabela de alunos matriculados com dois selects (autorização, pagamento) e o botão de WhatsApp por aluno. Evento gratuito esconde a coluna de pagamento.
- Mobile-first (o professor usa no celular), PT-BR, tokens do `@theme`.

## 7. Fora de escopo (v1)

- Envio automático de mensagem (depende do backend — ver doc de WhatsApp)
- Anexo de termo de autorização assinado (não há storage)
- Prazo de resposta / lembrete automático
- Pagamento parcelado ou valor livre por aluno
