// src/auth/models/roles_permisos.model.js
const { sql, getPool } = require('../../config/db');

// Obtener permisos de un rol específico
async function getPermisosByRol(id_rol) {
  const pool = await getPool();
  const res = await pool.request()
    .input('id_rol', sql.Int, id_rol)
    .query(`
      SELECT p.id_permiso, p.nombre_permiso, p.descripcion, rp.fecha_asignacion
      FROM Permisos p
      INNER JOIN Roles_Permisos rp ON p.id_permiso = rp.id_permiso
      WHERE rp.id_rol = @id_rol
      ORDER BY p.nombre_permiso
    `);
  return res.recordset || [];
}

// Obtener roles que tienen un permiso específico
async function getRolesByPermiso(id_permiso) {
  const pool = await getPool();
  const res = await pool.request()
    .input('id_permiso', sql.Int, id_permiso)
    .query(`
      SELECT r.id_rol, r.nombre_rol, r.descripcion
      FROM Roles r
      INNER JOIN Roles_Permisos rp ON r.id_rol = rp.id_rol
      WHERE rp.id_permiso = @id_permiso
      ORDER BY r.nombre_rol
    `);
  return res.recordset || [];
}

// Asignar permiso a un rol
async function asignarPermisoARol(id_rol, id_permiso) {
  const pool = await getPool();
  
  // Verificar si ya existe la relación
  const exists = await pool.request()
    .input('id_rol', sql.Int, id_rol)
    .input('id_permiso', sql.Int, id_permiso)
    .query('SELECT COUNT(*) as count FROM Roles_Permisos WHERE id_rol = @id_rol AND id_permiso = @id_permiso');
  
  if (exists.recordset[0].count > 0) {
    return { success: false, message: 'El permiso ya está asignado a este rol' };
  }
  
  const result = await pool.request()
    .input('id_rol', sql.Int, id_rol)
    .input('id_permiso', sql.Int, id_permiso)
    .query('INSERT INTO Roles_Permisos (id_rol, id_permiso) VALUES (@id_rol, @id_permiso)');
  
  return { success: true, rowsAffected: result.rowsAffected[0] || 0 };
}

// Remover permiso de un rol
async function removerPermisoDeRol(id_rol, id_permiso) {
  const pool = await getPool();
  const result = await pool.request()
    .input('id_rol', sql.Int, id_rol)
    .input('id_permiso', sql.Int, id_permiso)
    .query('DELETE FROM Roles_Permisos WHERE id_rol = @id_rol AND id_permiso = @id_permiso');
  
  return { rowsAffected: result.rowsAffected[0] || 0 };
}

// Asignar múltiples permisos a un rol
async function asignarPermisosARol(id_rol, permisos_ids) {
  const pool = await getPool();
  const transaction = pool.transaction();
  
  try {
    await transaction.begin();
    
    // Primero eliminar todos los permisos actuales del rol
    await transaction.request()
      .input('id_rol', sql.Int, id_rol)
      .query('DELETE FROM Roles_Permisos WHERE id_rol = @id_rol');
    
    // Luego insertar los nuevos permisos
    for (const id_permiso of permisos_ids) {
      await transaction.request()
        .input('id_rol', sql.Int, id_rol)
        .input('id_permiso', sql.Int, id_permiso)
        .query('INSERT INTO Roles_Permisos (id_rol, id_permiso) VALUES (@id_rol, @id_permiso)');
    }
    
    await transaction.commit();
    return { success: true, message: 'Permisos asignados correctamente' };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// Verificar si un rol tiene un permiso específico
async function rolTienePermiso(id_rol, nombre_permiso) {
  const pool = await getPool();
  const res = await pool.request()
    .input('id_rol', sql.Int, id_rol)
    .input('nombre_permiso', sql.NVarChar, nombre_permiso)
    .query(`
      SELECT COUNT(*) as count
      FROM Roles_Permisos rp
      INNER JOIN Permisos p ON rp.id_permiso = p.id_permiso
      WHERE rp.id_rol = @id_rol AND p.nombre_permiso = @nombre_permiso
    `);
  
  return res.recordset[0].count > 0;
}

// Obtener todos los permisos con información de qué roles los tienen
async function getAllPermisosWithRoles() {
  const pool = await getPool();
  const res = await pool.request()
    .query(`
      SELECT 
        p.id_permiso,
        p.nombre_permiso,
        p.descripcion,
        STRING_AGG(r.nombre_rol, ', ') as roles_asignados
      FROM Permisos p
      LEFT JOIN Roles_Permisos rp ON p.id_permiso = rp.id_permiso
      LEFT JOIN Roles r ON rp.id_rol = r.id_rol
      GROUP BY p.id_permiso, p.nombre_permiso, p.descripcion
      ORDER BY p.nombre_permiso
    `);
  return res.recordset || [];
}

module.exports = {
  getPermisosByRol,
  getRolesByPermiso,
  asignarPermisoARol,
  removerPermisoDeRol,
  asignarPermisosARol,
  rolTienePermiso,
  getAllPermisosWithRoles
};
