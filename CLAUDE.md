# CLAUDE.md — Radarge

Regras de ouro para todo desenvolvimento assistido por IA neste projeto. Leia e siga integralmente antes de qualquer tarefa.

---

## 1. Identidade do Produto

- **Nome**: Radarge
- **Domínio**: sistema de presença e acompanhamento para **ONG de reforço escolar no contra-turno**. Professores marcam presença nas **aulas** (mobile); admins acompanham frequência, absenteísmo e desempenho em dashboards (mobile + desktop).
- **Modelo**: alunos têm uma **ficha** independente (nome, data de nascimento, responsável, telefone) e podem estar matriculados em **múltiplas aulas** simultaneamente (relação N:N). Não há conceito de série/ano escolar — cada aula é uma oficina temática (ex: Reforço de Matemática — Segunda).
- **Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, pnpm. shadcn/ui (Radix + cva) em `src/shared/ui`. TanStack Query, zod, ApexCharts.
- **Tipo**: SPA com static export (`output: "export"`) — sem servidor próprio.
- **Idioma da UI**: português brasileiro em 100% dos textos visíveis.

## 2. Identidade Visual

- Tokens em CSS custom properties no `@theme` de `src/app/globals.css` (Tailwind 4, CSS-first — **não há `tailwind.config`**):
  - `--color-brand-*` (azul `brand-500` = `#465fff`) — cor principal
  - `--color-success-*` (verde — presença), `--color-error-*` (vermelho — falta), `--color-warning-*` (âmbar — alerta)
  - `--color-gray-*` — texto e UI secundária
- Os tokens do shadcn (`--primary`, `--border`, `--ring`…) são **aliases** dessa paleta, num bloco `:root` + `@theme inline`. Nunca hex cru: use o token.
- `--radius` = `0.5rem`. Densidade compacta (botão `h-9`, `text-sm`); em alvo de toque mobile, `h-11`.
- Tipografia: **Outfit** (via `next/font`, exposta como `--font-outfit`)
- Light mode como padrão (único modo do v1)
- Clima: escolar, profissional, direto ao ponto — o professor usa entre uma aula e outra

## 3. Regras de Git — OBRIGATÓRIO

- **Micro-commits atômicos** — uma mudança lógica por commit
- Mensagens em **inglês**, imperativo curto: `add X`, `fix Y`, `translate Z`
- **Proibido mencionar** Claude, Anthropic, IA, agent ou qualquer ferramenta de IA em mensagens de commit, PRs ou comentários
- **Proibido** rodapé `Co-Authored-By: Claude` ou similar
- **O push final é sempre do desenvolvedor humano** — nunca `git push` sem confirmação explícita
- Hooks: `git config --local core.hooksPath .githooks` (uma vez por clone)
- Versionados: `.claude/agents/`, `.claude/skills/`, `.claude/settings.json`, `.mcp.json`. Nunca commitar `.claude/settings.local.json`, `.serena/`, sessões/credenciais de IA

## 4. Qualidade de Código

> **Estas regras são OBRIGATÓRIAS para qualquer pessoa ou agent que escreva código neste projeto** — valem sempre, em toda tarefa e em todo subagent acionado.

- **Comentários: só o extremamente necessário.** Comente apenas o "porquê" não-óbvio de uma **regra** (de negócio, segurança, fuso, armadilha). Proibido comentário que narra/reescreve o que o código já diz. Na dúvida entre comentar e não comentar um trecho óbvio, **não comente**.
- **Legível em ≤10s por qualquer nível** (jr, pleno, sênior). Se exige mais que isso para entender, simplifique — nomes claros, funções pequenas de propósito único, sem esperteza desnecessária.
- **Melhores padrões E simples.** O melhor padrão aqui é o mais simples que resolve bem; padrão sofisticado que dificulta a leitura é o padrão errado. Sem abstração prematura, sem código morto.
- **Performance e escalabilidade sempre no radar.** Evite trabalho desnecessário (re-render, recomputação, query/loop redundante); escolha estruturas/algoritmos que aguentam crescer. Mas sem micro-otimização que prejudique a clareza — meça antes de complicar.
- Prefira editar arquivos existentes a criar novos.
- TypeScript: tipos explícitos em interfaces públicas; **sem `any`** (use `unknown` + narrowing); props sempre com interface nomeada.
- Nomes semânticos — proibido identificadores de uma letra.
- Estilo: **Tailwind utility classes** + componentes shadcn/ui em `src/shared/ui`. Combine classes com `cn()` (`src/shared/lib/utils.ts`), nunca com template literal. Variantes com `cva`, não com `if`. Mobile-first. Nunca hex cru — sempre o token do `@theme`.
- Componente novo de UI genérica: rode `pnpm dlx shadcn@latest add <nome>` (cai em `src/shared/ui` pelo `components.json`). Só escreva do zero se o registro não tiver.

## 5. Arquitetura — Feature-Sliced Design

```
src/
├── app/          ← Next.js App Router. Rotas e layouts. Sem regra de negócio.
├── widgets/      ← UI composta (header, sidebar, painéis de gráfico).
├── features/     ← Casos de uso (fazer-chamada, ver-dashboard, gerir-aulas, gerir-alunos, matricular, auth).
├── entities/     ← Modelos de domínio (perfil, aula/group, aluno, matrícula/enrollment, chamada, presença).
└── shared/       ← Infra reutilizável.
    ├── ui/         ← shadcn/ui + componentes próprios (avatar-text).
    ├── lib/        ← storage (localStorage), utils (cn), format, csv.
    ├── config/     ← navegação por papel.
    ├── providers/  ← TanStack Query.
    └── tailadmin/  ← resíduo do template: só ícones SVG e SidebarContext. Não crescer.
```

