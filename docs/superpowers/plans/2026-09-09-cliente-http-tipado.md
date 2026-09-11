# Cliente HTTP tipado — plano

Spec: [`../specs/2026-09-09-cliente-http-tipado-design.md`](../specs/2026-09-09-cliente-http-tipado-design.md). Linear: SPA-291.
Branch `feature/spa-291-typed-api-client`, cortada de `developer`.

**Meta:** a camada que fala com a radarge-api existe, é tipada a partir do contrato, e está **provada contra a API rodando de verdade** — não só contra mock.

## Restrições

- Sem `any`, sem `as unknown as`, sem asserção de não-nulo. Named exports, arrow functions, early return, sem abreviação em nome.
- Comentário só para fato que o código não mostra. Racional mora na spec.
- Nada de tela, nada de fetcher migrado, nada de `localStorage` removido. Só a camada e a prova.
- Gate: `npm run type-check`, `npm run lint`, `npm test`, `npm run build`. Saída sempre com `tail`.

---

## Tarefa 1 — Os tipos vêm do contrato

**Arquivos:** `package.json`, `openapi.json` (novo, na raiz), `src/shared/api/schema.d.ts` (gerado), `.gitignore`.

1. Instalar `openapi-typescript` como devDependency.
2. Copiar `../radarge-api/openapi.json` para a raiz do repositório e versionar. É snapshot do contrato: sem ele o projeto não compila em máquina limpa nem em CI.
3. Script `"api:types"` no `package.json` gerando `src/shared/api/schema.d.ts` a partir do `openapi.json`.
4. Rodar, commitar o gerado, e conferir que `npm run type-check` passa.

O gerado é versionado de propósito — quem clona não precisa rodar geração para o projeto compilar.

**Prova:** um arquivo temporário que importe um tipo do schema e o use; `npm run type-check` limpo; apagar o arquivo antes do commit.

---

## Tarefa 2 — O cliente

**Arquivos:** `src/shared/lib/api/client.ts`, `src/shared/lib/api/token-store.ts`, `src/shared/lib/api/errors.ts`, `.env.local.example`.

O que ele resolve, e nada além:

**Base URL** de `NEXT_PUBLIC_API_URL`. Ausente, falha na construção com mensagem nomeando a variável — não na primeira chamada.

**Token de acesso em memória.** `token-store.ts` guarda e devolve, sem `localStorage`. Um XSS não pode levar a sessão.

**Toda chamada** vai com `credentials: "include"` — o refresh é cookie httpOnly de outra origem — e com o header `Authorization` quando houver token.

**Erro tipado.** A API responde `{ code, message }`. O cliente devolve o `code` para quem chamou. A `message` do servidor **nunca** vai para a tela: é string que não controlamos. O texto que o usuário lê é nosso, escolhido pelo `code`. Queda de rede, sem corpo nenhum, também vira erro tipado — não promessa pendurada.

**401 com refresh de tentativa única.** Este é o motivo do cliente ser escrito à mão. Ao receber 401, o cliente chama `POST /auth/refresh` **uma vez**, e toda chamada que falhar enquanto isso espera a mesma promessa. Duas telas disparando dois refresh fazem a segunda apresentar um token que a primeira já rotacionou; a API lê como reuso, revoga a família e desloga o usuário por ter aberto duas abas. Guardar a promessa em voo e reusá-la é a implementação inteira.

Refresh que falha significa sessão encerrada, e quem chamou precisa distinguir isso de erro de rede.

---

## Tarefa 3 — A prova de que integra

Não é teste com mock. É a API de verdade.

1. Subir a `radarge-api` local: `cd ../radarge-api && npm run build`, banco descartável, variáveis de bootstrap, `node dist/server.js`.
2. Um script em `scripts/` que use **o cliente deste repositório** para: logar com o admin de bootstrap, ler `mustChangePassword` do payload, trocar a senha, relogar, criar um professor, criar um aluno e listar alunos.
3. Rodar e colar a saída real no relatório.
4. Derrubar a API e rodar de novo: as chamadas precisam devolver erro tipado, não travar.

Se algum passo não funcionar, o problema é do cliente e é para consertar — é exatamente o que esta tarefa existe para descobrir.

---

## Tarefa 4 — Testes com MSW

O MSW já está instalado e dormente, com um handler falso de Supabase em `src/test/msw/handlers.ts`. Trocar por handlers da radarge-api.

Cobrir: caminho feliz com token; erro tipado preservando o `code`; **três chamadas simultâneas tomando 401 disparam um único refresh**, afirmado pela contagem de requisições que o MSW viu; refresh falho encerrando a sessão; ausência de `NEXT_PUBLIC_API_URL`; e erro sem corpo, que é queda de rede.
