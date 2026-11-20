import { Button } from '../ui/button';
import { Dialogo } from '../ui/dialogo';

export function DialogoConfirmarExclusao({ item, aoCancelar, aoConfirmar, excluindo, erro }) {
  return (
    <Dialogo
      aberto={Boolean(item)}
      aoFechar={aoCancelar}
      titulo="Excluir fonte ou destino?"
      acoes={(
        <>
          <Button variante="secondary" onClick={aoCancelar} disabled={excluindo}>Cancelar</Button>
          <Button variante="danger" onClick={aoConfirmar} carregando={excluindo}>Excluir</Button>
        </>
      )}
    >
      <p className="text-sm text-text-muted">
        <strong className="font-medium text-text">{item?.nome}</strong> será excluído. Esta ação não pode ser desfeita.
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
