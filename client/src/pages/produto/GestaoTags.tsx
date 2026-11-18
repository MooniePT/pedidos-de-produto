import { useState } from 'react';
import { Actions, Button, Card, Confirm, Field, Form, Heading, Table } from '../../components';
import { useApp } from '../../state';

/** US31: criação e manutenção de tags, incluindo validação de nomes repetidos e utilização em pedidos. */
export function Taxonomy() {
  const { db, act } = useApp();
  const [name, setName] = useState('');
  const [previous, setPrevious] = useState('');
  const [remove, setRemove] = useState('');

  return (
    <>
      <Heading title="Gerir tags">
        Organize os pedidos com etiquetas disponíveis na pesquisa.
      </Heading>

      <Card title="Tags">
        <Form
          onSubmit={() =>
            void act(
              { type: 'gerirTags', kind: 'tags', op: previous ? 'edit' : 'create', name, previous },
              'Tag guardada.',
            ).then((a) => {
              if (a.ok) {
                setName('');
                setPrevious('');
              }
            })
          }
        >
          <Field
            label={previous ? 'Editar tag' : 'Nome da tag *'}
            value={name}
            onChange={setName}
            required
            maxLength={50}
          />

          <Actions>
            <Button type="submit">{previous ? 'Guardar nome' : 'Criar tag'}</Button>

            {previous && (
              <Button
                kind="secondary"
                onClick={() => {
                  setPrevious('');
                  setName('');
                }}
              >
                Cancelar
              </Button>
            )}
          </Actions>
        </Form>

        <Table head={['Tag', 'Pedidos', 'Ações']}>
          {db.tags.map((tag) => (
            <tr key={tag}>
              <td>{tag}</td>
              <td>{db.requests.filter((pedido) => pedido.tags.includes(tag)).length}</td>

              <td>
                <Actions>
                  <Button
                    kind="text-button"
                    onClick={() => {
                      setName(tag);
                      setPrevious(tag);
                    }}
                  >
                    Editar
                  </Button>

                  <Button kind="text-button" onClick={() => setRemove(tag)}>
                    Eliminar
                  </Button>
                </Actions>
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      {remove && (
        <Confirm
          title={'Eliminar ' + remove + '?'}
          onClose={() => setRemove('')}
          onConfirm={() =>
            void act(
              { type: 'gerirTags', kind: 'tags', op: 'delete', name: remove },
              'Tag eliminada.',
            ).then((a) => {
              if (a.ok) setRemove('');
            })
          }
        >
          <p>Só é possível eliminar uma tag que não esteja em uso.</p>
        </Confirm>
      )}
    </>
  );
}
