// app.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./auth/routes/auth.routes');
const { getPool } = require('./config/db');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { requireNoSession, authenticateJWT } = require('./auth/middleware/auth.middleware');


const app = express();
app.use(bodyParser.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api', authRoutes);

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

const PORT = process.env.PORT || 3000;
getPool()
  .then(() => {
    app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
  })
  .catch(err => {
    console.error('No hay conexión a la BD. Abortando arranque.', err.message);
    process.exit(1);
  });
