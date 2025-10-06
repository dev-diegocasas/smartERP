// src/config/db.js
require('dotenv').config();   // carga las variables del .env
const sql = require('mssql');

// Configuración usando variables del .env
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || process.env.DB_PASS, // soporta ambos nombres
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '1433', 10),
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: true, // requerido en Azure
    trustServerCertificate: false
  }
};

// Pool singleton para reutilizar conexiones
let poolPromise = null;

async function getPool() {
  if (poolPromise) return poolPromise;
  poolPromise = sql.connect(config)
    .then(pool => {
      console.log('✅ DB pool creado');
      return pool;
    })
    .catch(err => {
      poolPromise = null; // permitir reintento
      console.error('❌ Error creando DB pool:', err.message || err);
      throw err;
    });
  return poolPromise;
}

// Función opcional de test (no se ejecuta automáticamente)
async function testConnection() {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT GETDATE() AS ahora');
    console.log('✅ Conexión exitosa - GETDATE():', result.recordset[0].ahora);
  } catch (err) {
    console.error('❌ Error de conexión (testConnection):', err.message || err);
  }
}

module.exports = { sql, getPool, testConnection };
