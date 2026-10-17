/* ================= 😊 친절모드 (한국어 NOTAM 풀이 · 기능 안내) =================
   원본 도구 위에 덧붙이는 레이어. 외부 통신 없음 — 모든 풀이는 브라우저 안에서 규칙 기반으로 생성.
   자동 풀이는 참고용이며, 판단은 반드시 NOTAM 원문 기준. */
(function () {
  'use strict';

  // ---------- 약어 사전 ----------
  const ABBR = {
    // 상태·조치
    'CLSD': '폐쇄', 'CLOSED': '폐쇄', 'U/S': '사용 불가(고장)', 'UNSERVICEABLE': '사용 불가(고장)', 'AVBL': '사용 가능', 'NOT AVBL': '사용 불가',
    'UNAVBL': '사용 불가', 'OPR': '운영', 'OPS': '운영', 'ACT': '활성', 'ACTIVE': '활성', 'DEACT': '비활성', 'INOP': '작동 불가',
    'WIP': '공사 중', 'RESTRICTED': '제한', 'PROHIBITED': '금지', 'ESTABLISHED': '설정됨', 'EST': '설정/예정',
    'CANCELLED': '취소', 'CNL': '취소', 'CHG': '변경', 'REVISED': '개정', 'SUSPENDED': '중단', 'RESUMED': '재개',
    'UNRELIABLE': '신뢰할 수 없음', 'INTERFERENCE': '전파 간섭', 'JAMMING': '전파 방해', 'OUTAGE': '장애',
    'REQ': '요청', 'RQRD': '필요', 'REQUIRED': '필요', 'APPROVED': '승인', 'PPR': '사전 허가 필요', 'PERMIT': '허가',
    'EXC': '제외', 'EXCEPT': '제외', 'ONLY': '만', 'BTN': '사이', 'BTW': '사이', 'WI': '이내', 'WITHIN': '이내',
    'ABV': '이상(위)', 'BLW': '이하(아래)', 'AGL': '지면 기준 높이', 'AMSL': '평균해수면 기준 고도', 'MSL': '평균해수면',
    'SFC': '지표면', 'GND': '지면', 'UNL': '고도 제한 없음', 'FL': '비행고도', 'FT': 'ft', 'M': 'm', 'NM': '해리',
    'RADIUS': '반경', 'CENTERED': '중심', 'CENTRED': '중심', 'CTR': '중심/관제권', 'PSN': '위치', 'BOUNDED BY': '경계',
    'AREA': '구역', 'ZONE': '구역', 'SEGMENT': '구간', 'SEG': '구간', 'ALONG': '따라',
    // 시간
    'DLY': '매일', 'DAILY': '매일', 'H24': '24시간', 'HJ': '주간(일출~일몰)', 'HN': '야간(일몰~일출)', 'SR': '일출', 'SS': '일몰',
    'PERM': '영구', 'UFN': '추후 통보 시까지', 'EST.': '예상', 'TIL': '까지', 'TILL': '까지', 'FM': '부터', 'TO': '~',
    'MON': '월', 'TUE': '화', 'WED': '수', 'THU': '목', 'FRI': '금', 'SAT': '토', 'SUN': '일', 'HOL': '공휴일',
    // 비행장
    'RWY': '활주로', 'TWY': '유도로', 'APN': '계류장', 'THR': '활주로 시단', 'DTHR': '이설 시단', 'TORA': '이륙 활주 가능거리',
    'TODA': '이륙 가능거리', 'ASDA': '가속정지 가능거리', 'LDA': '착륙 가능거리', 'AD': '비행장', 'AP': '공항', 'ARP': '비행장 기준점',
    'STAND': '주기장', 'STD': '표준', 'ACFT': '항공기', 'MAINT': '정비', 'CONST': '공사', 'WORK': '작업', 'IN PROGRESS': '진행 중',
    'PAPI': 'PAPI(진입각 지시등)', 'ALS': '접근등', 'LGT': '등화', 'LIGHTING': '등화', 'EDGE': '가장자리', 'CL': '중심선',
    'FRICTION': '마찰계수', 'BRAKING': '제동', 'SNOW': '눈', 'ICE': '결빙', 'SLUSH': '진창눈', 'WET': '젖음',
    // 항법·통신
    'VOR': 'VOR', 'DME': 'DME', 'NDB': 'NDB', 'ILS': 'ILS', 'LOC': 'LOC(방위)', 'GP': '활공각(GP)', 'GS': '활공각',
    'TACAN': 'TACAN', 'VORTAC': 'VORTAC', 'GNSS': '위성항법(GNSS)', 'GPS': 'GPS', 'RAIM': 'RAIM(GPS 무결성)', 'RNAV': 'RNAV', 'RNP': 'RNP',
    'IAP': '계기접근절차', 'APCH': '접근', 'SID': '표준출발절차', 'STAR': '표준도착절차', 'DEP': '출발', 'ARR': '도착', 'MISSED': '복행',
    'FREQ': '주파수', 'COM': '통신', 'CPDLC': 'CPDLC(데이터링크 관제)', 'ADS-B': 'ADS-B', 'ADS-C': 'ADS-C', 'HF': 'HF', 'VHF': 'VHF',
    'SATCOM': '위성통신', 'SELCAL': 'SELCAL', 'ATIS': 'ATIS', 'RDR': '레이더', 'RADAR': '레이더', 'SSR': '2차 레이더',
    // 공역·관제
    'ATS': '항공교통업무', 'ATC': '관제', 'ACC': '지역관제소', 'APP': '접근관제', 'TWR': '관제탑', 'FIR': '비행정보구역(FIR)',
    'UIR': '상층 비행정보구역', 'CTA': '관제구역', 'TMA': '터미널관제구역', 'AWY': '항로', 'RTE': '항로', 'ROUTE': '항로',
    'ATS RTE': '항공로', 'DCT': '직항', 'WPT': '웨이포인트', 'FL': '비행고도', 'LVL': '고도', 'ALT': '고도', 'HGT': '높이',
    'RVSM': 'RVSM(수직분리 축소)', 'FLAS': '비행고도 배정체계', 'FPL': '비행계획', 'RPL': '반복비행계획', 'ACFT': '항공기',
    'TRA': '임시 제한공역', 'TSA': '임시 분리공역', 'ALTRV': '고도 예약(군 이동 등)', 'ADIZ': '방공식별구역',
    'DANGER': '위험', 'D AREA': '위험구역', 'R AREA': '제한구역', 'P AREA': '금지구역',
    'CTN': '주의', 'CAUTION': '주의', 'ADZ': '권고', 'ADVISED': '권고됨', 'PILOTS': '조종사', 'PILOT': '조종사',
    'AVOID': '회피', 'EXPECT': '예상', 'DELAY': '지연', 'REROUTE': '경로 변경', 'TFC': '교통', 'TRAFFIC': '교통',
    'FLOW': '교통량 조절', 'SLOT': '슬롯', 'ATFM': '항공교통흐름관리',
    // 활동
    'MIL': '군', 'MILITARY': '군', 'EXER': '훈련', 'EXERCISE': '훈련', 'FRNG': '사격', 'FIRING': '사격', 'GUN': '포',
    'MISSILE': '미사일', 'ROCKET': '로켓', 'LAUNCH': '발사', 'SPACE': '우주', 'DEBRIS': '잔해', 'REENTRY': '재진입',
    'UAS': '무인기', 'UAV': '무인기', 'DRONE': '드론', 'RPAS': '원격조종 항공기', 'BALLOON': '풍선', 'PJE': '낙하산 강하',
    'AEROBATIC': '곡예비행', 'FLT': '비행', 'FLIGHT': '비행', 'TEST': '시험', 'FLTCK': '비행검사', 'CHECK': '점검',
    'OBST': '장애물', 'CRANE': '크레인', 'LASER': '레이저', 'FIREWORKS': '불꽃놀이', 'VOLCANIC': '화산', 'ASH': '화산재',
    'ERUPTION': '분화', 'HIRF': '고강도 전파', 'BLASTING': '발파', 'SHIP': '선박', 'NAVY': '해군',
    // 기타
    'INFO': '정보', 'NOTAM': 'NOTAM', 'AIP': 'AIP(항공정보간행물)', 'SUP': '보충판', 'AIC': '항공정보회람', 'REF': '참조',
    'DUE': '사유:', 'DUE TO': '사유:', 'FOR': '위해', 'AND': '및', 'OR': '또는', 'OF': '의', 'ON': '에서', 'AT': '에서',
    'NORTH': '북', 'SOUTH': '남', 'EAST': '동', 'WEST': '서', 'N OF': '이북', 'S OF': '이남', 'E OF': '이동', 'W OF': '이서',
    'ACCORDANCE': '따름', 'IAW': '~에 따라', 'TEMPO': '일시적', 'TEMPORARY': '임시', 'TEMPORARILY': '임시로',
    'NEW': '신규', 'OBS': '관측', 'WX': '기상', 'SVC': '업무', 'SER': '업무', 'HR': '시간', 'HRS': '시간', 'MIN': '분',
    'COORD': '좌표', 'COORDINATES': '좌표', 'COORDINATION': '협조', 'CONTACT': '교신', 'MAX': '최대', 'MNM': '최저',
    'LTD': '제한됨', 'LIMITED': '제한됨', 'NML': '정상', 'NORMAL': '정상', 'EMERG': '비상', 'EMERGENCY': '비상',
    'ENTRY': '진입', 'EXIT': '이탈', 'INBOUND': '진입', 'OUTBOUND': '이탈', 'CROSSING': '횡단', 'BOUNDARY': '경계'
  };
  // 긴 구절부터 매칭
  const ABBR_KEYS = Object.keys(ABBR).sort((a, b) => b.length - a.length);
  const ABBR_RX = new RegExp('(?<![A-Z0-9/])(' + ABBR_KEYS.map(k => k.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&')).join('|') + ')(?![A-Z0-9/])', 'g');

  // ---------- 종류별 쉬운 설명 ----------
  const CAT_KIND = {
    volcano: ['🌋 화산 활동', '화산 분화·화산재 관련 정보예요. 화산재는 엔진 손상 위험이 있어 SIGMET·VAAC 정보와 함께 회피 여부를 확인해야 해요.'],
    gnss: ['📡 GPS/GNSS 사용 제한', '이 지역에서 GPS 신호가 불안정하거나 쓸 수 없다는 뜻이에요. RNP/RNAV 접근이나 GPS PRIMARY 상실에 대비해 지상 항법시설 백업을 확인하세요.'],
    rocket: ['🚀 로켓·우주 발사/비행시험', '로켓 발사나 잔해 낙하 가능 구역이에요. 활성 시간에는 해당 구역을 피하도록 항로가 조정될 수 있어요.'],
    altrv: ['🔒 고도 예약 구역', '군 항공기 이동 등으로 특정 고도가 예약된 구간이에요. 해당 시간·고도에는 관제가 다른 고도나 경로를 줄 수 있어요.'],
    mil: ['🎯 군 활동·사격 훈련', '군 훈련이나 사격이 있는 구역이에요. 활성 시간에는 통과가 제한될 수 있어요.'],
    prohibited: ['⛔ 비행 금지구역', '들어가면 안 되는 구역이에요.'],
    restricted: ['🚫 제한·위험구역', '조건부로만 통과할 수 있거나 위험 활동이 있는 구역이에요.'],
    crane: ['🏗️ 장애물·크레인', '높은 장애물이 새로 생긴 거예요. 주로 공항 주변 이착륙 경로에 영향을 줘요.'],
    flightcheck: ['✈️ 비행검사', '항법시설 점검용 비행이 있어요. 해당 시설 신호가 잠시 불안정할 수 있어요.'],
    fireworks: ['🎆 불꽃놀이·레이저', '불꽃놀이나 레이저 쇼가 있어요. 저고도 접근 중 레이저 눈부심에 주의하세요.'],
    navaid: ['📻 항법시설 이상', 'VOR·DME·ILS 같은 항법시설이 꺼졌거나 고장이에요. 해당 시설을 쓰는 절차와 접근 방식에 영향이 있는지 확인하세요.'],
    uas: ['🛸 무인기 비행', '드론·무인기가 비행하는 구역이에요.'],
    hirf: ['☢️ 강한 전파·레이더', '강한 전파가 나오는 곳이에요. 항공기 전자장비에 간섭 가능성이 있어요.'],
    balloon: ['🎈 관측 풍선', '기상·과학 관측 풍선이 떠 있어요.'],
    guide: ['ℹ️ 항로 운영 지침', '항로 사용 방법이나 관제 운영 지침이에요. 비행계획·FMS 경로가 지침에 맞는지 확인하세요.']
  };

  // ---------- 시간 ----------
  const pad = n => String(n).padStart(2, '0');
  const DOWK = ['일', '월', '화', '수', '목', '금', '토'];
  function fmtUtcKst(ms) {
    if (ms === null || ms === undefined) return '';
    if (ms === Infinity) return '종료 미정';
    const u = new Date(ms), k = new Date(ms + 9 * 3600e3);
    return `${u.getUTCMonth() + 1}/${u.getUTCDate()} ${pad(u.getUTCHours())}:${pad(u.getUTCMinutes())}Z` +
      ` <span class="kd-kst">(한국 ${k.getUTCMonth() + 1}/${k.getUTCDate()}(${DOWK[k.getUTCDay()]}) ${pad(k.getUTCHours())}:${pad(k.getUTCMinutes())})</span>`;
  }
  const MON3 = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
  function ownTs(s) {
    const m = String(s || '').toUpperCase().match(/(\d{2})([A-Z]{3})(\d{2})\s*(\d{2}):?(\d{2})/);
    if (!m || MON3[m[2]] === undefined) return null;
    return Date.UTC(2000 + +m[3], MON3[m[2]], +m[1], +m[4], +m[5]);
  }
  function validityKo(n) {
    let r = [null, null];
    try { r = notamRange(n); } catch (e) {}
    const to = String(n.validTo || '');
    if (r[0] == null || r[0] === Infinity) r[0] = ownTs(n.validFrom);
    if (r[1] == null || r[1] === Infinity) r[1] = ownTs(to) ?? r[1];
    const a = r[0] != null ? fmtUtcKst(r[0]) : esc(n.validFrom || '');
    let b;
    if (/PERM/.test(to)) b = '영구(종료 없음)';
    else if (/UFN/.test(to)) b = '추후 통보 시까지';
    else b = r[1] != null ? fmtUtcKst(r[1]) : esc(to);
    if (/EST/.test(to)) b += ' <span class="kd-dim">· 종료 시각은 예정(EST)이라 연장되거나 당겨질 수 있어요</span>';
    return a + ' ~ ' + b;
  }
  function scheduleKo(s) {
    if (!s) return '';
    let t = String(s).toUpperCase();
    t = t.replace(/\bH24\b/g, '24시간').replace(/\b(DAILY|DLY)\b/g, '매일').replace(/\bEXC\b/g, '제외')
      .replace(/\bSR\b/g, '일출').replace(/\bSS\b/g, '일몰')
      .replace(/\b(MON|TUE|WED|THU|FRI|SAT|SUN)\b/g, d => ({ MON: '월', TUE: '화', WED: '수', THU: '목', FRI: '금', SAT: '토', SUN: '일' })[d] + '요일')
      .replace(/\b(\d{2})(\d{2})-(\d{2})(\d{2})\b/g, '$1:$2~$3:$4Z');
    return t;
  }
  function altKo(label) {
    if (!label || label === '고도 미확인') return '고도 범위가 원문에서 따로 확인되지 않아요 (본문 확인)';
    const fmt = x => x === 'SFC' ? '지표면' : x === 'UNL' ? '제한 없음(무한)' : x.replace(/^FL0*(\d+)/, (m, v) => `FL${v.padStart(3, '0')} (약 ${(+v * 100).toLocaleString()}ft)`);
    const [lo, hi] = label.split('~').map(x => x.trim());
    return `${fmt(lo)} ~ ${fmt(hi)}`;
  }

  // ---------- 한 줄 요약 ----------
  function headline(n) {
    const u = String(n.etext || n.rawText || '').toUpperCase();
    const bits = [];
    const has = rx => rx.test(u);
    if (has(/\bRWY\b.*\bCLSD\b/)) bits.push('활주로 폐쇄');
    else if (has(/\bTWY\b.*\bCLSD\b/)) bits.push('유도로 폐쇄');
    else if (has(/\bCLSD\b|\bCLOSED\b/)) bits.push('폐쇄');
    if (has(/\b(ILS|LOC|GP)\b[^.]{0,40}(U\/S|NOT AVBL|UNSERVICEABLE|UNAVBL)/)) bits.push('ILS 사용 불가');
    else if (has(/\b(VOR|DME|NDB|TACAN|VORTAC)\b[^.]{0,40}(U\/S|NOT AVBL|UNSERVICEABLE|UNAVBL)/)) bits.push('항법시설 사용 불가');
    if (has(/GPS|GNSS/) && has(/UNRELIABLE|NOT AVBL|INTERFERENCE|JAMM|UNAVBL/)) bits.push('GPS 불안정');
    if (has(/\bOBST\b|\bCRANE\b/)) bits.push('장애물');
    if (has(/\bRESTRICTED\b|\bDANGER AREA\b/)) bits.push('제한·위험구역');
    if (has(/\bPROHIBITED\b/)) bits.push('금지구역');
    if (has(/MIL|FRNG|FIRING|EXER/)) bits.push('군 훈련/사격');
    if (has(/ROCKET|LAUNCH|SPACE|DEBRIS|RE-?ENTRY/)) bits.push('로켓/우주 활동');
    if (has(/\bUAS\b|DRONE|UNMANNED|RPAS/)) bits.push('무인기');
    if (has(/VOLCAN|ASH/)) bits.push('화산');
    if (has(/\bAWY\b|\bATS RTE\b|\bRTE\b|ROUTE/) && has(/CLSD|NOT AVBL|SUSPENDED/)) bits.push('항로 사용 제한');
    if (has(/CPDLC|ADS-?C|ADS-?B/) && has(/NOT AVBL|U\/S|OUTAGE|UNAVBL/)) bits.push('데이터링크 장애');
    if (has(/(\bFREQ\b|\bV?HF\b)[^.]{0,30}(U\/S|NOT AVBL|UNAVBL|CHG)/)) bits.push('통신 주파수 변경/장애');
    if (!bits.length && n.cat && CAT_KIND[n.cat]) bits.push(CAT_KIND[n.cat][0].replace(/^\S+\s/, ''));
    return [...new Set(bits)].slice(0, 3).join(' · ') || '일반 정보';
  }

  // ---------- 원문 단어 풀이 ----------
  function glossFound(text) {
    const u = String(text || '').toUpperCase();
    const found = new Map();
    (u.match(ABBR_RX) || []).forEach(w => {
      if (/^(AND|OR|OF|ON|AT|TO|FOR|FM|M|FT|NM|ONLY|NEW|INFO|NOTAM|VOR|DME|NDB|ILS|HF|VHF|GPS|FL)$/.test(w)) return;
      if (ABBR[w] && ABBR[w] !== w) found.set(w, ABBR[w]);
    });
    return [...found.entries()].slice(0, 18);
  }
  function literalKo(text) {
    // 약어를 한국어 단어로 바꿔 쓴 '직역' (문법은 원문 순서 그대로)
    return esc(String(text || '').toUpperCase().replace(/\s+/g, ' ').trim())
      .replace(ABBR_RX, w => ABBR[w] && ABBR[w] !== w ? `<span class="kd-w" title="${esc(w)}">${esc(ABBR[w])}</span>` : w);
  }

  // ---------- 해설 블록 ----------
  function relationKo(level, inTime, passTxt) {
    if (level === 'direct' && inTime) return ['kd-red', `🔴 <b>내 경로와 겹치고, 지나가는 시각에도 유효해요.</b> 제일 먼저 확인할 노탐이에요.${passTxt ? ` 통과 예정 ${esc(passTxt)}.` : ''}`];
    if (level === 'direct') return ['kd-amb', `🟠 내 경로와 겹치지만 <b>지나가는 시각에는 비활성</b>이에요. 출발이 지연되면 다시 확인하세요.${passTxt ? ` 통과 예정 ${esc(passTxt)}.` : ''}`];
    if (level === 'check' && inTime) return ['kd-amb', '🟡 경로가 지나는 FIR 안에 있지만 <b>경로와 직접 겹치지는 않아요.</b> 회항·우회 시 참고하세요.'];
    if (level === 'check') return ['kd-gry', '⚪ 경로 FIR 안에 있지만 직접 교차가 없고, 비행 시간대에도 비활성이에요.'];
    if (level === 'none') return ['kd-gry', '⚪ 내 경로가 지나는 FIR 밖이에요. 대부분 참고만 하면 돼요.'];
    return null;
  }
  // ---------- 동행/서행 등 방향 전용 노탐 판별 ----------
  const DIR_KO = { EAST: '동행(→동쪽)', WEST: '서행(→서쪽)', NORTH: '북행(→북쪽)', SOUTH: '남행(→남쪽)' };
  function cardinalOf(b) { b = ((b % 360) + 360) % 360; return b >= 45 && b < 135 ? 'EAST' : b >= 135 && b < 225 ? 'SOUTH' : b >= 225 && b < 315 ? 'WEST' : 'NORTH'; }
  function brg(a, b) {
    const r = Math.PI / 180, dl = (b[1] - a[1]) * r;
    const y = Math.sin(dl) * Math.cos(b[0] * r), x = Math.cos(a[0] * r) * Math.sin(b[0] * r) - Math.sin(a[0] * r) * Math.cos(b[0] * r) * Math.cos(dl);
    return (Math.atan2(y, x) / r + 360) % 360;
  }
  // 반환: null(방향 조건 없음/판정 불가) 또는 { want, mine, where, match }
  function dirCheck(text) {
    const txt = String(text || '').toUpperCase();
    const want = new Set(); let m; const rx = /\b(EAST|WEST|NORTH|SOUTH)\s?-?BOUND\b/g;
    while ((m = rx.exec(txt))) want.add(m[1]);
    if (!want.size) return null;
    let nv = [], R = [];
    try { nv = pdfNav || []; R = routeCoordinates || []; } catch (e) {}
    if (R.length < 2 || nv.length !== R.length) return null;
    // 노탐 본문에 나온 우리 경로 지점으로 그 부근의 진행 방향을 구한다 (없으면 출발→도착 전체 방향)
    const words = new Set(txt.match(/[A-Z]{3,5}/g) || []);
    const idx = []; nv.forEach((w, i) => { if (w.name && words.has(w.name) && /^[A-Z]{3,5}$/.test(w.name) && !idx.includes(i)) idx.push(i); });
    let b, where;
    if (idx.length >= 2) { const a = Math.min(...idx), z = Math.max(...idx); b = brg(R[a], R[z]); where = `${nv[a].name}→${nv[z].name} 구간`; }
    else if (idx.length === 1) { const i = idx[0]; b = brg(R[Math.max(0, i - 1)], R[Math.min(R.length - 1, i + 1)]); where = `${nv[i].name} 부근`; }
    else { b = brg(R[0], R[R.length - 1]); where = '출발→도착 전체'; }
    const mine = cardinalOf(b);
    return { want: [...want], mine, where, match: want.has(mine) };
  }
  function dirNote(n) {
    const c = dirCheck(n.etext || n.summary || ''); if (!c) return null;
    const want = new Set(c.want), mine = c.mine, where = c.where;
    const wantKo = c.want.map(d => DIR_KO[d]).join(' / ');
    if (want.has(mine)) return ['kd-red', `🧭 <b>${esc(wantKo)} 전용</b> 노탐이고, 오늘 우리 진행 방향(${esc(where)}, ${DIR_KO[mine]})과 <b>같아요.</b> 적용 대상일 수 있으니 본문을 꼭 읽어보세요.`];
    return ['kd-gry', `🧭 <b>${esc(wantKo)} 전용</b> 노탐이에요. 오늘 우리는 ${esc(where)}에서 <b>${DIR_KO[mine]}</b>이라 <b>반대 방향 편용 — 해당 없을 가능성이 커요.</b> (자동 판정이라 본문으로 한 번 더 확인하세요)`];
  }
  function explainHtml(n, ctx, light) {
    ctx = ctx || {};
    const cat = n.cat && CAT_KIND[n.cat];
    const rel = ctx.level ? relationKo(ctx.level, ctx.inTime, ctx.passTxt) : null;
    const gl = glossFound(n.etext);
    let dn = null; try { dn = dirNote(n); } catch (e) {}
    const sched = n.schedule ? `<div><b>⏰ 시간대</b> ${esc(n.schedule)} → <span class="kd-ko">${esc(scheduleKo(n.schedule))}</span> <span class="kd-dim">(이 시간에만 활성)</span></div>` : '';
    return `<div class="kd-box ${light ? 'kd-light' : ''}">
      <div class="kd-head">😊 쉬운 해설 <span class="kd-dim">· 자동 풀이(참고용)</span></div>
      <div class="kd-title">${esc(headline(n))}</div>
      ${rel ? `<div class="kd-rel ${rel[0]}">${rel[1]}</div>` : ''}
      ${dn ? `<div class="kd-rel ${dn[0]}">${dn[1]}</div>` : ''}
      ${cat ? `<div><b>${cat[0]}</b> — ${cat[1]}</div>` : ''}
      <div><b>📅 유효기간</b> ${validityKo(n)}</div>
      ${sched}
      <div><b>↕️ 고도</b> ${esc(altKo(n.limits))}</div>
      <details class="kd-more"><summary>원문을 한국어 단어로 풀어보기</summary>
        <div class="kd-lit">${literalKo(n.etext || n.summary || '')}</div>
        ${gl.length ? `<div class="kd-gloss">${gl.map(([k, v]) => `<span><b>${esc(k)}</b> ${esc(v)}</span>`).join('')}</div>` : ''}
        <div class="kd-dim">약어만 바꿔 쓴 직역이라 어순이 어색할 수 있어요. 최종 판단은 원문 기준이에요.</div>
      </details>
    </div>`;
  }

  // ---------- 스타일 ----------
  const css = `
  .kd-toggle{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;padding:6px 12px;border-radius:999px;border:1px solid #0e7490;background:#083344;color:#a5f3fc;cursor:pointer;-webkit-tap-highlight-color:transparent}
  body:not(.kind-on) .kd-toggle{background:#1e293b;color:#94a3b8;border-color:#334155}
  body:not(.kind-on) .kind{display:none!important}
  .kd-box{margin-top:4px;border:1px solid #155e75;background:rgba(8,51,68,.55);border-radius:10px;padding:8px 10px;font-size:12px;line-height:1.6;color:#e2e8f0;display:flex;flex-direction:column;gap:3px}
  .kd-box b{color:#f8fafc}
  .kd-head{font-size:11px;font-weight:800;color:#67e8f9}
  .kd-title{font-size:13px;font-weight:800;color:#fff}
  .kd-rel{border-radius:8px;padding:4px 8px;font-size:12px}
  .kd-red{background:rgba(225,29,72,.22);border:1px solid rgba(244,63,94,.5)}
  .kd-amb{background:rgba(217,119,6,.18);border:1px solid rgba(245,158,11,.45)}
  .kd-gry{background:rgba(51,65,85,.4);border:1px solid #334155}
  .kd-dim{color:#94a3b8;font-size:11px}
  .kd-kst{color:#7dd3fc}
  .kd-ko{color:#a7f3d0}
  .kd-more summary{cursor:pointer;color:#7dd3fc;font-size:12px;padding:2px 0}
  .kd-lit{font-family:ui-monospace,Menlo,monospace;font-size:11px;background:rgba(2,6,23,.6);border-radius:6px;padding:6px;margin:4px 0;white-space:pre-wrap;word-break:break-word}
  .kd-w{color:#6ee7b7;font-family:inherit;border-bottom:1px dotted #34d399}
  .kd-gloss{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0}
  .kd-gloss span{font-size:11px;background:#0f172a;border:1px solid #334155;border-radius:6px;padding:1px 6px}
  .kd-light{background:#ecfeff;border-color:#a5f3fc;color:#0f172a}
  .kd-light b,.kd-light .kd-title{color:#0f172a}.kd-light .kd-head{color:#0e7490}.kd-light .kd-dim{color:#64748b}
  .kd-light .kd-kst{color:#0369a1}.kd-light .kd-ko{color:#047857}.kd-light .kd-more summary{color:#0369a1}
  .kd-light .kd-lit{background:#f1f5f9}.kd-light .kd-w{color:#047857}.kd-light .kd-gloss span{background:#fff;border-color:#cbd5e1}
  .kd-light .kd-red{background:#ffe4e6;border-color:#fda4af}.kd-light .kd-amb{background:#fef3c7;border-color:#fcd34d}.kd-light .kd-gry{background:#f1f5f9;border-color:#cbd5e1}
  .kd-guide{border:1px solid #155e75;background:rgba(8,51,68,.35);border-radius:12px;padding:8px 12px;font-size:12.5px;line-height:1.65;color:#cbd5e1}
  .kd-guide>summary{cursor:pointer;font-weight:800;color:#67e8f9;font-size:12.5px;list-style:none;padding:2px 0}
  .kd-guide>summary::before{content:'💡 '}
  .kd-guide ul{margin:6px 0 2px;padding-left:18px;list-style:disc}.kd-guide li{margin:3px 0}
  .kd-guide b{color:#f1f5f9}
  .kd-start{max-width:72rem;margin:12px auto 0;padding:0 16px}
  .kd-start .kd-guide{font-size:13px}
  .kd-steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;margin-top:8px}
  .kd-steps div{background:rgba(2,6,23,.5);border:1px solid #1e3a4a;border-radius:10px;padding:8px 10px}
  .kd-steps i{font-style:normal;display:inline-block;width:20px;height:20px;border-radius:50%;background:#0e7490;color:#fff;text-align:center;font-weight:800;font-size:12px;line-height:20px;margin-right:6px}
  .kd-others{display:flex;flex-direction:column;gap:6px}
  .kd-oitem{border:1px solid #1e293b;background:#020617;border-radius:10px;padding:6px 10px}
  .kd-oitem>summary{cursor:pointer;font-size:12px;color:#e2e8f0;list-style:none}
  .kd-oitem.kd-off{opacity:.6}
  .kd-tag{font-size:10px;padding:1px 6px;border-radius:6px;margin-left:4px}
  /* 아이패드 터치 편의 */
  @media (pointer:coarse){ #fir-list button,#btn-copy-all,#mm-copy{min-height:32px;padding-left:10px;padding-right:10px} input[type=checkbox],input[type=radio]{width:18px!important;height:18px!important} select{min-height:32px} .leaflet-popup-content{font-size:13px} }
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // ---------- 토글 ----------
  let on = true;
  try { const v = localStorage.getItem('kindMode'); if (v === '0') on = false; } catch (e) {}
  document.body.classList.toggle('kind-on', on);
  const hdr = document.querySelector('header > div');
  if (hdr) {
    hdr.style.display = 'flex'; hdr.style.alignItems = 'center'; hdr.style.justifyContent = 'space-between'; hdr.style.gap = '8px'; hdr.style.flexWrap = 'wrap';
    const btn = document.createElement('button');
    btn.className = 'kd-toggle';
    const paint = () => { btn.textContent = on ? '😊 친절모드 켜짐' : '😐 친절모드 꺼짐'; btn.title = '해설·안내문을 켜고 꺼요. SR 구간·실시간 위치·흔들림 정보 기능은 항상 보여요.'; };
    paint();
    btn.addEventListener('click', () => {
      on = !on; document.body.classList.toggle('kind-on', on); paint();
      try { localStorage.setItem('kindMode', on ? '1' : '0'); } catch (e) {}
      try { renderMap(false); } catch (e) {}
    });
    hdr.appendChild(btn);
  }

  // ---------- 안내문 ----------
  const guide = (title, items, open) => {
    const d = document.createElement('details'); d.className = 'kd-guide kind'; if (open) d.open = true;
    d.innerHTML = `<summary>${title}</summary><ul>${items.map(x => `<li>${x}</li>`).join('')}</ul>`;
    return d;
  };
  const start = document.createElement('div'); start.className = 'kd-start kind';
  start.innerHTML = `<details class="kd-guide" open><summary>처음이라면 이렇게 쓰세요</summary>
    <div class="kd-steps">
      <div><i>1</i><b>OFP PDF 올리기</b><br>① 칸에 OFP를 넣으면 경로·노탐·TAF·SR을 자동으로 읽어요. 아이패드는 <b>파일 앱</b>에서 고르면 돼요.</div>
      <div><i>2</i><b>비행 개요 확인</b><br>② Flight Information에서 시각·연료·고도와 <b>🌪️ SR 4 이상 구간</b>을 봐요.</div>
      <div><i>3</i><b>공항 노탐</b><br>③ 출발·목적·교체, ④ ERA 공항 노탐을 운항 시간대 기준으로 걸러서 봐요.</div>
      <div><i>4</i><b>항로 노탐 · 지도</b><br>⑤ 🔴 경로 교차 노탐부터 <b>😊 쉬운 해설</b>을 읽고, ⑥ 지도에서 위치와 ✈️ 내 위치를 확인해요.</div>
    </div>
    <div class="kd-dim" style="margin-top:6px">🔒 PDF는 이 기기 안에서만 읽혀요. 인터넷으로 전송되지 않아요. 자동 해설은 참고용이에요. 판단은 꼭 원문과 회사 브리핑 자료로 하세요.</div></details>`;
  const main = document.querySelector('main'); if (main) main.parentNode.insertBefore(start, main);

  const secByNum = n => [...document.querySelectorAll('main section')].find(sc => { const h = sc.querySelector('h2'); return h && h.textContent.trim().startsWith(n + '.'); });
  const put = (sec, el) => { if (!sec) return; const h = sec.querySelector('h2'); const anchor = h && h.parentElement !== sec ? h.parentElement : h; anchor ? anchor.after(el) : sec.prepend(el); };
  const secs = [1, 2, 3, 4, 5, 6].map(secByNum);
  put(secs[0], guide('① 이 칸은 뭐예요?', [
    '<b>OFP PDF 첨부</b>: OFP의 항법로그·FPL·NOTAM 패키지·TAF를 자동으로 읽어요. 출발·도착, ETD/ETA, 경로 웨이포인트가 아래 회색 칸에 나타나요.',
    '<b>FPL 직접 붙여넣기</b>: PDF가 없으면 FPL 전문을 붙여넣고 <b>경로 적용</b>을 눌러도 돼요. (SR 구간은 OFP PDF가 있어야 나와요)',
    '읽기에 실패한 단계가 있을 때만 ❌ 진단 칸이 나타나요. 아무것도 안 보이면 정상이에요.'
  ]));
  put(secs[1], guide('② Flight Information 보는 법', [
    '편명·기종·등록부호, 출발/목적/교체 공항과 <b>UTC·현지시각</b>, 비행시간·연료·순항고도가 한눈에 나와요.',
    '<b>실시간 기상</b>은 인터넷이 될 때만 METAR·기온을 불러와요. 공항 코드만 외부 기상 사이트로 보내고, OFP 내용은 보내지 않아요.',
    '<b>🌪️ SR 4 이상 구간</b>(아래에 추가): 항법로그의 SR(Shear Rate, 수직 윈드시어 지수)이 4 이상인 구간을 <b>이륙 후 몇 분부터 몇 분간</b>인지 보여줘요. 구간을 누르면 ⑥ 지도에서 보라색으로 표시돼요. 그 시간대는 좌석벨트 사인·기내 서비스 타이밍을 미리 생각해두면 좋아요.',
    '<b>📍 실시간 위치</b>: 아이패드 위치 서비스로 들어오는 GPS(블루투스 GPS 포함)를 받아 지도에 비행기를 표시해요.',
    '<b>🌀 흔들림 정보 → 지도</b>: 난기류 보고 텍스트를 붙여넣으면 좌표·웨이포인트·고도·원인을 읽어 지도에 그려요. 인터넷 없이 돼요.'
  ]));
  put(secs[2], guide('③ Package 1 공항 노탐 보는 법', [
    '<b>출발·목적·교체</b> 탭을 눌러 공항별 시설 노탐(활주로·유도로·게이트·항법시설·접근 minimum 등)을 봐요.',
    '<b>운항시간 필터링</b>: 출발은 ETD, 도착은 ETA 시간대에 유효한 것만 남겨요. 끄면 전체가 보여요.',
    '<b>실제 ETD 입력 / +15·+30·+60분</b>: 지연되면 바뀐 시각으로 다시 걸러줘요. 지연 때문에 새로 걸리는 노탐을 놓치지 않게 해줘요.',
    '<b>퀵턴</b>: 복편 시간대까지 같이 보고 싶을 때 써요.',
    '🚨 <b>유사 콜사인 주의</b> 배지는 회사 공지(COAD)에 내 편명과 비슷한 콜사인이 있을 때 떠요.',
    '카드를 누르면 원문·한국어 요약·FMS 좌표가 크게 열려요.'
  ]));
  put(secs[3], guide('④ Package 2 ERA 노탐 보는 법', [
    'OFP에 적힌 <b>ERA(항로상 교체공항)</b>를 골라서 그 공항 노탐을 봐요. 여러 개를 같이 고를 수 있어요.',
    '기준은 <b>조정 ETD</b>예요. 회항 가능성이 있는 시간대에 그 공항이 쓸 만한지 확인하는 용도예요.'
  ]));
  put(secs[4], guide('⑤ FIR 노탐 목록 보는 법', [
    '<b>🔴 경로 교차</b>: 내 비행경로 선이 노탐 구역을 실제로 지나가요.',
    '<b>🟠 경로 FIR 내</b>: 같은 FIR 안이지만 경로와 직접 겹치지는 않아요. <b>⚪ 경로 무관</b>: 지나가는 FIR 밖이에요.',
    '<b>통과시각 유효</b>: 그 구역을 지나가는 예상 시각 ±30분 안에 노탐이 살아 있어요.',
    '<b>FMS 좌표</b>: 노탐 좌표를 FMS 입력 형식으로 바꾼 거예요. 복사해서 쓰세요.',
    '각 카드의 <b>😊 쉬운 해설</b>에 한 줄 요약, 내 비행과의 관계, 한국시간 유효기간, 고도가 정리돼 있어요.'
  ]));
  put(secs[5], guide('⑥ 지도·버튼 설명', [
    '<b>FIR 구간 표시</b>: 경로를 FIR별 색으로 나눠요. 구간 선을 누르면 통과시각과 좌표 없는 노탐 목록이 떠요.',
    '<b>온라인 상세지도</b>: 인터넷이 될 때 OpenStreetMap을 덧씌워요. 꺼도 기본 지도는 오프라인으로 보여요.',
    '<b>ETP·EEP·EXP·CP</b>: ETP는 두 공항까지 시간이 같은 지점, EEP/EXP는 EDTO 구간 진입·이탈점이에요.',
    '<b>EDTO threshold 원 · B042 교체공항</b> <span class="kd-dim">(EDTO 비행에서만)</span>: 기종별 기준 거리 원과 운영기준 승인 공항이에요.',
    '<b>🌪️ 보라색 굵은 선</b>: SR 4 이상 구간이에요. <b>✈️ 아이콘</b>: 실시간 내 위치예요.',
    '<b>좌표 입력 · FMS 변환</b>: 노탐 좌표를 붙여넣으면 FMS 형식으로 바꾸고 지도에 그려요.'
  ]));

  // ---------- 노탐 카드에 해설 붙이기 ----------
  function decorateCards() {
    if (!Array.isArray(visibleFir)) return;
    const box = document.getElementById('fir-list'); if (!box) return;
    const cards = box.children;
    visibleFir.forEach((r, i) => {
      const card = cards[i]; if (!card || card.querySelector('.kd-box')) return;
      const det = card.querySelector('details');
      const wrap = document.createElement('div'); wrap.className = 'kind';
      wrap.innerHTML = explainHtml(r.n, { level: r.level, inTime: r.inTime, passTxt: r.passTxt });
      det ? card.insertBefore(wrap, det) : card.appendChild(wrap);
    });
    renderOthers();
  }

  // ---------- 좌표 없는 일반 노탐 한국어 목록 ----------
  const oSec = document.createElement('section');
  oSec.className = 'kind bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3';
  oSec.innerHTML = `<div class="flex items-center justify-between flex-wrap gap-2"><h2 class="font-bold text-sm flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>😊 좌표 없는 노탐 · 한국어 풀이</h2><span id="kd-ocount" class="text-[11px] text-slate-400 mono"></span></div>
    <div class="kd-dim" style="font-size:12px">지도에 그릴 좌표가 없는 노탐(항로 지침, 통신, 공항 시설 등)이에요. <b style="color:#e2e8f0">비행시간에 유효한 것</b>이 위에 와요. 눌러서 펼치면 해설이 나와요.</div>
    <div id="kd-olist" class="kd-others" style="max-height:620px;overflow-y:auto"></div>`;
  if (secs[4]) secs[4].after(oSec);
  function renderOthers() {
    const list = document.getElementById('kd-olist'); if (!list) return;
    let arr = [];
    try { arr = Array.isArray(otherNotams) ? otherNotams : []; } catch (e) {}
    if (!arr.length) { list.innerHTML = '<div class="kd-dim" style="text-align:center;padding:8px">OFP PDF를 첨부하면 표시돼요.</div>'; document.getElementById('kd-ocount').textContent = ''; return; }
    const rows = arr.map(n => { let a = true; try { a = notamIsActive(n); } catch (e) {} return { n, a }; })
      .sort((x, y) => (y.a - x.a) || String(x.n.notamId).localeCompare(String(y.n.notamId)));
    const act = rows.filter(r => r.a).length;
    document.getElementById('kd-ocount').textContent = `비행시간 유효 ${act} / 전체 ${rows.length}`;
    list.innerHTML = rows.slice(0, 300).map(r => `<details class="kd-oitem ${r.a ? '' : 'kd-off'}"><summary>
        <b class="mono" style="color:#7dd3fc">${esc(r.n.notamId)}</b>
        <span class="kd-tag" style="background:${r.a ? '#064e3b' : '#1e293b'};color:${r.a ? '#6ee7b7' : '#94a3b8'}">${r.a ? '비행시간 유효' : '비활성'}</span>
        ${(r.n.airports || []).length ? `<span class="kd-dim">${esc(r.n.airports.join('·'))}</span>` : ''}
        <div style="font-weight:700;margin-top:2px">${esc(headline(r.n))}</div>
        <div class="kd-dim" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.n.summary || '')}</div></summary>
        ${explainHtml(r.n, null, false)}
        <pre class="kd-lit" style="color:#cbd5e1">${esc(r.n.rawText || '')}</pre></details>`).join('');
  }

  const firList = document.getElementById('fir-list');
  if (firList) new MutationObserver(() => decorateCards()).observe(firList, { childList: true });

  // ---------- 지도 팝업에 해설 붙이기 ----------
  if (typeof rawBlock === 'function') {
    const orig = rawBlock;
    window.rawBlock = function (n) {
      const base = orig(n);
      if (!document.body.classList.contains('kind-on')) return base;
      let ctx = null;
      try { const r = (visibleFir || []).find(x => x.n === n); if (r) ctx = { level: r.level, inTime: r.inTime, passTxt: r.passTxt }; } catch (e) {}
      return explainHtml(n, ctx, true) + base;
    };
    try { rawBlock = window.rawBlock; } catch (e) {}
  }

  window.__kd = window.__kd || {}; window.__kd.headline = headline; window.__kd.explainHtml = explainHtml; window.__kd.dirCheck = dirCheck;
  decorateCards();
  try { renderMap(false); } catch (e) {}
})();
