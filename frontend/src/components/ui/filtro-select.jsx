import Icone from '../Icone';

export function FiltroSelect({ rotulo, valor, opcoes, onChange }) {
  const selecionada = opcoes.find((o) => o.valor === valor) ?? opcoes[0];

  return (
    <label className="relative inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-sm border border-border-strong bg-surface px-3 text-sm has-focus-visible:border-primary has-focus-visible:ring-1 has-focus-visible:ring-primary">
      <span className="text-text-muted">{rotulo}</span>
      <span className="max-w-40 truncate font-medium text-text">{selecionada?.rotulo}</span>
      <span className="text-text-muted">
        <Icone nome="expand_more" tamanho={18} />
      </span>
      <select
        aria-label={rotulo}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0 focus-visible:outline-none"
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>{o.rotulo}</option>
        ))}
      </select>
    </label>
  );
}
