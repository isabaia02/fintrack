import { useState } from 'react';
import api from '../../services/api';
import { Button } from '../ui/button';
import { Dialogo } from '../ui/dialogo';
import { DialogoConfirmarExclusao } from '../ui/dialogo-exclusao';

export function DialogoExcluirLancamento({ lancamento, aoCancelar, aoExcluir }) {
  const [excluindo, setExcluindo] = useState(null);
  const [erro, setErro] = useState('');
  const { id, descricao, parcela_atual: atual, total_parcelas: total } = lancamento;
  const ocupado = excluindo !== null;

  async function excluir(todasParcelas) {
    setExcluindo(todasParcelas ? 'todas' : 'uma');
    setErro('');
    try {
      await api.delete(`/lancamentos/${id}`, { params: todasParcelas ? { todasParcelas: true } : undefined });
      aoExcluir();
    } catch (e) {
      setErro(e.response?.data?.erro ?? 'Não foi possível excluir. Tente novamente.');
      setExcluindo(null);
    }
  }

  if (total <= 1) {
    return (
      <DialogoConfirmarExclusao
        aberto
        titulo="Excluir lançamento?"
        aoCancelar={aoCancelar}
        aoConfirmar={() => excluir(false)}
        excluindo={ocupado}
        erro={erro}
      >
        O lançamento <strong>{descricao}</strong> será excluído. Esta ação não pode ser desfeita.
      </DialogoConfirmarExclusao>
    );
  }

  return (
    <Dialogo
      aberto
      aoFechar={aoCancelar}
      bloqueada={ocupado}
      titulo="Excluir lançamento"
      acoes={(
        <div className="flex w-full flex-col gap-2">
          <Button variante="secondary" onClick={() => excluir(false)} carregando={excluindo === 'uma'} disabled={ocupado}>
            Só esta parcela
          </Button>
          <Button variante="danger" onClick={() => excluir(true)} carregando={excluindo === 'todas'} disabled={ocupado}>
            Todas as parcelas da compra ({total})
          </Button>
          <Button variante="ghost" onClick={aoCancelar} disabled={ocupado} data-autofocus>
            Cancelar
          </Button>
        </div>
      )}
    >
      <p className="text-sm text-text-muted">Excluir só esta parcela ou todas as {total} da compra?</p>
      <p className="text-xs text-text-subtle">{descricao} · parcela {atual}/{total}</p>
      {erro && <p role="alert" className="text-sm text-danger">{erro}</p>}
    </Dialogo>
  );
}
