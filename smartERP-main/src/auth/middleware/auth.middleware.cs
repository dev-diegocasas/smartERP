using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using System.Security.Claims;

namespace YourApp.Auth
{
public class AuthMiddleware
{
private readonly RequestDelegate _next;
private readonly string _jwtSecret;

```
    public AuthMiddleware(RequestDelegate next, IConfiguration configuration)
    {
        _next = next;
        _jwtSecret = configuration["JWT_SECRET"];
    }

    /// <summary>
    /// authenticateJWT
    /// Verifica el token, decodifica y normaliza HttpContext.User con:
    /// - id
    /// - email
    /// - roles (array lowercase)
    /// - permisos (array lowercase)
    /// </summary>
    public async Task InvokeAsync(HttpContext context)
    {
        var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();

        if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer "))
        {
            var token = authHeader.Substring("Bearer ".Length).Trim();

            if (!string.IsNullOrEmpty(_jwtSecret))
            {
                try
                {
                    var tokenHandler = new JwtSecurityTokenHandler();
                    var key = Encoding.ASCII.GetBytes(_jwtSecret);
                    tokenHandler.ValidateToken(token, new TokenValidationParameters
                    {
                        ValidateIssuerSigningKey = true,
                        IssuerSigningKey = new SymmetricSecurityKey(key),
                        ValidateIssuer = false,
                        ValidateAudience = false,
                        ClockSkew = TimeSpan.Zero
                    }, out SecurityToken validatedToken);

                    var jwtToken = (JwtSecurityToken)validatedToken;
                    var claims = jwtToken.Claims.ToList();

                    context.Items["User"] = new
                    {
                        Id = claims.FirstOrDefault(c => c.Type == "id")?.Value,
                        Email = claims.FirstOrDefault(c => c.Type == "email")?.Value,
                        Roles = claims.Where(c => c.Type == "roles").Select(c => c.Value.ToLower()).ToList(),
                        RoleIds = claims.Where(c => c.Type == "roleIds").Select(c => c.Value).ToList(),
                        Permisos = claims.Where(c => c.Type == "permisos").Select(c => c.Value.ToLower()).ToList()
                    };
                }
                catch (Exception ex)
                {
                    Console.WriteLine("JWT verify error: " + ex.Message);
                    context.Response.StatusCode = 401;
                    await context.Response.WriteAsJsonAsync(new { message = "Token inválido" });
                    return;
                }
            }
        }

        await _next(context);
    }

    /// <summary>
    /// authorizeRole: permite acceso solo a roles específicos.
    /// </summary>
    public static Func<HttpContext, string, Task<bool>> AuthorizeRole = async (context, requiredRole) =>
    {
        var user = context.Items["User"];
        if (user == null) return false;

        var roles = ((dynamic)user).Roles as System.Collections.Generic.List<string>;
        return roles.Any(r => r.Equals(requiredRole, StringComparison.OrdinalIgnoreCase));
    };

    /// <summary>
    /// authorizeAdmin: permite acceso solo si el rol es admin.
    /// </summary>
    public static Func<HttpContext, Task<bool>> AuthorizeAdmin = async (context) =>
    {
        var user = context.Items["User"];
        if (user == null) return false;

        var roles = ((dynamic)user).Roles as System.Collections.Generic.List<string>;
        return roles.Any(r => r.Equals("admin", StringComparison.OrdinalIgnoreCase));
    };

    /// <summary>
    /// authorizeSelfOrAdmin: permite si es admin o el propio usuario.
    /// </summary>
    public static Func<HttpContext, int, Task<bool>> AuthorizeSelfOrAdmin = async (context, idUsuario) =>
    {
        var user = context.Items["User"];
        if (user == null) return false;

        var roles = ((dynamic)user).Roles as System.Collections.Generic.List<string>;
        var isAdmin = roles.Any(r => r.Equals("admin", StringComparison.OrdinalIgnoreCase));

        int.TryParse(((dynamic)user).Id, out int id);
        return isAdmin || id == idUsuario;
    };

    /// <summary>
    /// authorizePermission: permite acceso si el token tiene el permiso.
    /// </summary>
    public static Func<HttpContext, string, Task<bool>> AuthorizePermission = async (context, permiso) =>
    {
        var user = context.Items["User"];
        if (user == null) return false;

        var permisos = ((dynamic)user).Permisos as System.Collections.Generic.List<string>;
        return permisos.Contains(permiso.ToLower());
    };
}
```

}
