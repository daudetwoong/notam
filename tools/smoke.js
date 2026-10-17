// 간단 동작 확인: 페이지가 오류 없이 뜨고 친절모드 요소가 붙었는지 (node tools/smoke.js <index.html> [ofp.pdf])
const { chromium } = require('playwright');
(async () => {
  const [,, html, pdf] = process.argv;
  const exe = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const b = await chromium.launch(require('fs').existsSync(exe) ? { executablePath: exe } : {});
  const p = await b.newPage({ viewport: { width: 1024, height: 1366 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + require('path').resolve(html)); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => ({ toggle: !!document.querySelector('.kd-toggle'), guides: document.querySelectorAll('.kd-guide').length, sr: !!document.getElementById('kd-sr-list'), gps: !!document.getElementById('kd-gps-btn'), turb: !!document.getElementById('kd-tb-text'), pro: !!document.getElementById('kp-tl') }));
  let ofp = null;
  if (pdf) { await p.setInputFiles('#pdf-input', pdf); await p.waitForFunction(() => document.getElementById('kd-sr-diag').textContent.includes('인식'), null, { timeout: 90000 }); await p.waitForTimeout(3000);
    ofp = await p.evaluate(() => ({ nav: pdfNav.length, firCards: document.querySelectorAll('#fir-list .kd-box').length, sr: document.getElementById('kd-sr-list').innerText.slice(0, 80), tl: document.getElementById('kp-tl') ? document.querySelectorAll('#kp-tl .kp-item').length : null })); }
  console.log(JSON.stringify({ ...r, ofp, errors: errs }, null, 1));
  await b.close();
  const ok = r.toggle && r.guides >= 6 && r.sr && r.gps && r.turb && !errs.length && (!ofp || (ofp.nav > 2 && ofp.firCards >= 0));
  process.exit(ok ? 0 : 1);
})();
