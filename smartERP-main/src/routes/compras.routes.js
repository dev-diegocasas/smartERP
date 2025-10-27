// routes/compras.routes.js
const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/compras.controller');

const { 
  authenticateJWT, 
  authorizePermission 
} = require('../auth/middleware/auth.middleware');

// Todas las rutas requieren autenticación
router.use(authenticateJWT);

// Rutas con permisos específicos
router.get('/', authorizePermission('ver_proveedores'), listProveedores);
router.get('/estados', authorizePermission('ver_proveedores'), getEstadosProveedorController);
router.get('/calificaciones', authorizePermission('ver_proveedores'), getCalificacionesController);
router.get('/reporte-calificaciones', authorizePermission('ver_proveedores'), getProveedoresPorCalificacion);
router.get('/buscar', authorizePermission('ver_proveedores'), buscarProveedores);
router.get('/:id_proveedor', authorizePermission('ver_proveedores'), getProveedor);

// Rutas que requieren permisos de gestión
router.post('/', authorizePermission('gestionar_proveedores'), createProveedorController);
router.put('/:id_proveedor', authorizePermission('gestionar_proveedores'), updateProveedorController);
router.delete('/:id_proveedor', authorizePermission('gestionar_proveedores'), deleteProveedorController);

// Rutas de evaluación
router.post('/:id_proveedor/evaluar', authorizePermission('gestionar_proveedores'), evaluarProveedor);

module.exports = router;
