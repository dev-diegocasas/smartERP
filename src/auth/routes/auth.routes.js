// routes/auth.routes.js
const express = require('express');
const router = express.Router();
const { register, login, assignRole } = require('../controllers/auth.controller');
const { authenticateJWT, authorizeRole } = require('../middleware/auth.middleware');

router.post('/register', register);
router.post('/login', login);

// Rutas protegidas
router.post('/users/:id_usuario/roles', authenticateJWT, authorizeRole('admin'), assignRole);

module.exports = router;
