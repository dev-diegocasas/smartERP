// src/auth/models/roles.model.js
const { sql, getPool } = require('../../config/db');

async function getRoleByName(nombre_rol) {
  const pool = await getPool();
  const res = await pool.request()
    .input('nombre', sql.NVarChar, nombre_rol)
    .query('SELECT * FROM Roles WHERE nombre_rol = @nombre');
  return res.recordset[0] || null;
}

async function getRoleById(id_rol) {
  const pool = await getPool();
  const res = await pool.request()
    .input('id', sql.Int, id_rol)
    .query('SELECT * FROM Roles WHERE id_rol = @id');
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

async function getAllRoles() {
  const pool = await getPool();
  const res = await pool.request()
    .query('SELECT id_rol, nombre_rol, descripcion FROM Roles ORDER BY id_rol');
  return res.recordset || [];
}

module.exports = { getRoleByName, getRoleById, createRole, getAllRoles };
