import logo from '../../assets/logo-fintrack.png';

export default function CartaoAuth({ largo = false, titulo, subtitulo, rodape, children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div
        className={`flex w-full flex-col gap-6 rounded-lg border border-border bg-surface p-10 ${
          largo ? 'max-w-[480px]' : 'max-w-[420px]'
        }`}
      >
        <div className="flex justify-center">
          <img src={logo} alt="FinTrack" className="h-[53px] w-[184px] object-contain" />
        </div>
        <header className="flex flex-col gap-1">
          <h1>{titulo}</h1>
          <p className="text-sm text-text-muted">{subtitulo}</p>
        </header>
        {children}
        <p className="text-center text-sm text-text-muted">{rodape}</p>
      </div>
    </main>
  );
}
