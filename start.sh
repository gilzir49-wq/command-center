#!/bin/bash
# מרכז פיקוד — הפעלה אוטומטית

APPDIR="$HOME/command-center"
PORT=8765
CF="/tmp/cloudflared"
LOG="$APPDIR/tunnel.log"

echo "🚀 מפעיל מרכז פיקוד..."

# עצור תהליכים קודמים
pkill -f "http.server $PORT" 2>/dev/null
pkill -f "cloudflared tunnel" 2>/dev/null
sleep 1

# הפעל שרת מקומי
cd "$APPDIR"
python3 -m http.server $PORT > /dev/null 2>&1 &
echo "✅ שרת מקומי פועל על port $PORT"

# הפעל טאנל HTTPS
"$CF" tunnel --url "http://localhost:$PORT" --no-autoupdate > "$LOG" 2>&1 &
echo "⏳ מחכה לטאנל..."
sleep 8

# מוצא את ה-URL
URL=$(grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' "$LOG" | head -1)

if [ -n "$URL" ]; then
  echo ""
  echo "✅ מרכז הפיקוד פועל!"
  echo "🔗 URL: $URL"
  echo ""
  # שמור URL לקובץ
  echo "$URL" > "$APPDIR/current-url.txt"
  # הצג QR
  python3 -c "
import qrcode
url = '$URL'
qr = qrcode.QRCode(border=1)
qr.add_data(url)
qr.make(fit=True)
qr.print_ascii(invert=True)
print()
print('סרוק עם האייפון או פתח:', url)
" 2>/dev/null || echo "פתח באייפון: $URL"
else
  echo "⚠️  הטאנל לא עלה, האפליקציה זמינה רק ברשת המקומית:"
  echo "   http://$(ipconfig getifaddr en0 2>/dev/null || echo 'localhost'):$PORT"
fi
