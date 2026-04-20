/* ===== Storage Layer ===== */
const DB = {
  _genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  },

  getObj(key, def = {}) {
    try { return JSON.parse(localStorage.getItem(key)) || def; }
    catch { return def; }
  },

  set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },

  add(key, item) {
    const list = this.get(key);
    item.id = item.id || this._genId();
    item.createdAt = item.createdAt || new Date().toISOString();
    list.unshift(item);
    this.set(key, list);
    return item;
  },

  update(key, id, patch) {
    const list = this.get(key);
    const i = list.findIndex(x => x.id === id);
    if (i !== -1) {
      list[i] = { ...list[i], ...patch, updatedAt: new Date().toISOString() };
      this.set(key, list);
      return list[i];
    }
    return null;
  },

  remove(key, id) {
    this.set(key, this.get(key).filter(x => x.id !== id));
  },

  toggle(key, id, field = 'done') {
    const list = this.get(key);
    const i = list.findIndex(x => x.id === id);
    if (i !== -1) {
      list[i][field] = !list[i][field];
      this.set(key, list);
    }
  }
};

/* Seed demo data on first launch — only if not manually cleared */
(function seed() {
  if (localStorage.getItem('_seeded')) return;
  localStorage.setItem('_seeded', '1');
  if (localStorage.getItem('_clean_start')) return; // user chose fresh start

  const today = new Date().toISOString().split('T')[0];

  DB.set('tasks', [
    { id: 'T1', text: 'לשלוח הצעת מחיר ללקוח בית הדפוס', category: 'business', priority: 'high', done: false, section: 'brain', createdAt: new Date().toISOString() },
    { id: 'T2', text: 'להזמין ציוד לחדר כושר — קפה ומגבות', category: 'crossfit', priority: 'medium', done: false, section: 'crossfit', createdAt: new Date().toISOString() },
    { id: 'T3', text: 'לקנות מוצרי ניקיון', category: 'home', priority: 'low', done: false, section: 'family', createdAt: new Date().toISOString() },
    { id: 'T4', text: 'לפרסם פוסט אינסטגרם — WOD של שישי', category: 'crossfit', priority: 'high', done: false, section: 'brain', createdAt: new Date().toISOString() },
    { id: 'T5', text: 'לבדוק תאריך חידוש ביטוח עסק', category: 'business', priority: 'medium', done: true, section: 'brain', createdAt: new Date().toISOString() },
  ]);

  DB.set('finance', [
    { id: 'F1', description: 'שכירות - בית דפוס', amount: 4800, type: 'expense', category: 'business', date: today, isPaid: true, createdAt: new Date().toISOString() },
    { id: 'F2', description: 'תשלום Arbox - חודשי', amount: 350, type: 'expense', category: 'crossfit', date: today, isPaid: false, createdAt: new Date().toISOString() },
    { id: 'F3', description: 'הכנסות חברויות - CrossFit', amount: 18500, type: 'income', category: 'crossfit', date: today, isPaid: true, createdAt: new Date().toISOString() },
    { id: 'F4', description: 'הדפסה עבור לקוח ABC', amount: 2200, type: 'income', category: 'business', date: today, isPaid: false, createdAt: new Date().toISOString() },
    { id: 'F5', description: 'ספקית נייר', amount: 1100, type: 'expense', category: 'business', date: today, isPaid: false, createdAt: new Date().toISOString() },
  ]);

  DB.set('leads', [
    { id: 'L1', name: 'מיכל כהן', phone: '054-1234567', status: 'new', notes: 'פנתה דרך אינסטגרם', createdAt: new Date().toISOString() },
    { id: 'L2', name: 'אורי לוי', phone: '052-9876543', status: 'trial', notes: 'אימון ניסיון ביום שני', createdAt: new Date().toISOString() },
    { id: 'L3', name: 'שירה ברזל', phone: '050-5555555', status: 'contacted', notes: 'שלחתי פרטי מחירים', createdAt: new Date().toISOString() },
    { id: 'L4', name: 'דני שפירא', phone: '053-3334444', status: 'member', notes: 'חבר פעיל מדצמבר', createdAt: new Date().toISOString() },
  ]);
})();
