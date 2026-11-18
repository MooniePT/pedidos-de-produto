# Testes manuais

Casos de teste manuais da aplicação "Pedidos de produto", executados na interface (navegador) com os dados de exemplo.

**Contas de exemplo** (palavra-passe `pedidos123`):

- Cliente: `joao@exemplo.pt` (João Martins); outros clientes: `ines@exemplo.pt`, `rui@exemplo.pt`
- Gestor de projeto: `jose@exemplo.pt` (José)
- Product Manager: `marta@exemplo.pt` (Marta)
- Developer: `ana@exemplo.pt` (Ana), `luis@exemplo.pt` (Luís)

**Preparação:** `npm run bd:repor` (volta aos dados de exemplo), depois `npm run bd` e abrir a aplicação no navegador.

**Estados:** "Passou" indica um comportamento confirmado na aplicação e também coberto pelos testes automáticos (ver `TESTES.md`). "Por executar" indica um caso a correr na interface antes da apresentação.

## Resumo

| Nº  | US    | Nome                                            | Estado       |
| --- | ----- | ----------------------------------------------- | ------------ |
| 1   | —     | Iniciar sessão com credenciais válidas          | Passou       |
| 2   | —     | Iniciar sessão com palavra-passe errada         | Passou       |
| 3   | —     | Registar novo cliente                           | Passou       |
| 4   | —     | Registar com email repetido                     | Passou       |
| 5   | US1   | Submeter pedido válido                          | Passou       |
| 6   | US1   | Submeter pedido sem título                      | Por executar |
| 7   | US1   | Sugestão de pedidos semelhantes                 | Passou       |
| 8   | US6   | Editar pedido próprio                           | Passou       |
| 9   | US6   | Editar pedido de outro cliente                  | Passou       |
| 10  | US4   | Votar e retirar voto num pedido                 | Passou       |
| 11  | US4   | Votar num pedido concluído                      | Passou       |
| 12  | US2   | Gerar convite e criar o Workspace               | Passou       |
| 13  | US2   | Gerar convite sem ser o criador                 | Passou       |
| 14  | US5   | Comentar e mencionar um membro                  | Passou       |
| 15  | US5   | Comentar sem ser membro do Workspace            | Passou       |
| 16  | US5   | Comentário com mais de 1000 carateres           | Passou       |
| 17  | US9   | Triar e confirmar pedido                        | Passou       |
| 18  | US9   | Devolver pedido sem motivo                      | Por executar |
| 19  | US9   | Marcar pedido como duplicado                    | Passou       |
| 20  | US13  | Aprovar pedido confirmado                       | Passou       |
| 21  | US14  | Rejeitar pedido sem motivo                      | Por executar |
| 22  | US16  | Priorizar pedido aprovado                       | Passou       |
| 23  | US19  | Definir critérios de aceitação                  | Passou       |
| 24  | US12  | Criar sprint com outro sprint ativo             | Passou       |
| 25  | US11  | Atribuir pedido sem critérios de aceitação      | Passou       |
| 26  | US11  | Atribuir pedido a um developer                  | Passou       |
| 27  | US24  | Iniciar trabalho e associar link de código      | Passou       |
| 28  | US25  | Concluir pedido sem nota de resolução           | Passou       |
| 29  | US25  | Concluir pedido com nota                        | Passou       |
| 30  | US12  | Fechar sprint                                   | Passou       |
| 31  | US31  | Criar tag repetida                              | Passou       |
| 32  | US30  | Criar dependência circular                      | Passou       |
| 33  | ACE-6 | Perfil sem permissão (menu e ação)              | Passou       |
| 34  | NOT-5 | Notificação ao autor quando o pedido é aprovado | Passou       |

---

## Teste 1 – Iniciar sessão com credenciais válidas

Funcionalidade: Autenticação – Iniciar sessão

Pré-condição: Conta de exemplo existente; sessão terminada.

Passos:

1. Abrir a página inicial da aplicação.
2. Introduzir o email `joao@exemplo.pt`.
3. Introduzir a palavra-passe `pedidos123`.
4. Carregar em "Entrar".

Resultado esperado: A sessão é iniciada e o cliente vê o "Fórum público" e "Os meus pedidos" no menu.

Resultado obtido: A sessão foi iniciada e o menu do cliente foi apresentado.

