import express from 'express';

export async function subirApp(montar) {
  const app = express();
  app.use(express.json());
  montar(app);
  const servidor = await new Promise((resolver) => {
    const s = app.listen(0, () => resolver(s));
  });
  const url = `http://127.0.0.1:${servidor.address().port}`;
  return { url, fechar: () => new Promise((resolver) => servidor.close(resolver)) };
}
