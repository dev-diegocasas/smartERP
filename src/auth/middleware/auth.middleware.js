// middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  console.log('DEBUG auth header:', authHeader); // temporal
  if (!authHeader) return res.status(401).json({ message: 'No autorizado' });
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ message: 'No autorizado' });
  const token = parts[1];
  if (!JWT_SECRET) {
    console.error('JWT_SECRET no configurado');
    return res.status(500).json({ message: 'Configuración del servidor incompleta (JWT_SECRET).' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    console.log('DEBUG token payload:', payload); // temporal
    req.user = payload;
    next();
  } catch (err) {
    console.error('JWT verify error:', err.message);
    return res.status(401).json({ message: 'Token inválido' });
  }
}

function authorizeRole(requiredRole) {
  return (req, res, next) => {
    const roles = req.user?.roles || [];
    console.log('DEBUG authorizeRole - req.user.roles:', roles, 'required:', requiredRole); // temporal
    const rolesLower = roles.map(r => String(r).toLowerCase());
    if (!rolesLower.includes(String(requiredRole).toLowerCase())) {
      return res.status(403).json({ message: 'No tienes permiso' });
    }
    next();
  };
}

/**
 * Permite acceso si:
 * - es admin (tiene rol 'admin'), o
 * - es el propio usuario (req.user.id === req.params.id_usuario)
 */
function authorizeSelfOrAdmin(req, res, next) {
  const userId = req.user?.id;
  const roles = req.user?.roles || [];
  const isAdmin = roles.map(r => String(r).toLowerCase()).includes('admin');

  const idParam = Number(req.params.id_usuario);
  if (!Number.isInteger(idParam) || idParam <= 0) {
    return res.status(400).json({ message: 'id_usuario inválido' });
  }

  if (isAdmin || userId === idParam) return next();
  return res.status(403).json({ message: 'No tienes permiso' });
}

/**
 * Middleware para verificar si el usuario ya tiene una sesión activa
 * Si tiene sesión activa, redirige al dashboard
 * Si no tiene sesión, permite continuar (para páginas como login)
 */
function checkSessionActive(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    // No hay token, permitir acceso a páginas públicas
    return next();
  }
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return next();
  }
  
  const token = parts[1];
  if (!JWT_SECRET) {
    return next();
  }
  
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Si el token es válido, el usuario ya está autenticado
    // Para páginas HTML, redirigir al dashboard
    if (req.path.endsWith('.html') || req.path === '/') {
      return res.redirect('/dashboard.html');
    }
    // Para APIs, devolver error indicando que ya está autenticado
    return res.status(400).json({ 
      message: 'Ya tienes una sesión activa. Cierra sesión primero.' 
    });
  } catch (err) {
    // Token inválido o expirado, permitir continuar
    return next();
  }
}

/**
 * Middleware para verificar que el usuario NO tenga sesión activa
 * Útil para páginas como login, register, etc.
 */
function requireNoSession(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return next();
  }
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return next();
  }
  
  const token = parts[1];
  if (!JWT_SECRET) {
    return next();
  }
  
  try {
    jwt.verify(token, JWT_SECRET);
    // Token válido = sesión activa, redirigir
    if (req.path.endsWith('.html') || req.path === '/') {
      return res.redirect('/dashboard.html');
    }
    return res.status(400).json({ 
      message: 'Ya tienes una sesión activa' 
    });
  } catch (err) {
    // Token inválido, permitir continuar
    return next();
  }
}

module.exports = { authenticateJWT, authorizeRole, authorizeSelfOrAdmin, checkSessionActive, requireNoSession };
