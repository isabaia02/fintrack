export function Chave({ rotulo, ligada, onChange }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <button
        type="button"
        role="switch"
        aria-checked={ligada}
        onClick={() => onChange(!ligada)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${ligada ? 'bg-primary' : 'bg-border-strong'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-surface transition-transform ${ligada ? 'translate-x-4' : ''}`}
        />
      </button>
      {rotulo}
    </label>
  );
}
