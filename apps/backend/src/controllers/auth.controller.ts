import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { toPublicUser } from '../models/user.model';
import { signToken } from '../utils/jwt.util';
import { AuthRequest } from '../middleware/auth.middleware';
import * as usuarioRepo from '../repositories/user.repository';

const SALT_ROUNDS = 10;

export async function register(req: Request, res: Response) {
  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ message: 'Nombre, email y password son obligatorios' });
  }

  const existente = await usuarioRepo.findByEmail(email);
  if (existente) {
    return res.status(409).json({ message: 'Ya existe un usuario con ese email' });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // El registro publico siempre crea usuarios con rol "user".
  // Los admin se crean por seed o por otro admin desde /api/users.
  const nuevoUsuario = await usuarioRepo.crearUsuario({
    nombre,
    email,
    passwordHash,
    role: 'user',
  });

  return res.status(201).json({ user: toPublicUser(nuevoUsuario) });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email y password son obligatorios' });
  }

  const usuario = await usuarioRepo.findByEmail(email);
  if (!usuario) {
    return res.status(404).json({ message: 'Usuario no encontrado' });
  }

  const passwordValido = await bcrypt.compare(password, usuario.passwordHash);
  if (!passwordValido) {
    return res.status(401).json({ message: 'Credenciales incorrectas' });
  }

  const token = signToken({ userId: usuario.id, email: usuario.email, role: usuario.role });

  return res.json({ token, user: toPublicUser(usuario) });
}

export async function profile(req: AuthRequest, res: Response) {
  const usuario = await usuarioRepo.findById(req.user!.userId);
  if (!usuario) {
    return res.status(404).json({ message: 'Usuario no encontrado' });
  }
  return res.json({ user: toPublicUser(usuario) });
}

// El cliente de Google se crea perezosamente (no al arrancar el servidor)
// para que el resto de la API siga funcionando aunque todavia no se haya
// configurado GOOGLE_CLIENT_ID; solo /api/auth/google lo necesita.
let clienteGoogle: OAuth2Client | null = null;

function obtenerClienteGoogle(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      'Falta la variable de entorno GOOGLE_CLIENT_ID. Configura tu credencial de Google Cloud en el .env del backend.'
    );
  }
  if (!clienteGoogle) {
    clienteGoogle = new OAuth2Client(clientId);
  }
  return clienteGoogle;
}

export async function loginConGoogle(req: Request, res: Response) {
  const { credential } = req.body;

  if (!credential || typeof credential !== 'string') {
    return res.status(400).json({ message: 'Falta el token de Google (credential)' });
  }

  let cliente: OAuth2Client;
  try {
    cliente = obtenerClienteGoogle();
  } catch (err) {
    console.error(err);
    return res.status(503).json({
      message: 'El inicio de sesion con Google no esta configurado en este servidor todavia.',
    });
  }

  let payload;
  try {
    const ticket = await cliente.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    return res.status(401).json({ message: 'El token de Google no es valido o ya expiro.' });
  }

  if (!payload?.email) {
    return res.status(401).json({ message: 'Google no devolvio un correo valido.' });
  }

  if (!payload.email_verified) {
    return res.status(401).json({ message: 'Tu correo de Google todavia no esta verificado.' });
  }

  let usuario = await usuarioRepo.findByEmail(payload.email);

  if (!usuario) {
    // Cuenta nueva creada desde Google: la contraseña nunca se usa para
    // iniciar sesion (solo existe porque la columna es obligatoria), asi
    // que se genera una aleatoria e inutilizable en la practica.
    const passwordAleatoria = crypto.randomBytes(32).toString('hex');
    const passwordHash = await bcrypt.hash(passwordAleatoria, SALT_ROUNDS);

    usuario = await usuarioRepo.crearUsuario({
      nombre: payload.name || payload.email.split('@')[0],
      email: payload.email,
      passwordHash,
      role: 'user',
    });

    if (payload.picture) {
      usuario = (await usuarioRepo.actualizarAvatar(usuario.id, payload.picture)) ?? usuario;
    }
  }

  const token = signToken({ userId: usuario.id, email: usuario.email, role: usuario.role });
  return res.json({ token, user: toPublicUser(usuario) });
}

// Limite generoso para no rechazar fotos de perfil razonables (una vez
// comprimidas en el navegador antes de subirlas), pero sin permitir
// payloads absurdamente grandes.
const TAMANO_MAXIMO_AVATAR_BYTES = 3 * 1024 * 1024; // ~3MB en base64

export async function updateAvatar(req: AuthRequest, res: Response) {
  const { avatarData } = req.body;

  if (!avatarData || typeof avatarData !== 'string' || !avatarData.startsWith('data:image/')) {
    return res.status(400).json({ message: 'La imagen debe enviarse como data URL (data:image/...)' });
  }

  if (avatarData.length > TAMANO_MAXIMO_AVATAR_BYTES) {
    return res.status(413).json({ message: 'La imagen es demasiado grande' });
  }

  const usuario = await usuarioRepo.actualizarAvatar(req.user!.userId, avatarData);
  if (!usuario) {
    return res.status(404).json({ message: 'Usuario no encontrado' });
  }

  return res.json({ user: toPublicUser(usuario) });
}
