// models/roles.model.js
const { sql, getPool } = require('../../config/db');

async function getRoleByName(nombre_rol) {
  const pool = await getPool();
  const res = await pool.request()
    .input('nombre', sql.NVarChar, nombre_rol)
    .query('SELECT * FROM Roles WHERE nombre_rol = @nombre');
  return res.recordset[0] || null;
}

async function createRole(nombre_rol, descripcion = null) {
  const pool = await getPool();
  const res = await pool.request()
    .input('nombre', sql.NVarChar, nombre_rol)
    .input('descripcion', sql.NVarChar, descripcion)
    .query(`
      INSERT INTO Roles (nombre_rol, descripcion)
      VALUES (@nombre, @descripcion);
      SELECT SCOPE_IDENTITY() AS id;
    `);
  return { id: res.recordset[0].id, nombre_rol, descripcion };
}

async function assignRoleToUser(id_usuario, id_rol) {
  const pool = await getPool();
  await pool.request()
    .input('id_usuario', sql.Int, id_usuario)
    .input('id_rol', sql.Int, id_rol)
    .query(`
      IF NOT EXISTS (SELECT 1 FROM Usuarios_Roles WHERE id_usuario = @id_usuario AND id_rol = @id_rol)
      BEGIN
        INSERT INTO Usuarios_Roles (id_usuario, id_rol) VALUES (@id_usuario, @id_rol)
      END
    `);
  return true;
}

module.exports = { getRoleByName, createRole, assignRoleToUser };
