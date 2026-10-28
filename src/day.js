// NOTAM 지도 친절모드 — 주간 모드 토글 (흰 바탕). 반전 CSS 는 build.py 가 tools/daymode.py 로 만들어 <style id="kd-day"> 에 넣고,
// 여기서는 html.kd-day 클래스를 켜고 끄기만 한다. 설정은 기기에 저장(kdTheme = 'day' | 'night'), 기본은 야간.
(() => {
  const root = document.documentElement, KEY = 'kdTheme';
  let day = root.classList.contains('kd-day');
  try { if (!day && localStorage.getItem(KEY) === 'day') day = true; } catch (e) {}
  const meta = document.querySelector('meta[name="theme-color"]');
  const st = document.createElement('style');
  st.textContent = `.kd-theme{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:700;padding:6px 10px;border-radius:999px;border:1px solid #475569;background:#1e293b;color:#e2e8f0;cursor:pointer;-webkit-tap-highlight-color:transparent}
  html.kd-day .kd-theme{background:#fef3c7;border-color:#f59e0b;color:#78350f}`;
  document.head.appendChild(st);
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'kd-theme';
  const paint = () => { btn.textContent = day ? '☀️ 주간' : '🌙 야간'; btn.title = day ? '지금은 주간 모드(흰 바탕). 누르면 야간으로' : '지금은 야간 모드(어두운 바탕). 누르면 주간으로'; };
  const apply = () => {
    root.classList.toggle('kd-day', day);
    if (meta) meta.setAttribute('content', day ? '#ffffff' : '#0f172a');
    try { localStorage.setItem(KEY, day ? 'day' : 'night'); } catch (e) {}
    paint();
  };
  apply();
  btn.addEventListener('click', () => { day = !day; apply(); });
  const t = document.querySelector('.kd-toggle');
  if (t) t.after(btn); else (document.querySelector('header > div') || document.body).appendChild(btn);
})();
