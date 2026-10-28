#!/usr/bin/env python3
"""친절모드 조립 스크립트.
사용: python3 build.py <원본 index.html> <출력 폴더> [--v3]
  원본(fly-smart-team/notammap index.html) 끝에 src/*.js 를 끼워 넣어 index.html 을 만든다.
  --v3 : pro.js(브리핑 보조)·mel.js(MEL 바로 보기)·data/mel 색인까지 포함.
원본 구조가 바뀌어 친절모드가 붙을 자리를 못 찾으면 종료코드 2 로 실패한다 (상충 보고용).
"""
import re, sys, os, shutil

here = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.join(here, 'src')

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    v3 = '--v3' in sys.argv
    if len(args) < 2:
        print(__doc__); sys.exit(1)
    orig_path, out_dir = args[0], args[1]
    o = open(orig_path, encoding='utf-8').read()

    # ---- 상충 검사: 친절모드가 기대하는 원본 구조 ----
    problems = []
    for need, why in [
        ('id="fir-list"', '⑤ FIR 노탐 목록 컨테이너'),
        ('id="pdf-input"', 'OFP PDF 입력'),
        ('id="dropzone"', 'PDF 드롭존'),
        ('id="map"', '지도'),
        ('id="flt-info"', '② Flight Information'),
        ('id="fpl-input"', 'FPL 입력'),
        ('id="btn-reset"', '초기화 버튼'),
        ('function rawBlock(', '지도 팝업 원문 블록 (해설 삽입 지점)'),
        ('function renderMap(', '지도 렌더 함수 (덮어쓰기 지점)'),
        ('function notamRange(', '노탐 유효기간 함수'),
        ('function notamIsActive(', '노탐 활성 판정 함수'),
        ('let visibleFir', '표시 중 FIR 노탐 목록'),
        ('otherNotams', '좌표 없는 노탐 목록'),
        ('window.__ofpText', 'OFP 전체 텍스트 (연료·바람·공지 파싱)'),
        ('function tafAt(', 'TAF 시각별 평가 함수'),
        ('function wxCat(', '기상 분류 함수'),
        ('function gcDistNm(', '대권거리 함수'),
        ('function getAirportCoord(', '공항 좌표 함수'),
        ('function elAt(', '경과시간 함수'),
        ('function flightWindow(', '비행시간창 함수'),
        ('pdfNav', '항법로그 배열'),
    ]:
        if need not in o:
            problems.append(f'{need} 없음 — {why}')
    # 섹션 구조: v89~ 는 id(sec-ofp/flt/map/brf/fir) 5개, 그 이전은 제목 번호 1.~6.
    ids = ['sec-ofp', 'sec-flt', 'sec-map', 'sec-brf', 'sec-fir']
    if all(f'id="{i}"' in o for i in ids):
        pass
    elif any(f'id="{i}"' in o for i in ids):
        problems.append('섹션 id 일부만 있음: ' + ', '.join(i for i in ids if f'id="{i}"' not in o) + ' 없음')
    else:
        secs = re.findall(r'<h2[^>]*>(.*?)</h2>', o, re.S)
        titles = [re.sub(r'<[^>]+>|\s+', ' ', s).strip() for s in secs]
        for n in ['1.', '2.', '3.', '4.', '5.', '6.']:
            if not any(t.startswith(n) for t in titles):
                problems.append(f'섹션 "{n}" 제목 없음 (현재: {titles})')
    if not re.search(r'<h1[^>]*>.*?</h1>', o, re.S):
        problems.append('h1 제목 없음')
    if problems:
        print('CONFLICT: 원본 구조가 바뀌어 친절모드를 자동으로 입힐 수 없어요.')
        for p in problems: print(' -', p)
        sys.exit(2)

    # ---- 조립 ----
    title = re.search(r'<title>(.*?)</title>', o).group(1)
    # 원본(v79~)이 manifest·apple-touch-icon·meta 를 직접 넣게 되어, 없는 것만 보충한다 (중복 방지)
    extra = ''
    if 'rel="manifest"' not in o: extra += '\n<link rel="manifest" href="manifest.webmanifest" />'
    if 'rel="apple-touch-icon"' not in o: extra += '\n<link rel="apple-touch-icon" href="icon.svg" />'
    if 'apple-mobile-web-app-capable' not in o: extra += '\n<meta name="apple-mobile-web-app-capable" content="yes" />'
    if 'apple-mobile-web-app-status-bar-style' not in o: extra += '\n<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />'
    o = o.replace(f'<title>{title}</title>', '<title>NOTAM 지도 친절모드</title>' + extra, 1)
    o = o.replace('content="NOTAM Lite"', 'content="NOTAM 친절모드"', 1)
    h1 = re.search(r'<h1[^>]*>.*?</h1>', o, re.S).group(0)
    tag = ' <span style="font-size:12px;color:#67e8f9">· 친절모드' + (' v3' if v3 else '') + '</span></h1>'
    o = o.replace(h1, '<div>' + h1.replace('</h1>', tag) +
        '<div style="font-size:10px;color:#64748b">원본: fly-smart-team/notammap · 한국어 해설·SR 구간·실시간 위치·흔들림 정보' + (' · 브리핑 보조 · MEL 바로 보기' if v3 else '') + ' 추가</div></div>', 1)
    files = ['kind.js', 'addon.js', 'turb.js', 'fpl.js'] + (['pro.js', 'mel.js'] if v3 else [])
    js = '\n'.join(open(os.path.join(src_dir, f), encoding='utf-8').read() for f in files)
    sw = '''
// 오프라인 캐시 등록 (https 웹 주소에서만 동작) · 새 버전이 내려오면 위에 안내 띠를 띄움
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  let hadCtrl = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadCtrl) { hadCtrl = true; return; }   // 첫 설치는 안내 불필요
    if (document.getElementById('kd-upd')) return;
    const b = document.createElement('div'); b.id = 'kd-upd';
    b.style.cssText = 'position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:99999;background:#0e7490;color:#fff;font-size:13px;font-weight:700;padding:10px 16px;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,.5);display:flex;gap:10px;align-items:center';
    b.innerHTML = '🆕 새 버전이 준비됐어요 <button id="kd-upd-go" style="background:#fff;color:#0e7490;border:0;border-radius:8px;padding:6px 10px;font-weight:800">새로고침</button><button id="kd-upd-x" style="background:transparent;color:#a5f3fc;border:0;font-size:16px">✕</button>';
    document.body.appendChild(b);
    b.querySelector('#kd-upd-go').onclick = () => location.reload();
    b.querySelector('#kd-upd-x').onclick = () => b.remove();
  });
  navigator.serviceWorker.register('sw.js').then(r => { try { r.update(); } catch (e) {} }).catch(() => {});
}
'''
    if "serviceWorker.register('sw.js')" in o: sw = ''   # 원본(v79~)이 직접 등록·업데이트 안내함
    # 중계 서버(ADS-B·주기장): 원본 Worker 는 fly-smart-team.github.io 출처만 허용하므로(CORS) 내 Worker 주소로 바꾼다.
    # 루트의 proxy_url.txt 에 주소 한 줄이 있으면 적용 (배포 방법: proxy/README.md). 기기에 저장된 원본 기본 주소도 무시하게 함.
    purl_path = os.path.join(here, 'proxy_url.txt')
    purl = open(purl_path, encoding='utf-8').read().strip().rstrip('/') if os.path.exists(purl_path) else ''
    if purl:
        o, n = re.subn(r"const DEFAULT_PROXY = '[^']*';", f"const DEFAULT_PROXY = '{purl}';", o, count=1)
        o, n2 = re.subn(r"!/flyacelee/\.test\(v\)", "!/flyacelee|notam-proxy\\.sapsary1/.test(v)", o, count=1)
        if n != 1 or n2 != 1:
            print('WARN: 원본의 DEFAULT_PROXY/getProxy 모양이 바뀌어 중계 주소를 바꾸지 못했어요 — 주기장·기체위치 조회가 CORS로 막힐 수 있어요 (proxy/README.md)')
        else:
            print(f'중계 서버 주소 → {purl}')
    i = o.rfind('</body>')
    o = o[:i] + '<script>\n' + js + sw + '</script>\n' + o[i:]
    os.makedirs(out_dir, exist_ok=True)
    open(os.path.join(out_dir, 'index.html'), 'w', encoding='utf-8').write(o)
    for f in ['sw.js', 'manifest.webmanifest', 'icon.svg']:
        shutil.copy(os.path.join(src_dir, f), os.path.join(out_dir, f))
    # 원본의 PNG 아이콘(apple-touch-icon 등)도 같이 (있으면)
    for f in ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png']:
        q = os.path.join(os.path.dirname(os.path.abspath(sys.argv[1])), f)
        if os.path.exists(q): shutil.copy(q, os.path.join(out_dir, f))
    # MEL 색인 데이터 (data/mel/<fleet>/*.json) → 출력폴더/mel/
    data_dir = os.path.join(here, 'data', 'mel')
    if v3 and os.path.isdir(data_dir):
        dst = os.path.join(out_dir, 'mel')
        if os.path.isdir(dst): shutil.rmtree(dst)
        shutil.copytree(data_dir, dst)
    # 캐시 이름에 빌드 식별자 → 새 버전이 올라가면 오프라인 캐시 교체
    import hashlib
    h = hashlib.sha1(o.encode('utf-8')).hexdigest()[:10]
    swp = os.path.join(out_dir, 'sw.js'); s = open(swp, encoding='utf-8').read()
    s = re.sub(r"const CACHE = '[^']*'", f"const CACHE = 'notammap-kind-{'v3' if v3 else 'v2'}-{h}'", s)
    open(swp, 'w', encoding='utf-8').write(s)
    print(f'OK: {out_dir}/index.html ({len(o):,} bytes) build {h}')

if __name__ == '__main__':
    main()
