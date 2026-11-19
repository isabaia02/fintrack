import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFormulario } from '../hooks/useFormulario';
import { emailValido } from '../utils/validacoes';
import CartaoAuth from './layout/CartaoAuth';
import { Aviso } from './ui/aviso';
import { Button } from './ui/button';
import { Campo } from './ui/campo';
import { Input } from './ui/input';
import { InputSenha } from './ui/input-senha';

const MENSAGEM_PADRAO = 'Não foi possível entrar. Tente novamente.';

function validar({ email, senha }) {
  const erros = {};
  if (!email.trim()) erros.email = 'Informe o e-mail.';
  else if (!emailValido(email)) erros.email = 'Informe um e-mail válido.';
  if (!senha) erros.senha = 'Informe a senha.';
  return erros;
}

export default function Login() {
  const { token, carregando, sessaoExpirada, login } = useAuth();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [contaCriada] = useState(Boolean(state?.contaCriada));
  const { valores, erros, erroServidor, enviando, alterar, enviar } = useFormulario({
    valoresIniciais: { email: '', senha: '' },
    validar,
    aoEnviar: ({ email, senha }) => login(email.trim(), senha),
    mensagemPadrao: MENSAGEM_PADRAO,
  });

  useEffect(() => {
    if (contaCriada) navigate('/login', { replace: true, state: null });
  }, [contaCriada, navigate]);

  if (carregando) return null;
  if (token) return <Navigate to="/" replace />;

  return (
    <CartaoAuth
      titulo="Entrar"
      subtitulo="Acesse sua conta para ver o resumo do mês."
      rodape={
        <>
          Não tem conta?{' '}
          <Link to="/cadastro" className="font-medium text-primary">Criar conta</Link>
        </>
      }
    >
      <form onSubmit={enviar} noValidate className="flex flex-col gap-6">
        {erroServidor ? (
          <Aviso tom="erro">{erroServidor}</Aviso>
        ) : contaCriada ? (
          <Aviso tom="sucesso">Conta criada. Entre para começar.</Aviso>
        ) : sessaoExpirada ? (
          <Aviso tom="info">Sua sessão expirou. Entre novamente.</Aviso>
        ) : null}
        <Campo label="E-mail" erro={erros.email}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="nome@email.com"
            value={valores.email}
            onChange={alterar('email')}
            autoFocus
          />
        </Campo>
        <Campo label="Senha" erro={erros.senha}>
          <InputSenha
            autoComplete="current-password"
            placeholder="Sua senha"
            value={valores.senha}
            onChange={alterar('senha')}
          />
        </Campo>
        <Button type="submit" carregando={enviando} className="w-full">Entrar</Button>
      </form>
    </CartaoAuth>
  );
}
