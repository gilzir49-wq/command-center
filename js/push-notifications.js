/* ===== Push Notifications ===== */

let _notifCheckInterval = null;

// ── Request permission ────────────────────────────────
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    showToast('הדפדפן לא תומך בהתראות');
    return false;
  }

  const perm = await Notification.requestPermission();
  if (perm === 'granted') {
    localStorage.setItem('_notif_enabled', '1');
    startNotificationCheck();
    showToast('🔔 התראות הופעלו!');
    return true;
  } else {
    showToast('⚠️ ההרשאה נדחתה — אפשר בהגדרות הטלפון');
    return false;
  }
}

// ── Check due reminders every minute ─────────────────
function startNotificationCheck() {
  if (_notifCheckInterval) return; // already running
  checkDueReminders(); // run immediately
  _notifCheckInterval = setInterval(checkDueReminders, 60 * 1000);
}

function checkDueReminders() {
  if (Notification.permission !== 'granted') return;

  const tasks = DB.get('tasks');
  const now   = new Date();

  tasks.forEach(task => {
    if (task.done || !task.dueDate || task.notified) return;

    const dueStr = `${task.dueDate}T${task.reminderTime || '09:00'}:00`;
    const due    = new Date(dueStr);
    const diffMs = due - now;

    // Fire if within the next 2 minutes (covers the 1-min poll gap)
    if (diffMs >= -60000 && diffMs <= 2 * 60 * 1000) {
      showPushNotification('🔔 תזכורת', task.text, task.id);
      DB.update('tasks', task.id, { notified: true });
    }
  });
}

async function showPushNotification(title, body, tag) {
  if (!('serviceWorker' in navigator)) {
    // Fallback: browser Notification API directly
    new Notification(title, { body, dir: 'rtl', lang: 'he', tag });
    return;
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, {
      body,
      icon: './icons/icon.svg',
      badge: './icons/icon.svg',
      dir: 'rtl',
      lang: 'he',
      tag,
      renotify: false,
      data: { url: './' }
    });
  } catch (e) {
    // SW notifications might not work in all contexts
    new Notification(title, { body, dir: 'rtl', lang: 'he', tag });
  }
}

// ── Notifications settings modal ───────────────────────
function openNotificationSettings() {
  const enabled = Notification.permission === 'granted';
  const perm    = Notification.permission;

  openModal(`
    <div class="modal-title">🔔 התראות</div>

    <div class="notif-status ${enabled ? 'on' : 'off'}">
      ${enabled ? '✅ התראות מופעלות' :
        perm === 'denied' ? '🚫 התראות חסומות' : '⏸️ התראות כבויות'}
    </div>

    ${enabled ? `
    <p style="font-size:14px;color:var(--text-3);margin:12px 0">
      האפליקציה תשלח לך התראה כשמגיע זמן תזכורת — כל עוד היא פתוחה ברקע.
    </p>
    <div class="form-group">
      <label class="form-label">בדוק התראה עכשיו</label>
      <button class="btn-primary" style="--btn-color:var(--c-brain)"
              onclick="showPushNotification('🔔 בדיקה', 'מרכז הפיקוד עובד!')">
        שלח התראת ניסיון
      </button>
    </div>
    ` : perm === 'denied' ? `
    <p style="font-size:14px;color:var(--text-3);margin:12px 0">
      חסמת את ההתראות. כדי להפעיל:<br>
      <strong>הגדרות → Safari → מרכז פיקוד → התראות → אפשר</strong>
    </p>
    ` : `
    <p style="font-size:14px;color:var(--text-3);margin:12px 0">
      הפעל התראות כדי לקבל תזכורות על מכשיר זה.
    </p>
    <button class="btn-primary" onclick="requestNotificationPermission().then(()=>closeModal())">
      🔔 הפעל התראות
    </button>
    `}

    <div style="margin-top:16px;padding:12px;background:var(--bg);border-radius:12px">
      <div style="font-size:13px;font-weight:600;margin-bottom:6px">💡 טיפ</div>
      <div style="font-size:12px;color:var(--text-3)">
        כדי לקבל התראות גם כשהמסך נעול — ודא שהאפליקציה מותקנת על מסך הבית (Add to Home Screen).
        התראות עובדות על iOS 16.4 ומעלה.
      </div>
    </div>
  `);
}

// ── Auto-start if permission already granted ──────────
if (Notification.permission === 'granted' && localStorage.getItem('_notif_enabled')) {
  startNotificationCheck();
}
