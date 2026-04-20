/* ===== מרכז פיקוד — App Logic ===== */

// ── State ──────────────────────────────────────────────
const State = {
  page: 'home',
  brainCat: 'business',
  leadFilter: 'all',
  familyCat: 'tasks',
};

// ── Date Helpers ───────────────────────────────────────
const DAYS   = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
const MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

function todayStr() { return new Date().toISOString().split('T')[0]; }

function heDay() {
  const d = new Date();
  return `יום ${DAYS[d.getDay()]}, ${d.getDate()} ב${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function shortDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth()+1}`;
}

function fmtReminder(task) {
  if (!task.dueDate) return null;
  const d = new Date(task.dueDate);
  const t = task.reminderTime || '';
  return `${d.getDate()} ב${MONTHS[d.getMonth()]}${t ? ' · ' + t : ''}`;
}

// ── Toast ──────────────────────────────────────────────
function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.style.cssText = 'position:fixed;bottom:calc(var(--nav-h) + var(--safe-bottom) + 80px);right:50%;transform:translateX(50%);background:#1C1C1E;color:#fff;padding:10px 20px;border-radius:20px;font-size:14px;z-index:1000;transition:opacity 0.3s;white-space:nowrap;pointer-events:none';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._tid);
  t._tid = setTimeout(() => { t.style.opacity = '0'; }, 2200);
}

// ── Page Configs ───────────────────────────────────────
const PAGE_CFG = {
  home:     { title: 'דף הבית',      fabColor: 'var(--c-home)',     btnColor: 'var(--c-home)' },
  brain:    { title: 'מוח חיצוני',   fabColor: 'var(--c-brain)',    btnColor: 'var(--c-brain)' },
  finance:  { title: 'כספים',         fabColor: 'var(--c-finance)',  btnColor: 'var(--c-finance)' },
  crossfit: { title: 'CrossFit BUX',  fabColor: 'var(--c-crossfit)', btnColor: 'var(--c-crossfit)' },
  family:   { title: 'בית ומשפחה',   fabColor: 'var(--c-family)',   btnColor: 'var(--c-family)' },
};

// ── Navigation ─────────────────────────────────────────
function navigate(page) {
  document.getElementById('page-' + State.page).classList.add('hidden');
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

  State.page = page;
  const cfg = PAGE_CFG[page];
  document.getElementById('page-' + page).classList.remove('hidden');
  document.querySelector(`.nav-item[data-page="${page}"]`).classList.add('active');
  document.getElementById('header-title').textContent = cfg.title;
  document.getElementById('fab').style.setProperty('--fab-color', cfg.fabColor);
  document.documentElement.style.setProperty('--active-color', cfg.fabColor);

  renderPage(page);
}

function renderPage(page) {
  const el = document.getElementById('page-' + page);
  switch (page) {
    case 'home':     renderHome(el);     break;
    case 'brain':    renderBrain(el);    break;
    case 'finance':  renderFinance(el);  break;
    case 'crossfit': renderCrossfit(el); break;
    case 'family':   renderFamily(el);   break;
  }
}

// ── HOME ───────────────────────────────────────────────
function renderHome(el) {
  const tasks   = DB.get('tasks');
  const finance = DB.get('finance');
  const leads   = DB.get('leads');

  const openTasks   = tasks.filter(t => !t.done);
  const todayTasks  = openTasks.slice(0, 5);
  const openPayments = finance.filter(f => !f.isPaid && f.type === 'expense');
  const openAmount  = openPayments.reduce((s,f) => s + f.amount, 0);
  const newLeads    = leads.filter(l => l.status === 'new').length;
  const ideas       = tasks.filter(t => t.category === 'idea' && !t.done).length;
  const upcoming    = openTasks.filter(t => t.dueDate).sort((a,b) => a.dueDate.localeCompare(b.dueDate));

  el.innerHTML = `
    <div class="greeting">
      <div class="greeting-name">${getGreeting()}, גל 👋</div>
      <div class="greeting-sub">${heDay()}</div>
    </div>

    <div class="stats-grid">
      <div class="stat-card" onclick="navigate('brain')">
        <div class="stat-icon">🧠</div>
        <div class="stat-value">${openTasks.length}</div>
        <div class="stat-label">משימות פתוחות</div>
      </div>
      <div class="stat-card" onclick="navigate('finance')">
        <div class="stat-icon">💳</div>
        <div class="stat-value">₪${openAmount.toLocaleString('he-IL')}</div>
        <div class="stat-label">לתשלום</div>
      </div>
      <div class="stat-card" onclick="navigate('crossfit')">
        <div class="stat-icon">🏋️</div>
        <div class="stat-value">${newLeads}</div>
        <div class="stat-label">לידים חדשים</div>
      </div>
      <div class="stat-card" onclick="navigate('brain')">
        <div class="stat-icon">💡</div>
        <div class="stat-value">${ideas}</div>
        <div class="stat-label">רעיונות</div>
      </div>
    </div>

    ${upcoming.length ? `
    <div class="card">
      <div class="card-label">🔔 תזכורות קרובות</div>
      ${upcoming.slice(0,3).map(t => `
        <div class="task-item ${t.done?'done':''}">
          <div class="task-check ${t.done?'checked':''}" onclick="toggleTask('${t.id}','tasks')"></div>
          <div class="task-body">
            <div class="task-text">${esc(t.text)}</div>
            <div class="task-meta">📅 ${fmtReminder(t)}</div>
          </div>
          <button class="action-mini" onclick="event.stopPropagation();exportToCalendar('${t.id}')" title="ייצא ליומן">📅</button>
          <button class="action-mini" onclick="event.stopPropagation();shareTask('${t.id}')" title="שתף">📤</button>
        </div>
      `).join('')}
    </div>` : ''}

    <div class="card">
      <div class="card-label">משימות עדיפות</div>
      ${todayTasks.length
        ? todayTasks.map(t => taskItemHTML(t, true)).join('')
        : '<div class="empty"><div class="empty-icon">✅</div><div class="empty-text">כל המשימות הושלמו!</div></div>'}
    </div>

    ${openPayments.length ? `
    <div class="card">
      <div class="card-label">⚠️ תשלומים פתוחים</div>
      ${openPayments.slice(0,3).map(f => finItemHTML(f, false, true)).join('')}
    </div>` : ''}
  `;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'בוקר טוב';
  if (h < 17) return 'צהריים טובים';
  if (h < 21) return 'ערב טוב';
  return 'לילה טוב';
}

