# Testes automáticos

O projeto tem **36 testes automáticos**, todos a passar:

- **21 testes do programa** (`npm test`), em `client/tests/`: regras de negócio, perfis, Workspace, notificações e modelo UML. Não precisam de base de dados.
- **15 testes da base de dados e da API** (`npm run test:bd`), em `bd/testes/`: 12 em `bd.test.ts` (MongoDB temporário + servidor HTTP real) e 3 em `diagrama.test.ts` (esquema comparado com o Diagrama de Classes).

Usamos o executor de testes do próprio Node.js (`node:test`), com `assert/strict`, através do `tsx` (corre TypeScript diretamente).

## Fontes usadas

- **Documento de requisitos:** `03_Documentos dos Sprints/Personas,Cenarios,US.pdf` (versão atual do documento "Personas, Cenários, User Stories, CA e Regras de Negócio").
  - User stories e critérios de aceitação (CA): p. 11 a 35.
  - Regras de negócio: p. 37 a 46 (ORD p. 37; ACE e VIS p. 38; NOT p. 39; EDI p. 40; COM, DUP, PRD-3 e WRK-1 a WRK-4 p. 41; WRK-5 a WRK-8, CRI e PRI p. 42; ATR, SPR e COD p. 43; IA e LIM p. 44; RNF p. 45 e 46).
- **Diagrama de Classes UML Geral** no Miro (board "Sprint 3 - Diagramas"), para os testes da base de dados.
- **`bd/BASE_DADOS.md`**, secção "Do diagrama de classes para o MongoDB", que explica como cada classe passa a coleção.

## Como correr

```bash
npm install
npm test          # 21 testes (client/tests)
npm run test:bd   # 15 testes (bd/testes), descarrega um MongoDB 8 temporário na 1.ª vez
```

## Como ler o resultado

Cada teste aparece numa linha:

- `✔ nome do teste (12ms)`: passou.
- `✖ nome do teste`: falhou. Por baixo aparece o `AssertionError` com o valor esperado (`expected`) e o obtido (`actual`) e a linha do ficheiro de teste.

No fim surge o resumo, por exemplo:

```text
ℹ tests 21
ℹ pass 21
ℹ fail 0
```

O nome de cada teste é uma frase em português que diz a regra verificada, para ser lido como uma especificação.

## Integração contínua (GitHub Actions)

O ficheiro `.github/workflows/ci.yml` corre em cada `push` para `main` e em cada pull request, numa máquina Ubuntu com Node 22:

1. `npm ci` (instala as dependências exatas do `package-lock.json`);
2. `npm run format:check` (Prettier: formatação uniforme);
3. `npm test` (21 testes);
4. `npm run test:bd` (15 testes, com MongoDB em memória);
5. `npm run build` (verificação de tipos com `tsc` e build).

Se algum passo falhar, o commit fica marcado a vermelho no separador "Actions" do GitHub. Isto responde ao RNF-8 (Manutenibilidade, p. 46): "testes automáticos e integração e entrega contínuas (CI/CD)".

---

## 1. Testes do programa: `client/tests/` (21)

Estes testes chamam diretamente o `reducer` (`executarComando`), que é a mesma função usada pelo servidor, e as classes do modelo (`client/src/model/`). Partem sempre dos dados de exemplo (`seed()`): João (cliente), Inês e Rui (clientes, membros do Workspace), José (gestor de projeto), Marta (Product Manager), Ana e Luís (developers).

### 1.1 Percurso completo e sprints

**Um pedido percorre os quatro perfis e fica no histórico do sprint**

- Ficheiro: `client/tests/workflows.test.ts:9`
- Verifica: João submete; José tria e confirma; Marta aprova, define user story e critérios e prioriza; José fecha o sprint anterior, cria o novo sprint backlog e atribui à Ana; Ana começa, associa um commit e conclui; José fecha o sprint. No fim o pedido está arquivado, a cópia histórica do sprint diz "Concluído" e o João foi notificado. Também confirma que concluir sem nota é recusado.
- Fonte: US1 (p. 11), US9 (p. 15), US10, US11 (p. 17), US12 (p. 18), US13 (p. 19), US19 (p. 23), US25 (p. 29); regras ORD-1 a ORD-5 (p. 37), SPR-8 (p. 43), COD-1 (p. 43).

