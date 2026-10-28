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

def flip_rgb(r, g, b, kind='text'):
    """어두운 바탕용 색 → 흰 바탕용 색. kind: bg | border | text. 유지해야 할 색이면 None.
    - bg: 어두운 면(L<.35)만 → 거의 흰색(채도 많이 낮춤). 채도 높은 중간 밝기(버튼·칩)는 그대로 둔다.
    - border: 어두운 선만 → 연한 회색 선. 색 있는 테두리는 그대로.
    - text: 밝은 글자만 → 진한 글자. 색 있는 글자는 Tailwind 700 정도의 깊이(L≈.3~.37)로, 회색 글자는 명도 반전."""
    h, l, sat = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    if kind == 'bg':
        if l >= 0.35 or (sat > 0.6 and l >= 0.26): return None   # 채도 높은 버튼·배너는 그대로
        l2 = 0.985 - l * 0.45
        s2 = sat * (0.3 if sat < 0.6 else 0.55)
    elif kind == 'border':
        if l >= 0.45: return None
        l2 = 0.80 + (0.45 - l) * 0.3
        s2 = sat * 0.5
    else:
        if l <= 0.5: return None
        if sat > 0.45: l2 = 0.28 + (1 - l) * 0.2; s2 = min(1, sat)
        else: l2 = min(0.5, max(0.1, 1 - l)); s2 = sat
    r2, g2, b2 = colorsys.hls_to_rgb(h, l2, s2)
    return round(r2 * 255), round(g2 * 255), round(b2 * 255)

def flip_colors(v, kind='text'):
    """값 안의 색을 바꾼다. 하나라도 '유지' 판정이면 None (규칙 전체를 그대로 둔다)."""
    keep = []
    def hx(m):
        s = m.group(1); a = ''
        if len(s) in (3, 4):
            if len(s) == 4: a = s[3] * 2
            s = ''.join(c * 2 for c in s[:3])
        elif len(s) == 8: a = s[6:]; s = s[:6]
        c = flip_rgb(int(s[:2], 16), int(s[2:4], 16), int(s[4:], 16), kind)
        if c is None: keep.append(1); return m.group(0)
        return '#%02x%02x%02x%s' % (*c, a)
    def rg(m):
        c = flip_rgb(int(m.group(2)), int(m.group(4)), int(m.group(6)), kind)
        if c is None: keep.append(1); return m.group(0)
        return f'{m.group(1)}{c[0]}{m.group(3)}{c[1]}{m.group(5)}{c[2]}'
    out = RGB.sub(rg, HEX.sub(hx, v))
    return None if keep else out

ALPHA = re.compile(r'(?:/\s*|,\s*)(0?\.\d+|1(?:\.0+)?|\d{1,3}%)\s*\)')
def translucent(v):
    """rgba(…, .3) · rgb(r g b/.3) 처럼 알파가 낮은 배경: 흰 바탕에서는 옅은 색조일 뿐이라 '버튼 배경'(글자색 유지) 취급을 하지 않는다."""
    for m in ALPHA.finditer(v):
        a = m.group(1); a = float(a[:-1]) / 100 if a.endswith('%') else float(a)
        if a < 0.6: return True
    return False

def prop_kind(p):
    if p.startswith('background'): return 'bg'
    if p.startswith('border') or p.startswith('outline'): return 'border'
    return 'text'

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
    """선언 목록 → (유지 여부, 선언들). 배경이 '유지' 색이면(버튼·칩) 규칙의 색 선언을 원래 값 그대로 다시 낸다
    (html.kd-day 접두로 우선순위가 올라가 다른 반전 규칙에 덮이지 않게)."""
    decls, orig, keep = [], [], False
    for d in split_top(body, ';'):
        if ':' not in d: continue
        p, v = d.split(':', 1); p = p.strip().lower(); v = v.strip()
        if p.startswith('--') or p in SKIP_PROPS: continue
        if not (p in COLOR_PROPS or p.startswith('border')): continue
        orig.append(f'{p}:{v}')
        k = prop_kind(p)
        nv = flip_colors(v, k)
        if nv is None:
            if k == 'bg' and (HEX.search(v) or RGB.search(v)) and not translucent(v): keep = True
            continue
        if nv != v: decls.append(f'{p}:{nv}')
    return (True, orig) if keep else (False, decls)

