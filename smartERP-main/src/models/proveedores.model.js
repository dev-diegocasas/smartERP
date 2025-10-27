// src/models/proveedores.model.js
const { sql, getPool } = require('../config/db');

// Obtener proveedor por ID
async function getProveedorById(id_proveedor) {
  const pool = await getPool();
  const res = await pool.request()
    .input('id', sql.Int, id_proveedor)
    .query(`
      SELECT p.*, u.nombre, u.email, u.activo
      FROM Proveedores p
      INNER JOIN Usuarios u ON p.id_usuario = u.id_usuario
      WHERE p.id_proveedor = @id
    `);
  return res.recordset[0] || null;
}

// Obtener todos los proveedores con filtros
async function getAllProveedores(filtros = {}) {
  const pool = await getPool();
  let query = `
    SELECT p.id_proveedor, p.razon_social, p.direccion, p.telefono, 
           p.calificacion, p.estado, p.fecha_registro, p.activo, u.email
    FROM Proveedores p
    INNER JOIN Usuarios u ON p.id_usuario = u.id_usuario
    WHERE 1=1
  `;
  
  const request = pool.request();
  
  if (filtros.estado) {
    query += ' AND p.estado = @estado';
    request.input('estado', sql.NVarChar, filtros.estado);
  }
  
  if (filtros.calificacion_minima) {
    query += ' AND p.calificacion >= @calificacion_minima';
    request.input('calificacion_minima', sql.Int, filtros.calificacion_minima);
  }
  
  if (filtros.activo !== undefined) {
    query += ' AND p.activo = @activo';
    request.input('activo', sql.Bit, filtros.activo);
  }
  
  if (filtros.busqueda) {
    query += ' AND (p.razon_social LIKE @busqueda OR p.telefono LIKE @busqueda OR u.email LIKE @busqueda)';
    request.input('busqueda', sql.NVarChar, `%${filtros.busqueda}%`);
  }
  
  query += ' ORDER BY p.calificacion DESC, p.razon_social';
  
  const res = await request.query(query);
  return res.recordset || [];
}