Estado: Passou.

## Teste 2 – Iniciar sessão com palavra-passe errada

Funcionalidade: Autenticação – Iniciar sessão (caso negativo)

Pré-condição: Sessão terminada.

Passos:

1. Abrir a página inicial.
2. Introduzir o email `joao@exemplo.pt`.
3. Introduzir a palavra-passe `errada123`.
4. Carregar em "Entrar".
5. Repetir com um email que não existe (`ninguem@exemplo.pt`).

Resultado esperado: A sessão não é iniciada e aparece "Email ou palavra-passe incorretos." nos dois casos (não revela se o email existe).

Resultado obtido: Foi apresentada a mesma mensagem nos dois casos e a sessão não foi iniciada.

Estado: Passou.

## Teste 3 – Registar novo cliente

Funcionalidade: Autenticação – Criar conta

Pré-condição: O email `maria@exemplo.pt` não está registado.

Passos:

1. Na página inicial, escolher criar conta.
2. Preencher "Nome de utilizador" com "Maria Silva", "Email" com `maria@exemplo.pt` e "Palavra-passe" com `segredo123`.
3. Marcar "Confirmo os dados introduzidos." e submeter.
4. Iniciar sessão com a nova conta.

Resultado esperado: A conta é criada com o perfil Cliente e permite iniciar sessão e submeter pedidos.

Resultado obtido: A conta foi criada como Cliente e a sessão foi iniciada.

Estado: Passou.

## Teste 4 – Registar com email repetido ou dados inválidos

Funcionalidade: Autenticação – Criar conta (caso negativo)

Pré-condição: A conta `joao@exemplo.pt` já existe.

Passos:

1. Escolher criar conta.
2. Preencher o email `JOAO@exemplo.pt` e uma palavra-passe válida; submeter.
3. Repetir com nome vazio, email `sem-arroba` e palavra-passe `curta`.

Resultado esperado: No passo 2 aparece "Este email já está registado."; no passo 3 aparecem os erros por campo ("Indique um nome de utilizador.", "Indique um email válido (ex.: nome@empresa.pt).", "Indique uma palavra-passe com pelo menos 8 caracteres.").

Resultado obtido: As mensagens apresentadas foram as esperadas e nenhuma conta foi criada.

Estado: Passou.

## Teste 5 – Submeter pedido válido

Funcionalidade: US1 – Submeter pedido

Pré-condição: Cliente autenticado (`joao@exemplo.pt`).

Passos:

1. Abrir o formulário de submissão.
2. Escolher o produto em "Produto selecionado".
3. Introduzir título e descrição.
4. Carregar em "Submeter".

Resultado esperado: O pedido é criado com o estado "Submetido", com um código novo (ex.: P-054) e aparece em "Os meus pedidos".

Resultado obtido: O pedido foi criado corretamente no estado "Submetido".

Estado: Passou.

## Teste 6 – Submeter pedido sem título

Funcionalidade: US1 – Submeter pedido (caso negativo)

Pré-condição: Cliente autenticado.

Passos:

1. Abrir o formulário de submissão.
2. Escolher o produto e preencher apenas a descrição.
3. Carregar em "Submeter".

Resultado esperado: O pedido não é submetido e é indicado que o título é obrigatório ("O título é obrigatório."). O campo título não aceita mais de 100 carateres.

Resultado obtido: _Preencher ao executar._

Estado: Por executar.

## Teste 7 – Sugestão de pedidos semelhantes

Funcionalidade: US1 – Submeter pedido (pedidos semelhantes, DUP-1)

Pré-condição: Cliente autenticado; existe o pedido "Pesquisa de ferramentas".

Passos:

1. Abrir o formulário de submissão e escolher o mesmo produto do pedido existente.
2. Escrever "Pesquisa de ferramentas" no título.

Resultado esperado: Em "Pedidos semelhantes" aparecem no máximo três sugestões do mesmo produto, sem pedidos rejeitados ou duplicados. O cliente pode votar no existente ou continuar a submeter.

Resultado obtido: As sugestões apareceram enquanto o título era escrito, limitadas ao produto escolhido.

Estado: Passou.

## Teste 8 – Editar pedido próprio

Funcionalidade: US6 – Editar um pedido

