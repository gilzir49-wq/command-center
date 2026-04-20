/* ===== Cloud Sync — GunDB (zero setup, peer-to-peer) ===== */

const GUN_RELAYS = ['https://relay.peer.ooo/gun'];

let _gun = null;
let _root = null;
let _listening = false;
let _rdTimer = null;

// ── Workspace code ─────────────────────────────────────
function getWsCode() {
  let code = localStorage.getItem('_wsCode');
  if (!code) {
    const r = () => Math.random().toString(36).slice(2, 5).toUpperCase();
    code = r() + '-' + r();
    localStorage.setItem('_wsCode', code);
  }
  return code;
}

// ── Init Gun ───────────────────────────────────────────
function initCloud() {
  try {
    _gun  = new Gun({ peers: GUN_RELAYS, localStorage: false });
    _root = _gun.get('cmd-bux-' + getWsCode());
    startListeners();
    updateSyncIcon('🟢');
  } catch (e) {
    console.warn('GunDB init failed — offline mode', e);
    updateSyncIcon('🟡');
  }
}

// ── Debounced render ───────────────────────────────────
function scheduleRender() {
  clearTimeout(_rdTimer);
  _rdTimer = setTimeout(() => {
    if (typeof renderPage === 'function' && typeof State !== 'undefined') {
      renderPage(State.page);
    }
  }, 350);
}

// ── Helpers ────────────────────────────────────────────
function toGun(obj) {
  // Gun doesn't like null/arrays/nested objects — flatten them
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === '_') continue;
    if (v === null || v === undefined) out[k] = '__null__';
    else if (typeof v === 'boolean') out[k] = v;
    else if (typeof v === 'number')  out[k] = v;
    else if (typeof v === 'object')  out[k] = JSON.stringify(v);
    else out[k] = v;
  }
  return out;
}

function fromGun(data) {
  if (!data) return null;
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (k === '_') continue;
    if (v === '__null__') out[k] = null;
    else if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
      try { out[k] = JSON.parse(v); } catch { out[k] = v; }
    } else {
      out[k] = v;
    }
  }
  return out;
}

function cloudWrite(col, item) {
  if (!_root) return;
  _root.get(col).get(item.id).put(toGun(item));
}

function cloudDelete(col, id) {
  if (!_root) return;
  _root.get(col).get(id).put({ id, _deleted: true });
}

// ── Patch DB methods ───────────────────────────────────
const _rawSet    = DB.set.bind(DB);
const _rawAdd    = DB.add.bind(DB);
const _rawUpdate = DB.update.bind(DB);
const _rawRemove = DB.remove.bind(DB);
const _rawToggle = DB.toggle.bind(DB);

DB.add = function(key, item) {
  const result = _rawAdd(key, item);
  cloudWrite(key, result);
  return result;
};

DB.update = function(key, id, patch) {
  const result = _rawUpdate(key, id, patch);
  if (result) cloudWrite(key, result);
  return result;
};

DB.remove = function(key, id) {
  _rawRemove(key, id);
  cloudDelete(key, id);
};

DB.toggle = function(key, id, field = 'done') {
  _rawToggle(key, id, field);
  const item = DB.get(key).find(x => x.id === id);
  if (item) cloudWrite(key, item);
};

DB.set = function(key, val) {
  _rawSet(key, val);
  if (!_root) return;
  if (Array.isArray(val)) {
    val.forEach(item => { if (item?.id) cloudWrite(key, item); });
  } else if (val && typeof val === 'object') {
    _root.get(key).put(toGun(val));
  }
};

// ── Real-time listeners ────────────────────────────────
const SYNC_COLS = ['tasks', 'finance', 'leads'];

function startListeners() {
  if (_listening || !_root) return;
  _listening = true;

  SYNC_COLS.forEach(col => {
    _root.get(col).map().on((raw, id) => {
      if (!raw || raw._deleted) return;
      const item = fromGun(raw);
      if (!item?.id) return;

      const local = DB.get(col);
      const idx   = local.findIndex(x => x.id === item.id);
      if (idx === -1) local.unshift(item);
      else local[idx] = { ...local[idx], ...item };
      local.sort((a, b) => new Date(b.createdAt||0) - new Date(a.createdAt||0));
      _rawSet(col, local);
      scheduleRender();
    });
  });

  _root.get('arbox_settings').on(raw => {
    const val = fromGun(raw);
    if (val?.url !== undefined) localStorage.setItem('arbox_settings', JSON.stringify(val));
  });
}

// ── Online / offline ───────────────────────────────────
window.addEventListener('online',  () => { updateSyncIcon('🟢'); if (!_root) initCloud(); });
window.addEventListener('offline', () => updateSyncIcon('🟡'));

function updateSyncIcon(icon) {
  const el = document.getElementById('sync-status');
  if (el) el.textContent = icon;
}

// ── Workspace modal ────────────────────────────────────
function showWorkspaceInfo() {
  const code = getWsCode();
  openModal(`
    <div class="modal-title">☁️ סנכרון ושיתוף</div>
    <p style="font-size:14px;color:var(--text-3);margin-bottom:14px">
      שתף את הקוד עם מישהו שרוצה גישה לאותם נתונים — כל שינוי יסתנכרן מיידית.
    </p>
    <div style="text-align:center;font-size:32px;font-weight:900;letter-spacing:8px;
      padding:20px;background:var(--bg);border-radius:16px;margin-bottom:14px;
      font-family:monospace">${code}</div>
    <button class="btn-primary" style="margin-bottom:10px" onclick="copyWsCode()">📋 העתק קוד</button>

    <div class="divider"></div>
    <div style="font-size:14px;font-weight:600;margin-bottom:8px">הצטרף לסביבה אחרת</div>
    <input class="form-input" id="join-code-input" placeholder="XXX-XXX"
      style="text-align:center;font-size:22px;letter-spacing:6px;font-family:monospace"
      maxlength="7" dir="ltr">
    <button class="btn-primary" style="--btn-color:var(--c-brain);margin-top:10px"
      onclick="joinWorkspace()">🔗 הצטרף</button>

    <div style="margin-top:14px;padding:12px;background:var(--bg);border-radius:12px;
      font-size:12px;color:var(--text-3)">
      🌐 מחובר לענן · הנתונים מסתנכרנים בין כל המכשירים עם אותו קוד
    </div>
  `);
}

function copyWsCode() {
  const code = getWsCode();
  (navigator.clipboard?.writeText(code) || Promise.reject())
    .then(() => showToast('📋 קוד הועתק!'))
    .catch(() => showToast('הקוד שלך: ' + code));
}

function joinWorkspace() {
  const raw = document.getElementById('join-code-input')?.value?.trim().toUpperCase();
  if (!raw || raw.length < 5) { showToast('קוד לא תקין'); return; }
  if (!confirm(`להצטרף לסביבה "${raw}"?`)) return;
  _listening = false;
  localStorage.setItem('_wsCode', raw);
  _root = _gun.get('cmd-bux-' + raw);
  closeModal();
  startListeners();
  showToast('✅ מחובר לסביבה ' + raw);
  setTimeout(() => { if (typeof renderPage === 'function') renderPage(State.page); }, 800);
}

function openCloudSetup() { showWorkspaceInfo(); }

// ── Boot ──────────────────────────────────────────────
initCloud();
