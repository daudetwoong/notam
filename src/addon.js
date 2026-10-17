/* ================= 🌪️ SR 4 이상 구간 · 📍 실시간 위치 (친절모드 추가 기능) =================
   - SR: OFP PDF 항법로그의 'SR' 열을 PDF 글자 위치(x좌표)로 직접 읽어 웨이포인트별 값으로 매칭
   - 위치: 기기 위치 서비스(navigator.geolocation). 아이패드에 연결된 블루투스 GPS도 위치 서비스로 들어오면 그대로 사용
   외부 통신 없음. */
(function () {
  'use strict';
  const SR_MIN = 4;
  const $id = id => document.getElementById(id);
  const pad2 = n => String(n).padStart(2, '0');
  const hm = m => m == null ? '--' : `${Math.floor(m / 60)}:${pad2(Math.round(m) % 60)}`;
  const wrap180 = d => ((d + 540) % 360) - 180;

  const css = `
  .kd-panel{border:1px solid #334155;background:rgba(2,6,23,.6);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:8px;font-size:12.5px;color:#e2e8f0;line-height:1.55}
  .kd-panel h3{font-size:13px;font-weight:800;color:#f1f5f9;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
  .kd-sr-row{border:1px solid #6b21a8;background:rgba(88,28,135,.25);border-radius:10px;padding:6px 10px;cursor:pointer}
  .kd-sr-row b{color:#f5d0fe}
  .kd-sr-big{font-size:15px;font-weight:800;color:#fff}
  .kd-chip{display:inline-block;font-size:11px;border-radius:6px;padding:1px 7px;border:1px solid #475569;background:#0f172a;color:#cbd5e1}
  .kd-btn{font-size:12px;font-weight:700;padding:7px 12px;border-radius:10px;border:1px solid #0e7490;background:#0e7490;color:#fff;cursor:pointer;-webkit-tap-highlight-color:transparent}
  .kd-btn.off{background:#1e293b;border-color:#475569;color:#cbd5e1}
    .kd-gps-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:6px}
  .kd-gps-grid div{background:#0f172a;border:1px solid #1e293b;border-radius:8px;padding:4px 8px}
  .kd-gps-grid span{display:block;font-size:10px;color:#94a3b8}
  .kd-gps-grid b{font-family:ui-monospace,Menlo,monospace;font-size:14px;color:#f8fafc}
  .kd-warn{font-size:12px;border-radius:8px;padding:6px 10px;background:rgba(217,119,6,.15);border:1px solid rgba(245,158,11,.45);color:#fde68a}
  .kd-ok{font-size:12px;border-radius:8px;padding:6px 10px;background:rgba(6,95,70,.25);border:1px solid rgba(16,185,129,.45);color:#a7f3d0}
  .kd-plane{font-size:22px;line-height:22px;text-shadow:0 0 4px #000,0 0 8px #0ea5e9;transform-origin:center}
  .kd-srlbl{background:#581c87;color:#f5d0fe;border:1px solid #c084fc;border-radius:6px;padding:0 5px;font-size:11px;font-weight:800;white-space:nowrap}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // ---------- 상태 ----------
  let srByIdx = [];          // pdfNav 인덱스 → SR 값 (없으면 null)
  let srRuns = [];           // [{i0, i1, max, t0, t1}]
  let srDiag = '';           // 인식 결과 요약
  let srBusy = false;
  let gps = null;            // 최신 위치 {lat, lon, alt, spd, hdg, acc, t}
  let gpsTrail = [];
  let watchId = null;
  let follow = true;

  // ---------- 패널 (② Flight Information 아래) ----------
  const sec2 = [...document.querySelectorAll('main section')].find(sc => { const h = sc.querySelector('h2'); return h && h.textContent.trim().startsWith('2.'); });
  const panel = document.createElement('div');
  panel.className = 'flex flex-col gap-3';
  panel.innerHTML = `
    <div class="kd-panel">
      <h3>🌪️ SR ${SR_MIN} 이상 구간 <span class="kd-chip">이륙 기준 경과시간</span></h3>
      <div id="kd-sr-list" class="flex flex-col gap-1.5"><div class="kd-dim" style="color:#94a3b8">OFP PDF를 첨부하면 항법로그의 SR 값을 읽어서 표시해요.</div></div>
      <div id="kd-sr-diag" style="font-size:11px;color:#94a3b8"></div>
    </div>
    <div class="kd-panel">
      <h3>📍 실시간 비행기 위치 <span class="kd-chip">기기 위치 서비스 · 블루투스 GPS</span></h3>
      <div class="flex items-center gap-2 flex-wrap">
        <button id="kd-gps-btn" class="kd-btn">위치 표시 시작</button>
        <label class="flex items-center gap-1 text-[12px] text-slate-300 cursor-pointer"><input id="kd-gps-follow" type="checkbox" checked style="width:16px;height:16px"> 지도가 비행기 따라가기</label>
      </div>
      <div id="kd-gps-msg" style="font-size:12px;color:#94a3b8">버튼을 누르면 위치 권한을 물어봐요. 아이패드에 연결된 블루투스 GPS 위치가 iPad 위치 서비스로 들어오면 그 값을 그대로 써요.</div>
      <div id="kd-gps-data" class="kd-gps-grid" style="display:none"></div>
      <div id="kd-gps-prog"></div>
    </div>`;
  if (sec2) sec2.appendChild(panel);

  // ---------- SR 읽기 ----------
  function tokensOf(it) {
    // 한 텍스트 조각에 여러 단어가 붙어 있으면 글자 위치 비율로 각 단어의 x 중심을 추정
    const s = it.str || '', x = it.transform[4], w = it.width || 0, out = [];
    if (!s.trim()) return out;
    const L = s.length || 1;
    s.replace(/\S+/g, (tok, idx) => { out.push({ s: tok, xc: x + w * (idx + tok.length / 2) / L }); return tok; });
    return out;
  }
  async function extractSr(file) {
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await openPdf(data);
    const entries = [];   // {kind:'w'|'s', page, y, ll?, v?}
    let hdr = null;       // {xc, tol}
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      const rows = [];
      tc.items.forEach(it => {
        if (!it.str || !it.str.trim()) return;
        const y = it.transform[5];
        let r = rows.find(r => Math.abs(r.y - y) < 2.5);
        if (!r) { r = { y, items: [] }; rows.push(r); }
        r.items.push(it);
      });
      rows.sort((a, b) => b.y - a.y);
      let hdrY = null;
      rows.forEach(r => {
        r.items.sort((a, b) => a.transform[4] - b.transform[4]);
        const toks = r.items.flatMap(tokensOf);
        const txt = toks.map(t => t.s).join(' ');
        // 헤더 행: 'SR' 단어 + 항법로그 열 이름이 같이 있는 행
        const srTok = toks.find(t => t.s === 'SR');
        if (srTok && /\b(TAS|GS|WIND|MC|FL|TEMP|COMP|MSA|DIST)\b/.test(txt)) {
          const others = toks.filter(t => t !== srTok).map(t => Math.abs(t.xc - srTok.xc)).sort((a, b) => a - b);
          hdr = { xc: srTok.xc, tol: Math.max(4, Math.min(12, (others[0] || 16) * 0.55)) };
          hdrY = r.y;
          return;
        }
        if (!hdr || (hdrY !== null && r.y >= hdrY)) return;
        const la = txt.match(/(?<![A-Z0-9])([NS])\s*(\d{2})\s+(\d{1,2}\.\d)(?!\d)/);
        if (!la) return;
        let a = +la[2] + +la[3] / 60; if (la[1] === 'S') a = -a;
        // 1순위: WIND/COMP(예 26045M042) 바로 뒤 2자리 = SR · 2순위: 헤더 'SR' 열 위치
        const wm = txt.match(/\b\d{5}[MP]\d{3}\s+(\d{1,2})\s+\d{3}\b/);
        let v = wm ? +wm[1] : null;
        if (v == null) { const c = toks.filter(t => Math.abs(t.xc - hdr.xc) <= hdr.tol && /^\d{1,2}$/.test(t.s)); if (c.length) v = Math.max(...c.map(t => +t.s)); }
        entries.push({ kind: 'w', page: p, y: r.y, lat: a, v });
      });
    }
    return entries;
  }
  function matchSr(entries) {
    const nav = (typeof pdfNav !== 'undefined' && pdfNav) || [];
    const out = nav.map(() => null);
    // 위도 행을 항법로그 순서대로 pdfNav와 맞춤 (앞으로만 진행 → 뒤쪽 교체공항 경로·재인쇄본은 자동 무시)
    let j = 0, ws = 0;
    entries.forEach(e => {
      if (e.kind !== 'w') return; ws++;
      for (let k = j; k < Math.min(nav.length, j + 4); k++) {
        if (Math.abs(nav[k].ll[0] - e.lat) < 0.02) { if (e.v != null) out[k] = e.v; j = k + 1; return; }
      }
    });
    srDiag = `항법로그 웨이포인트 ${nav.length}개 중 SR 값 ${out.filter(v => v != null).length}개 인식` + (ws ? '' : ' · ⚠ 항법로그 행을 찾지 못했어요') + ' · TOC 전 상승 구간은 OFP에 SR이 없어요';
    return out;
  }
  function buildRuns() {
    const nav = pdfNav || [];
    const runs = [];
    let cur = null;
    srByIdx.forEach((v, i) => {
      if (v != null && v >= SR_MIN) {
        if (cur && cur.i1 === i - 1) { cur.i1 = i; cur.max = Math.max(cur.max, v); }
        else { cur = { i0: i, i1: i, max: v }; runs.push(cur); }
      }
    });
    // SR 값은 '그 웨이포인트로 가는 구간'으로 보고 앞 웨이포인트부터 시작
    runs.forEach(r => {
      r.s = Math.max(0, r.i0 - 1);
      const t0 = nav[r.s] && nav[r.s].el, t1 = nav[r.i1] && nav[r.i1].el;
      r.t0 = t0 != null ? t0 : (nav[r.i0] ? nav[r.i0].el : null);
      r.t1 = t1;
    });
    srRuns = runs;
  }
  function clockAt(elMin) {
    try {
      const w = flightWindow(); if (!w || elMin == null) return '';
      const d = new Date(w.etd + elMin * 6e4), k = new Date(d.getTime() + 9 * 3600e3);
      return `≈ ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}Z · 한국 ${pad2(k.getUTCHours())}:${pad2(k.getUTCMinutes())}`;
    } catch (e) { return ''; }
  }
  function renderSrList() {
    const box = $id('kd-sr-list'), diag = $id('kd-sr-diag'); if (!box) return;
    const nav = (typeof pdfNav !== 'undefined' && pdfNav) || [];
    diag.textContent = srDiag;
    if (srBusy) { box.innerHTML = '<div style="color:#7dd3fc">항법로그에서 SR 값을 읽는 중...</div>'; return; }
    if (!nav.length) { box.innerHTML = '<div style="color:#94a3b8">OFP PDF를 첨부하면 항법로그의 SR 값을 읽어서 표시해요.</div>'; drawSrMini(); return; }
    if (!srByIdx.some(v => v != null)) { box.innerHTML = '<div class="kd-warn">이 OFP에서 SR 열을 찾지 못했어요. 항법로그 형식이 달라서일 수 있어요. 원문 항법로그로 확인해 주세요.</div>'; drawSrMini(); return; }
    if (!srRuns.length) { box.innerHTML = `<div class="kd-ok">✅ SR ${SR_MIN} 이상 구간이 없어요. (최대 SR ${Math.max(...srByIdx.filter(v => v != null))})</div>`; drawSrMini(); return; }
    box.innerHTML = srRuns.map((r, k) => {
      const dur = r.t0 != null && r.t1 != null ? r.t1 - r.t0 : null;
      const from = nav[r.s] ? nav[r.s].name : '', to = nav[r.i1] ? nav[r.i1].name : '';
      const fl = [...new Set(nav.slice(r.i0, r.i1 + 1).map(w => w.fl).filter(v => typeof v === 'number'))].map(v => 'FL' + pad2(v).padStart(3, '0')).join('·');
      return `<div class="kd-sr-row" data-srk="${k}">
        <div class="kd-sr-big">이륙 후 <b>${hm(r.t0)}</b>부터 ${dur != null ? `<b>${dur}분간</b>` : ''} <span class="kd-chip" style="border-color:#c084fc;color:#f5d0fe">최대 SR ${r.max}</span></div>
        <div style="font-size:12px;color:#e9d5ff">${esc(from)} → ${esc(to)} · 경과 ${hm(r.t0)} ~ ${hm(r.t1)}${fl ? ' · ' + fl : ''}</div>
        <div style="font-size:11px;color:#c4b5fd">${esc(clockAt(r.t0))}${r.t1 != null ? ' ~ ' + esc(clockAt(r.t1).replace(/^≈ /, '')) : ''} <span style="color:#94a3b8">(OFP ETD 기준 · 실제 이륙시각에 맞춰 더하세요)</span></div>
      </div>`;
    }).join('') + `<div style="font-size:11px;color:#94a3b8">SR(Shear Rate)은 고도별 바람 차이로 본 수직 윈드시어 지수예요. 값이 클수록 CAT(청천난류) 가능성이 높아요. 실제 판단은 SIGWX·PIREP과 같이 보세요. 구간을 누르면 ⑥ 큰 지도에서 보여줘요.</div>`;
    drawSrMini();
  }

  // ---------- 지도 그리기 ----------
  let mini = null, mainLayer = null;
  const meanLon = () => { const R = routeCoordinates || []; return R.length ? R.reduce((a, p) => a + p[1], 0) / R.length : 0; };
  const nearLon = (lon, ref) => { while (lon - ref > 180) lon -= 360; while (lon - ref < -180) lon += 360; return lon; };
  function srLayers(group) {
    const R = routeCoordinates || [], nav = pdfNav || [];
    if (R.length < 2 || !srRuns.length || nav.length !== R.length) return;
    srRuns.forEach((r, k) => {
      const seg = R.slice(r.s, r.i1 + 1); if (seg.length < 2) return;
      L.polyline(seg, { color: '#a855f7', weight: 9, opacity: 0.55, lineCap: 'round' })
        .bindTooltip(`🌪️ SR ${r.max} · 이륙 후 ${hm(r.t0)}부터 ${r.t1 != null && r.t0 != null ? (r.t1 - r.t0) + '분간' : ''}`, { sticky: true })
        .addTo(group);
      const mid = seg[Math.floor(seg.length / 2)];
      L.marker(mid, { interactive: false, icon: L.divIcon({ className: '', iconSize: [0, 0], html: `<span class="kd-srlbl" style="position:absolute;transform:translate(-50%,-150%)">SR${r.max} +${hm(r.t0)}</span>` }) }).addTo(group);
    });
  }
  function planeLayer(group) {
    if (!gps) return;
    const ref = meanLon();
    if (gpsTrail.length > 1) L.polyline(gpsTrail.map(p => [p[0], nearLon(p[1], ref)]), { color: '#38bdf8', weight: 2, dashArray: '3 4', opacity: 0.9 }).addTo(group);
    const hdg = gps.hdg != null && !isNaN(gps.hdg) ? gps.hdg : 0;
    L.marker([gps.lat, nearLon(gps.lon, ref)], { zIndexOffset: 1000, icon: L.divIcon({ className: '', iconSize: [24, 24], iconAnchor: [12, 12],
      html: `<div class="kd-plane" style="transform:rotate(${hdg - 45}deg)">✈️</div>` }) })
      .bindTooltip(`현재 위치 · GS ${gps.spd != null ? Math.round(gps.spd) + 'kt' : '--'} · ALT ${gps.alt != null ? Math.round(gps.alt).toLocaleString() + 'ft' : '--'}`).addTo(group);
  }
  function drawSrMini() { /* 작은 지도 제거: 모든 표시는 큰 지도(⑥)에 */ }
  function drawMain() {
    if (typeof lmap === 'undefined' || !lmap || !window.L) return;
    if (!mainLayer) mainLayer = L.layerGroup().addTo(lmap);
    mainLayer.clearLayers();
    srLayers(mainLayer);
    planeLayer(mainLayer);
  }
  if (typeof renderMap === 'function') {
    const orig = renderMap;
    window.renderMap = function (fit) { const r = orig.apply(this, arguments); try { drawMain(); } catch (e) {} return r; };
    try { renderMap = window.renderMap; } catch (e) {}
  }
  document.addEventListener('click', e => {
    const row = e.target.closest && e.target.closest('[data-srk]'); if (!row) return;
    const r = srRuns[+row.dataset.srk]; const R = routeCoordinates || []; if (!r || typeof lmap === 'undefined' || !lmap) return;
    const seg = R.slice(r.s, r.i1 + 1); if (!seg.length) return;
    document.getElementById('map').scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => lmap.fitBounds(L.latLngBounds(seg), { padding: [40, 40], maxZoom: 7 }), 400);
  });

  // ---------- PDF 첨부 감지 → SR 읽기 ----------
  async function onPdf(file) {
    if (!file || !/pdf/i.test(file.type + file.name)) return;
    srBusy = true; srByIdx = []; srRuns = []; srDiag = ''; renderSrList();
    let entries = [];
    try { entries = await extractSr(file); } catch (e) { srDiag = 'SR 읽기 실패: ' + (e && e.message || e); }
    // 원본 도구가 항법로그(pdfNav)를 다 읽을 때까지 대기 (최대 30초)
    for (let i = 0; i < 60 && !(pdfNav && pdfNav.length >= 2); i++) await new Promise(r => setTimeout(r, 500));
    srBusy = false;
    srByIdx = matchSr(entries);
    buildRuns();
    renderSrList(); drawMain();
  }
  const pin = $id('pdf-input'), dz = $id('dropzone');
  if (pin) pin.addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) onPdf(f); });
  if (dz) dz.addEventListener('drop', e => { const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) onPdf(f); });
  const rs = $id('btn-reset');
  if (rs) rs.addEventListener('click', () => { srByIdx = []; srRuns = []; srDiag = ''; setTimeout(() => { renderSrList(); drawMain(); }, 0); });

  // ---------- 실시간 위치 ----------
  function progressHtml() {
    const R = routeCoordinates || [], nav = pdfNav || [];
    if (!gps || R.length < 2) return '';
    const ref = meanLon(), P = [gps.lat, nearLon(gps.lon, ref)];
    let bi = 0, bd = 1e9;
    R.forEach((p, i) => { const d = gcDistNm(P, p); if (d < bd) { bd = d; bi = i; } });
    const el = nav[bi] && nav[bi].el;
    let txt = `가장 가까운 웨이포인트 <b>${esc(routeTokens[bi] || '')}</b> (${Math.round(bd)}NM)` + (el != null ? ` · 계획상 이륙 후 ${hm(el)} 지점` : '');
    const inRun = srRuns.find(r => bi >= r.s && bi <= r.i1);
    const next = srRuns.find(r => r.s > bi);
    if (inRun) txt += `<div class="kd-warn" style="margin-top:4px">🌪️ 지금 <b>SR ${inRun.max}</b> 구간 근처예요 (${esc(routeTokens[inRun.s] || '')} → ${esc(routeTokens[inRun.i1] || '')})</div>`;
    else if (next && el != null && next.t0 != null) txt += `<div class="kd-ok" style="margin-top:4px">다음 SR ${SR_MIN} 이상 구간까지 계획상 약 <b>${Math.max(0, next.t0 - el)}분</b> (SR ${next.max})</div>`;
    if (bd > 100) txt += `<div style="font-size:11px;color:#fbbf24">경로에서 ${Math.round(bd)}NM 떨어져 있어요. 경로 기준 계산이 맞지 않을 수 있어요.</div>`;
    return `<div style="font-size:12px">${txt}</div>`;
  }
  setInterval(() => { if (watchId != null && gps && Date.now() - gps.t > 20000) gpsMsg(`⚠ 위치 신호가 ${Math.round((Date.now() - gps.t) / 1000)}초 동안 안 들어와요. 블루투스 GPS 연결을 확인하세요. (지도의 비행기는 마지막 위치예요)`, 'kd-warn'); }, 5000);
  function renderGps() {
    const d = $id('kd-gps-data'), pg = $id('kd-gps-prog'); if (!d) return;
    if (!gps) { d.style.display = 'none'; pg.innerHTML = ''; return; }
    const ll = (v, p, n) => `${v >= 0 ? p : n}${Math.floor(Math.abs(v))}°${(Math.abs(v) % 1 * 60).toFixed(1)}'`;
    d.style.display = '';
    d.innerHTML = `<div><span>위도</span><b>${ll(gps.lat, 'N', 'S')}</b></div><div><span>경도</span><b>${ll(gps.lon, 'E', 'W')}</b></div>
      <div><span>GS</span><b>${gps.spd != null ? Math.round(gps.spd) + ' kt' : '--'}</b></div><div><span>TRK</span><b>${gps.hdg != null && !isNaN(gps.hdg) ? pad2(Math.round(gps.hdg)).padStart(3, '0') + '°' : '--'}</b></div>
      <div><span>GPS 고도</span><b>${gps.alt != null ? Math.round(gps.alt).toLocaleString() + ' ft' : '--'}</b></div><div><span>정확도 · 수신</span><b>${gps.acc != null ? '±' + Math.round(gps.acc) + 'm' : '--'} · ${new Date(gps.t).toISOString().slice(11, 19)}Z</b></div>`;
    pg.innerHTML = progressHtml();
  }
  function gpsMsg(html, cls) { const m = $id('kd-gps-msg'); if (m) { m.className = cls || ''; m.style.fontSize = '12px'; m.innerHTML = html; } }
  function stopGps() {
    if (watchId != null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
    watchId = null; const b = $id('kd-gps-btn'); if (b) { b.textContent = '위치 표시 시작'; b.classList.remove('off'); }
  }
  function startGps() {
    if (!navigator.geolocation) { gpsMsg('이 브라우저는 위치 기능을 지원하지 않아요.', 'kd-warn'); return; }
    if (!window.isSecureContext) { gpsMsg('보안 연결(https)에서만 위치를 받을 수 있어요. 파일로 연 경우에는 동작하지 않아요.', 'kd-warn'); return; }
    try { if (document.featurePolicy && !document.featurePolicy.allowsFeature('geolocation')) { gpsMsg('이 페이지가 열린 환경에서 위치 사용이 막혀 있어요. (호스팅 페이지의 보안 정책) 일반 웹 주소로 올린 버전에서 사용해 주세요.', 'kd-warn'); return; } } catch (e) {}
    gpsMsg('위치 신호를 기다리는 중... 처음에는 권한 허용 창이 떠요.', '');
    const b = $id('kd-gps-btn'); if (b) { b.textContent = '위치 표시 중지'; b.classList.add('off'); }
    watchId = navigator.geolocation.watchPosition(pos => {
      const c = pos.coords;
      gps = { lat: c.latitude, lon: c.longitude, alt: c.altitude != null ? c.altitude * 3.28084 : null, spd: c.speed != null ? c.speed * 1.943844 : null,
        hdg: c.heading, acc: c.accuracy, t: pos.timestamp };
      const last = gpsTrail[gpsTrail.length - 1];
      if (!last || Math.abs(last[0] - gps.lat) + Math.abs(last[1] - gps.lon) > 0.01) { gpsTrail.push([gps.lat, gps.lon]); if (gpsTrail.length > 2000) gpsTrail.shift(); }
      gpsMsg(`✅ 위치 수신 중이에요. 정확도 ±${Math.round(c.accuracy)}m ${c.accuracy > 1000 ? '(정확도가 낮아요. Wi-Fi 위치일 수 있어요. 블루투스 GPS 연결을 확인하세요)' : ''}`, 'kd-ok');
      renderGps(); drawMain(); drawSrMini();
      try { window.__kd && window.__kd.onGps && window.__kd.onGps(gps); } catch (e) {}
      const ref = meanLon();
      if (follow && typeof lmap !== 'undefined' && lmap) lmap.panTo([gps.lat, nearLon(gps.lon, ref)], { animate: true });
    }, err => {
      const why = err.code === 1
        ? '위치 권한이 거부됐거나, 이 페이지가 열린 환경에서 위치 사용이 막혀 있어요.<br>· 아이패드: <b>설정 → 개인정보 보호 및 보안 → 위치 서비스 → Safari 웹 사이트</b>를 "앱을 사용하는 동안"으로 바꿔 주세요.<br>· claude.ai 안에서 연 페이지는 보안 정책 때문에 위치가 막힐 수 있어요. 그때는 일반 웹 주소로 올린 버전에서 써야 해요.'
        : err.code === 2 ? '위치를 잡지 못했어요. 블루투스 GPS가 아이패드에 연결돼 있는지, GPS 앱에서 위치가 잡히는지 확인해 주세요.'
        : '위치 신호가 늦어지고 있어요. 계속 기다리는 중이에요.';
      gpsMsg(why, 'kd-warn');
      if (err.code === 1) stopGps();
    }, { enableHighAccuracy: true, maximumAge: 2000, timeout: 30000 });
  }
  const gb = $id('kd-gps-btn');
  if (gb) gb.addEventListener('click', () => { watchId == null ? startGps() : stopGps(); });
  const fc = $id('kd-gps-follow'); if (fc) fc.addEventListener('change', e => { follow = e.target.checked; });
  // 사용자가 지도를 손으로 움직이면 따라가기 해제 (지도가 자꾸 되돌아가는 것 방지)
  const unfollow = () => { if (follow && watchId != null) { follow = false; if (fc) fc.checked = false; showToast('지도 따라가기를 껐어요 (체크하면 다시 켜져요)'); } };
  setTimeout(() => { try { if (lmap) lmap.on('dragstart', unfollow); } catch (e) {} }, 3000);

  window.__kdDrawMini = drawSrMini;
  window.__kd = window.__kd || {}; window.__kd.gps = () => gps; window.__kd.srRuns = () => srRuns; window.__kd.srByIdx = () => srByIdx;
  renderSrList();
})();