Pré-condição: `joao@exemplo.pt` autenticado; pedido P-041 "Pesquisa de ferramentas" no estado "Submetido".

Passos:

1. Abrir "Os meus pedidos" e o pedido P-041.
2. Escolher editar.
3. Alterar o título para "Título alterado" e guardar.
4. Consultar o histórico do pedido.

Resultado esperado: O pedido fica com o novo título, o autor mantém-se e a versão anterior fica guardada no histórico.

Resultado obtido: O título foi alterado e a versão anterior ficou registada.

Estado: Passou.

## Teste 9 – Editar pedido de outro cliente

Funcionalidade: US6 – Editar um pedido (caso negativo, EDI-1)

Pré-condição: `ines@exemplo.pt` autenticada.

Passos:

1. Abrir o pedido P-041 (submetido pelo João).
2. Procurar a opção de editar.

Resultado esperado: A opção de editar não está disponível; se a operação for forçada, é recusada ("Este pedido não pode ser editado por si neste estado.").

Resultado obtido: A edição não foi permitida.

Estado: Passou.

## Teste 10 – Votar e retirar voto num pedido

Funcionalidade: US4 – Votar num pedido existente

Pré-condição: Cliente autenticado; pedido P-041 aberto no "Fórum público".

Passos:

1. Carregar no botão de voto.
2. Confirmar que o contador aumenta 1.
3. Carregar outra vez para retirar o voto.

Resultado esperado: O voto é registado (um por cliente) e pode ser retirado; o contador volta ao valor inicial.

Resultado obtido: O contador aumentou e voltou ao valor inicial ao retirar o voto.

Estado: Passou.

## Teste 11 – Votar num pedido concluído

Funcionalidade: US4 – Votar num pedido existente (caso negativo)

Pré-condição: Cliente autenticado; existe um pedido "Concluído" (ex.: P-035 "Exportação de dados").

Passos:

1. Abrir o pedido concluído no "Fórum público".
2. Tentar votar.

Resultado esperado: Aparece "Pedido concluído · já não aceita votos." e o número de votos não muda.

Resultado obtido: Não foi possível votar e o número de votos manteve-se.

Estado: Passou.

## Teste 12 – Gerar convite e criar o Workspace

Funcionalidade: US2 – Criar Workspace e convidar utilizadores por link

Pré-condição: `joao@exemplo.pt` autenticado; pedido próprio sem Workspace.

Passos:

1. Abrir o pedido e a área de participantes.
2. Carregar em "Gerar link de convite" e copiar o "Link de convite".
3. Terminar sessão e entrar como `rui@exemplo.pt`.
4. Em "Aceitar um convite", colar o código do convite e aceitar.

Resultado esperado: O Workspace é criado quando o primeiro convidado aceita, com o título do pedido como nome (máx. 50 carateres) e com os dois membros. O convite é válido 7 dias.

Resultado obtido: O Workspace foi criado ao aceitar o convite, com o João e o Rui como membros.

Estado: Passou.

## Teste 13 – Gerar convite sem ser o criador

Funcionalidade: US2 – Criar Workspace (caso negativo, WRK-1)

Pré-condição: `rui@exemplo.pt` autenticado; pedido P-041 do João.

Passos:

1. Abrir o pedido P-041.
2. Tentar gerar um link de convite.

Resultado esperado: A operação é recusada ("Só o criador do pedido pode gerar convites.").

Resultado obtido: Não foi possível gerar o convite.

Estado: Passou.

## Teste 14 – Comentar e mencionar um membro

Funcionalidade: US5 – Comentar num pedido

Pré-condição: `joao@exemplo.pt` autenticado; Workspace do pedido P-041 aberto, com a Inês e o Rui como membros.

Passos:

1. Abrir o Workspace do pedido.
2. Escrever "@Inês Costa pode rever a ideia?" em "Comentário".
3. Selecionar a Inês em "Membros para mencionar".
4. Carregar em "Publicar comentário".
5. Entrar como `ines@exemplo.pt` e abrir "Notificações".

Resultado esperado: O comentário aparece no Workspace; só a Inês recebe a notificação de menção (o Rui não).

Resultado obtido: O comentário foi publicado e só a Inês foi notificada.

Estado: Passou.

## Teste 15 – Comentar sem ser membro do Workspace

