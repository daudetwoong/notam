/* ================= 🔧 MEL 바로 보기 =================
   OFP의 "MEL / CDL ITEMS" 줄을 읽어 MEL 책(색인 JSON: mel/<fleet>/<ATA>.json)에서 해당 항목을 찾아
   제한 조건·(m)(o) 조치·운항 절차를 v3 안에서 바로 보여준다. 번호·ECAM 문구 검색도 된다.
   색인은 tools/mel_extract.py 로 MEL PDF에서 만든다. 데이터는 처음 한 번 받으면 기기에 저장돼 오프라인에서도 열린다. */
(function () {
  'use strict';
  const K = window.__kd = window.__kd || {};
  const $id = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ofp = () => String(window.__ofpText || '');
  const FLEETS = { a321: { name: 'A321', iata: ['321', '32B', '32Q'] }, a320: { name: 'A320', iata: ['320', '32A', '32N'] } };
  const RI_KO = { A: '명시된 기간 안에', B: '3일 안에', C: '10일 안에', D: '120일 안에' };

  // ---------- 스타일 ----------
  const css = `
  .km-card{border:1px solid #334155;background:#020617;border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:6px}
  .km-card.miss{border-color:#78350f}
  .km-code{font-family:ui-monospace,Menlo,monospace;font-weight:800;font-size:14px;color:#67e8f9}
  .km-ofp{font-size:12px;color:#fde68a}
  .km-title{font-weight:700;color:#f8fafc;font-size:13px}
  .km-sub{font-size:11px;color:#94a3b8}
  .km-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}
  .km-grid div{background:#0f172a;border:1px solid #1e293b;border-radius:8px;padding:4px 6px;text-align:center}
  .km-grid span{display:block;font-size:10px;color:#94a3b8}.km-grid b{font-family:ui-monospace,Menlo,monospace;font-size:15px;color:#f8fafc}
  .km-grid small{display:block;font-size:10px;color:#a7f3d0}
  .km-flag{display:inline-block;font-size:11px;border-radius:6px;padding:1px 7px;border:1px solid #475569;background:#0f172a;color:#e2e8f0;margin-right:4px}
  .km-flag.red{border-color:#f43f5e;color:#fecdd3;background:rgba(136,19,55,.3)}.km-flag.grn{border-color:#059669;color:#a7f3d0;background:rgba(6,78,59,.3)}.km-flag.cy{border-color:#0e7490;color:#a5f3fc;background:#083344}
  .km-txt{font-size:12px;line-height:1.55;white-space:pre-wrap;word-break:break-word;background:#0b1220;border:1px solid #1e293b;border-radius:8px;padding:8px;color:#e2e8f0;max-height:420px;overflow:auto}
  .km-txt .hl{color:#fde68a;font-weight:700}
  .km-tap{cursor:pointer;-webkit-tap-highlight-color:transparent}
  .km-hint{font-size:10.5px;color:#7dd3fc;text-align:right;margin-top:4px}
  .km-ko{display:none;border:1px solid #155e75;background:rgba(8,51,68,.55);border-radius:8px;padding:8px 10px;font-size:12.5px;line-height:1.6;color:#e2e8f0;white-space:pre-wrap;word-break:break-word;margin-top:6px}
  .km-ko .kh{font-size:11px;font-weight:800;color:#67e8f9;margin-bottom:3px}
  .km-ko .hl{color:#fde68a;font-weight:700}
  .km-ko.on{display:block}
  .km-stale{font-size:11px;color:#fbbf24}
  .km-ops{border-left:3px solid #0e7490;padding-left:8px}
  .km-ops h4{font-size:12px;font-weight:800;color:#a5f3fc;margin:2px 0}
  .km-in{background:#0f172a;border:1px solid #334155;border-radius:8px;padding:6px 8px;color:#f8fafc;font-size:13px;width:100%}
  .km-res{display:flex;flex-direction:column;gap:4px}
  .km-hit{border:1px solid #1e293b;background:#0f172a;border-radius:8px;padding:5px 9px;font-size:12px;cursor:pointer}
  .km-hit b{color:#67e8f9;font-family:ui-monospace,Menlo,monospace}
  .km-hit:hover{border-color:#0e7490}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // ---------- 패널 ----------
  const panel = document.createElement('div'); panel.className = 'kp-panel'; panel.id = 'km-panel';
  panel.innerHTML = `
    <h3>🔧 MEL 바로 보기 <span id="km-rev" class="kp-chip">색인 확인 중…</span></h3>
    <div class="kp-dim">OFP의 MEL / CDL ITEMS 줄을 읽어 MEL 책에서 그 항목을 찾아 보여줘요. Repair interval은 A 명시 기간 · B 3일 · C 10일 · D 120일이에요. 최종 판단은 책 원문과 MEL Policy 기준이에요.</div>
    <div id="km-list" class="kp-sec" style="gap:8px"><div class="kp-dim">OFP PDF를 첨부하면 표시돼요.</div></div>
    <details class="kd-guide"><summary>MEL 번호 · ECAM 문구로 찾기</summary>
      <div class="flex gap-2 mt-2"><input id="km-q" class="km-in" placeholder="예) 34-40-03A, 22-11, GPWS, AIR COND CTL" autocapitalize="characters"><button id="km-go" class="kp-btn">찾기</button></div>
      <div id="km-res" class="km-res" style="margin-top:6px"></div>
      <div id="km-show" class="kp-sec" style="gap:8px;margin-top:6px"></div>
    </details>`;
  const host = (() => { const f = $id('kp-fuel'); return f ? f.closest('.kp-panel') : null; })();
  if (host) host.after(panel); else { const s = [...document.querySelectorAll('section')].find(x => /브리핑 보조/.test((x.querySelector('h2') || {}).textContent || '')); if (s) s.appendChild(panel); }

  // ---------- 데이터 (fetch → IndexedDB 저장) ----------
  const BASE = 'mel/';
  const mem = {}; let idxs = {};
  function idb() {
    return new Promise((res, rej) => { try { const r = indexedDB.open('kdMel', 1); r.onupgradeneeded = () => r.result.createObjectStore('f'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } });
  }
  async function idbGet(k) { try { const d = await idb(); return await new Promise((res, rej) => { const t = d.transaction('f').objectStore('f').get(k); t.onsuccess = () => res(t.result); t.onerror = () => rej(t.error); }); } catch (e) { return undefined; } }
  async function idbPut(k, v) { try { const d = await idb(); await new Promise((res, rej) => { const t = d.transaction('f', 'readwrite').objectStore('f').put(v, k); t.onsuccess = res; t.onerror = () => rej(t.error); }); } catch (e) {} }
  async function getJson(path, fresh) {
    if (mem[path]) return mem[path];
    let v = fresh ? undefined : await idbGet(path);
    if (v === undefined || fresh) {
      try { const r = await fetch(BASE + path, { cache: 'no-store' }); if (r.ok) { v = await r.json(); idbPut(path, v); } } catch (e) {}
      if (v === undefined) v = await idbGet(path);
    }
    if (v !== undefined) mem[path] = v;
    return v;
  }
  async function loadIndex(fleet) {
    if (idxs[fleet]) return idxs[fleet];
    const cached = await idbGet(`${fleet}/index.json`);
    let fresh = null; try { if (navigator.onLine) { const r = await fetch(`${BASE}${fleet}/index.json`, { cache: 'no-store' }); if (r.ok) fresh = await r.json(); } } catch (e) {}
    const idx = fresh || cached || null;
    if (fresh && (!cached || cached.hash !== fresh.hash)) { // 개정판이 바뀌면 챕터 캐시 비우고 새로 받기
      idbPut(`${fleet}/index.json`, fresh); Object.keys(mem).forEach(k => { if (k.startsWith(fleet + '/')) delete mem[k]; });
      setTimeout(() => warm(fleet, fresh), 4000);
    } else if (fresh && cached && cached.hash === fresh.hash) setTimeout(() => warm(fleet, fresh), 8000);
    idxs[fleet] = idx; return idx;
  }
  async function warm(fleet, idx) { // 모든 챕터를 미리 받아 오프라인 대비 (한 번만)
    if (!navigator.onLine) return;
    try { const have = await idbGet(`${fleet}/warm`); if (have === idx.hash) return; } catch (e) {}
    for (const a of idx.atas) { await getJson(`${fleet}/${a}.json`, true); await new Promise(r => setTimeout(r, 150)); }
    await getJson(`${fleet}/ecam.json`, true); idbPut(`${fleet}/warm`, idx.hash);
  }

  // ---------- OFP 파싱 ----------
  function fleetOf() {
    const t = ofp(); const m = t.match(/A\/C REG\.MK[^\n]*\n\s*([0-9A-Z]{3})\s+(HL\d{4})/);
    const code = m ? m[1] : ''; const reg = m ? m[2] : '';
    for (const f of Object.keys(FLEETS)) if (FLEETS[f].iata.includes(code)) return { fleet: f, code, reg };
    return { fleet: null, code, reg };
  }
  function melLines() {
    const t = ofp(); const a = t.search(/MEL\s*\/\s*CDL ITEMS/); if (a < 0) return null;
    const block = t.slice(a, a + 3000).split('\n').slice(1);
    const out = []; for (const l of block) { if (/^\s*\d+\.\s+[A-Z]/.test(l)) break; const m = l.match(/^\s*-\s*(MEL|CDL)\s+([0-9]{2}-[0-9]{2}-[0-9]{2}(?:-[0-9]{2})?[A-Z]?)\s*:?\s*(.*)$/); if (m) out.push({ kind: m[1], code: m[2], desc: m[3].trim() }); else if (/^\s*-\s*NIL\b/.test(l)) return []; }
    return out;
  }

  // ---------- 본문 정리 ----------
  // PDF 텍스트의 강제 줄바꿈을 문단 단위로 다시 이어 붙인다 (목록·Note·제목 줄은 새 줄 유지)
  const NEWLINE_RX = /^\s*(\d+\)|[a-z]\)|\(m\)|\(o\)|Note:|NOTE:|CAUTION:|WARNING:|-|•|[A-Z][A-Z /&()]{3,}:?\s*$|Reference\(s\)|Refer to)/;
  const dedent = s => {
    const ls = String(s || '').replace(/[-]/g, '•').split('\n');
    const out = []; let prevInd = -1;
    for (const raw of ls) {
      const l = raw.replace(/\s+$/, ''); if (!l.trim()) { if (out.length && out[out.length - 1] !== '') out.push(''); prevInd = -1; continue; }
      const ind = l.match(/^\s*/)[0].length; const body = l.trim().replace(/\s{2,}/g, ' ');
      if (out.length && out[out.length - 1] !== '' && prevInd >= 0 && ind > prevInd && !NEWLINE_RX.test(l)) { out[out.length - 1] += ' ' + body; continue; }
      out.push(body); prevInd = ind;
    }
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  };
  function provisions(txt) { // 표(Repair interval…) 두 줄은 위 격자에 따로 보여주므로 본문에서 제거
    const ls = String(txt || '').split('\n'); const i = ls.findIndex(l => /Repair interval\s+Nbr installed/.test(l));
    if (i >= 0) { let j = i + 1; while (j < ls.length && !ls[j].trim()) j++; ls.splice(i, j - i + 1); }
    return dedent(ls.join('\n'));
  }
  const hl = s => esc(s).replace(/\((m|o)\)/g, '<span class="hl">($1)</span>').replace(/(NO DISPATCH|Return To Gate|Crew Defer|CAT I\b|CAT II|CAT III|RVSM|ETOPS|EDTO|not permitted|not allowed|prohibited)/g, '<span class="hl">$1</span>');
  function koBlock(en, ko, stale) {
    if (!ko) return `<div class="km-txt">${hl(en)}</div>`;
    return `<div class="km-tap" data-ko><div class="km-txt">${hl(en)}</div><div class="km-hint">원문을 누르면 한글 해석이 펼쳐져요 ⬇</div><div class="km-ko"><div class="kh">😊 한글 해석 <span style="color:#94a3b8;font-weight:400">· 자동 번역(참고용) · 판단은 원문 기준</span></div>${stale ? '<div class="km-stale">⚠️ 이 해석은 이전 개정판 원문 기준이에요. 원문과 다른 부분이 있을 수 있어요.</div>' : ''}${hl(ko)}</div></div>`;
  }
  function card(code, it, op, desc, kind) {
    if (!it) return `<div class="km-card miss"><div><span class="km-code">${esc(code)}</span> <span class="km-flag">${esc(kind || 'MEL')}</span></div>${desc ? `<div class="km-ofp">OFP: ${esc(desc)}</div>` : ''}<div class="km-sub">MEL 책 색인에서 이 번호를 못 찾았어요. 책에서 직접 확인하세요. (CDL 항목은 색인에 없어요)</div></div>`;
    const ri = it.ri || '–'; const flags = [];
    if (it.mm) flags.push('<span class="km-flag">(m) 정비 조치 필요</span>');
    if (it.o) flags.push('<span class="km-flag cy">(o) 운항 절차 있음</span>');
    if (/Crew Defer/.test(it.txt)) flags.push('<span class="km-flag grn">After Door Closed → Crew Defer</span>');
    if (/Return To Gate/.test(it.txt)) flags.push('<span class="km-flag red">After Door Closed → Return To Gate</span>');
    if (/NO DISPATCH/.test(it.txt)) flags.push('<span class="km-flag red">NO DISPATCH 조건 있음</span>');
    const title = it.pt && it.t && it.pt !== it.t ? `${it.pt} — ${it.t}` : (it.t || it.pt || '');
    return `<div class="km-card">
      <div><span class="km-code">${esc(code)}</span> <span class="km-flag">${esc(kind || 'MEL')}</span> ${desc ? `<span class="km-ofp">OFP: ${esc(desc)}</span>` : ''}</div>
      <div class="km-title">${esc(title)}</div>
      <div class="km-sub">ATA ${esc((it.ch || []).join('-'))}${it.appl ? ` · Applicable: ${esc(it.appl)}` : ''} · 책 p.${it.p}${op ? ` · 운항 절차 p.${op.p}` : ''}</div>
      <div class="km-grid">
        <div><span>Repair interval</span><b>${esc(ri)}</b><small>${esc(RI_KO[ri] || '')}</small></div>
        <div><span>Nbr installed</span><b>${esc(it.ni || '–')}</b></div>
        <div><span>Nbr required</span><b>${esc(it.nr || '–')}</b></div>
        <div><span>Placard</span><b>${esc(it.pl || '–')}</b></div>
      </div>
      ${flags.length ? `<div>${flags.join('')}</div>` : ''}
      ${koBlock(provisions(it.txt), it.ko, it.koh && it.h && it.koh !== it.h)}
      ${op ? `<div class="km-ops"><h4>📘 운항 절차 (O) — ${esc(op.t || '')}</h4>${koBlock(dedent(op.txt), op.ko, op.koh && op.h && op.koh !== op.h)}</div>` : (it.o ? '<div class="km-sub">(o) 절차는 책의 MEL OPERATIONAL PROCEDURES 에서 확인하세요.</div>' : '')}
    </div>`;
  }
  async function lookup(fleet, code) {
    const ata = code.slice(0, 2); const d = await getJson(`${fleet}/${ata}.json`); if (!d) return { it: null, op: null, nodata: true };
    const it = d.items[code] || null; const op = d.ops[code] || null; return { it, op };
  }

  // ---------- 렌더 ----------
  let lastSig = '';
  async function render() {
    const list = $id('km-list'), rev = $id('km-rev'); if (!list) return;
    if (!ofp()) { list.innerHTML = '<div class="kp-dim">OFP PDF를 첨부하면 표시돼요.</div>'; lastSig = ''; return; }
    const f = fleetOf(); const lines = melLines();
    const sig = f.fleet + '|' + JSON.stringify(lines); if (sig === lastSig) return; lastSig = sig;
    if (!f.fleet) { list.innerHTML = `<div class="kp-dim">기종 코드 "${esc(f.code)}"를 못 알아봤어요. 아래 검색으로 찾아보세요.</div>`; rev.textContent = ''; return; }
    const idx = await loadIndex(f.fleet);
    rev.textContent = idx ? `${idx.fleet} MEL ${idx.rev || ''} · ${idx.date || ''}` : `${FLEETS[f.fleet].name} MEL 색인 없음`;
    if (!idx) { list.innerHTML = `<div class="kp-dim">${FLEETS[f.fleet].name} MEL 색인이 아직 없어요. (A321만 들어 있어요)</div>`; return; }
    if (lines === null) { list.innerHTML = '<div class="kp-dim">OFP에서 MEL / CDL ITEMS 칸을 못 찾았어요.</div>'; return; }
    if (!lines.length) { list.innerHTML = `<div class="kp-ok">✅ MEL / CDL NIL — ${esc(f.reg)} 이연 결함 없음</div>`; return; }
    list.innerHTML = '<div class="kp-dim">찾는 중…</div>';
    const cards = [];
    for (const l of lines) { if (l.kind === 'CDL') { cards.push(card(l.code, null, null, l.desc, 'CDL')); continue; } const r = await lookup(f.fleet, l.code); cards.push(card(l.code, r.it, r.op, l.desc, 'MEL')); }
    list.innerHTML = `<div class="kp-dim">${esc(f.reg)} · ${lines.length}건</div>` + cards.join('');
  }
  // ---------- 검색 ----------
  async function search() {
    const q = ($id('km-q').value || '').trim().toUpperCase(); const res = $id('km-res'), show = $id('km-show'); show.innerHTML = ''; res.innerHTML = '';
    if (!q) return;
    const f = fleetOf().fleet || 'a321'; const idx = await loadIndex(f); if (!idx) { res.innerHTML = '<div class="kp-dim">색인이 없어요.</div>'; return; }
    const cm = q.match(/^(\d{2})-?(\d{2})?-?(\d{2})?-?(\d{2})?([A-Z])?$/);
    if (cm) { // 번호 검색 (앞부분만 넣어도 됨)
      const ata = cm[1]; const d = await getJson(`${f}/${ata}.json`); if (!d) { res.innerHTML = '<div class="kp-dim">그 챕터가 없어요.</div>'; return; }
      const pref = cm[1] + (cm[2] ? '-' + cm[2] : '') + (cm[3] ? '-' + cm[3] : '') + (cm[4] ? '-' + cm[4] : '') + (cm[5] || '');
      const hits = Object.keys(d.items).filter(c => c.startsWith(pref)).slice(0, 40);
      if (!hits.length) { res.innerHTML = '<div class="kp-dim">없어요.</div>'; return; }
      if (hits.length === 1) { show.innerHTML = card(hits[0], d.items[hits[0]], d.ops[hits[0]], '', 'MEL'); return; }
      res.innerHTML = hits.map(c => `<div class="km-hit" data-code="${c}"><b>${c}</b> ${esc(d.items[c].pt && d.items[c].t !== d.items[c].pt ? d.items[c].pt + ' — ' + d.items[c].t : d.items[c].t)}</div>`).join('');
      return;
    }
    // 문구 검색: 항목 제목 + ECAM 엔트리
    const hits = [];
    for (const a of idx.atas) { const d = await getJson(`${f}/${a}.json`); if (!d) continue; Object.keys(d.items).forEach(c => { const it = d.items[c]; if ((it.t + ' ' + it.pt).toUpperCase().includes(q)) hits.push({ c, t: it.pt && it.t !== it.pt ? it.pt + ' — ' + it.t : it.t }); }); if (hits.length > 60) break; }
    const ec = await getJson(`${f}/ecam.json`); const eh = ec ? ec.ecam.filter(e => e.t.toUpperCase().includes(q)).slice(0, 20) : [];
    if (!hits.length && !eh.length) { res.innerHTML = '<div class="kp-dim">없어요. 다른 단어로 찾아보세요.</div>'; return; }
    res.innerHTML = eh.map(e => `<div class="km-hit" data-ecam="${esc(e.t)}">⚡ ECAM <b>${esc(e.t)}</b> <span class="kp-dim">p.${e.p}</span></div>`).join('') + hits.slice(0, 60).map(h => `<div class="km-hit" data-code="${h.c}"><b>${h.c}</b> ${esc(h.t)}</div>`).join('');
  }
  panel.addEventListener('click', e => { const t = e.target.closest('[data-ko]'); if (!t || e.target.closest('.km-ko')) return; const k = t.querySelector('.km-ko'); if (k) { k.classList.toggle('on'); const h = t.querySelector('.km-hint'); if (h) h.textContent = k.classList.contains('on') ? '다시 누르면 접혀요 ⬆' : '원문을 누르면 한글 해석이 펼쳐져요 ⬇'; } });
  $id('km-go').addEventListener('click', search);
  $id('km-q').addEventListener('keydown', e => { if (e.key === 'Enter') search(); });
  $id('km-res').addEventListener('click', async e => {
    const h = e.target.closest('.km-hit'); if (!h) return; const f = fleetOf().fleet || 'a321'; const show = $id('km-show');
    if (h.dataset.code) { const r = await lookup(f, h.dataset.code); show.innerHTML = card(h.dataset.code, r.it, r.op, '', 'MEL'); show.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }
    if (h.dataset.ecam) { const ec = await getJson(`${f}/ecam.json`); const en = ec && ec.ecam.find(x => x.t === h.dataset.ecam); if (!en) return;
      const codes = [...new Set((en.txt.match(/\b\d{2}-\d{2}-\d{2}(?:-\d{2})?[A-Z]?\b/g) || []))];
      show.innerHTML = `<div class="km-card"><div class="km-title">⚡ ECAM: ${esc(en.t)} <span class="km-sub">p.${en.p}</span></div><div class="km-txt">${hl(dedent(en.txt))}</div>${codes.length ? `<div>${codes.map(c => `<span class="km-hit" style="display:inline-block;margin:2px 4px 0 0" data-code="${c}"><b>${c}</b> 열기</span>`).join('')}</div>` : ''}</div>`;
      show.querySelectorAll('[data-code]').forEach(el => el.addEventListener('click', async () => { const r = await lookup(f, el.dataset.code); show.insertAdjacentHTML('beforeend', card(el.dataset.code, r.it, r.op, '', 'MEL')); }));
    }
  });

  if (typeof renderMap === 'function') { const orig = renderMap; window.renderMap = function () { const r = orig.apply(this, arguments); setTimeout(() => { render().catch(() => {}); }, 500); return r; }; try { renderMap = window.renderMap; } catch (e) {} }
  setTimeout(() => { render().catch(() => {}); loadIndex('a321').then(idx => { const r = $id('km-rev'); if (r && !ofp()) r.textContent = idx ? `${idx.fleet} MEL ${idx.rev || ''} · ${idx.date || ''}` : '색인 없음'; }); }, 1200);
  K.mel = { lookup, search };
})();
