// src/config/swagger.js
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'API Smarterp - Auth',
      version: '1.0.0',
      description: 'Documentación de endpoints de autenticación y roles'
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Local server' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        // peticiones
        RegisterRequest: {
          type: 'object',
          required: ['nombre','email','password'],
          properties: {
            nombre: { type: 'string', example: 'Ana Perez' },
            email: { type: 'string', format: 'email', example: 'ana@ejemplo.com' },
            password: { type: 'string', example: 'Secret123' },
            // ahora tipo_usuario es el id del rol (entero) que viene de la tabla Roles
            tipo_usuario: { type: 'integer', example: 1 }
          }
        },
        // login solo necesita email y password
        LoginRequest: {
          type: 'object',
          required: ['email','password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'usuario@ejemplo.com' },
            password: { type: 'string', example: 'Secret123' }
          }
        },
        RoleAssign: {
          type: 'object',
          required: ['nombre_rol'],
          properties: {
            nombre_rol: { type: 'string', example: 'admin' },
            descripcion: { type: 'string', example: 'Administrador' }
          }
        },
        UserUpdate: {
          type: 'object',
          properties: {
            nombre: { type: 'string', example: 'Nuevo Nombre' },
            email: { type: 'string', format: 'email', example: 'nuevo@ejemplo.com' },
            tipo_usuario: { type: 'integer', example: 1 },
            activo: { type: 'boolean', example: true },
            // si permites cambiar password desde este endpoint (opcional)
            password_hash: { type: 'string', example: 'hash_de_password' }
          }
        },

        // respuestas
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            nombre: { type: 'string', example: 'Ana Perez' },
            email: { type: 'string', format: 'email', example: 'ana@ejemplo.com' },
            tipo_usuario: { type: 'integer', example: 1 },
            activo: { type: 'boolean', example: true }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 },
                nombre: { type: 'string', example: 'Ana Perez' },
                email: { type: 'string', format: 'email', example: 'ana@ejemplo.com' },
                roles: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['admin']
                }
              }
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Descripción del error' },
            error: { type: 'string', example: 'Detalles técnicos (opcional)' }
          }
        }
      }
    },
    paths: {
      '/api/register': {
        post: {
          tags: ['Auth'],
          summary: 'Registrar usuario',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RegisterRequest' }
              }
            }
          },
          responses: {
            '201': { description: 'Usuario creado', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
            '400': { description: 'Error de validación', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            '500': { description: 'Error interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },
      '/api/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginRequest' }
              }
            }
          },
          responses: {
            '200': {
              description: 'Token devuelto',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AuthResponse' }
                }
              }
            },
            '400': { description: 'Faltan datos', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            '401': { description: 'Credenciales inválidas', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            '500': { description: 'Error interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },

      '/api/users/{id_usuario}/roles': {
        post: {
          tags: ['Roles'],
          summary: 'Asignar rol a usuario (protegido)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id_usuario', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/RoleAssign' } }
            }
          },
          responses: {
            '200': { description: 'Rol asignado' },
            '400': { description: 'nombre_rol requerido', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            '401': { description: 'No autorizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            '403': { description: 'Sin permisos', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            '500': { description: 'Error interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      },

      '/api/users/{id_usuario}': {
        put: {
          tags: ['Users'],
          summary: 'Actualizar usuario (protegido, admin)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id_usuario', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/UserUpdate' } }
            }
          },
          responses: {
            '200': { description: 'Usuario actualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            '400': { description: 'Datos inválidos', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            '401': { description: 'No autorizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            '403': { description: 'Sin permisos', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            '404': { description: 'Usuario no encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            '500': { description: 'Error interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        },
        delete: {
          tags: ['Users'],
          summary: 'Eliminar usuario (protegido, admin)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id_usuario', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          responses: {
            '200': { description: 'Usuario eliminado' },
            '401': { description: 'No autorizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            '403': { description: 'Sin permisos', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            '404': { description: 'Usuario no encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            '409': { description: 'No se puede eliminar usuario: existen registros relacionados (FK).', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            '500': { description: 'Error interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
          }
        }
      }
    }
  },
  // si quieres que swagger-jsdoc lea comentarios JSDoc en tus archivos, añade rutas aquí
  apis: []
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
