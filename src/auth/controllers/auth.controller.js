// controllers/auth.controller.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getUserByEmail, createUser, getUserRoles } = require('../models/users.model');
const { getRoleByName, createRole, assignRoleToUser } = require('../models/roles.model');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';

async function register(req, res) {
  try {
    const { nombre, email, password, tipo_usuario } = req.body;
    if (!nombre || !email || !password) return res.status(400).json({ message: 'Faltan datos' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const user = await createUser({ nombre, email, tipo_usuario, passwordHash: hash });
    return res.status(201).json({ message: 'Usuario creado', user });
  } catch (err) {
    console.error('Error en register:', err);
    return res.status(400).json({ error: err.message || 'Error creando usuario' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Faltan datos' });

    const user = await getUserByEmail(email);
    if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: 'Credenciales inválidas' });

    // obtener roles
    const roles = await getUserRoles(user.id_usuario);
    const roleNames = roles.map(r => r.nombre_rol);

    // Validar que exista la clave secreta antes de firmar el JWT
    if (!JWT_SECRET) {
      console.error('FATAL: JWT_SECRET no configurado en .env');
      return res.status(500).json({ error: 'Configuración del servidor incompleta (JWT_SECRET).' });
    }

    const tokenPayload = { id: user.id_usuario, email: user.email, roles: roleNames };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.json({
      token,
      user: { id: user.id_usuario, nombre: user.nombre, email: user.email, roles: roleNames }
    });
  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
}

async function assignRole(req, res) {
  try {
    const { id_usuario } = req.params;
    const { nombre_rol, descripcion } = req.body;
    if (!nombre_rol) return res.status(400).json({ message: 'nombre_rol requerido' });

    let role = await getRoleByName(nombre_rol);
    if (!role) role = await createRole(nombre_rol, descripcion);

    await assignRoleToUser(parseInt(id_usuario, 10), role.id);
    return res.json({ message: 'Rol asignado' });
  } catch (err) {
    console.error('Error en assignRole:', err);
    return res.status(500).json({ error: err.message || 'Error asignando rol' });
  }
}

module.exports = { register, login, assignRole };
