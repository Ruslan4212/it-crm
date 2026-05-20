import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, setToken } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';

const API = '/api';

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', full_name: '', group_ids: [] });
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState('');
  const { t } = useLocale();
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API}/groups/public`).then(r => r.json()).then(setGroups).catch(() => {});
  }, []);

  const toggleGroup = (gid) => {
    setForm(prev => ({
      ...prev,
      group_ids: prev.group_ids.includes(gid)
        ? prev.group_ids.filter(id => id !== gid)
        : [...prev.group_ids, gid],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await auth.register({ ...form, group_ids: form.group_ids });
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-page">
      <form onSubmit={handleSubmit} className="login-form" style={{ width: 440 }}>
        <h1>{t('app.title')}</h1>
        <p>{t('register.title')}</p>
        {error && <div className="error">{error}</div>}
        <input
          placeholder={t('register.name')}
          value={form.full_name}
          onChange={e => setForm({ ...form, full_name: e.target.value })}
          required
        />
        <input
          type="email"
          placeholder={t('register.email')}
          value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder={t('register.password')}
          value={form.password}
          onChange={e => setForm({ ...form, password: e.target.value })}
          required
        />
        {groups.length > 0 && (
          <div style={{ marginBottom: 12, textAlign: 'left' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--sidebar-text)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              {t('register.selectGroups')}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {groups.map(g => (
                <label key={g.id} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  background: form.group_ids.includes(g.id) ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)',
                  border: form.group_ids.includes(g.id) ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)',
                  color: form.group_ids.includes(g.id) ? '#fff' : 'var(--sidebar-text)',
                  transition: 'all 0.15s',
                }}>
                  <input
                    type="checkbox"
                    checked={form.group_ids.includes(g.id)}
                    onChange={() => toggleGroup(g.id)}
                    style={{ width: 16, height: 16, margin: 0, accentColor: 'var(--primary)' }}
                  />
                  {g.name}
                </label>
              ))}
            </div>
          </div>
        )}
        <button type="submit">{t('register.btn')}</button>
        <p className="form-footer">
          {t('register.haveAccount')} <Link to="/login">{t('register.signIn')}</Link>
        </p>
      </form>
    </div>
  );
}
