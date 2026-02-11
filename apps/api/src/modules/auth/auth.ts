import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

export type AppRole = 'Admin' | 'Contabilidad' | 'Ventas' | 'Almacen' | 'RRHH' | 'Caja' | 'Auditor';

export const hashPassword = (value: string) => bcrypt.hash(value, 10);
export const comparePassword = (value: string, hash: string) => bcrypt.compare(value, hash);

export const signAccessToken = (payload: object) => jwt.sign(payload, env.jwtAccessSecret, { expiresIn: '15m' });
export const signRefreshToken = (payload: object) => jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: '7d' });

export const verifyAccessToken = (token: string) => jwt.verify(token, env.jwtAccessSecret);
