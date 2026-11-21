import { Button } from './button';
import { Dialogo } from './dialogo';

// Confirmação de exclusão. `children` é a frase sobre o item, em texto corrido
// (ex.: `O item <strong>{nome}</strong> será excluído. Esta ação não pode ser desfeita.`).
export function DialogoConfirmarExclusao({ aberto, titulo, children, aoCancelar, aoConfirmar, excluindo = false, erro }) {
  return (
    <Dialogo
      aberto={aberto}
      aoFechar={aoCancelar}
      bloqueada={excluindo}
      titulo={titulo}
      acoes={(
        <>
          <Button variante="secondary" onClick={aoCancelar} disabled={excluindo}>Cancelar</Button>
          <Button variante="danger" onClick={aoConfirmar} carregando={excluindo}>Excluir</Button>
        </>
      )}
    >
      <p className="text-sm text-text-muted [&_strong]:font-medium [&_strong]:text-text">{children}</p>
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
