export default function Icone({ nome, tamanho = 20, girando = false }) {
  return (
    <span
      aria-hidden="true"
      className={`material-icons-outlined ${girando ? 'animate-spin' : ''}`}
      style={{ fontSize: tamanho, width: tamanho, height: tamanho }}
    >
      {nome}
    </span>
  );
}
