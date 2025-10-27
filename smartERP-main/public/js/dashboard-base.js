// public/js/dashboard-base.js
class DashboardBase {
  constructor() {
    this.auth = window.APP_AUTH;
    this.currentModule = 'dashboard';
    this.user = null;
    this.userPermissions = [];
    this.init();
  }

  async init() {
    if (!this.auth.isAuthenticated()) {
      window.location.href = '/login.html';
      return;
    }

    this.user = this.auth.getUser();
    this.userPermissions = this.user?.permisos || [];
    
    this.setupEventListeners();
    this.setupUserInterface();
    await this.loadDashboardData();
  }

  setupEventListeners() {
    // Navegación por módulos
    document.querySelectorAll('.module-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const module = e.target.dataset.module;
        this.switchModule(module);
      });
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
      this.auth.logout();
      window.location.href = '/login.html';
    });

    // Modal
    document.getElementById('closeModal').addEventListener('click', () => {
      this.closeModal();
    });

    document.getElementById('modalOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'modalOverlay') {
        this.closeModal();
      }
    });

    // Event listeners específicos por módulo
    this.setupModuleEventListeners();
  }

  setupUserInterface() {
    // Mostrar información del usuario
    const userInfo = document.getElementById('userInfo');
    if (this.user) {
      userInfo.textContent = `${this.user.nombre} (${(this.user.roles || []).join(', ')})`;
    }

    // Configurar título del dashboard según el rol
    const title = document.getElementById('dashboardTitle');
    const subtitle = document.getElementById('dashboardSubtitle');
    
    if (this.user.roles.includes('admin')) {
      title.textContent = 'Dashboard Administrativo';
      subtitle.textContent = 'Panel de administración del sistema ERP';
    } else if (this.user.roles.includes('reclutador')) {
      title.textContent = 'Dashboard RRHH';
      subtitle.textContent = 'Gestión de recursos humanos';
    } else if (this.user.roles.includes('bodeguero')) {
      title.textContent = 'Dashboard Inventario';
      subtitle.textContent = 'Gestión de inventario y productos';
    } else if (this.user.roles.includes('vendedor')) {
      title.textContent = 'Dashboard Ventas';
      subtitle.textContent = 'Gestión de clientes y ventas';
    } else if (this.user.roles.includes('comprador')) {
      title.textContent = 'Dashboard Compras';
      subtitle.textContent = 'Gestión de proveedores y compras';
    }

    // Mostrar módulos según permisos
    this.showAvailableModules();
  }

  showAvailableModules() {
    const moduleNav = document.getElementById('moduleNav');
    const modules = {
      'rrhh': ['ver_empleados', 'gestionar_empleados'],
      'inventario': ['ver_inventario', 'gestionar_inventario'],
      'ventas': ['ver_clientes', 'gestionar_clientes'],
      'compras': ['ver_proveedores', 'gestionar_proveedores'],
      'admin': ['gestionar_usuarios', 'gestionar_permisos']
    };

    // Mostrar navegación si hay más de un módulo disponible
    let availableModules = 0;
    
    Object.entries(modules).forEach(([module, requiredPermissions]) => {
      const hasPermission = requiredPermissions.some(perm => 
        this.userPermissions.includes(perm)
      );
      
      if (hasPermission) {
        document.querySelector(`[data-module="${module}"]`).style.display = 'block';
        availableModules++;
      }
    });

    if (availableModules > 0) {
      moduleNav.style.display = 'block';
    }
  }

  switchModule(module) {
    // Ocultar todos los contenidos
    document.querySelectorAll('.module-content').forEach(content => {
      content.style.display = 'none';
    });
    document.getElementById('dashboardContent').style.display = 'none';

    // Mostrar contenido seleccionado
    if (module === 'dashboard') {
      document.getElementById('dashboardContent').style.display = 'block';
    } else {
      const content = document.getElementById(`${module}Content`);
      if (content) {
        content.style.display = 'block';
        this.loadModuleData(module);
      }
    }

    // Actualizar botones activos
    document.querySelectorAll('.module-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-module="${module}"]`).classList.add('active');

    this.currentModule = module;
  }

  async loadDashboardData() {
    const welcomeMessage = document.getElementById('welcomeMessage');
    if (this.user) {
      welcomeMessage.textContent = `Hola ${this.user.nombre}, bienvenido al sistema ERP.`;
    }

    // Cargar acciones rápidas según permisos
    this.loadQuickActions();
  }

  loadQuickActions() {
    const quickActions = document.getElementById('quickActions');
    const quickActionsContent = document.getElementById('quickActionsContent');
    
    if (this.userPermissions.length === 0) {
      quickActions.style.display = 'none';
      return;
    }

    const actions = [];

    if (this.userPermissions.includes('gestionar_empleados')) {
      actions.push({
        text: 'Agregar Empleado',
        action: () => this.switchModule('rrhh')
      });
    }

    if (this.userPermissions.includes('gestionar_inventario')) {
      actions.push({
        text: 'Agregar Producto',
        action: () => this.switchModule('inventario')
      });
    }

    if (this.userPermissions.includes('gestionar_clientes')) {
      actions.push({
        text: 'Agregar Cliente',
        action: () => this.switchModule('ventas')
      });
    }

    if (this.userPermissions.includes('gestionar_proveedores')) {
      actions.push({
        text: 'Agregar Proveedor',
        action: () => this.switchModule('compras')
      });
    }

    if (actions.length > 0) {
      quickActionsContent.innerHTML = actions.map(action => 
        `<button class="btn-secondary" onclick="dashboard.${action.action.name}()">${action.text}</button>`
      ).join('');
      quickActions.style.display = 'block';
    }
  }

  async loadModuleData(module) {
    switch (module) {
      case 'rrhh':
        await this.loadRRHHData();
        break;
      case 'inventario':
        await this.loadInventarioData();
        break;
      case 'ventas':
        await this.loadVentasData();
        break;
      case 'compras':
        await this.loadComprasData();
        break;
    }
  }

  async loadRRHHData() {
    if (!this.userPermissions.includes('ver_empleados')) return;

    try {
      const response = await this.auth.fetchAuth('/api/rrhh');
      const data = await response.json();
      
      if (response.ok) {
        this.renderEmpleadosTable(data.empleados);
        await this.loadDepartamentos();
        await this.loadCargos();
      }
    } catch (error) {
      console.error('Error cargando datos de RRHH:', error);
    }
  }

  async loadInventarioData() {
    if (!this.userPermissions.includes('ver_inventario')) return;

    try {
      const response = await this.auth.fetchAuth('/api/inventario');
      const data = await response.json();
      
      if (response.ok) {
        this.renderProductosTable(data.productos);
        await this.loadCategorias();
      }
    } catch (error) {
      console.error('Error cargando datos de inventario:', error);
    }
  }

  async loadVentasData() {
    if (!this.userPermissions.includes('ver_clientes')) return;

    try {
      const response = await this.auth.fetchAuth('/api/ventas');
      const data = await response.json();
      
      if (response.ok) {
        this.renderClientesTable(data.clientes);
        await this.loadEstadosCliente();
      }
    } catch (error) {
      console.error('Error cargando datos de ventas:', error);
    }
  }

  async loadComprasData() {
    if (!this.userPermissions.includes('ver_proveedores')) return;

    try {
      const response = await this.auth.fetchAuth('/api/compras');
      const data = await response.json();
      
      if (response.ok) {
        this.renderProveedoresTable(data.proveedores);
        await this.loadEstadosProveedor();
        await this.loadCalificaciones();
      }
    } catch (error) {
      console.error('Error cargando datos de compras:', error);
    }
  }

  renderEmpleadosTable(empleados) {
    const tbody = document.querySelector('#empleadosTable tbody');
    tbody.innerHTML = empleados.map(emp => `
      <tr>
        <td>${emp.id_empleado}</td>
        <td>${emp.nombre_completo}</td>
        <td>${emp.email}</td>
        <td>${emp.cargo}</td>
        <td>${emp.departamento}</td>
        <td>${emp.activo ? 'Activo' : 'Inactivo'}</td>
        <td>
          ${this.userPermissions.includes('gestionar_empleados') ? 
            `<button class="btn-edit" onclick="dashboard.editEmpleado(${emp.id_empleado})">Editar</button>
             <button class="btn-delete" onclick="dashboard.deleteEmpleado(${emp.id_empleado})">Eliminar</button>` : 
            'Sin permisos'
          }
        </td>
      </tr>
    `).join('');
  }

  renderProductosTable(productos) {
    const tbody = document.querySelector('#productosTable tbody');
    tbody.innerHTML = productos.map(prod => `
      <tr>
        <td>${prod.id_producto}</td>
        <td>${prod.codigo}</td>
        <td>${prod.nombre}</td>
        <td>$${prod.precio}</td>
        <td class="${prod.stock_actual <= prod.stock_minimo ? 'stock-bajo' : ''}">${prod.stock_actual}</td>
        <td>${prod.stock_minimo}</td>
        <td>${prod.activo ? 'Activo' : 'Inactivo'}</td>
        <td>
          ${this.userPermissions.includes('gestionar_inventario') ? 
            `<button class="btn-edit" onclick="dashboard.editProducto(${prod.id_producto})">Editar</button>
             <button class="btn-delete" onclick="dashboard.deleteProducto(${prod.id_producto})">Eliminar</button>` : 
            'Sin permisos'
          }
        </td>
      </tr>
    `).join('');
  }

  renderClientesTable(clientes) {
    const tbody = document.querySelector('#clientesTable tbody');
    tbody.innerHTML = clientes.map(cli => `
      <tr>
        <td>${cli.id_cliente}</td>
        <td>${cli.razon_social}</td>
        <td>${cli.email}</td>
        <td>${cli.telefono}</td>
        <td>${cli.estado}</td>
        <td>${new Date(cli.fecha_registro).toLocaleDateString()}</td>
        <td>
          ${this.userPermissions.includes('gestionar_clientes') ? 
            `<button class="btn-edit" onclick="dashboard.editCliente(${cli.id_cliente})">Editar</button>
             <button class="btn-delete" onclick="dashboard.deleteCliente(${cli.id_cliente})">Eliminar</button>` : 
            'Sin permisos'
          }
        </td>
      </tr>
    `).join('');
  }

  renderProveedoresTable(proveedores) {
    const tbody = document.querySelector('#proveedoresTable tbody');
    tbody.innerHTML = proveedores.map(prov => `
      <tr>
        <td>${prov.id_proveedor}</td>
        <td>${prov.razon_social}</td>
        <td>${prov.email}</td>
        <td>${prov.telefono}</td>
        <td>${'★'.repeat(prov.calificacion)}${'☆'.repeat(5 - prov.calificacion)}</td>
        <td>${prov.estado}</td>
        <td>
          ${this.userPermissions.includes('gestionar_proveedores') ? 
            `<button class="btn-edit" onclick="dashboard.editProveedor(${prov.id_proveedor})">Editar</button>
             <button class="btn-delete" onclick="dashboard.deleteProveedor(${prov.id_proveedor})">Eliminar</button>` : 
            'Sin permisos'
          }
        </td>
      </tr>
    `).join('');
  }

  // Métodos auxiliares para cargar datos de filtros
  async loadDepartamentos() {
    try {
      const response = await this.auth.fetchAuth('/api/rrhh/departamentos');
      const data = await response.json();
      const select = document.getElementById('departamentoFilter');
      select.innerHTML = '<option value="">Todos los departamentos</option>' +
        data.departamentos.map(dept => `<option value="${dept}">${dept}</option>`).join('');
    } catch (error) {
      console.error('Error cargando departamentos:', error);
    }
  }

  async loadCargos() {
    try {
      const response = await this.auth.fetchAuth('/api/rrhh/cargos');
      const data = await response.json();
      const select = document.getElementById('cargoFilter');
      select.innerHTML = '<option value="">Todos los cargos</option>' +
        data.cargos.map(cargo => `<option value="${cargo}">${cargo}</option>`).join('');
    } catch (error) {
      console.error('Error cargando cargos:', error);
    }
  }

  async loadCategorias() {
    try {
      const response = await this.auth.fetchAuth('/api/inventario/categorias');
      const data = await response.json();
      const select = document.getElementById('categoriaFilter');
      select.innerHTML = '<option value="">Todas las categorías</option>' +
        data.categorias.map(cat => `<option value="${cat.id_categoria}">${cat.nombre}</option>`).join('');
    } catch (error) {
      console.error('Error cargando categorías:', error);
    }
  }

  async loadEstadosCliente() {
    try {
      const response = await this.auth.fetchAuth('/api/ventas/estados');
      const data = await response.json();
      const select = document.getElementById('estadoClienteFilter');
      select.innerHTML = '<option value="">Todos los estados</option>' +
        data.estados.map(estado => `<option value="${estado.valor}">${estado.nombre}</option>`).join('');
    } catch (error) {
      console.error('Error cargando estados de cliente:', error);
    }
  }

  async loadEstadosProveedor() {
    try {
      const response = await this.auth.fetchAuth('/api/compras/estados');
      const data = await response.json();
      const select = document.getElementById('estadoProveedorFilter');
      select.innerHTML = '<option value="">Todos los estados</option>' +
        data.estados.map(estado => `<option value="${estado.valor}">${estado.nombre}</option>`).join('');
    } catch (error) {
      console.error('Error cargando estados de proveedor:', error);
    }
  }

  async loadCalificaciones() {
    try {
      const response = await this.auth.fetchAuth('/api/compras/calificaciones');
      const data = await response.json();
      const select = document.getElementById('calificacionFilter');
      select.innerHTML = '<option value="">Todas las calificaciones</option>' +
        data.calificaciones.map(cal => `<option value="${cal.valor}">${cal.nombre}</option>`).join('');
    } catch (error) {
      console.error('Error cargando calificaciones:', error);
    }
  }

  // Métodos para mostrar modales
  showModal(title, content) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = content;
    document.getElementById('modalOverlay').style.display = 'flex';
  }

  closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
  }

  // Métodos placeholder para acciones CRUD
  editEmpleado(id) {
    console.log('Editar empleado:', id);
    // Implementar lógica de edición
  }

  deleteEmpleado(id) {
    if (confirm('¿Está seguro de eliminar este empleado?')) {
      console.log('Eliminar empleado:', id);
      // Implementar lógica de eliminación
    }
  }

  editProducto(id) {
    console.log('Editar producto:', id);
    // Implementar lógica de edición
  }

  deleteProducto(id) {
    if (confirm('¿Está seguro de eliminar este producto?')) {
      console.log('Eliminar producto:', id);
      // Implementar lógica de eliminación
    }
  }

  editCliente(id) {
    console.log('Editar cliente:', id);
    // Implementar lógica de edición
  }

  deleteCliente(id) {
    if (confirm('¿Está seguro de eliminar este cliente?')) {
      console.log('Eliminar cliente:', id);
      // Implementar lógica de eliminación
    }
  }

  editProveedor(id) {
    console.log('Editar proveedor:', id);
    // Implementar lógica de edición
  }

  deleteProveedor(id) {
    if (confirm('¿Está seguro de eliminar este proveedor?')) {
      console.log('Eliminar proveedor:', id);
      // Implementar lógica de eliminación
    }
  }

  setupModuleEventListeners() {
    // Event listeners específicos para cada módulo
    // Estos se pueden expandir según las necesidades
  }
}

// Inicializar dashboard cuando se carga la página
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
  dashboard = new DashboardBase();
});
