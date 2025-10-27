// public/js/auth.js
window.APP_AUTH = (function () {
    const tokenKey = 'auth_token';
    const userKey = 'auth_user';
  
    function getToken() { return localStorage.getItem(tokenKey); }
    function setToken(t) { if (t) localStorage.setItem(tokenKey, t); else localStorage.removeItem(tokenKey); }
    function getUser() { try { return JSON.parse(localStorage.getItem(userKey)); } catch { return null; } }
    function setUser(u) { if (u) localStorage.setItem(userKey, JSON.stringify(u)); else localStorage.removeItem(userKey); }
  
    async function login({ email, password, tipo_usuario }) {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, tipo_usuario })
      });
      if (!res.ok) {
        const body = await res.json().catch(()=>({}));
        throw new Error(body.message || `Login failed (${res.status})`);
      }
      const data = await res.json();
      // adaptarse si el backend devuelve otro campo
      setToken(data.token || data.accessToken);
      setUser(data.user || data.usuario || null);
      return data;
    }
  
    function logout() {
      setToken(null);
      setUser(null);
      // Limpiar cualquier estado adicional
      try { 
        localStorage.removeItem(tokenKey);
        localStorage.removeItem(userKey);
        // Redirigir al login
        window.location.href = '/login.html';
      } catch (e) {
        console.error('Error durante logout:', e);
        // Fallback: redirigir de todas formas
        window.location.href = '/login.html';
      }
    }
  
    function isAuthenticated() { 
      const token = getToken();
      if (!token) return false;
      
      try {
        // Verificar si el token está expirado (decodificar sin verificar firma)
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
          // Token expirado, limpiar sesión
          logout();
          return false;
        }
        return true;
      } catch (e) {
        // Token malformado, limpiar sesión
        logout();
        return false;
      }
    }
  
    async function fetchAuth(url, opts = {}) {
      const headers = opts.headers ? { ...opts.headers } : {};
      const token = getToken();
      if (token) headers['Authorization'] = 'Bearer ' + token;
      const res = await fetch(url, { ...opts, headers });
      if (res.status === 401) {
        logout();
        location.replace('/login.html');
      }
      return res;
    }
  
    return { login, logout, getToken, getUser, setUser, isAuthenticated, fetchAuth };
  })();
  