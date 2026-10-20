#!/usr/bin/env python3
"""MEL PDF → v3용 색인 JSON.
사용: python3 mel_extract.py <MEL.pdf> <출력폴더> [--ko <한국어 해석 폴더>]
  --ko 폴더의 ko_<ATA>.json ({"items":{코드:{"h":원문해시,"ko":해석}},"ops":{...}}) 을 합친다.
  원문 해시가 달라진 항목은 해석을 넣되 koh(이전 해시)를 남겨 UI가 "이전 개정판 기준" 경고를 띄운다.
  출력폴더/index.json         : 개정·날짜·챕터 목록·항목 수
  출력폴더/<ATA 2자리>.json     : { items: {코드: {...}}, ops: {코드: {...}} }
  출력폴더/ecam.json           : MEL ENTRIES (ECAM 경고문 → 관련 항목 본문)
pdftotext -layout 결과를 페이지(\\f) 단위로 읽어 MI(항목)·MO(운항절차)·ME(ECAM 엔트리)를 나눈다.
"""
import re, sys, os, json, subprocess, hashlib

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    ko_dir = sys.argv[sys.argv.index('--ko') + 1] if '--ko' in sys.argv else None
    pdf, out = args[0], args[1]
    os.makedirs(out, exist_ok=True)
    txt = subprocess.run(['pdftotext', '-layout', pdf, '-'], capture_output=True, text=True).stdout
    pages = txt.split('\f')
    if pages and not pages[-1].strip(): pages = pages[:-1]
    foot_rx = re.compile(r'^AAR A321 FLEET\s+([A-Z]+(?:-[A-Z]+)*)(?:-(\d{2})(?:-(\d{2}))?)?\s+P\s+(\d+)/(\d+)', re.M)
    date_rx = re.compile(r'^MEL\s.*?(\d{2} [A-Z]{3} \d{2})\s*$', re.M)
    rev = None; rev_date = None
    # 개정 번호: 파일명 또는 서문의 REV
    m = re.search(r'R(\d{2,3})', os.path.basename(pdf)); rev = ('R' + m.group(1)) if m else None

    def body_lines(p):
        """머리글·바닥글·장식 줄 제거."""
        ls = p.split('\n'); out = []; started = False
        for l in ls:
            s = l.strip()
            if not started:
                if s == 'MINIMUM EQUIPMENT LIST': started = True
                continue
            if s.startswith('AAR A321 FLEET'): break
            if s in ('Continued on the following page', 'Continued from the previous page', 'Intentionally left blank'): continue
            out.append(l.rstrip())
        return out

    sec_of = {}; chap_of = {}; chapters = {}
    HEAD = {'MEL ITEMS': 'MI', 'MEL OPERATIONAL PROCEDURES': 'MO', 'MEL ENTRIES': 'ME', 'MEL PREAMBLE': 'MP'}
    import datetime
    dates = []
    for i, p in enumerate(pages):
        ls = [l.strip() for l in p.split('\n') if l.strip()]
        # 머리글(페이지 맨 위) 우선: 'MEL ITEMS' 등 → 섹션, '25-24 - ...' → 챕터
        sec = HEAD.get(ls[0]) if ls else None
        f = foot_rx.search(p)
        if sec is None and f: sec = f.group(1)
        if sec is None: continue
        sec_of[i] = sec
        c = next((re.match(r'^(\d{2})-(\d{2}) - ', l) for l in ls[:4] if re.match(r'^(\d{2})-(\d{2}) - ', l)), None)
        chap_of[i] = (c.group(1), c.group(2)) if c else ((f.group(2), f.group(3)) if f else None)
        for d in re.findall(r'(\d{2} [A-Z]{3} \d{2})\s*$', p, re.M):
            try: dates.append(datetime.datetime.strptime(d, '%d %b %y'))
            except Exception: pass
        h = next((re.match(r'^(\d{2}) - ([A-Z0-9 /&()\-]+)$', l) for l in ls[:3] if re.match(r'^(\d{2}) - ([A-Z0-9 /&()\-]+)$', l)), None)
        if h: chapters[h.group(1)] = h.group(2).strip()
    if dates: rev_date = max(dates).strftime('%d %b %y').upper()

    code_sub = re.compile(r'^\s{0,6}(\d{2}-\d{2}-\d{2}[A-Z])\b\s*(.*)$')
    code_par = re.compile(r'^\s{0,2}(\d{2}-\d{2}-\d{2})\s{2,}(\S.*)$')
    code_any = re.compile(r'^\s{0,6}(\d{2}-\d{2}-\d{2}[A-Z]?)\s*(.*)$')
    tbl_hdr = re.compile(r'Repair interval\s+Nbr installed\s+Nbr required\s+Placard')

    items = {}; ops = {}; ecam = []
    # ---------- MI: 항목 ----------
    cur = None; parent = {'code': '', 't': '', 'ident': '', 'appl': ''}
    def close():
        nonlocal cur
        if cur:
            cur['txt'] = '\n'.join(cur['_l']).strip('\n'); del cur['_l']
            tm = tbl_hdr.search(cur['txt'])
            if tm:
                after = cur['txt'][tm.end():].split('\n')
                vals = next((re.split(r'\s{2,}', x.strip()) for x in after if x.strip()), [])
                if len(vals) >= 4: cur['ri'], cur['ni'], cur['nr'], cur['pl'] = vals[:4]
            cur['o'] = '(o)' in cur['txt']; cur['mm'] = '(m)' in cur['txt']
            items[cur['code']] = cur; cur = None
    for i, p in enumerate(pages):
        if sec_of.get(i) != 'MI': continue
        for l in body_lines(p):
            mp = code_par.match(l)
            if mp and not code_sub.match(l):
                close(); parent = {'code': mp.group(1), 't': mp.group(2).strip(), 'ident': '', 'appl': ''}; continue
            ms = code_sub.match(l)
            if ms:
                close(); cur = {'code': ms.group(1), 't': ms.group(2).strip(), 'pt': parent['t'] if parent['code'] == ms.group(1)[:-1] else '', 'p': i + 1, 'ch': chap_of.get(i), '_l': []}; continue
            s = l.strip()
            if s.startswith('Ident.:'):
                parent['ident'] = s[7:].strip()
                if cur: cur['_l'].append(l)
                continue
            if s.startswith('Applicable to:'):
                parent['appl'] = s[14:].strip()
                if cur: cur['appl'] = parent['appl']
                continue
            if cur is not None: cur['_l'].append(l)
    close()
    # 제목 없는 하위 항목은 상위 제목 사용, 제목이 다음 줄로 넘어간 경우 보정
    for c, it in items.items():
        if not it['t'] and it['pt']: it['t'] = it['pt']
        if not it.get('pt'):
            pc = c[:-1]
            it['pt'] = next((x['pt'] for k, x in items.items() if k[:-1] == pc and x.get('pt')), '')
        if not it['t'] and it['txt']:
            first = it['txt'].split('\n')[0].strip()
            if first and not tbl_hdr.search(first): it['t'] = first
    # ---------- MO: 운항 절차 ----------
    cur = None; pending = []
    def close_o():
        nonlocal cur, pending
        if cur:
            body = '\n'.join(cur['_l']).strip('\n')
            for c in cur['codes']: ops[c] = {'t': cur['t'], 'p': cur['p'], 'txt': body}
            cur = None
    for i, p in enumerate(pages):
        if sec_of.get(i) != 'MO': continue
        for l in body_lines(p):
            ma = code_any.match(l)
            if ma and (cur is None or cur.get('ident') is not None or not cur['_l'] or True):
                code, rest = ma.group(1), ma.group(2).strip()
                # 새 엔트리 시작 조건: 직전 엔트리가 Ident 를 이미 가졌거나 비어 있음
                if cur and cur.get('ident') is None and not cur['_l']:
                    cur['codes'].append(code)
                    if rest: cur['t'] = rest
                else:
                    close_o(); cur = {'codes': [code], 't': rest, 'p': i + 1, 'ident': None, '_l': []}
                continue
            s = l.strip()
            if cur is None: continue
            if s.startswith('Ident.:'): cur['ident'] = s[7:].strip(); continue
            if s.startswith('Applicable to:'): continue
            if cur['ident'] is None and not cur['t'] and s: cur['t'] = s; continue
            if cur['ident'] is None and s and not cur['_l']:
                # 제목이 두 줄인 경우
                cur['t'] = (cur['t'] + ' ' + s).strip(); continue
            cur['_l'].append(l)
    close_o()
    # ---------- ME: ECAM 엔트리 ----------
    cur = None
    for i, p in enumerate(pages):
        if sec_of.get(i) != 'ME': continue
        for l in body_lines(p):
            s = l.strip()
            if s.startswith('ECAM Alert:') or s.startswith('Ident.: ME-') and cur is None:
                if s.startswith('ECAM Alert:'):
                    if cur: cur['txt'] = '\n'.join(cur['_l']).strip('\n'); del cur['_l']; ecam.append(cur)
                    cur = {'t': s[11:].strip(), 'p': i + 1, '_l': []}
                continue
            if cur is None: continue
            if s.startswith('Ident.:') or s.startswith('Applicable to:'): continue
            cur['_l'].append(l)
    if cur: cur['txt'] = '\n'.join(cur['_l']).strip('\n'); del cur['_l']; ecam.append(cur)

    # ---------- 원문 해시 + 한국어 해석 합치기 ----------
    h8 = lambda t: hashlib.sha1(t.encode('utf-8')).hexdigest()[:8]
    for it in items.values(): it['h'] = h8(it['txt'])
    for op in ops.values(): op['h'] = h8(op['txt'])
    stale = []; missing = []
    if ko_dir:
        import glob
        for f in glob.glob(os.path.join(ko_dir, 'ko_*.json')):
            k = json.load(open(f, encoding='utf-8'))
            for sec, store in (('items', items), ('ops', ops)):
                for c, v in (k.get(sec) or {}).items():
                    if c not in store: continue
                    if isinstance(v, str): v = {'h': store[c]['h'], 'ko': v}
                    store[c]['ko'] = v['ko']; store[c]['koh'] = v.get('h', '')
                    if v.get('h') != store[c]['h']: stale.append(c)
        missing = [c for c, it in items.items() if 'ko' not in it] + [c for c, op in ops.items() if 'ko' not in op]
        print(f"ko: stale {len(stale)} {stale[:10]} · missing {len(missing)} {missing[:10]}")
    # ---------- 출력 ----------
    by_ata = {}
    for c, it in items.items(): by_ata.setdefault(c[:2], {'items': {}, 'ops': {}})['items'][c] = it
    for c, op in ops.items(): by_ata.setdefault(c[:2], {'items': {}, 'ops': {}})['ops'][c] = op
    for ata, d in by_ata.items():
        json.dump(d, open(os.path.join(out, f'{ata}.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    json.dump({'ecam': ecam}, open(os.path.join(out, 'ecam.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    h = hashlib.sha1(open(pdf, 'rb').read()).hexdigest()[:10]
    idx = {'fleet': 'A321', 'rev': rev, 'date': rev_date, 'src': os.path.basename(pdf), 'hash': h, 'pages': len(pages),
           'chapters': dict(sorted(chapters.items())), 'atas': sorted(by_ata.keys()), 'items': len(items), 'ops': len(ops), 'ecam': len(ecam)}
    json.dump(idx, open(os.path.join(out, 'index.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f"items {len(items)} · ops {len(ops)} · ecam {len(ecam)} · atas {len(by_ata)} · rev {rev} {rev_date}")
    sz = sum(os.path.getsize(os.path.join(out, f)) for f in os.listdir(out))
    print(f"total {sz/1e6:.2f} MB")

if __name__ == '__main__':
    main()
