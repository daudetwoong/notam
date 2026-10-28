# 원본(fly-smart-team/notammap) 변경 반영 절차

이 저장소는 원본 `index.html` 위에 `src/*.js`(친절모드 레이어)를 끼워 넣어 만든 결과물입니다.
원본이 바뀌면 아래 순서로 다시 조립합니다. (주 1회 예약 작업이 같은 순서로 돕니다)

1. 원본 받기: `git clone --depth 1 https://github.com/fly-smart-team/notammap.git upstream`
2. 변경 확인: `git -C upstream rev-parse HEAD` 를 `upstream_commit.txt` 와 비교. 같으면 끝.
3. 조립:
   - 기존 버전(루트): `python3 build.py upstream/index.html .`
   - v3(브리핑 보조): `python3 build.py upstream/index.html v3 --v3`
   - 종료코드 2 = **상충**: 원본 구조가 바뀌어 친절모드가 붙을 자리를 못 찾음. 출력된 항목을 사람에게 보고하고 올리지 않는다.
4. 동작 확인(가능하면): `node tools/smoke.js index.html` / `node tools/smoke.js v3/index.html` (playwright 필요)
5. `upstream_commit.txt` 를 새 해시로 갱신하고 커밋·푸시. GitHub Actions 가 Pages 에 배포한다.
6. 사람에게 보고: 원본 커밋 메시지 요약, 바뀐 섹션/기능, 상충 여부.

## 친절모드가 의존하는 원본 구조 (build.py 가 검사)
- 섹션: v89~ 는 id `sec-ofp/sec-flt/sec-map/sec-brf/sec-fir` (1 OFP·2 Flight Info·3 지도·4 노탐 브리핑·5 FIR), 그 이전은 제목 `1.`~`6.` · 요소 id: fir-list, pdf-input, dropzone, map, flt-info, fpl-input, btn-reset
- 함수: rawBlock, renderMap, notamRange, notamIsActive, tafAt, wxCat, gcDistNm, getAirportCoord, elAt, flightWindow
- 전역: visibleFir, otherNotams, pdfNav, window.__ofpText
- 원본 v79~ 가 manifest·apple-touch-icon·서비스 워커 등록(`serviceWorker.register('sw.js')`)을 직접 넣으므로 build.py 는 없는 것만 보충하고 등록 코드를 생략한다. `src/sw.js` 는 원본 sw.js(network-first) 기반이니 원본 sw.js 가 바뀌면 같이 맞춘다.

## 중계 서버 (주기장·인천 운항이력·기체위치 ADS-B)
- 원본의 Worker(`notam-proxy.sapsary1.workers.dev`)는 `fly-smart-team.github.io` 출처만 허용(CORS)해서 친절모드 주소에서는 조회가 실패한다. 그래서 내 Cloudflare Worker 를 따로 쓴다 — 배포 방법은 `proxy/README.md`.
- 루트 `proxy_url.txt` 에 내 Worker 주소가 있으면 `build.py` 가 원본의 `DEFAULT_PROXY` 를 그 주소로 바꾼다(없으면 원본 그대로). 바꾸지 못하면 WARN 을 출력하니 보고에 적는다.
- 원본 `proxy/worker.js` 가 바뀌면 `proxy/worker.js` 도 `ALLOW_ORIGINS` 줄만 유지하고 맞춘 뒤, 사람이 Cloudflare 대시보드에 다시 올려야 한다(자동 배포 아님) — 보고에 적는다.

## MEL 바로 보기 데이터 (v3)
- `data/mel/<기종>/*.json` 은 MEL PDF에서 `tools/mel_extract.py` 로 만든 색인(항목·운항절차·ECAM 엔트리)이고, `build.py --v3` 가 `v3/mel/` 로 복사한다. 원본(notammap)과 무관하므로 원본 업데이트 때 그대로 유지한다.
- MEL 개정판이 나오면: `python3 tools/mel_extract.py <새 MEL.pdf> data/mel/a321 --ko data/mel-ko/a321` → 출력의 `stale`(원문이 바뀐 항목)·`missing`(새 항목) 목록을 다시 번역해 `data/mel-ko/a321/ko_<ATA>.json` 에 반영(`tools/mel_ko_merge.py`) → 다시 조립·푸시.
- 한국어 해석은 `data/mel-ko/<기종>/ko_<ATA>.json` (원문 해시 포함)에 보관한다. 해시가 다르면 UI가 "이전 개정판 기준" 경고를 띄운다.
