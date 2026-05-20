const API = '/api';

let token = localStorage.getItem('token');

export function setToken(t) {
  token = t;
  if (t) localStorage.setItem('token', t);
  else localStorage.removeItem('token');
}

export function getToken() {
  return token;
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (res.status === 401) {
    setToken(null);
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const auth = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request('/auth/me'),
  changePassword: (current_password, new_password) =>
    request('/auth/password', { method: 'PUT', body: JSON.stringify({ current_password, new_password }) }),
};

async function requestFile(path, file) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API}${path}`, { method: 'POST', headers, body: formData });
  if (res.status === 401) {
    setToken(null);
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const tasks = {
  list: (params) => request(`/tasks?${new URLSearchParams(params)}`),
  getById: (id) => request(`/tasks/${id}`),
  create: (data) => request('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  stats: () => request('/tasks/stats'),
  exportTasks: (params) => {
    const qs = new URLSearchParams(params || {}).toString();
    const url = `${API}/tasks/export${qs ? '?' + qs : ''}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tasks.xlsx';
    const h = token ? { Authorization: `Bearer ${token}` } : {};
    fetch(url, { headers: h }).then(r => r.blob()).then(blob => {
      a.href = URL.createObjectURL(blob);
      a.click();
    });
  },
  importTasks: (file) => requestFile('/tasks/import', file),
};

export const groups = {
  list: (params) => request(`/groups?${new URLSearchParams(params || {})}`),
  getById: (id) => request(`/groups/${id}`),
  create: (data) => request('/groups', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/groups/${id}`, { method: 'DELETE' }),
  addMember: (id, userId) => request(`/groups/${id}/members`, { method: 'POST', body: JSON.stringify({ user_id: userId }) }),
  removeMember: (id, userId) => request(`/groups/${id}/members/${userId}`, { method: 'DELETE' }),
};

export const users = {
  list: () => request('/users'),
  create: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/users/${id}`, { method: 'DELETE' }),
};