Funcionalidade: US5 – Comentar num pedido (caso negativo, COM-1 / WRK-5)

Pré-condição: `marta@exemplo.pt` (Product Manager) autenticada.

Passos:

1. Abrir o pedido P-041 e o seu Workspace.
2. Tentar escrever um comentário.

Resultado esperado: A Marta consegue consultar o Workspace mas não comentar (só leitura). Utilizadores não membros (ex.: José, Ana) não veem o Workspace.

Resultado obtido: A Marta viu o Workspace em modo de leitura e não conseguiu comentar.

Estado: Passou.

## Teste 16 – Comentário com mais de 1000 carateres

Funcionalidade: US5 – Comentar num pedido (caso negativo, COM-2)

Pré-condição: Membro do Workspace autenticado.

Passos:

1. Abrir o Workspace do pedido.
2. Colar um texto com 1001 carateres em "Comentário".
3. Carregar em "Publicar comentário".

Resultado esperado: O comentário não é publicado ("O comentário deve ter entre 1 e 1000 carateres.").

Resultado obtido: O comentário foi recusado.

Estado: Passou.

## Teste 17 – Triar e confirmar pedido

Funcionalidade: US9 – Triar pedido; US10 – Confirmar pedido

Pré-condição: `jose@exemplo.pt` autenticado; existe um pedido no estado "Submetido".

Passos:

1. Abrir "Triagem de pedidos".
2. Abrir o pedido e iniciar a triagem.
3. Carregar em "Confirmar pedido" e confirmar.

Resultado esperado: O pedido passa a "Em triagem" e depois a "Confirmado", ficando disponível para decisão da Product Manager.

Resultado obtido: O pedido ficou "Confirmado" e apareceu em "Pedidos por decidir" da Marta.

Estado: Passou.

## Teste 18 – Devolver pedido sem motivo

Funcionalidade: US9 – Triar pedido (devolução, caso negativo)

Pré-condição: `jose@exemplo.pt` autenticado; pedido "Em triagem".

Passos:

1. Abrir o pedido na triagem.
2. Escolher devolver ao cliente, deixando "Motivo" vazio.
3. Carregar em "Confirmar devolução".

Resultado esperado: A devolução não é feita ("Indique um motivo entre 1 e 500 carateres."). Com motivo, o pedido é devolvido e o cliente é notificado (NOT-3).

Resultado obtido: _Preencher ao executar._

Estado: Por executar.

## Teste 19 – Marcar pedido como duplicado

Funcionalidade: US9 – Triar pedido (duplicado, DUP-2 a DUP-4)

Pré-condição: `jose@exemplo.pt` autenticado; dois pedidos semelhantes do mesmo produto.

Passos:

1. Abrir o pedido mais recente na triagem.
2. Escolher duplicado e selecionar o "Pedido original".
3. Carregar em "Associar duplicado".
4. Entrar como o autor e abrir "Notificações".

Resultado esperado: O pedido fica "Duplicado" e o autor recebe "Já está a ser tratado no pedido P-0xx." com o código do original.

Resultado obtido: O pedido ficou duplicado e o autor foi notificado com o código do original.

Estado: Passou.

## Teste 20 – Aprovar pedido confirmado

Funcionalidade: US13 – Aprovar pedidos de funcionalidade

Pré-condição: `marta@exemplo.pt` autenticada; pedido "Confirmado".

Passos:

1. Abrir "Pedidos por decidir".
2. Abrir o pedido e aprovar.

Resultado esperado: O pedido passa a "Aprovado", o Workspace fica só de leitura e o autor é notificado ("Pedido aprovado").

Resultado obtido: O pedido ficou "Aprovado" e o autor recebeu a notificação.

Estado: Passou.

## Teste 21 – Rejeitar pedido sem motivo

Funcionalidade: US14 – Rejeitar pedido de funcionalidade (caso negativo)

Pré-condição: `marta@exemplo.pt` autenticada; pedido "Confirmado".

Passos:

1. Abrir o pedido em "Pedidos por decidir".
2. Escolher rejeitar e deixar "Motivo da rejeição" vazio.
3. Carregar em "Confirmar rejeição".

Resultado esperado: A rejeição não é feita ("Indique um motivo entre 1 e 500 carateres."). Com motivo, o pedido fica "Rejeitado" e o autor é notificado (NOT-6).

