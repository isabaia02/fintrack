import { Router } from 'express';
import { pool } from '../config/db.js';
import authRoutes from './auth.routes.js';

const router = Router();

router.get('/health', async (req, res, next) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (erro) {
    next(erro);
  }
});

router.use('/auth', authRoutes);

export default router;
