// Uses real WebGL. Start Vite first; Playwright remains an optional local tool.
import assert from 'node:assert/strict';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined});
const base=process.env.ACRE_TEST_URL||'http://127.0.0.1:5173/';
const errors=[];
async function start(options) {
  const page=await browser.newPage(options);
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(base);
  await page.waitForFunction(()=>window.__acreDebug?.stats().surfaceTextures.every(t=>t.width>0));
  await page.locator('[data-mode="explore"]').click();
  await page.locator('#deploy-button').click();
  await page.waitForFunction(()=>window.__acreDebug.missionState().phase==='running');
  return page;
}
try {
  const page=await start({viewport:{width:1440,height:900}});
  const initial=await page.evaluate(()=>window.__acreDebug.stats());
  assert.equal(initial.quality.textureResolution,2048);
  assert.ok(initial.surfaceTextures.every(t=>t.width===2048));
  assert.equal(initial.quality.shadowResolution,2048);
  assert.ok(initial.guardModel.triangles>15000&&initial.guardModel.triangles<22000);
  assert.ok(initial.guardModel.meshDraws<=26);
  assert.equal(await page.locator('#moon-panel, #moon-bar, #light-label').count(),0);
  assert.equal(initial.vessels.merchantVessel.draws,4);
  assert.ok(initial.civilians.draws<=13);
  const shots=[['street',[9,-24,0],600],['port',[48,64,-Math.PI/2],600],
    ['market',[21,21,-.4],600],['night',[9,-24,0],1320],['dawn',[9,-24,0],380]];
  for(const [name,position,time] of shots) {
    await page.evaluate(([p,t])=>{window.__acreDebug.teleport(...p);window.__acreDebug.setWorldMinutes(t);},[position,time]);
    await page.waitForTimeout(1400);
    await page.screenshot({path:join(tmpdir(),`acre-detail-${name}.jpg`),type:'jpeg',quality:85});
  }
  await page.evaluate(()=>{const g=window.__acreDebug.guardOrders().assignments[0];window.__acreDebug.setWorldMinutes(600);
    window.__acreDebug.teleport(g.position[0]+Math.sin(g.yaw)*2.6,g.position[2]+Math.cos(g.yaw)*2.6,g.yaw,g.position[1]);});
  await page.waitForTimeout(300);
  await page.screenshot({path:join(tmpdir(),'acre-detail-guard.jpg'),type:'jpeg',quality:88});
  for(const i of [3,4]){
    await page.evaluate(index=>{const p=window.__acreDebug.civilians()[index];
      window.__acreDebug.teleport(p.x+Math.sin(p.yaw)*2.1,p.z+Math.cos(p.yaw)*2.1,p.yaw,0,-.18);},i);
    await page.waitForTimeout(100);
    await page.screenshot({path:join(tmpdir(),`acre-citizen-${i}.jpg`),type:'jpeg',quality:88});
  }
  await page.evaluate(()=>window.__acreDebug.teleport(9,-24,0));
  await page.waitForTimeout(7000);
  console.log('Desktop render sample:',await page.evaluate(()=>document.documentElement.dataset.renderStats));
  await page.close();
  const retina=await start({viewport:{width:1280,height:800},deviceScaleFactor:2});
  assert.ok((await retina.evaluate(()=>window.__acreDebug.stats().quality.pixelRatio))>1);
  await retina.waitForTimeout(14000);
  console.log('Retina render sample:',await retina.evaluate(()=>document.documentElement.dataset.renderStats));
  await retina.close();
  const compact=await start({viewport:{width:390,height:844},deviceScaleFactor:2});
  const lite=await compact.evaluate(()=>window.__acreDebug.stats());
  assert.equal(lite.quality.textureResolution,1024);
  assert.ok(lite.surfaceTextures.every(t=>t.width===1024));
  assert.equal(lite.quality.shadowResolution,1024);
  assert.equal(lite.quality.samples,0);
  await compact.screenshot({path:join(tmpdir(),'acre-detail-compact.jpg'),type:'jpeg',quality:85});
  await compact.close();
  assert.deepEqual(errors,[]);
  console.log('Visual browser checks: 2K desktop / 1K compact assets, retina rendering, bounded models, day/night/dawn screenshots, no browser or asset errors.');
} finally {await browser.close();}