Resultado obtido: _Preencher ao executar._

Estado: Por executar.

## Teste 22 – Priorizar pedido aprovado

Funcionalidade: US16 – Priorizar pedidos (com sugestão da IA)

Pré-condição: `marta@exemplo.pt` autenticada; pedido "Aprovado".

Passos:

1. Abrir o pedido no "Backlog de produto".
2. Pedir a sugestão da IA e ajustar o "Impacto", o "Esforço" e a "Prioridade".
3. Guardar.
4. Consultar o histórico do pedido.

Resultado esperado: O pedido passa a "Priorizado" e o histórico regista "sugestão da IA ajustada (decisão humana do Product Manager)" (IA-5).

Resultado obtido: O pedido ficou priorizado e a decisão humana ficou no histórico.

Estado: Passou.

## Teste 23 – Definir critérios de aceitação

Funcionalidade: US19 – Definir critérios de aceitação de uma tarefa

Pré-condição: `marta@exemplo.pt` autenticada; pedido aprovado.

Passos:

1. Abrir o pedido e a secção de requisitos.
2. Escrever a user story e um critério de aceitação.
3. Tentar adicionar o mesmo critério duas vezes.
4. Guardar.

Resultado esperado: Os critérios ficam guardados; um critério repetido é recusado ("Este critério já existe.").

Resultado obtido: Os critérios foram guardados e o repetido foi recusado.

Estado: Passou.

## Teste 24 – Criar sprint com outro sprint ativo

Funcionalidade: US12 – Definir sprint backlog (caso negativo, SPR-3)

Pré-condição: `jose@exemplo.pt` autenticado; existe um sprint ativo.

Passos:

1. Abrir "Preparar sprint".
2. Preencher "Nome", "Data de início" e "Data de fim" e selecionar um pedido.
3. Guardar.

Resultado esperado: O novo sprint não é criado ("Já existe um sprint ativo. Feche-o antes de iniciar o próximo.").

Resultado obtido: O sprint não foi criado e foi pedida a conclusão do sprint atual.

Estado: Passou.

## Teste 25 – Atribuir pedido sem critérios de aceitação

Funcionalidade: US11 – Atribuir pedido à equipa técnica (caso negativo, CRI-4)

Pré-condição: `jose@exemplo.pt` autenticado; pedido no sprint sem critérios de aceitação.

Passos:

1. Abrir o pedido em "Sprint atual".
2. Escolher a Ana em "Responsável técnico".
3. Carregar em "Confirmar atribuição".

Resultado esperado: A atribuição é recusada por faltarem critérios de aceitação.

Resultado obtido: A atribuição foi recusada.

Estado: Passou.

## Teste 26 – Atribuir pedido a um developer

Funcionalidade: US11 – Atribuir pedido à equipa técnica

Pré-condição: `jose@exemplo.pt` autenticado; pedido priorizado, com critérios, no sprint ativo.

Passos:

1. Abrir o pedido em "Sprint atual".
2. Escolher a Ana em "Responsável técnico".
3. Carregar em "Confirmar atribuição".
4. Entrar como `ana@exemplo.pt` e abrir "Os meus pedidos".

Resultado esperado: O pedido fica "Atribuído" e aparece apenas na lista da Ana (ACE-3).

Resultado obtido: O pedido apareceu na lista da Ana como "Atribuído".

Estado: Passou.

## Teste 27 – Iniciar trabalho e associar link de código

Funcionalidade: US24 – Atualizar estado e associar código (COD-1 a COD-5)

Pré-condição: `ana@exemplo.pt` autenticada; pedido atribuído à Ana.

Passos:

1. Abrir o pedido em "Os meus pedidos" e começar o trabalho.
2. Em "Link da alteração de código", colar `https://github.com/equipa/projeto/commit/123`.
3. Carregar em "Associar link".
4. Repetir o mesmo link.

Resultado esperado: O pedido passa a "Em progresso" (o autor e o gestor são notificados, NOT-8); o link fica associado; o link repetido é recusado ("Este link já está associado.").

Resultado obtido: O pedido ficou "Em progresso" e o link foi associado.

Estado: Passou.

## Teste 28 – Concluir pedido sem nota de resolução

