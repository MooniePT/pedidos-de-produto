import { Badge, Card, Empty, Heading, Stats, Table, date } from '../../components';
import { type Status } from '../../domain';
import { useApp } from '../../state';

// Estados de um pedido que já foi aprovado pela Product Manager (inclui os que avançaram depois).
const APROVADOS: Status[] = ['Aprovado', 'Priorizado', 'Atribuído', 'Em progresso', 'Concluído'];

/**
 * US18: calcula as métricas do documento a partir dos pedidos (não há valores fixos).
 * CA1: nº de pedidos, aprovados vs. rejeitados, features por release, lead time, cycle time,
 * carga da equipa e progresso do roadmap. CA2: sem pedidos, "Sem métricas disponíveis".
 * CA3: cada métrica sem dados mostra "Sem dados".
 */
export function Metrics() {
  const { db } = useApp();
  const requests = db.requests;
  const completed = requests.filter((r) => r.completedAt);

  // As médias usam apenas registos com datas disponíveis.
  const mean = (values: number[]) =>
    values.length
      ? (values.reduce((a, b) => a + b, 0) / values.length).toLocaleString('pt-PT', {
          maximumFractionDigits: 1,
        }) + ' dias'
      : 'Sem dados';

  const days = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86400000;

  // US18 CA2: sem pedidos não há dados para nenhuma métrica.
  if (!requests.length) {
    return (
      <>
        <Heading title="Métricas de produto" />
        <Card>
          <Empty title="Sem métricas disponíveis" />
        </Card>
      </>
    );
  }

  // Aprovados vs. rejeitados.
  const aprovados = requests.filter((r) => APROVADOS.includes(r.status)).length;
  const rejeitados = requests.filter((r) => r.status === 'Rejeitado').length;
  const decididos = aprovados + rejeitados;
  // A percentagem dos rejeitados é o resto, para as duas somarem sempre 100%.
  const pctAprovados = decididos ? Math.round((aprovados / decididos) * 100) : 0;
  const percentagem = (n: number) => (n === aprovados ? pctAprovados : 100 - pctAprovados) + '%';

  // Features por release e progresso do roadmap.
  const releases = db.releases.map((release) => {
    const pedidos = requests.filter((r) => release.requestIds.includes(r.id));

    return {
      release,
      planeadas: pedidos.length,
      concluidas: pedidos.filter((r) => r.status === 'Concluído').length,
    };
  });

  const planeadas = releases.reduce((total, r) => total + r.planeadas, 0);
  const concluidas = releases.reduce((total, r) => total + r.concluidas, 0);

  return (
    <>
      <Heading title="Métricas de produto">
        Indicadores calculados a partir de todos os pedidos · todo o período.
      </Heading>

      <Card title="Visão geral">
        <Stats
          items={[
            { label: 'Pedidos submetidos', value: requests.length },
            { label: 'Pedidos concluídos', value: completed.length },
            {
              label: 'Progresso do roadmap',
              value: planeadas ? `${concluidas} / ${planeadas}` : 'Sem dados',
              hint: planeadas
                ? `${Math.round((concluidas / planeadas) * 100)}% das features planeadas concluídas`
                : undefined,
            },
          ]}
        />
      </Card>

      <Card title="Aprovados vs. rejeitados">
        {decididos ? (
          <>
            <Stats
              items={[
                { label: 'Aprovados', value: aprovados, hint: percentagem(aprovados) },
                { label: 'Rejeitados', value: rejeitados, hint: percentagem(rejeitados) },
              ]}
            />

            {/* Barra com a proporção; o texto acima dá os mesmos valores sem depender da cor. */}
            <div
              className="metric-bar"
              role="img"
              aria-label={`Aprovados ${percentagem(aprovados)}, rejeitados ${percentagem(rejeitados)}`}
            >
              <span className="metric-bar-ok" style={{ width: percentagem(aprovados) }} />
              <span className="metric-bar-ko" style={{ width: percentagem(rejeitados) }} />
            </div>

            <p className="small muted">
              Aprovados inclui os pedidos que já avançaram depois da aprovação (priorizados,
              atribuídos, em progresso e concluídos).
            </p>
          </>
        ) : (
          <p className="muted">Sem dados</p>
        )}
      </Card>

      <Card title="Features por release">
        {releases.length ? (
          <Table head={['Release', 'Data prevista', 'Features planeadas', 'Concluídas']}>
            {releases.map(({ release, planeadas, concluidas }) => (
              <tr key={release.id}>
                <td>{release.name}</td>
                <td>{release.date ? date(release.date) : '—'}</td>
                <td>{planeadas}</td>
                <td>{concluidas}</td>
              </tr>
            ))}
          </Table>
        ) : (
          <p className="muted">Sem dados</p>
        )}
      </Card>

      <Card title="Tempo e carga da equipa">
        <Table head={['Indicador', 'Valor']}>
          <tr>
            <td>Lead time (da submissão à conclusão)</td>
            <td>{mean(completed.map((r) => days(r.date, r.completedAt)))}</td>
          </tr>

          <tr>
            <td>Cycle time (do início do trabalho à conclusão)</td>
            <td>
              {mean(
                completed.filter((r) => r.startedAt).map((r) => days(r.startedAt, r.completedAt)),
              )}
            </td>
          </tr>

          {db.users
            .filter((utilizador) => utilizador.role === 'developer')
            .map((utilizador) => (
              <tr key={utilizador.id}>
                <td>Pedidos ativos atribuídos a {utilizador.name}</td>
                <td>
                  {
                    requests.filter(
                      (r) =>
                        r.assignee === utilizador.id &&
                        ['Atribuído', 'Em progresso'].includes(r.status),
                    ).length
                  }
                </td>
              </tr>
            ))}
        </Table>

        <p className="small muted">
          Os tempos usam apenas pedidos concluídos com datas registadas. A carga da equipa exclui
          pedidos concluídos.
        </p>
      </Card>

      <Card title="Distribuição por estado">
        <Table head={['Estado', 'Pedidos']}>
          {[...new Set(requests.map((r) => r.status))].map((s) => (
            <tr key={s}>
              <td>
                <Badge status={s} />
              </td>
              <td>{requests.filter((r) => r.status === s).length}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
