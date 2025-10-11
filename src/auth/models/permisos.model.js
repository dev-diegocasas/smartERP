// src/auth/models/permisos.model.js
const { sql, getPool } = require('../../config/db');

// Obtener permiso por nombre
async function getPermisoByName(nombre_permiso) {
  const pool = await getPool();
  const res = await pool.request()
    .input('nombre', sql.NVarChar, nombre_permiso)
    .query('SELECT * FROM Permisos WHERE nombre_permiso = @nombre');
  return res.recordset[0] || null;
}

// Obtener permiso por ID
async function getPermisoById(id_permiso) {
  const pool = await getPool();
  const res = await pool.request()
    .input('id', sql.Int, id_permiso)
    .query('SELECT * FROM Permisos WHERE id_permiso = @id');
  return res.recordset[0] || null;
}

// Crear nuevo permiso
async function createPermiso(nombre_permiso, descripcion = null) {
  const pool = await getPool();
  const res = await pool.request()
    .input('nombre', sql.NVarChar, nombre_permiso)
    .input('descripcion', sql.NVarChar, descripcion)
    .query(`
      INSERT INTO Permisos (nombre_permiso, descripcion)
      VALUES (@nombre, @descripcion);
      SELECT SCOPE_IDENTITY() AS id;
    `);
  return { id: res.recordset[0].id, nombre_permiso, descripcion };
}

// Obtener todos los permisos
async function getAllPermisos() {
  const pool = await getPool();
  const res = await pool.request()
    .query('SELECT id_permiso, nombre_permiso, descripcion FROM Permisos ORDER BY nombre_permiso');
  return res.recordset || [];
}

// Actualizar permiso
async function updatePermiso(id_permiso, { nombre_permiso, descripcion }) {
  const pool = await getPool();
  const result = await pool.request()
    .input('id_permiso', sql.Int, id_permiso)
    .input('nombre_permiso', sql.NVarChar, nombre_permiso)
    .input('descripcion', sql.NVarChar, descripcion)
    .query(`
      UPDATE Permisos
      SET nombre_permiso = @nombre_permiso,
          descripcion = @descripcion
      WHERE id_permiso = @id_permiso
    `);
  return { rowsAffected: result.rowsAffected[0] || 0 };
}

// Eliminar permiso
async function deletePermiso(id_permiso) {
  const pool = await getPool();
  const result = await pool.request()
    .input('id_permiso', sql.Int, id_permiso)
    .query('DELETE FROM Permisos WHERE id_permiso = @id_permiso');
  return { rowsAffected: result.rowsAffected[0] || 0 };
}

module.exports = {
  getPermisoByName,
  getPermisoById,
  createPermiso,
  getAllPermisos,
  updatePermiso,
  deletePermiso
};
