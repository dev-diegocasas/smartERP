// middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No autorizado' });
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido' });
  }
}

function authorizeRole(requiredRole) {
  return (req, res, next) => {
    const roles = req.user?.roles || [];
    if (!roles.includes(requiredRole)) return res.status(403).json({ message: 'No tienes permiso' });
    next();
  };
}

module.exports = { authenticateJWT, authorizeRole };
