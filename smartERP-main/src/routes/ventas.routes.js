// routes/ventas.routes.js
const express = require('express');
const router = express.Router();
const {
  listClientes,
  getCliente,
  createClienteController,
  updateClienteController,
  deleteClienteController,
  getEstadosClienteController,
  getClientesPorEstado,
  buscarClientes
} = require('../controllers/ventas.controller');

const { 
  authenticateJWT, 
  authorizePermission 
} = require('../auth/middleware/auth.middleware');

// Todas las rutas requieren autenticación
router.use(authenticateJWT);

// Rutas con permisos específicos
router.get('/', authorizePermission('ver_clientes'), listClientes);
router.get('/estados', authorizePermission('ver_clientes'), getEstadosClienteController);
router.get('/reporte-estados', authorizePermission('ver_clientes'), getClientesPorEstado);
router.get('/buscar', authorizePermission('ver_clientes'), buscarClientes);
router.get('/:id_cliente', authorizePermission('ver_clientes'), getCliente);

// Rutas que requieren permisos de gestión
router.post('/', authorizePermission('gestionar_clientes'), createClienteController);
router.put('/:id_cliente', authorizePermission('gestionar_clientes'), updateClienteController);
router.delete('/:id_cliente', authorizePermission('gestionar_clientes'), deleteClienteController);

module.exports = router;
