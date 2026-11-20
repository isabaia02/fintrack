import { useState } from 'react';
import api from '../../services/api';
import { Button } from '../ui/button';
import { Campo } from '../ui/campo';
import { Dialogo } from '../ui/dialogo';
import { Input } from '../ui/input';
import { Segmentado } from '../ui/segmentado';

const TIPOS = [
  { valor: 'saida', rotulo: 'Saída' },
  { valor: 'entrada', rotulo: 'Entrada' },
];

function Formulario({ categoria, aoCancelar, aoSalvar }) {
  const editando = Boolean(categoria);
  const [nome, setNome] = useState(categoria?.nome ?? '');
  const [tipo, setTipo] = useState(categoria?.tipo ?? 'saida');
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [salvando, setSalvando] = useState(false);
  const tipoTravado = editando && categoria.total_lancamentos > 0;

  async function enviar(e) {
    e.preventDefault();
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      setErros({ nome: 'Informe o nome da categoria.' });
      return;
    }
    setSalvando(true);
    setErros({});
    setErroGeral('');
    try {
      const corpo = { nome: nomeLimpo, tipo };
      if (editando) await api.put(`/categorias/${categoria.id}`, corpo);
      else await api.post('/categorias', corpo);
      await aoSalvar();
    } catch (erro) {
      const dados = erro.response?.data;
      if (dados?.campos) setErros(dados.campos);
      else setErroGeral(dados?.erro ?? 'Não foi possível salvar. Tente novamente.');
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate>
      <Dialogo
        aberto
        aoFechar={aoCancelar}
        titulo={editando ? 'Editar categoria' : 'Nova categoria'}
        acoes={(
          <>
            <Button variante="secondary" onClick={aoCancelar} disabled={salvando}>Cancelar</Button>
            <Button type="submit" carregando={salvando}>Salvar</Button>
          </>
        )}
      >
        <div className="mt-2 flex flex-col gap-4">
          <Campo label="Nome" erro={erros.nome}>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={60}
              autoFocus
              placeholder="Ex.: Mercado"
            />
          </Campo>
          <Campo label="Tipo" erro={erros.tipo}>
            {({ 'aria-describedby': descricaoId }) => (tipoTravado ? (
              <p className="text-sm text-text-muted">
                {TIPOS.find((t) => t.valor === tipo).rotulo} — o tipo não pode mudar enquanto houver lançamentos.
              </p>
            ) : (
              <Segmentado rotulo="Tipo" opcoes={TIPOS} valor={tipo} onChange={setTipo} aria-describedby={descricaoId} />
            ))}
          </Campo>
          {erroGeral && <p role="alert" className="text-sm text-danger">{erroGeral}</p>}
        </div>
      </Dialogo>
    </form>
  );
}

export function DialogoCategoria({ aberto, categoria, aoCancelar, aoSalvar }) {
  if (!aberto) return null;
  return <Formulario categoria={categoria} aoCancelar={aoCancelar} aoSalvar={aoSalvar} />;
}

export function DialogoConfirmarExclusao({ categoria, aoCancelar, aoConfirmar, excluindo, erro }) {
  return (
    <Dialogo
      aberto={Boolean(categoria)}
      aoFechar={aoCancelar}
      titulo="Excluir categoria?"
      acoes={(
        <>
          <Button variante="secondary" onClick={aoCancelar} disabled={excluindo}>Cancelar</Button>
          <Button variante="danger" onClick={aoConfirmar} carregando={excluindo}>Excluir</Button>
        </>
      )}
    >
      <p className="text-sm text-text-muted">
        A categoria <strong className="font-medium text-text">{categoria?.nome}</strong> será excluída. Esta ação não pode ser desfeita.
      </p>
      {erro && <p role="alert" className="text-sm text-danger">{erro}</p>}
    </Dialogo>
  );
}

export function DialogoExclusaoBloqueada({ mensagem, aoFechar }) {
  return (
    <Dialogo
      aberto={Boolean(mensagem)}
      aoFechar={aoFechar}
      titulo="Não é possível excluir"
      icone="warning"
      acoes={<Button onClick={aoFechar} autoFocus>Entendi</Button>}
    >
      <p className="text-sm text-text-muted">{mensagem}</p>
    </Dialogo>
  );
}
