import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { useState, useEffect } from 'react';
import { auth, events } from '../api/client';

const Icons = {
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="4" rx="1" />
      <rect x="14" y="10" width="7" height="11" rx="1" />
      <rect x="3" y="13" width="7" height="8" rx="1" />
    </svg>
  ),
  tasks: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  groups: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  users: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  logout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  lock: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  calendar: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  bell: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
};

export default function Layout() {
  const { user, logout } = useAuth();
  const { t, locale, changeLocale } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const [pwModal, setPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '' });
  const [pwMsg, setPwMsg] = useState({ type: '', text: '' });
  const [todayEvents, setTodayEvents] = useState([]);
  const [showEvents, setShowEvents] = useState(false);

  useEffect(() => {
    if (user) {
      events.today().then(setTodayEvents).catch(() => {});
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMsg({ type: '', text: '' });
    try {
      await auth.changePassword(pwForm.current_password, pwForm.new_password);
      setPwMsg({ type: 'success', text: t('profile.success') });
      setPwForm({ current_password: '', new_password: '' });
    } catch (err) {
      setPwMsg({ type: 'error', text: err.message });
    }
  };

  const pageTitles = {
    '/': t('nav.dashboard'),
    '/tasks': t('nav.tasks'),
    '/groups': t('nav.groups'),
    '/users': t('nav.users'),
    '/calendar': t('nav.calendar'),
  };
  const pageTitle = pageTitles[location.pathname] || '';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </div>
          <div className="brand-text">
            <strong>{t('app.title')}</strong>
            <span>{t('app.subtitle')}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">{Icons.dashboard}</span>
            <span>{t('nav.dashboard')}</span>
          </NavLink>
          <NavLink to="/tasks" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">{Icons.tasks}</span>
            <span>{t('nav.tasks')}</span>
          </NavLink>
          <NavLink to="/groups" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">{Icons.groups}</span>
            <span>{t('nav.groups')}</span>
          </NavLink>
          <NavLink to="/calendar" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">{Icons.calendar}</span>
            <span>{t('nav.calendar')}</span>
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">{Icons.users}</span>
              <span>{t('nav.users')}</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">{user?.full_name?.charAt(0)?.toUpperCase() || '?'}</div>
            <div className="user-info">
              <span className="user-name">{user?.full_name}</span>
              <span className="user-role">{user?.role}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={() => { setPwModal(true); setPwMsg({ type: '', text: '' }); setPwForm({ current_password: '', new_password: '' }); }}>
            <span className="nav-icon">{Icons.lock}</span>
            <span>{t('profile.changePassword')}</span>
          </button>
          <select className="locale-switcher" value={locale} onChange={e => changeLocale(e.target.value)}>
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
          <button className="logout-btn" onClick={handleLogout}>
            <span className="nav-icon">{Icons.logout}</span>
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <h1 className="page-title">{pageTitle}</h1>
          <div className="topbar-right">
            <div className="notification-btn-wrapper">
              <button className={`notification-btn ${todayEvents.length > 0 ? 'has-events' : ''}`} onClick={() => setShowEvents(!showEvents)} title={t('calendar.todayEvents')}>
                {Icons.bell}
                {todayEvents.length > 0 && <span className="notification-badge">{todayEvents.length}</span>}
              </button>
              {showEvents && (
                <div className="notification-dropdown">
                  <div className="notification-header">{t('calendar.todayEvents')}</div>
                  {todayEvents.length === 0 ? (
                    <div className="notification-empty">{t('calendar.noEvents')}</div>
                  ) : (
                    todayEvents.map(ev => (
                      <div key={ev.id} className="notification-item">
                        <div className="notification-item-title">{ev.title}</div>
                        {ev.event_time && <div className="notification-item-time">{ev.event_time.slice(0, 5)}</div>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <select className="locale-switcher quick-locale" value={locale} onChange={e => changeLocale(e.target.value)}>
              <option value="ru">RU</option>
              <option value="en">EN</option>
            </select>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>

      {pwModal && (
        <div className="modal-overlay" onClick={() => setPwModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 400 }}>
            <div className="modal-header">
              <h2>{t('profile.changePassword')}</h2>
              <button className="modal-close" onClick={() => setPwModal(false)}>✕</button>
            </div>
            <form onSubmit={handleChangePassword}>
              <div className="modal-body">
                {pwMsg.type === 'error' && <div className="error">{pwMsg.text}</div>}
                {pwMsg.type === 'success' && (
                  <div style={{ background: 'var(--success-bg)', color: '#15803d', padding: '10px 14px', borderRadius: 'var(--radius)', marginBottom: 16, fontSize: 13 }}>{pwMsg.text}</div>
                )}
                <div className="form-group">
                  <label>{t('profile.currentPassword')}</label>
                  <input type="password" value={pwForm.current_password} onChange={e => setPwForm({ ...pwForm, current_password: e.target.value })} required autoFocus />
                </div>
                <div className="form-group">
                  <label>{t('profile.newPassword')}</label>
                  <input type="password" value={pwForm.new_password} onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setPwModal(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('profile.changeBtn')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