**Atribuição exige critérios e um único sprint ativo**

- Ficheiro: `client/tests/workflows.test.ts:99`
- Verifica: não se atribui um pedido sem critérios de aceitação; não se cria um segundo sprint enquanto há um ativo; a Marta não pode triar (não é o seu perfil); o Luís não pode mudar o estado de um pedido que não está atribuído a ele.
- Fonte: CRI-4 (p. 42), ATR-2 (p. 43), SPR-3 (p. 43), ACE-6 (p. 38), US11 (p. 17).

**Fechar sprint preserva trabalho em progresso e uma cópia histórica**

- Ficheiro: `client/tests/workflows.test.ts:123`
- Verifica: ao fechar o sprint, um pedido "Em progresso" mantém o estado e o developer; a cópia histórica do sprint não muda quando o pedido é concluído depois.
- Fonte: SPR-6 a SPR-9 (p. 43), US12 (p. 18).

### 1.2 Edição, versões e votos

**Edição preserva autor, versões e impede gravações desatualizadas**

- Ficheiro: `client/tests/workflows.test.ts:72`
- Verifica: ao editar, o autor mantém-se e a versão anterior fica guardada; gravar com uma versão antiga é recusado ("alterado entretanto"); a Inês não pode editar um pedido que não submeteu.
- Fonte: US6 (p. 15); EDI-1, EDI-7 (p. 40).

**Os métodos do UML mantêm os dados do autor, os votos e a atribuição**

- Ficheiro: `client/tests/sprint4.test.ts:244`
- Verifica: os métodos da classe `PedidoFuncionalidade` com os nomes do diagrama (`getAutor`, `getEstado`, `adicionarVoto`, `removerVoto`, `atribuir`, `getDeveloper`, `editar`): não se vota duas vezes, a atribuição fica registada e a edição guarda a versão anterior.
- Fonte: Diagrama de Classes (Miro); US4 (p. 13); ATR-4 (p. 43); EDI-7 (p. 40).

**US4: um pedido concluído não aceita votos nem a remoção de votos**

- Ficheiro: `client/tests/sprint4.test.ts:265`
- Verifica: tanto na classe como no comando, votar ou retirar voto num pedido "Concluído" é recusado e o número de votos não muda.
- Fonte: US4, critérios de aceitação (p. 13).

### 1.3 Pedidos semelhantes

**Palavras-chave normalizam acentos, ignoram palavras comuns e eliminam repetições**

- Ficheiro: `client/tests/sprint4.test.ts:20`
- Verifica: "Exportação" e "exportacao" são a mesma palavra; palavras comuns ("para", "com", "uma"...) são ignoradas; não há repetidas.
- Fonte: US1 (p. 11); PRD-3 e DUP-1 (p. 41).

**Semelhantes usam título e descrição, ignoram rejeitados/duplicados e mostram no máximo três**

- Ficheiro: `client/tests/sprint4.test.ts:31`
- Verifica: a pesquisa usa o título e a descrição, exclui pedidos "Rejeitado" e "Duplicado" e devolve no máximo 3 sugestões.
- Fonte: US1 (p. 11); DUP-1 (p. 41).

**ColecaoPedidos.findSemelhantes limita sugestões ao produto escolhido**

- Ficheiro: `client/tests/sprint4.test.ts:49`
- Verifica: só são sugeridos pedidos do mesmo produto.
- Fonte: PRD-3 (p. 41); método `findSemelhantes` do Diagrama de Classes.

### 1.4 Workspace e convites

**O primeiro convidado cria o Workspace automaticamente com nome até 50 carateres**

