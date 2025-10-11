// routes/rrhh.routes.js
const express = require('express');
const router = express.Router();
const {
  listEmpleados,
  getEmpleado,
  createEmpleadoController,
  updateEmpleadoController,
  deleteEmpleadoController,
  getDepartamentos,
  getCargos
} = require('../controllers/rrhh.controller');

const { 
  authenticateJWT, 
  authorizePermission 
} = require('../auth/middleware/auth.middleware');

// Todas las rutas requieren autenticación
router.use(authenticateJWT);

// Rutas con permisos específicos
router.get('/', authorizePermission('ver_empleados'), listEmpleados);
router.get('/departamentos', authorizePermission('ver_empleados'), getDepartamentos);
router.get('/cargos', authorizePermission('ver_empleados'), getCargos);
router.get('/:id_empleado', authorizePermission('ver_empleados'), getEmpleado);

// Rutas que requieren permisos de gestión
router.post('/', authorizePermission('gestionar_empleados'), createEmpleadoController);
router.put('/:id_empleado', authorizePermission('gestionar_empleados'), updateEmpleadoController);
router.delete('/:id_empleado', authorizePermission('gestionar_empleados'), deleteEmpleadoController);

module.exports = router;
