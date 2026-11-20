import { Link } from 'react-router-dom';

export default function NaoEncontrado() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
      <p className="font-mono text-text-subtle">404</p>
      <h1>Página não encontrada</h1>
      <p className="max-w-sm text-text-muted">O endereço que você acessou não existe ou foi movido.</p>
      <Link to="/" className="mt-2 text-sm font-medium text-primary underline">Voltar ao resumo</Link>
    </main>
  );
}
