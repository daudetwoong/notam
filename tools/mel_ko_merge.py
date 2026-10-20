#!/usr/bin/env python3
"""번역 작업 결과(ko/ko_<ATA>.json, 코드→문자열)를 원문 해시가 붙은 보관용 형식으로 바꿔 저장.
사용: python3 mel_ko_merge.py <out 폴더(원문 json)> <ko 폴더(문자열 형식)> <보관 폴더>
보관 형식: {"items": {코드: {"h": 원문 sha1 앞 8자리, "ko": 해석}}, "ops": {...}}
이미 보관 형식인 파일은 그대로 유지하되 새 문자열이 있으면 갱신."""
import json, sys, os, glob, hashlib
src, ko, dst = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(dst, exist_ok=True)
h8 = lambda t: hashlib.sha1(t.encode('utf-8')).hexdigest()[:8]
n = 0
for f in sorted(glob.glob(os.path.join(ko, 'ko_*.json'))):
    ata = os.path.basename(f)[3:5]
    o = json.load(open(os.path.join(src, f'{ata}.json'), encoding='utf-8'))
    k = json.load(open(f, encoding='utf-8'))
    dp = os.path.join(dst, f'ko_{ata}.json')
    cur = json.load(open(dp, encoding='utf-8')) if os.path.exists(dp) else {'items': {}, 'ops': {}}
    for sec in ('items', 'ops'):
        for c, v in (k.get(sec) or {}).items():
            if c not in o.get(sec, {}): continue
            if isinstance(v, dict): cur[sec][c] = v
            else: cur[sec][c] = {'h': h8(o[sec][c]['txt']), 'ko': v}
            n += 1
    json.dump(cur, open(dp, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('merged', n)
