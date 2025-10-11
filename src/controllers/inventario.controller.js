// controllers/inventario.controller.js
const { 
  getProductoById, 
  getAllProductos, 
  createProducto, 
  updateProducto, 
  deleteProducto,
  getCategorias,
  updateStock
} = require('../models/productos.model');

// Listar productos
async function listProductos(req, res) {
  try {
    const filtros = {
      categoria: req.query.categoria ? Number(req.query.categoria) : undefined,
      stock_bajo: req.query.stock_bajo === 'true',
      activo: req.query.activo !== undefined ? req.query.activo === 'true' : undefined,
      busqueda: req.query.busqueda
    };
    
    const productos = await getAllProductos(filtros);
    return res.json({ productos });
  } catch (err) {
    console.error('Error en listProductos:', err);
    return res.status(500).json({ error: err.message || 'Error listando productos' });
  }
}

// Obtener producto por ID
async function getProducto(req, res) {
  try {
    const { id_producto } = req.params;
    const id = Number(id_producto);
    
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'ID de producto inválido' });
    }

    const producto = await getProductoById(id);
    if (!producto) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    return res.json({ producto });
  } catch (err) {
    console.error('Error en getProducto:', err);
    return res.status(500).json({ error: err.message || 'Error obteniendo producto' });
  }
}

// Crear producto
async function createProductoController(req, res) {
  try {
    const { 
      codigo, 
      nombre, 
      descripcion, 
      precio, 
      stock_actual, 
      stock_minimo, 
      id_categoria 
    } = req.body;
    
    // Validaciones
    if (!codigo || !nombre || precio === undefined) {
      return res.status(400).json({ message: 'Faltan datos requeridos' });
    }

    // Validar formato de código
    if (!/^[A-Z0-9-]+$/.test(codigo)) {
      return res.status(400).json({ message: 'El código debe contener solo letras mayúsculas, números y guiones' });
    }

    // Validar precio
    if (isNaN(precio) || precio < 0) {
      return res.status(400).json({ message: 'El precio debe ser un número positivo' });
    }

    // Validar stock inicial
    const stockInicial = stock_actual || 0;
    if (stockInicial < 0) {
      return res.status(400).json({ message: 'El stock inicial no puede ser negativo' });
    }

    // Validar stock mínimo
    const stockMinimo = stock_minimo || 0;
    if (stockMinimo < 0) {
      return res.status(400).json({ message: 'El stock mínimo no puede ser negativo' });
    }

    const productoData = {
      codigo,
      nombre,
      descripcion,
      precio,
      stock_actual: stockInicial,
      stock_minimo: stockMinimo,
      id_categoria: id_categoria || null
    };

    const producto = await createProducto(productoData);
    return res.status(201).json({ message: 'Producto creado correctamente', producto });
  } catch (err) {
    console.error('Error en createProducto:', err);
    return res.status(400).json({ error: err.message || 'Error creando producto' });
  }
}

// Actualizar producto
async function updateProductoController(req, res) {
  try {
    const { id_producto } = req.params;
    const id = Number(id_producto);
    
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'ID de producto inválido' });
    }

    const { 
      codigo, 
      nombre, 
      descripcion, 
      precio, 
      stock_actual, 
      stock_minimo, 
      id_categoria, 
      activo 
    } = req.body;

    // Validaciones
    if (codigo && !/^[A-Z0-9-]+$/.test(codigo)) {
      return res.status(400).json({ message: 'El código debe contener solo letras mayúsculas, números y guiones' });
    }

    if (precio !== undefined && (isNaN(precio) || precio < 0)) {
      return res.status(400).json({ message: 'El precio debe ser un número positivo' });
    }

    if (stock_actual !== undefined && stock_actual < 0) {
      return res.status(400).json({ message: 'El stock actual no puede ser negativo' });
    }

    if (stock_minimo !== undefined && stock_minimo < 0) {
      return res.status(400).json({ message: 'El stock mínimo no puede ser negativo' });
    }

    const productoData = {
      codigo,
      nombre,
      descripcion,
      precio,
      stock_actual,
      stock_minimo,
      id_categoria,
      activo
    };

    const result = await updateProducto(id, productoData);
    return res.json({ message: result.message });
  } catch (err) {
    console.error('Error en updateProducto:', err);
    return res.status(400).json({ error: err.message || 'Error actualizando producto' });
  }
}

// Eliminar producto
async function deleteProductoController(req, res) {
  try {
    const { id_producto } = req.params;
    const id = Number(id_producto);
    
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'ID de producto inválido' });
    }

    const result = await deleteProducto(id);
    return res.json({ message: result.message });
  } catch (err) {
    console.error('Error en deleteProducto:', err);
    return res.status(400).json({ error: err.message || 'Error eliminando producto' });
  }
}

// Actualizar stock
async function updateStockController(req, res) {
  try {
    const { id_producto } = req.params;
    const { cantidad, tipo } = req.body;
    
    const id = Number(id_producto);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'ID de producto inválido' });
    }

    if (!cantidad || isNaN(cantidad) || cantidad <= 0) {
      return res.status(400).json({ message: 'La cantidad debe ser un número positivo' });
    }

    if (!tipo || !['entrada', 'salida'].includes(tipo)) {
      return res.status(400).json({ message: 'El tipo debe ser "entrada" o "salida"' });
    }

    const result = await updateStock(id, cantidad, tipo);
    return res.json({ message: result.message, data: result });
  } catch (err) {
    console.error('Error en updateStock:', err);
    return res.status(400).json({ error: err.message || 'Error actualizando stock' });
  }
}

// Obtener categorías
async function getCategoriasController(req, res) {
  try {
    const categorias = await getCategorias();
    return res.json({ categorias });
  } catch (err) {
    console.error('Error en getCategorias:', err);
    return res.status(500).json({ error: err.message || 'Error obteniendo categorías' });
  }
}

// Reporte de stock bajo
async function getStockBajo(req, res) {
  try {
    const productos = await getAllProductos({ stock_bajo: true });
    return res.json({ productos, total: productos.length });
  } catch (err) {
    console.error('Error en getStockBajo:', err);
    return res.status(500).json({ error: err.message || 'Error obteniendo productos con stock bajo' });
  }
}

module.exports = {
  listProductos,
  getProducto,
  createProductoController,
  updateProductoController,
  deleteProductoController,
  updateStockController,
  getCategoriasController,
  getStockBajo
};
