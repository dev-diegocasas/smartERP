// models/users.model.js
const { sql, getPool } = require('../../config/db');

async function getUserByEmail(email) {
  const pool = await getPool();
  const result = await pool.request()
    .input('email', sql.NVarChar, email)
    .query('SELECT * FROM Usuarios WHERE email = @email');
  return result.recordset[0] || null;
}

async function createUser({ nombre, email, tipo_usuario = 'externo', passwordHash }) {
  const pool = await getPool();

  // Verificar si ya existe
  const exists = await getUserByEmail(email);
  if (exists) throw new Error('El email ya está registrado');

  const result = await pool.request()
    .input('nombre', sql.NVarChar, nombre)
    .input('email', sql.NVarChar, email)
    .input('tipo_usuario', sql.NVarChar, tipo_usuario)
    .input('activo', sql.Bit, 1)
    .input('password_hash', sql.NVarChar, passwordHash)
    .query(`
      INSERT INTO Usuarios (nombre, email, tipo_usuario, activo, password_hash)
      VALUES (@nombre, @email, @tipo_usuario, @activo, @password_hash);
      SELECT SCOPE_IDENTITY() AS id;
    `);

  return { id: result.recordset[0].id, nombre, email };
}

async function getUserRoles(id_usuario) {
  const pool = await getPool();
  const res = await pool.request()
    .input('id', sql.Int, id_usuario)
    .query(`
      SELECT r.id_rol, r.nombre_rol
      FROM Usuarios_Roles ur
      JOIN Roles r ON ur.id_rol = r.id_rol
      WHERE ur.id_usuario = @id;
    `);
  return res.recordset;
}

module.exports = { getUserByEmail, createUser, getUserRoles };
