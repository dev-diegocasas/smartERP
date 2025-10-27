using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Threading.Tasks;

namespace TuProyecto.Models
{
    public class User
    {
        public int IdUsuario { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public int? TipoUsuario { get; set; }
        public bool Activo { get; set; }
        public string PasswordHash { get; set; } = string.Empty;
        public string NombreRol { get; set; } = string.Empty;
    }

    public class UserModel
    {
        private readonly string _connectionString;

        public UserModel(string connectionString)
        {
            _connectionString = connectionString;
        }

        // ✅ Obtener usuario por email
        public async Task<User?> GetUserByEmailAsync(string email)
        {
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                await conn.OpenAsync();
                string query = "SELECT * FROM Usuarios WHERE email = @Email";
                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@Email", email);
                    using (SqlDataReader reader = await cmd.ExecuteReaderAsync())
                    {
                        if (await reader.ReadAsync())
                        {
                            return MapUser(reader);
                        }
                    }
                }
            }
            return null;
        }

        // ✅ Obtener todos los usuarios (con nombre de rol)
        public async Task<List<User>> GetAllUsersAsync()
        {
            var users = new List<User>();

            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                await conn.OpenAsync();
                string query = @"
                    SELECT u.id_usuario, u.nombre, u.email, u.tipo_usuario, r.nombre_rol, u.activo
                    FROM Usuarios u
                    LEFT JOIN Roles r ON u.tipo_usuario = r.id_rol
                    ORDER BY u.id_usuario";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                using (SqlDataReader reader = await cmd.ExecuteReaderAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        users.Add(MapUser(reader));
                    }
                }
            }

            return users;
        }

        // ✅ Crear usuario
        public async Task<User> CreateUserAsync(string nombre, string email, int? tipoUsuario, string passwordHash)
        {
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                await conn.OpenAsync();

                // Verificar existencia
                var exists = await GetUserByEmailAsync(email);
                if (exists != null)
                    throw new Exception("El email ya está registrado");

                string query = @"
                    INSERT INTO Usuarios (nombre, email, tipo_usuario, activo, password_hash)
                    VALUES (@Nombre, @Email, @TipoUsuario, 1, @PasswordHash);
                    SELECT SCOPE_IDENTITY();";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@Nombre", nombre);
                    cmd.Parameters.AddWithValue("@Email", email);
                    cmd.Parameters.AddWithValue("@TipoUsuario", (object?)tipoUsuario ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@PasswordHash", passwordHash);

                    var id = Convert.ToInt32(await cmd.ExecuteScalarAsync());

                    return new User
                    {
                        IdUsuario = id,
                        Nombre = nombre,
                        Email = email,
                        TipoUsuario = tipoUsuario
                    };
                }
            }
        }

        // ✅ Obtener rol del usuario
        public async Task<User?> GetUserRoleAsync(int idUsuario)
        {
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                await conn.OpenAsync();
                string query = @"
                    SELECT r.id_rol, r.nombre_rol, r.descripcion
                    FROM Usuarios u
                    LEFT JOIN Roles r ON u.tipo_usuario = r.id_rol
                    WHERE u.id_usuario = @Id";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@Id", idUsuario);
                    using (SqlDataReader reader = await cmd.ExecuteReaderAsync())
                    {
                        if (await reader.ReadAsync())
                        {
                            return new User
                            {
                                TipoUsuario = reader["id_rol"] as int?,
                                NombreRol = reader["nombre_rol"].ToString() ?? string.Empty
                            };
                        }
                    }
                }
            }
            return null;
        }

        // ✅ Actualizar tipo_usuario (rol)
        public async Task<int> UpdateUserTipoUsuarioAsync(int idUsuario, int idRol)
        {
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                await conn.OpenAsync();
                string query = "UPDATE Usuarios SET tipo_usuario = @IdRol WHERE id_usuario = @IdUsuario";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@IdUsuario", idUsuario);
                    cmd.Parameters.AddWithValue("@IdRol", idRol);

                    return await cmd.ExecuteNonQueryAsync();
                }
            }
        }

        // ✅ Actualizar usuario
        public async Task<int> UpdateUserAsync(int idUsuario, string? nombre, string? email, int? tipoUsuario, bool? activo, string? passwordHash)
        {
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                await conn.OpenAsync();

                string query;
                if (!string.IsNullOrEmpty(passwordHash))
                {
                    query = @"
                        UPDATE Usuarios
                        SET nombre = COALESCE(@Nombre, nombre),
                            email = COALESCE(@Email, email),
                            tipo_usuario = COALESCE(@TipoUsuario, tipo_usuario),
                            activo = COALESCE(@Activo, activo),
                            password_hash = @PasswordHash
                        WHERE id_usuario = @IdUsuario";
                }
                else
                {
                    query = @"
                        UPDATE Usuarios
                        SET nombre = COALESCE(@Nombre, nombre),
                            email = COALESCE(@Email, email),
                            tipo_usuario = COALESCE(@TipoUsuario, tipo_usuario),
                            activo = COALESCE(@Activo, activo)
                        WHERE id_usuario = @IdUsuario";
                }

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@IdUsuario", idUsuario);
                    cmd.Parameters.AddWithValue("@Nombre", (object?)nombre ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@Email", (object?)email ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@TipoUsuario", (object?)tipoUsuario ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@Activo", (object?)activo ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@PasswordHash", (object?)passwordHash ?? DBNull.Value);

                    return await cmd.ExecuteNonQueryAsync();
                }
            }
        }

        // ✅ Eliminar usuario
        public async Task<int> DeleteUserAsync(int idUsuario)
        {
            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                await conn.OpenAsync();
                string query = "DELETE FROM Usuarios WHERE id_usuario = @IdUsuario";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@IdUsuario", idUsuario);
                    return await cmd.ExecuteNonQueryAsync();
                }
            }
        }

        // 🧩 Método auxiliar para mapear resultados
        private User MapUser(SqlDataReader reader)
        {
            return new User
            {
                IdUsuario = Convert.ToInt32(reader["id_usuario"]),
                Nombre = reader["nombre"].ToString() ?? string.Empty,
                Email = reader["email"].ToString() ?? string.Empty,
                TipoUsuario = reader["tipo_usuario"] as int?,
                Activo = reader["activo"] != DBNull.Value && Convert.ToBoolean(reader["activo"]),
                NombreRol = reader["nombre_rol"]?.ToString() ?? string.Empty
            };
        }
    }
}
