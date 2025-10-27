// src/models/empleados.model.js
const { sql, getPool } = require('../config/db');

// Obtener empleado por ID
async function getEmpleadoById(id_empleado) {
  const pool = await getPool();
  const res = await pool.request()
    .input('id', sql.Int, id_empleado)
    .query(`
      SELECT e.*, u.nombre, u.email, u.activo
      FROM Empleados e
      INNER JOIN Usuarios u ON e.id_usuario = u.id_usuario
      WHERE e.id_empleado = @id
    `);
  return res.recordset[0] || null;
}

// Obtener todos los empleados con filtros
async function getAllEmpleados(filtros = {}) {
  const pool = await getPool();
  let query = `
    SELECT e.id_empleado, e.cedula, e.nombre_completo, e.cargo, e.departamento, 
           e.fecha_ingreso, e.salario, e.activo, u.email
    FROM Empleados e
    INNER JOIN Usuarios u ON e.id_usuario = u.id_usuario
    WHERE 1=1
  `;
  
  const request = pool.request();
  
  if (filtros.departamento) {
    query += ' AND e.departamento = @departamento';
    request.input('departamento', sql.NVarChar, filtros.departamento);
  }
  
  if (filtros.cargo) {
    query += ' AND e.cargo = @cargo';
    request.input('cargo', sql.NVarChar, filtros.cargo);
  }
  
  if (filtros.activo !== undefined) {
    query += ' AND e.activo = @activo';
    request.input('activo', sql.Bit, filtros.activo);
  }
  
  query += ' ORDER BY e.nombre_completo';
  
  const res = await request.query(query);
  return res.recordset || [];
}

