// routes/auth.routes.js
const express = require('express');
const router = express.Router();
const { register, login, assignRole, modifyUser, removeUser, listUsers, listRoles } = require('../controllers/auth.controller');
const { authenticateJWT, authorizeRole, authorizeSelfOrAdmin, requireNoSession, authorizePermission, authorizeAdmin } = require('../middleware/auth.middleware');

router.post('/register', requireNoSession, register);
router.post('/login', requireNoSession, login);
// Rutas con permisos específicos
router.get('/users', authenticateJWT, authorizePermission('ver_usuarios'), listUsers);
router.get('/roles', listRoles); // listar roles (público, usado por el frontend)

// Rutas protegidas con permisos - Solo administradores pueden asignar roles
router.post('/users/:id_usuario/roles', authenticateJWT, authorizeAdmin, assignRole);

// Modificar y eliminar usuario:
// - Usuarios con permiso 'gestionar_usuarios': pueden hacerlo sobre cualquier usuario
// - Usuario normal: solo puede modificar/eliminar su propia cuenta
router.put('/users/:id_usuario', authenticateJWT, authorizeSelfOrAdmin, modifyUser);
router.delete('/users/:id_usuario', authenticateJWT, authorizeSelfOrAdmin, removeUser);

module.exports = router;

