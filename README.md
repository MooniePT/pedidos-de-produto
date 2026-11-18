# Pedidos de produto

Aplicação React + TypeScript em português de Portugal, com API em Node.js e base de dados MongoDB. Uma aplicação comum aos quatro perfis, com contas, sessões e dados partilhados entre computadores.

A revisão do Sprint 4 segue o documento atualizado. Consulte [Referências e correspondência com o UML](REFERENCIAS_SPRINT4.md).

Para compreender a organização e preparar a explicação do trabalho, consulte o [Guia do código](GUIA_CODIGO.md).

## Executar

Requer Node.js 22.12 ou superior.

```sh
npm install
npm run bd
```

Arranca o MongoDB, a API e o programa já ligados. Abrir http://127.0.0.1:5174 e iniciar sessão com email e palavra-passe. Ver [Base de dados MongoDB](bd/BASE_DADOS.md).

`npm run dev` arranca só o programa (o ecrã). Precisa da API a correr noutro terminal, com `npm run bd:api`.

```sh
npm test
npm run test:bd
npm run build
```

O servidor deve encaminhar os endereços `/app/*` e `/convite` para `index.html` e `/api` para a API ao publicar a versão compilada.

## Contas e sessão

- **Criar conta:** o registo público cria sempre uma conta de **Cliente** (Sequência "Registar utilizador" no Miro). Nome, email único e palavra-passe com pelo menos 8 caracteres.
- **Equipa interna e contas de exemplo:** já vêm na base de dados (`joao@`, `jose@`, `marta@`, `ana@`, `luis@`, `ines@`, `rui@exemplo.pt`), com a palavra-passe inicial `pedidos123`. Pode mudar-se com `PALAVRA_PASSE_INICIAL` no `.env`, antes do primeiro arranque.
- **Palavras-passe:** só se guarda o hash (scrypt com sal aleatório), no atributo `password` do utilizador (como no diagrama de classes). Nunca é enviado ao navegador.
- **Sessão:** cookie `HttpOnly` com validade de 12 horas. O servidor tira o utilizador da sessão e ignora qualquer utilizador indicado no pedido (ACE-7). Sem sessão, a API responde 401.

## Funcionalidades implementadas

| Perfil            | Fluxos                                                                                                                                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cliente           | Pesquisa e filtros, submissão associada ao utilizador, pedidos semelhantes, edição e reenvio, histórico e versões, votos, participantes, convites, workspace, comentários e menções, ficheiros |
| Gestor de projeto | Fila de triagem, confirmar/devolver/associar duplicado, preparação e fecho de sprint, atribuição a Developer, histórico com seleção de sprint e página dos respetivos pedidos                  |
| Product Manager   | Aprovação/rejeição, priorização por impacto e esforço, user stories e critérios de aceitação, tags, roadmap, releases e milestones, dependências, rastreabilidade e métricas calculadas        |
| Developer         | Pedidos atribuídos, filtros por estado/prioridade/datas, iniciar trabalho, associar links de código, concluir com nota de resolução, consulta de critérios e contexto                          |
| Comum             | Registo, início e fim de sessão, notificações, preferências, estados vazios, validações e confirmações                                                                                         |

As pequenas ações decorrem no próprio ecrã. As sugestões de pedidos semelhantes aparecem durante a escrita do título ou da descrição. O fórum é público e os comentários são privados no Workspace.

## Limites desta fase

- **Recuperar a palavra-passe:** o formulário existe, mas ainda não envia emails. Também não existe ainda a opção de mudar a palavra-passe.
- **Sugestões de IA simuladas** e identificadas como tal. Permitem testar aceitação, ajuste, rejeição e indisponibilidade.
- **Sem HTTPS em desenvolvimento.** Em produção, usar HTTPS e `COOKIE_SEGURO=true` (cookie `Secure`), como pede a RNF-2.
- Ficheiros PDF, PNG, JPEG e TXT até 2 MB, guardados no Workspace.

## Organização

O contrato está em `client/src/domain.ts`. Os ecrãs usam o `Repository` de `client/src/services/repository.ts` (dados) e `client/src/services/autenticacao.ts` (sessão), através de `client/src/state.tsx`.

As regras de `services/reducer.ts` correm no servidor (`bd/servidor.ts`) para cada operação. Os testes em `client/tests/` verificam as regras; os de `bd/testes/` verificam a base de dados, a API e a autenticação.
