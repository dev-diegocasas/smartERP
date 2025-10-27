-- Script para configurar la base de datos con roles, permisos y datos de prueba

-- Insertar roles básicos
INSERT INTO Roles (nombre_rol, descripcion) VALUES
('admin', 'Administrador del sistema'),
('reclutador', 'Reclutador de RRHH'),
('bodeguero', 'Bodeguero de inventario'),
('vendedor', 'Vendedor de ventas'),
('comprador', 'Comprador de compras');

-- Insertar permisos básicos
INSERT INTO Permisos (nombre_permiso, descripcion) VALUES
-- Permisos de administración
('gestionar_usuarios', 'Gestionar usuarios del sistema'),
('gestionar_permisos', 'Gestionar permisos y roles'),
('ver_usuarios', 'Ver lista de usuarios'),

-- Permisos de RRHH
('ver_empleados', 'Ver lista de empleados'),
('gestionar_empleados', 'Crear, editar y eliminar empleados'),

-- Permisos de inventario
('ver_inventario', 'Ver productos del inventario'),
('gestionar_inventario', 'Crear, editar y eliminar productos'),

-- Permisos de ventas
('ver_clientes', 'Ver lista de clientes'),
('gestionar_clientes', 'Crear, editar y eliminar clientes'),

-- Permisos de compras
('ver_proveedores', 'Ver lista de proveedores'),
('gestionar_proveedores', 'Crear, editar y eliminar proveedores');

-- Asignar permisos a roles
-- Admin: todos los permisos
INSERT INTO Roles_Permisos (id_rol, id_permiso) 
SELECT r.id_rol, p.id_permiso 
FROM Roles r, Permisos p 
WHERE r.nombre_rol = 'admin';

-- Reclutador: permisos de RRHH
INSERT INTO Roles_Permisos (id_rol, id_permiso) 
SELECT r.id_rol, p.id_permiso 
FROM Roles r, Permisos p 
WHERE r.nombre_rol = 'reclutador' 
AND p.nombre_permiso IN ('ver_empleados', 'gestionar_empleados');

-- Bodeguero: permisos de inventario
INSERT INTO Roles_Permisos (id_rol, id_permiso) 
SELECT r.id_rol, p.id_permiso 
FROM Roles r, Permisos p 
WHERE r.nombre_rol = 'bodeguero' 
AND p.nombre_permiso IN ('ver_inventario', 'gestionar_inventario');

-- Vendedor: permisos de ventas
INSERT INTO Roles_Permisos (id_rol, id_permiso) 
SELECT r.id_rol, p.id_permiso 
FROM Roles r, Permisos p 
WHERE r.nombre_rol = 'vendedor' 
AND p.nombre_permiso IN ('ver_clientes', 'gestionar_clientes');

-- Comprador: permisos de compras
INSERT INTO Roles_Permisos (id_rol, id_permiso) 
SELECT r.id_rol, p.id_permiso 
FROM Roles r, Permisos p 
WHERE r.nombre_rol = 'comprador' 
AND p.nombre_permiso IN ('ver_proveedores', 'gestionar_proveedores');

-- Crear usuario administrador por defecto
INSERT INTO Usuarios (nombre, email, password_hash, activo) VALUES
('Administrador', 'admin@farmatodo.com', '$2b$10$rQZ8K9vX2mN3pL4qR5sT6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP7qR8sT9uV', 1);

-- Asignar rol de admin al usuario administrador
INSERT INTO Usuarios_Roles (id_usuario, id_rol)
SELECT u.id_usuario, r.id_rol
FROM Usuarios u, Roles r
WHERE u.email = 'admin@farmatodo.com' AND r.nombre_rol = 'admin';
