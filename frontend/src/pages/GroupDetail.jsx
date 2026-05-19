import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { groups as groupsApi } from '../api/client';
import { useLocale } from '../contexts/LocaleContext';

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLocale();
  const [group, setGroup] = useState(null);
  const [selectedUser, setSelectedUser] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  const load = () => {
    groupsApi.getById(id).then(setGroup).catch(() => navigate('/groups'));
  };

  useEffect(() => { load(); }, [id]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    await groupsApi.addMember(id, parseInt(selectedUser));
    setSelectedUser('');
    load();
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm(t('groups.removeMemberConfirm'))) return;
    await groupsApi.removeMember(id, userId);
    load();
  };

  const openEdit = () => {
    setForm({ name: group.name, description: group.description || '' });
    setShowEdit(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    await groupsApi.update(id, form);
    setShowEdit(false);
    load();
  };

  if (!group) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-tertiary)' }}>{t('common.loading')}</div>;

  const memberCount = group.members?.length || 0;
  const taskCount = group.tasks?.length || 0;

  return (
    <div>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/groups')} style={{ marginBottom: 16 }}>
        ← {t('groups.title')}
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 22, flexShrink: 0,
        }}>
          {group.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{group.name}</h1>
            <button className="btn btn-ghost btn-xs" onClick={openEdit} title={t('groups.edit')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z" />
              </svg>
            </button>
          </div>
          {group.description && (
            <p style={{ color: 'var(--text-secondary)', marginTop: 2 }}>{group.description}</p>
          )}
          <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>
            <span>👥 {memberCount} {t('groups.memberCount')}</span>
            <span>📋 {taskCount} {t('groups.taskCount')}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
        {/* Members panel */}
        <div className="section-card" style={{ alignSelf: 'start' }}>
          <div className="section-header">
            <h2>{t('groups.members')} ({memberCount})</h2>
          </div>
          <div className="section-body">
            {group.available_users?.length > 0 && (
              <form onSubmit={handleAddMember} style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                <select
                  value={selectedUser}
                  onChange={e => setSelectedUser(e.target.value)}
                  style={{ flex: 1, fontSize: 12, padding: '6px 10px' }}
                >
                  <option value="">{t('groups.addMember')}...</option>
                  {group.available_users.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
                <button type="submit" className="btn btn-primary btn-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </form>
            )}

            {memberCount === 0 ? (
              <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>{t('groups.noMembers')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {group.members.map(m => (
                  <div key={m.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 10px', borderRadius: 8, background: 'var(--border-light)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 600,
                      }}>
                        {m.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{m.full_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{m.role}</div>
                      </div>
                    </div>
                    <button className="btn btn-danger btn-xs" onClick={() => handleRemoveMember(m.id)}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tasks panel */}
        <div className="section-card">
          <div className="section-header">
            <h2>{t('groups.tasks')} ({taskCount})</h2>
          </div>
          <div className="section-body" style={{ padding: 0 }}>
            {taskCount === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <p>{t('groups.noTasks')}</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>{t('tasks.titleLabel')}</th>
                      <th style={{ width: 100 }}>{t('tasks.status')}</th>
                      <th style={{ width: 80 }}>{t('tasks.priorityLabel')}</th>
                      <th style={{ width: 100 }}>{t('tasks.assignee')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.tasks.map(task => (
                      <tr key={task.id}>
                        <td style={{ fontWeight: 500 }}>{task.title}</td>
                        <td><span className={`badge badge-${task.status}`}>{t('statuses.' + task.status) || task.status}</span></td>
                        <td><span className={`badge badge-${task.priority}`}>{task.priority}</span></td>
                        <td style={{ color: 'var(--text-tertiary)' }}>{task.assignee_name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {showEdit && (
        <div className="modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('groups.edit')}</h2>
              <button className="modal-close" onClick={() => setShowEdit(false)}>✕</button>
            </div>
            <form onSubmit={handleEdit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>{t('groups.name')}</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('groups.name')} required autoFocus />
                </div>
                <div className="form-group">
                  <label>{t('groups.description')}</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={t('groups.description')} rows={3} style={{ resize: 'vertical' }} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowEdit(false)}>{t('groups.cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('groups.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
