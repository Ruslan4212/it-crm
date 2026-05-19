import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, setToken } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', full_name: '' });
  const [error, setError] = useState('');
  const { t } = useLocale();
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await auth.register(form);
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-page">
      <form onSubmit={handleSubmit} className="login-form">
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
        <button type="submit">{t('register.btn')}</button>
        <p className="form-footer">
          {t('register.haveAccount')} <Link to="/login">{t('register.signIn')}</Link>
        </p>
      </form>
    </div>
  );
}
