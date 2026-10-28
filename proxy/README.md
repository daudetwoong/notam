# 친절모드 중계 서버 (Cloudflare Worker) 배포

원본의 중계 서버(`notam-proxy.sapsary1.workers.dev`)는 `https://fly-smart-team.github.io` 출처만 허용해서,
친절모드(`https://daudetwoong.github.io`)에서 주기장·인천 운항이력·기체위치(ADS-B) 조회가 CORS 로 막힌다.
`worker.js` 는 원본 worker 와 같고 허용 출처에 daudetwoong.github.io 만 더한 사본이다. 내 Cloudflare 계정에 올려 쓴다.

## 1. Worker 만들기 (브라우저만으로, 무료)
1. https://dash.cloudflare.com 로그인(무료 계정) → Workers & Pages → Create → Create Worker.
2. 이름을 `notam-proxy-kind` 로 두고 Deploy → Edit code.
3. 편집기의 내용을 모두 지우고 이 폴더의 `worker.js` 내용을 붙여 넣기 → Deploy.
4. 주소가 `https://notam-proxy-kind.<내계정>.workers.dev` 꼴로 나온다. 브라우저에서 `…/health` 를 열어 `{"ok":true,…}` 가 보이면 됨.

## 2. 주기장·운항이력용 인증키 (ICN_KEY)
기체위치(ADS-B)는 키 없이 되고, 주기장·인천 운항이력은 공공데이터포털 키가 필요하다.
1. https://www.data.go.kr 가입 → "인천국제공항공사_항공기 운항현황 상세 조회 서비스"(`B551177/statusOfAllFltDeOdp`) 활용신청 → 보통 즉시 승인.
2. 마이페이지에서 **일반 인증키(Decoding)** 를 복사.
3. Cloudflare Worker → Settings → Variables and Secrets → Add → Type **Secret**, 이름 `ICN_KEY`, 값에 키 붙여 넣기 → Deploy.
4. `…/health` 를 다시 열어 `"icnKey":true` 확인.

## 3. 친절모드에 주소 넣기
저장소 루트의 `proxy_url.txt` 에 Worker 주소 한 줄(`https://notam-proxy-kind.<내계정>.workers.dev`)을 적고
`build.py` 로 다시 조립·푸시하면 기본 중계 주소가 바뀐다.
(임시로는 페이지 안 "내 기체 위치" 카드의 **중계 서버** 입력칸에 주소를 넣고 저장해도 그 기기에서는 바로 동작한다.)

## 원본 worker 가 바뀌면
`upstream/proxy/worker.js` 와 비교해서 `ALLOW_ORIGINS` 줄만 유지하고 나머지를 맞춘 뒤, 대시보드에서 다시 붙여 넣고 Deploy.
