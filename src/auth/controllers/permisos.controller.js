// controllers/permisos.controller.js
const { 
  getPermisoByName, 
  getPermisoById, 
  createPermiso, 
  getAllPermisos, 
  getPermisosByModulo,
  updatePermiso,
  deletePermiso
} = require('../models/permisos.model');

const { 
  getPermisosByRol,
  getRolesByPermiso,
  asignarPermisoARol,
  removerPermisoDeRol,
  asignarPermisosARol,
  getAllPermisosWithRoles
} = require('../models/roles_permisos.model');

// Obtener todos los permisos
async function listPermisos(req, res) {
  try {
    const permisos = await getAllPermisos();
    return res.json({ permisos });
  } catch (err) {
    console.error('Error en listPermisos:', err);
    return res.status(500).json({ error: err.message || 'Error listando permisos' });
  }
}


// Crear nuevo permiso
async function createPermisoController(req, res) {
  try {
    const { nombre_permiso, descripcion } = req.body;
    
    if (!nombre_permiso) {
      return res.status(400).json({ message: 'El nombre del permiso es requerido' });
    }

    // Verificar si ya existe
    const existing = await getPermisoByName(nombre_permiso);
    if (existing) {
      return res.status(400).json({ message: 'Ya existe un permiso con ese nombre' });
    }

    const permiso = await createPermiso(nombre_permiso, descripcion);
    return res.status(201).json({ message: 'Permiso creado', permiso });
  } catch (err) {
    console.error('Error en createPermiso:', err);
    return res.status(500).json({ error: err.message || 'Error creando permiso' });
  }
}

// Actualizar permiso
async function updatePermisoController(req, res) {
  try {
    const { id_permiso } = req.params;
    const { nombre_permiso, descripcion } = req.body;
    
    const id = Number(id_permiso);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'ID de permiso inválido' });
    }

    if (!nombre_permiso) {
      return res.status(400).json({ message: 'El nombre del permiso es requerido' });
    }

    const result = await updatePermiso(id, { nombre_permiso, descripcion });
    
    if (result.rowsAffected === 0) {
      return res.status(404).json({ message: 'Permiso no encontrado' });
    }

    return res.json({ message: 'Permiso actualizado correctamente' });
  } catch (err) {
    console.error('Error en updatePermiso:', err);
    return res.status(500).json({ error: err.message || 'Error actualizando permiso' });
  }
}

// Eliminar permiso
async function deletePermisoController(req, res) {
  try {
    const { id_permiso } = req.params;
    const id = Number(id_permiso);
    
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'ID de permiso inválido' });
    }

    const result = await deletePermiso(id);
    
    if (result.rowsAffected === 0) {
      return res.status(404).json({ message: 'Permiso no encontrado' });
    }

    return res.json({ message: 'Permiso eliminado correctamente' });
  } catch (err) {
    console.error('Error en deletePermiso:', err);
    // Verificar si es error de FK constraint
    if (err && (err.number === 547 || err.code === 'ERESTRICT' || err.code === '23503')) {
      return res.status(409).json({ error: 'No se puede eliminar el permiso: está siendo usado por roles.' });
    }
    return res.status(500).json({ error: err.message || 'Error eliminando permiso' });
  }
}

// Obtener permisos de un rol específico
async function getPermisosByRolController(req, res) {
  try {
    const { id_rol } = req.params;
    const id = Number(id_rol);
    
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'ID de rol inválido' });
    }

    const permisos = await getPermisosByRol(id);
    return res.json({ permisos });
  } catch (err) {
    console.error('Error en getPermisosByRol:', err);
    return res.status(500).json({ error: err.message || 'Error obteniendo permisos del rol' });
  }
}

// Asignar permiso a un rol
async function asignarPermisoARolController(req, res) {
  try {
    const { id_rol, id_permiso } = req.params;
    const rolId = Number(id_rol);
    const permisoId = Number(id_permiso);
    
    if (!Number.isInteger(rolId) || rolId <= 0) {
      return res.status(400).json({ message: 'ID de rol inválido' });
    }
    
    if (!Number.isInteger(permisoId) || permisoId <= 0) {
      return res.status(400).json({ message: 'ID de permiso inválido' });
    }

    const result = await asignarPermisoARol(rolId, permisoId);
    
    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.json({ message: 'Permiso asignado al rol correctamente' });
  } catch (err) {
    console.error('Error en asignarPermisoARol:', err);
    return res.status(500).json({ error: err.message || 'Error asignando permiso al rol' });
  }
}

// Remover permiso de un rol
async function removerPermisoDeRolController(req, res) {
  try {
    const { id_rol, id_permiso } = req.params;
    const rolId = Number(id_rol);
    const permisoId = Number(id_permiso);
    
    if (!Number.isInteger(rolId) || rolId <= 0) {
      return res.status(400).json({ message: 'ID de rol inválido' });
    }
    
    if (!Number.isInteger(permisoId) || permisoId <= 0) {
      return res.status(400).json({ message: 'ID de permiso inválido' });
    }

    const result = await removerPermisoDeRol(rolId, permisoId);
    
    if (result.rowsAffected === 0) {
      return res.status(404).json({ message: 'La relación rol-permiso no existe' });
    }

    return res.json({ message: 'Permiso removido del rol correctamente' });
  } catch (err) {
    console.error('Error en removerPermisoDeRol:', err);
    return res.status(500).json({ error: err.message || 'Error removiendo permiso del rol' });
  }
}

// Asignar múltiples permisos a un rol
async function asignarPermisosARolController(req, res) {
  try {
    const { id_rol } = req.params;
    const { permisos_ids } = req.body;
    
    const rolId = Number(id_rol);
    if (!Number.isInteger(rolId) || rolId <= 0) {
      return res.status(400).json({ message: 'ID de rol inválido' });
    }

    if (!Array.isArray(permisos_ids)) {
      return res.status(400).json({ message: 'permisos_ids debe ser un array' });
    }

    // Validar que todos los IDs sean números enteros positivos
    const validIds = permisos_ids.every(id => Number.isInteger(Number(id)) && Number(id) > 0);
    if (!validIds) {
      return res.status(400).json({ message: 'Todos los IDs de permisos deben ser números enteros positivos' });
    }

    const result = await asignarPermisosARol(rolId, permisos_ids);
    return res.json({ message: result.message });
  } catch (err) {
    console.error('Error en asignarPermisosARol:', err);
    return res.status(500).json({ error: err.message || 'Error asignando permisos al rol' });
  }
}

// Obtener todos los permisos con información de roles
async function getAllPermisosWithRolesController(req, res) {
  try {
    const permisos = await getAllPermisosWithRoles();
    return res.json({ permisos });
  } catch (err) {
    console.error('Error en getAllPermisosWithRoles:', err);
    return res.status(500).json({ error: err.message || 'Error obteniendo permisos con roles' });
  }
}

module.exports = {
  listPermisos,
  createPermisoController,
  updatePermisoController,
  deletePermisoController,
  getPermisosByRolController,
  asignarPermisoARolController,
  removerPermisoDeRolController,
  asignarPermisosARolController,
  getAllPermisosWithRolesController
};
