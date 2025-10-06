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
        RegisterRequest: {
          type: 'object',
          required: ['nombre','email','password'],
          properties: {
            nombre: { type: 'string', example: 'Ana Perez' },
            email: { type: 'string', format: 'email', example: 'ana@ejemplo.com' },
            password: { type: 'string', example: 'Secret123' },
            tipo_usuario: { type: 'string', example: 'externo' }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email','password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'ana@ejemplo.com' },
            password: { type: 'string', example: 'Secret123' }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                nombre: { type: 'string' },
                email: { type: 'string' },
                roles: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        },
        RoleAssign: {
          type: 'object',
          required: ['nombre_rol'],
          properties: {
            nombre_rol: { type: 'string', example: 'admin' },
            descripcion: { type: 'string', example: 'Administrador' }
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
            '201': { description: 'Usuario creado' },
            '400': { description: 'Error de validación' }
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
            '401': { description: 'Credenciales inválidas' }
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
              'application/json': {
                schema: { $ref: '#/components/schemas/RoleAssign' }
              }
            }
          },
          responses: {
            '200': { description: 'Rol asignado' },
            '401': { description: 'No autorizado' },
            '403': { description: 'Sin permisos' }
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
