import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFormulario } from '../hooks/useFormulario';
import { mascararCpf } from '../utils/formatadores';
import {
  LIMITE_NOME,
  LIMITE_SENHA_BYTES,
  apenasDigitos,
  cpfValido,
  emailValido,
  senhaCabeNoLimite,
  senhaValida,
} from '../utils/validacoes';
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
  else if (nome.trim().length > LIMITE_NOME) erros.nome = `O nome deve ter no máximo ${LIMITE_NOME} caracteres.`;
  if (!email.trim()) erros.email = 'Informe o e-mail.';
  else if (!emailValido(email)) erros.email = 'Informe um e-mail válido.';
  if (!cpf) erros.cpf = 'Informe o CPF.';
  else if (!cpfValido(cpf)) erros.cpf = 'Informe um CPF válido.';
  if (!senha) erros.senha = 'Informe a senha.';
  else if (!senhaValida(senha)) erros.senha = 'A senha deve ter no mínimo 8 caracteres, com letras e números.';
  else if (!senhaCabeNoLimite(senha)) erros.senha = `A senha deve ter no máximo ${LIMITE_SENHA_BYTES} caracteres.`;
  if (confirmarSenha !== senha) erros.confirmarSenha = 'As senhas não conferem.';
  return erros;
}

export default function Cadastro() {
  const { token, carregando, cadastrar } = useAuth();
  const navigate = useNavigate();
  const { valores, erros, erroServidor, enviando, alterar, enviar } = useFormulario({
    valoresIniciais: { nome: '', email: '', cpf: '', senha: '', confirmarSenha: '' },
    validar,
    aoEnviar: async ({ nome, email, cpf, senha }) => {
      await cadastrar({
        nome: nome.trim(),
        email: email.trim(),
        cpf: apenasDigitos(cpf),
        senha,
      });
      navigate('/login', { state: { contaCriada: true } });
    },
    mensagemPadrao: MENSAGEM_PADRAO,
  });

  if (carregando) return null;
  if (token) return <Navigate to="/" replace />;

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