// ── BRAIN ──────────────────────────────────────────────
const BRAIN_CATS = [
  { key: 'business', label: '💼 עסק' },
  { key: 'home',     label: '🏠 בית' },
  { key: 'personal', label: '🙋 אישי' },
  { key: 'idea',     label: '💡 רעיונות' },
];

function renderBrain(el) {
  const cat   = State.brainCat;
  const tasks = DB.get('tasks').filter(t => t.section === 'brain' && t.category === cat);

  el.innerHTML = `
    <div class="sec-header"><div class="sec-title">מוח חיצוני</div></div>
    <div class="cat-tabs">
      ${BRAIN_CATS.map(c => `
        <button class="cat-tab ${c.key === cat ? 'active' : ''}"
          onclick="State.brainCat='${c.key}'; renderPage('brain')">${c.label}
          <span class="cat-count">${DB.get('tasks').filter(t=>t.section==='brain'&&t.category===c.key&&!t.done).length||''}</span>
        </button>
      `).join('')}
    </div>
    <div class="card">
      ${tasks.length
        ? tasks.map(t => taskItemHTML(t, true)).join('')
        : emptyHTML('📝', 'לחץ + להוסיף פריט')}
    </div>
  `;
}

// ── FINANCE ────────────────────────────────────────────
function renderFinance(el) {
  const all      = DB.get('finance');
  const month    = new Date().toISOString().slice(0,7);
  const monthly  = all.filter(f => f.date && f.date.startsWith(month));
  const income   = monthly.filter(f => f.type==='income').reduce((s,f) => s+f.amount, 0);
  const expense  = monthly.filter(f => f.type==='expense').reduce((s,f) => s+f.amount, 0);
  const unpaid   = all.filter(f => !f.isPaid);

  el.innerHTML = `
    <div class="sec-header"><div class="sec-title">כספים</div></div>

    <div class="finance-summary">
      <div class="fin-box">
        <span class="fin-amount amount-income">₪${income.toLocaleString('he-IL')}</span>
        <div class="fin-label">הכנסות החודש</div>
      </div>
      <div class="fin-box">
        <span class="fin-amount amount-expense">₪${expense.toLocaleString('he-IL')}</span>
        <div class="fin-label">הוצאות החודש</div>
      </div>
    </div>

    ${unpaid.length ? `
    <div class="card">
      <div class="card-label">⚠️ ממתינים לתשלום (${unpaid.length})</div>
      ${unpaid.map(f => finItemHTML(f, true, true)).join('')}
    </div>` : ''}

    <div class="card">
      <div class="card-label">כל העסקאות</div>
      ${all.length
        ? all.map(f => finItemHTML(f, true, false)).join('')
        : emptyHTML('💰', 'אין עסקאות עדיין')}
    </div>
  `;
}

function finItemHTML(f, showMark = false, showShare = false) {
  const isExp = f.type === 'expense';
  const bg = isExp ? '#FF3B3012' : '#34C75912';
  const icon = isExp ? '💸' : '💵';
  return `
    <div class="fin-item">
      <div class="fin-icon" style="background:${bg}">${icon}</div>
      <div class="fin-info">
        <div class="fin-name">${esc(f.description)}</div>
        <div class="fin-date">${shortDate(f.date)}${f.category ? ' · ' + catLabel(f.category) : ''}</div>
      </div>
      <div class="fin-right">
        <span class="fin-amount-val ${isExp?'amount-expense':'amount-income'}">
          ${isExp?'−':'+'}₪${f.amount.toLocaleString('he-IL')}
        </span>
        ${showMark ? `<div class="fin-status">
          ${f.isPaid
            ? '<span style="color:var(--c-finance)">✓ שולם</span>'
            : `<button class="pay-btn" onclick="markPaid('${f.id}')">סמן כשולם</button>`}
        </div>` : ''}
      </div>
      ${showShare ? `<button class="action-mini" onclick="shareFinance('${f.id}')">📤</button>` : ''}
    </div>
  `;
}

function markPaid(id) {
  DB.update('finance', id, { isPaid: true });
  renderPage(State.page);
  showToast('✅ סומן כשולם');
}

// ── CROSSFIT ───────────────────────────────────────────
const LEAD_STATUSES = [
  { key: 'all',       label: 'הכל' },
  { key: 'new',       label: '🔵 חדשים' },
  { key: 'contacted', label: '🟡 פנייה' },
  { key: 'trial',     label: '🟣 ניסיון' },
  { key: 'member',    label: '🟢 חברים' },
  { key: 'lost',      label: '🔴 אבוד' },
];

const STATUS_LABELS = { new:'חדש', contacted:'פנייה', trial:'ניסיון', member:'חבר', lost:'אבוד' };

