// routes/permisos.routes.js
const express = require('express');
const router = express.Router();
const {
  listPermisos,
  createPermisoController,
  updatePermisoController,
  deletePermisoController,
  getPermisosByRolController,
  asignarPermisoARolController,
  removerPermisoDeRolController,
  asignarPermisosARolController,
  getAllPermisosWithRolesController
} = require('../controllers/permisos.controller');

const { 
  authenticateJWT, 
  authorizeAdmin,
  authorizePermission 
} = require('../middleware/auth.middleware');

// Rutas públicas (para cargar permisos en el frontend)
router.get('/', listPermisos); // Listar todos los permisos
router.get('/with-roles', getAllPermisosWithRolesController); // Listar permisos con roles asignados

// Rutas protegidas - Solo administradores pueden gestionar permisos
router.post('/', authenticateJWT, authorizeAdmin, createPermisoController);
router.put('/:id_permiso', authenticateJWT, authorizeAdmin, updatePermisoController);
router.delete('/:id_permiso', authenticateJWT, authorizeAdmin, deletePermisoController);

// Rutas para gestión de permisos por rol - Solo administradores
router.get('/rol/:id_rol', authenticateJWT, authorizeAdmin, getPermisosByRolController);
router.post('/rol/:id_rol/permiso/:id_permiso', authenticateJWT, authorizeAdmin, asignarPermisoARolController);
router.delete('/rol/:id_rol/permiso/:id_permiso', authenticateJWT, authorizeAdmin, removerPermisoDeRolController);
router.put('/rol/:id_rol/permisos', authenticateJWT, authorizeAdmin, asignarPermisosARolController);

module.exports = router;
