# Sessão real contra a radarge-api — plano

Linear: SPA-284. Branch `feature/spa-284-real-session`, cortada de `developer`.

**Meta:** o painel deixa de entrar por seleção de cargo sem senha e passa a autenticar de verdade, com o token vivendo só em memória.

## O que existe hoje

`src/features/session/session-store.ts` guarda o id do perfil como string crua em `localStorage`, sob a chave `radarge.session`. `src/features/auth/authenticate.ts` diz em comentário: *"Demo login: entra pelo cargo, sem senha"*. A tela avisa que os dados são fictícios. O guard em `src/widgets/app-shell/TailAdminShell.tsx` só checa se existe id — não checa papel, então um professor que digite `/users` na barra de endereço entra.

O cliente HTTP tipado já existe em `src/shared/lib/api/`, com token em memória em `token-store.ts` e refresh de tentativa única.

## Restrições

- Sem `any`, sem `as unknown as`, sem asserção de não-nulo. Named exports, arrow functions, early return.
- Comentário só para fato que o código não mostra.
- **A mensagem de erro do servidor nunca vai para a tela.** O texto é nosso, escolhido a partir do `code`.
- Gate: `pnpm type-check`, `pnpm lint`, `pnpm test`, `pnpm build`, saída com `tail`.

---

## Tarefa 1 — Autenticar de verdade

`LoginForm` manda `username` e `password` para `POST /auth/login` pelo cliente. O access token entra no `token-store` em memória; o refresh vem no cookie httpOnly e o front não o toca.

Credencial inválida devolve `401`, e a tela mostra texto nosso — algo como "usuário ou senha incorretos". Nunca a `message` da API, que descreve o servidor e não o usuário.

`429` é o throttle da API: dez tentativas em cinco minutos por conta. Merece texto próprio dizendo para esperar, não a mesma mensagem de senha errada.

A copy de demonstração sai: "Ambiente de demonstração — sem senha. Os dados são fictícios." deixa de ser verdade neste commit.

## Tarefa 2 — A sessão é o que a API diz

`session-store.ts` para de guardar id em `localStorage`. Quem é o usuário vem de `GET /auth/me`, que devolve `id`, `name`, `username`, `role`, `email`, `jobTitle` e `mustChangePassword`.

`useSession` passa a expor o perfil vindo da API e um estado de carregamento honesto: enquanto `GET /auth/me` não respondeu, a resposta é "ainda não sei", não "deslogado". Tratar carregando como deslogado joga o usuário para o login a cada refresh de página.

Ao abrir o painel sem token em memória — recarregou a página, o token morreu — o cliente tenta o refresh pelo cookie antes de concluir que a sessão acabou. Sessão sobrevivendo a `F5` é o critério.

Sair chama `POST /auth/logout`, limpa o token em memória e manda para o login.

## Tarefa 3 — Senha provisória tem tela

A API responde `403` com `code: "password_change_required"` em toda rota enquanto a senha for provisória, e o perfil traz `mustChangePassword: true`.

O front roteia por esse código para uma tela de definição de senha. A tela pede a senha atual e a nova, manda para `POST /auth/change-password`, e **depois manda para o login** — a troca revoga todas as sessões de propósito, inclusive a que fez a troca. Dizer isso na tela evita o usuário achar que quebrou.

Piso de oito caracteres, e a nova diferente da atual — as duas regras da API, validadas no cliente para o erro chegar antes da requisição.

## Tarefa 4 — Guard por papel

O guard passa a ler `role` do perfil da API. Professor não alcança `/users` nem `/reports` digitando na barra de endereço; coordenador não alcança `/attendance`. Hoje a única distinção é qual link a navegação desenha.

A regra de quem vê o quê já existe em `src/shared/config/navigation.ts` — reusar, não reescrever.

---

## Aceite

**Funciona de verdade**, provado contra a `radarge-api` no ar, não contra mock: entrar com o admin de bootstrap, cair na tela de senha provisória, trocar, voltar ao login, entrar de novo, recarregar a página e continuar dentro, sair e ser mandado ao login.

**Falhas que precisam falhar alto**: credencial inválida com texto nosso; `429` com texto próprio; refresh falho encerrando a sessão em vez de repetir.

**Testes com MSW**: login válido e inválido; sessão sobrevivendo a recarga via refresh; `403 password_change_required` levando à tela de troca; logout limpando o token; e professor barrado em rota de admin.