def _emit(nodes, ctx):
    out = []
    for node in nodes:
        if node[0] == 'at':
            if re.match(r'@media\s*print', node[1]): continue
            inner = _emit(node[2], ctx)
            if inner: out.append(node[1] + '{' + ''.join(inner) + '}')
        else:
            sels = [s for s in (x.strip() for x in split_top(node[1], ',')) if s and not EXCLUDE.search(s)]
            if not sels: continue
            kept, decls = _flip_decls(node[2])
            if kept and len(sels) == 1 and re.fullmatch(r'\.bg-[\w\\/.-]+', sels[0]):
                ctx['kept_bg'].append(sels[0])   # 유지한 색 배경(버튼·칩): 그 안의 Tailwind 글자색도 원래대로
            if len(sels) == 1 and re.fullmatch(r'\.text-[\w\\/.-]+', sels[0]):
                m = re.search(r'(?:^|;)\s*color\s*:\s*([^;]+)', node[2])
                if m: ctx['text'].append((sels[0], m.group(1).strip()))
            if decls: out.append(','.join(_prefix(s) for s in sels) + '{' + ';'.join(decls) + '}')
    return out

def _restore_text(ctx):
    """유지한 배경(.bg-sky-600 등) 안의 Tailwind 글자색은 원래 값으로 (흰 글자 버튼 등)."""
    if not ctx['kept_bg'] or not ctx['text']: return ''
    K = ':is(' + ','.join(ctx['kept_bg']) + ')'
    return ''.join(f'html.kd-day {K}{t},html.kd-day {K} {t}{{color:{v}}}' for t, v in ctx['text'])

def day_css(css, ctx=None):
    """CSS 문자열 → html.kd-day 용 반전 규칙."""
    ctx = ctx if ctx is not None else {'kept_bg': [], 'text': []}
    return ''.join(_emit(parse(css), ctx))

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
        nv = flip_colors(v, prop_kind(p))
        if nv is None or nv == v: continue
        frag = f'{p}:{v}'
        sels = [f'[style^="{frag}"]', f'[style*=";{frag}"]', f'[style*="; {frag}"]']
        out.append(','.join(f'html.kd-day {s}{NOT_INSIDE}' for s in sels) + '{' + f'{p}:{nv}!important' + '}')
    return ''.join(out)

def build(html, extra_css_list):
    """조립된 index.html 과 친절모드 CSS 문자열 목록 → <style id="kd-day"> 내용."""
    parts = ['html.kd-day{color-scheme:light}']
    ctx = {'kept_bg': [], 'text': []}
    for b in re.findall(r'<style[^>]*>(.*?)</style>', html, re.S):
        if 'leaflet-pane' in b or '#jb-doc' in b or '${' in b: continue   # Leaflet 본체·Joint Brief 문서·JS 템플릿
        parts.append(day_css(b, ctx))
    for c in extra_css_list: parts.append(day_css(c, ctx))
    parts.append(_restore_text(ctx))
    parts.append(inline_css(html))
    parts.append('html.kd-day body{background:#fff!important}')   # 바탕은 완전한 흰색
    # 오프라인 기본 지도(Natural Earth)는 canvas 에 어두운 색으로 그려지므로 색 반전 필터로 밝게 (육지 연한 회청색·바다 흰색)
    parts.append('html.kd-day .leaflet-basemap-pane canvas{filter:invert(1) hue-rotate(180deg)}html.kd-day #map,html.kd-day .leaflet-container{background:#fff}')
    return '\n'.join(p for p in parts if p)
