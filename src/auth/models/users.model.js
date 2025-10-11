// src/auth/models/users.model.js
const { sql, getPool } = require('../../config/db');

// Obtener usuario por email
async function getUserByEmail(email) {
  const pool = await getPool();
  const result = await pool.request()
    .input('email', sql.NVarChar, email)
    .query('SELECT * FROM Usuarios WHERE email = @email');
  return result.recordset[0] || null;
}

// Obtener todos los usuarios (para listar)
async function getAllUsers() {
  const pool = await getPool();
  const res = await pool.request()
    .query('SELECT id_usuario, nombre, email, tipo_usuario, activo FROM Usuarios ORDER BY id_usuario');
  return res.recordset || [];
}

// Crear usuario
async function createUser({ nombre, email, tipo_usuario = null, passwordHash }) {
  const pool = await getPool();
  const exists = await getUserByEmail(email);
  if (exists) throw new Error('El email ya está registrado');

  const result = await pool.request()
    .input('nombre', sql.NVarChar, nombre)
    .input('email', sql.NVarChar, email)
    .input('tipo_usuario', sql.Int, tipo_usuario)
    .input('activo', sql.Bit, 1)
    .input('password_hash', sql.NVarChar, passwordHash)
    .query(`
      INSERT INTO Usuarios (nombre, email, tipo_usuario, activo, password_hash)
      VALUES (@nombre, @email, @tipo_usuario, @activo, @password_hash);
      SELECT SCOPE_IDENTITY() AS id;
    `);

  return { id: result.recordset[0].id, nombre, email, tipo_usuario };
}

// Obtener rol del usuario
async function getUserRole(id_usuario) {
  const pool = await getPool();
  const res = await pool.request()
    .input('id', sql.Int, id_usuario)
    .query(`
      SELECT r.id_rol, r.nombre_rol, r.descripcion
      FROM Usuarios u
      LEFT JOIN Roles r ON u.tipo_usuario = r.id_rol
      WHERE u.id_usuario = @id;
    `);
  return res.recordset[0] || null;
}

// Actualizar tipo_usuario (asignación de rol)
async function updateUserTipoUsuario(id_usuario, id_rol) {
  const pool = await getPool();
  const result = await pool.request()
    .input('id_usuario', sql.Int, id_usuario)
    .input('id_rol', sql.Int, id_rol)
    .query('UPDATE Usuarios SET tipo_usuario = @id_rol WHERE id_usuario = @id_usuario');
  return { rowsAffected: result.rowsAffected[0] || 0 };
}

// Actualizar usuario: usa COALESCE para mantener valores existentes si no se envían
async function updateUser(id_usuario, { nombre, email, tipo_usuario = null, activo = null, password_hash = null }) {
  const pool = await getPool();

  // build query to optionally include password_hash
  if (password_hash !== null && typeof password_hash !== 'undefined') {
    const result = await pool.request()
      .input('id_usuario', sql.Int, id_usuario)
      .input('nombre', sql.NVarChar, nombre ?? null)
      .input('email', sql.NVarChar, email ?? null)
      .input('tipo_usuario', sql.Int, tipo_usuario ?? null)
      .input('activo', sql.Bit, activo ?? null)
      .input('password_hash', sql.NVarChar, password_hash)
      .query(`
        UPDATE Usuarios
        SET nombre = COALESCE(@nombre, nombre),
            email = COALESCE(@email, email),
            tipo_usuario = COALESCE(@tipo_usuario, tipo_usuario),
            activo = COALESCE(@activo, activo),
            password_hash = @password_hash
        WHERE id_usuario = @id_usuario
      `);
    return { rowsAffected: result.rowsAffected[0] || 0 };
  } else {
    const result = await pool.request()
      .input('id_usuario', sql.Int, id_usuario)
      .input('nombre', sql.NVarChar, nombre ?? null)
      .input('email', sql.NVarChar, email ?? null)
      .input('tipo_usuario', sql.Int, tipo_usuario ?? null)
      .input('activo', sql.Bit, activo ?? null)
      .query(`
        UPDATE Usuarios
        SET nombre = COALESCE(@nombre, nombre),
            email = COALESCE(@email, email),
            tipo_usuario = COALESCE(@tipo_usuario, tipo_usuario),
            activo = COALESCE(@activo, activo)
        WHERE id_usuario = @id_usuario
      `);
    return { rowsAffected: result.rowsAffected[0] || 0 };
  }
}

// Eliminar usuario
async function deleteUser(id_usuario) {
  const pool = await getPool();
  const result = await pool.request()
    .input('id_usuario', sql.Int, id_usuario)
    .query('DELETE FROM Usuarios WHERE id_usuario = @id_usuario');
  return { rowsAffected: result.rowsAffected[0] || 0 };
}

module.exports = {
  getUserByEmail,
  createUser,
  getUserRole,
  updateUserTipoUsuario,
  updateUser,
  deleteUser,
  getAllUsers
};
