// NOTAM 지도 친절모드 — 맨 위 두 줄 요약 (OFP 올리면 표시). 연료·무게는 천 단위 소수 한 자리(예: 150.4 = 150,400)
//   1줄: ZFW · RAMP OUT · REQ FUEL(RQD TAKEOFF)   2줄: TAXI · 5% CONT · ALTN 연료 · 첫 순항고도 · 승객 수
(() => {
  const css = `
  .kt-bar{max-width:72rem;margin:10px auto 0;padding:0 16px;display:none}
  .kt-bar.on{display:block}
  .kt-row{display:flex;flex-direction:column;gap:3px;border:1px solid #155e75;background:rgba(8,51,68,.4);border-radius:12px;padding:7px 12px;font-size:12.5px;color:#cbd5e1;line-height:1.5}
  .kt-row>div{display:flex;flex-wrap:wrap;align-items:center;gap:4px 14px}
  .kt-row span{white-space:nowrap}
  .kt-row i{font-style:normal;font-size:10.5px;color:#94a3b8;margin-right:4px}
  .kt-row b{font-family:ui-monospace,Menlo,monospace;font-weight:800;color:#f8fafc}
  .kt-row .kt-u{font-size:10px;color:#94a3b8;margin-left:2px}
  .kt-row .kt-t{font-weight:800;color:#67e8f9;margin-right:2px}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const bar = document.createElement('div'); bar.className = 'kt-bar';   // 친절모드를 꺼도 보이는 데이터 줄
  const row = document.createElement('div'); row.className = 'kt-row'; bar.appendChild(row);
  const start = document.querySelector('.kd-start'), header = document.querySelector('header');
  if (start) start.before(bar); else if (header) header.after(bar); else document.body.prepend(bar);

  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const num = n => n == null || isNaN(n) ? null : Math.round(n).toLocaleString();
  function parse(raw) {
    const t = String(raw || '').replace(/\r/g, '');
    const unitM = t.match(/\b(100LBS|100KGS|KGS|LBS)\b/); const unit = unitM ? unitM[1] : '';
    const mul = /^100/.test(unit) ? 100 : 1, u = unit.replace(/^100/, '') || '';
    const g = re => { const m = t.match(re); return m ? +m[1] * mul : null; };
    const o = { unit: u };
    o.zfw = g(/\bZFW\s+(\d{3,6})\b/);
    o.ramp = g(/^\s*RAMP\s*OUT\s+(\d{3,6})/m);
    o.taxi = g(/^\s*TAXI\s+(\d{3,6})/m);
    o.cont = g(/^\s*5\s*PCT\s*CONT\s+(\d{3,6})/m);
    o.req = g(/^\s*RQD\s*TAKE\s*OFF\s+(\d{3,6})/m) || g(/^\s*REQ(?:UIRED)?\s*(?:TAKE\s*OFF|T\/?O)?\s*FUEL\s+(\d{3,6})/m);
    const al = t.match(/^\s*ALTN\/([A-Z]{4})\s+(\d{3,6})/m); if (al) { o.altn = al[1]; o.altnFuel = +al[2] * mul; }
    const fl = t.match(/\(FPL-[\s\S]{0,200}?-[NM]\d{3,4}F(\d{3})\b/) || t.match(/\bN0\d{3}F(\d{3})\b/) || t.match(/\bCLB[\s\S]{0,400}?\b(\d{3})\s+---\//);
    if (fl) o.fl = fl[1];
    const px = t.replace(/\s+/g, ' ').match(/PASSENGERS:\s*FIRST\s+(\d+)\/\d+\s+BUSINESS\s+(\d+)\/\d+\s+ECONOMY\s+(\d+)\/\d+/);
    if (px) o.pax = { f: +px[1], c: +px[2], y: +px[3], n: +px[1] + +px[2] + +px[3] };
    return o;
  }
  const k = n => n == null || isNaN(n) ? null : (n / 1000).toFixed(1);   // 24,000 → 24.0
  function render(o) {
    const u = o.unit ? `<span class="kt-u">k${esc(o.unit)}</span>` : '';
    const cell = (label, v, extra) => v == null ? '' : `<span><i>${label}</i><b>${esc(v)}</b>${extra || ''}</span>`;
    const line1 = [
      `<span class="kt-t">📋 오늘 요약</span>`,
      cell('ZFW', k(o.zfw), u),
      cell('RAMP OUT', k(o.ramp), u),
      cell('REQ FUEL', k(o.req), u)
    ].filter(Boolean);
    const line2 = [
      cell('TAXI', k(o.taxi), u),
      cell('5% CONT', k(o.cont), u),
      cell(`ALTN${o.altn ? ' ' + esc(o.altn) : ''}`, k(o.altnFuel), u),
      cell('첫 순항', o.fl ? 'FL' + o.fl : null),
      cell('승객', o.pax ? `${o.pax.n}명` : null, o.pax ? `<span class="kt-u">${o.pax.f ? `F${o.pax.f} ` : ''}C${o.pax.c} Y${o.pax.y}</span>` : '')
    ].filter(Boolean);
    row.innerHTML = `<div>${line1.join('')}</div>` + (line2.length ? `<div>${line2.join('')}</div>` : '');
    bar.classList.toggle('on', line1.length + line2.length > 1);
  }
  let last = '';
  setInterval(() => {
    const t = String(window.__ofpText || '');
    const sig = t.length + '|' + t.slice(0, 200);
    if (sig === last) return; last = sig;
    if (!t) { bar.classList.remove('on'); return; }
    try { render(parse(t)); } catch (e) { bar.classList.remove('on'); }
  }, 1500);
})();
