// controllers/auth.controller.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getUserByEmail, createUser, getUserRole, updateUser, deleteUser, updateUserTipoUsuario, getAllUsers } = require('../models/users.model');
const { getRoleByName, createRole, getAllRoles } = require('../models/roles.model');

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
    const { email, password, tipo_usuario } = req.body;
    if (!email || !password || !tipo_usuario) {
      return res.status(400).json({ message: 'Faltan datos: email, password y tipo_usuario son requeridos' });
    }

    const user = await getUserByEmail(email);
    if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: 'Credenciales inválidas' });

    // Verificar que el usuario tenga el tipo_usuario correcto
    if (user.tipo_usuario !== parseInt(tipo_usuario)) {
      return res.status(401).json({ message: 'El tipo de usuario seleccionado no coincide con su cuenta' });
    }

    // Verificar que el usuario esté activo
    if (!user.activo) {
      return res.status(401).json({ message: 'Su cuenta está desactivada. Contacte al administrador' });
    }

    // obtener rol (desde usuarios.tipo_usuario -> roles)
    const role = await getUserRole(user.id_usuario);
    const roleNames = role ? [role.nombre_rol] : [];
    const roleIds = role ? [role.id_rol] : [];

    if (!JWT_SECRET) {
      console.error('FATAL: JWT_SECRET no configurado en .env');
      return res.status(500).json({ error: 'Configuración del servidor incompleta (JWT_SECRET).' });
    }

    const tokenPayload = { id: user.id_usuario, email: user.email, roles: roleNames, roleIds };
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

    // actualizar la columna tipo_usuario del usuario para apuntar al id_rol
    const result = await updateUserTipoUsuario(parseInt(id_usuario, 10), role.id);
    if (!result || result.rowsAffected === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    return res.json({ message: 'Rol asignado' });
  } catch (err) {
    console.error('Error en assignRole:', err);
    return res.status(500).json({ error: err.message || 'Error asignando rol' });
  }
}

// actualizar usuario (PUT /api/users/:id_usuario)
async function modifyUser(req, res) {
  try {
    const { id_usuario } = req.params;
    const id = Number(id_usuario);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'id_usuario inválido' });

    // datos entrantes
    const { nombre, email, tipo_usuario, activo, password } = req.body;
    console.log('DEBUG modifyUser - id:', id, 'body:', req.body);

    // si el que llama no es admin, no permitir cambiar tipo_usuario
    const roles = req.user?.roles || [];
    const isAdmin = roles.map(r => String(r).toLowerCase()).includes('admin');
    if (!isAdmin && typeof tipo_usuario !== 'undefined') {
      return res.status(403).json({ message: 'No tienes permiso para cambiar el rol del usuario' });
    }

    // si envían password, la hasheamos
    let password_hash = null;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      password_hash = await bcrypt.hash(password, salt);
    }

    const result = await updateUser(id, { nombre, email, tipo_usuario, activo, password_hash });

    if (!result || result.rowsAffected === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado o sin cambios' });
    }
    return res.json({ message: 'Usuario actualizado' });
  } catch (err) {
    console.error('Error en modifyUser:', err);
    return res.status(500).json({ error: err.message || 'Error actualizando usuario' });
  }
}

// eliminar usuario (DELETE /api/users/:id_usuario)
async function removeUser(req, res) {
  try {
    const { id_usuario } = req.params;
    const id = Number(id_usuario);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'id_usuario inválido' });

    // solo admin puede eliminar otros: si no es admin y no es el mismo usuario -> forbidden
    const roles = req.user?.roles || [];
    const isAdmin = roles.map(r => String(r).toLowerCase()).includes('admin');
    const requesterId = req.user?.id;
    if (!isAdmin && requesterId !== id) {
      return res.status(403).json({ message: 'No tienes permiso para eliminar este usuario' });
    }

    console.log('DEBUG removeUser - id:', id);
    const result = await deleteUser(id);

    if (!result || result.rowsAffected === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    return res.json({ message: 'Usuario eliminado' });
  } catch (err) {
    console.error('Error en removeUser:', err);
    // FK violation en SQL Server suele ser number/code 547
    if (err && (err.number === 547 || err.code === 'ERESTRICT' || err.code === '23503')) {
      return res.status(409).json({ error: 'No se puede eliminar usuario: existen registros relacionados.' });
    }
    return res.status(500).json({ error: err.message || 'Error eliminando usuario' });
  }
}

// Listar todos los usuarios (admin)
async function listUsers(req, res) {
  try {
    const users = await getAllUsers();
    return res.json({ users });
  } catch (err) {
    console.error('Error en listUsers:', err);
    return res.status(500).json({ error: err.message || 'Error listando usuarios' });
  }
}

// Obtener roles (para poblar dropdown) - público
async function listRoles(req, res) {
  try {
    const roles = await getAllRoles();
    return res.json({ roles });
  } catch (err) {
    console.error('Error en listRoles:', err);
    return res.status(500).json({ error: err.message || 'Error listando roles' });
  }
}


module.exports = { register, login, assignRole, modifyUser, removeUser, listRoles, listUsers};
