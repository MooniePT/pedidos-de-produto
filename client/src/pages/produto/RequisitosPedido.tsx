import { useState } from 'react';
import { Actions, Area, Button, Card, Form, Select } from '../../components';
import { type DecisaoIA, type Request } from '../../domain';
import { useApp } from '../../state';

/** US19 e US22: edição da user story e dos critérios antes da implementação começar. */
export function Requirements({ request: pedido }: { request: Request }) {
  const { act } = useApp();
  const [story, setStory] = useState(pedido.story);
  const [criteria, setCriteria] = useState(pedido.criteria.length ? pedido.criteria : ['']);
  const [ai, setAi] = useState('');
  const [mode, setMode] = useState('available');
  // IA-5: guarda o que a Marta fez com a user story sugerida (aceitar, ajustar ou rejeitar).
  const [decisaoIA, setDecisaoIA] = useState<DecisaoIA | undefined>();
  // US22 CA6: só se pode gerar uma user story se o pedido ainda não tiver uma guardada.
  const jaTemUserStory = !!pedido.story.trim();

  const sugestao = `Como utilizador, pretendo ${pedido.title.toLowerCase()}, para trabalhar de forma mais eficiente.`;

  function gerarSugestao() {
    setAi(jaTemUserStory ? 'duplicate' : mode);
  }

  // Se a Marta editar o texto depois de aceitar a sugestão, passa a ser uma sugestão ajustada.
  function alterarStory(texto: string) {
    setStory(texto);
    if (decisaoIA === 'aceite') setDecisaoIA('ajustada');
  }
  const allowed = ['Aprovado', 'Priorizado', 'Atribuído'].includes(pedido.status);

  return (
    <Form
      onSubmit={() =>
        void act(
          { type: 'definirCriteriosAceitacao', id: pedido.id, story, criteria, decisaoIA },
          'Requisitos guardados.',
        )
      }
    >
      <Card title="User story">
        <Area
          label="Descrição *"
          value={story}
          onChange={alterarStory}
          maxLength={1000}
          required
          disabled={!allowed}
        />

        {allowed && (
          <>
            <p className="demo-note">Geração simulada para testar a revisão de sugestões.</p>

            <Select
              label="Cenário de geração"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'available', label: 'Sugestão disponível' },
                { value: 'insufficient', label: 'Informação insuficiente' },
                { value: 'error', label: 'Serviço indisponível' },
              ]}
            />

            <Actions>
              <Button kind="secondary" onClick={gerarSugestao}>
                Gerar sugestão de user story
              </Button>
            </Actions>

            {ai === 'available' ? (
              <div className="suggestion">
                <p>{sugestao}</p>

                <Actions>
                  <Button
                    kind="secondary"
                    onClick={() => {
                      setStory(sugestao);
                      setDecisaoIA('aceite');
                      setAi('');
                    }}
                  >
                    Aceitar sugestão
                  </Button>

                  <Button
                    kind="secondary"
                    onClick={() => {
                      setStory(sugestao);
                      setDecisaoIA('ajustada');
                      setAi('');
                    }}
                  >
                    Ajustar sugestão
                  </Button>

                  <Button
                    kind="text-button"
                    onClick={() => {
                      setDecisaoIA('rejeitada');
                      setAi('');
                    }}
                  >
                    Rejeitar sugestão
                  </Button>
                </Actions>
              </div>
            ) : (
              ai && (
                <div className="notice" role="status">
                  {ai === 'duplicate'
                    ? 'Este pedido já tem uma user story associada'
                    : ai === 'insufficient'
                      ? 'Informação insuficiente para gerar a user story. Pode escrevê-la manualmente.'
                      : 'Serviço de geração indisponível. Pode escrevê-la manualmente.'}
                </div>
              )
            )}
          </>
        )}
      </Card>

      {decisaoIA && (
        <p className="small muted" role="status">
          Sugestão da IA {decisaoIA}. Fica registado no histórico ao guardar.
        </p>
      )}

      <Card title="Critérios de aceitação">
        {criteria.map((criterion, index) => (
          <div className="criterion" key={index}>
            <Area
              label={`Critério ${index + 1} *`}
              value={criterion}
              onChange={(v) => setCriteria(criteria.map((c, i) => (i === index ? v : c)))}
              maxLength={1000}
              required
              disabled={!allowed}
            />

            {allowed && criteria.length > 1 && (
              <Button
                kind="text-button"
                onClick={() => setCriteria(criteria.filter((_, i) => i !== index))}
              >
                Remover critério {index + 1}
              </Button>
            )}
          </div>
        ))}

        {allowed && (
          <Actions>
            <Button kind="secondary" onClick={() => setCriteria([...criteria, ''])}>
              Adicionar critério
            </Button>
          </Actions>
        )}
      </Card>

      <Actions>
        <Button type="submit" disabled={!allowed}>
          Guardar requisitos
        </Button>
      </Actions>
    </Form>
  );
}
