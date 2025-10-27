// src/models/productos.model.js
const { sql, getPool } = require('../config/db');

/**
 * Obtener producto por ID (incluye nombre de categoría si existe)
 */
async function getProductoById(id_producto) {
  const pool = await getPool();
  const res = await pool.request()
    .input('id', sql.Int, id_producto)
    .query(`
      SELECT p.*, c.nombre as categoria_nombre
      FROM Productos p
      LEFT JOIN Categorias c ON p.id_categoria = c.id_categoria
      WHERE p.id_producto = @id
    `);
  return res.recordset[0] || null;
}

/**
 * Obtener todos los productos con filtros opcionales
 * filtros: { categoria, stock_bajo, activo, busqueda }
 */
async function getAllProductos(filtros = {}) {
  const pool = await getPool();
  let query = `
    SELECT p.id_producto, p.codigo, p.nombre, p.descripcion, p.precio, 
           p.stock_actual, p.stock_minimo, p.activo, c.nombre as categoria_nombre
    FROM Productos p
    LEFT JOIN Categorias c ON p.id_categoria = c.id_categoria
    WHERE 1=1
  `;
  
  const request = pool.request();
  
  if (filtros.categoria) {
    query += ' AND p.id_categoria = @categoria';
    request.input('categoria', sql.Int, filtros.categoria);
  }
  
  if (filtros.stock_bajo) {
    query += ' AND p.stock_actual <= p.stock_minimo';
  }
  
  if (typeof filtros.activo !== 'undefined') {
    query += ' AND p.activo = @activo';
    request.input('activo', sql.Bit, filtros.activo ? 1 : 0);
  }
  
  if (filtros.busqueda) {
    query += ' AND (p.nombre LIKE @busqueda OR p.codigo LIKE @busqueda)';
    request.input('busqueda', sql.NVarChar, `%${filtros.busqueda}%`);
  }
  
  query += ' ORDER BY p.nombre';
  
  const res = await request.query(query);
  return res.recordset || [];
}

/**
 * Crear producto
 * productoData debe contener: { codigo, nombre, descripcion, precio, stock_actual, stock_minimo, id_categoria }
 * Lanza Error en caso de violación de reglas (existencia de código, stock negativo, etc.)
 */
async function createProducto(productoData) {
  const pool = await getPool();

  // Validaciones de seguridad/negocio (dobles comprobaciones por si controlador no lo hizo)
  if (!productoData || !productoData.codigo || !productoData.nombre) {
    throw new Error('Faltan datos requeridos: codigo y nombre son obligatorios');
  }

  // Verificar código único
  const existingCodigo = await pool.request()
    .input('codigo', sql.NVarChar, productoData.codigo)
    .query('SELECT COUNT(*) AS count FROM Productos WHERE codigo = @codigo');

  if (existingCodigo.recordset[0].count > 0) {
    throw new Error('Ya existe un producto con este código');
  }

  // Validar stock
  const stock_actual = Number.isInteger(productoData.stock_actual) ? productoData.stock_actual : 0;
  const stock_minimo = Number.isInteger(productoData.stock_minimo) ? productoData.stock_minimo : 0;

  if (stock_actual < 0) throw new Error('El stock inicial no puede ser negativo');
  if (stock_minimo < 0) throw new Error('El stock mínimo no puede ser negativo');

  // Insert
  const res = await pool.request()
    .input('codigo', sql.NVarChar, productoData.codigo)
    .input('nombre', sql.NVarChar, productoData.nombre)
    .input('descripcion', sql.NVarChar, productoData.descripcion ?? null)
    .input('precio', sql.Decimal(18,2), productoData.precio ?? 0)
    .input('stock_actual', sql.Int, stock_actual)
    .input('stock_minimo', sql.Int, stock_minimo)
    .input('id_categoria', sql.Int, productoData.id_categoria ?? null)
    .input('activo', sql.Bit, 1)
    .query(`
      INSERT INTO Productos (codigo, nombre, descripcion, precio, stock_actual, stock_minimo, id_categoria, activo)
      VALUES (@codigo, @nombre, @descripcion, @precio, @stock_actual, @stock_minimo, @id_categoria, @activo);
      SELECT SCOPE_IDENTITY() AS id;
    `);

  return {
    id_producto: res.recordset[0].id,
    codigo: productoData.codigo,
    nombre: productoData.nombre,
    descripcion: productoData.descripcion ?? null,
    precio: productoData.precio ?? 0,
    stock_actual,
    stock_minimo,
    id_categoria: productoData.id_categoria ?? null,
    activo: 1
  };
}

/**
 * Actualizar producto
 * Se permite enviar solo los campos a actualizar; se usa COALESCE para mantener los existentes.
 */
