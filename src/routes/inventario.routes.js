// routes/inventario.routes.js
const express = require('express');
const router = express.Router();
const {
  listProductos,
  getProducto,
  createProductoController,
  updateProductoController,
  deleteProductoController,
  updateStockController,
  getCategoriasController,
  getStockBajo
} = require('../controllers/inventario.controller');

const { 
  authenticateJWT, 
  authorizePermission 
} = require('../auth/middleware/auth.middleware');

// Todas las rutas requieren autenticación
router.use(authenticateJWT);

// Rutas con permisos específicos
router.get('/', authorizePermission('ver_inventario'), listProductos);
router.get('/categorias', authorizePermission('ver_inventario'), getCategoriasController);
router.get('/stock-bajo', authorizePermission('ver_inventario'), getStockBajo);
router.get('/:id_producto', authorizePermission('ver_inventario'), getProducto);

// Rutas que requieren permisos de gestión
router.post('/', authorizePermission('gestionar_inventario'), createProductoController);
router.put('/:id_producto', authorizePermission('gestionar_inventario'), updateProductoController);
router.delete('/:id_producto', authorizePermission('gestionar_inventario'), deleteProductoController);

// Rutas de stock
router.put('/:id_producto/stock', authorizePermission('gestionar_inventario'), updateStockController);

module.exports = router;