function renderCrossfit(el) {
  const leads  = DB.get('leads');
  const tasks  = DB.get('tasks').filter(t => t.section === 'crossfit' && !t.done);
  const filter = State.leadFilter;
  const shown  = filter === 'all' ? leads : leads.filter(l => l.status === filter);
  const arbox  = DB.getObj('arbox_settings', {});
  const members = leads.filter(l => l.status === 'member').length;
  const trials  = leads.filter(l => l.status === 'trial').length;

  el.innerHTML = `
    <div class="sec-header"><div class="sec-title">CrossFit BUX</div></div>

    <!-- Arbox Card -->
    <div class="card arbox-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div style="font-size:16px;font-weight:700">🏅 Arbox</div>
        <button class="icon-btn" onclick="openArboxSettings()" title="הגדרות Arbox">⚙️</button>
      </div>
      <div class="arbox-stats">
        <div class="arbox-stat"><span>${members}</span><small>חברים פעילים</small></div>
        <div class="arbox-stat"><span>${trials}</span><small>בניסיון</small></div>
        <div class="arbox-stat"><span>${leads.filter(l=>l.status==='new').length}</span><small>לידים חדשים</small></div>
      </div>
      ${arbox.url ? `
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="arbox-btn" onclick="openArbox()">📱 פתח Arbox</button>
        <button class="arbox-btn secondary" onclick="shareArboxLink()">🔗 שתף קישור</button>
      </div>` : `
      <button class="arbox-btn" onclick="openArboxSettings()" style="margin-top:10px;width:100%">🔗 חבר Arbox</button>
      `}
    </div>

    ${tasks.length ? `
    <div class="card">
      <div class="card-label">🔥 משימות צוות</div>
      ${tasks.map(t => taskItemHTML(t, true)).join('')}
    </div>` : ''}

    <div class="card">
      <div class="card-label">לידים · ${leads.length} סה"כ</div>
      <div class="pipeline-bar">
        ${LEAD_STATUSES.map(s => `
          <button class="pipe-btn ${State.leadFilter===s.key?'active':''}"
            onclick="State.leadFilter='${s.key}'; renderPage('crossfit')">${s.label}</button>
        `).join('')}
      </div>
      ${shown.length ? shown.map(l => leadItemHTML(l)).join('')
        : emptyHTML('🏋️', 'אין לידים בסטטוס זה')}
    </div>
  `;
}

function leadItemHTML(l) {
  const initials = l.name.split(' ').map(w=>w[0]).join('').slice(0,2);
  return `
    <div class="lead-item">
      <div class="lead-avatar" onclick="openLeadModal('${l.id}')">${initials}</div>
      <div class="lead-info" onclick="openLeadModal('${l.id}')">
        <div class="lead-name">${esc(l.name)}</div>
        <div class="lead-phone">${esc(l.phone)}</div>
      </div>
      <span class="lead-status s-${l.status}" onclick="openLeadModal('${l.id}')">${STATUS_LABELS[l.status]||l.status}</span>
      <button class="action-mini" onclick="shareLead('${l.id}')">📤</button>
    </div>
  `;
}

function openLeadModal(id) {
  const lead = DB.get('leads').find(l => l.id === id);
  if (!lead) return;
  const opts = Object.entries(STATUS_LABELS).map(([k,v]) =>
    `<option value="${k}" ${lead.status===k?'selected':''}>${v}</option>`).join('');

  openModal(`
    <div class="modal-title">✏️ ליד — ${esc(lead.name)}</div>
    <div class="form-group">
      <label class="form-label">שם</label>
      <input class="form-input" id="lead-name" value="${esc(lead.name)}">
    </div>
    <div class="form-group">
      <label class="form-label">טלפון</label>
      <input class="form-input" id="lead-phone" type="tel" value="${esc(lead.phone)}" dir="ltr">
    </div>
    <div class="form-group">
      <label class="form-label">סטטוס</label>
      <select class="form-select" id="lead-status">${opts}</select>
    </div>
    <div class="form-group">
      <label class="form-label">הערות</label>
      <textarea class="form-textarea" id="lead-notes">${esc(lead.notes||'')}</textarea>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn-primary" style="--btn-color:var(--c-crossfit)" onclick="saveLead('${id}')">שמור</button>
      <button class="btn-primary" style="--btn-color:#FF3B30;flex:0.45" onclick="deleteLead('${id}')">מחק</button>
      <button class="btn-primary" style="--btn-color:#007AFF;flex:0.45" onclick="shareLead('${id}');closeModal()">📤</button>
    </div>
  `);
}

function saveLead(id) {
  DB.update('leads', id, {
    name:   document.getElementById('lead-name').value.trim(),
    phone:  document.getElementById('lead-phone').value.trim(),
    status: document.getElementById('lead-status').value,
    notes:  document.getElementById('lead-notes').value.trim(),
  });
  closeModal();
  renderPage('crossfit');
}

function deleteLead(id) {
  if (!confirm('למחוק את הליד?')) return;
  DB.remove('leads', id);
  closeModal();
  renderPage('crossfit');
}

// ── FAMILY ─────────────────────────────────────────────
const FAMILY_CATS = [
  { key: 'tasks',     label: '✅ משימות' },
  { key: 'shopping',  label: '🛒 קניות' },
  { key: 'reminders', label: '🔔 תזכורות' },
];

function renderFamily(el) {
  const cat   = State.familyCat;
  const tasks = DB.get('tasks').filter(t => t.section === 'family' && t.category === cat);

  el.innerHTML = `
    <div class="sec-header"><div class="sec-title">בית ומשפחה</div></div>
    <div class="cat-tabs">
      ${FAMILY_CATS.map(c => `
        <button class="cat-tab ${c.key===cat?'active':''}"
          onclick="State.familyCat='${c.key}'; renderPage('family')">${c.label}
          <span class="cat-count">${DB.get('tasks').filter(t=>t.section==='family'&&t.category===c.key&&!t.done).length||''}</span>
        </button>
      `).join('')}
    </div>
    <div class="card">
      ${tasks.length
        ? tasks.map(t => checkItemHTML(t)).join('')
        : emptyHTML('🏡', 'לחץ + להוסיף פריט')}
    </div>
  `;
}

