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
- 섹션 제목 `1.`~`6.`, 요소 id: fir-list, pdf-input, dropzone, map, flt-info, fpl-input, btn-reset
- 함수: rawBlock, renderMap, notamRange, notamIsActive, tafAt, wxCat, gcDistNm, getAirportCoord, elAt, flightWindow
- 전역: visibleFir, otherNotams, pdfNav, window.__ofpText
