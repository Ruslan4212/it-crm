import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { groups } from '../api/client';
import { useLocale } from '../contexts/LocaleContext';

export default function Groups() {
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const { t } = useLocale();
  const navigate = useNavigate();

  const load = () => {
    groups.list({ search }).then(setList).catch(() => {});
  };

  useEffect(() => { load(); }, [search]);

  const openCreate = () => {
    setEditGroup(null);
    setForm({ name: '', description: '' });
    setShowCreate(true);
  };

  const openEdit = (group, e) => {
    e.stopPropagation();
    setEditGroup(group);
    setForm({ name: group.name, description: group.description || '' });
    setShowCreate(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editGroup) {
      await groups.update(editGroup.id, form);
    } else {
      await groups.create(form);
    }
    setShowCreate(false);
    setEditGroup(null);
    setForm({ name: '', description: '' });
    load();
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm(t('groups.deleteConfirm'))) return;
    await groups.remove(id);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h1>{t('groups.title')} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-tertiary)' }}>({list.length})</span></h1>
        <button className="btn btn-primary" onClick={openCreate}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t('groups.add')}
        </button>
      </div>

      <div className="filters">
        <div className="search-wrapper">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input placeholder={t('groups.search')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {list.length === 0 ? (
        <div className="section-card">
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3>{t('groups.empty')}</h3>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreate}>{t('groups.add')}</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {list.map(group => (
            <div
              key={group.id}
              className="section-card"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/groups/${group.id}`)}
            >
              <div className="section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: 14,
                  }}>
                    {group.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{group.name}</h2>
                    {group.description && (
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>{group.description}</div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-xs" onClick={(e) => openEdit(group, e)} title={t('groups.edit')}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z" />
                    </svg>
                  </button>
                  <button className="btn btn-danger btn-xs" onClick={(e) => handleDelete(group.id, e)}>
                    {t('groups.delete')}
                  </button>
                </div>
              </div>
              <div className="section-body">
                <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
                  <span>👥 {group.members?.length || 0} {t('groups.memberCount')}</span>
                  <span>📋 {group.task_count || 0} {t('groups.taskCount')}</span>
                </div>
                {group.members && group.members.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 12, flexWrap: 'wrap' }}>
                    {group.members.map(m => (
                      <span key={m.id} style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'var(--border-light)', color: 'var(--text-secondary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 600,
                      }} title={m.full_name}>
                        {m.full_name.charAt(0).toUpperCase()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={() => { setShowCreate(false); setEditGroup(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editGroup ? t('groups.edit') : t('groups.add')}</h2>
              <button className="modal-close" onClick={() => { setShowCreate(false); setEditGroup(null); }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
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
                <button type="button" className="btn btn-ghost" onClick={() => { setShowCreate(false); setEditGroup(null); }}>{t('groups.cancel')}</button>
                <button type="submit" className="btn btn-primary">
                  {editGroup ? t('groups.save') : t('groups.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