function checkItemHTML(t) {
  return `
    <div class="check-item">
      <div class="check-box ${t.done?'checked':''}" onclick="toggleTask('${t.id}','tasks')"></div>
      <span class="check-text ${t.done?'done':''}">${esc(t.text)}</span>
      ${t.dueDate ? `<span style="font-size:11px;color:var(--text-3)">📅${shortDate(t.dueDate)}</span>` : ''}
      <button class="action-mini" onclick="shareTask('${t.id}')">📤</button>
      <button class="del-btn" onclick="deleteTask('${t.id}')">×</button>
    </div>
  `;
}

// ── Shared task helpers ────────────────────────────────
function taskItemHTML(t, withActions = false) {
  const pClass = { high:'badge-high', medium:'badge-medium', low:'badge-low' }[t.priority] || '';
  const pLabel = { high:'דחוף', medium:'בינוני', low:'נמוך' }[t.priority] || '';
  return `
    <div class="task-item ${t.done?'done':''}">
      <div class="task-check ${t.done?'checked':''}" onclick="toggleTask('${t.id}','tasks')"></div>
      <div class="task-body" onclick="toggleTask('${t.id}','tasks')">
        <div class="task-text">${esc(t.text)}</div>
        <div class="task-meta">
          ${catLabel(t.category)}
          ${t.dueDate ? ` · 📅 ${fmtReminder(t)}` : ''}
        </div>
      </div>
      ${pLabel ? `<span class="task-badge ${pClass}">${pLabel}</span>` : ''}
      ${withActions ? `
        ${t.dueDate ? `<button class="action-mini" onclick="event.stopPropagation();exportToCalendar('${t.id}')" title="ייצא ליומן">📅</button>` : ''}
        <button class="action-mini" onclick="event.stopPropagation();shareTask('${t.id}')" title="שתף">📤</button>
        <button class="del-btn" onclick="event.stopPropagation();deleteTask('${t.id}')">×</button>
      ` : ''}
    </div>
  `;
}

function catLabel(cat) {
  return {
    business:'💼 עסק', home:'🏠 בית', personal:'🙋 אישי', idea:'💡 רעיון',
    crossfit:'🏋️ CrossFit', family:'👨‍👩‍👧 משפחה',
    tasks:'✅ משימה', shopping:'🛒 קניות', reminders:'🔔 תזכורת'
  }[cat] || '';
}

function toggleTask(id) {
  DB.toggle('tasks', id, 'done');
  renderPage(State.page);
}

function deleteTask(id) {
  DB.remove('tasks', id);
  renderPage(State.page);
}

function emptyHTML(icon, text) {
  return `<div class="empty"><div class="empty-icon">${icon}</div><div class="empty-text">${text}</div></div>`;
}

function esc(str = '') {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Share ──────────────────────────────────────────────
async function shareItem(title, text) {
  try {
    if (navigator.share) {
      await navigator.share({ title, text });
    } else {
      await navigator.clipboard.writeText(text);
      showToast('📋 הועתק ללוח!');
    }
  } catch(e) {
    if (e.name !== 'AbortError') {
      try {
        await navigator.clipboard.writeText(text);
        showToast('📋 הועתק ללוח!');
      } catch { showToast('לא ניתן לשתף'); }
    }
  }
}

function shareTask(id) {
  const task = DB.get('tasks').find(t => t.id === id);
  if (!task) return;
  const reminder = task.dueDate ? `\n📅 תאריך: ${fmtReminder(task)}` : '';
  shareItem('משימה ממרכז הפיקוד', `📋 ${task.text}${reminder}`);
}

function shareFinance(id) {
  const f = DB.get('finance').find(x => x.id === id);
  if (!f) return;
  const sign = f.type === 'expense' ? '−' : '+';
  shareItem('פרטי עסקה', `💳 ${f.description}\n${sign}₪${f.amount.toLocaleString('he-IL')}\nסטטוס: ${f.isPaid?'שולם':'טרם שולם'}`);
}

function shareLead(id) {
  const l = DB.get('leads').find(x => x.id === id);
  if (!l) return;
  shareItem('פרטי ליד — CrossFit BUX', `🏋️ ${l.name}\n📞 ${l.phone}\nסטטוס: ${STATUS_LABELS[l.status]||l.status}${l.notes?'\n'+l.notes:''}`);
}

// ── Calendar Export (.ics) ─────────────────────────────
function exportToCalendar(taskId) {
  const task = DB.get('tasks').find(t => t.id === taskId);
  if (!task) return;

  const dt = task.dueDate
    ? task.dueDate.replace(/-/g,'') + 'T' + (task.reminderTime||'09:00').replace(':','') + '00'
    : new Date().toISOString().replace(/[-:.]/g,'').slice(0,15);

  const stamp = new Date().toISOString().replace(/[-:.]/g,'').slice(0,15) + 'Z';
  const safeText = task.text.replace(/,/g,'\\,').replace(/\n/g,'\\n');

  // Organizer + invitees
  const settings  = DB.getObj('app_settings', {});
  const myEmail   = settings.myEmail || '';
  const myName    = settings.myName  || 'גל';
  const invited   = task.invitedEmails || [];
  const hasInvite = invited.length > 0 && myEmail;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Command Center//HE',
    hasInvite ? 'METHOD:REQUEST' : 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${task.id}@command-center`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${dt}`,
    `DTEND:${dt}`,
    `SUMMARY:${safeText}`,
    `DESCRIPTION:📋 ${safeText}`,
  ];

  if (myEmail) lines.push(`ORGANIZER;CN=${myName}:mailto:${myEmail}`);
  invited.forEach(email => {
    const contacts = DB.getObj('contacts', {});
    const contact  = Object.values(contacts).find(c => c.email === email);
    const name     = contact?.name || email;
    lines.push(`ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${name}:mailto:${email}`);
  });

  lines.push(
    'BEGIN:VALARM','ACTION:DISPLAY',
    `DESCRIPTION:🔔 ${safeText}`,
    'TRIGGER:PT0S','END:VALARM',
    'BEGIN:VALARM','ACTION:DISPLAY',
    `DESCRIPTION:⏰ בעוד 10 דקות: ${safeText}`,
    'TRIGGER:-PT10M','END:VALARM',
    'END:VEVENT','END:VCALENDAR'
  );

  const ics = lines.join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = 'reminder.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('📅 תזכורת נשמרה ביומן!');
}

