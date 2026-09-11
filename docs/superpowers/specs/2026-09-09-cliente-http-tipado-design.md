# Cliente HTTP tipado — design

Linear: [SPA-291](https://linear.app/9room/issue/SPA-291)

## O problema

O painel não fala com a radarge-api em lugar nenhum. Os dados vivem num blob de
`localStorage` com seed de demonstração, atrás de fetchers assíncronos em
`entities/*/api.ts` que foram desenhados desde o começo para esconder essa troca.
A API existe, está no ar em `developer`, publica 29 rotas e 84 schemas, e ninguém
consome.

Este card não migra nenhuma tela. Ele entrega a camada que as nove demandas
seguintes usam, e nada além disso.

## Os tipos vêm do contrato, não da mão

A API deriva os schemas zod das próprias tabelas e publica o `openapi.json` no
mesmo commit que muda uma rota. Escrever tipo à mão no front seria manter uma
segunda descrição do mesmo contrato, e as duas divergem no primeiro campo que
alguém adiciona sem avisar.

`openapi-typescript` gera `src/shared/api/schema.d.ts` a partir do contrato. É
dependência de desenvolvimento e produz **só declaração de tipo** — nada dele
entra no bundle. O contrato entra versionado no repositório, com um script que o
regenera, porque um front que precisa da API no ar para compilar não compila em
CI nem na máquina de quem acabou de clonar.

Divergência de contrato passa a ser erro de tipo em `pnpm type-check`, e não um
`undefined` numa tela em produção.

## O cliente é escrito à mão, e isso é deliberado

Um cliente gerado resolveria a chamada e não resolveria o que essa API tem de
particular: o refresh transparente no 401, com uma única tentativa em voo por
vez. Duas telas que recebem 401 ao mesmo tempo não podem disparar dois refresh —
o segundo apresenta um token que o primeiro já rotacionou, a API entende como
reuso e derruba a família inteira, deslogando o usuário por ter aberto duas abas.

São umas sessenta linhas. Elas vivem em `src/shared/lib/api/`, ao lado de
`storage/` e `query/`, dentro da camada `shared` — consumível por `entities/`
sem violar a regra de import.

## O que o cliente resolve

**A base URL** vem de `NEXT_PUBLIC_API_URL`. Ausente, o cliente falha ao ser
construído, não na primeira chamada: um painel que sobe e quebra ao clicar é pior
de diagnosticar do que um que não sobe.

**A credencial.** Toda chamada vai com `credentials: "include"`, porque o refresh
mora num cookie httpOnly de outra origem. O access token viaja no header, e vem
de memória — nunca de `localStorage`, para que um XSS não leve a sessão.

**O erro tipado.** A API responde `{ code, message }` com código legível por
máquina. O cliente devolve esse código para quem chamou, e **nunca** interpola a
mensagem do servidor na tela: é string não controlada por nós, e vaza detalhe de
infraestrutura. O texto que o usuário lê é nosso, escolhido a partir do código.

**O 401.** Uma tentativa de refresh, compartilhada entre todas as chamadas que
falharem ao mesmo tempo, e uma só. Se o refresh falhar, a sessão acabou e quem
chamou precisa saber disso — não é erro de rede, é logout.

## O que este card não faz

Não migra fetcher, não mexe em tela, não remove o `localStorage`. O login real é
o SPA-284; cada entidade tem o seu card. Aqui entra a fundação e um consumidor de
prova — uma chamada real contra a API rodando, para demonstrar que a camada
funciona antes que nove demandas passem a depender dela.

## Aceite

**Funciona de verdade**: com a API local no ar, uma chamada pelo cliente devolve
dado tipado, sem `any` e sem cast. Com a API fora, devolve erro tipado e não
promessa pendurada.

**Falhas que precisam falhar alto**: `NEXT_PUBLIC_API_URL` ausente derruba a
construção do cliente com mensagem dizendo qual variável falta; resposta que não
casa com o contrato é erro, não `undefined` silencioso.

**Testes**, com MSW que já está instalado e hoje está dormente: o caminho feliz;
o erro tipado com o código preservado; o 401 disparando **um** refresh mesmo com
três chamadas simultâneas, afirmado pela contagem de requisições que o MSW viu;
o refresh que falha resultando em sessão encerrada; e a ausência da variável de
ambiente.

**Ramos que precisam estar cobertos**: com token e sem token; 401 com refresh
bem-sucedido e com refresh falho; erro com corpo no formato da API e erro sem
corpo nenhum, que é o que uma queda de rede produz.
