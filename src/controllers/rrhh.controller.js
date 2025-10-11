// controllers/rrhh.controller.js
const { 
  getEmpleadoById, 
  getAllEmpleados, 
  createEmpleado, 
  updateEmpleado, 
  deleteEmpleado 
} = require('../models/empleados.model');

// Listar empleados
async function listEmpleados(req, res) {
  try {
    const filtros = {
      departamento: req.query.departamento,
      cargo: req.query.cargo,
      activo: req.query.activo !== undefined ? req.query.activo === 'true' : undefined
    };
    
    const empleados = await getAllEmpleados(filtros);
    return res.json({ empleados });
  } catch (err) {
    console.error('Error en listEmpleados:', err);
    return res.status(500).json({ error: err.message || 'Error listando empleados' });
  }
}

// Obtener empleado por ID
async function getEmpleado(req, res) {
  try {
    const { id_empleado } = req.params;
    const id = Number(id_empleado);
    
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'ID de empleado inválido' });
    }

    const empleado = await getEmpleadoById(id);
    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }

    return res.json({ empleado });
  } catch (err) {
    console.error('Error en getEmpleado:', err);
    return res.status(500).json({ error: err.message || 'Error obteniendo empleado' });
  }
}

// Crear empleado
async function createEmpleadoController(req, res) {
  try {
    const { 
      cedula, 
      nombre_completo, 
      email, 
      cargo, 
      departamento, 
      fecha_ingreso, 
      salario, 
      password,
      tipo_usuario 
    } = req.body;
    
    // Validaciones de datos personales únicos
    if (!cedula || !nombre_completo || !email || !cargo || !departamento) {
      return res.status(400).json({ message: 'Faltan datos requeridos' });
    }

    // Validar formato de cédula (ejemplo para Colombia)
    if (!/^\d{6,12}$/.test(cedula)) {
      return res.status(400).json({ message: 'Formato de cédula inválido' });
    }

    // Validar formato de email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Formato de email inválido' });
    }

    // Validar salario
    if (salario && (isNaN(salario) || salario < 0)) {
      return res.status(400).json({ message: 'Salario debe ser un número positivo' });
    }

    const empleadoData = {
      cedula,
      nombre_completo,
      email,
      cargo,
      departamento,
      fecha_ingreso: fecha_ingreso || new Date(),
      salario: salario || 0,
      password: password || '123456',
      tipo_usuario: tipo_usuario || 2 // Rol por defecto
    };

    const empleado = await createEmpleado(empleadoData);
    return res.status(201).json({ message: 'Empleado creado correctamente', empleado });
  } catch (err) {
    console.error('Error en createEmpleado:', err);
    return res.status(400).json({ error: err.message || 'Error creando empleado' });
  }
}

// Actualizar empleado
async function updateEmpleadoController(req, res) {
  try {
    const { id_empleado } = req.params;
    const id = Number(id_empleado);
    
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'ID de empleado inválido' });
    }

    const { 
      cedula, 
      nombre_completo, 
      email, 
      cargo, 
      departamento, 
      fecha_ingreso, 
      salario, 
      activo 
    } = req.body;

    // Validaciones
    if (cedula && !/^\d{6,12}$/.test(cedula)) {
      return res.status(400).json({ message: 'Formato de cédula inválido' });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Formato de email inválido' });
    }

    if (salario !== undefined && (isNaN(salario) || salario < 0)) {
      return res.status(400).json({ message: 'Salario debe ser un número positivo' });
    }

    const empleadoData = {
      cedula,
      nombre_completo,
      email,
      cargo,
      departamento,
      fecha_ingreso,
      salario,
      activo
    };

    const result = await updateEmpleado(id, empleadoData);
    return res.json({ message: result.message });
  } catch (err) {
    console.error('Error en updateEmpleado:', err);
    return res.status(400).json({ error: err.message || 'Error actualizando empleado' });
  }
}

// Eliminar empleado
async function deleteEmpleadoController(req, res) {
  try {
    const { id_empleado } = req.params;
    const id = Number(id_empleado);
    
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'ID de empleado inválido' });
    }

    const result = await deleteEmpleado(id);
    return res.json({ message: result.message });
  } catch (err) {
    console.error('Error en deleteEmpleado:', err);
    return res.status(400).json({ error: err.message || 'Error eliminando empleado' });
  }
}

// Obtener departamentos
async function getDepartamentos(req, res) {
  try {
    const departamentos = [
      'Recursos Humanos',
      'Ventas',
      'Compras',
      'Inventario',
      'Administración',
      'Tecnología',
      'Contabilidad',
      'Marketing'
    ];
    
    return res.json({ departamentos });
  } catch (err) {
    console.error('Error en getDepartamentos:', err);
    return res.status(500).json({ error: err.message || 'Error obteniendo departamentos' });
  }
}

// Obtener cargos
async function getCargos(req, res) {
  try {
    const cargos = [
      'Gerente',
      'Supervisor',
      'Analista',
      'Asistente',
      'Coordinador',
      'Director',
      'Especialista',
      'Consultor'
    ];
    
    return res.json({ cargos });
  } catch (err) {
    console.error('Error en getCargos:', err);
    return res.status(500).json({ error: err.message || 'Error obteniendo cargos' });
  }
}

module.exports = {
  listEmpleados,
  getEmpleado,
  createEmpleadoController,
  updateEmpleadoController,
  deleteEmpleadoController,
  getDepartamentos,
  getCargos
};
