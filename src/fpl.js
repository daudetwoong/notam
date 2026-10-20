/* ================= 📖 ATS 비행계획(FPL) 풀이 =================
   ① 칸의 FPL 전문(textarea #fpl-input)을 항목별(Item 7~19)로 풀어 한국어로 보여준다.
   장비(Item 10) 약자, 감시장비(Mode S·ADS-B·ADS-C), PBN 코드, Item 18 (DAT/ SUR/ EET/ SEL/ CODE/ PER/ …), Item 19 (E/ P/ R/ S/ J/ D/ A/).
   FPL 칸을 누르면 펼쳐진다. 모든 처리는 기기 안에서. (ICAO Doc 4444 Appendix 2 기준 · 참고용) */
(function () {
  'use strict';
  const $id = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad2 = n => String(n).padStart(2, '0');

  // ---------- 사전 ----------
  const EQUIP = {
    N: '무선·항법·진입보조 장비 없음(또는 불능)', S: '표준 장비 (VHF 무선, VOR, ILS)', A: 'GBAS 착륙 시스템', B: 'LPV (SBAS 이용 APV)', C: 'LORAN C', D: 'DME',
    E1: 'FMC WPR ACARS (ACARS로 위치보고)', E2: 'D-FIS ACARS (ATIS·기상 등 데이터 수신)', E3: 'PDC ACARS (출발 허가 데이터링크)', F: 'ADF', G: 'GNSS (GPS)', H: 'HF 무선', I: '관성항법 (IRS/INS)',
    J1: 'CPDLC ATN VDL Mode 2', J2: 'CPDLC FANS 1/A HFDL', J3: 'CPDLC FANS 1/A VDL Mode A', J4: 'CPDLC FANS 1/A VDL Mode 2', J5: 'CPDLC FANS 1/A SATCOM (INMARSAT)', J6: 'CPDLC FANS 1/A SATCOM (MTSAT)', J7: 'CPDLC FANS 1/A SATCOM (Iridium)',
    K: 'MLS', L: 'ILS', M1: 'ATC 위성음성 SATVOICE (INMARSAT)', M2: 'ATC 위성음성 SATVOICE (MTSAT)', M3: 'ATC 위성음성 SATVOICE (Iridium)', O: 'VOR',
    P1: 'CPDLC RCP 400', P2: 'CPDLC RCP 240', P3: 'SATVOICE RCP 400', P4: 'RCP 예약', P5: 'RCP 예약', P6: 'RCP 예약', P7: 'RCP 예약', P8: 'RCP 예약', P9: 'RCP 예약',
    R: 'PBN 승인 (어떤 PBN인지는 Item 18 PBN/ 에)', T: 'TACAN', U: 'UHF 무선', V: 'VHF 무선', W: 'RVSM 승인 (FL290~410에서 1,000ft 분리 가능)', X: 'MNPS / NAT HLA 승인 (북대서양 고고도 공역)', Y: 'VHF 8.33 kHz 채널 간격', Z: '기타 장비 (Item 18의 COM/ NAV/ DAT/ 참조)'
  };
  const SURV = {
    N: '감시장비 없음', A: 'Transponder Mode A (4096 코드, 고도 없음)', C: 'Transponder Mode A + C (고도 포함)', E: 'Mode S — 식별·기압고도·EHS(강화감시)', H: 'Mode S — 식별·기압고도·EHS(강화감시)', I: 'Mode S — 식별만, 기압고도 없음', L: 'Mode S — 식별·기압고도·확장 스퀴터(ADS-B)·EHS 전부', P: 'Mode S — 기압고도만, 식별 없음', S: 'Mode S — 식별 + 기압고도', X: 'Mode S — 식별·기압고도 모두 없음',
    B1: 'ADS-B OUT (1090 MHz 확장 스퀴터)', B2: 'ADS-B OUT + IN (1090 MHz)', U1: 'ADS-B OUT (UAT)', U2: 'ADS-B OUT + IN (UAT)', V1: 'ADS-B OUT (VDL Mode 4)', V2: 'ADS-B OUT + IN (VDL Mode 4)', D1: 'ADS-C FANS 1/A (계약형 자동위치보고)', G1: 'ADS-C ATN'
  };
  const PBN = {
    A1: 'RNAV 10 (RNP 10) — 대양·원격 공역', B1: 'RNAV 5 — 모든 허용 센서', B2: 'RNAV 5 — GNSS', B3: 'RNAV 5 — DME/DME', B4: 'RNAV 5 — VOR/DME', B5: 'RNAV 5 — INS/IRS', B6: 'RNAV 5 — LORAN C',
    C1: 'RNAV 2 — 모든 허용 센서', C2: 'RNAV 2 — GNSS', C3: 'RNAV 2 — DME/DME', C4: 'RNAV 2 — DME/DME/IRU', D1: 'RNAV 1 — 모든 허용 센서 (SID/STAR)', D2: 'RNAV 1 — GNSS', D3: 'RNAV 1 — DME/DME', D4: 'RNAV 1 — DME/DME/IRU',
    L1: 'RNP 4 — 대양·원격 공역', O1: 'Basic RNP 1 — 모든 허용 센서', O2: 'Basic RNP 1 — GNSS', O3: 'Basic RNP 1 — DME/DME', O4: 'Basic RNP 1 — DME/DME/IRU',
    S1: 'RNP APCH (LNAV)', S2: 'RNP APCH + BARO-VNAV (LNAV/VNAV)', T1: 'RNP AR APCH (RF leg 포함)', T2: 'RNP AR APCH (RF leg 없음)'
  };
  const RULES = { I: 'IFR', V: 'VFR', Y: 'IFR로 출발, 중간에 VFR로 변경', Z: 'VFR로 출발, 중간에 IFR로 변경' };
  const FTYPE = { S: '정기 항공운송 (Scheduled)', N: '부정기 항공운송 (Non-scheduled)', G: '일반항공 (General aviation)', M: '군용 (Military)', X: '기타' };
  const WAKE = { L: 'Light (7,000kg 이하)', M: 'Medium (7,000~136,000kg)', H: 'Heavy (136,000kg 초과)', J: 'Super (A380)' };
  const TYPES = { A319: 'Airbus A319', A20N: 'Airbus A320neo', A320: 'Airbus A320', A21N: 'Airbus A321neo', A321: 'Airbus A321', A332: 'Airbus A330-200', A333: 'Airbus A330-300', A339: 'Airbus A330-900neo', A359: 'Airbus A350-900', A35K: 'Airbus A350-1000', A388: 'Airbus A380', B737: 'Boeing 737-700', B738: 'Boeing 737-800', B38M: 'Boeing 737 MAX 8', B744: 'Boeing 747-400', B748: 'Boeing 747-8', B763: 'Boeing 767-300', B772: 'Boeing 777-200', B77W: 'Boeing 777-300ER', B788: 'Boeing 787-8', B789: 'Boeing 787-9', B78X: 'Boeing 787-10' };
  const PER = { A: 'A — 진입속도(Vat) 91kt 미만', B: 'B — 91~120kt', C: 'C — 121~140kt', D: 'D — 141~165kt', E: 'E — 166~210kt', H: 'H — 헬리콥터' };
  const STS = { ALTRV: '고도 예약 비행', ATFMX: 'ATFM 조치 면제', FFR: '소방 비행', FLTCK: '항행시설 점검 비행', HAZMAT: '위험물 탑재', HEAD: '국가원수 탑승', HOSP: '의료 당국 지정 의료 비행', HUM: '인도적 임무', MARSA: '군용 항공기 간 분리 책임을 군이 가짐', MEDEVAC: '긴급 환자 이송', NONRVSM: 'RVSM 공역에서 비승인 운항', SAR: '수색구조', STATE: '국가 항공기' };
  const RADIO = { U: 'UHF 243.0 MHz', V: 'VHF 121.5 MHz', E: 'ELT (비상위치발신기)' };
  const SURVIVAL = { P: '극지(Polar)', D: '사막(Desert)', M: '해상(Maritime)', J: '정글(Jungle)' };
  const JACKET = { L: '조명(Light) 부착', F: '형광염료(Fluorescein)', U: 'UHF 무선 부착', V: 'VHF 무선 부착' };
  const FIR_KO = { RKRR: '인천', RJJJ: '후쿠오카', RCAA: '타이베이', VHHK: '홍콩', ZJSA: '싼야', VVHM: '호치민', VVHN: '하노이', VLVT: '비엔티안', VTBB: '방콕', ZSHA: '상하이', ZBPE: '베이징', ZGZU: '광저우', ZWUQ: '우루무치', ZLHW: '란저우', ZHWH: '우한', ZPKM: '쿤밍', ZYSH: '선양', ZUCK: '충칭', RPHI: '마닐라', WSJC: '싱가포르', WMFC: '쿠알라룸푸르', WIIF: '자카르타', VYYF: '양곤', VECF: '콜카타', UHHH: '하바롭스크', PAZA: '앵커리지', KZAK: '오클랜드 대양', RJTG: '도쿄' };
  const ITEM18_KO = { STS: '특수 취급 사유', PBN: 'PBN 능력 (항법 성능)', NAV: '항법 장비 추가 정보', COM: '통신 장비 추가 정보', DAT: '데이터링크 응용', SUR: '감시 능력 추가 정보', DEP: '출발지 (ICAO 코드 없을 때)', DEST: '목적지 (ICAO 코드 없을 때)', DOF: '비행 날짜 (YYMMDD)', REG: '등록부호', EET: 'FIR 경계 통과 예정 경과시간', SEL: 'SELCAL 코드', TYP: '기종 (ICAO 코드 없을 때)', CODE: 'Mode S 24비트 주소 (16진수)', DLE: '경로상 지연·대기', OPR: '운항자', ORGN: '발신자', PER: '항공기 성능 분류', ALTN: '교체공항 (ICAO 코드 없을 때)', RALT: '항로 교체공항', TALT: '이륙 교체공항', RIF: '변경 목적지 경로', RVR: '최소 RVR 요구치', RFP: '재제출 비행계획 번호', RMK: '비고' };

  // ---------- 파서 ----------
  function parseFpl(raw) {
    const m = String(raw || '').match(/\(FPL[\s\S]*?\)/); if (!m) return null;
    let body = m[0].slice(1, -1).replace(/\r/g, '');
    // 항목은 줄 머리의 '-' 로 나뉜다 (한 줄로 붙은 전문도 처리)
    let parts = body.split(/\n\s*-|^-/).map(s => s.replace(/\n\s*/g, ' ').trim()).filter(Boolean);
    if (parts.length < 6) parts = body.replace(/\n\s*/g, ' ').split(/-(?=[A-Z0-9]{3,7}-[IVYZ][SNGMX]\b|[A-Z0-9]{2,4}\/[LMHJ]-|[A-Z]{4}\d{4}\b|[NKM]\d{3,4}[FSAM]|PBN\/|STS\/|E\/\d)/).map(s => s.trim()).filter(Boolean);
    const r = { raw: m[0] };
    parts.forEach((p, i) => {
      if (i === 0) { const mm = p.match(/^FPL-?([A-Z0-9]+)-([IVYZ])([SNGMX])/); if (mm) { r.id = mm[1]; r.rules = mm[2]; r.ftype = mm[3]; } return; }
      let mm;
      if ((mm = p.match(/^(\d{0,2})([A-Z0-9]{2,4})\/([LMHJ])-([A-Z0-9]+)\/([A-Z0-9]+)$/))) { r.num = mm[1]; r.type = mm[2]; r.wake = mm[3]; r.equip = mm[4]; r.surv = mm[5]; return; }
      if ((mm = p.match(/^([A-Z]{4})(\d{4})$/)) && !r.dep) { r.dep = mm[1]; r.eobt = mm[2]; return; }
      if ((mm = p.match(/^([NKM]\d{3,4})([FSAM]\d{3,4}|VFR)\s+(.*)$/))) { r.spd = mm[1]; r.lvl = mm[2]; r.route = mm[3]; return; }
      if ((mm = p.match(/^([A-Z]{4})(\d{4})((?:\s+[A-Z]{4})*)$/)) && r.dep && !r.dest) { r.dest = mm[1]; r.eet = mm[2]; r.altn = mm[3].trim().split(/\s+/).filter(Boolean); return; }
      if (/^(STS|PBN|NAV|COM|DAT|SUR|DEP|DEST|DOF|REG|EET|SEL|TYP|CODE|DLE|OPR|ORGN|PER|ALTN|RALT|TALT|RIF|RVR|RFP|RMK)\//.test(p)) { r.i18 = parseFields(p, Object.keys(ITEM18_KO)); return; }
      if (/^(E|P|R|S|J|D|A|N|C)\//.test(p)) { r.i19 = parseFields(p, ['E', 'P', 'R', 'S', 'J', 'D', 'A', 'N', 'C']); return; }
    });
    return r;
  }
  function parseFields(p, keys) {
    const rx = new RegExp('\\b(' + keys.join('|') + ')\\/', 'g'); const out = []; let m, last = null;
    while ((m = rx.exec(p))) { if (last) last.v = p.slice(last.end, m.index).trim(); last = { k: m[1], end: m.index + m[0].length }; out.push(last); }
    if (last) last.v = p.slice(last.end).trim();
    return out;
  }
  const splitCodes = s => (String(s).match(/[A-Z]\d?/g) || []);
  const hhmm = s => s ? `${s.slice(0, 2)}:${s.slice(2)}` : '';
  const addMin = (hhmm4, min) => { const t = (+hhmm4.slice(0, 2) * 60 + +hhmm4.slice(2) + min) % 1440; return pad2(Math.floor(t / 60)) + ':' + pad2(t % 60); };
  const kst = z4 => addMin(z4, 540);
  function speedKo(s) { const v = s.slice(1); return s[0] === 'N' ? `진대기속도 ${+v} kt` : s[0] === 'K' ? `진대기속도 ${+v} km/h` : s[0] === 'M' ? `마하 ${(+v / 100).toFixed(2)}` : s; }
  function levelKo(l) { if (l === 'VFR') return 'VFR'; const v = l.slice(1); return l[0] === 'F' ? `FL${v}` : l[0] === 'S' ? `S${v} = ${+v * 10} m (미터 고도 — 중국·러시아 등)` : l[0] === 'A' ? `${+v * 100} ft (고도)` : l[0] === 'M' ? `${+v * 10} m (미터 고도)` : l; }

  // ---------- 렌더 ----------
  const css = `
  .kf-box{margin-top:6px}
  .kf-sec{border:1px solid #1e293b;background:#020617;border-radius:10px;padding:8px 10px;margin-top:6px}
  .kf-sec h4{font-size:12px;font-weight:800;color:#67e8f9;margin:0 0 4px}
  .kf-sec h4 .mono{color:#e2e8f0;font-weight:700}
  .kf-row{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;font-size:12px;line-height:1.5;align-items:baseline}
  .kf-row b{font-family:ui-monospace,Menlo,monospace;color:#fde68a;white-space:nowrap}
  .kf-row span{color:#e2e8f0}
  .kf-chips{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0}
  .kf-chip{font-size:11px;border-radius:999px;padding:2px 8px;border:1px solid #334155;background:#0f172a;color:#cbd5e1}
  .kf-chip.ok{border-color:#059669;background:rgba(6,78,59,.35);color:#a7f3d0}
  .kf-chip.no{border-color:#64748b;color:#94a3b8;text-decoration:line-through}
  .kf-chip.warn{border-color:#f59e0b;background:rgba(120,53,15,.35);color:#fde68a}
  .kf-dim{font-size:11px;color:#94a3b8}
  .kf-route{font-family:ui-monospace,Menlo,monospace;font-size:11px;color:#cbd5e1;white-space:pre-wrap;word-break:break-word}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const ta = $id('fpl-input'); if (!ta) return;
  const box = document.createElement('details'); box.className = 'kd-guide kind kf-box'; box.id = 'kf-box';
  box.innerHTML = '<summary>📖 ATS 비행계획(FPL) 풀이 — 항목·장비 약자가 무슨 뜻인지</summary><div id="kf-body"><div class="kf-dim">FPL 전문이 들어오면 여기에 풀이가 나와요.</div></div>';
  ta.insertAdjacentElement('afterend', box);
  const row = (k, v) => `<b>${esc(k)}</b><span>${v}</span>`;
  function chips(codes, dict, cls) { return codes.map(c => `<span class="kf-chip ${cls || ''}">${esc(c)} <span class="kf-dim">${esc(dict[c] || '알 수 없는 코드')}</span></span>`).join(''); }

  function render() {
    const body = $id('kf-body'); const f = parseFpl(ta.value);
    if (!f) { body.innerHTML = '<div class="kf-dim">FPL 전문이 들어오면 여기에 풀이가 나와요. (OFP를 넣으면 자동으로 채워져요)</div>'; return; }
    const eq = splitCodes(f.equip || ''), sv = splitCodes(f.surv || '');
    const i18 = f.i18 || [], i19 = f.i19 || [];
    const g18 = k => (i18.find(x => x.k === k) || {}).v;
    const pbn = (g18('PBN') || '').match(/[A-Z]\d/g) || [];
    // ---- 핵심 능력 요약 ----
    const cap = [];
    cap.push(eq.includes('W') ? ['ok', '✅ RVSM 승인 (W)'] : ['no', 'RVSM 미승인 — FL290~410 1,000ft 분리 불가']);
    cap.push(eq.includes('R') ? ['ok', `✅ PBN 승인 (R)${pbn.length ? ' — ' + pbn.join(' ') : ''}`] : ['no', 'PBN 미승인']);
    cap.push(eq.includes('Y') ? ['ok', '✅ 8.33 kHz (Y)'] : ['warn', '8.33 kHz 없음 — 유럽 등에서 제한']);
    const cpdlc = eq.filter(c => /^J\d$/.test(c)); cap.push(cpdlc.length ? ['ok', `✅ CPDLC (${cpdlc.join(' ')}) — ${cpdlc.map(c => EQUIP[c].replace('CPDLC ', '')).join(' / ')}`] : ['no', 'CPDLC 없음']);
    const sat = eq.filter(c => /^M\d$/.test(c)); if (sat.length) cap.push(['ok', `✅ SATVOICE (${sat.join(' ')})`]);
    const rcp = eq.filter(c => /^P\d$/.test(c)); if (rcp.length) cap.push(['ok', `✅ ${rcp.map(c => EQUIP[c]).join(', ')}`]);
    cap.push(sv.some(c => /^B[12]$/.test(c)) ? ['ok', `✅ ADS-B OUT (${sv.filter(c => /^B[12]$/.test(c)).join('')})${/260B/.test(g18('SUR') || '') ? ' · DO-260B' : ''}`] : ['no', 'ADS-B 없음']);
    cap.push(sv.some(c => /^[DG]1$/.test(c)) ? ['ok', `✅ ADS-C (${sv.filter(c => /^[DG]1$/.test(c)).join(' ')})${/RSP\d+/.test(g18('SUR') || '') ? ' · ' + (g18('SUR').match(/RSP\d+/) || [])[0] : ''}`] : ['no', 'ADS-C 없음']);
    const modeS = sv.find(c => /^[EHILPSX]$/.test(c)); if (modeS) cap.push(['ok', `✅ Transponder ${modeS} — ${SURV[modeS].replace('Mode S — ', 'Mode S, ')}`]);
    if (eq.includes('X')) cap.push(['ok', '✅ NAT HLA / MNPS (X)']);
    if (eq.includes('G')) cap.push(['ok', '✅ GNSS (G)']);
    if (/TCAS/i.test(g18('RMK') || '')) cap.push(['ok', '✅ TCAS II']);
    const sts = g18('STS'); if (sts) cap.push(['warn', `⚠️ STS/${sts} — ${sts.split(/\s+/).map(s => STS[s] || s).join(', ')}`]);
    // ---- 항목별 ----
    let h = `<div class="kf-chips">${cap.map(([c, t]) => `<span class="kf-chip ${c}">${esc(t)}</span>`).join('')}</div>`;
    h += `<div class="kf-sec"><h4>Item 7·8 — 항공기 식별 · 비행 규칙 · 비행 종류 <span class="mono">${esc(f.id || '')}-${esc((f.rules || '') + (f.ftype || ''))}</span></h4><div class="kf-row">
      ${row(f.id || '', '항공기 식별 (콜사인)')}${row(f.rules || '', RULES[f.rules] || '')}${row(f.ftype || '', FTYPE[f.ftype] || '')}</div></div>`;
    h += `<div class="kf-sec"><h4>Item 9 — 기종 · 후류 등급 <span class="mono">${esc((f.num || '') + (f.type || ''))}/${esc(f.wake || '')}</span></h4><div class="kf-row">
      ${row(f.type || '', `${esc(TYPES[f.type] || '기종 ICAO 코드')}${f.num ? ` · ${+f.num}대 편대` : ''}`)}${row(f.wake || '', '후류 등급 ' + esc(WAKE[f.wake] || ''))}</div></div>`;
    h += `<div class="kf-sec"><h4>Item 10a — 무선·항법·진입 장비 <span class="mono">${esc(f.equip || '')}</span></h4><div class="kf-chips">${chips(eq, EQUIP)}</div>
      <div class="kf-dim">S가 있으면 VHF·VOR·ILS는 기본 포함이에요. Z가 있으면 Item 18의 COM/ NAV/ DAT/ 에 추가 설명이 있어요.</div></div>`;
    h += `<div class="kf-sec"><h4>Item 10b — 감시 장비 (Transponder · ADS-B · ADS-C) <span class="mono">${esc(f.surv || '')}</span></h4><div class="kf-chips">${chips(sv, SURV)}</div></div>`;
    if (f.dep) h += `<div class="kf-sec"><h4>Item 13 — 출발 <span class="mono">${esc(f.dep + f.eobt)}</span></h4><div class="kf-row">${row(f.dep, '출발 공항')}${row(f.eobt, `EOBT(예정 이동 시각) ${hhmm(f.eobt)}Z · 한국 ${kst(f.eobt)}`)}</div></div>`;
    if (f.spd) {
      const toks = f.route.split(/\s+/); const chg = toks.filter(t => /\/[NKM]\d{3,4}[FSAM]\d{3,4}/.test(t));
      const fixes = toks.filter(t => /^[A-Z]{2,5}$/.test(t) && t !== 'DCT').length, awys = toks.filter(t => /^[A-Z]{1,2}\d{1,3}[A-Z]?$/.test(t)).length;
      h += `<div class="kf-sec"><h4>Item 15 — 순항 속도 · 고도 · 경로 <span class="mono">${esc(f.spd + f.lvl)}</span></h4><div class="kf-row">
        ${row(f.spd, speedKo(f.spd))}${row(f.lvl, '요청 순항고도 ' + esc(levelKo(f.lvl)))}${row('경로', `지점 ${fixes}개 · 항로 ${awys}개${toks.includes('DCT') ? ' · DCT(직항 구간) 포함' : ''}`)}
        ${chg.map(t => { const [fx, sl] = t.split('/'); const sm = sl.match(/([NKM]\d{3,4})([FSAM]\d{3,4})/); return row(fx, `여기부터 ${esc(speedKo(sm[1]))} · ${esc(levelKo(sm[2]))} (속도·고도 변경점)`); }).join('')}</div>
        <div class="kf-route" style="margin-top:4px">${esc(f.route)}</div></div>`;
    }
    if (f.dest) h += `<div class="kf-sec"><h4>Item 16 — 목적지 · 총 예상 소요시간 · 교체공항 <span class="mono">${esc(f.dest + f.eet)} ${esc((f.altn || []).join(' '))}</span></h4><div class="kf-row">
      ${row(f.dest, '목적 공항')}${row(f.eet, `총 예상 소요시간(EET) ${hhmm(f.eet)}${f.eobt ? ` → ETA 약 ${addMin(f.eobt, +f.eet.slice(0, 2) * 60 + +f.eet.slice(2))}Z (한국 ${addMin(f.eobt, +f.eet.slice(0, 2) * 60 + +f.eet.slice(2) + 540)})` : ''}`)}${(f.altn || []).map((a, i) => row(a, (i ? '제2 ' : '') + '교체공항')).join('')}</div></div>`;
    if (i18.length) {
      h += `<div class="kf-sec"><h4>Item 18 — 기타 정보</h4><div class="kf-row">` + i18.map(({ k, v }) => {
        let d = '';
        if (k === 'PBN') d = `<div class="kf-chips">${chips(v.match(/[A-Z]\d/g) || [], PBN)}</div>`;
        else if (k === 'EET') d = (v.match(/[A-Z]{4}\d{4}/g) || []).map(x => { const fir = x.slice(0, 4), t = x.slice(4); return `${fir}${FIR_KO[fir] ? '(' + FIR_KO[fir] + ')' : ''} FIR 진입 +${hhmm(t)}${f.eobt ? ` → ${addMin(f.eobt, +t.slice(0, 2) * 60 + +t.slice(2))}Z` : ''}`; }).join('<br>');
        else if (k === 'DOF') d = `20${v.slice(0, 2)}-${v.slice(2, 4)}-${v.slice(4, 6)} (UTC 기준)`;
        else if (k === 'PER') d = `${esc(PER[v] || v)} — 접근 절차 minima 적용 기준`;
        else if (k === 'SUR') d = v.split(/\s+/).map(x => /^RSP(\d+)$/.test(x) ? `${x}: ADS-C 감시 성능 요구치 (보고 지연 ${x.slice(3)}초 기준)` : x === '260B' ? '260B: ADS-B OUT이 RTCA DO-260B 규격(1090ES v2)' : x === '282B' ? '282B: ADS-B OUT이 DO-282B 규격(UAT)' : x).join('<br>');
        else if (k === 'DAT') d = `${esc(v)}${/FANS/i.test(v) ? ' (FANS 1/A: CPDLC·ADS-C)' : ''}${/P/.test(v.replace(/FANS/i, '')) ? ' · PDC(출발허가 데이터링크) 표기 가능성' : ''} <span class="kf-dim">표기 방식은 회사·국가마다 달라요</span>`;
        else if (k === 'CODE') d = `${esc(v)} — 레이더·ADS-B가 이 기체를 식별하는 고유 번호`;
        else if (k === 'SEL') d = `${esc(v)} — HF/VHF로 지상국이 이 기체를 부를 때 차임이 울리는 코드`;
        else if (k === 'REG') d = `${esc(v)}`;
        else if (k === 'STS') d = v.split(/\s+/).map(s => `${s}: ${STS[s] || '특수 취급'}`).join(', ');
        else if (k === 'NAV') d = `항법 추가 정보 ${esc(v)}${/RNVD\d+E\d+A\d+/.test(v) ? ' — RNV D(출발)/E(항로)/A(도착) 각 단계의 RNAV 정확도(NM)' : ''}${/GBAS|SBAS/.test(v) ? ' · GBAS/SBAS 진입 능력' : ''}`;
        else d = esc(v);
        return row(k + '/', `<span class="kf-dim">${esc(ITEM18_KO[k] || '')}</span> ${d}`);
      }).join('') + '</div></div>';
    }
    if (i19.length) {
      const g = k => (i19.find(x => x.k === k) || {}).v;
      h += `<div class="kf-sec"><h4>Item 19 — 보충 정보 (비상 장비)</h4><div class="kf-row">` + i19.map(({ k, v }) => {
        let d = esc(v);
        if (k === 'E') d = `항속시간(Endurance) ${v.slice(0, 2)}시간 ${v.slice(2)}분 — 탑재 연료로 날 수 있는 시간`;
        else if (k === 'P') d = v === 'TBN' ? '탑승 인원 TBN (추후 통보)' : `탑승 인원 ${esc(v)}명`;
        else if (k === 'R') d = '비상 무선: ' + v.split('').map(c => RADIO[c] || c).join(', ');
        else if (k === 'S') d = '생존 장비: ' + v.split('').map(c => SURVIVAL[c] || c).join(', ');
        else if (k === 'J') d = '구명조끼: ' + v.split('').map(c => JACKET[c] || c).join(', ');
        else if (k === 'D') { const m = v.match(/^(\d+)\s+(\d+)\s*(C)?\s*(.*)$/); d = m ? `구명보트 ${m[1]}개 · 총 수용 ${m[2]}명${m[3] ? ' · 덮개 있음(C)' : ''}${m[4] ? ' · 색 ' + esc(m[4]) : ''}` : esc(v); }
        else if (k === 'A') d = `항공기 색상·표식: ${esc(v)}`;
        else if (k === 'N') d = `비고: ${esc(v)}`;
        else if (k === 'C') d = `기장: ${esc(v)}`;
        return row(k + '/', d);
      }).join('') + '</div></div>';
    }
    h += '<div class="kf-dim" style="margin-top:6px">ICAO Doc 4444 Appendix 2 기준 자동 풀이 — 참고용이에요. 회사 표기 관례(DAT/ 등)는 다를 수 있어요.</div>';
    body.innerHTML = h;
  }
  let tmr = null; const sched = () => { clearTimeout(tmr); tmr = setTimeout(render, 300); };
  ta.addEventListener('input', sched);
  ta.addEventListener('click', () => { if (!box.open && parseFpl(ta.value)) box.open = true; });
  if (typeof renderMap === 'function') { const orig = renderMap; window.renderMap = function () { const r = orig.apply(this, arguments); sched(); return r; }; try { renderMap = window.renderMap; } catch (e) {} }
  setTimeout(render, 900);
})();
