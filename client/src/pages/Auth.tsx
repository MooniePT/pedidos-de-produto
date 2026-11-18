/** Entrada no programa: iniciar sessão, criar conta de cliente e recuperar a palavra-passe. */
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button, Card, Check, Field, Form } from '../components';
import { ErroApi } from '../services/api';
import { registar } from '../services/autenticacao';
import { useApp } from '../state';

type Modo = 'login' | 'register' | 'recover';

type Erros = Partial<Record<'nome' | 'email' | 'palavraPasse', string>>;

/** Validação junto ao campo, antes de enviar (o servidor volta a validar tudo). */
function validar(modo: Modo, nome: string, email: string, palavraPasse: string): Erros {
  const erros: Erros = {};

  if (modo === 'register' && !nome.trim()) erros.nome = 'Indique um nome de utilizador.';

  if (!email.trim()) {
    erros.email = 'Indique o email.';
  } else if (modo !== 'login' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    erros.email = 'Indique um email válido (ex.: nome@empresa.pt).';
  }

  if (modo === 'login' && !palavraPasse) erros.palavraPasse = 'Indique a palavra-passe.';

  if (modo === 'register' && palavraPasse.length < 8) {
    erros.palavraPasse = 'Indique uma palavra-passe com pelo menos 8 caracteres.';
  }

  return erros;
}

export function Auth() {
  const { user, login } = useApp();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Modo>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [accept, setAccept] = useState(false);
  const [erros, setErros] = useState<Erros>({});
  const [feedback, setFeedback] = useState<{ texto: string; erro: boolean } | null>(null);
  const [aEnviar, setAEnviar] = useState(false);

  // Depois de entrar, segue para o convite que estava a ser aceite ou para a área de trabalho.
  const seguinte = new URLSearchParams(location.search).get('continuar');
  const destino = seguinte?.startsWith('/convite?token=') ? seguinte : '/app';

  if (user) return <Navigate to={destino} replace />;

  function mudarModo(novo: Modo) {
    setMode(novo);
    setErros({});
    setFeedback(null);
    setPassword('');
  }

  async function submit() {
    setFeedback(null);

    const novosErros = validar(mode, name, email, password);

    setErros(novosErros);

    if (Object.keys(novosErros).length) return;

    if (mode === 'recover') {
      setFeedback({
        texto:
          'O envio de emails de recuperação ainda não está disponível. Contacte a equipa do produto para repor a palavra-passe.',
        erro: false,
      });

      return;
    }

    setAEnviar(true);

    try {
      if (mode === 'login') {
        await login(email.trim(), password);
        navigate(destino, { replace: true });
      } else {
        await registar(name.trim(), email.trim(), password);

        // Conta criada: volta ao início de sessão com o email já preenchido.
        mudarModo('login');
        setFeedback({ texto: 'Conta criada. Já pode iniciar sessão.', erro: false });
      }
    } catch (erro) {
      // Erros de um campo (por exemplo, email já registado) aparecem só junto desse campo.
      if (erro instanceof ErroApi && Object.keys(erro.erros).length) {
        setErros(erro.erros);

        return;
      }

      setFeedback({
        texto: erro instanceof Error ? erro.message : 'Não foi possível concluir a operação.',
        erro: true,
      });
    } finally {
      setAEnviar(false);
    }
  }

  return (
    <div className="auth-page">
      <header className="auth-header">
        <img src="/assets/4c665.png" width="40" height="40" alt="" />
        <strong>Pedidos de produto</strong>
      </header>

      <div className="auth-grid">
        <section className="auth-hero">
          <span className="hero-eyebrow">
            <img src="/assets/20603.svg" alt="" /> GESTÃO DE PEDIDOS DE PRODUTO
          </span>

          <h1>Do pedido ao roadmap.</h1>

          <p>
            Submeta ideias, acompanhe a triagem e veja cada pedido avançar até ao sprint e à
            release.
          </p>

          <ol className="hero-flow">
            {['Pedido', 'Triagem', 'Sprint', 'Release'].map((s, i) => (
              <li key={s}>
                <img
                  src={'/assets/' + (i === 2 ? '7d6c5.svg' : i === 3 ? '648c1.svg' : '5d96a.svg')}
                  alt=""
                />
                <span>{s}</span>
              </li>
            ))}
          </ol>

          <div className="hero-request">
            P-041 · Pesquisa de ferramentas <span>Em triagem</span>
          </div>

          <div className="hero-request">
            P-038 · Atalhos de teclado <span className="amber">Priorizado</span>
          </div>
        </section>

        <section className="auth-form">
          <Card>
            <h1>
              {mode === 'login'
                ? 'Iniciar sessão'
                : mode === 'register'
                  ? 'Criar conta'
                  : 'Recuperar palavra-passe'}
            </h1>

            <p className="muted">
              {mode === 'login'
                ? 'Introduza os seus dados de acesso.'
                : mode === 'register'
                  ? 'Registe os seus dados para apresentar e acompanhar pedidos.'
                  : 'Indique o email associado à sua conta.'}
            </p>

            <Form onSubmit={() => void submit()}>
              {mode === 'register' && (
                <Field
                  label="Nome de utilizador *"
                  value={name}
                  onChange={setName}
                  maxLength={100}
                  autoComplete="name"
                  error={erros.nome}
                />
              )}

              <Field
                label="Email *"
                type="email"
                value={email}
                onChange={setEmail}
                autoComplete="email"
                error={erros.email}
              />

              {mode !== 'recover' && (
                <Field
                  label="Palavra-passe *"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  error={erros.palavraPasse}
                />
              )}

              {mode === 'register' && (
                <>
                  <p className="small muted">Use pelo menos 8 caracteres na palavra-passe.</p>

                  <Check
                    checked={accept}
                    onChange={setAccept}
                    label="Confirmo os dados introduzidos."
                  />
                </>
              )}

              <Button type="submit" disabled={aEnviar || (mode === 'register' && !accept)}>
                {mode === 'login'
                  ? 'Iniciar sessão'
                  : mode === 'register'
                    ? 'Criar conta'
                    : 'Enviar pedido'}
              </Button>

              {feedback && (
                <div
                  className={feedback.erro ? 'notice notice-error' : 'notice'}
                  role={feedback.erro ? 'alert' : 'status'}
                >
                  {feedback.texto}
                </div>
              )}
            </Form>

            <div className="auth-links">
              {mode === 'login' ? (
                <>
                  <p>
                    Esqueceu-se da palavra-passe?{' '}
                    <button className="inline-button" onClick={() => mudarModo('recover')}>
                      Recuperar palavra-passe
                    </button>
                  </p>

                  <p>
                    Ainda não tem conta?{' '}
                    <button className="inline-button" onClick={() => mudarModo('register')}>
                      Registar
                    </button>
                  </p>
                </>
              ) : (
                <button className="inline-button" onClick={() => mudarModo('login')}>
                  Voltar ao início de sessão
                </button>
              )}
            </div>
          </Card>
        </section>
      </div>

      <footer className="auth-footer">
        Uma plataforma. Toda a equipa. <Link to="/convite">Aceitar um convite</Link>
      </footer>
    </div>
  );
}
