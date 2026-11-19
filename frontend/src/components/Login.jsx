import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
  const [valores, setValores] = useState({ email: '', senha: '' });
  const [erros, setErros] = useState({});
  const [erroServidor, setErroServidor] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (carregando) return null;
  if (token) return <Navigate to="/" replace />;

  const alterar = (campo) => (evento) => {
    setValores((atual) => ({ ...atual, [campo]: evento.target.value }));
    setErros((atual) => ({ ...atual, [campo]: undefined }));
  };

  const enviar = async (evento) => {
    evento.preventDefault();
    const encontrados = validar(valores);
    setErros(encontrados);
    if (Object.keys(encontrados).length) return;

    setEnviando(true);
    setErroServidor('');
    try {
      await login(valores.email.trim(), valores.senha);
    } catch (erro) {
      setErroServidor(erro.response?.data?.erro ?? MENSAGEM_PADRAO);
      setEnviando(false);
    }
  };

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
        ) : state?.contaCriada ? (
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
