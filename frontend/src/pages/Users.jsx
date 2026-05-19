import { useState, useEffect } from 'react';
import { users as usersApi, auth } from '../api/client';
import { useLocale } from '../contexts/LocaleContext';

export default function Users() {
  const [list, setList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'manager' });
  const [pwModal, setPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const { t } = useLocale();

  const load = () => {
    usersApi.list().then(setList).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditUser(null);
    setForm({ email: '', password: '', full_name: '', role: 'manager' });
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditUser(user);
    setForm({ email: user.email, password: '', full_name: user.full_name, role: user.role });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editUser) {
        const data = {};
        if (form.email !== editUser.email) data.email = form.email;
        if (form.full_name !== editUser.full_name) data.full_name = form.full_name;
        if (form.role !== editUser.role) data.role = form.role;
        if (form.password) data.password = form.password;
        if (Object.keys(data).length) await usersApi.update(editUser.id, data);
      } else {
        await usersApi.create(form);
      }
      setShowModal(false);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('users.deleteConfirm'))) return;
    try {
      await usersApi.remove(id);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    try {
      await auth.changePassword(pwForm.current_password, pwForm.new_password);
      setPwSuccess(t('profile.success'));
      setPwForm({ current_password: '', new_password: '' });
    } catch (err) {
      setPwError(err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>{t('users.title')} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-tertiary)' }}>({list.length})</span></h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => { setPwModal(true); setPwError(''); setPwSuccess(''); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            {t('profile.changePassword')}
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t('users.add')}
          </button>
        </div>
      </div>

      <div className="section-card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t('users.fullName')}</th>
                <th>{t('users.email')}</th>
                <th>{t('users.role')}</th>
                <th>{t('users.created')}</th>
                <th style={{ width: 100 }}>{t('tasks.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {list.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.full_name}</td>
                  <td>{u.email}</td>
                  <td><span className="badge badge-new" style={{ textTransform: 'capitalize' }}>{u.role}</span></td>
                  <td style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-xs" onClick={() => openEdit(u)} title={t('users.edit')}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z" />
                        </svg>
                      </button>
                      <button className="btn btn-danger btn-xs" onClick={() => handleDelete(u.id)} title={t('users.delete')}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editUser ? t('users.edit') : t('users.add')}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>{t('users.fullName')}</label>
                  <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required autoFocus />
                </div>
                <div className="form-group">
                  <label>{t('users.email')}</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>{t('users.password')}</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    required={!editUser}
                    placeholder={editUser ? '···' : ''}
                  />
                </div>
                <div className="form-group">
                  <label>{t('users.role')}</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>{t('users.cancel')}</button>
                <button type="submit" className="btn btn-primary">{editUser ? t('users.save') : t('users.create')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pwModal && (
        <div className="modal-overlay" onClick={() => setPwModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 400 }}>
            <div className="modal-header">
              <h2>{t('profile.changePassword')}</h2>
              <button className="modal-close" onClick={() => setPwModal(false)}>✕</button>
            </div>
            <form onSubmit={handleChangePassword}>
              <div className="modal-body">
                {pwError && <div className="error">{pwError}</div>}
                {pwSuccess && <div style={{ background: 'var(--success-bg)', color: '#15803d', padding: '10px 14px', borderRadius: 'var(--radius)', marginBottom: 16, fontSize: 13 }}>{pwSuccess}</div>}
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
                <button type="button" className="btn btn-ghost" onClick={() => setPwModal(false)}>{t('users.cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('profile.changeBtn')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