- Ficheiro: `client/tests/sprint4.test.ts:67`
- Verifica: gerar o convite ainda não cria o Workspace; o convite vale pelo menos 6 dias (7 no código); quando o primeiro convidado aceita, o Workspace é criado com o título do pedido cortado a 50 carateres e com os dois membros; aceitar outra vez é recusado.
- Fonte: US2 CA2 (p. 12); WRK-2, WRK-3, WRK-4 (p. 41); LIM-4 (p. 44).

**Convites só podem ser gerados pelo criador e não podem ser aceites depois do prazo**

- Ficheiro: `client/tests/sprint4.test.ts:92`
- Verifica: o Rui (que não criou o pedido) não gera convite; um convite expirado é recusado.
- Fonte: US2 (p. 12); WRK-1 (p. 41).

**O Workspace fecha exatamente após 14 dias, sem depender de abrir outro ecrã**

- Ficheiro: `client/tests/sprint4.test.ts:107`
- Verifica: 1 milissegundo antes dos 14 dias ainda está aberto; aos 14 dias exatos fica só de leitura; a partir daí comentar, convidar, remover membros e anexar ficheiros é recusado.
- Fonte: US2 (p. 12); WRK-8 (p. 42).

**Aprovação, rejeição e duplicado fecham o Workspace antes dos 14 dias**

- Ficheiro: `client/tests/sprint4.test.ts:129`
- Verifica: em "Aprovado", "Priorizado", "Atribuído", "Em progresso", "Concluído", "Rejeitado" e "Duplicado" o Workspace fica só de leitura e não aceita comentários.
- Fonte: WRK-8 (p. 42).

**Apenas membros consultam o Workspace; Product Manager consulta mas não escreve**

- Ficheiro: `client/tests/sprint4.test.ts:158`
- Verifica: o José e a Ana (não membros) não veem nem comentam; a Marta vê mas não comenta.
- Fonte: WRK-5 (p. 42); COM-1 (p. 41); VIS-2 (p. 38).

**Convites, comentários e votos respeitam participação e duplicação**

- Ficheiro: `client/tests/workflows.test.ts:176`
- Verifica: quem já é membro não aceita de novo; não se menciona quem não é membro; votar e retirar voto funcionam; o criador não pode ser removido do Workspace.
- Fonte: US2 (p. 12), US4 (p. 13), US5 (p. 14); COM-3 (p. 41); WRK-7 (p. 42).

### 1.5 Comentários e notificações

**Comentário privado guarda menções e notifica apenas os mencionados**

- Ficheiro: `client/tests/sprint4.test.ts:185`
- Verifica: o comentário guarda a menção à Inês; só a Inês recebe a notificação (o Rui, também membro, não); um comentário com 1001 carateres é recusado.
- Fonte: US5 (p. 14); COM-2 (p. 41); NOT-2 (p. 39); LIM-2 (p. 44).

**NOT-3 a NOT-9: o autor só é notificado nas mudanças de estado previstas no documento**

- Ficheiro: `client/tests/sprint4.test.ts:306`
- Verifica, passo a passo, as notificações do autor (João):
  - submeter, triar e confirmar: nenhuma;
  - aprovar: uma, "Pedido aprovado" (NOT-5);
  - priorizar: nenhuma nova;
  - começar o trabalho: o autor e o gestor de projeto são notificados (NOT-8);
  - marcar como duplicado: a mensagem indica o código do pedido original (NOT-4).
- Fonte: NOT-3 a NOT-9 (p. 39); DUP-4 (p. 41).

### 1.6 Conclusão e IA

**US25 CA2: concluir sem nota mostra a mensagem do documento e não conclui**

- Ficheiro: `client/tests/sprint4.test.ts:278`
- Verifica: concluir com uma nota em branco devolve exatamente "Adicione uma nota com a descrição da resolução" e o pedido continua "Em progresso".
- Fonte: US25, CA2 (p. 29); LIM-9 (p. 44).

**IA-5: a decisão sobre a sugestão da IA fica no histórico como decisão humana**

- Ficheiro: `client/tests/sprint4.test.ts:288`
- Verifica: quando a Marta ajusta a sugestão da IA, o histórico regista "sugestão da IA ajustada (decisão humana do Product Manager)".
- Fonte: IA-4, IA-5 (p. 44); PRI-4 (p. 42); US16 (p. 20).