// ── Arbox Integration ──────────────────────────────────
function openArboxSettings() {
  const s = DB.getObj('arbox_settings', {});
  openModal(`
    <div class="modal-title">🏅 הגדרות Arbox</div>
    <p style="font-size:14px;color:var(--text-3);margin-bottom:16px">חבר את חשבון Arbox שלך כדי לפתוח אותו ישירות ולשתף קישורים</p>
    <div class="form-group">
      <label class="form-label">כתובת ה-URL של חדר הכושר שלך</label>
      <input class="form-input" id="arbox-url" placeholder="https://app.arboxapp.com/..." value="${esc(s.url||'')}" dir="ltr">
      <small style="color:var(--text-3);font-size:12px">לדוגמה: הכנס את ה-URL של לוח הניהול שלך</small>
    </div>
    <div class="form-group">
      <label class="form-label">שם החדר (לשיתוף)</label>
      <input class="form-input" id="arbox-name" placeholder="CrossFit BUX" value="${esc(s.name||'CrossFit BUX')}">
    </div>
    <div class="form-group">
      <label class="form-label">קישור הצטרפות ללקוחות</label>
      <input class="form-input" id="arbox-join" placeholder="קישור לדף ההצטרפות" value="${esc(s.joinUrl||'')}" dir="ltr">
    </div>
    <button class="btn-primary" style="--btn-color:var(--c-crossfit)" onclick="saveArboxSettings()">שמור</button>
    <p style="font-size:12px;color:var(--text-3);margin-top:12px;text-align:center">
      API מלא (ייבוא חברים אוטומטי) — בשלב הבא 🚀
    </p>
  `);
}

function saveArboxSettings() {
  DB.set('arbox_settings', {
    url:     document.getElementById('arbox-url').value.trim(),
    name:    document.getElementById('arbox-name').value.trim(),
    joinUrl: document.getElementById('arbox-join').value.trim(),
  });
  closeModal();
  renderPage('crossfit');
  showToast('✅ הגדרות Arbox נשמרו');
}

function openArbox() {
  const s = DB.getObj('arbox_settings', {});
  if (s.url) window.open(s.url, '_blank');
  else openArboxSettings();
}

function shareArboxLink() {
  const s = DB.getObj('arbox_settings', {});
  const url = s.joinUrl || s.url || '';
  if (!url) { openArboxSettings(); return; }
  shareItem(`הצטרף ל-${s.name||'CrossFit BUX'}`, `🏋️ הצטרף ל-${s.name||'CrossFit BUX'}!\n${url}`);
}