// Crear empleado
async function createEmpleado(empleadoData) {
  const pool = await getPool();
  const transaction = pool.transaction();
  
  try {
    await transaction.begin();
    
    // Verificar que la cédula no exista
    const existingCedula = await transaction.request()
      .input('cedula', sql.NVarChar, empleadoData.cedula)
      .query('SELECT COUNT(*) as count FROM Empleados WHERE cedula = @cedula');
    
    if (existingCedula.recordset[0].count > 0) {
      throw new Error('Ya existe un empleado con esta cédula');
    }
    
    // Crear usuario primero
    const bcrypt = require('bcrypt');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(empleadoData.password || '123456', salt);
    
    const userResult = await transaction.request()
      .input('nombre', sql.NVarChar, empleadoData.nombre_completo)
      .input('email', sql.NVarChar, empleadoData.email)
      .input('password_hash', sql.NVarChar, passwordHash)
      .input('tipo_usuario', sql.Int, empleadoData.tipo_usuario)
      .input('activo', sql.Bit, 1)
      .query(`
        INSERT INTO Usuarios (nombre, email, password_hash, tipo_usuario, activo)
        VALUES (@nombre, @email, @password_hash, @tipo_usuario, @activo);
        SELECT SCOPE_IDENTITY() AS id;
      `);
    
    const id_usuario = userResult.recordset[0].id;
    
    // Crear empleado
    const empleadoResult = await transaction.request()
      .input('id_usuario', sql.Int, id_usuario)
      .input('cedula', sql.NVarChar, empleadoData.cedula)
      .input('nombre_completo', sql.NVarChar, empleadoData.nombre_completo)
      .input('cargo', sql.NVarChar, empleadoData.cargo)
      .input('departamento', sql.NVarChar, empleadoData.departamento)
      .input('fecha_ingreso', sql.Date, empleadoData.fecha_ingreso)
      .input('salario', sql.Decimal(10,2), empleadoData.salario)
      .input('activo', sql.Bit, 1)
      .query(`
        INSERT INTO Empleados (id_usuario, cedula, nombre_completo, cargo, departamento, fecha_ingreso, salario, activo)
        VALUES (@id_usuario, @cedula, @nombre_completo, @cargo, @departamento, @fecha_ingreso, @salario, @activo);
        SELECT SCOPE_IDENTITY() AS id;
      `);
    
    await transaction.commit();
    
    return {
      id_empleado: empleadoResult.recordset[0].id,
      id_usuario: id_usuario,
      ...empleadoData
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// Actualizar empleado
async function updateEmpleado(id_empleado, empleadoData) {
  const pool = await getPool();
  const transaction = pool.transaction();
  
  try {
    await transaction.begin();
    
    // Obtener el empleado actual
    const empleado = await getEmpleadoById(id_empleado);
    if (!empleado) {
      throw new Error('Empleado no encontrado');
    }
    
    // Verificar cédula única si se está cambiando
    if (empleadoData.cedula && empleadoData.cedula !== empleado.cedula) {
      const existingCedula = await transaction.request()
        .input('cedula', sql.NVarChar, empleadoData.cedula)
        .input('id_empleado', sql.Int, id_empleado)
        .query('SELECT COUNT(*) as count FROM Empleados WHERE cedula = @cedula AND id_empleado != @id_empleado');
      
      if (existingCedula.recordset[0].count > 0) {
        throw new Error('Ya existe otro empleado con esta cédula');
      }
    }
    
    // Actualizar empleado
    await transaction.request()
      .input('id_empleado', sql.Int, id_empleado)
      .input('cedula', sql.NVarChar, empleadoData.cedula)
      .input('nombre_completo', sql.NVarChar, empleadoData.nombre_completo)
      .input('cargo', sql.NVarChar, empleadoData.cargo)
      .input('departamento', sql.NVarChar, empleadoData.departamento)
      .input('fecha_ingreso', sql.Date, empleadoData.fecha_ingreso)
      .input('salario', sql.Decimal(10,2), empleadoData.salario)
      .input('activo', sql.Bit, empleadoData.activo)
      .query(`
        UPDATE Empleados
        SET cedula = @cedula,
            nombre_completo = @nombre_completo,
            cargo = @cargo,
            departamento = @departamento,
            fecha_ingreso = @fecha_ingreso,
            salario = @salario,
            activo = @activo
        WHERE id_empleado = @id_empleado
      `);
    
    // Actualizar usuario si es necesario
    if (empleadoData.email || empleadoData.nombre_completo) {
      await transaction.request()
        .input('id_usuario', sql.Int, empleado.id_usuario)
        .input('nombre', sql.NVarChar, empleadoData.nombre_completo || empleado.nombre)
        .input('email', sql.NVarChar, empleadoData.email || empleado.email)
        .query(`
          UPDATE Usuarios
          SET nombre = @nombre,
              email = @email
          WHERE id_usuario = @id_usuario
        `);
    }
    
    await transaction.commit();
    return { success: true, message: 'Empleado actualizado correctamente' };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// Eliminar empleado (soft delete)
async function deleteEmpleado(id_empleado) {
  const pool = await getPool();
  const transaction = pool.transaction();
  
  try {
    await transaction.begin();
    
    // Verificar dependencias activas
    const dependencias = await transaction.request()
      .input('id_empleado', sql.Int, id_empleado)
      .query(`
        SELECT COUNT(*) as count FROM Ventas WHERE id_empleado = @id_empleado
        UNION ALL
        SELECT COUNT(*) as count FROM Compras WHERE id_empleado = @id_empleado
      `);
    
    const totalDependencias = dependencias.recordset.reduce((sum, row) => sum + row.count, 0);
    
    if (totalDependencias > 0) {
      throw new Error('No se puede eliminar el empleado: tiene dependencias activas (ventas o compras)');
    }
    
    // Soft delete del empleado
    await transaction.request()
      .input('id_empleado', sql.Int, id_empleado)
      .query('UPDATE Empleados SET activo = 0 WHERE id_empleado = @id_empleado');
    
    // Desactivar usuario
    const empleado = await getEmpleadoById(id_empleado);
    if (empleado) {
      await transaction.request()
        .input('id_usuario', sql.Int, empleado.id_usuario)
        .query('UPDATE Usuarios SET activo = 0 WHERE id_usuario = @id_usuario');
    }
    
    await transaction.commit();
    return { success: true, message: 'Empleado eliminado correctamente' };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

module.exports = {
  getEmpleadoById,
  getAllEmpleados,
  createEmpleado,
  updateEmpleado,
  deleteEmpleado
};