### 1.7 Produto, tags e dependências

**Dependências circulares, nomes repetidos e eliminações em uso são rejeitados**

- Ficheiro: `client/tests/workflows.test.ts:141`
- Verifica: A depende de B e B de A é recusado (ciclo); criar uma tag com nome repetido (ignorando maiúsculas e espaços) é recusado; apagar uma tag em uso é recusado; renomear uma tag atualiza os pedidos que a usam.
- Fonte: US30 (p. 32); US31 (p. 33).

### 1.8 Migração de dados

**Migração mantém pedidos e versões, retira empresas e categorias e conserva a data real do Workspace**

- Ficheiro: `client/tests/sprint4.test.ts:215`
- Verifica: dados no formato antigo (versão 2) passam à versão 3 sem perder pedidos; empresa e categoria desaparecem; o autor passa a ser o utilizador que submeteu; Workspaces antigos usam a data do pedido (não ganham novos 14 dias); os dados antigos não são alterados.
- Fonte: decisão do grupo no Sprint 4 (empresas e categorias saíram do modelo), descrita em `REFERENCIAS_SPRINT4.md`; WRK-8 (p. 42).

---

## 2. Testes da base de dados e da API: `bd/testes/` (15)

`bd.test.ts` arranca um **MongoDB 8 temporário em memória** (`mongodb-memory-server`), aplica o esquema e liga o servidor HTTP real numa porta livre. Os pedidos são feitos com `fetch`, como o navegador. No fim, tudo é apagado. Os testes correm por ordem e partilham a mesma base de dados.

### 2.1 Fidelidade ao Diagrama de Classes: `bd/testes/diagrama.test.ts` (3)

Estes 3 testes não precisam de MongoDB. O ficheiro tem uma cópia do diagrama (classe, atributo, tipo e enumerações) e compara-a com `bd/esquema.ts`.

**As enumerações têm exatamente os valores do diagrama**

- Ficheiro: `bd/testes/diagrama.test.ts:98`
- Verifica: cada enum (por exemplo `EstadoPedido`, `Nivel`) tem os mesmos valores, pela mesma ordem.
- Fonte: Diagrama de Classes (Miro); `bd/BASE_DADOS.md`, "Do diagrama de classes para o MongoDB".

**Cada classe do diagrama tem a sua coleção, com o mesmo nome**

- Ficheiro: `bd/testes/diagrama.test.ts:103`
- Verifica: há uma coleção por classe; `Utilizador` é abstrata, por isso há uma coleção por subclasse (`Cliente`, `GestorDeProjeto`, `ProductManager`, `Developer`).
- Fonte: Diagrama de Classes (Miro); `bd/BASE_DADOS.md`.

**Cada atributo do diagrama existe com o mesmo nome e o mesmo tipo**

- Ficheiro: `bd/testes/diagrama.test.ts:109`
- Verifica: cada atributo existe no validador da coleção com o tipo BSON correspondente (`int`, `String`, `Date`...) ou com os valores do enum.
- Fonte: Diagrama de Classes (Miro); `bd/BASE_DADOS.md`.

### 2.2 Esquema e validação: `bd/testes/bd.test.ts`

**A conversão entre o estado do programa e os documentos não perde dados**

- Ficheiro: `bd/testes/bd.test.ts:123`
- Verifica: converter os dados para documentos MongoDB e de volta dá exatamente o mesmo resultado.
- Fonte: `bd/BASE_DADOS.md`, "Como funciona" (`bd/mapeamento.ts`).

**O esquema cria uma coleção por classe do diagrama e aceita os dados de exemplo**

- Ficheiro: `bd/testes/bd.test.ts:130`
- Verifica: as coleções criadas são as do diagrama mais `Sessao`; os dados de exemplo são gravados e lidos sem perdas; os atributos usam os nomes do diagrama (`estado: 'Atribuido'`, `dataCriacao` como data, `impacto`, `esforco`, `prioridade`); aplicar o esquema outra vez não apaga dados.
- Fonte: Diagrama de Classes (Miro); `bd/BASE_DADOS.md`.

