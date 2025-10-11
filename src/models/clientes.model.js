// src/models/clientes.model.js
const { sql, getPool } = require('../config/db');

// Obtener cliente por ID
async function getClienteById(id_cliente) {
  const pool = await getPool();
  const res = await pool.request()
    .input('id', sql.Int, id_cliente)
    .query(`
      SELECT c.*, u.nombre, u.email, u.activo
      FROM Clientes c
      INNER JOIN Usuarios u ON c.id_usuario = u.id_usuario
      WHERE c.id_cliente = @id
    `);
  return res.recordset[0] || null;
}

// Obtener todos los clientes con filtros
async function getAllClientes(filtros = {}) {
  const pool = await getPool();
  let query = `
    SELECT c.id_cliente, c.razon_social, c.direccion, c.telefono, 
           c.estado, c.fecha_registro, c.activo, u.email
    FROM Clientes c
    INNER JOIN Usuarios u ON c.id_usuario = u.id_usuario
    WHERE 1=1
  `;
  
  const request = pool.request();
  
  if (filtros.estado) {
    query += ' AND c.estado = @estado';
    request.input('estado', sql.NVarChar, filtros.estado);
  }
  
  if (filtros.activo !== undefined) {
    query += ' AND c.activo = @activo';
    request.input('activo', sql.Bit, filtros.activo);
  }
  
  if (filtros.busqueda) {
    query += ' AND (c.razon_social LIKE @busqueda OR c.telefono LIKE @busqueda OR u.email LIKE @busqueda)';
    request.input('busqueda', sql.NVarChar, `%${filtros.busqueda}%`);
  }
  
  query += ' ORDER BY c.razon_social';
  
  const res = await request.query(query);
  return res.recordset || [];
}