**Regra de import**: só importar de **layers abaixo** (`app → widgets → features → entities → shared`). Nunca o contrário, nunca lateral entre slices da mesma layer.

## 6. Dados / API

> **Estado atual: front-only, sem backend.** Não existe cliente Supabase no repo — `@supabase/ssr` não está instalado e não há `supabase/migrations/`. Tudo abaixo de "backend-alvo" é plano, não código.

- Os dados vivem em **localStorage** (`src/shared/lib/storage/`, chave `radarge.db.v2`), com seed de demonstração em `seed.ts`.
- Os fetchers de `entities/*/api.ts` são **assíncronos** e têm assinatura estável — é isso que deixa o Supabase entrar depois como adapter, sem mexer nas features. Mantenha-os assim.
- Login é **por cargo, sem senha** (`features/auth/authenticate.ts` → primeiro perfil ativo do cargo). É demo; trocar por Supabase Auth.
- Analytics hoje é calculado em JS sobre o store (`features/analytics/model.ts`) — temporário.
- **Backend-alvo (ainda não implementado)**: Supabase (Postgres + RLS + RPCs), acessado direto pelo browser com a **publishable key** (a proteção real é a RLS). A `service_role` NUNCA vai para o frontend. Ao migrar: analytics vira view/RPC no Postgres, não recálculo no cliente.

## 7. Segurança

- Nunca commitar secrets/tokens/chaves de API
- RLS é a proteção real: professor só lê/escreve as próprias turmas (`professor_id = auth.uid()`); admin lê e gere tudo
- Coluna `papel` em `perfis` nunca gravável por `authenticated` (evita autopromoção a admin)
- Dados de aluno são PII (frequentemente menor de idade) — nunca logar nome/matrícula completos, mascarar em telemetria
- Validar status de presença e unicidade de chamada no servidor (constraints), nunca confiar só no cliente

## 8. Review (antes de concluir)

- [ ] `pnpm type-check` sem erros
- [ ] Textos da UI em PT-BR
- [ ] Responsivo (375px, 768px, 1280px) — mobile-first para o professor, desktop+mobile para o admin
- [ ] Sem `console.log` / código de debug
- [ ] Imports não usados removidos

### Testes obrigatórios por implementação (SDD)

Toda feature/implementação que passa pelo fluxo SDD **deve** ter as três camadas — e o E2E vale mais que os mocks (já pega bug de regra de servidor que os unit não pegam):

1. **Unitário** — lógica pura (libs, derivações, regras).
2. **Integração com MSW** — fetchers/queries contra o Supabase mockado (`src/test/msw/`).
3. **E2E de tela (Playwright)** — fluxo real no browser, **com prints de evidência em PNG**. As evidências ficam em `e2e/<feature>/evidencias/*.png` (gere rodando o spec; não invente prints).

## 9. Agentes disponíveis

Especialistas de domínio: `arq` (arquitetura FSD + Supabase), `back` (schema/RLS/RPCs de presença e analytics), `front` (frontend, performance e segurança client-side), `pixel` (UX/UI: chamada mobile do professor, dashboard responsivo do admin), `redteam` (segurança ofensiva e threat modeling da RLS).
Execução e qualidade: `bug` (QA/quality gate de código), `qa` (E2E em tela com Playwright), `scribe` (i18n PT-BR, docs).

Regra: **um agent por função, sem duplicação**.

## 10. Domínio: Radarge (ONG de Reforço Escolar)

- **Perfil**: usuário do sistema, com papel `teacher` (Professor), `coordinator` (Coordenador) ou `admin` (Administrador). A navegação por papel vive em `shared/config/navigation.ts`.
- **Aula** (entidade `Group`): oficina temática com um professor regente (ex: Reforço de Matemática — Segunda). Atributos: nome, turno (manhã/tarde/noite). **Não há série/ano** — cada aula é independente.
- **Aluno**: ficha cadastral do estudante. Atributos: nome, data de nascimento, responsável, telefone do responsável, ativo/inativo. **Não tem matrícula (enrollment number) nem vínculo fixo a uma aula** — a relação é N:N via `Enrollment`.
- **Matrícula** (entidade `Enrollment`): vínculo entre um aluno e uma aula. Um aluno pode estar matriculado em várias aulas; uma aula tem vários alunos. Atributos: `studentId`, `groupId`, `joinedAt`, `active` (soft delete).
- **Chamada** (entidade `AttendanceSession`): registro de uma sessão de aula realizada — única por `(aula, data)`.
- **Presença** (entidade `AttendanceRecord`): status de um aluno numa chamada — `presente`, `ausente`, `atrasado` ou `justificado`; única por `(chamada, aluno)`.
- **Avaliação**: prova/trabalho de uma aula (nome, data, peso 1–3) — única por `(aula, matéria, nome, data)`.
- **Nota** (entidade `EvaluationGrade`): valor 0–10 (uma casa) de um aluno numa avaliação — única por `(avaliação, aluno)`; `null` = pendente. Média do aluno é ponderada pelo peso.
- **Frequência**: percentual de presença de um aluno (global ou por aula), agregado no servidor.
- **Absenteísmo**: tendência/série temporal de faltas ao longo do tempo.
- **Aluno em risco**: aluno com faltas acima de um limite (indicador de risco de evasão).

**Observação**: no código, a entidade ainda se chama `Group` (por legado e para evitar refactor massivo), mas na UI e na documentação de produto sempre se refere como **"aula"**. O modelo de dados agora reflete um contexto de ONG de reforço no contra-turno, não uma escola tradicional com turmas seriadas.