// Crear proveedor
async function createProveedor(proveedorData) {
  const pool = await getPool();
  const transaction = pool.transaction();
  
  try {
    await transaction.begin();
    
    // Verificar que el email no exista
    const existingEmail = await transaction.request()
      .input('email', sql.NVarChar, proveedorData.email)
      .query('SELECT COUNT(*) as count FROM Usuarios WHERE email = @email');
    
    if (existingEmail.recordset[0].count > 0) {
      throw new Error('Ya existe un usuario con este email');
    }
    
    // Verificar que no sea duplicado por razón social
    const existingRazon = await transaction.request()
      .input('razon_social', sql.NVarChar, proveedorData.razon_social)
      .query('SELECT COUNT(*) as count FROM Proveedores WHERE razon_social = @razon_social');
    
    if (existingRazon.recordset[0].count > 0) {
      throw new Error('Ya existe un proveedor con esta razón social');
    }
    
    // Crear usuario primero
    const bcrypt = require('bcrypt');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(proveedorData.password || '123456', salt);
    
    const userResult = await transaction.request()
      .input('nombre', sql.NVarChar, proveedorData.razon_social)
      .input('email', sql.NVarChar, proveedorData.email)
      .input('password_hash', sql.NVarChar, passwordHash)
      .input('tipo_usuario', sql.Int, proveedorData.tipo_usuario)
      .input('activo', sql.Bit, 1)
      .query(`
        INSERT INTO Usuarios (nombre, email, password_hash, tipo_usuario, activo)
        VALUES (@nombre, @email, @password_hash, @tipo_usuario, @activo);
        SELECT SCOPE_IDENTITY() AS id;
      `);
    
    const id_usuario = userResult.recordset[0].id;
    
    // Crear proveedor
    const proveedorResult = await transaction.request()
      .input('id_usuario', sql.Int, id_usuario)
      .input('razon_social', sql.NVarChar, proveedorData.razon_social)
      .input('direccion', sql.NVarChar, proveedorData.direccion)
      .input('telefono', sql.NVarChar, proveedorData.telefono)
      .input('calificacion', sql.Int, proveedorData.calificacion || 3)
      .input('estado', sql.NVarChar, proveedorData.estado || 'activo')
      .input('fecha_registro', sql.DateTime, new Date())
      .input('activo', sql.Bit, 1)
      .query(`
        INSERT INTO Proveedores (id_usuario, razon_social, direccion, telefono, calificacion, estado, fecha_registro, activo)
        VALUES (@id_usuario, @razon_social, @direccion, @telefono, @calificacion, @estado, @fecha_registro, @activo);
        SELECT SCOPE_IDENTITY() AS id;
      `);
    
    await transaction.commit();
    
    return {
      id_proveedor: proveedorResult.recordset[0].id,
      id_usuario: id_usuario,
      ...proveedorData
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// Actualizar proveedor
async function updateProveedor(id_proveedor, proveedorData) {
  const pool = await getPool();
  const transaction = pool.transaction();
  
  try {
    await transaction.begin();
    
    // Obtener el proveedor actual
    const proveedor = await getProveedorById(id_proveedor);
    if (!proveedor) {
      throw new Error('Proveedor no encontrado');
    }
    
    // Verificar email único si se está cambiando
    if (proveedorData.email && proveedorData.email !== proveedor.email) {
      const existingEmail = await transaction.request()
        .input('email', sql.NVarChar, proveedorData.email)
        .input('id_usuario', sql.Int, proveedor.id_usuario)
        .query('SELECT COUNT(*) as count FROM Usuarios WHERE email = @email AND id_usuario != @id_usuario');
      
      if (existingEmail.recordset[0].count > 0) {
        throw new Error('Ya existe otro usuario con este email');
      }
    }
    
    // Verificar razón social única si se está cambiando
    if (proveedorData.razon_social && proveedorData.razon_social !== proveedor.razon_social) {
      const existingRazon = await transaction.request()
        .input('razon_social', sql.NVarChar, proveedorData.razon_social)
        .input('id_proveedor', sql.Int, id_proveedor)
        .query('SELECT COUNT(*) as count FROM Proveedores WHERE razon_social = @razon_social AND id_proveedor != @id_proveedor');
      
      if (existingRazon.recordset[0].count > 0) {
        throw new Error('Ya existe otro proveedor con esta razón social');
      }
    }
    
    // Validar calificación
    if (proveedorData.calificacion !== undefined) {
      if (proveedorData.calificacion < 1 || proveedorData.calificacion > 5) {
        throw new Error('La calificación debe estar entre 1 y 5');
      }
    }
    
    // Actualizar proveedor
    await transaction.request()
      .input('id_proveedor', sql.Int, id_proveedor)
      .input('razon_social', sql.NVarChar, proveedorData.razon_social)
      .input('direccion', sql.NVarChar, proveedorData.direccion)
      .input('telefono', sql.NVarChar, proveedorData.telefono)
      .input('calificacion', sql.Int, proveedorData.calificacion)
      .input('estado', sql.NVarChar, proveedorData.estado)
      .input('activo', sql.Bit, proveedorData.activo)
      .query(`
        UPDATE Proveedores
        SET razon_social = @razon_social,
            direccion = @direccion,
            telefono = @telefono,
            calificacion = @calificacion,
            estado = @estado,
            activo = @activo
        WHERE id_proveedor = @id_proveedor
      `);
    
    // Actualizar usuario si es necesario
    if (proveedorData.email || proveedorData.razon_social) {
      await transaction.request()
        .input('id_usuario', sql.Int, proveedor.id_usuario)
        .input('nombre', sql.NVarChar, proveedorData.razon_social || proveedor.razon_social)
        .input('email', sql.NVarChar, proveedorData.email || proveedor.email)
        .query(`
          UPDATE Usuarios
          SET nombre = @nombre,
              email = @email
          WHERE id_usuario = @id_usuario
        `);
    }
    
    // Log de auditoría
    await transaction.request()
      .input('id_proveedor', sql.Int, id_proveedor)
      .input('accion', sql.NVarChar, 'UPDATE')
      .input('fecha', sql.DateTime, new Date())
      .input('detalles', sql.NVarChar, JSON.stringify(proveedorData))
      .query(`
        INSERT INTO Auditoria_Proveedores (id_proveedor, accion, fecha, detalles)
        VALUES (@id_proveedor, @accion, @fecha, @detalles)
      `);
    
    await transaction.commit();
    return { success: true, message: 'Proveedor actualizado correctamente' };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// Eliminar proveedor (soft delete)
async function deleteProveedor(id_proveedor) {
  const pool = await getPool();
  const transaction = pool.transaction();
  
  try {
    await transaction.begin();
    
    // Verificar dependencias activas
    const dependencias = await transaction.request()
      .input('id_proveedor', sql.Int, id_proveedor)
      .query('SELECT COUNT(*) as count FROM Compras WHERE id_proveedor = @id_proveedor');
    
    const totalDependencias = dependencias.recordset[0].count;
    
    if (totalDependencias > 0) {
      throw new Error('No se puede eliminar el proveedor: tiene compras asociadas');
    }
    
    // Soft delete del proveedor
    await transaction.request()
      .input('id_proveedor', sql.Int, id_proveedor)
      .query('UPDATE Proveedores SET activo = 0 WHERE id_proveedor = @id_proveedor');
    
    // Desactivar usuario
    const proveedor = await getProveedorById(id_proveedor);
    if (proveedor) {
      await transaction.request()
        .input('id_usuario', sql.Int, proveedor.id_usuario)
        .query('UPDATE Usuarios SET activo = 0 WHERE id_usuario = @id_usuario');
    }
    
    // Log de auditoría
    await transaction.request()
      .input('id_proveedor', sql.Int, id_proveedor)
      .input('accion', sql.NVarChar, 'DELETE')
      .input('fecha', sql.DateTime, new Date())
      .input('detalles', sql.NVarChar, 'Proveedor eliminado')
      .query(`
        INSERT INTO Auditoria_Proveedores (id_proveedor, accion, fecha, detalles)
        VALUES (@id_proveedor, @accion, @fecha, @detalles)
      `);
    
    await transaction.commit();
    return { success: true, message: 'Proveedor eliminado correctamente' };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// Obtener estados de proveedor
async function getEstadosProveedor() {
  return [
    { valor: 'activo', nombre: 'Activo' },
    { valor: 'inactivo', nombre: 'Inactivo' },
    { valor: 'suspendido', nombre: 'Suspendido' },
    { valor: 'evaluacion', nombre: 'En Evaluación' }
  ];
}

// Obtener calificaciones
async function getCalificaciones() {
  return [
    { valor: 1, nombre: 'Muy Malo' },
    { valor: 2, nombre: 'Malo' },
    { valor: 3, nombre: 'Regular' },
    { valor: 4, nombre: 'Bueno' },
    { valor: 5, nombre: 'Excelente' }
  ];
}

module.exports = {
  getProveedorById,
  getAllProveedores,
  createProveedor,
  updateProveedor,
  deleteProveedor,
  getEstadosProveedor,
  getCalificaciones
};