// Crear cliente
async function createCliente(clienteData) {
  const pool = await getPool();
  const transaction = pool.transaction();
  
  try {
    await transaction.begin();
    
    // Verificar que el email no exista
    const existingEmail = await transaction.request()
      .input('email', sql.NVarChar, clienteData.email)
      .query('SELECT COUNT(*) as count FROM Usuarios WHERE email = @email');
    
    if (existingEmail.recordset[0].count > 0) {
      throw new Error('Ya existe un usuario con este email');
    }
    
    // Validaciones GDPR-like
    if (!clienteData.acepta_terminos) {
      throw new Error('Debe aceptar los términos y condiciones');
    }
    
    if (!clienteData.acepta_privacidad) {
      throw new Error('Debe aceptar la política de privacidad');
    }
    
    // Crear usuario primero
    const bcrypt = require('bcrypt');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(clienteData.password || '123456', salt);
    
    const userResult = await transaction.request()
      .input('nombre', sql.NVarChar, clienteData.razon_social)
      .input('email', sql.NVarChar, clienteData.email)
      .input('password_hash', sql.NVarChar, passwordHash)
      .input('tipo_usuario', sql.Int, clienteData.tipo_usuario)
      .input('activo', sql.Bit, 1)
      .query(`
        INSERT INTO Usuarios (nombre, email, password_hash, tipo_usuario, activo)
        VALUES (@nombre, @email, @password_hash, @tipo_usuario, @activo);
        SELECT SCOPE_IDENTITY() AS id;
      `);
    
    const id_usuario = userResult.recordset[0].id;
    
    // Crear cliente
    const clienteResult = await transaction.request()
      .input('id_usuario', sql.Int, id_usuario)
      .input('razon_social', sql.NVarChar, clienteData.razon_social)
      .input('direccion', sql.NVarChar, clienteData.direccion)
      .input('telefono', sql.NVarChar, clienteData.telefono)
      .input('estado', sql.NVarChar, clienteData.estado || 'activo')
      .input('fecha_registro', sql.DateTime, new Date())
      .input('activo', sql.Bit, 1)
      .query(`
        INSERT INTO Clientes (id_usuario, razon_social, direccion, telefono, estado, fecha_registro, activo)
        VALUES (@id_usuario, @razon_social, @direccion, @telefono, @estado, @fecha_registro, @activo);
        SELECT SCOPE_IDENTITY() AS id;
      `);
    
    await transaction.commit();
    
    return {
      id_cliente: clienteResult.recordset[0].id,
      id_usuario: id_usuario,
      ...clienteData
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// Actualizar cliente
async function updateCliente(id_cliente, clienteData) {
  const pool = await getPool();
  const transaction = pool.transaction();
  
  try {
    await transaction.begin();
    
    // Obtener el cliente actual
    const cliente = await getClienteById(id_cliente);
    if (!cliente) {
      throw new Error('Cliente no encontrado');
    }
    
    // Verificar email único si se está cambiando
    if (clienteData.email && clienteData.email !== cliente.email) {
      const existingEmail = await transaction.request()
        .input('email', sql.NVarChar, clienteData.email)
        .input('id_usuario', sql.Int, cliente.id_usuario)
        .query('SELECT COUNT(*) as count FROM Usuarios WHERE email = @email AND id_usuario != @id_usuario');
      
      if (existingEmail.recordset[0].count > 0) {
        throw new Error('Ya existe otro usuario con este email');
      }
    }
    
    // Actualizar cliente
    await transaction.request()
      .input('id_cliente', sql.Int, id_cliente)
      .input('razon_social', sql.NVarChar, clienteData.razon_social)
      .input('direccion', sql.NVarChar, clienteData.direccion)
      .input('telefono', sql.NVarChar, clienteData.telefono)
      .input('estado', sql.NVarChar, clienteData.estado)
      .input('activo', sql.Bit, clienteData.activo)
      .query(`
        UPDATE Clientes
        SET razon_social = @razon_social,
            direccion = @direccion,
            telefono = @telefono,
            estado = @estado,
            activo = @activo
        WHERE id_cliente = @id_cliente
      `);
    
    // Actualizar usuario si es necesario
    if (clienteData.email || clienteData.razon_social) {
      await transaction.request()
        .input('id_usuario', sql.Int, cliente.id_usuario)
        .input('nombre', sql.NVarChar, clienteData.razon_social || cliente.razon_social)
        .input('email', sql.NVarChar, clienteData.email || cliente.email)
        .query(`
          UPDATE Usuarios
          SET nombre = @nombre,
              email = @email
          WHERE id_usuario = @id_usuario
        `);
    }
    
    await transaction.commit();
    return { success: true, message: 'Cliente actualizado correctamente' };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// Eliminar cliente (soft delete)
async function deleteCliente(id_cliente) {
  const pool = await getPool();
  const transaction = pool.transaction();
  
  try {
    await transaction.begin();
    
    // Verificar dependencias activas
    const dependencias = await transaction.request()
      .input('id_cliente', sql.Int, id_cliente)
      .query('SELECT COUNT(*) as count FROM Ventas WHERE id_cliente = @id_cliente');
    
    const totalDependencias = dependencias.recordset[0].count;
    
    if (totalDependencias > 0) {
      throw new Error('No se puede eliminar el cliente: tiene ventas asociadas');
    }
    
    // Soft delete del cliente
    await transaction.request()
      .input('id_cliente', sql.Int, id_cliente)
      .query('UPDATE Clientes SET activo = 0 WHERE id_cliente = @id_cliente');
    
    // Desactivar usuario
    const cliente = await getClienteById(id_cliente);
    if (cliente) {
      await transaction.request()
        .input('id_usuario', sql.Int, cliente.id_usuario)
        .query('UPDATE Usuarios SET activo = 0 WHERE id_usuario = @id_usuario');
    }
    
    await transaction.commit();
    return { success: true, message: 'Cliente eliminado correctamente' };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// Obtener estados de cliente
async function getEstadosCliente() {
  return [
    { valor: 'activo', nombre: 'Activo' },
    { valor: 'inactivo', nombre: 'Inactivo' },
    { valor: 'suspendido', nombre: 'Suspendido' },
    { valor: 'prospecto', nombre: 'Prospecto' }
  ];
}

module.exports = {
  getClienteById,
  getAllClientes,
  createCliente,
  updateCliente,
  deleteCliente,
  getEstadosCliente
};
