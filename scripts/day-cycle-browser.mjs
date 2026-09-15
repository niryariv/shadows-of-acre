import assert from "node:assert/strict";
import {tmpdir} from "node:os";
import {join} from "node:path";
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||"playwright");
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on("pageerror",e=>errors.push(e.message));
page.on("console",e=>{if(e.type()==="error")errors.push(e.text());});
page.on("response",r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
const state=()=>page.evaluate(()=>window.__acreDebug.missionState());
const teleport=(x,z,yaw=0)=>page.evaluate(p=>window.__acreDebug.teleport(...p),[x,z,yaw]);
const setTime=value=>page.evaluate(v=>window.__acreDebug.setWorldMinutes(v),value);
const start=async(mode="explore",time="600")=>{
  await page.goto(process.env.ACRE_TEST_URL||"http://127.0.0.1:5173/");
  await page.waitForFunction(()=>Boolean(window.__acreDebug));
  await page.locator("#arrival-time").selectOption(time);
  await page.locator(`[data-mode="${mode}"]`).click();
  await page.locator("#deploy-button").click();
  await page.waitForFunction(()=>document.pointerLockElement&&window.__acreDebug.missionState().phase==="running");
};
try {
  await start();
  assert.equal(await page.locator('#moon-panel, #moon-bar, #light-label').count(),0);
  const sightChecks=await page.evaluate(()=>{
    const d=window.__acreDebug,found={sun:null,shade:null,wall:null};
    for(let x=-86;x<82;x+=4)for(let z=-74;z<66;z+=4){
      if(d.blockedAt(x,z))continue;
      for(const [dx,dz] of [[4,0],[0,4],[-4,0],[0,-4]]){
        if(d.blockedAt(x+dx,z+dz))continue;
        const result=d.sightProbe([x,z],[x+dx,z+dz],600);
        if(result.visible)found[result.sunlit?'sun':'shade']||=result;
        else found.wall||=result;
      }
      if(Object.values(found).every(Boolean))return found;
    }
    return found;
  });
  assert.ok(sightChecks.sun?.visible&&sightChecks.shade?.visible,'Guards see targets in sun AND shade with open line of sight');
  assert.equal(sightChecks.sun.range,sightChecks.shade.range);
  assert.equal(sightChecks.sun.recognition,sightChecks.shade.recognition);
  assert.equal(sightChecks.wall?.visible,false,'Solid masonry still blocks nearby sight');
  console.log('Passed: no exposure HUD, identical sun/shade visibility, solid cover blocks sight');
  await teleport(9,-24);
  await page.waitForTimeout(1800);
  assert.equal((await state()).cycle.population,32);
  await page.screenshot({path:join(tmpdir(),"acre-day.jpg"),type:"jpeg",quality:80});
  const advancing=(await state()).worldMinutes;
  await page.waitForTimeout(1200);
  assert.ok((await state()).worldMinutes>advancing+.4);
  await page.keyboard.down("m");
  const mapped=await state(); await page.waitForTimeout(600);
  assert.equal((await state()).worldMinutes,mapped.worldMinutes);
  await page.keyboard.press("r");
  assert.equal((await state()).worldMinutes,mapped.worldMinutes+60);
  assert.deepEqual((await state()).player,mapped.player);
  await page.keyboard.up("m");
  console.log("Passed: natural clock, paused map, one-hour rest without movement");

  await teleport(92,-71,Math.PI/2);await setTime(1079.8);
  await page.waitForFunction(()=>window.__acreDebug.missionState().cycle.night);
  assert.equal((await state()).cycle.gateClosed,false);
  assert.equal(await page.evaluate(()=>window.__acreDebug.blockedAt(92,-71)),false);
  await teleport(100,-71,Math.PI/2);
  await page.waitForFunction(()=>window.__acreDebug.missionState().cycle.gateClosed);
  await page.keyboard.down("w");await page.waitForTimeout(2600);await page.keyboard.up("w");
  assert.ok((await state()).player[0]>92.7);
  assert.match((await state()).guidance.label,/Gate closed/);
  await setTime(1799.8); // Day 2, just before dawn.
  await page.waitForFunction(()=>!window.__acreDebug.missionState().cycle.night);
  assert.equal((await state()).cycle.gateClosed,false);
  await page.keyboard.down("w");await page.waitForTimeout(1200);await page.keyboard.up("w");
  assert.ok((await state()).player[0]<91);
  console.log("Passed: gate occupancy safety, real collision at night and natural reopening at dawn");

  await teleport(9,-24);await setTime(1200);await page.waitForTimeout(1400);
  assert.equal((await state()).cycle.population,2);
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.starFieldFixed),"true");
  await page.screenshot({path:join(tmpdir(),"acre-night.jpg"),type:"jpeg",quality:80});
  await page.evaluate(()=>document.exitPointerLock());
  await page.waitForFunction(()=>window.__acreDebug.missionState().phase==="paused");
  const paused=await state();await page.waitForTimeout(500);
  assert.equal((await state()).worldMinutes,paused.worldMinutes);
  for(let i=0;i<24;i++)await page.locator("#rest-button").click();
  assert.equal((await state()).worldMinutes,paused.worldMinutes+1440);
  assert.deepEqual((await state()).player,paused.player);
  assert.equal((await state()).phase,"paused");
  await page.screenshot({path:join(tmpdir(),"acre-rest.jpg"),type:"jpeg",quality:80});
  console.log("Passed: night population, fixed stars, pause, 24-hour rest rollover");

  await start("explore","1200");
  await teleport(-107,-11,-Math.PI/2);
  await page.waitForFunction(()=>document.documentElement.dataset.inWater==="true");
  assert.equal((await state()).access.suspicious,true);
  await page.mouse.down({button:"right"});
  await page.waitForFunction(()=>document.documentElement.dataset.submerged==="true");
  await page.waitForTimeout(500);
  assert.equal((await state()).detection,0);
  await page.mouse.up({button:"right"});
  console.log("Passed: night coastal watch applies outside the city; diving remains concealed");

  await start("stealth");
  for(let i=0;i<45;i++) {
    await page.evaluate(()=>{
      const guard=window.__acreDebug.guardOrders().assignments[5];
      window.__acreDebug.teleport(guard.position[0]+Math.sin(guard.yaw)*2.5,guard.position[2]+Math.cos(guard.yaw)*2.5);
    });
    await page.waitForTimeout(100);
  }
  assert.equal((await state()).phase,"running");assert.equal((await state()).detection,0);
  assert.equal((await state()).access.suspicious,false);
  await setTime(1200);
  for(let i=0;i<100&&(await state()).phase!=="ended";i++) {
    await page.evaluate(()=>{
      const guard=window.__acreDebug.guardOrders().assignments[5];
      window.__acreDebug.teleport(guard.position[0]+Math.sin(guard.yaw)*2.5,guard.position[2]+Math.cos(guard.yaw)*2.5);
    });
    await page.waitForTimeout(100);
  }
  assert.equal((await state()).phase,"ended");
  console.log("Passed: innocent daytime visitor ignored; same public street policed at night");
  assert.deepEqual(errors,[]);
  console.log("No runtime, console or asset errors.");
} finally {await browser.close();}
