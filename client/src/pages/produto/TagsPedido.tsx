import { useState } from 'react';
import { Actions, Button, Card, Check, Form } from '../../components';
import { type Request } from '../../domain';
import { useApp } from '../../state';

/** US31: atribui tags existentes ao pedido. Não existem categorias neste modelo. */
export function Classify({ request: pedido }: { request: Request }) {
  const { db, act } = useApp();
  const [tags, setTags] = useState(pedido.tags);

  return (
    <Form
      onSubmit={() => void act({ type: 'atribuirTags', id: pedido.id, tags }, 'Tags guardadas.')}
    >
      <Card title="Tags">
        <div className="checks">
          {db.tags.map((tag) => (
            <Check
              key={tag}
              label={tag}
              checked={tags.includes(tag)}
              onChange={(checked) =>
                setTags(checked ? [...tags, tag] : tags.filter((t) => t !== tag))
              }
            />
          ))}
        </div>
      </Card>

      <Actions>
        <Button type="submit">Guardar tags</Button>
      </Actions>
    </Form>
  );
}
