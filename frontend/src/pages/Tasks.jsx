import { useState, useEffect } from 'react';
import { tasks, groups as groupsApi } from '../api/client';
import { useLocale } from '../contexts/LocaleContext';

const statusOptions = ['new', 'in_progress', 'done'];

export default function Tasks() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: '', priority: '', group_id: '' });
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', status: 'new', group_ids: [] });
  const [groupList, setGroupList] = useState([]);
  const [showImport, setShowImport] = useState(false);
  const [importAi, setImportAi] = useState(true);
  const [importResult, setImportResult] = useState(null);
  const { t } = useLocale();

  const load = () => {
    const params = { page, limit: 20, search };
    if (filters.status) params.status = filters.status;
    if (filters.priority) params.priority = filters.priority;
    if (filters.group_id) params.group_id = filters.group_id;
    tasks.list(params).then(res => {
      setList(res.data);
      setTotal(res.total);
    }).catch(() => {});
    groupsApi.list().then(setGroupList).catch(() => {});
  };

  useEffect(() => { load(); }, [page, filters, search]);

  const openCreate = () => {
    setEditTask(null);
    setForm({ title: '', description: '', priority: 'medium', status: 'new', group_ids: [] });
    setShowModal(true);
  };

  const openEdit = (task) => {
    const gids = task.task_groups ? task.task_groups.map(g => g.id) : [];
    setEditTask(task);
    setForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      group_ids: gids,
    });
    setShowModal(true);
  };

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
    if (!form.title.trim()) return;
    const payload = {
      title: form.title,
      description: form.description,
      priority: form.priority,
      status: form.status,
      group_ids: form.group_ids,
    };
    if (editTask) {
      await tasks.update(editTask.id, payload);
    } else {
      await tasks.create(payload);
    }
    setShowModal(false);
    load();
  };

  const changeStatus = async (id, newStatus) => {
    await tasks.update(id, { status: newStatus });
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm(t('tasks.deleteConfirm'))) return;
    await tasks.remove(id);
    load();
  };

  const handleExport = () => {
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.priority) params.priority = filters.priority;
    if (filters.group_id) params.group_id = filters.group_id;
    if (search) params.search = search;
    tasks.exportTasks(params);
  };

  const handleImport = async (e) => {
    e.preventDefault();
    const file = e.target.file.files[0];
    if (!file) return;
    try {
      const result = await tasks.importTasks(file, importAi);
      setImportResult(result);
      load();
    } catch (err) {
      setImportResult({ error: err.message });
    }
  };

  const activeCount = list.filter(t => t.status !== 'done').length;

  return (
    <div>
      <div className="page-header">
        <h1>
          {t('tasks.title')}
          <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 8 }}>
            {total} · {activeCount} {t('dashboard.active')}
          </span>
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={handleExport}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {t('tasks.export')}
          </button>
          <button className="btn btn-ghost" onClick={() => { setShowImport(true); setImportAi(true); setImportResult(null); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {t('tasks.import')}
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t('tasks.add')}
          </button>
        </div>
      </div>

      <div className="filters">
        <div className="search-wrapper">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input placeholder={t('tasks.search')} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select value={filters.status} onChange={e => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}>
          <option value="">{t('tasks.allStatuses')}</option>
          {statusOptions.map(s => <option key={s} value={s}>{t('statuses.' + s) || s}</option>)}
        </select>
        <select value={filters.priority} onChange={e => { setFilters({ ...filters, priority: e.target.value }); setPage(1); }}>
          <option value="">{t('tasks.allPriorities')}</option>
          <option value="low">{t('tasks.low')}</option>
          <option value="medium">{t('tasks.medium')}</option>
          <option value="high">{t('tasks.high')}</option>
        </select>
        <select value={filters.group_id} onChange={e => { setFilters({ ...filters, group_id: e.target.value }); setPage(1); }}>
          <option value="">{t('groups.selectGroup')}</option>
          {groupList.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      <div className="section-card">
        {list.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <h3>{t('tasks.empty')}</h3>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreate}>{t('tasks.add')}</button>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>{t('tasks.titleLabel')}</th>
                  <th style={{ width: 140 }}>{t('tasks.status')}</th>
                  <th style={{ width: 100 }}>{t('tasks.priorityLabel')}</th>
                  <th style={{ width: 160 }}>{t('groups.title')}</th>
                  <th style={{ width: 100 }}>{t('tasks.assignee')}</th>
                  <th style={{ width: 80 }}>{t('tasks.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {list.map(task => (
                  <tr key={task.id} className={task.status === 'done' ? 'task-done' : ''}>
                    <td>
                      <button
                        className={`task-check ${task.status === 'done' ? 'done' : ''}`}
                        onClick={() => changeStatus(task.id, task.status === 'done' ? 'new' : 'done')}
                        title={task.status === 'done' ? 'Reopen' : t('tasks.complete')}
                      >
                        {task.status === 'done' && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, textDecoration: task.status === 'done' ? 'line-through' : 'none', color: task.status === 'done' ? 'var(--text-tertiary)' : 'var(--text)' }}>
                        {task.title}
                      </div>
                      {task.description && (
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <select
                        value={task.status}
                        onChange={e => changeStatus(task.id, e.target.value)}
                        className={`badge badge-${task.status}`}
                        style={{ border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                      >
                        {statusOptions.map(s => <option key={s} value={s}>{t('statuses.' + s) || s}</option>)}
                      </select>
                    </td>
                    <td><span className={`badge badge-${task.priority}`}>{task.priority}</span></td>
                    <td>
                      {task.task_groups && task.task_groups.length > 0 ? (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {task.task_groups.map(g => (
                            <span key={g.id} style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'var(--border-light)', padding: '2px 8px', borderRadius: 4 }}>{g.name}</span>
                          ))}
                        </div>
                      ) : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                    </td>
                    <td style={{ color: 'var(--text-tertiary)' }}>{task.assignee_name || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-xs" onClick={() => openEdit(task)} title={t('tasks.edit')}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z" />
                          </svg>
                        </button>
                        <button className="btn btn-danger btn-xs" onClick={() => handleDelete(task.id)} title={t('tasks.delete')}>
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
        )}
      </div>

      {Math.ceil(total / 20) > 1 && (
        <div className="pagination">
          {Array.from({ length: Math.ceil(total / 20) }, (_, i) => (
            <button key={i} className={page === i + 1 ? 'active' : ''} onClick={() => setPage(i + 1)}>{i + 1}</button>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editTask ? t('tasks.edit') : t('tasks.add')}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>{t('tasks.titleLabel')}</label>
                  <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder={t('tasks.titleLabel')} required autoFocus />
                </div>
                <div className="form-group">
                  <label>{t('tasks.description')}</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={t('tasks.description')} rows={3} style={{ resize: 'vertical' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label>{t('tasks.status')}</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      {statusOptions.map(s => <option key={s} value={s}>{t('statuses.' + s) || s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>{t('tasks.priorityLabel')}</label>
                    <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                      <option value="low">{t('tasks.low')}</option>
                      <option value="medium">{t('tasks.medium')}</option>
                      <option value="high">{t('tasks.high')}</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>{t('groups.title')} ({t('tasks.chooseMultiple')})</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '8px 0' }}>
                    {groupList.map(g => (
                      <label key={g.id} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                        background: form.group_ids.includes(g.id) ? 'var(--primary-light)' : 'var(--border-light)',
                        border: form.group_ids.includes(g.id) ? '1px solid var(--primary)' : '1px solid transparent',
                        fontSize: 13, fontWeight: 500,
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
                    {groupList.length === 0 && (
                      <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>{t('groups.empty')}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>{t('tasks.cancel')}</button>
                <button type="submit" className="btn btn-primary">{editTask ? t('tasks.save') : t('tasks.create')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImport && (
        <div className="modal-overlay" onClick={() => { setShowImport(false); setImportResult(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2>{t('tasks.import')}</h2>
              <button className="modal-close" onClick={() => { setShowImport(false); setImportResult(null); }}>✕</button>
            </div>
            <form onSubmit={handleImport}>
              <div className="modal-body">
                {importResult ? (
                  <div>
                    {importResult.error ? (
                      <p style={{ color: 'var(--danger)' }}>{importResult.error}</p>
                    ) : (
                      <div>
                        <p style={{ color: 'var(--success)', fontWeight: 600, marginBottom: 8 }}>
                          {t('tasks.importSuccess')}: {importResult.imported}
                        </p>
                        {importResult.errors && importResult.errors.length > 0 && (
                          <div style={{ fontSize: 12, color: 'var(--danger)', maxHeight: 200, overflow: 'auto' }}>
                            {importResult.errors.map((e, i) => (
                              <div key={i}>Row {e.row}: {e.error}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <button type="button" className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => { setShowImport(false); setImportResult(null); }}>
                      {t('common.ok')}
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="form-group">
                      <label>{t('tasks.importFile')}</label>
                      <input type="file" name="file" accept=".xlsx,.xls,.csv" required />
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>{t('tasks.importHint')}</div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginTop: 8 }}>
                      <input type="checkbox" checked={importAi} onChange={e => setImportAi(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
                      {t('tasks.importAi')}
                    </label>
                  </div>
                )}
              </div>
              {!importResult && (
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => { setShowImport(false); setImportResult(null); }}>{t('tasks.cancel')}</button>
                  <button type="submit" className="btn btn-primary">{t('tasks.importBtn')}</button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
