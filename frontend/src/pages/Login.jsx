import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || t('login.error'));
    }
  };

  return (
    <div className="login-page">
      <form onSubmit={handleSubmit} className="login-form">
        <h1>{t('app.title')}</h1>
        <p>{t('login.signIn')}</p>
        {error && <div className="error">{error}</div>}
        <input type="email" placeholder={t('login.email')} value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder={t('login.password')} value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit">{t('login.signInBtn')}</button>
        <p className="form-footer">
          {t('login.noAccount')} <Link to="/register">{t('login.register')}</Link>
        </p>
      </form>
    </div>
  );
}
