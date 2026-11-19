import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { mascararCpf } from '../utils/formatadores';
import { apenasDigitos, emailValido, senhaValida } from '../utils/validacoes';
import CartaoAuth from './layout/CartaoAuth';
import { Aviso } from './ui/aviso';
import { Button } from './ui/button';
import { Campo } from './ui/campo';
import { Input } from './ui/input';
import { InputSenha } from './ui/input-senha';

const MENSAGEM_PADRAO = 'Não foi possível criar a conta. Tente novamente.';

function validar({ nome, email, cpf, senha, confirmarSenha }) {
  const erros = {};
  if (!nome.trim()) erros.nome = 'Informe o nome.';
  if (!email.trim()) erros.email = 'Informe o e-mail.';
  else if (!emailValido(email)) erros.email = 'Informe um e-mail válido.';
  if (!cpf) erros.cpf = 'Informe o CPF.';
  else if (apenasDigitos(cpf).length !== 11) erros.cpf = 'Informe um CPF válido.';
  if (!senha) erros.senha = 'Informe a senha.';
  else if (!senhaValida(senha)) erros.senha = 'A senha deve ter no mínimo 8 caracteres, com letras e números.';
  if (confirmarSenha !== senha) erros.confirmarSenha = 'As senhas não conferem.';
  return erros;
}

export default function Cadastro() {
  const { token, carregando, cadastrar } = useAuth();
  const navigate = useNavigate();
  const [valores, setValores] = useState({ nome: '', email: '', cpf: '', senha: '', confirmarSenha: '' });
  const [erros, setErros] = useState({});
  const [erroServidor, setErroServidor] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (carregando) return null;
  if (token) return <Navigate to="/" replace />;

  const alterar = (campo, formatar = (texto) => texto) => (evento) => {
    setValores((atual) => ({ ...atual, [campo]: formatar(evento.target.value) }));
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
      await cadastrar({
        nome: valores.nome.trim(),
        email: valores.email.trim(),
        cpf: apenasDigitos(valores.cpf),
        senha: valores.senha,
      });
      navigate('/login', { state: { contaCriada: true } });
    } catch (erro) {
      const dados = erro.response?.data;
      if (dados?.campos) setErros(dados.campos);
      else setErroServidor(dados?.erro ?? MENSAGEM_PADRAO);
      setEnviando(false);
    }
  };

  return (
    <CartaoAuth
      largo
      titulo="Criar conta"
      subtitulo="Comece registrando o que entrou ou saiu hoje."
      rodape={
        <>
          Já tem conta?{' '}
          <Link to="/login" className="font-medium text-primary">Entrar</Link>
        </>
      }
    >
      <form onSubmit={enviar} noValidate className="flex flex-col gap-6">
        {erroServidor && <Aviso tom="erro">{erroServidor}</Aviso>}
        <Campo label="Nome" erro={erros.nome}>
          <Input autoComplete="name" value={valores.nome} onChange={alterar('nome')} autoFocus />
        </Campo>
        <Campo label="E-mail" erro={erros.email}>
          <Input type="email" autoComplete="email" value={valores.email} onChange={alterar('email')} />
        </Campo>
        <Campo label="CPF" erro={erros.cpf}>
          <Input
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={valores.cpf}
            onChange={alterar('cpf', mascararCpf)}
          />
        </Campo>
        <Campo label="Senha" ajuda="Mínimo de 8 caracteres, com letras e números." erro={erros.senha}>
          <InputSenha autoComplete="new-password" value={valores.senha} onChange={alterar('senha')} />
        </Campo>
        <Campo label="Confirmar senha" erro={erros.confirmarSenha}>
          <InputSenha
            autoComplete="new-password"
            value={valores.confirmarSenha}
            onChange={alterar('confirmarSenha')}
          />
        </Campo>
        <Button type="submit" carregando={enviando} className="w-full">Criar conta</Button>
      </form>
    </CartaoAuth>
  );
}
