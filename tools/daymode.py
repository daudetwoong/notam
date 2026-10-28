"""주간 모드 CSS 생성 (build.py 가 사용).
원본·친절모드의 CSS 는 모두 어두운 바탕 기준이라, 색만 밝기 반전(색상·채도 유지, 명도 L → 1-L)해서
`html.kd-day` 아래에만 적용되는 규칙을 만든다. 지도 위 라벨·팝업·Joint Brief 문서처럼 이미 밝거나
지도 타일 위에 놓이는 요소는 건드리지 않는다. 인라인 style="color:#…" 은 속성 선택자로 덮어쓴다.
"""
import re, colorsys

HEX = re.compile(r'#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b')
RGB = re.compile(r'(rgba?\(\s*)(\d{1,3})(\s*[, ]\s*)(\d{1,3})(\s*[, ]\s*)(\d{1,3})')
COLOR_PROPS = {'color', 'background', 'background-color', 'background-image', 'outline', 'outline-color',
               'fill', 'stroke', 'caret-color', 'accent-color', 'column-rule-color', 'text-decoration-color'}
SKIP_PROPS = {'box-shadow', 'text-shadow', 'filter', 'backdrop-filter'}
# 반전하지 않는 선택자: 지도 위 라벨/마커, Leaflet 팝업, 이미 밝은 요소, 인쇄용
EXCLUDE = re.compile(r'^\*$|^:(after|before)$|leaflet|jb-|kd-light|bg-white|kp-print|notam-poly-tooltip|notam-label|fir-mark|fix-mark|cat-badge|'
                     r'fir-map-badge|fir-badge|ac-tip|toc-tip|etp-icon|kd-srlbl|kd-tblbl|kd-plane|kp-pin|kd-upd')
NOT_INSIDE = ':not(.leaflet-pane *):not(.leaflet-popup *):not(#jb-doc *):not(.kd-light *):not(#kp-print *)'