// ── Modal ──────────────────────────────────────────────
function openModal(html) {
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// ── FAB → Context-aware add ────────────────────────────
function openAddForm() {
  const cfg = PAGE_CFG[State.page];
  document.documentElement.style.setProperty('--btn-color', cfg.btnColor);
  document.documentElement.style.setProperty('--chip-color', cfg.btnColor);

  switch (State.page) {
    case 'home':
    case 'brain':    openAddTask();     break;
    case 'finance':  openAddFinance();  break;
    case 'crossfit': openAddCrossfit(); break;
    case 'family':   openAddFamily();   break;
  }
}

// ── Add Task Form ──────────────────────────────────────
function openAddTask() {
  const defaultCat = State.page === 'brain' ? State.brainCat : 'business';

  openModal(`
    <div class="modal-title">➕ משימה / רעיון חדש</div>
    <div class="form-group">
      <label class="form-label">טקסט</label>
      <textarea class="form-textarea" id="new-task-text" placeholder="מה צריך לעשות?" rows="2"></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">קטגוריה</label>
      <div class="chip-row" id="cat-chips">
        ${[['business','💼 עסק'],['home','🏠 בית'],['personal','🙋 אישי'],['idea','💡 רעיון']].map(([k,l]) =>
          `<button class="chip ${k===defaultCat?'sel':''}" onclick="selectChip('cat-chips',this)" data-val="${k}">${l}</button>`
        ).join('')}
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">עדיפות</label>
      <div class="chip-row" id="pri-chips">
        ${[['high','🔴 דחוף'],['medium','🟡 בינוני'],['low','🟢 נמוך']].map(([k,l]) =>
          `<button class="chip ${k==='medium'?'sel':''}" onclick="selectChip('pri-chips',this)" data-val="${k}">${l}</button>`
        ).join('')}
      </div>
    </div>

    <!-- Reminder Toggle -->
    <div style="margin-bottom:14px">
      <button class="chip" id="reminder-toggle-btn" onclick="toggleReminderFields()">🔔 הוסף תזכורת ביומן</button>
    </div>
    <div id="reminder-fields" style="display:none">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">תאריך</label>
          <input class="form-input" id="new-task-date" type="date" value="${todayStr()}">
        </div>
        <div class="form-group">
          <label class="form-label">שעה</label>
          <input class="form-input" id="new-task-time" type="time" value="09:00">
        </div>
      </div>
    </div>

    <button class="btn-primary" onclick="saveTask()">שמור</button>
  `);
  setTimeout(() => document.getElementById('new-task-text')?.focus(), 150);
}

function toggleReminderFields() {
  const el = document.getElementById('reminder-fields');
  const btn = document.getElementById('reminder-toggle-btn');
  const show = el.style.display === 'none';
  el.style.display = show ? 'block' : 'none';
  btn.classList.toggle('sel', show);
}

function selectChip(groupId, btn) {
  document.querySelectorAll(`#${groupId} .chip`).forEach(c => c.classList.remove('sel'));
  btn.classList.add('sel');
}

function saveTask() {
  const text = document.getElementById('new-task-text').value.trim();
  if (!text) { showToast('נא להזין טקסט'); return; }
  const cat = document.querySelector('#cat-chips .sel')?.dataset.val || 'business';
  const pri = document.querySelector('#pri-chips .sel')?.dataset.val || 'medium';
  const showReminder = document.getElementById('reminder-fields').style.display !== 'none';
  const dueDate     = showReminder ? document.getElementById('new-task-date').value : null;
  const reminderTime = showReminder ? document.getElementById('new-task-time').value : null;

  const task = DB.add('tasks', {
    text, category: cat, priority: pri, done: false, section: 'brain', dueDate, reminderTime
  });

  closeModal();
  if (showReminder && dueDate) {
    exportToCalendar(task.id);
  }
  renderPage(State.page);
}

// ── Add Finance Form ───────────────────────────────────
function openAddFinance() {
  openModal(`
    <div class="modal-title">💳 עסקה חדשה</div>
    <div class="form-group">
      <label class="form-label">תיאור</label>
      <input class="form-input" id="fin-desc" placeholder="שם ההוצאה / הכנסה">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">סכום (₪)</label>
        <input class="form-input" id="fin-amount" type="number" placeholder="0" dir="ltr" inputmode="decimal">
      </div>
      <div class="form-group">
        <label class="form-label">סוג</label>
        <select class="form-select" id="fin-type">
          <option value="expense">💸 הוצאה</option>
          <option value="income">💵 הכנסה</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">קטגוריה</label>
      <div class="chip-row" id="fin-cat-chips">
        ${[['business','💼 עסק'],['crossfit','🏋️ CrossFit'],['home','🏠 בית'],['personal','🙋 אישי']].map(([k,l]) =>
          `<button class="chip ${k==='business'?'sel':''}" onclick="selectChip('fin-cat-chips',this)" data-val="${k}">${l}</button>`
        ).join('')}
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">שולם?</label>
      <div class="chip-row" id="paid-chips">
        <button class="chip sel" onclick="selectChip('paid-chips',this)" data-val="yes">✅ כן</button>
        <button class="chip" onclick="selectChip('paid-chips',this)" data-val="no">⏳ לא</button>
      </div>
    </div>
    <button class="btn-primary" onclick="saveFinance()">שמור</button>
  `);
  setTimeout(() => document.getElementById('fin-desc')?.focus(), 150);
}

function saveFinance() {
  const desc   = document.getElementById('fin-desc').value.trim();
  const amount = parseFloat(document.getElementById('fin-amount').value);
  if (!desc || !amount) { showToast('נא למלא תיאור וסכום'); return; }
  const type     = document.getElementById('fin-type').value;
  const category = document.querySelector('#fin-cat-chips .sel')?.dataset.val || 'business';
  const isPaid   = document.querySelector('#paid-chips .sel')?.dataset.val === 'yes';
  DB.add('finance', { description: desc, amount, type, category, date: todayStr(), isPaid });
  closeModal();
  renderPage('finance');
}

// ── Add CrossFit Form ──────────────────────────────────
function openAddCrossfit() {
  openModal(`
    <div class="modal-title">🏋️ הוסף ל-BUX</div>
    <div class="chip-row" id="cf-type-chips">
      <button class="chip sel" onclick="selectChip('cf-type-chips',this);toggleCFForm()" data-val="lead">👤 ליד חדש</button>
      <button class="chip" onclick="selectChip('cf-type-chips',this);toggleCFForm()" data-val="task">✅ משימת צוות</button>
    </div>
    <div id="cf-lead-form">
      <div class="form-group">
        <label class="form-label">שם מלא</label>
        <input class="form-input" id="cf-name" placeholder="שם הליד">
      </div>
      <div class="form-group">
        <label class="form-label">טלפון</label>
        <input class="form-input" id="cf-phone" type="tel" placeholder="05x-xxxxxxx" dir="ltr">
      </div>
      <div class="form-group">
        <label class="form-label">מאיפה הגיע?</label>
        <input class="form-input" id="cf-notes" placeholder="אינסטגרם / חבר / מודעה...">
      </div>
    </div>
    <div id="cf-task-form" style="display:none">
      <div class="form-group">
        <label class="form-label">תיאור המשימה</label>
        <input class="form-input" id="cf-task-text" placeholder="מה צריך לעשות?">
      </div>
      <div class="form-group">
        <label class="form-label">עדיפות</label>
        <div class="chip-row" id="cf-pri-chips">
          <button class="chip" onclick="selectChip('cf-pri-chips',this)" data-val="high">🔴 דחוף</button>
          <button class="chip sel" onclick="selectChip('cf-pri-chips',this)" data-val="medium">🟡 בינוני</button>
          <button class="chip" onclick="selectChip('cf-pri-chips',this)" data-val="low">🟢 נמוך</button>
        </div>
      </div>
    </div>
    <button class="btn-primary" style="--btn-color:var(--c-crossfit)" onclick="saveCFItem()">שמור</button>
  `);
  setTimeout(() => document.getElementById('cf-name')?.focus(), 150);
}

function toggleCFForm() {
  const type = document.querySelector('#cf-type-chips .sel')?.dataset.val;
  document.getElementById('cf-lead-form').style.display = type === 'lead' ? 'block' : 'none';
  document.getElementById('cf-task-form').style.display = type === 'task' ? 'block' : 'none';
}

function saveCFItem() {
  const type = document.querySelector('#cf-type-chips .sel')?.dataset.val;
  if (type === 'lead') {
    const name = document.getElementById('cf-name').value.trim();
    if (!name) { showToast('נא להזין שם'); return; }
    DB.add('leads', {
      name,
      phone: document.getElementById('cf-phone').value.trim(),
      notes: document.getElementById('cf-notes').value.trim(),
      status: 'new',
    });
  } else {
    const text = document.getElementById('cf-task-text').value.trim();
    if (!text) { showToast('נא להזין משימה'); return; }
    const priority = document.querySelector('#cf-pri-chips .sel')?.dataset.val || 'medium';
    DB.add('tasks', { text, category: 'crossfit', priority, done: false, section: 'crossfit' });
  }
  closeModal();
  renderPage('crossfit');
}

// ── Add Family Form ────────────────────────────────────
function openAddFamily() {
  const cat = State.familyCat;
  const placeholders = { tasks:'מה לעשות?', shopping:'מה לקנות?', reminders:'מה לזכור?' };
  const showDate = cat === 'reminders';
  const contacts = DB.getObj('contacts', {});
  const partners = Object.values(contacts);

  openModal(`
    <div class="modal-title">${FAMILY_CATS.find(c=>c.key===cat)?.label || '🏡 הוסף'}</div>
    <div class="form-group">
      <label class="form-label">פריט</label>
      <input class="form-input" id="fam-text" placeholder="${placeholders[cat]||''}">
    </div>
    ${showDate ? `
    <div class="form-group">
      <label class="form-label">📅 מתי?</label>
      <div class="form-row">
        <div class="form-group">
          <input class="form-input" id="fam-date" type="date" value="${todayStr()}">
        </div>
        <div class="form-group">
          <input class="form-input" id="fam-time" type="time" value="09:00">
        </div>
      </div>
    </div>
    ${partners.length ? `
    <div class="form-group">
      <label class="form-label">📨 הזמן גם...</label>
      <div class="chip-row" id="invite-chips">
        ${partners.map(p =>
          `<button class="chip" onclick="selectChipMulti(this)" data-email="${esc(p.email)}">${esc(p.name)}</button>`
        ).join('')}
      </div>
    </div>` : `
    <div style="font-size:12px;color:var(--text-3);margin-bottom:12px">
      💡 <span style="cursor:pointer;text-decoration:underline" onclick="closeModal();openSettings()">הוסף אנשי קשר בהגדרות</span> כדי להזמין לאירועים
    </div>`}` : ''}
    <button class="btn-primary" style="--btn-color:var(--c-family)" onclick="saveFamily()">שמור</button>
  `);
  setTimeout(() => document.getElementById('fam-text')?.focus(), 150);
}

function selectChipMulti(btn) {
  btn.classList.toggle('sel');
}

function saveFamily() {
  const text = document.getElementById('fam-text').value.trim();
  if (!text) { showToast('נא להזין טקסט'); return; }
  const cat = State.familyCat;
  const dateEl = document.getElementById('fam-date');
  const timeEl = document.getElementById('fam-time');
  const dueDate = dateEl?.value || null;
  const reminderTime = timeEl?.value || null;

  // Collect invited emails
  const invitedEmails = [...document.querySelectorAll('#invite-chips .sel')]
    .map(b => b.dataset.email).filter(Boolean);

  const task = DB.add('tasks', {
    text, category: cat, priority: 'medium', done: false,
    section: 'family', dueDate, reminderTime, invitedEmails
  });
  closeModal();

  if (cat === 'reminders' && dueDate) {
    exportToCalendar(task.id);
  }
  renderPage('family');
}

// ── Settings ───────────────────────────────────────────
function openSettings() {
  const s        = DB.getObj('app_settings', {});
  const contacts = DB.getObj('contacts', {});
  const wsCode   = typeof getWsCode === 'function' ? getWsCode() : '—';

  openModal(`
    <div class="modal-title">⚙️ הגדרות</div>

    <!-- My details -->
    <div class="card-label">👤 הפרטים שלי</div>
    <div class="form-group">
      <label class="form-label">שם</label>
      <input class="form-input" id="set-myname" value="${esc(s.myName||'גל')}" placeholder="גל">
    </div>
    <div class="form-group">
      <label class="form-label">אימייל (לשליחת הזמנות יומן)</label>
      <input class="form-input" id="set-myemail" value="${esc(s.myEmail||'')}" placeholder="you@gmail.com" dir="ltr" type="email">
    </div>

    <div class="divider"></div>

    <!-- Contacts -->
    <div class="card-label">👨‍👩‍👧 אנשי קשר (לשיתוף תזכורות)</div>
    <div id="contacts-list">
      ${Object.values(contacts).map(c => `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="flex:1;font-size:14px">${esc(c.name)} · <span dir="ltr">${esc(c.email)}</span></span>
          <button class="del-btn" onclick="deleteContact('${esc(c.id)}')">×</button>
        </div>
      `).join('') || '<div style="font-size:13px;color:var(--text-3);margin-bottom:10px">אין אנשי קשר עדיין</div>'}
    </div>
    <div style="display:flex;gap:8px;margin-bottom:4px">
      <input class="form-input" id="new-contact-name" placeholder="שם" style="flex:0.8">
      <input class="form-input" id="new-contact-email" placeholder="אימייל" dir="ltr" type="email">
    </div>
    <button class="btn-primary" style="--btn-color:var(--c-family);margin-bottom:14px"
            onclick="addContact()">+ הוסף איש קשר</button>

    <div class="divider"></div>

    <!-- Sharing with partner -->
    <div class="card-label">🔗 שיתוף האפליקציה עם רחל</div>
    <div style="background:var(--bg);border-radius:12px;padding:14px;margin-bottom:14px">
      <div style="font-size:14px;margin-bottom:10px">
        שתף את הקישור הבא עם רחל. כשתלחץ עליו, האפליקציה תיפתח אצלה כבר מחוברת לאותם נתונים שלך.
      </div>
      <div style="font-family:monospace;font-size:12px;background:white;padding:10px;border-radius:8px;word-break:break-all;direction:ltr;margin-bottom:10px" id="share-link-display">
        טוען...
      </div>
      <button class="btn-primary" style="--btn-color:var(--c-family)" onclick="shareAppLink()">📤 שלח לרחל בוואטסאפ</button>
    </div>

    <div class="divider"></div>

    <!-- Reset -->
    <div class="card-label">🗑️ ניהול נתונים</div>
    <button class="btn-primary" style="--btn-color:#FF3B30" onclick="resetAllData()">
      🗑️ מחק נתוני דמו והתחל מחדש
    </button>
    <p style="font-size:11px;color:var(--text-3);margin-top:8px;text-align:center">
      פעולה זו תמחק את כל הנתונים הנוכחיים ותתחיל דף חלק
    </p>

    <div class="divider"></div>
    <button class="btn-primary" style="--btn-color:var(--c-home)" onclick="saveAppSettings()">✅ שמור הגדרות</button>
  `);

  // Show share link
  const tunnel = window.location.origin + window.location.pathname;
  const link   = tunnel + '?join=' + wsCode;
  const el = document.getElementById('share-link-display');
  if (el) el.textContent = link;
}

function saveAppSettings() {
  DB.set('app_settings', {
    myName:  document.getElementById('set-myname')?.value.trim()  || 'גל',
    myEmail: document.getElementById('set-myemail')?.value.trim() || '',
  });
  closeModal();
  showToast('✅ הגדרות נשמרו');
}

function addContact() {
  const name  = document.getElementById('new-contact-name')?.value.trim();
  const email = document.getElementById('new-contact-email')?.value.trim();
  if (!name || !email) { showToast('נא למלא שם ואימייל'); return; }
  const contacts = DB.getObj('contacts', {});
  const id = Date.now().toString(36);
  contacts[id] = { id, name, email };
  DB.set('contacts', contacts);
  openSettings(); // refresh
}

function deleteContact(id) {
  const contacts = DB.getObj('contacts', {});
  delete contacts[id];
  DB.set('contacts', contacts);
  openSettings(); // refresh
}

function shareAppLink() {
  const wsCode = typeof getWsCode === 'function' ? getWsCode() : '';
  const link   = window.location.origin + window.location.pathname + '?join=' + wsCode;
  const msg    = `היי רחל 😊\nהורידי את האפליקציה שלנו לניהול הבית:\n${link}\n\nפשוט לחצי על הקישור ותוסיפי למסך הבית!`;
  if (navigator.share) {
    navigator.share({ title: 'מרכז פיקוד משפחתי', text: msg });
  } else {
    navigator.clipboard?.writeText(msg);
    showToast('📋 הקישור הועתק!');
  }
}

function resetAllData() {
  if (!confirm('למחוק את כל הנתונים ולהתחיל דף חלק?\nלא ניתן לשחזר!')) return;
  const keep = {
    _wsCode:       localStorage.getItem('_wsCode'),
    _notif_enabled:localStorage.getItem('_notif_enabled'),
    _deviceId:     localStorage.getItem('_deviceId'),
    app_settings:  localStorage.getItem('app_settings'),
    contacts:      localStorage.getItem('contacts'),
    arbox_settings:localStorage.getItem('arbox_settings'),
  };
  localStorage.clear();
  Object.entries(keep).forEach(([k,v]) => { if (v) localStorage.setItem(k, v); });
  localStorage.setItem('_seeded', '1');
  localStorage.setItem('_clean_start', '1');
  closeModal();
  showToast('✅ נתונים נוקו!');
  setTimeout(() => location.reload(), 800);
}

// ── Auto-join from URL ──────────────────────────────────
(function checkJoinParam() {
  const params = new URLSearchParams(window.location.search);
  const join   = params.get('join');
  if (!join) return;
  // Remove param from URL without reload
  const clean = window.location.pathname;
  window.history.replaceState({}, '', clean);
  // Auto-join after a short delay (so app finishes loading)
  setTimeout(() => {
    if (typeof getWsCode === 'function' && getWsCode() !== join.toUpperCase()) {
      if (confirm(`מצאנו הזמנה לסביבה "${join.toUpperCase()}"\nמתחבר?`)) {
        localStorage.setItem('_wsCode', join.toUpperCase());
        location.reload();
      }
    }
  }, 1500);
})();

// ── Init ───────────────────────────────────────────────
function init() {
  document.getElementById('header-date').textContent = (() => {
    const d = new Date();
    return `${d.getDate()} ב${MONTHS[d.getMonth()]}`;
  })();

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });

  document.getElementById('fab').addEventListener('click', openAddForm);
  document.getElementById('modal-backdrop').addEventListener('click', closeModal);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  navigate('home');
}

document.addEventListener('DOMContentLoaded', init);
