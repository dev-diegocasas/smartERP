// controllers/compras.controller.js
const { 
  getProveedorById, 
  getAllProveedores, 
  createProveedor, 
  updateProveedor, 
  deleteProveedor,
  getEstadosProveedor,
  getCalificaciones
} = require('../models/proveedores.model');

// Listar proveedores
async function listProveedores(req, res) {
  try {
    const filtros = {
      estado: req.query.estado,
      calificacion_minima: req.query.calificacion_minima ? Number(req.query.calificacion_minima) : undefined,
      activo: req.query.activo !== undefined ? req.query.activo === 'true' : undefined,
      busqueda: req.query.busqueda
    };
    
    const proveedores = await getAllProveedores(filtros);
    return res.json({ proveedores });
  } catch (err) {
    console.error('Error en listProveedores:', err);
    return res.status(500).json({ error: err.message || 'Error listando proveedores' });
  }
}

// Obtener proveedor por ID
async function getProveedor(req, res) {
  try {
    const { id_proveedor } = req.params;
    const id = Number(id_proveedor);
    
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'ID de proveedor inválido' });
    }

    const proveedor = await getProveedorById(id);
    if (!proveedor) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }

    return res.json({ proveedor });
  } catch (err) {
    console.error('Error en getProveedor:', err);
    return res.status(500).json({ error: err.message || 'Error obteniendo proveedor' });
  }
}

// Crear proveedor
async function createProveedorController(req, res) {
  try {
    const { 
      razon_social, 
      email, 
      direccion, 
      telefono, 
      password,
      tipo_usuario,
      calificacion
    } = req.body;
    
    // Validaciones
    if (!razon_social || !email || !telefono) {
      return res.status(400).json({ message: 'Faltan datos requeridos' });
    }

    // Validar formato de email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Formato de email inválido' });
    }

    // Validar formato de teléfono
    if (!/^[\+]?[0-9\s\-\(\)]{7,15}$/.test(telefono)) {
      return res.status(400).json({ message: 'Formato de teléfono inválido' });
    }

    // Validar calificación
    if (calificacion && (calificacion < 1 || calificacion > 5)) {
      return res.status(400).json({ message: 'La calificación debe estar entre 1 y 5' });
    }

    const proveedorData = {
      razon_social,
      email,
      direccion,
      telefono,
      password: password || '123456',
      tipo_usuario: tipo_usuario || 4, // Rol de proveedor por defecto
      calificacion: calificacion || 3
    };

    const proveedor = await createProveedor(proveedorData);
    return res.status(201).json({ message: 'Proveedor creado correctamente', proveedor });
  } catch (err) {
    console.error('Error en createProveedor:', err);
    return res.status(400).json({ error: err.message || 'Error creando proveedor' });
  }
}

// Actualizar proveedor
async function updateProveedorController(req, res) {
  try {
    const { id_proveedor } = req.params;
    const id = Number(id_proveedor);
    
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'ID de proveedor inválido' });
    }

    const { 
      razon_social, 
      email, 
      direccion, 
      telefono, 
      calificacion, 
      estado, 
      activo 
    } = req.body;

    // Validaciones
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Formato de email inválido' });
    }

    if (telefono && !/^[\+]?[0-9\s\-\(\)]{7,15}$/.test(telefono)) {
      return res.status(400).json({ message: 'Formato de teléfono inválido' });
    }

    if (calificacion !== undefined && (calificacion < 1 || calificacion > 5)) {
      return res.status(400).json({ message: 'La calificación debe estar entre 1 y 5' });
    }

    const proveedorData = {
      razon_social,
      email,
      direccion,
      telefono,
      calificacion,
      estado,
      activo
    };

    const result = await updateProveedor(id, proveedorData);
    return res.json({ message: result.message });
  } catch (err) {
    console.error('Error en updateProveedor:', err);
    return res.status(400).json({ error: err.message || 'Error actualizando proveedor' });
  }
}

// Eliminar proveedor
async function deleteProveedorController(req, res) {
  try {
    const { id_proveedor } = req.params;
    const id = Number(id_proveedor);
    
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'ID de proveedor inválido' });
    }

    const result = await deleteProveedor(id);
    return res.json({ message: result.message });
  } catch (err) {
    console.error('Error en deleteProveedor:', err);
    return res.status(400).json({ error: err.message || 'Error eliminando proveedor' });
  }
}

// Obtener estados de proveedor
async function getEstadosProveedorController(req, res) {
  try {
    const estados = await getEstadosProveedor();
    return res.json({ estados });
  } catch (err) {
    console.error('Error en getEstadosProveedor:', err);
    return res.status(500).json({ error: err.message || 'Error obteniendo estados' });
  }
}

// Obtener calificaciones
async function getCalificacionesController(req, res) {
  try {
    const calificaciones = await getCalificaciones();
    return res.json({ calificaciones });
  } catch (err) {
    console.error('Error en getCalificaciones:', err);
    return res.status(500).json({ error: err.message || 'Error obteniendo calificaciones' });
  }
}

// Reporte de proveedores por calificación
async function getProveedoresPorCalificacion(req, res) {
  try {
    const calificaciones = await getCalificaciones();
    const reporte = [];
    
    for (const calificacion of calificaciones) {
      const proveedores = await getAllProveedores({ calificacion_minima: calificacion.valor });
      reporte.push({
        calificacion: calificacion.nombre,
        cantidad: proveedores.length
      });
    }
    
    return res.json({ reporte });
  } catch (err) {
    console.error('Error en getProveedoresPorCalificacion:', err);
    return res.status(500).json({ error: err.message || 'Error generando reporte' });
  }
}

// Buscar proveedores
async function buscarProveedores(req, res) {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ message: 'La búsqueda debe tener al menos 2 caracteres' });
    }
    
    const proveedores = await getAllProveedores({ busqueda: q });
    return res.json({ proveedores });
  } catch (err) {
    console.error('Error en buscarProveedores:', err);
    return res.status(500).json({ error: err.message || 'Error buscando proveedores' });
  }
}

// Evaluar proveedor
async function evaluarProveedor(req, res) {
  try {
    const { id_proveedor } = req.params;
    const { calificacion, comentarios } = req.body;
    
    const id = Number(id_proveedor);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'ID de proveedor inválido' });
    }

    if (!calificacion || calificacion < 1 || calificacion > 5) {
      return res.status(400).json({ message: 'La calificación debe estar entre 1 y 5' });
    }

    const result = await updateProveedor(id, { calificacion });
    
    // Log de auditoría para la evaluación
    const pool = require('../config/db').getPool();
    await pool.request()
      .input('id_proveedor', require('../config/db').sql.Int, id)
      .input('accion', require('../config/db').sql.NVarChar, 'EVALUATION')
      .input('fecha', require('../config/db').sql.DateTime, new Date())
      .input('detalles', require('../config/db').sql.NVarChar, JSON.stringify({ calificacion, comentarios }))
      .query(`
        INSERT INTO Auditoria_Proveedores (id_proveedor, accion, fecha, detalles)
        VALUES (@id_proveedor, @accion, @fecha, @detalles)
      `);
    
    return res.json({ message: 'Proveedor evaluado correctamente' });
  } catch (err) {
    console.error('Error en evaluarProveedor:', err);
    return res.status(400).json({ error: err.message || 'Error evaluando proveedor' });
  }
}

module.exports = {
  listProveedores,
  getProveedor,
  createProveedorController,
  updateProveedorController,
  deleteProveedorController,
  getEstadosProveedorController,
  getCalificacionesController,
  getProveedoresPorCalificacion,
  buscarProveedores,
  evaluarProveedor
};