async function updateProducto(id_producto, productoData) {
  const pool = await getPool();

  // Verificar existencia
  const producto = await getProductoById(id_producto);
  if (!producto) {
    throw new Error('Producto no encontrado');
  }

  // Si cambian codigo, verificar unicidad
  if (productoData.codigo && productoData.codigo !== producto.codigo) {
    const existingCodigo = await pool.request()
      .input('codigo', sql.NVarChar, productoData.codigo)
      .input('id_producto', sql.Int, id_producto)
      .query('SELECT COUNT(*) AS count FROM Productos WHERE codigo = @codigo AND id_producto != @id_producto');

    if (existingCodigo.recordset[0].count > 0) {
      throw new Error('Ya existe otro producto con este código');
    }
  }

  // Validar stocks si vienen
  if (typeof productoData.stock_actual !== 'undefined') {
    if (!Number.isInteger(productoData.stock_actual) || productoData.stock_actual < 0) {
      throw new Error('El stock actual no puede ser negativo');
    }
  }
  if (typeof productoData.stock_minimo !== 'undefined') {
    if (!Number.isInteger(productoData.stock_minimo) || productoData.stock_minimo < 0) {
      throw new Error('El stock mínimo no puede ser negativo');
    }
  }

  // Ejecutar update con COALESCE para evitar sobreescrituras accidentales
  const result = await pool.request()
    .input('id_producto', sql.Int, id_producto)
    .input('codigo', sql.NVarChar, productoData.codigo ?? null)
    .input('nombre', sql.NVarChar, productoData.nombre ?? null)
    .input('descripcion', sql.NVarChar, productoData.descripcion ?? null)
    .input('precio', sql.Decimal(18,2), typeof productoData.precio !== 'undefined' ? productoData.precio : null)
    .input('stock_actual', sql.Int, typeof productoData.stock_actual !== 'undefined' ? productoData.stock_actual : null)
    .input('stock_minimo', sql.Int, typeof productoData.stock_minimo !== 'undefined' ? productoData.stock_minimo : null)
    .input('id_categoria', sql.Int, productoData.id_categoria ?? null)
    .input('activo', sql.Bit, typeof productoData.activo !== 'undefined' ? (productoData.activo ? 1 : 0) : null)
    .query(`
      UPDATE Productos
      SET codigo = COALESCE(@codigo, codigo),
          nombre = COALESCE(@nombre, nombre),
          descripcion = COALESCE(@descripcion, descripcion),
          precio = COALESCE(@precio, precio),
          stock_actual = COALESCE(@stock_actual, stock_actual),
          stock_minimo = COALESCE(@stock_minimo, stock_minimo),
          id_categoria = COALESCE(@id_categoria, id_categoria),
          activo = COALESCE(@activo, activo)
      WHERE id_producto = @id_producto
    `);

  if (result.rowsAffected[0] === 0) {
    throw new Error('Producto no encontrado');
  }

  return { success: true, message: 'Producto actualizado correctamente' };
}

/**
 * Eliminar producto (soft delete) — verifica dependencias y marca activo = 0
 */
async function deleteProducto(id_producto) {
  const pool = await getPool();

  // Verificar dependencias (ventas/compras)
  // Se consultan tablas que suelen contener detalles; ajusta nombres si en tu esquema son otros.
  const dependencias = await pool.request()
    .input('id_producto', sql.Int, id_producto)
    .query(`
      SELECT COUNT(*) AS count FROM Detalle_Ventas WHERE id_producto = @id_producto
      UNION ALL
      SELECT COUNT(*) AS count FROM Detalle_Compras WHERE id_producto = @id_producto
    `);

  const totalDependencias = dependencias.recordset.reduce((sum, row) => sum + (row.count || 0), 0);

  if (totalDependencias > 0) {
    throw new Error('No se puede eliminar el producto: tiene dependencias activas (ventas o compras)');
  }

  // Soft delete
  const result = await pool.request()
    .input('id_producto', sql.Int, id_producto)
    .query('UPDATE Productos SET activo = 0 WHERE id_producto = @id_producto');

  if (result.rowsAffected[0] === 0) {
    throw new Error('Producto no encontrado');
  }

  return { success: true, message: 'Producto eliminado correctamente' };
}

/**
 * Obtener categorías activas
 */
async function getCategorias() {
  const pool = await getPool();
  const res = await pool.request()
    .query('SELECT id_categoria, nombre, descripcion FROM Categorias WHERE activo = 1 ORDER BY nombre');
  return res.recordset || [];
}

/**
 * Actualizar stock con transacción
 * tipo: 'entrada' | 'salida'
 */
async function updateStock(id_producto, cantidad, tipo = 'entrada') {
  const pool = await getPool();
  const transaction = pool.transaction();

  try {
    await transaction.begin();

    // obtener producto dentro de la transacción
    const productoRes = await transaction.request()
      .input('id', sql.Int, id_producto)
      .query('SELECT id_producto, stock_actual FROM Productos WHERE id_producto = @id');

    const producto = productoRes.recordset[0];
    if (!producto) throw new Error('Producto no encontrado');

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw new Error('La cantidad debe ser un número entero positivo');
    }

    let nuevoStock;
    if (tipo === 'entrada') {
      nuevoStock = producto.stock_actual + cantidad;
    } else if (tipo === 'salida') {
      nuevoStock = producto.stock_actual - cantidad;
      if (nuevoStock < 0) {
        throw new Error('No hay suficiente stock disponible');
      }
    } else {
      throw new Error('Tipo de movimiento inválido');
    }

    await transaction.request()
      .input('id_producto', sql.Int, id_producto)
      .input('stock_actual', sql.Int, nuevoStock)
      .query('UPDATE Productos SET stock_actual = @stock_actual WHERE id_producto = @id_producto');

    await transaction.commit();

    return {
      success: true,
      stock_anterior: producto.stock_actual,
      stock_nuevo: nuevoStock,
      message: `Stock actualizado correctamente`
    };
  } catch (error) {
    try { await transaction.rollback(); } catch (e) { /* ignore */ }
    throw error;
  }
}

module.exports = {
  getProductoById,
  getAllProductos,
  createProducto,
  updateProducto,
  deleteProducto,
  getCategorias,
  updateStock
};