**A validação recusa dados fora das regras**

- Ficheiro: `bd/testes/bd.test.ts:179`
- Verifica, no próprio MongoDB (`$jsonSchema` e índices únicos): estados fora do enum; título com mais de 100 carateres; `id` repetido ou fora do formato `P-053`; nível fora de Alto/Medio/Baixo; um segundo sprint ativo; dois votos do mesmo cliente no mesmo pedido.
- Fonte: Diagrama de Classes; SPR-3 (p. 43); US4 (p. 13); LIM-6 (p. 44); PRI-5 (p. 42).

**A validação protege as passwords e as sessões**

- Ficheiro: `bd/testes/bd.test.ts:224`
- Verifica: uma password em texto simples é recusada (só o hash `scrypt`); uma sessão sem data de fim é recusada; existe um índice TTL que apaga sessões expiradas.
- Fonte: RNF-2 Segurança (p. 45); `bd/BASE_DADOS.md`, "Autenticação".

### 2.3 API e regras no servidor

**A API devolve o estado e só o reenvia quando muda**

- Ficheiro: `bd/testes/bd.test.ts:243`
- Verifica: sem sessão a resposta é 401; com sessão devolve os dados; se nada mudou desde a revisão pedida responde 204 (sem corpo); a resposta nunca inclui hashes de passwords; `/api/saude` responde e rotas inexistentes dão 404.
- Fonte: RNF-1 Desempenho e RNF-2 Segurança (p. 45).

**As regras do programa são aplicadas no servidor e nada é gravado quando falham**

- Ficheiro: `bd/testes/bd.test.ts:264`
- Verifica: a Ana (developer) não consegue submeter um pedido, mesmo que o corpo diga que é o João, porque o utilizador vem sempre da sessão; sem sessão é 401; comandos inválidos dão 400; a revisão da base de dados não muda.
- Fonte: ACE-6 e ACE-7 (p. 38).

**Percurso completo dos quatro perfis, com todas as operações gravadas no MongoDB**

- Ficheiro: `bd/testes/bd.test.ts:294`
- Verifica, através da API e confirmando cada passo nas coleções: cliente (submeter, editar, votar, convidar, comentar, ficheiros; o Workspace só existe quando alguém aceita o convite); gestor (triar, devolver, confirmar, duplicado); Product Manager (decidir, priorizar, tags, user story, release, dependências); gestor e developer (sprint, atribuição, trabalho, conclusão). Os códigos dos pedidos seguem a sequência (`P-054`).
- Fonte: US1 a US33 (p. 11 a 35), em especial US2 CA2 (p. 12); regras ORD (p. 37).

**A base de dados pode ser vista no navegador, só pela equipa interna e sem passwords**

- Ficheiro: `bd/testes/bd.test.ts:589`
- Verifica: `/api/bd` dá 401 sem sessão e 403 a um cliente; a Marta vê as coleções e os documentos, sem hashes de passwords; a coleção `Sessao` não é exposta (404).
- Fonte: ACE-2 (p. 38); RNF-2 e RNF-3 (p. 45); `bd/BASE_DADOS.md`, "Ver os dados em tempo real".

**O adaptador do programa lê e grava através da API**

- Ficheiro: `bd/testes/bd.test.ts:609`
- Verifica: o repositório HTTP usado pelo frontend carrega os dados, submete um pedido que fica gravado no MongoDB e avisa os ecrãs; erros de perfil chegam com a mensagem do servidor; sem sessão avisa que a sessão terminou; ao sair os dados são esquecidos; sem servidor mostra "Sem ligação ao servidor".
- Fonte: arquitetura cliente/servidor (`GUIA_CODIGO.md`); RNF-3 Privacidade (p. 45).

### 2.4 Autenticação

**Registo: só cria clientes, guarda apenas o hash e recusa emails repetidos**

