/* ================= 🌀 흔들림(난기류) 정보 → 지도 표시 =================
   텍스트 붙여넣기 → 기기 안에서 해석 (오프라인 동작). 아이패드 '텍스트 인식 표시(Live Text)'로 사진 글자를 복사해 넣으면 됨. */
(function () {
  'use strict';
  const $id = id => document.getElementById(id);
  const pad2 = n => String(n).padStart(2, '0');
  const hm = m => m == null ? '--' : `${Math.floor(m / 60)}:${pad2(Math.round(m) % 60)}`;
  const wrap180 = d => ((d + 540) % 360) - 180;
  const SEV = { SEV: ['#ef4444', '심함(SEV)'], MOD: ['#f97316', '보통(MOD)'], LGT: ['#facc15', '약함(LGT)'], UNK: ['#38bdf8', '세기 미상'] };
  const REASON_KO = { CAT: '청천난류(CAT)', CB: '적란운·뇌우(CB/TS)', MTW: '산악파(MTW)', JET: '제트기류', WAKE: '후류(Wake)', ICE: '착빙', WS: '윈드시어', CONV: '대류' };

  const css = `.kd-tb{border:1px solid #9a3412;background:rgba(124,45,18,.22);border-radius:10px;padding:6px 10px;font-size:12px}
  .kd-tb b{color:#fed7aa}.kd-tbx{float:right;color:#fda4af;cursor:pointer;padding:0 4px}
  .kd-tblbl{background:#7c2d12;color:#ffedd5;border:1px solid #fb923c;border-radius:6px;padding:0 5px;font-size:11px;font-weight:800;white-space:nowrap}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  let reports = [], savedKey = '';
  try { const o = JSON.parse(localStorage.getItem('kdTurb') || '{}') || {}; reports = Array.isArray(o.r) ? o.r : []; savedKey = o.k || ''; } catch (e) { reports = []; }
  const flightKey = () => { try { return info && info.dep ? `${info.dep}-${info.dest}-${info.flightDate}` : ''; } catch (e) { return ''; } };
  const save = () => { try { localStorage.setItem('kdTurb', JSON.stringify({ k: flightKey() || savedKey, r: reports.slice(-50), t: Date.now() })); } catch (e) {} };
  // 다른 비행의 OFP가 올라오면 이전 보고는 지움 (안전)
  function checkFlight() {
    const k = flightKey(); if (!k || !savedKey || k === savedKey) { if (k) savedKey = k; return; }
    if (reports.length) { reports = []; showToast('이전 비행의 흔들림 보고를 지웠어요'); }
    savedKey = k; save(); render();
  }

  // ---------- 패널 ----------
  const sec2 = [...document.querySelectorAll('main section')].find(sc => { const h = sc.querySelector('h2'); return h && h.textContent.trim().startsWith('2.'); });
  const panel = document.createElement('div');
  panel.className = 'kd-panel';
  panel.innerHTML = `
    <h3>🌀 흔들림 정보 → 지도 <span class="kd-chip">텍스트 붙여넣기 · 오프라인</span></h3>
    <div style="font-size:12px;color:#cbd5e1">비행 중 받은 난기류 정보(좌표·구간·원인)를 붙여넣으면 지도에 바로 그려줘요.</div>
    <div style="font-size:11.5px;color:#94a3b8">📷 종이나 화면에 있는 정보는: 아이패드 카메라/사진 앱에서 글자를 길게 눌러 <b style="color:#e2e8f0">텍스트 인식 표시(Live Text)</b>로 복사한 뒤 붙여넣으세요. 좌표(N3712.5E12830.0, 3712N12830E 등), 경로 웨이포인트 이름, FL, MOD/SEV, CAT/CB/MTW 같은 단어를 찾아요. 보고가 여러 개면 빈 줄로 나눠 주세요.</div>
    <textarea id="kd-tb-text" rows="4" class="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs mono text-slate-200" placeholder="예) MOD TURB REPORTED FL340-380 BTN N3730.0E13200.0 AND N3815.0E13545.0 DUE CAT"></textarea>
    <div class="flex items-center gap-2"><button id="kd-tb-parse" class="kd-btn">지도에 표시</button><button id="kd-tb-clear-text" class="kd-btn off">입력 지우기</button></div>
    <div id="kd-tb-list" class="flex flex-col gap-1.5"></div>
    <div id="kd-tb-foot" class="flex items-center justify-between" style="font-size:11px;color:#94a3b8"></div>`;
  if (sec2) sec2.appendChild(panel);

  // ---------- 위치 계산 도우미 ----------
  const nav = () => (typeof pdfNav !== 'undefined' && pdfNav) || [];
  const meanLon = () => { const R = (typeof routeCoordinates !== 'undefined' && routeCoordinates) || []; return R.length ? R.reduce((a, p) => a + p[1], 0) / R.length : 0; };
  const nearLon = (lon, ref) => { while (lon - ref > 180) lon -= 360; while (lon - ref < -180) lon += 360; return lon; };
  function wptLL(name) {
    const n = String(name || '').toUpperCase().trim(); if (!n) return null;
    const w = nav().find(x => x.name === n); if (w) return w.ll;
    try { const i = (routeTokens || []).indexOf(n); if (i >= 0 && routeCoordinates[i]) return routeCoordinates[i]; } catch (e) {}
    try { const a = (typeof AIRPORT_XY !== 'undefined' && AIRPORT_XY[n]); if (a) return a; } catch (e) {}
    return null;
  }
  function elapsedNear(ll) {
    const N = nav(); if (!N.length || !ll) return null;
    let bi = -1, bd = 1e9;
    N.forEach((w, i) => { const d = gcDistNm(ll, w.ll); if (d < bd) { bd = d; bi = i; } });
    return bi >= 0 && bd < 150 ? { el: N[bi].el, name: N[bi].name, d: bd } : null;
  }

  // ---------- 텍스트 해석 (오프라인) ----------
  function parseCoords(t) {
    const out = [];
    const push = (a, b, idx) => { if (Math.abs(a) <= 90 && Math.abs(b) <= 180) out.push({ lat: a, lon: b, idx }); };
    let m;
    // N3712.5E12830.0 · N37 12.5 E128 30.0 · N3712.5 E12830.0
    const r1 = /([NS])\s?(\d{2})\s?(\d{2}(?:\.\d+)?)\s*[\/,]?\s*([EW])\s?(\d{3})\s?(\d{2}(?:\.\d+)?)/g;
    while ((m = r1.exec(t))) { let a = +m[2] + +m[3] / 60, b = +m[5] + +m[6] / 60; if (m[1] === 'S') a = -a; if (m[4] === 'W') b = -b; push(a, b, m.index); }
    // 3712N12830E · 371230N1283045E
    const r2 = /(?<![\dA-Z])(\d{2})(\d{2})(\d{2})?([NS])\s?(\d{3})(\d{2})(\d{2})?([EW])(?![\dA-Z])/g;
    while ((m = r2.exec(t))) { let a = +m[1] + +m[2] / 60 + (m[3] ? +m[3] / 3600 : 0), b = +m[5] + +m[6] / 60 + (m[7] ? +m[7] / 3600 : 0); if (m[4] === 'S') a = -a; if (m[8] === 'W') b = -b; push(a, b, m.index); }
    // 37N130E / 37N 130E
    const r3 = /(?<![\dA-Z.])(\d{2})([NS])\s?(\d{3})([EW])(?![\dA-Z])/g;
    while ((m = r3.exec(t))) { let a = +m[1], b = +m[3]; if (m[2] === 'S') a = -a; if (m[4] === 'W') b = -b; push(a, b, m.index); }
    return out;
  }
  function parseText(raw) {
    const blocks = String(raw || '').toUpperCase().split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
    return blocks.map(t => {
      const pts = parseCoords(t).map(p => ({ lat: p.lat, lon: p.lon, name: '', idx: p.idx }));
      // 경로 웨이포인트 이름도 위치로 사용 (본문 등장 순서대로)
      const names = [...new Set(nav().map(w => w.name).filter(n => /^[A-Z]{3,5}$/.test(n) && n !== 'TOC' && n !== 'TOD'))];
      names.forEach(n => { const rx = new RegExp('(?<![A-Z0-9])' + n + '(?![A-Z0-9])'); const mm = rx.exec(t); if (mm) { const ll = wptLL(n); if (ll) pts.push({ lat: ll[0], lon: ll[1], name: n, idx: mm.index }); } });
      pts.sort((a, b) => a.idx - b.idx);
      const sev = /\bSEV|SEVERE\b/.test(t) ? 'SEV' : /\bMOD|MODERATE\b/.test(t) ? 'MOD' : /\bLGT|LIGHT\b/.test(t) ? 'LGT' : 'UNK';
      const reasons = [];
      if (/\bCAT\b|CLEAR AIR/.test(t)) reasons.push('CAT');
      if (/\bCB\b|\bTS\b|THUNDER|CONVECT|\bTCU\b/.test(t)) reasons.push('CB');
      if (/\bMTW\b|MOUNTAIN WAVE/.test(t)) reasons.push('MTW');
      if (/\bJET\b|JETSTREAM|JET STREAM/.test(t)) reasons.push('JET');
      if (/\bWAKE\b/.test(t)) reasons.push('WAKE');
      if (/\bICE\b|ICING/.test(t)) reasons.push('ICE');
      if (/WIND\s?SHEAR|\bWS\b/.test(t)) reasons.push('WS');
      const fls = [...t.matchAll(/\bFL\s?(\d{3})(?:\s?[-\/~]\s?(?:FL)?\s?(\d{3}))?/g)].flatMap(m => [+m[1], m[2] ? +m[2] : null]).filter(v => v != null);
      return { id: Date.now() + Math.random(), at: Date.now(), src: '텍스트', sev, reasons, reason_ko: reasons.map(r => REASON_KO[r]).join(', ') || '원인 미기재',
        flLo: fls.length ? Math.min(...fls) : null, flHi: fls.length ? Math.max(...fls) : null, points: pts.map(({ lat, lon, name }) => ({ lat, lon, name })), raw: t.slice(0, 600) };
    }).filter(r => r.points.length);
  }

  // ---------- 목록 · 지도 ----------
  function render() {
    const box = $id('kd-tb-list'); if (!box) return;
    box.innerHTML = reports.map((r, k) => {
      const a = elapsedNear([r.points[0].lat, r.points[0].lon]), b = r.points.length > 1 ? elapsedNear([r.points[r.points.length - 1].lat, r.points[r.points.length - 1].lon]) : null;
      const when = a && a.el != null ? (b && b.el != null && b.el !== a.el ? `경로상 이륙 후 ${hm(Math.min(a.el, b.el))} ~ ${hm(Math.max(a.el, b.el))} 부근` : `경로상 이륙 후 ${hm(a.el)} 부근 (${esc(a.name)})`) : '내 경로와 먼 위치';
      const fl = r.flLo != null ? `FL${pad2(r.flLo).padStart(3, '0')}${r.flHi != null && r.flHi !== r.flLo ? '~' + pad2(r.flHi).padStart(3, '0') : ''}` : '고도 미기재';
      return `<div class="kd-tb"><span class="kd-tbx" data-tbdel="${k}">✕</span>
        <b style="color:${SEV[r.sev][0]}">● ${SEV[r.sev][1]}</b> · <b>${esc(r.reason_ko)}</b> · ${esc(fl)} <span class="kd-chip">${esc(r.src)}${r.at ? ' · ' + new Date(r.at).toISOString().slice(11, 16) + 'Z 입력' : ''}</span>
        <div style="color:#fdba74">${esc(when)}${r.time ? ' · ' + esc(r.time) : ''}</div>
        <div style="color:#94a3b8;font-size:11px">${r.points.map(p => p.name || `${p.lat.toFixed(2)},${wrap180(p.lon).toFixed(2)}`).map(esc).join(' → ')}</div></div>`;
    }).join('');
    const foot = $id('kd-tb-foot');
    if (foot) foot.innerHTML = reports.length ? `<span>${reports.length}건 · 이 기기에만 저장돼요 (다른 비행 OFP를 올리면 자동으로 지워져요)</span><button id="kd-tb-clear" class="kd-chip" style="cursor:pointer">모두 지우기</button>` : '';
    draw();
  }
  let mainG = null;
  function layersInto(g) {
    const ref = meanLon();
    reports.forEach(r => {
      const c = SEV[r.sev][0], ll = r.points.map(p => [p.lat, nearLon(p.lon, ref)]);
      const fl = r.flLo != null ? ` FL${r.flLo}${r.flHi != null && r.flHi !== r.flLo ? '-' + r.flHi : ''}` : '';
      const tip = `🌀 ${SEV[r.sev][1]} · ${esc(r.reason_ko)}${fl}`;
      let lyr;
      if (ll.length >= 3 && /AREA|WI |BOUNDED|POLYGON/.test(r.raw || '')) lyr = L.polygon(ll, { color: c, weight: 2, fillColor: c, fillOpacity: 0.2 });
      else if (ll.length >= 2) lyr = L.polyline(ll, { color: c, weight: 8, opacity: 0.7, lineCap: 'round' });
      else lyr = L.circle(ll[0], { radius: 20 * 1852, color: c, weight: 2, fillColor: c, fillOpacity: 0.25 });
      lyr.bindTooltip(tip, { sticky: true }).bindPopup(`<b>${tip}</b><pre style="white-space:pre-wrap;font-size:10px;margin-top:4px">${esc(r.raw || '')}</pre>`).addTo(g);
      L.marker(ll[Math.floor(ll.length / 2)], { interactive: false, icon: L.divIcon({ className: '', iconSize: [0, 0], html: `<span class="kd-tblbl" style="position:absolute;transform:translate(-50%,40%)">🌀 ${r.sev}${r.reasons[0] ? ' ' + r.reasons[0] : ''}${fl}</span>` }) }).addTo(g);
    });
  }
  function draw() {
    if (!window.L || typeof lmap === 'undefined' || !lmap) return;
    if (!mainG) mainG = L.layerGroup().addTo(lmap);
    mainG.clearLayers(); layersInto(mainG);
    try { window.__kdDrawMini && window.__kdDrawMini(); } catch (e) {}
  }
  if (typeof renderMap === 'function') {
    const orig = renderMap;
    window.renderMap = function () { const r = orig.apply(this, arguments); try { draw(); } catch (e) {} return r; };
    try { renderMap = window.renderMap; } catch (e) {}
  }
  window.__kdTurbLayers = layersInto;
  window.__kd = window.__kd || {}; window.__kd.turb = () => reports;   // SR 미니맵에서도 같이 그림

  // ---------- 이벤트 ----------
  $id('kd-tb-clear-text').addEventListener('click', () => { $id('kd-tb-text').value = ''; });
  $id('kd-tb-parse').addEventListener('click', () => {
    const add = parseText($id('kd-tb-text').value);
    if (!add.length) { showToast('위치(좌표·경로 웨이포인트)를 찾지 못했어요'); return; }
    reports.push(...add); save(); render(); showToast(`${add.length}건을 지도에 표시했어요`);
  });
  $id('kd-tb-foot').addEventListener('click', e => { if (e.target.id === 'kd-tb-clear') { reports = []; save(); render(); } });
  const pin = $id('pdf-input'); if (pin) pin.addEventListener('change', () => { setTimeout(checkFlight, 4000); setTimeout(checkFlight, 15000); });
  const rs = $id('btn-reset'); if (rs) rs.addEventListener('click', () => setTimeout(render, 0));
  $id('kd-tb-list').addEventListener('click', e => {
    const d = e.target.closest('[data-tbdel]'); if (!d) return;
    reports.splice(+d.dataset.tbdel, 1); save(); render();
  });

  render();
})();