def flip_rgb(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    l = min(0.985, max(0.09, 1 - l))
    r2, g2, b2 = colorsys.hls_to_rgb(h, l, s)
    return round(r2 * 255), round(g2 * 255), round(b2 * 255)

def flip_colors(v):
    def hx(m):
        s = m.group(1); a = ''
        if len(s) in (3, 4):
            if len(s) == 4: a = s[3] * 2
            s = ''.join(c * 2 for c in s[:3])
        elif len(s) == 8: a = s[6:]; s = s[:6]
        r, g, b = flip_rgb(int(s[:2], 16), int(s[2:4], 16), int(s[4:], 16))
        return '#%02x%02x%02x%s' % (r, g, b, a)
    def rg(m):
        r, g, b = flip_rgb(int(m.group(2)), int(m.group(4)), int(m.group(6)))
        return f'{m.group(1)}{r}{m.group(3)}{g}{m.group(5)}{b}'
    return RGB.sub(rg, HEX.sub(hx, v))

def split_top(s, sep):
    """괄호·따옴표 안은 건너뛰고 sep 로 나눈다."""
    out, depth, q, cur = [], 0, None, []
    for ch in s:
        if q:
            cur.append(ch)
            if ch == q: q = None
            continue
        if ch in '"\'': q = ch
        elif ch in '([': depth += 1
        elif ch in ')]': depth = max(0, depth - 1)
        if ch == sep and depth == 0:
            out.append(''.join(cur)); cur = []
        else: cur.append(ch)
    out.append(''.join(cur))
    return out

def parse(css):
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    nodes, i, n = [], 0, len(css)
    while i < n:
        while i < n and css[i] in ' \t\r\n': i += 1
        if i >= n: break
        j, depth, q = i, 0, None
        while j < n:
            ch = css[j]
            if q:
                if ch == q: q = None
            elif ch in '"\'': q = ch
            elif ch == '(': depth += 1
            elif ch == ')': depth -= 1
            elif depth == 0 and ch in '{;': break
            j += 1
        if j >= n: break
        prelude = css[i:j].strip()
        if css[j] == ';': i = j + 1; continue          # @import 등
        k, depth, q = j, 0, None
        while k < n:
            ch = css[k]
            if q:
                if ch == q: q = None
            elif ch in '"\'': q = ch
            elif ch == '{': depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0: break
            k += 1
        body = css[j + 1:k]
        if prelude.startswith('@'):
            if re.match(r'@(media|supports|layer|container)\b', prelude): nodes.append(('at', prelude, parse(body)))
        else:
            nodes.append(('rule', prelude, body))
        i = k + 1
    return nodes

def _prefix(sel):
    sel = sel.strip()
    if sel in ('html', ':root'): return 'html.kd-day'
    if re.match(r'html[\s.:\[>]', sel): return 'html.kd-day' + sel[4:]
    return 'html.kd-day ' + sel

def _flip_decls(body):
    decls = []
    for d in split_top(body, ';'):
        if ':' not in d: continue
        p, v = d.split(':', 1); p = p.strip().lower(); v = v.strip()
        if p.startswith('--') or p in SKIP_PROPS: continue
        if not (p in COLOR_PROPS or p.startswith('border')): continue
        nv = flip_colors(v)
        if nv != v: decls.append(f'{p}:{nv}')
    return decls

def _emit(nodes):
    out = []
    for node in nodes:
        if node[0] == 'at':
            if re.match(r'@media\s*print', node[1]): continue
            inner = _emit(node[2])
            if inner: out.append(node[1] + '{' + ''.join(inner) + '}')
        else:
            sels = [s for s in (x.strip() for x in split_top(node[1], ',')) if s and not EXCLUDE.search(s)]
            if not sels: continue
            decls = _flip_decls(node[2])
            if decls: out.append(','.join(_prefix(s) for s in sels) + '{' + ';'.join(decls) + '}')
    return out

def day_css(css):
    """CSS 문자열 → html.kd-day 용 반전 규칙."""
    return ''.join(_emit(parse(css)))

def inline_css(html):
    """HTML/JS 안의 style="…" 리터럴에서 색 선언을 모아 속성 선택자 규칙으로."""
    seen = set()
    for m in re.finditer(r'style=\\?["\']([^"\'\\]*)', html):
        for d in split_top(m.group(1), ';'):
            if ':' not in d or '$' in d: continue
            p, v = d.split(':', 1); p = p.strip().lower(); v = v.strip()
            if p.startswith('--') or p in SKIP_PROPS or not (p in COLOR_PROPS or p.startswith('border')): continue
            if '"' in v or not (HEX.search(v) or RGB.search(v)): continue
            seen.add((p, v))
    out = []
    for p, v in sorted(seen):
        nv = flip_colors(v)
        if nv == v: continue
        frag = f'{p}:{v}'
        sels = [f'[style^="{frag}"]', f'[style*=";{frag}"]', f'[style*="; {frag}"]']
        out.append(','.join(f'html.kd-day {s}{NOT_INSIDE}' for s in sels) + '{' + f'{p}:{nv}!important' + '}')
    return ''.join(out)

def build(html, extra_css_list):
    """조립된 index.html 과 친절모드 CSS 문자열 목록 → <style id="kd-day"> 내용."""
    parts = ['html.kd-day{color-scheme:light}']
    for b in re.findall(r'<style[^>]*>(.*?)</style>', html, re.S):
        if 'leaflet-pane' in b or '#jb-doc' in b or '${' in b: continue   # Leaflet 본체·Joint Brief 문서·JS 템플릿
        parts.append(day_css(b))
    for c in extra_css_list: parts.append(day_css(c))
    parts.append(inline_css(html))
    parts.append('html.kd-day body{background:#fff!important}')   # 바탕은 완전한 흰색
    # 오프라인 기본 지도(Natural Earth)는 canvas 에 어두운 색으로 그려지므로 색 반전 필터로 밝게 (육지 연한 회청색·바다 흰색)
    parts.append('html.kd-day .leaflet-basemap-pane canvas{filter:invert(1) hue-rotate(180deg)}html.kd-day #map,html.kd-day .leaflet-container{background:#fff}')
    return '\n'.join(p for p in parts if p)