- Ficheiro: `bd/testes/bd.test.ts:670`
- Verifica: mesmo pedindo outro perfil, o registo cria um `Cliente`; o email fica em minúsculas; a password fica só como hash `scrypt`; email repetido dá 409; dados inválidos dão erros por campo.
- Fonte: ACE-6 (p. 38); RNF-2 Segurança (p. 45); `bd/BASE_DADOS.md`, "Autenticação".

**Início e fim de sessão: palavra-passe certa, cookie HttpOnly e sessão terminada**

- Ficheiro: `bd/testes/bd.test.ts:717`
- Verifica: a mensagem de erro é a mesma para password errada e email inexistente (não revela contas); o cookie é `HttpOnly` e `SameSite=Lax`; um cliente novo pode submeter logo; depois de sair, a sessão deixa de valer (401).
- Fonte: RNF-2 Segurança (p. 45); `bd/BASE_DADOS.md`, "Autenticação".

**Repor volta aos dados de exemplo e apaga as contas registadas**

- Ficheiro: `bd/testes/bd.test.ts:771`
- Verifica: o mesmo que `npm run bd:repor`: volta aos dados de exemplo, apaga contas registadas, as contas de exemplo voltam a entrar com a palavra-passe inicial, as sessões antigas terminam e já não existe a rota `/api/repor`.
- Fonte: `bd/BASE_DADOS.md`, "Como usar".

---

## Resumo por tema

- Percurso e sprints: 3 testes do programa + 1 da BD.
- Edição, versões e votos: 3.
- Pedidos semelhantes: 3.
- Workspace e convites: 6.
- Comentários e notificações: 2.
- Conclusão e IA: 2.
- Produto, tags e dependências: 1.
- Migração: 1.
- Diagrama de Classes: 3 + 2 (esquema e conversão).
- Validação e segurança da BD: 2.
- API e servidor: 4.
- Autenticação: 3.

Total: 21 + 15 = **36**.

---

## Perguntas prováveis na defesa

**Que tipo de testes são?**
Os 21 de `npm test` são testes unitários e de regras de negócio sobre o domínio e o `reducer`. Os 15 de `npm run test:bd` são testes de integração: usam um MongoDB real (temporário) e o servidor HTTP real. Não temos testes de interface (end-to-end no navegador).

**Qual é a cobertura de código?**
Não está medida. O RNF-09 (cobertura de 70%) não é verificado por nenhuma ferramenta. Os testes foram escritos a partir das regras e das user stories, não a partir de uma percentagem. Seria possível medir com `node --test --experimental-test-coverage` ou com o `c8`.

**Porque é que o servidor também valida as regras?**
Por causa da ACE-7: o backend valida todas as regras, mesmo que a interface já as valide. O teste `bd.test.ts:264` prova que uma developer não submete pedidos mesmo a enviar o pedido à mão em nome do João.

**Como garantem que a base de dados segue o Diagrama de Classes?**
O `diagrama.test.ts` tem uma cópia das classes, atributos, tipos e enums do diagrama do Miro e compara-a com o esquema. Se alguém mudar um nome ou um tipo, o teste falha.

**Porque usar um MongoDB em memória?**
Os testes não dependem de uma base de dados instalada e não estragam dados reais. Cada execução começa do zero, igual no portátil e no GitHub Actions.

**Os testes correm sozinhos?**
Sim. O GitHub Actions corre formatação, os 36 testes e o build em cada push para `main` e em cada pull request (RNF-8).

**Como sabem que um teste corresponde a um requisito?**
O nome do teste diz a regra e, quando existe, o identificador do documento (US4, US25 CA2, IA-5, NOT-3 a NOT-9). Este ficheiro liga cada teste à página do documento de requisitos.

**O que fica por testar?**
A interface React (ecrãs), as notificações em tempo real (NOT-11), a IA real (é simulada) e a cobertura de código. Também há regras conhecidas por corrigir: as notificações ao gestor estão fixas no utilizador "jose" e o estado "Confirmado" ainda pode ser aceite a partir de "Submetido".
