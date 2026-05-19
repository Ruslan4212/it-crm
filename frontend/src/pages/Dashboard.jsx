import { useState, useEffect } from 'react';
import { tasks as tasksApi } from '../api/client';
import { useLocale } from '../contexts/LocaleContext';
import { useNavigate } from 'react-router-dom';

const statusIcons = {
  new: '🆕',
  in_progress: '🔄',
  done: '✅',
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const { t } = useLocale();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      tasksApi.stats(),
      tasksApi.list({ limit: 5 }),
    ]).then(([s, r]) => {
      setStats(s);
      setRecent(r.data);
    }).catch(() => {});
  }, []);

  return (
    <div>
      {stats ? (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <strong>{stats.tasks.total}</strong>
              <span>{t('dashboard.totalTasks')}</span>
            </div>
            <div className="stat-card">
              <strong>{stats.tasks.by_status?.find(s => s.status === 'in_progress')?.count || 0}</strong>
              <span>{t('dashboard.active')}</span>
            </div>
            <div className="stat-card">
              <strong>{stats.tasks.completed}</strong>
              <span>{t('dashboard.completed')}</span>
            </div>
            <div className="stat-card">
              <strong>{Math.round((stats.tasks.completed / (stats.tasks.total || 1)) * 100)}%</strong>
              <span>{t('dashboard.completionRate')}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
            <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 0, gap: 12 }}>
              <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/groups')}>
                <strong>{stats.groups?.total || 0}</strong>
                <span>{t('dashboard.groups')}</span>
              </div>
              <div className="stat-card">
                <strong>{stats.users?.total || 0}</strong>
                <span>{t('dashboard.users')}</span>
              </div>
            </div>

            {stats?.tasks?.by_status && (
              <div className="section-card">
                <div className="section-header">
                  <h2>{t('dashboard.tasksByStatus')}</h2>
                </div>
                <div className="section-body">
                  <div className="status-bars">
                    {stats.tasks.by_status.map(s => (
                      <div key={s.status} className="status-bar">
                        <span className="sb-label">
                          {statusIcons[s.status] || ''} {t('statuses.' + s.status) || s.status}
                        </span>
                        <div className="sb-track">
                          <div className={`sb-fill status-${s.status}`} style={{ width: `${(s.count / stats.tasks.total) * 100}%` }} />
                        </div>
                        <span className="sb-count">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="section-card">
            <div className="section-header">
              <h2>{t('dashboard.recentTasks')}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tasks')}>
                {t('tasks.title')} →
              </button>
            </div>
            <div className="section-body" style={{ padding: 0 }}>
              {recent.length === 0 ? (
                <div className="empty-state">
                  <p>{t('dashboard.noTasks')}</p>
                </div>
              ) : (
                <div className="task-list" style={{ padding: 12 }}>
                  {recent.map(task => (
                    <div key={task.id} className="task-item" onClick={() => navigate('/tasks')} style={{ cursor: 'pointer' }}>
                      <div className={`task-check ${task.status === 'done' ? 'done' : ''}`}>
                        {task.status === 'done' && '✓'}
                      </div>
                      <div className="task-info">
                        <div className="task-title">{task.title}</div>
                        <div className="task-meta">
                          <span className={`badge badge-${task.status}`}>{t('statuses.' + task.status) || task.status}</span>
                          <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-tertiary)' }}>
          {t('dashboard.loading')}
        </div>
      )}
    </div>
  );
}
