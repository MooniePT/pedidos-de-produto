import { useState } from 'react';
import { Actions, Button, Card, Form, Heading } from '../../components';
import { useApp } from '../../state';

/** US26: guarda a preferência de notificações. */
export function Preferences() {
  const { user, act } = useApp();
  const [value, setValue] = useState(user?.preference || 'relevant');

  return (
    <>
      <Heading title="Preferências de notificação">
        Escolha as notificações que pretende acompanhar.
      </Heading>

      <Form
        onSubmit={() =>
          void act({ type: 'configurarNotificacoes', value }, 'Alterações guardadas com sucesso')
        }
      >
        <Card title="Notificações">
          <label className="check">
            <input
              type="radio"
              name="notifications"
              checked={value === 'relevant'}
              onChange={() => setValue('relevant')}
            />
            Apenas menções diretas e alterações às tarefas
          </label>

          <label className="check">
            <input
              type="radio"
              name="notifications"
              checked={value === 'all'}
              onChange={() => setValue('all')}
            />
            Todas as notificações
          </label>
        </Card>

        <Actions>
          <Button type="submit">Guardar preferências</Button>
        </Actions>
      </Form>
    </>
  );
}
