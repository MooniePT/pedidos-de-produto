import { useState } from 'react';
import { Actions, Button, Card, Form, Select } from '../../components';
import { type DecisaoIA, type Request } from '../../domain';
import { useApp } from '../../state';

/** US16 e US21: permite a decisão manual de prioridade e a revisão de uma sugestão simulada. */
export function Prioritize({ request: pedido }: { request: Request }) {
  const { act } = useApp();
  const [impact, setImpact] = useState(pedido.impact || '');
  const [effort, setEffort] = useState(pedido.effort || '');
  const [priority, setPriority] = useState(pedido.priority || '');
  const [suggestion, setSuggestion] = useState('');
  const [aiMode, setAiMode] = useState('available');
  // IA-5: guarda o que a Marta fez com a sugestão (aceitar, ajustar ou rejeitar).
  const [decisaoIA, setDecisaoIA] = useState<DecisaoIA | undefined>();

  const SUGERIDO = { impact: 'Alto', effort: 'Médio', priority: 'Alta' };

  // Se a Marta mudar um valor depois de aceitar a sugestão, passa a ser uma sugestão ajustada.
  function alterarValor(definir: (valor: string) => void) {
    return (valor: string) => {
      definir(valor);
      if (decisaoIA === 'aceite') setDecisaoIA('ajustada');
    };
  }
  const allowed = ['Aprovado', 'Priorizado'].includes(pedido.status);

  return (
    <Form
      onSubmit={() =>
        void act(
          {
            type: 'definirPriorizacao',
            id: pedido.id,
            impact: impact as Request['impact'],
            effort: effort as Request['effort'],
            priority: priority as Request['priority'],
            decisaoIA,
          },
          'Prioridade guardada.',
        )
      }
    >
      <Card title="Priorizar pedido">
        <div className="form-grid">
          <Select
            label="Impacto *"
            value={impact}
            onChange={alterarValor(setImpact)}
            disabled={!allowed}
            required
            options={['', 'Alto', 'Médio', 'Baixo']}
          />

          <Select
            label="Esforço *"
            value={effort}
            onChange={alterarValor(setEffort)}
            disabled={!allowed}
            required
            options={['', 'Alto', 'Médio', 'Baixo']}
          />

          <Select
            label="Prioridade *"
            value={priority}
            onChange={alterarValor(setPriority)}
            disabled={!allowed}
            required
            options={['', 'Alta', 'Média', 'Baixa']}
          />
        </div>

        <p className="muted">A decisão final é sempre do Product Manager.</p>

        {decisaoIA && (
          <p className="small muted" role="status">
            Sugestão da IA {decisaoIA}. Fica registado no histórico ao guardar.
          </p>
        )}
      </Card>

      {allowed && (
        <Card title="Sugestão de priorização">
          <p className="demo-note">
            Sugestão simulada para testar a interface. Não é usada IA nesta demonstração.
          </p>

          <Select
            label="Cenário da sugestão"
            value={aiMode}
            onChange={(v) => {
              setAiMode(v);
              setSuggestion('');
            }}
            options={[
              { value: 'available', label: 'Sugestão disponível' },
              { value: 'empty', label: 'Sem pedidos semelhantes' },
              { value: 'error', label: 'Serviço indisponível' },
            ]}
          />

          <Actions>
            <Button kind="secondary" onClick={() => setSuggestion(aiMode)}>
              Pedir sugestão
            </Button>
          </Actions>

          {suggestion === 'available' ? (
            <>
              <p>
                Impacto: {SUGERIDO.impact} · Esforço: {SUGERIDO.effort} · Prioridade:{' '}
                {SUGERIDO.priority}
              </p>

              <Actions>
                <Button
                  onClick={() => {
                    setImpact(SUGERIDO.impact);
                    setEffort(SUGERIDO.effort);
                    setPriority(SUGERIDO.priority);
                    setDecisaoIA('aceite');
                    setSuggestion('');
                  }}
                >
                  Aceitar sugestão
                </Button>

                <Button
                  kind="secondary"
                  onClick={() => {
                    setImpact(SUGERIDO.impact);
                    setEffort(SUGERIDO.effort);
                    setPriority(SUGERIDO.priority);
                    setDecisaoIA('ajustada');
                    setSuggestion('');
                  }}
                >
                  Ajustar sugestão
                </Button>

                <Button
                  kind="text-button"
                  onClick={() => {
                    setDecisaoIA('rejeitada');
                    setSuggestion('');
                  }}
                >
                  Rejeitar sugestão
                </Button>
              </Actions>
            </>
          ) : (
            suggestion && (
              <div className="notice" role="status">
                {suggestion === 'empty'
                  ? 'Sem pedidos semelhantes para basear a sugestão.'
                  : 'Serviço de sugestões indisponível.'}{' '}
                Pode continuar com a priorização manual.
              </div>
            )
          )}
        </Card>
      )}

      <Actions>
        <Button type="submit" disabled={!allowed}>
          Guardar prioridade
        </Button>
      </Actions>

      {!allowed && (
        <p className="muted">Só é possível priorizar pedidos aprovados ou já priorizados.</p>
      )}
    </Form>
  );
}
