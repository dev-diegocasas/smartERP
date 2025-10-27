using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using SmartERP.Models;
using SmartERP.Services;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace SmartERP.Controllers
{
[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
private readonly IUserService _userService;
private readonly IRoleService _roleService;
private readonly IPermisoService _permisoService;
private readonly IConfiguration _config;

```
    public AuthController(
        IUserService userService,
        IRoleService roleService,
        IPermisoService permisoService,
        IConfiguration config)
    {
        _userService = userService;
        _roleService = roleService;
        _permisoService = permisoService;
        _config = config;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Nombre) || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new { message = "Faltan datos" });

            var existing = await _userService.GetByEmailAsync(request.Email);
            if (existing != null)
                return BadRequest(new { message = "El usuario ya existe" });

            string hash = BCrypt.Net.BCrypt.HashPassword(request.Password);

            var user = new Usuario
            {
                Nombre = request.Nombre,
                Email = request.Email,
                TipoUsuario = request.TipoUsuario,
                PasswordHash = hash
            };

            var created = await _userService.CreateAsync(user);
            return Created("", new { message = "Usuario creado", user = created });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error en Register: {ex.Message}");
            return StatusCode(400, new { error = ex.Message });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new { message = "Faltan datos: email y password son requeridos" });

            var user = await _userService.GetByEmailAsync(request.Email);
            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                return Unauthorized(new { message = "Credenciales inválidas" });

            if (user.Activo.HasValue && !user.Activo.Value)
                return Unauthorized(new { message = "Su cuenta está desactivada. Contacte al administrador" });

            var role = await _roleService.GetRoleByUserIdAsync(user.IdUsuario);
            var roleNames = role != null ? new[] { role.NombreRol.ToLower() } : Array.Empty<string>();
            var roleIds = role != null ? new[] { role.IdRol } : Array.Empty<int>();

            var permisos = await _permisoService.GetPermisosByRolesAsync(roleIds);
            var permisosList = permisos.Select(p => p.NombrePermiso.ToLower()).Distinct().ToArray();

            string secret = _config["Jwt:Secret"];
            string expiresIn = _config["Jwt:ExpiresIn"] ?? "2h";
            if (string.IsNullOrEmpty(secret))
                return StatusCode(500, new { error = "Configuración JWT_SECRET no encontrada." });

            var token = GenerateJwtToken(user, roleNames, roleIds, permisosList, secret, expiresIn);

            return Ok(new
            {
                token,
                user = new
                {
                    id = user.IdUsuario,
                    nombre = user.Nombre,
                    email = user.Email,
                    roles = roleNames,
                    permisos = permisosList
                }
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error en Login: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    private string GenerateJwtToken(Usuario user, string[] roles, int[] roleIds, string[] permisos, string secret, string expiresIn)
    {
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Email),
            new Claim("id", user.IdUsuario.ToString()),
            new Claim("roles", string.Join(",", roles)),
            new Claim("roleIds", string.Join(",", roleIds)),
            new Claim("permisos", string.Join(",", permisos))
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiry = DateTime.Now.AddHours(2);

        var token = new JwtSecurityToken(
            issuer: "SmartERP",
            audience: "SmartERP",
            claims: claims,
            expires: expiry,
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    [HttpPost("assign-role/{id_usuario:int}")]
    public async Task<IActionResult> AssignRole(int id_usuario, [FromBody] AssignRoleRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.NombreRol))
                return BadRequest(new { message = "nombre_rol requerido" });

            var role = await _roleService.GetRoleByNameAsync(request.NombreRol)
                ?? await _roleService.CreateRoleAsync(request.NombreRol, request.Descripcion);

            var updated = await _userService.UpdateTipoUsuarioAsync(id_usuario, role.IdRol);
            if (!updated)
                return NotFound(new { message = "Usuario no encontrado" });

            return Ok(new { message = "Rol asignado" });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error en AssignRole: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPut("{id_usuario:int}")]
    public async Task<IActionResult> ModifyUser(int id_usuario, [FromBody] UpdateUserRequest request)
    {
        try
        {
            if (id_usuario <= 0)
                return BadRequest(new { message = "id_usuario inválido" });

            var userRoles = HttpContext.User.FindFirst("roles")?.Value?.Split(',') ?? Array.Empty<string>();
            bool isAdmin = userRoles.Contains("admin");

            if (!isAdmin && request.TipoUsuario != null)
                return Forbid(new { message = "No tienes permiso para cambiar el rol del usuario" });

            string? passwordHash = null;
            if (!string.IsNullOrWhiteSpace(request.Password))
                passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

            bool updated = await _userService.UpdateUserAsync(id_usuario, request.Nombre, request.Email, request.TipoUsuario, request.Activo, passwordHash);

            if (!updated)
                return NotFound(new { message = "Usuario no encontrado o sin cambios" });

            return Ok(new { message = "Usuario actualizado" });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error en ModifyUser: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpDelete("{id_usuario:int}")]
    public async Task<IActionResult> RemoveUser(int id_usuario)
    {
        try
        {
            var roles = HttpContext.User.FindFirst("roles")?.Value?.Split(',') ?? Array.Empty<string>();
            bool isAdmin = roles.Contains("admin");
            var requesterId = HttpContext.User.FindFirst("id")?.Value;

            if (!isAdmin && requesterId != id_usuario.ToString())
                return Forbid(new { message = "No tienes permiso para eliminar este usuario" });

            bool deleted = await _userService.DeleteUserAsync(id_usuario);
            if (!deleted)
                return NotFound(new { message = "Usuario no encontrado" });

            return Ok(new { message = "Usuario eliminado" });
        }
        catch (Exception ex)
        {
            if (ex.Message.Contains("FK") || ex.Message.Contains("23503"))
                return Conflict(new { error = "No se puede eliminar usuario: existen registros relacionados." });

            Console.WriteLine($"Error en RemoveUser: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("users")]
    public async Task<IActionResult> ListUsers()
    {
        try
        {
            var users = await _userService.GetAllUsersAsync();
            return Ok(new { users });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error en ListUsers: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("roles")]
    public async Task<IActionResult> ListRoles()
    {
        try
        {
            var roles = await _roleService.GetAllRolesAsync();
            return Ok(new { roles });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error en ListRoles: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }
}

// DTOs
public record RegisterRequest(string Nombre, string Email, string Password, int? TipoUsuario);
public record LoginRequest(string Email, string Password);
public record AssignRoleRequest(string NombreRol, string? Descripcion);
public record UpdateUserRequest(string? Nombre, string? Email, int? TipoUsuario, bool? Activo, string? Password);
```

}