Funcionalidade: US25 – Concluir um pedido (CA2, caso negativo)

Pré-condição: `ana@exemplo.pt` autenticada; pedido "Em progresso" atribuído à Ana.

Passos:

1. Abrir o pedido.
2. Carregar em "Concluir pedido".
3. Deixar "Nota de resolução" vazia e carregar em "Confirmar conclusão".

Resultado esperado: Aparece "Adicione uma nota com a descrição da resolução" e o pedido continua "Em progresso".

Resultado obtido: Foi apresentada a mensagem e o pedido não foi concluído.

Estado: Passou.

## Teste 29 – Concluir pedido com nota

Funcionalidade: US25 – Concluir um pedido

Pré-condição: `ana@exemplo.pt` autenticada; pedido "Em progresso" atribuído à Ana.

Passos:

1. Abrir o pedido e carregar em "Concluir pedido".
2. Escrever "Critérios verificados." em "Nota de resolução".
3. Carregar em "Confirmar conclusão".

Resultado esperado: O pedido passa a "Concluído" e o autor é notificado (NOT-9).

Resultado obtido: O pedido ficou "Concluído".

Estado: Passou.

## Teste 30 – Fechar sprint

Funcionalidade: US12 – Definir sprint backlog / fecho do sprint (SPR-6 a SPR-9)

Pré-condição: `jose@exemplo.pt` autenticado; sprint ativo com um pedido concluído e outro em progresso.

Passos:

1. Abrir "Sprint atual".
2. Carregar em "Fechar sprint" e confirmar.
3. Abrir "Histórico de sprints".

Resultado esperado: Os pedidos concluídos são arquivados; os pedidos em progresso mantêm o estado e o developer; o sprint fica no histórico com a cópia dos pedidos; passa a ser possível preparar um novo sprint.

Resultado obtido: O sprint foi fechado e apareceu no histórico.

Estado: Passou.

## Teste 31 – Criar tag repetida

Funcionalidade: US31 – Gerir tags (caso negativo)

Pré-condição: `marta@exemplo.pt` autenticada; existe a tag "Pesquisa".

Passos:

1. Abrir "Tags".
2. Criar a tag " PESQUISA " (com espaços e maiúsculas).
3. Tentar eliminar a tag "Pesquisa", que está em uso.

Resultado esperado: A criação é recusada ("Esta tag já existe"); a eliminação é recusada ("Esta tag está em uso e não pode ser eliminada.").

Resultado obtido: As duas operações foram recusadas.

Estado: Passou.

## Teste 32 – Criar dependência circular

Funcionalidade: US30 – Definir dependências entre features (caso negativo)

Pré-condição: `marta@exemplo.pt` autenticada; o pedido P-031 já depende do P-038.

Passos:

1. Abrir o pedido P-038 no "Roadmap".
2. Adicionar a dependência P-038 → P-031.

Resultado esperado: A dependência é recusada ("Esta dependência cria um ciclo.").

Resultado obtido: A dependência foi recusada.

Estado: Passou.

## Teste 33 – Perfil sem permissão

Funcionalidade: Perfis e permissões (ACE-6, ACE-7)

Pré-condição: `ana@exemplo.pt` (Developer) autenticada.

Passos:

1. Verificar o menu: só existe "Os meus pedidos".
2. Escrever na barra de endereço `/app/novo` (submeter pedido) ou `/app/triagem`.

Resultado esperado: A Ana é reencaminhada para a sua área; não consegue submeter nem triar. Mesmo que o pedido seja enviado diretamente à API, o servidor responde "O seu perfil não permite esta operação."

Resultado obtido: O acesso foi recusado e a Ana voltou à sua lista.

Estado: Passou.

## Teste 34 – Notificação ao autor quando o pedido é aprovado

Funcionalidade: Notificações (NOT-5; US26 – Configurar filtros de notificação)

Pré-condição: Pedido do João aprovado pela Marta (Teste 20).

Passos:

1. Entrar como `joao@exemplo.pt`.
2. Abrir "Notificações".

Resultado esperado: Existe a notificação "Pedido aprovado" para esse pedido; não existem notificações de triagem, confirmação ou priorização (essas não notificam o autor).

Resultado obtido: Apareceu apenas a notificação de aprovação.

Estado: Passou.
