/* ================= ✈️ 브리핑 보조 v3 =================
   ① 비행 중 할 일 타임라인 (시간 제한 공역·보고/요청 코멘트·FIR 진입·SR·TOC/TOD + 직접 추가) · 위치 기반 알림
   ② 연료 요약·판단 보조 (FOD, 최소 착륙연료, holding 여유, 실제 FOB 반영, 통계)
   ③ 가장 가까운 공항 (현재 위치 기준)
   ④ TAF 한국어 풀이 (ETD/ETA 기준, TEMPO/BECMG 경고)
   ⑤ 고도별 바람 힌트 (상층풍 테이블)
   ⑥ 브리핑 요약 복사·인쇄
   모든 계산은 기기 안에서. 참고용 — 판단은 OFP 원문·회사 절차 기준. */
(function () {
  'use strict';
  const K = window.__kd = window.__kd || {};
  const $id = id => document.getElementById(id);
  const pad2 = n => String(n).padStart(2, '0');
  const hm = m => m == null || isNaN(m) ? '--' : `${Math.floor(m / 60)}:${pad2(Math.round(m) % 60)}`;
  const hhmmZ = ms => ms == null ? '--' : new Date(ms).toISOString().slice(11, 16) + 'Z';
  const kst = ms => { const k = new Date(ms + 9 * 3600e3); return `${pad2(k.getUTCHours())}:${pad2(k.getUTCMinutes())}`; };
  const wrap180 = d => ((d + 540) % 360) - 180;
  const fmtN = n => n == null || isNaN(n) ? '--' : Math.round(n).toLocaleString();
  const ofp = () => String(window.__ofpText || '');
  const nav = () => (typeof pdfNav !== 'undefined' && pdfNav) || [];
  const R = () => (typeof routeCoordinates !== 'undefined' && routeCoordinates) || [];
  const tok = i => (typeof routeTokens !== 'undefined' && routeTokens[i]) || '';
  const el = i => { try { return elAt(i); } catch (e) { return null; } };
  const flightKey = () => { try { return info && info.dep ? `${info.dep}-${info.dest}-${info.flightDate}` : ''; } catch (e) { return ''; } };
  function bearing(a, b) {
    const r = Math.PI / 180, f1 = a[0] * r, f2 = b[0] * r, dl = (b[1] - a[1]) * r;
    const y = Math.sin(dl) * Math.cos(f2), x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
    return (Math.atan2(y, x) / r + 360) % 360;
  }

  // ---------- 스타일 ----------
  const css = `
  .kp-sec{display:flex;flex-direction:column;gap:12px}
  .kp-panel{border:1px solid #334155;background:rgba(2,6,23,.6);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:8px;font-size:12.5px;color:#e2e8f0;line-height:1.55}
  .kp-panel h3{font-size:13px;font-weight:800;color:#f1f5f9;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
  .kp-chip{display:inline-block;font-size:11px;border-radius:6px;padding:1px 7px;border:1px solid #475569;background:#0f172a;color:#cbd5e1}
  .kp-btn{font-size:12px;font-weight:700;padding:7px 12px;border-radius:10px;border:1px solid #0e7490;background:#0e7490;color:#fff;cursor:pointer;-webkit-tap-highlight-color:transparent}
  .kp-btn.off{background:#1e293b;border-color:#475569;color:#cbd5e1}
  .kp-dim{color:#94a3b8;font-size:11px}
  .kp-tl{display:flex;flex-direction:column;gap:4px}
  .kp-item{display:grid;grid-template-columns:52px 1fr auto;gap:8px;align-items:start;border:1px solid #1e293b;background:#020617;border-radius:10px;padding:6px 10px}
  .kp-item.past{opacity:.45}
  .kp-item.next{border-color:#22d3ee;background:rgba(8,51,68,.5);box-shadow:0 0 0 1px rgba(34,211,238,.35)}
  .kp-item.alert{border-color:#f43f5e}
  .kp-item .t{font-family:ui-monospace,Menlo,monospace;font-weight:800;color:#67e8f9;font-size:13px}
  .kp-item .t small{display:block;color:#94a3b8;font-weight:400;font-size:10px}
  .kp-item .ti{font-weight:700;color:#f8fafc}
  .kp-item .su{font-size:11px;color:#cbd5e1;margin-top:1px;word-break:break-word}
  .kp-item .x{color:#fda4af;cursor:pointer;padding:0 4px}
  .kp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:6px}
  .kp-grid div{background:#0f172a;border:1px solid #1e293b;border-radius:8px;padding:5px 9px}
  .kp-grid span{display:block;font-size:10px;color:#94a3b8}
  .kp-grid b{font-family:ui-monospace,Menlo,monospace;font-size:15px;color:#f8fafc}
  .kp-grid .hi b{color:#6ee7b7}.kp-grid .warn b{color:#fbbf24}.kp-grid .bad b{color:#fb7185}
  .kp-in{background:#0f172a;border:1px solid #334155;border-radius:8px;padding:6px 8px;color:#f8fafc;font-family:ui-monospace,Menlo,monospace;font-size:14px;width:120px}
  select.kp-in{width:auto;font-family:inherit;font-size:12px}
  .kp-table{width:100%;border-collapse:collapse;font-size:12px}
  .kp-table td,.kp-table th{padding:4px 6px;border-bottom:1px solid #1e293b;text-align:left;white-space:nowrap}
  .kp-table th{color:#94a3b8;font-weight:600;font-size:11px}
  .kp-table tr.click{cursor:pointer}.kp-table tr.click:hover td{background:#0f172a}
  .kp-wx{border:1px solid #1e293b;background:#020617;border-radius:10px;padding:8px 10px}
  .kp-wx .h{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-weight:800}
  .kp-note{margin-top:4px;padding:4px 8px;border-radius:8px;font-size:12px;background:rgba(51,65,85,.35);border:1px solid #334155}
  .kp-note.red{background:rgba(225,29,72,.18);border-color:rgba(244,63,94,.5)}
  .kp-note.amb{background:rgba(217,119,6,.15);border-color:rgba(245,158,11,.45)}
  .kp-warn{font-size:12px;border-radius:8px;padding:6px 10px;background:rgba(217,119,6,.15);border:1px solid rgba(245,158,11,.45);color:#fde68a}
  .kp-ok{font-size:12px;border-radius:8px;padding:6px 10px;background:rgba(6,95,70,.25);border:1px solid rgba(16,185,129,.45);color:#a7f3d0}
  #kp-banner{position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:3000;max-width:92vw;background:#7c2d12;color:#fff;border:2px solid #fb923c;border-radius:14px;padding:10px 14px;box-shadow:0 8px 30px rgba(0,0,0,.6);display:none;gap:10px;align-items:center;font-size:14px;font-weight:700}
  #kp-banner button{background:#fff;color:#7c2d12;border:0;border-radius:8px;padding:6px 10px;font-weight:800}
  .kp-pin{background:#0e7490;color:#fff;border:2px solid #fff;border-radius:999px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px #000}
  #kp-print{display:none}
  @media print{ body>*{display:none!important} body>#kp-print{display:block!important;color:#000;background:#fff;font:12px/1.5 -apple-system,system-ui,sans-serif;padding:10mm} #kp-print h1{font-size:18px;margin:0 0 6px} #kp-print h2{font-size:14px;margin:12px 0 4px;border-bottom:1px solid #000;padding-bottom:2px} #kp-print table{border-collapse:collapse;width:100%} #kp-print td,#kp-print th{border:1px solid #999;padding:2px 5px;text-align:left;font-size:11px} #kp-print .dim{color:#555;font-size:10px} }
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // ---------- 섹션 ----------
  const sec2 = [...document.querySelectorAll('main section')].find(sc => { const h = sc.querySelector('h2'); return h && h.textContent.trim().startsWith('2.'); });
  const sec = document.createElement('section');
  sec.className = 'bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3';
  sec.innerHTML = `
    <div class="flex items-center justify-between flex-wrap gap-2">
      <h2 class="font-bold text-sm flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-cyan-300"></span>✈️ 브리핑 보조 <span class="kp-chip">v3</span></h2>
      <div class="flex items-center gap-2 flex-wrap">
        <button id="kp-copy" class="kp-btn off">📋 요약 복사</button>
        <button id="kp-print-btn" class="kp-btn off">🖨️ 인쇄·PDF</button>
      </div>
    </div>
    <details class="kd-guide kind" open><summary>이 칸은 뭐예요?</summary><ul>
      <li><b>현재 위치</b>: 실시간 위치(📍)가 들어오면 자동이에요. 없으면 아래에서 <b>방금 지난 웨이포인트</b>를 골라두면 나머지 계산이 거기 기준으로 돼요.</li>
      <li><b>✅ 할 일 타임라인</b>: OFP 공지·노탐 코멘트에서 "보고·요청·교신" 문장을 찾아 <b>어느 지점에서 해야 하는지</b> 순서대로 보여줘요. 경로와 겹치는 유효 노탐, FIR 진입, SR 구간, TOC/TOD도 같이 들어가요. 직접 메모도 추가할 수 있어요. 실시간 위치가 있으면 <b>50NM 전에 소리와 배너</b>로 알려줘요.</li>
      <li><b>⛽ 연료</b>: 계획 FOD, 최소 착륙연료(교체+최종예비), 목적지에서 <b>몇 분 holding 가능한지</b>를 계산해요. 실제 RAMP 연료나 현재 FOB를 넣으면 다시 계산돼요.</li>
      <li><b>🛬 가까운 공항</b>: 현재 위치에서 가까운 ERA·교체·B042 공항과 거리·방위·예상 시간이에요.</li>
      <li><b>🌤️ TAF 풀이</b>: 출발·도착·교체 공항 TAF를 <b>내 시각 기준</b>으로 한국어로 풀어요. TEMPO/BECMG가 걸리면 색으로 표시해요.</li>
      <li><b>🌬️ 고도별 바람</b>: OFP 상층풍 표에서 계획 고도보다 <b>바람이 유리한 고도</b>를 찾아줘요. 바람만 본 거라 연료 흐름 차이는 반영 안 돼요.</li>
    </ul></details>
    <div class="kp-panel">
      <h3>📍 현재 위치 기준 <span id="kp-pos-src" class="kp-chip">위치 없음</span></h3>
      <div class="flex items-center gap-2 flex-wrap"><span class="kp-dim">방금 지난 웨이포인트(수동):</span><select id="kp-manual" class="kp-in"><option value="">선택 안 함</option></select><span id="kp-pos-info" class="kp-dim"></span></div>
    </div>
    <div class="kp-panel">
      <h3>✅ 비행 중 할 일 타임라인 <span id="kp-tl-count" class="kp-chip"></span></h3>
      <div id="kp-tl" class="kp-tl"><div class="kp-dim">OFP PDF를 첨부하면 표시돼요.</div></div>
      <div class="flex items-center gap-2 flex-wrap" style="margin-top:4px">
        <select id="kp-add-fix" class="kp-in"><option value="">지점 선택</option></select>
        <input id="kp-add-note" class="kp-in" style="width:220px;font-family:inherit;font-size:12px" placeholder="메모 (예: 기장 — 여기서 회사 연락)">
        <button id="kp-add" class="kp-btn">📝 추가</button>
        <label class="kp-dim" style="display:flex;align-items:center;gap:4px"><input id="kp-sound" type="checkbox" checked style="width:16px;height:16px"> 알림음</label>
      </div>
    </div>
    <div class="kp-panel">
      <h3>⛽ 연료 요약 · 판단 보조 <span id="kp-fuel-unit" class="kp-chip"></span></h3>
      <div id="kp-fuel"><div class="kp-dim">OFP PDF를 첨부하면 표시돼요.</div></div>
    </div>
    <div class="kp-panel">
      <h3>🛬 가까운 공항 <span class="kp-chip">현재 위치 기준</span></h3>
      <div id="kp-near"><div class="kp-dim">현재 위치가 있어야 계산돼요. (실시간 위치 또는 위 수동 선택)</div></div>
    </div>
    <div class="kp-panel">
      <h3>🌤️ TAF 한국어 풀이 <span class="kp-chip">ETD·ETA 기준 ±1시간</span></h3>
      <div id="kp-taf" class="flex flex-col gap-2"><div class="kp-dim">OFP PDF를 첨부하면 표시돼요.</div></div>
    </div>
    <div class="kp-panel">
      <h3>🌬️ 고도별 바람 힌트 <span class="kp-chip">바람만 기준 · 참고용</span></h3>
      <div id="kp-wind"><div class="kp-dim">OFP PDF를 첨부하면 표시돼요.</div></div>
    </div>`;
  if (sec2) sec2.after(sec);
  const banner = document.createElement('div'); banner.id = 'kp-banner'; banner.innerHTML = '<span id="kp-banner-txt"></span><button id="kp-banner-ok">확인</button>'; document.body.appendChild(banner);
  const printBox = document.createElement('div'); printBox.id = 'kp-print'; document.body.appendChild(printBox);

  // ---------- 현재 위치 ----------
  let manualIdx = null;
  function curPos() {
    const g = K.gps && K.gps();
    if (g) return { ll: [g.lat, g.lon], src: 'gps', spd: g.spd, g };
    if (manualIdx != null && R()[manualIdx]) return { ll: R()[manualIdx], src: 'manual', spd: null };
    return null;
  }
  function nearestIdx(ll) {
    const Rr = R(); let bi = -1, bd = 1e9;
    Rr.forEach((p, i) => { const d = gcDistNm(ll, p); if (d < bd) { bd = d; bi = i; } });
    return { i: bi, d: bd };
  }
  function curIdx() {
    const p = curPos(); if (!p) return null;
    if (p.src === 'manual') return { i: manualIdx, d: 0, p };
    const n = nearestIdx(p.ll);
    // 가장 가까운 점 다음 점이 더 가까운 '진행 방향'이면 그 사이로 간주: 지난 지점 = i
    const Rr = R(); let i = n.i;
    if (i < Rr.length - 1 && i > 0) { const dn = gcDistNm(p.ll, Rr[i + 1]), dp = gcDistNm(p.ll, Rr[i - 1]); if (dn < dp && gcDistNm(Rr[i], Rr[i + 1]) > n.d) { /* i는 지난 점 */ } else if (dp < dn) i = i - 1; }
    return { i, d: n.d, p };
  }
  function fillSelects() {
    const names = R().map((_, i) => tok(i));
    [['kp-manual', '선택 안 함'], ['kp-add-fix', '지점 선택']].forEach(([id, ph]) => {
      const s = $id(id); const v = s.value;
      s.innerHTML = `<option value="">${ph}</option>` + names.map((n, i) => `<option value="${i}">${esc(n)}${el(i) != null ? ' (+' + hm(el(i)) + ')' : ''}</option>`).join('');
      if (v && names[+v]) s.value = v;
    });
  }
  $id('kp-manual').addEventListener('change', e => { manualIdx = e.target.value === '' ? null : +e.target.value; refreshPos(); });

  // ---------- ① 타임라인 ----------
  const VERB = { REPORT: '보고', REQUEST: '요청', CONTACT: '교신', ADVISE: '통보', CALL: '호출', SQUAWK: '스쿽', MONITOR: '청취', EXPECT: '예상', AVOID: '회피', CHECK: '확인', OBTAIN: '획득', CONFIRM: '확인', MAINTAIN: '유지', TRANSFER: '이양', SWITCH: '전환' };
  const VERB_RX = new RegExp('\\b(' + Object.keys(VERB).join('|') + ')(?:ED|S|ING)?\\b');
  const STOP = new Set(['TOC', 'TOD', 'FIR', 'AND', 'THE', 'FOR', 'ATC', 'ACC', 'VIA', 'ALL', 'ANY', 'DUE', 'NOT', 'OUT', 'ARE', 'PER', 'MAX', 'MIN', 'NEW', 'SET', 'USE', 'ONE', 'TWO', 'SID', 'ARR', 'DEP', 'RWY', 'TWY', 'ILS', 'VOR', 'DME', 'NDB', 'GPS', 'FPL', 'ETA', 'ETD', 'ETO', 'UTC', 'ACT', 'NIL', 'REF', 'TIL', 'PLZ', 'MHZ', 'KHZ', 'WPT', 'DCT', 'AWY', 'ATS', 'ACFT', 'FLT', 'COM', 'NAV', 'APP', 'TWR', 'GND', 'SFC', 'UNL', 'AMSL', 'AGL', 'FT', 'NM', 'KT', 'HR', 'HRS', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']);
  function routeFixRx() {
    const names = [...new Set(nav().map(w => w.name).filter(n => /^[A-Z]{3,5}$/.test(n) && !STOP.has(n)))];
    return names.length ? new RegExp('(?<![A-Z0-9])(' + names.sort((a, b) => b.length - a.length).join('|') + ')(?![A-Z0-9])') : null;
  }
  function extractActions() {
    const rx = routeFixRx(); if (!rx) return [];
    const t = ofp(); const srcs = [];
    const a = t.indexOf('FLIGHT SPECIAL NOTICE'); if (a >= 0) { const b = t.indexOf('MEL / CDL', a); srcs.push({ src: 'OFP 공지', text: t.slice(a, b > a ? b : a + 6000) }); }
    const seen = new Set();
    const all = [].concat(typeof firNotams !== 'undefined' ? firNotams : [], typeof otherNotams !== 'undefined' ? otherNotams : [], typeof package1AirportNotams !== 'undefined' ? package1AirportNotams : [], typeof package2AirportNotams !== 'undefined' ? package2AirportNotams : [], typeof package2AreaNotams !== 'undefined' ? package2AreaNotams : []);
    all.forEach(n => { if (!n || !n.rawText) return; const k = n.notamId + '|' + String(n.rawText).slice(0, 60); if (seen.has(k)) return; seen.add(k); srcs.push({ src: n.notamId, text: n.rawText, n }); });
    const out = [], dedupe = new Set(); skippedDir = 0;
    srcs.forEach(s => {
      const norm = String(s.text).toUpperCase().replace(/\s+/g, ' ');
      // 동행/서행 전용 문장이 오늘 진행 방향과 다르면 할 일에서 뺀다 (문장 → 원문 전체 순으로 판정)
      let srcDir = null; try { srcDir = K.dirCheck ? K.dirCheck(norm) : null; } catch (e) {}
      norm.split(/(?<=\.)\s+(?=[A-Z(*-])|\s*\/\/\s*|COMMENT\)\s*|\s\*\s/).forEach(sent => {
        sent = sent.trim(); if (sent.length < 12) return;
        const vm = sent.match(VERB_RX); if (!vm) return;
        const fm = sent.match(rx); if (!fm) return;
        let dc = null; try { dc = K.dirCheck ? (K.dirCheck(sent) || srcDir) : null; } catch (e) {}
        if (dc && !dc.match) { skippedDir++; return; }
        const fix = fm[1]; const i = nav().findIndex(w => w.name === fix); if (i < 0) return;
        const key = fix + '|' + sent.slice(0, 50); if (dedupe.has(key)) return; dedupe.add(key);
        out.push({ i, fix, ko: VERB[vm[1]] || vm[1], text: sent.length > 200 ? sent.slice(0, 200) + '…' : sent, src: s.src, n: s.n });
      });
    });
    return out.slice(0, 30);
  }
  let manual = [];
  try { const o = JSON.parse(localStorage.getItem('kpManual') || '{}'); if (o && o.k === flightKey()) manual = o.r || []; } catch (e) {}
  const saveManual = () => { try { localStorage.setItem('kpManual', JSON.stringify({ k: flightKey(), r: manual })); } catch (e) {} };
  let items = [], alerted = new Set(), skippedDir = 0;
  function buildTimeline() {
    const N = nav(); items = [];
    if (!N.length) return;
    N.forEach((w, i) => {
      if (w.name === 'TOC') items.push({ i, icon: '⬆️', kind: 'info', title: 'TOC · 순항고도 도달', sub: typeof w.fl === 'number' ? 'FL' + w.fl : '' });
      if (w.name === 'TOD') items.push({ i, icon: '⬇️', kind: 'info', title: 'TOD · 강하 시작', sub: '도착 브리핑·ATIS 확인' });
      if (w.fir && i > 0) { let nm = ''; try { nm = FIR_NAMES[w.fir] || ''; } catch (e) {} items.push({ i, icon: '🛂', kind: 'fir', title: `${w.fir} FIR 진입${nm ? ' (' + nm + ')' : ''}`, sub: '주파수·위치보고 요건 확인' }); }
    });
    (K.srRuns ? K.srRuns() : []).forEach(r => items.push({ i: r.s, icon: '🌪️', kind: 'warn', title: `SR ${r.max} 구간 시작 (${r.t0 != null && r.t1 != null ? (r.t1 - r.t0) + '분간' : ''})`, sub: `${tok(r.s)} → ${tok(r.i1)} · 벨트 사인·서비스 타이밍 고려` }));
    try { (visibleFir || []).filter(r => r.level === 'direct' && r.inTime && r.hit).forEach(r => items.push({ i: r.hit.lo, icon: '🔴', kind: 'alert', title: `${r.n.notamId} · ${K.headline ? K.headline(r.n) : ''}`, sub: `경로 교차 · 통과시각 유효 · ${r.n.limits || ''}${r.passTxt ? ' · 통과 ' + r.passTxt : ''}`, n: r.n })); } catch (e) {}
    extractActions().forEach(a => items.push({ i: a.i, icon: '📌', kind: 'action', title: `${a.fix} — ${a.ko}`, sub: a.text, src: a.src, n: a.n }));
    manual.forEach(m => items.push({ i: m.i, icon: '📝', kind: 'manual', title: `${tok(m.i)} — ${m.note}`, sub: '직접 추가', id: m.id }));
    items.forEach(it => { it.el = el(it.i); });
    items.sort((a, b) => (a.i - b.i) || (a.el ?? 1e9) - (b.el ?? 1e9));
  }
  function renderTimeline() {
    const box = $id('kp-tl'); const ci = curIdx();
    $id('kp-tl-count').textContent = items.length ? `${items.length}건` : '';
    if (!nav().length) { box.innerHTML = '<div class="kp-dim">OFP PDF를 첨부하면 표시돼요.</div>'; return; }
    const skipNote = skippedDir ? `<div class="kp-dim" style="margin-bottom:4px">🧭 반대 방향(동행/서행 등) 편 전용 문장 ${skippedDir}건은 할 일에서 뺐어요. 노탐 카드에서는 회색 안내로 볼 수 있어요.</div>` : '';
    if (!items.length) { box.innerHTML = skipNote + '<div class="kp-ok">찾은 할 일이 없어요. 아래에서 직접 추가할 수 있어요.</div>'; return; }
    let nextMarked = false;
    box.innerHTML = skipNote + items.map((it, k) => {
      let cls = ''; let distTxt = '';
      if (ci) {
        if (it.i <= ci.i) cls = 'past';
        else if (!nextMarked) { cls = 'next'; nextMarked = true; }
        if (ci.p.src === 'gps' && R()[it.i]) { const d = gcDistNm(ci.p.ll, R()[it.i]); distTxt = `${Math.round(d)}NM`; if (ci.p.spd > 50) distTxt += ` · ${Math.round(d / ci.p.spd * 60)}분`; }
        else if (ci.p.src === 'manual' && it.el != null && el(ci.i) != null && it.i > ci.i) distTxt = `약 ${it.el - el(ci.i)}분 후`;
      }
      if (it.kind === 'alert') cls += ' alert';
      const w = (() => { try { return flightWindow(); } catch (e) { return null; } })();
      const clock = w && it.el != null ? `${hhmmZ(w.etd + it.el * 6e4)}` : '';
      return `<div class="kp-item ${cls}" data-k="${k}">
        <div class="t">+${hm(it.el)}<small>${clock}${distTxt ? '<br>' + distTxt : ''}</small></div>
        <div><div class="ti">${it.icon} ${esc(it.title)}</div>${it.sub ? `<div class="su">${esc(it.sub)}${it.src ? ` <span class="kp-chip">${esc(it.src)}</span>` : ''}</div>` : ''}</div>
        <div>${it.kind === 'manual' ? `<span class="x" data-del="${it.id}">✕</span>` : `<span class="kp-dim">${esc(tok(it.i))}</span>`}</div>
      </div>`;
    }).join('');
    drawPins();
  }
  let pinLayer = null;
  function drawPins() {
    if (typeof lmap === 'undefined' || !lmap || !window.L) return;
    if (!pinLayer) pinLayer = L.layerGroup().addTo(lmap);
    pinLayer.clearLayers();
    const Rr = R(); const byI = {};
    items.filter(it => ['action', 'manual'].includes(it.kind)).forEach(it => { (byI[it.i] = byI[it.i] || []).push(it); });
    Object.keys(byI).forEach(i => { const p = Rr[+i]; if (!p) return; const its = byI[i];
      L.marker(p, { zIndexOffset: 900, icon: L.divIcon({ className: '', iconSize: [26, 26], iconAnchor: [13, 26], html: `<div class="kp-pin">${its.length > 1 ? its.length : '📌'}</div>` }) })
        .bindPopup(`<b>${esc(tok(+i))}</b><div style="font-size:11px;margin-top:4px">${its.map(it => `• ${esc(it.title)}<br><span style="color:#475569">${esc(it.sub || '')}</span>`).join('<br>')}</div>`, { maxWidth: 320 }).addTo(pinLayer);
    });
  }
  $id('kp-add').addEventListener('click', () => {
    const i = $id('kp-add-fix').value, note = $id('kp-add-note').value.trim();
    if (i === '' || !note) { showToast('지점과 메모를 입력하세요'); return; }
    manual.push({ id: Date.now(), i: +i, note }); saveManual(); $id('kp-add-note').value = '';
    buildTimeline(); renderTimeline();
  });
  $id('kp-tl').addEventListener('click', e => {
    const d = e.target.closest('[data-del]'); if (d) { manual = manual.filter(m => String(m.id) !== d.dataset.del); saveManual(); buildTimeline(); renderTimeline(); return; }
    const row = e.target.closest('[data-k]'); if (!row) return;
    const it = items[+row.dataset.k]; const p = R()[it.i]; if (!p || typeof lmap === 'undefined' || !lmap) return;
    $id('map').scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => lmap.flyTo(p, Math.max(lmap.getZoom(), 6), { duration: 0.8 }), 300);
  });
  // 알림음·배너
  let actx = null;
  document.addEventListener('pointerdown', () => { try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); actx.resume && actx.resume(); } catch (e) {} }, { capture: true });
  function beep() {
    if (!actx || !$id('kp-sound').checked) return;
    try { const t = actx.currentTime; [0, 0.35, 0.7].forEach(o => { const osc = actx.createOscillator(), g = actx.createGain(); osc.frequency.value = 880; g.gain.setValueAtTime(0.0001, t + o); g.gain.exponentialRampToValueAtTime(0.4, t + o + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + o + 0.28); osc.connect(g).connect(actx.destination); osc.start(t + o); osc.stop(t + o + 0.3); }); } catch (e) {}
  }
  function showBanner(txt) { $id('kp-banner-txt').textContent = txt; banner.style.display = 'flex'; }
  $id('kp-banner-ok').addEventListener('click', () => { banner.style.display = 'none'; });
  function checkAlerts() {
    const p = curPos(); if (!p || p.src !== 'gps') return;
    const Rr = R(); const ci = curIdx(); if (!ci) return;
    items.forEach((it, k) => {
      if (!['action', 'manual', 'alert', 'warn'].includes(it.kind) || it.i <= ci.i || alerted.has(k + '|' + it.title)) return;
      const d = gcDistNm(p.ll, Rr[it.i]); if (d > 50) return;
      alerted.add(k + '|' + it.title); beep(); showBanner(`${it.icon} ${Math.round(d)}NM 전 · ${it.title}`); showToast(`${it.icon} ${it.title}`);
    });
  }

  // ---------- ② 연료 ----------
  let fuel = null, cumBurn = [];
  function parseFuel() {
    const t = ofp(); if (!t) return null;
    const u = (typeof pdfFlt !== 'undefined' && pdfFlt && pdfFlt.unit) || (t.match(/\b(100LBS|100KGS|KGS|LBS)\b/) || [])[1] || '';
    const mult = /^100/.test(u) ? 100 : 1, unit = u.replace(/^100/, '').replace(/KGS?$/, 'KG') || '';
    const f = { unit, mult, rows: {} };
    const rx = /^[ \t]*(TRIP|RESERVE|ALTN\/([A-Z]{4})|FINAL RES|(\d+) PCT CONT|CONT|REFILE RES|RQD TAKEOFF|DISC|EXTRA|ADDITIONAL|TANKERING|PLN TAKEOFF|TAXI|RAMP OUT|FOD)[ \t]+(\d{3,5})(?:[ \t]+(\d{2})\.(\d{2}))?/gm;
    let m; while ((m = rx.exec(t))) { let key = m[1].replace(/^ALTN\/.*/, 'ALTN').replace(/^\d+ PCT CONT$/, 'CONT'); if (f.rows[key]) continue; f.rows[key] = { fuel: +m[4] * mult, min: m[5] != null ? +m[5] * 60 + +m[6] : null, raw: m[1] }; if (m[2]) f.altn = m[2]; if (m[3]) f.contPct = +m[3]; }
    if (!f.rows.TRIP) return null;
    const sm = t.match(/MEAN\/\s*(-?[\d,]+)\s*LBS,\s*90% STAT\/\s*(-?[\d,]+)\s*LBS,\s*99% STAT\/\s*(-?[\d,]+)/);
    if (sm) f.stat = { mean: +sm[1].replace(/,/g, ''), p90: +sm[2].replace(/,/g, ''), p99: +sm[3].replace(/,/g, ''), unit: 'LBS' };
    const vm = t.match(/PLAN VALID FOR DEPARTURE UNTIL\s+(\d{4})Z/); if (vm) f.validUntil = vm[1];
    const fr = f.rows['FINAL RES'];
    f.holdRate = fr && fr.min ? fr.fuel / fr.min : (f.rows.TRIP.min ? f.rows.TRIP.fuel / f.rows.TRIP.min * 0.85 : null);   // 분당
    // 웨이포인트별 누적 연료 (항법로그 두번째 줄: ... 00.11 0029/)
    const N = nav(); cumBurn = N.map(() => null); let j = 0;
    const lr = /^[ \t]*([A-Z0-9]{2,8})[ \t]+[EW][ \t]?\d{2,3}[ \t]\d{1,2}\.\d\b.*?(\d{2})\.(\d{2})[ \t]+(\d{3,5})\/[ \t]*$/gm;
    while ((m = lr.exec(t)) && j < N.length) { for (let k = j; k < Math.min(N.length, j + 3); k++) if (N[k].name === m[1]) { cumBurn[k] = +m[4] * mult; j = k + 1; break; } }
    return f;
  }
  const fuelInputs = { ramp: null, fob: null };
  function renderFuel() {
    const box = $id('kp-fuel'); fuel = parseFuel();
    if (!fuel) { box.innerHTML = '<div class="kp-dim">연료 표를 찾지 못했어요. OFP 첫 장의 FUEL 표 형식이 다를 수 있어요.</div>'; $id('kp-fuel-unit').textContent = ''; return; }
    const r = fuel.rows, U = fuel.unit; $id('kp-fuel-unit').textContent = U;
    const g = k => r[k] ? r[k].fuel : 0;
    const minLand = g('ALTN') + g('FINAL RES');
    const fodPlan = r.FOD ? r.FOD.fuel : (g('RAMP OUT') || g('PLN TAKEOFF')) - g('TAXI') - g('TRIP');
    const rate = fuel.holdRate;
    const holdMin = f => rate ? Math.max(0, Math.round((f - minLand) / rate)) : null;
    const holdCommit = f => rate ? Math.max(0, Math.round((f - g('FINAL RES')) / rate)) : null;
    const ci = curIdx();
    let fodNow = null, remain = null, basis = '';
    if (fuelInputs.fob != null && ci && r.TRIP) {
      const cb = cumBurn[ci.i];
      remain = cb != null ? Math.max(0, g('TRIP') - cb) : (r.TRIP.min && el(ci.i) != null ? Math.max(0, g('TRIP') * (1 - el(ci.i) / r.TRIP.min)) : null);
      if (remain != null) { fodNow = fuelInputs.fob - remain; basis = `${tok(ci.i)} 기준 남은 계획 소모 ${fmtN(remain)}`; }
    }
    const fodRamp = fuelInputs.ramp != null && (g('RAMP OUT') || g('PLN TAKEOFF')) ? fodPlan + (fuelInputs.ramp - (g('RAMP OUT') || g('PLN TAKEOFF'))) : null;
    const tile = (lbl, val, sub, cls = '') => `<div class="${cls}"><span>${lbl}</span><b>${val}</b>${sub ? `<span>${sub}</span>` : ''}</div>`;
    const hCls = m => m == null ? '' : m >= 30 ? 'hi' : m >= 15 ? 'warn' : 'bad';
    // 계산 결과(그리드·통계·입력 옆 결과)만 갱신하고, 입력칸 자체는 한 번만 만든다.
    // 전체를 innerHTML로 다시 그리면 위치 갱신 때마다 입력칸이 새 요소로 바뀌어
    // 포커스가 날아가고 (iPad에서) 키보드가 닫히는 문제가 생긴다.
    // REQ(RQD TAKEOFF) = 트립+예비+교체+최종예비: 이 이하로는 이륙하면 안 되는 최소 이륙연료
    const rqd = g('RQD TAKEOFF'), plnTO = g('PLN TAKEOFF') || ((g('RAMP OUT') || 0) - g('TAXI'));
    const rqdMargin = rqd && plnTO ? plnTO - rqd : null;
    const rampTO = fuelInputs.ramp != null ? fuelInputs.ramp - g('TAXI') : null;   // 실제 RAMP 기준 이륙연료
    const calcHtml = `
      <div class="kp-grid">
        ${rqd ? tile('REQ 이륙연료 (RQD T/O)', fmtN(rqd) + ' ' + U, rqdMargin != null ? `계획 T/O ${fmtN(plnTO)} · 여유 ${fmtN(rqdMargin)}${r['RQD TAKEOFF'].min ? ' · ' + hm(r['RQD TAKEOFF'].min) : ''}` : '', rqdMargin != null && rqdMargin <= 0 ? 'bad' : '') : ''}
        ${tile('계획 FOD (도착 잔량)', fmtN(fodPlan) + ' ' + U, r.FOD && r.FOD.min != null ? '여유 ' + hm(r.FOD.min) : '')}
        ${tile('최소 착륙연료', fmtN(minLand) + ' ' + U, `교체 ${fmtN(g('ALTN'))} + 최종예비 ${fmtN(g('FINAL RES'))}`)}
        ${tile('목적지 holding 여유', holdMin(fodPlan) != null ? holdMin(fodPlan) + '분' : '--', '교체공항 유지 시', hCls(holdMin(fodPlan)))}
        ${tile('교체 포기 시 holding', holdCommit(fodPlan) != null ? holdCommit(fodPlan) + '분' : '--', '최종예비만 남길 때', hCls(holdCommit(fodPlan)))}
      </div>
      <div class="kp-dim">holding 소모율 ${rate ? fmtN(rate * 60) + ' ' + U + '/h' : '--'} (FINAL RES 기준) · 예비 ${fmtN(g('CONT'))}${fuel.contPct ? ' (' + fuel.contPct + '%)' : ''} · 재량 ${fmtN(g('DISC') || g('EXTRA'))} · 택시 ${fmtN(g('TAXI'))} · RAMP ${fmtN(g('RAMP OUT') || g('PLN TAKEOFF'))}${fuel.validUntil ? ' · 플랜 유효 ' + fuel.validUntil.slice(0, 2) + ':' + fuel.validUntil.slice(2) + 'Z 출발까지' : ''}</div>
      ${fuel.stat ? `<div class="kp-note ${fuel.stat.p90 > g('DISC') ? 'amb' : ''}">📊 이 노선 3개월 통계: 실제가 계획보다 평균 <b>${fmtN(fuel.stat.mean)}</b>, 90% 확률로 <b>${fmtN(fuel.stat.p90)}</b> 이내, 99%는 <b>${fmtN(fuel.stat.p99)}</b> ${fuel.stat.unit} 더 탔어요. 90% 기준 FOD <b>${fmtN(fodPlan - fuel.stat.p90)}</b> → holding ${holdMin(fodPlan - fuel.stat.p90) ?? '--'}분${fuel.stat.p90 > g('DISC') ? ' · 재량연료보다 커요' : ''}</div>` : ''}`;
    const rampRes = fodRamp != null ? `→ 예상 FOD <b class="mono" style="color:#6ee7b7">${fmtN(fodRamp)}</b> · holding ${holdMin(fodRamp) ?? '--'}분${rqd && rampTO != null ? ` · <span class="kp-dim">REQ 대비</span> <b class="mono" style="color:${rampTO - rqd >= 0 ? '#6ee7b7' : '#fb7185'}">${rampTO - rqd >= 0 ? '+' : ''}${fmtN(rampTO - rqd)}</b>${rampTO - rqd < 0 ? ' <span style="color:#fb7185">⚠ 택시 후 REQ 미달</span>' : ''}` : ''}` : '';
    const fobRes = fodNow != null ? `→ 예상 FOD <b class="mono" style="color:${fodNow >= minLand ? '#6ee7b7' : '#fb7185'}">${fmtN(fodNow)}</b> · holding ${holdMin(fodNow) ?? '--'}분 <span class="kp-dim">(${basis})</span>` : (fuelInputs.fob != null ? '<span class="kp-dim">현재 위치를 먼저 정해 주세요 (실시간 위치 또는 수동 선택)</span>' : '');
    const num = v => { const n = parseFloat(String(v).replace(/,/g, '')); return isFinite(n) ? n : null; };
    if ($id('kp-ramp') && $id('kp-fob') && $id('kp-fuel-calc')) {
      $id('kp-fuel-calc').innerHTML = calcHtml;
      $id('kp-ramp').placeholder = fmtN(g('RAMP OUT') || g('PLN TAKEOFF'));
      $id('kp-fob').placeholder = U;
      $id('kp-ramp-res').innerHTML = rampRes;
      $id('kp-fob-res').innerHTML = fobRes;
      return;
    }
    box.innerHTML = `
      <div id="kp-fuel-calc">${calcHtml}</div>
      <div class="flex items-center gap-2 flex-wrap" style="margin-top:4px">
        <label class="kp-dim" for="kp-ramp">실제 RAMP 연료</label><input id="kp-ramp" class="kp-in" type="text" inputmode="numeric" enterkeyhint="done" autocomplete="off" placeholder="${fmtN(g('RAMP OUT') || g('PLN TAKEOFF'))}" value="${fuelInputs.ramp ?? ''}">
        <span id="kp-ramp-res">${rampRes}</span>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <label class="kp-dim" for="kp-fob">지금 FOB</label><input id="kp-fob" class="kp-in" type="text" inputmode="numeric" enterkeyhint="done" autocomplete="off" placeholder="${U}" value="${fuelInputs.fob ?? ''}">
        <span id="kp-fob-res">${fobRes}</span>
      </div>
      <div class="kp-dim">계산은 OFP 계획 소모량 기준이에요. 실제 바람·고도·ATC 지연은 반영되지 않으니 FMS 예측과 같이 보세요.</div>`;
    const bind = (id, key) => {
      const inp = $id(id);
      const apply = () => { const v = num(inp.value); if (v !== fuelInputs[key]) { fuelInputs[key] = v; renderFuel(); } };
      inp.addEventListener('change', apply);
      inp.addEventListener('blur', apply);
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { apply(); inp.blur(); } });
    };
    bind('kp-ramp', 'ramp'); bind('kp-fob', 'fob');
  }

  // ---------- ③ 가까운 공항 ----------
  function renderNear() {
    const box = $id('kp-near'); const p = curPos();
    if (!p) { box.innerHTML = '<div class="kp-dim">현재 위치가 있어야 계산돼요. (실시간 위치 또는 위 수동 선택)</div>'; return; }
    const cands = new Map(); const add = (c, role) => { if (!c) return; c = String(c).toUpperCase(); if (!cands.has(c)) cands.set(c, new Set()); cands.get(c).add(role); };
    try { add(info.dep, '출발'); add(info.dest, '목적'); add(info.altn, '교체'); (info.era || []).forEach(a => add(a, 'ERA')); } catch (e) {}
    try { Object.keys(B042 || {}).forEach(a => add(a, 'B042')); } catch (e) {}
    const rows = [];
    cands.forEach((roles, c) => { let ll = null; try { ll = getAirportCoord(c); } catch (e) {} if (!ll) return; const d = gcDistNm(p.ll, ll); rows.push({ c, roles: [...roles], d, brg: bearing(p.ll, ll), ll }); });
    rows.sort((a, b) => a.d - b.d);
    const top = rows.slice(0, 6); const gs = p.spd > 50 ? p.spd : 450;
    const nm = c => { try { const n = getAirportNameInfo(c); return n ? (n.ko || n.en || '') : ''; } catch (e) { return ''; } };
    box.innerHTML = `<div style="overflow-x:auto"><table class="kp-table"><tr><th>공항</th><th>거리</th><th>진방위</th><th>약 ${p.spd > 50 ? Math.round(p.spd) + 'kt' : '450kt'} 기준</th><th>구분</th></tr>` +
      top.map(r => `<tr class="click" data-ll="${r.ll[0]},${r.ll[1]}"><td><b>${r.c}</b> <span class="kp-dim">${esc(nm(r.c))}</span></td><td class="mono">${Math.round(r.d)} NM</td><td class="mono">${pad2(Math.round(r.brg)).padStart(3, '0')}°</td><td class="mono">${Math.round(r.d / gs * 60)}분</td><td>${r.roles.map(x => `<span class="kp-chip">${x}</span>`).join(' ')}</td></tr>`).join('') + '</table></div>' +
      `<div class="kp-dim">${p.src === 'gps' ? '실시간 위치 기준' : tok(manualIdx) + ' 웨이포인트 기준(수동)'} · B042는 운영기준 승인공항(기종 승인 여부는 ⑥ 지도 EDTO 메뉴에서 확인) · 활주로·기상·커퓨 등은 별도 확인</div>`;
    box.querySelectorAll('tr.click').forEach(tr => tr.addEventListener('click', () => { const [a, b] = tr.dataset.ll.split(',').map(Number); if (typeof lmap !== 'undefined' && lmap) { $id('map').scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => lmap.flyTo([a, b], 7, { duration: 0.8 }), 300); } }));
  }

  // ---------- ④ TAF 풀이 ----------
  const WXK = { RA: '비', SN: '눈', DZ: '이슬비', BR: '박무', FG: '안개', HZ: '연무', TS: '뇌우', GR: '우박', GS: '작은 우박', PL: '얼음싸라기', SG: '쌀알눈', IC: '빙정', UP: '강수(종류 미상)', DU: '먼지', SA: '모래', FU: '연기', VA: '화산재', SQ: '스콜', FC: '깔때기구름', PO: '먼지회오리', DS: '먼지폭풍', SS: '모래폭풍' };
  const WXD = { MI: '얕은', BC: '부분', PR: '일부', DR: '낮은 날림', BL: '높은 날림', SH: '소나기성', TS: '뇌우 동반', FZ: '어는' };
  function wxKo(code) {
    let s = code, out = [];
    if (s.startsWith('+')) { out.push('강한'); s = s.slice(1); } else if (s.startsWith('-')) { out.push('약한'); s = s.slice(1); }
    if (s.startsWith('VC')) { out.push('부근'); s = s.slice(2); }
    while (s.length >= 2) { const k = s.slice(0, 2); out.push(WXD[k] || WXK[k] || k); s = s.slice(2); }
    return out.join(' ');
  }
  const CLK = { FEW: '조금(1~2/8)', SCT: '드문드문(3~4/8)', BKN: '많음(5~7/8)', OVC: '흐림(8/8)', VV: '수직시정' };
  function cloudsKo(cl) { return (cl || []).map(c => { const m = c.match(/^(FEW|SCT|BKN|OVC|VV)(\d{3}|\/\/\/)(CB|TCU)?$/); if (!m) return c; return `${CLK[m[1]]} ${m[2] === '///' ? '' : (+m[2] * 100).toLocaleString() + 'ft'}${m[3] === 'CB' ? ' 적란운' : m[3] === 'TCU' ? ' 탑상적운' : ''}`; }).join(', ') || '구름 정보 없음'; }
  function ceilingOf(cl) { const v = (cl || []).filter(c => /^(BKN|OVC|VV)/.test(c)).map(c => +c.replace(/^(BKN|OVC|VV)/, '').slice(0, 3) * 100).filter(n => !isNaN(n)); return v.length ? Math.min(...v) : null; }
  function elKo(e) {
    const parts = [];
    if (e.wind) { const kt = e.wind.unit === 'MPS' ? Math.round(e.wind.spd * 1.944) : e.wind.spd; const gk = e.wind.gust ? (e.wind.unit === 'MPS' ? Math.round(e.wind.gust * 1.944) : e.wind.gust) : null; parts.push(`바람 ${e.wind.dir === 'VRB' ? '풍향 변동' : e.wind.dir + '°'} ${kt}kt${gk ? ' 돌풍 ' + gk + 'kt' : ''}${e.wind.unit === 'MPS' ? ` (${e.wind.spd}${e.wind.gust ? 'G' + e.wind.gust : ''}m/s)` : ''}`); }
    if (e.cavok) parts.push('CAVOK (시정 10km 이상, 5000ft 아래 구름 없음, 악기상 없음)');
    else { if (e.vis != null) parts.push(`시정 ${e.vis >= 9999 ? '10km 이상' : e.vis >= 1000 ? (e.vis / 1000).toFixed(1).replace(/\.0$/, '') + 'km' : e.vis + 'm'}`); if (e.wx && e.wx.length) parts.push('현상 ' + e.wx.map(wxKo).join(', ')); if (e.clouds) { parts.push('구름 ' + cloudsKo(e.clouds)); const c = ceilingOf(e.clouds); if (c != null) parts.push(`실링 ${c.toLocaleString()}ft`); } }
    return parts.join(' · ');
  }
  function renderTaf() {
    const box = $id('kp-taf'); let w = null; try { w = flightWindow(); } catch (e) {}
    if (!w || typeof pdfTaf === 'undefined' || !pdfTaf || !Object.keys(pdfTaf).length) { box.innerHTML = '<div class="kp-dim">OFP에서 TAF를 찾지 못했어요.</div>'; return; }
    let altnMin = null; try { altnMin = pdfFlt && pdfFlt.altnMin; } catch (e) {}
    const targets = [[info.dep, 'ETD', w.etd, '출발'], [info.dest, 'ETA', w.eta, '목적'], [info.altn, 'ETA+교체', altnMin != null ? w.eta + altnMin * 6e4 : w.eta, '교체']].filter(x => x[0] && pdfTaf[x[0]]);
    if (!targets.length) { box.innerHTML = '<div class="kp-dim">출발·목적·교체 공항 TAF가 OFP에 없어요.</div>'; return; }
    box.innerHTML = targets.map(([icao, lbl, T, role]) => {
      let r; try { r = tafAt(pdfTaf[icao], T); } catch (e) { return ''; }
      const cat = wxCat(r.st), haz = wxHazard(r.st);
      const catCls = cat === 'VFR' ? 'kp-ok' : cat === 'MVFR' ? 'kp-note' : 'kp-warn';
      const catKo = { VFR: '양호', MVFR: '보통', IFR: '나쁨', LIFR: '매우 나쁨' }[cat] || cat;
      const notes = (r.notes || []).map(g => {
        const gc = wxCat(g.el), gh = wxHazard(g.el); const bad = gc === 'IFR' || gc === 'LIFR' || gh;
        const lab = g.label.replace(/^TEMPO/, 'TEMPO(일시적)').replace(/^BECMG/, 'BECMG(점차 변화)').replace(/^PROB(\d{2})/, 'PROB$1($1% 확률)').replace(/^FM/, 'FM(이후)').replace(/(\d{2})(\d{2})\/(\d{2})(\d{2})$/, '$1일 $2Z~$3일 $4Z');
        return `<div class="kp-note ${bad ? 'red' : gc === 'MVFR' ? 'amb' : ''}">${bad ? '⚠️ ' : ''}<b>${esc(lab)}</b> — ${esc(elKo(g.el) || g.text)}</div>`;
      }).join('');
      const nm = (() => { try { const n = getAirportNameInfo(icao); return n ? n.ko : ''; } catch (e) { return ''; } })();
      return `<div class="kp-wx"><div class="h"><span class="kp-chip">${role}</span><b>${icao}</b> <span class="kp-dim">${esc(nm)}</span><span class="kp-dim">${lbl} ${hhmmZ(T)} (한국 ${kst(T)})</span><span class="${catCls}" style="padding:1px 8px">${cat} · ${catKo}${haz ? ' · ⚠️ 돌풍/악기상 주의' : ''}</span>${!r.valid ? '<span class="kp-chip" style="color:#fbbf24">TAF 유효기간 밖</span>' : ''}</div>
        <div style="margin-top:4px">${esc(elKo(r.st)) || '<span class="kp-dim">해당 시각 예보 없음</span>'}</div>
        ${notes || '<div class="kp-dim" style="margin-top:3px">±1시간 안에 TEMPO/BECMG 변화 없음</div>'}
        <details class="kd-more"><summary>원문</summary><pre style="white-space:pre-wrap;font-size:11px;color:#cbd5e1">${esc(pdfTaf[icao].raw)}</pre></details></div>`;
    }).join('') + '<div class="kp-dim">분류: VFR 양호 / MVFR 보통(실링 3000ft 이하 또는 시정 8km 이하) / IFR 나쁨(1000ft·4800m 미만) / LIFR 매우 나쁨(500ft·1600m 미만). 실제 minima는 회사 차트 기준으로 확인하세요.</div>';
  }

  // ---------- ⑤ 바람 힌트 ----------
  function parseWinds() {
    const t = ofp(); const s = t.indexOf('START OF WIND AND TEMPERATURE SUMMARY'); if (s < 0) return [];
    const e = t.indexOf('END OF WIND', s); const lines = t.slice(s, e > 0 ? e : s + 30000).split('\n');
    const rowRx = /^\s*(\d{3})\s+(-?\d+)\s+((?:\d{5}[PM-]\d{3}[PM-]\d{2}\s*)+)$/, nameRx = /^\s*([A-Z0-9]{2,8}(?:\s+[A-Z0-9]{2,8})*)\s*$/;
    const blocks = []; let rows = [];
    lines.forEach(l => {
      let m;
      if ((m = l.match(rowRx))) { const cells = [...m[3].matchAll(/(\d{3})(\d{2})([PM-])(\d{3})([PM-])(\d{2})/g)].map(c => ({ dir: +c[1], spd: +c[2], comp: (c[3] === 'P' ? 1 : -1) * +c[4], tmp: (c[5] === 'P' ? 1 : -1) * +c[6] })); rows.push({ fl: +m[1], isa: +m[2], cells }); }
      else if ((m = l.match(nameRx)) && rows.length && !/^\s*FL\s/.test(l)) { const names = m[1].split(/\s+/); if (rows.every(r => r.cells.length === names.length)) blocks.push({ rows, names }); rows = []; }
      else if (/^\s*FL\s+ISA/.test(l)) rows = [];
    });
    return blocks;
  }
  function renderWind() {
    const box = $id('kp-wind'); const blocks = parseWinds(); const N = nav();
    if (!blocks.length) { box.innerHTML = '<div class="kp-dim">OFP에서 상층풍 표를 찾지 못했어요.</div>'; return; }
    const hints = [], table = [];
    blocks.forEach(b => b.names.forEach((name, c) => {
      const w = N.find(x => x.name === name); const pfl = w && typeof w.fl === 'number' ? w.fl : null;
      const col = b.rows.map(r => ({ fl: r.fl, isa: r.isa, ...r.cells[c] }));
      table.push({ name, pfl, col });
      if (pfl == null) return;
      const cur = col.reduce((a, r) => !a || Math.abs(r.fl - pfl) < Math.abs(a.fl - pfl) ? r : a, null); if (!cur || Math.abs(cur.fl - pfl) > 15) return;
      // 고도 차이에 따른 문턱: ±2000ft 10kt · 4000ft 상승 15kt · 4000ft 강하 25kt(저고도 연료흐름 증가 감안)
      const need = r => { const d = r.fl - cur.fl; return Math.abs(d) <= 25 ? 10 : d > 0 ? 15 : 25; };
      const best = col.filter(r => Math.abs(r.fl - pfl) <= 45 && r.fl !== cur.fl && r.comp - cur.comp >= need(r)).reduce((a, r) => !a || (r.comp - cur.comp - need(r)) > (a.comp - cur.comp - need(a)) ? r : a, null);
      if (best) hints.push({ name, pfl, cur, best, gain: best.comp - cur.comp, i: N.indexOf(w) });
    }));
    hints.sort((a, b) => a.i - b.i);
    // 연속 구간은 하나로 묶기
    const merged = [];
    hints.forEach(h => { const m = merged[merged.length - 1]; if (m && m.best.fl === h.best.fl && m.cur.fl === h.cur.fl && h.i - m.iEnd <= 2) { m.iEnd = h.i; m.nameEnd = h.name; m.gain = Math.max(m.gain, h.gain); } else merged.push({ ...h, iEnd: h.i, nameEnd: h.name }); });
    const cmpTxt = v => v < 0 ? `맞바람 ${-v}kt` : v > 0 ? `뒷바람 ${v}kt` : '무풍';
    box.innerHTML = (merged.length ? `<div class="kp-tl">${merged.map(h => `<div class="kp-item" style="grid-template-columns:1fr"><div><div class="ti">🌬️ ${esc(h.name)}${h.nameEnd !== h.name ? ' → ' + esc(h.nameEnd) : ''} 구간 (+${hm(el(h.i))}${h.iEnd !== h.i ? '~+' + hm(el(h.iEnd)) : ''}): <span style="color:#6ee7b7">FL${h.best.fl}</span>이 계획 FL${h.cur.fl}보다 바람 <b>최대 ${h.gain}kt 유리</b>${h.best.fl < h.cur.fl ? ' <span class="kp-dim">(강하 시 연료흐름 증가 감안해도 이득 가능)</span>' : ''}</div><div class="su">FL${h.cur.fl} ${h.cur.dir.toString().padStart(3, '0')}/${h.cur.spd} ${cmpTxt(h.cur.comp)} · ISA${h.cur.tmp - h.cur.isa >= 0 ? '+' : ''}${h.cur.tmp - h.cur.isa} → FL${h.best.fl} ${h.best.dir.toString().padStart(3, '0')}/${h.best.spd} ${cmpTxt(h.best.comp)} · ISA${h.best.tmp - h.best.isa >= 0 ? '+' : ''}${h.best.tmp - h.best.isa}</div></div></div>`).join('')}</div>` : '<div class="kp-ok">✅ 계획 고도가 바람 기준으로 무난해요. (±2000ft에서 10kt, 4000ft 상승 15kt, 4000ft 강하 25kt 이상 차이 날 때만 표시)</div>') +
      `<details class="kd-more"><summary>상층풍 표 보기 (구간별 FL · 바람 · 성분 · ISA 편차)</summary><div style="overflow-x:auto"><table class="kp-table"><tr><th>구간</th><th>계획</th>${table.length ? table[0].col.map(r => `<th>FL${r.fl}</th>`).join('') : ''}</tr>${table.map(t => `<tr><td><b>${esc(t.name)}</b></td><td>${t.pfl != null ? 'FL' + t.pfl : '-'}</td>${t.col.map(r => `<td style="${t.pfl != null && Math.abs(r.fl - t.pfl) <= 15 ? 'color:#67e8f9;font-weight:700' : ''}">${r.dir.toString().padStart(3, '0')}/${r.spd} <span style="color:${r.comp < 0 ? '#fda4af' : '#86efac'}">${r.comp > 0 ? '+' : ''}${r.comp}</span> <span class="kp-dim">${r.tmp}</span></td>`).join('')}</tr>`).join('')}</table></div><div class="kp-dim">성분(+뒷바람/−맞바람)은 OFP CMP 값이에요. 고도 변경은 연료 흐름·중량·난류(SR)·ATC를 같이 봐야 해요.</div></details>`;
  }

  // ---------- ⑥ 브리핑 요약 ----------
  function summaryText() {
    const L = []; let w = null; try { w = flightWindow(); } catch (e) {}
    const p = (typeof pdfFlt !== 'undefined' && pdfFlt) || {};
    L.push(`[브리핑 요약] ${p.callsign || ''} ${info.dep || ''}→${info.dest || ''} ALTN ${info.altn || p.altn || '-'} · ${info.flightDate || ''}`);
    if (w) L.push(`ETD ${hhmmZ(w.etd)} (KST ${kst(w.etd)}) · ETA ${hhmmZ(w.eta)} (KST ${kst(w.eta)}) · 비행시간 ${hm(info.eetMinutes)}`);
    if (fuel) { const g = k => fuel.rows[k] ? fuel.rows[k].fuel : 0; const fod = fuel.rows.FOD ? fuel.rows.FOD.fuel : null; const minLand = g('ALTN') + g('FINAL RES'); L.push(`연료: TRIP ${fmtN(g('TRIP'))} · FOD ${fmtN(fod)} · 최소착륙 ${fmtN(minLand)} · holding 여유 ${fuel.holdRate && fod != null ? Math.round((fod - minLand) / fuel.holdRate) + '분' : '-'} (${fuel.unit})`); }
    const sr = K.srRuns ? K.srRuns() : []; if (sr.length) L.push('SR 구간: ' + sr.map(r => `+${hm(r.t0)}~+${hm(r.t1)} ${tok(r.s)}→${tok(r.i1)} SR${r.max}`).join(' / '));
    if (items.length) { L.push('할 일:'); items.forEach(it => L.push(`  +${hm(it.el)} ${tok(it.i)} ${it.icon} ${it.title}${it.sub ? ' — ' + it.sub.slice(0, 120) : ''}`)); }
    try { const tb = K.turb ? K.turb() : []; if (tb.length) { L.push('흔들림 보고:'); tb.forEach(r => L.push(`  ${r.sev} ${r.reason_ko} ${r.flLo != null ? 'FL' + r.flLo + (r.flHi != null ? '-' + r.flHi : '') : ''} ${r.points.map(x => x.name || x.lat.toFixed(2) + ',' + wrap180(x.lon).toFixed(2)).join('→')}`)); } } catch (e) {}
    try { if (w && pdfTaf) [[info.dep, w.etd, 'DEP'], [info.dest, w.eta, 'DEST'], [info.altn, w.eta, 'ALTN']].forEach(([c, T, r]) => { if (c && pdfTaf[c]) { const a = tafAt(pdfTaf[c], T); L.push(`TAF ${r} ${c} @${hhmmZ(T)}: ${wxCat(a.st)} · ${elKo(a.st)}${a.notes.length ? ' · 변화 ' + a.notes.map(g => g.label).join(', ') : ''}`); } }); } catch (e) {}
    L.push('※ 자동 생성 참고용 — 원문 확인 필수');
    return L.join('\n');
  }
  $id('kp-copy').addEventListener('click', () => { if (!nav().length) { showToast('OFP를 먼저 첨부하세요'); return; } copyText(summaryText()); });
  $id('kp-print-btn').addEventListener('click', () => {
    if (!nav().length) { showToast('OFP를 먼저 첨부하세요'); return; }
    const txt = summaryText().split('\n');
    printBox.innerHTML = `<h1>${esc(txt[0])}</h1><div class="dim">${esc(txt[1] || '')}</div>` +
      `<h2>연료</h2><div>${esc(txt.find(l => l.startsWith('연료')) || '-')}</div>` +
      `<h2>할 일 타임라인</h2><table><tr><th>경과</th><th>지점</th><th>내용</th></tr>${items.map(it => `<tr><td>+${hm(it.el)}</td><td>${esc(tok(it.i))}</td><td>${it.icon} ${esc(it.title)}<div class="dim">${esc(it.sub || '')}</div></td></tr>`).join('')}</table>` +
      `<h2>SR · 흔들림</h2><div>${esc(txt.find(l => l.startsWith('SR 구간')) || 'SR 구간 없음')}</div><div>${txt.filter((l, i) => i > 0 && txt[i - 1] === '흔들림 보고:' || /^  (SEV|MOD|LGT|UNK) /.test(l)).map(esc).join('<br>') || ''}</div>` +
      `<h2>TAF</h2>${txt.filter(l => l.startsWith('TAF ')).map(l => `<div>${esc(l)}</div>`).join('') || '-'}` +
      `<div class="dim" style="margin-top:10px">자동 생성 참고용 — 원문 확인 필수 · ${new Date().toISOString().slice(0, 16)}Z</div>`;
    setTimeout(() => window.print(), 100);
  });

  // ---------- 갱신 ----------
  function refreshPos() {
    const p = curPos(); const chip = $id('kp-pos-src'), inf = $id('kp-pos-info');
    if (!p) { chip.textContent = '위치 없음'; inf.textContent = ''; }
    else { const ci = curIdx(); chip.textContent = p.src === 'gps' ? '실시간 GPS' : '수동'; inf.textContent = ci ? `지난 지점 ${tok(ci.i)}${p.src === 'gps' ? ` (경로에서 ${Math.round(ci.d)}NM)` : ''}` : ''; }
    renderTimeline(); renderNear(); if (fuel && fuelInputs.fob != null) renderFuel(); checkAlerts();
  }
  let lastKey = '';
  function refreshAll() {
    fillSelects(); buildTimeline(); renderTimeline(); renderFuel(); renderNear(); renderTaf(); renderWind();
    const k = flightKey(); if (k && k !== lastKey) { lastKey = k; alerted = new Set(); fuelInputs.ramp = null; fuelInputs.fob = null; const fb = $id('kp-fuel'); if (fb) { fb.innerHTML = ''; } renderFuel(); try { const o = JSON.parse(localStorage.getItem('kpManual') || '{}'); manual = o && o.k === k ? (o.r || []) : []; } catch (e) { manual = []; } buildTimeline(); renderTimeline(); }
  }
  let tmr = null; const schedule = () => { clearTimeout(tmr); tmr = setTimeout(refreshAll, 400); };
  if (typeof renderMap === 'function') { const orig = renderMap; window.renderMap = function () { const r = orig.apply(this, arguments); schedule(); return r; }; try { renderMap = window.renderMap; } catch (e) {} }
  let lastSig = ''; setInterval(() => { const s = ofp().length + '|' + nav().length + '|' + ((K.srRuns ? K.srRuns() : []).length); if (s !== lastSig) { lastSig = s; schedule(); } }, 2000);
  K.onGps = () => refreshPos();
  refreshAll();
})();
