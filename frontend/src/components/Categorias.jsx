import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import Icone from './Icone';
import { Button } from './ui/button';
import { PainelCategorias } from './categorias/PainelCategorias';
import {
  DialogoCategoria,
  DialogoConfirmarExclusao,
  DialogoExclusaoBloqueada,
} from './categorias/DialogoCategoria';

export default function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [formulario, setFormulario] = useState(null);
  const [paraExcluir, setParaExcluir] = useState(null);
  const [erroExclusao, setErroExclusao] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const [bloqueio, setBloqueio] = useState('');

  const carregar = useCallback(async () => {
    setErro('');
    try {
      const { data } = await api.get('/categorias');
      setCategorias(data);
    } catch (e) {
      setErro(e.response?.data?.erro ?? 'Não foi possível carregar as categorias.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const recarregarDepoisDeSalvar = async () => {
    setFormulario(null);
    await carregar();
  };

  async function confirmarExclusao() {
    setExcluindo(true);
    setErroExclusao('');
    try {
      await api.delete(`/categorias/${paraExcluir.id}`);
      setParaExcluir(null);
      await carregar();
    } catch (e) {
      const { status, data } = e.response ?? {};
      if (status === 409) {
        setParaExcluir(null);
        setBloqueio(data.erro);
      } else if (status === 404) {
        setParaExcluir(null);
        await carregar();
      } else {
        setErroExclusao(data?.erro ?? 'Não foi possível excluir. Tente novamente.');
      }
    } finally {
      setExcluindo(false);
    }
  }

  const saidas = categorias.filter((c) => c.tipo === 'saida');
  const entradas = categorias.filter((c) => c.tipo === 'entrada');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1>Categorias</h1>
        <Button onClick={() => setFormulario({ categoria: null })}>
          <Icone nome="add" tamanho={18} />
          Nova categoria
        </Button>
      </div>

      {carregando && (
        <p role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-text-muted">
          <Icone nome="autorenew" girando /> Carregando categorias...
        </p>
      )}

      {!carregando && erro && (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-md border border-border bg-surface py-12 text-center">
          <p className="text-sm text-danger">{erro}</p>
          <Button variante="secondary" onClick={() => { setCarregando(true); carregar(); }}>Tentar novamente</Button>
        </div>
      )}

      {!carregando && !erro && (
        <div className="flex flex-col items-start gap-6 lg:flex-row">
          <PainelCategorias
            titulo="Saídas"
            categorias={saidas}
            mensagemVazia="Nenhuma categoria de saída. Crie a primeira em “Nova categoria”."
            aoEditar={(categoria) => setFormulario({ categoria })}
            aoExcluir={(categoria) => { setErroExclusao(''); setParaExcluir(categoria); }}
          />
          <PainelCategorias
            titulo="Entradas"
            categorias={entradas}
            mensagemVazia="Nenhuma categoria de entrada. Crie a primeira em “Nova categoria”."
            aoEditar={(categoria) => setFormulario({ categoria })}
            aoExcluir={(categoria) => { setErroExclusao(''); setParaExcluir(categoria); }}
          />
        </div>
      )}

      <DialogoCategoria
        aberto={Boolean(formulario)}
        categoria={formulario?.categoria}
        aoCancelar={() => setFormulario(null)}
        aoSalvar={recarregarDepoisDeSalvar}
      />
      <DialogoConfirmarExclusao
        categoria={paraExcluir}
        aoCancelar={() => setParaExcluir(null)}
        aoConfirmar={confirmarExclusao}
        excluindo={excluindo}
        erro={erroExclusao}
      />
      <DialogoExclusaoBloqueada mensagem={bloqueio} aoFechar={() => setBloqueio('')} />
    </div>
  );
}
