export const ALGORITMO_JWT = 'HS256';

export const jwtConfig = {
  get secret() {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET não definido no .env');
    return process.env.JWT_SECRET;
  },
  expiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
};
