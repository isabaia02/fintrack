import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rotas from './routes/index.js';
import { naoEncontrado, tratarErros } from './middlewares/erros.js';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());

app.use('/api', rotas);

app.use(naoEncontrado);
app.use(tratarErros);

const porta = process.env.PORT ?? 3000;
app.listen(porta, () => console.log(`API rodando em http://localhost:${porta}`));
