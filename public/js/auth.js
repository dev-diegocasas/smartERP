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
        body: JSON.stringify({ email, password })
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
      try { history.replaceState({}, '', '/login.html'); history.pushState(null, '', '/login.html'); } catch (e) {}
    }
  
    function isAuthenticated() { return !!getToken(); }
  
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
  