// src/auth/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
const { rolTienePermiso } = require('../models/roles_permisos.model');

/**
 * authenticateJWT
 * Verifica el token, decodifica y normaliza req.user con:
 *  - id
 *  - email
 *  - roles (array lowercase)
 *  - roleIds (array numérico)
 *  - permisos (array lowercase)
 */
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
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
    req.user = {
      id: payload.id,
      email: payload.email,
      roles: Array.isArray(payload.roles) ? payload.roles.map(r => String(r).toLowerCase()) : [],
      roleIds: Array.isArray(payload.roleIds) ? payload.roleIds.map(Number) : [],
      permisos: Array.isArray(payload.permisos) ? payload.permisos.map(p => String(p).toLowerCase()) : []
    };
    return next();
  } catch (err) {
    console.error('JWT verify error:', err.message);
    return res.status(401).json({ message: 'Token inválido' });
  }
}

function authorizeRole(requiredRole) {
  return (req, res, next) => {
    const roles = req.user?.roles || [];
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
 * checkSessionActive - redirige a dashboard si hay token válido
 */
function checkSessionActive(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return next();
  const token = parts[1];
  if (!JWT_SECRET) return next();
  try {
    jwt.verify(token, JWT_SECRET);
    if (req.path.endsWith('.html') || req.path === '/') {
      return res.redirect('/dashboard.html');
    }
    return res.status(400).json({ message: 'Ya tienes una sesión activa. Cierra sesión primero.' });
  } catch (err) {
    return next();
  }
}

/**
 * requireNoSession - permite continuar solo si no hay sesión válida
 */
function requireNoSession(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return next();
  const token = parts[1];
  if (!JWT_SECRET) return next();
  try {
    jwt.verify(token, JWT_SECRET);
    if (req.path.endsWith('.html') || req.path === '/') {
      return res.redirect('/dashboard.html');
    }
    return res.status(400).json({ message: 'Ya tienes una sesión activa' });
  } catch (err) {
    return next();
  }
}

/**
 * authorizePermission (mejorado):
 * 1) Primero comprueba req.user.permisos (token) — rápido, sin DB.
 * 2) Si token no trae permisos, hace fallback a DB consultando rolTienePermiso por roleIds.
 */
function authorizePermission(permiso) {
  return async (req, res, next) => {
    try {
      const permisoNorm = String(permiso).toLowerCase();

      const tokenPermisos = req.user?.permisos || [];
      if (Array.isArray(tokenPermisos) && tokenPermisos.length > 0) {
        if (tokenPermisos.includes(permisoNorm)) return next();
        return res.status(403).json({ message: `No tienes permiso: ${permiso}` });
      }

      const roles = req.user?.roleIds || [];
      if (!roles || roles.length === 0) {
        return res.status(403).json({ message: 'No tienes permisos asignados' });
      }

      for (const id_rol of roles) {
        const tiene = await rolTienePermiso(id_rol, permisoNorm);
        if (tiene) return next();
      }

      return res.status(403).json({ message: `No tienes permiso: ${permiso}` });
    } catch (err) {
      console.error('Error verificando permiso (middleware):', err);
      return res.status(500).json({ message: 'Error interno verificando permisos' });
    }
  };
}

function authorizeAnyPermission(permisos) {
  return async (req, res, next) => {
    try {
      const permisosNorm = permisos.map(p => String(p).toLowerCase());
      const tokenPermisos = req.user?.permisos || [];
      if (Array.isArray(tokenPermisos) && tokenPermisos.length > 0) {
        if (permisosNorm.some(p => tokenPermisos.includes(p))) return next();
        return res.status(403).json({ message: `No tienes ninguno de los permisos requeridos: ${permisos.join(', ')}` });
      }

      const roles = req.user?.roleIds || [];
      if (!roles || roles.length === 0) return res.status(403).json({ message: 'No tienes permisos asignados' });

      for (const permiso of permisosNorm) {
        for (const id_rol of roles) {
          if (await rolTienePermiso(id_rol, permiso)) return next();
        }
      }

      return res.status(403).json({ message: `No tienes ninguno de los permisos requeridos: ${permisos.join(', ')}` });
    } catch (err) {
      console.error('Error verificar any permission:', err);
      return res.status(500).json({ message: 'Error interno verificando permisos' });
    }
  };
}

function authorizeAllPermissions(permisos) {
  return async (req, res, next) => {
    try {
      const permisosNorm = permisos.map(p => String(p).toLowerCase());
      const tokenPermisos = req.user?.permisos || [];
      if (Array.isArray(tokenPermisos) && tokenPermisos.length > 0) {
        if (permisosNorm.every(p => tokenPermisos.includes(p))) return next();
        return res.status(403).json({ message: `Faltan permisos requeridos: ${permisos.join(', ')}` });
      }

      const roles = req.user?.roleIds || [];
      if (!roles || roles.length === 0) return res.status(403).json({ message: 'No tienes permisos asignados' });

      for (const permiso of permisosNorm) {
        let ok = false;
        for (const id_rol of roles) {
          if (await rolTienePermiso(id_rol, permiso)) {
            ok = true;
            break;
          }
        }
        if (!ok) {
          return res.status(403).json({ message: `Falta permiso requerido: ${permiso}` });
        }
      }

      return next();
    } catch (err) {
      console.error('Error verificar all permissions:', err);
      return res.status(500).json({ message: 'Error interno verificando permisos' });
    }
  };
}

function authorizeAdmin(req, res, next) {
  const roles = req.user?.roles || [];
  const isAdmin = roles.map(r => String(r).toLowerCase()).includes('admin');
  if (!isAdmin) {
    return res.status(403).json({ message: 'Se requieren permisos de administrador' });
  }
  next();
}

module.exports = { 
  authenticateJWT, 
  authorizeRole, 
  authorizeSelfOrAdmin, 
  checkSessionActive, 
  requireNoSession,
  authorizePermission,
  authorizeAnyPermission,
  authorizeAllPermissions,
  authorizeAdmin
};
