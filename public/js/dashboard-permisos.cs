using System;
using System.Collections.Generic;
using System.Linq;
using System.Windows.Forms; // Usa esto si es WinForms
// Si usas WPF, cambia los controles Label por TextBlock y Button/Panel según corresponda

public class User
{
    public string Nombre { get; set; }
    public List<string> Roles { get; set; } = new List<string>();
    public List<string> Permisos { get; set; } = new List<string>();
}

public partial class DashboardForm : Form
{
    private User user;

    public DashboardForm(User currentUser)
    {
        InitializeComponent();
        user = currentUser;
        SetupUserInterface();
    }

    private void SetupUserInterface()
    {
        // Mostrar información del usuario
        if (user != null)
        {
            userInfoLabel.Text = $"{user.Nombre} ({string.Join(", ", user.Roles)})";
        }

        // Configurar título y subtítulo según rol
        if (user.Roles.Contains("admin"))
        {
            dashboardTitleLabel.Text = "Dashboard Administrativo";
            dashboardSubtitleLabel.Text = "Panel de administración del sistema ERP";
        }
        else if (user.Roles.Contains("reclutador"))
        {
            dashboardTitleLabel.Text = "Dashboard RRHH";
            dashboardSubtitleLabel.Text = "Gestión de recursos humanos";
        }
        else if (user.Roles.Contains("bodeguero"))
        {
            dashboardTitleLabel.Text = "Dashboard Inventario";
            dashboardSubtitleLabel.Text = "Gestión de inventario y productos";
        }
        else if (user.Roles.Contains("vendedor"))
        {
            dashboardTitleLabel.Text = "Dashboard Ventas";
            dashboardSubtitleLabel.Text = "Gestión de clientes y ventas";
        }
        else if (user.Roles.Contains("comprador"))
        {
            dashboardTitleLabel.Text = "Dashboard Compras";
            dashboardSubtitleLabel.Text = "Gestión de proveedores y compras";
        }

        ShowAvailableModules();
    }

    private void ShowAvailableModules()
    {
        var modules = new Dictionary<string, List<string>>
        {
            { "rrhh", new List<string> { "ver_empleados", "gestionar_empleados" } },
            { "inventario", new List<string> { "ver_inventario", "gestionar_inventario" } },
            { "ventas", new List<string> { "ver_clientes", "gestionar_clientes" } },
            { "compras", new List<string> { "ver_proveedores", "gestionar_proveedores" } },
            { "admin", new List<string> { "gestionar_usuarios", "gestionar_permisos" } }
        };

        int availableModules = 0;

        foreach (var module in modules)
        {
            bool hasPermission = module.Value.Any(perm => user.Permisos.Contains(perm));

            // Ejemplo: supongamos que cada panel de módulo tiene el nombre "panel_rrhh", "panel_inventario", etc.
            var modulePanel = this.Controls.Find($"panel_{module.Key}", true).FirstOrDefault();

            if (modulePanel != null)
            {
                modulePanel.Visible = hasPermission;
                if (hasPermission)
                    availableModules++;
            }
        }

        // Mostrar menú principal si hay módulos disponibles
        moduleNavPanel.Visible = (availableModules > 0);
    }
}
