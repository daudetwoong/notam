#!/usr/bin/env python3
"""사용: python3 -I validate_ko.py <ATA>   예) 25
out/<ATA>.json 의 모든 items/ops 코드가 ko/ko_<ATA>.json 에 한국어로 들어있는지 검사."""
import json, sys, os, re
here = os.path.dirname(os.path.abspath(__file__))
ata = sys.argv[1]
src = json.load(open(os.path.join(here, 'out', f'{ata}.json'), encoding='utf-8'))
p = os.path.join(here, 'ko', f'ko_{ata}.json')
if not os.path.exists(p): print(f'MISSING FILE {p}'); sys.exit(1)
try: ko = json.load(open(p, encoding='utf-8'))
except Exception as e: print('INVALID JSON:', e); sys.exit(1)
bad = 0
for sec in ('items', 'ops'):
    want = set(src.get(sec, {}).keys()); have = ko.get(sec, {}) if isinstance(ko.get(sec), dict) else {}
    miss = sorted(want - set(have.keys()))
    if miss: print(f'{sec}: missing {len(miss)}: {miss[:15]}'); bad += len(miss)
    for c, v in have.items():
        if c not in want: print(f'{sec}: unknown code {c}'); bad += 1; continue
        if not isinstance(v, str) or len(v.strip()) < 8: print(f'{sec}: {c} too short/empty'); bad += 1; continue
        if not re.search(r'[가-힣]', v): print(f'{sec}: {c} has no Korean'); bad += 1
        if 'Repair interval' in v and 'Nbr installed' in v: print(f'{sec}: {c} contains the table header (should be skipped)'); bad += 1
print(f'ATA {ata}: items {len(src.get("items",{}))} ops {len(src.get("ops",{}))} -> {"OK" if not bad else str(bad)+" problems"}')
sys.exit(0 if not bad else 2)
