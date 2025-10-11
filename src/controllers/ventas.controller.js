// controllers/ventas.controller.js
const { 
  getClienteById, 
  getAllClientes, 
  createCliente, 
  updateCliente, 
  deleteCliente,
  getEstadosCliente
} = require('../models/clientes.model');

// Listar clientes
async function listClientes(req, res) {
  try {
    const filtros = {
      estado: req.query.estado,
      activo: req.query.activo !== undefined ? req.query.activo === 'true' : undefined,
      busqueda: req.query.busqueda
    };
    
    const clientes = await getAllClientes(filtros);
    return res.json({ clientes });
  } catch (err) {
    console.error('Error en listClientes:', err);
    return res.status(500).json({ error: err.message || 'Error listando clientes' });
  }
}

// Obtener cliente por ID
async function getCliente(req, res) {
  try {
    const { id_cliente } = req.params;
    const id = Number(id_cliente);
    
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'ID de cliente inválido' });
    }

    const cliente = await getClienteById(id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    return res.json({ cliente });
  } catch (err) {
    console.error('Error en getCliente:', err);
    return res.status(500).json({ error: err.message || 'Error obteniendo cliente' });
  }
}

// Crear cliente
async function createClienteController(req, res) {
  try {
    const { 
      razon_social, 
      email, 
      direccion, 
      telefono, 
      password,
      tipo_usuario,
      acepta_terminos,
      acepta_privacidad
    } = req.body;
    
    // Validaciones GDPR-like
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

    // Validaciones de privacidad GDPR-like
    if (!acepta_terminos) {
      return res.status(400).json({ message: 'Debe aceptar los términos y condiciones' });
    }

    if (!acepta_privacidad) {
      return res.status(400).json({ message: 'Debe aceptar la política de privacidad' });
    }

    const clienteData = {
      razon_social,
      email,
      direccion,
      telefono,
      password: password || '123456',
      tipo_usuario: tipo_usuario || 3, // Rol de cliente por defecto
      acepta_terminos,
      acepta_privacidad
    };

    const cliente = await createCliente(clienteData);
    return res.status(201).json({ message: 'Cliente creado correctamente', cliente });
  } catch (err) {
    console.error('Error en createCliente:', err);
    return res.status(400).json({ error: err.message || 'Error creando cliente' });
  }
}

// Actualizar cliente
async function updateClienteController(req, res) {
  try {
    const { id_cliente } = req.params;
    const id = Number(id_cliente);
    
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'ID de cliente inválido' });
    }

    const { 
      razon_social, 
      email, 
      direccion, 
      telefono, 
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

    const clienteData = {
      razon_social,
      email,
      direccion,
      telefono,
      estado,
      activo
    };

    const result = await updateCliente(id, clienteData);
    return res.json({ message: result.message });
  } catch (err) {
    console.error('Error en updateCliente:', err);
    return res.status(400).json({ error: err.message || 'Error actualizando cliente' });
  }
}

// Eliminar cliente
async function deleteClienteController(req, res) {
  try {
    const { id_cliente } = req.params;
    const id = Number(id_cliente);
    
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'ID de cliente inválido' });
    }

    const result = await deleteCliente(id);
    return res.json({ message: result.message });
  } catch (err) {
    console.error('Error en deleteCliente:', err);
    return res.status(400).json({ error: err.message || 'Error eliminando cliente' });
  }
}

// Obtener estados de cliente
async function getEstadosClienteController(req, res) {
  try {
    const estados = await getEstadosCliente();
    return res.json({ estados });
  } catch (err) {
    console.error('Error en getEstadosCliente:', err);
    return res.status(500).json({ error: err.message || 'Error obteniendo estados' });
  }
}

// Reporte de clientes por estado
async function getClientesPorEstado(req, res) {
  try {
    const estados = await getEstadosCliente();
    const reporte = [];
    
    for (const estado of estados) {
      const clientes = await getAllClientes({ estado: estado.valor });
      reporte.push({
        estado: estado.nombre,
        cantidad: clientes.length
      });
    }
    
    return res.json({ reporte });
  } catch (err) {
    console.error('Error en getClientesPorEstado:', err);
    return res.status(500).json({ error: err.message || 'Error generando reporte' });
  }
}

// Buscar clientes
async function buscarClientes(req, res) {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ message: 'La búsqueda debe tener al menos 2 caracteres' });
    }
    
    const clientes = await getAllClientes({ busqueda: q });
    return res.json({ clientes });
  } catch (err) {
    console.error('Error en buscarClientes:', err);
    return res.status(500).json({ error: err.message || 'Error buscando clientes' });
  }
}

module.exports = {
  listClientes,
  getCliente,
  createClienteController,
  updateClienteController,
  deleteClienteController,
  getEstadosClienteController,
  getClientesPorEstado,
  buscarClientes
};
