// routes/auth.routes.js
const express = require('express');
const router = express.Router();
const { register, login, assignRole, modifyUser, removeUser, listUsers, listRoles } = require('../controllers/auth.controller');
const { authenticateJWT, authorizeRole, authorizeSelfOrAdmin, requireNoSession } = require('../middleware/auth.middleware');

router.post('/register', requireNoSession, register);
router.post('/login', requireNoSession, login);
router.get('/users', authenticateJWT, authorizeRole('admin'), listUsers); // listar usuarios (admin)
router.get('/roles', listRoles); // listar roles (público, usado por el frontend)

// Rutas protegidas
router.post('/users/:id_usuario/roles', authenticateJWT, authorizeRole('admin'), assignRole);

// Modificar y eliminar usuario:
// - Admin: puede hacerlo sobre cualquier usuario
// - Usuario normal: solo puede modificar/eliminar su propia cuenta
router.put('/users/:id_usuario', authenticateJWT, authorizeSelfOrAdmin, modifyUser);
router.delete('/users/:id_usuario', authenticateJWT, authorizeSelfOrAdmin, removeUser);

module.exports = router;

