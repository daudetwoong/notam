#!/usr/bin/env python3
"""친절모드 조립 스크립트.
사용: python3 build.py <원본 index.html> <출력 폴더> [--v3]
  원본(fly-smart-team/notammap index.html) 끝에 src/*.js 를 끼워 넣어 index.html 을 만든다.
  --v3 : pro.js(브리핑 보조)까지 포함.
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
    o = o.replace(f'<title>{title}</title>',
        '<title>NOTAM 지도 친절모드</title>\n<meta name="apple-mobile-web-app-capable" content="yes" />\n'
        '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />\n'
        '<link rel="manifest" href="manifest.webmanifest" />\n<link rel="apple-touch-icon" href="icon.svg" />', 1)
    h1 = re.search(r'<h1[^>]*>.*?</h1>', o, re.S).group(0)
    tag = ' <span style="font-size:12px;color:#67e8f9">· 친절모드' + (' v3' if v3 else '') + '</span></h1>'
    o = o.replace(h1, '<div>' + h1.replace('</h1>', tag) +
        '<div style="font-size:10px;color:#64748b">원본: fly-smart-team/notammap · 한국어 해설·SR 구간·실시간 위치·흔들림 정보' + (' · 브리핑 보조' if v3 else '') + ' 추가</div></div>', 1)
    files = ['kind.js', 'addon.js', 'turb.js'] + (['pro.js'] if v3 else [])
    js = '\n'.join(open(os.path.join(src_dir, f), encoding='utf-8').read() for f in files)
    sw = "\n// 오프라인 캐시 등록 (https 웹 주소에서만 동작)\nif ('serviceWorker' in navigator && location.protocol === 'https:') { navigator.serviceWorker.register('sw.js').catch(() => {}); }\n"
    i = o.rfind('</body>')
    o = o[:i] + '<script>\n' + js + sw + '</script>\n' + o[i:]
    os.makedirs(out_dir, exist_ok=True)
    open(os.path.join(out_dir, 'index.html'), 'w', encoding='utf-8').write(o)
    for f in ['sw.js', 'manifest.webmanifest', 'icon.svg']:
        shutil.copy(os.path.join(src_dir, f), os.path.join(out_dir, f))
    # 캐시 이름에 빌드 식별자 → 새 버전이 올라가면 오프라인 캐시 교체
    import hashlib
    h = hashlib.sha1(o.encode('utf-8')).hexdigest()[:10]
    swp = os.path.join(out_dir, 'sw.js'); s = open(swp, encoding='utf-8').read()
    s = re.sub(r"const CACHE = '[^']*'", f"const CACHE = 'notammap-kind-{'v3' if v3 else 'v2'}-{h}'", s)
    open(swp, 'w', encoding='utf-8').write(s)
    print(f'OK: {out_dir}/index.html ({len(o):,} bytes) build {h}')

if __name__ == '__main__':
    main()
