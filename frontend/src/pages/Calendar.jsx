import { useState, useEffect } from 'react';
import { events } from '../api/client';
import { useLocale } from '../contexts/LocaleContext';

const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function Calendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [eventList, setEventList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', event_date: '', event_time: '' });
  const { t, locale } = useLocale();

  const MONTHS = locale === 'ru' ? MONTHS_RU : MONTHS_EN;

  const load = () => {
    events.list({ year, month }).then(setEventList).catch(() => {});
  };

  useEffect(() => { load(); }, [year, month]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();

  const eventsByDate = {};
  eventList.forEach(e => {
    const d = e.event_date.slice(0, 10);
    if (!eventsByDate[d]) eventsByDate[d] = [];
    eventsByDate[d].push(e);
  });

  const openCreate = (date) => {
    setEditEvent(null);
    setForm({ title: '', description: '', event_date: date || '', event_time: '' });
    setShowModal(true);
  };

  const openEdit = (ev) => {
    setEditEvent(ev);
    setForm({
      title: ev.title,
      description: ev.description || '',
      event_date: ev.event_date.slice(0, 10),
      event_time: ev.event_time ? ev.event_time.slice(0, 5) : '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.event_date) return;
    const payload = {
      title: form.title,
      description: form.description,
      event_date: form.event_date,
      event_time: form.event_time || null,
    };
    if (editEvent) {
      await events.update(editEvent.id, payload);
    } else {
      await events.create(payload);
    }
    setShowModal(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm(t('calendar.deleteConfirm'))) return;
    await events.remove(id);
    load();
  };

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  const wdays = locale === 'ru'
    ? ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
    : ['Mo','Tu','We','Th','Fr','Sa','Su'];

  const cells = [];
  for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="page-header">
        <h1>{t('calendar.title')}</h1>
        <button className="btn btn-primary" onClick={() => openCreate(todayStr)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t('calendar.add')}
        </button>
      </div>

      <div className="calendar-container">
        <div className="calendar-header">
          <button className="btn btn-ghost btn-sm" onClick={prevMonth}>←</button>
          <h2>{MONTHS[month - 1]} {year}</h2>
          <button className="btn btn-ghost btn-sm" onClick={nextMonth}>→</button>
        </div>

        <div className="calendar-grid">
          <div className="calendar-weekdays">
            {wdays.map(d => <div key={d} className="cwday">{d}</div>)}
          </div>
          <div className="calendar-days">
            {cells.map((d, i) => {
              if (!d) return <div key={i} className="cday empty" />;
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const dayEvents = eventsByDate[dateStr] || [];
              const isToday = dateStr === todayStr;
              return (
                <div key={i} className={`cday ${isToday ? 'today' : ''}`} onClick={() => openCreate(dateStr)}>
                  <span className="cday-num">{d}</span>
                  {dayEvents.length > 0 && (
                    <div className="cday-events">
                      {dayEvents.slice(0, 2).map(ev => (
                        <div key={ev.id} className="cday-event" onClick={e => { e.stopPropagation(); openEdit(ev); }}>
                          {ev.event_time && <span className="cday-ev-time">{ev.event_time.slice(0, 5)}</span>}
                          <span className="cday-ev-title">{ev.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 2 && <div className="cday-event more">+{dayEvents.length - 2} more</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2>{editEvent ? t('calendar.edit') : t('calendar.add')}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>{t('calendar.title')}</label>
                  <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required autoFocus />
                </div>
                <div className="form-group">
                  <label>{t('calendar.description')}</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label>{t('calendar.date')}</label>
                    <input type="date" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>{t('calendar.time')}</label>
                    <input type="time" value={form.event_time} onChange={e => setForm({ ...form, event_time: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <div>
                  {editEvent && (
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(editEvent.id)}>
                      {t('calendar.delete')}
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
                  <button type="submit" className="btn btn-primary">{editEvent ? t('common.save') : t('calendar.create')}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
