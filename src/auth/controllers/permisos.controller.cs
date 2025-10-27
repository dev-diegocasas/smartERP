using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using SmartERP.Models;
using SmartERP.Services;

namespace SmartERP.Controllers
{
[ApiController]
[Route("api/[controller]")]
public class PermisosController : ControllerBase
{
private readonly IPermisoService _permisoService;
private readonly IRolPermisoService _rolPermisoService;

```
    public PermisosController(IPermisoService permisoService, IRolPermisoService rolPermisoService)
    {
        _permisoService = permisoService;
        _rolPermisoService = rolPermisoService;
    }

    [HttpGet]
    public async Task<IActionResult> ListPermisos()
    {
        try
        {
            var permisos = await _permisoService.GetAllPermisosAsync();
            return Ok(new { permisos });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error en ListPermisos: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreatePermiso([FromBody] Permiso permiso)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(permiso.NombrePermiso))
                return BadRequest(new { message = "El nombre del permiso es requerido" });

            var existing = await _permisoService.GetPermisoByNameAsync(permiso.NombrePermiso);
            if (existing != null)
                return BadRequest(new { message = "Ya existe un permiso con ese nombre" });

            var created = await _permisoService.CreatePermisoAsync(permiso);
            return Created("", new { message = "Permiso creado", permiso = created });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error en CreatePermiso: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPut("{id_permiso:int}")]
    public async Task<IActionResult> UpdatePermiso(int id_permiso, [FromBody] Permiso permiso)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(permiso.NombrePermiso))
                return BadRequest(new { message = "El nombre del permiso es requerido" });

            var updated = await _permisoService.UpdatePermisoAsync(id_permiso, permiso);
            if (!updated)
                return NotFound(new { message = "Permiso no encontrado" });

            return Ok(new { message = "Permiso actualizado correctamente" });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error en UpdatePermiso: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpDelete("{id_permiso:int}")]
    public async Task<IActionResult> DeletePermiso(int id_permiso)
    {
        try
        {
            var deleted = await _permisoService.DeletePermisoAsync(id_permiso);
            if (!deleted)
                return NotFound(new { message = "Permiso no encontrado" });

            return Ok(new { message = "Permiso eliminado correctamente" });
        }
        catch (Exception ex)
        {
            if (ex.Message.Contains("FK"))
                return Conflict(new { error = "No se puede eliminar el permiso: está siendo usado por roles." });

            Console.WriteLine($"Error en DeletePermiso: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("rol/{id_rol:int}")]
    public async Task<IActionResult> GetPermisosByRol(int id_rol)
    {
        try
        {
            var permisos = await _rolPermisoService.GetPermisosByRolAsync(id_rol);
            return Ok(new { permisos });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error en GetPermisosByRol: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("rol/{id_rol:int}/permiso/{id_permiso:int}")]
    public async Task<IActionResult> AsignarPermisoARol(int id_rol, int id_permiso)
    {
        try
        {
            var result = await _rolPermisoService.AsignarPermisoARolAsync(id_rol, id_permiso);
            if (!result.Success)
                return BadRequest(new { message = result.Message });

            return Ok(new { message = "Permiso asignado al rol correctamente" });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error en AsignarPermisoARol: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpDelete("rol/{id_rol:int}/permiso/{id_permiso:int}")]
    public async Task<IActionResult> RemoverPermisoDeRol(int id_rol, int id_permiso)
    {
        try
        {
            var result = await _rolPermisoService.RemoverPermisoDeRolAsync(id_rol, id_permiso);
            if (!result.Success)
                return NotFound(new { message = "La relación rol-permiso no existe" });

            return Ok(new { message = "Permiso removido del rol correctamente" });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error en RemoverPermisoDeRol: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("rol/{id_rol:int}/permisos")]
    public async Task<IActionResult> AsignarPermisosARol(int id_rol, [FromBody] int[] permisosIds)
    {
        try
        {
            var result = await _rolPermisoService.AsignarPermisosARolAsync(id_rol, permisosIds);
            return Ok(new { message = result.Message });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error en AsignarPermisosARol: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("withRoles")]
    public async Task<IActionResult> GetAllPermisosWithRoles()
    {
        try
        {
            var permisos = await _rolPermisoService.GetAllPermisosWithRolesAsync();
            return Ok(new { permisos });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error en GetAllPermisosWithRoles: {ex.Message}");
            return StatusCode(500, new { error = ex.Message });
        }
    }
}
```

}
