/** Confirma que o esquema da base de dados tem as classes, os atributos, os tipos e os enums do
 * Diagrama de Classes UML Geral (Miro, board "Sprint 3 - Diagramas"). Não precisa do MongoDB. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as esquema from '../esquema';

// Copiado do diagrama: classe -> atributo -> tipo.
const DIAGRAMA: Record<string, Record<string, string>> = {
  Utilizador: { id: 'int', nome: 'String', email: 'String', password: 'String' },
  Produto: { id: 'int', nome: 'String' },
  Tag: { id: 'int', nome: 'String' },
  PedidoFuncionalidade: {
    id: 'String',
    titulo: 'String',
    descricao: 'String',
    estado: 'EstadoPedido',
    dataCriacao: 'Date',
    motivo: 'String',
    notaResolucao: 'String',
  },
  VersaoPedido: { numeroVersao: 'int', titulo: 'String', descricao: 'String', dataEdicao: 'Date' },
  HistoricoEstado: { estadoAnterior: 'EstadoPedido', novoEstado: 'EstadoPedido', data: 'Date' },
  Release: { nome: 'String', dataPrevista: 'Date' },
  Milestone: { nome: 'String', data: 'Date' },
  Voto: { data: 'Date' },
  Comentario: { texto: 'String', data: 'Date' },
  Workspace: { nome: 'String', somenteLeitura: 'boolean', dataCriacao: 'Date' },
  ConviteLink: { link: 'String', dataExpiracao: 'Date' },
  Priorizacao: { impacto: 'Nivel', esforco: 'Nivel', prioridade: 'Nivel' },
  SugestaoIA: {
    impacto: 'Nivel',
    esforco: 'Nivel',
    prioridade: 'Nivel',
    decisao: 'DecisaoSugestao',
  },
  UserStory: { texto: 'String', geradaPorIA: 'boolean' },
  CriterioAceitacao: { texto: 'String' },
  LinkCodigo: { url: 'String' },
  Sprint: { id: 'int', dataInicio: 'Date', dataFim: 'Date', estado: 'EstadoSprint' },
  Metrica: { tipo: 'TipoMetrica', valor: 'double' },
  Notificacao: { tipo: 'String', mensagem: 'String', data: 'Date', lida: 'boolean' },
};

// Enumerações do diagrama, com os valores pela mesma ordem.
const ENUMS: Record<string, string[]> = {
  EstadoPedido: [
    'Submetido',
    'EmTriagem',
    'Devolvido',
    'Duplicado',
    'Confirmado',
    'Aprovado',
    'Rejeitado',
    'Priorizado',
    'Atribuido',
    'EmProgresso',
    'Concluido',
  ],
  EstadoSprint: ['Ativo', 'Fechado'],
  Nivel: ['Alto', 'Medio', 'Baixo'],
  DecisaoSugestao: ['Pendente', 'Aceite', 'Ajustada', 'Rejeitada'],
  FiltroNotificacao: ['ApenasMencoesEAlteracoes', 'Todas'],
  TipoMetrica: [
    'PedidosSubmetidos',
    'AprovadosVsRejeitados',
    'FeaturesPorRelease',
    'LeadTime',
    'CycleTime',
    'CargaDaEquipa',
    'ProgressoDoRoadmap',
  ],
};

// Tipo do diagrama -> tipo BSON no validador.
const BSON: Record<string, string> = {
  int: 'int',
  String: 'string',
  Date: 'date',
  boolean: 'bool',
  double: 'double',
};

// Utilizador é abstrata: cada subclasse tem a sua coleção, com os atributos de Utilizador.
const colecoesDe = (classe: string) =>
  classe === 'Utilizador' ? [...esquema.SUBCLASSES_UTILIZADOR] : [classe];

const propriedades = (nome: string) => {
  const colecao = esquema.COLECOES.find((c) => c.nome === nome);

  assert.ok(colecao, `falta a coleção ${nome}`);

  return colecao!.esquema!.properties as Record<
    string,
    { bsonType?: string | string[]; enum?: unknown[] }
  >;
};

test('as enumerações têm exatamente os valores do diagrama', () => {
  for (const [nome, valores] of Object.entries(ENUMS))
    assert.deepEqual([...((esquema as Record<string, unknown>)[nome] as string[])], valores, nome);
});

test('cada classe do diagrama tem a sua coleção, com o mesmo nome', () => {
  const esperadas = Object.keys(DIAGRAMA).flatMap(colecoesDe).sort();

  assert.deepEqual(esquema.COLECOES.map((c) => c.nome).sort(), esperadas);
});

test('cada atributo do diagrama existe com o mesmo nome e o mesmo tipo', () => {
  for (const [classe, atributos] of Object.entries(DIAGRAMA)) {
    for (const nome of colecoesDe(classe)) {
      const props = propriedades(nome);

      for (const [atributo, tipo] of Object.entries(atributos)) {
        const p = props[atributo];

        assert.ok(p, `${nome}.${atributo} não existe`);

        if (ENUMS[tipo]) {
          assert.deepEqual(
            p.enum!.filter((v) => v !== null),
            ENUMS[tipo],
            `${nome}.${atributo}`,
          );
        } else {
          const tipos = [p.bsonType].flat();

          assert.ok(tipos.includes(BSON[tipo]), `${nome}.${atributo}: ${tipos} em vez de ${tipo}`);
        }
      }
    }
  }
});
