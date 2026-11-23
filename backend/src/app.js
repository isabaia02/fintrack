import express from 'express';
import cors from 'cors';
import rotas from './routes/index.js';
import { cabecalhosSeguranca } from './middlewares/cabecalhosSeguranca.js';
import { naoEncontrado, tratarErros } from './middlewares/erros.js';

const LIMITE_CORPO = '100kb';

export function criarApp({ origens, trustProxy }) {
  const app = express();

  app.disable('x-powered-by');

  if (trustProxy !== undefined) app.set('trust proxy', trustProxy);

  app.use(cabecalhosSeguranca);
  app.use(cors({
    origin: (origem, retorno) => retorno(null, !origem || origens.includes(origem)),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: 600,
  }));
  app.use(express.json({ limit: LIMITE_CORPO }));

  app.use('/api', rotas);

  app.use(naoEncontrado);
  app.use(tratarErros);
  return app;
}
