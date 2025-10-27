// app.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./auth/routes/auth.routes');
const permisosRoutes = require('./auth/routes/permisos.routes');
const rrhhRoutes = require('./routes/rrhh.routes');
const inventarioRoutes = require('./routes/inventario.routes');
const ventasRoutes = require('./routes/ventas.routes');
const comprasRoutes = require('./routes/compras.routes');
const { getPool } = require('./config/db');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { requireNoSession, authenticateJWT } = require('./auth/middleware/auth.middleware');


const app = express();
app.use(bodyParser.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api', authRoutes);
app.use('/api/permisos', permisosRoutes);
app.use('/api/rrhh', rrhhRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/compras', comprasRoutes);

// Ruta principal - redirige al login si no está autenticado
app.get('/', requireNoSession, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

// Ruta del login - solo accesible si no hay sesión activa
app.get('/login.html', requireNoSession, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

// Ruta del dashboard - solo accesible con sesión activa
app.get('/dashboard.html', authenticateJWT, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
});

// Ruta del dashboard base - para todos los roles
app.get('/dashboard-base.html', authenticateJWT, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'dashboard-base.html'));
});


const PORT = process.env.PORT || 3000;
getPool()
  .then(() => {
    app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
  })
  .catch(err => {
    console.error('No hay conexión a la BD. Abortando arranque.', err.message);
    process.exit(1);
  });
