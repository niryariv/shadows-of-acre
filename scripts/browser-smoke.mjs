// Install Playwright locally or set PLAYWRIGHT_MODULE to an existing package.
// Run against a Vite dev server; debug helpers are excluded from production.
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const failures = [];
const base = process.env.ACRE_TEST_URL || "http://127.0.0.1:5173/";
const page = await browser.newPage({ viewport: {width:1280,height:800} });
page.on("pageerror", error => failures.push(error.message));
page.on("console", message => { if(message.type()==="error") failures.push(message.text()); });
page.on("response", response => { if(response.status()>=400) failures.push(`${response.status()} ${response.url()}`); });
const state = () => page.evaluate(() => window.__acreDebug.missionState());
const teleport = (x,z,yaw=0,floorY=0) => page.evaluate(p => window.__acreDebug.teleport(...p),[x,z,yaw,floorY]);
const start = async (mode="explore",route="gate") => {
  await page.goto(base);
  await page.waitForFunction(()=>Boolean(window.__acreDebug));
  await page.locator(`[data-mode="${mode}"]`).click();
  await page.locator(`[data-route="${route}"]`).click();
  await page.locator("#deploy-button").click();
  await page.waitForFunction(()=>window.__acreDebug.missionState().phase==="running");
};
try {
  await start();
  await page.screenshot({path:join(tmpdir(),"acre-final-game.jpg"),type:"jpeg",quality:75});
  assert.match(await page.locator("#bearing").textContent(),/W\s+270/);
  await page.keyboard.down("w"); await page.mouse.down();
  await page.waitForFunction(()=>window.__acreDebug.missionState().player[0]<86,{},{timeout:15000});
  await page.keyboard.up("w"); await page.mouse.up();
  console.log("Passed: real movement through the gate");

  await page.keyboard.down("m");
  const mapped = await state();
  const mapTimer = await page.locator("#timer").textContent();
  await page.keyboard.down("w"); await page.waitForTimeout(1100);
  assert.deepEqual((await state()).player,mapped.player);
  assert.equal(await page.locator("#timer").textContent(),mapTimer);
  assert.equal(await page.locator(".map-orders").isVisible(),true);
  await page.keyboard.press("n");
  assert.match(await page.locator("#tour-title").textContent(),/Montmusard/);
  await page.screenshot({path:join(tmpdir(),"acre-final-map.jpg"),type:"jpeg",quality:85});
  await page.keyboard.up("w"); await page.keyboard.up("m");
  console.log("Passed: map freezes patrol time and movement; historical tour works");

  await page.keyboard.down("w");
  await page.evaluate(()=>window.dispatchEvent(new Event("blur")));
  await page.waitForFunction(()=>window.__acreDebug.missionState().phase==="paused" && !document.pointerLockElement);
  await page.locator('#pause-screen [data-setting="reducedMotion"]').check();
  await page.locator("#resume-button").click();
  await page.waitForTimeout(350);
  const resumed = (await state()).player;
  await page.waitForTimeout(600);
  assert.ok((await state()).player.every((value,index)=>Math.abs(value-resumed[index])<0.000001));
  await page.keyboard.up("w");
  console.log("Passed: pause clears held movement and comfort setting persists");

  // Collision probe: walk straight into the Hospitaller north hall.
  await teleport(-31,-48,0);
  await page.keyboard.down("w"); await page.waitForTimeout(1100); await page.keyboard.up("w");
  assert.ok((await state()).player[2]>=-51.55);

  // Actual dispatch / stair / extraction interactions, no mission state edits.
  await teleport(-30,-41,0);
  await page.keyboard.down("e");
  await page.waitForFunction(()=>window.__acreDebug.missionState().stage==="extract",{},{timeout:15000});
  await page.keyboard.up("e");
  await teleport(-59,58,0);
  await page.keyboard.down("e"); await page.waitForFunction(()=>window.__acreDebug.missionState().inTunnel);
  await page.keyboard.up("e");
  assert.ok((await state()).player[1]<0);
  await teleport(35.2,50,-Math.PI/2,-5.25);
  await page.waitForTimeout(1300); await page.keyboard.down("e");
  await page.waitForFunction(()=>!window.__acreDebug.missionState().inTunnel);
  await page.keyboard.up("e");
  await teleport(51,64,0);
  await page.keyboard.down("e");
  await page.waitForFunction(()=>window.__acreDebug.missionState().phase==="ended");
  await page.keyboard.up("e");
  assert.match(await page.locator("#end-title").textContent(),/COMPLETE/);
  console.log("Passed: collision, dispatch, both tunnel stairs and extraction");

  for(const route of ["genoese-rope","templar-rope","pisan-breach"]) {
    await start("explore",route);
    assert.equal(await page.evaluate(()=>document.documentElement.dataset.inWater),"true");
    await page.mouse.down({button:"right"}); await page.waitForTimeout(350);
    assert.equal(await page.evaluate(()=>document.documentElement.dataset.submerged),"true");
    await page.keyboard.down("w"); await page.waitForTimeout(4800);
    const atFoundation = (await state()).player;
    await page.waitForTimeout(800);
    const stillBlocked = (await state()).player;
    assert.ok(Math.hypot(stillBlocked[0]-atFoundation[0],stillBlocked[2]-atFoundation[2])<0.03);
    assert.equal((await state()).enteredCity,false);
    await page.keyboard.up("w");
    await page.mouse.up({button:"right"});
    await page.keyboard.down("w");
    await page.waitForFunction(()=>window.__acreDebug.missionState().enteredCity,{},{timeout:12000});
    await page.keyboard.up("w");
    await page.waitForFunction(()=>document.documentElement.dataset.inWater==="false");
    assert.equal(await page.evaluate(()=>document.documentElement.dataset.inWater),"false");
    console.log(`Passed: swim, dive and climb at ${route}`);
  }

  // Re-enter using a different rope after already arriving in the city.
  await teleport(-107,-11,-Math.PI/2,-1.54);
  await page.waitForFunction(()=>document.documentElement.dataset.inWater==="true");
  await page.keyboard.down("w");
  await page.waitForFunction(()=>window.__acreDebug.missionState().player[0]>-98,{},{timeout:12000});
  await page.keyboard.up("w");
  assert.match(await page.locator("#objective").textContent(),/EXPLORE/);
  console.log("Passed: ropes remain usable after returning to the sea");

  await start("stealth");
  await page.keyboard.down("m");
  assert.equal(await page.locator(".map-orders").isVisible(),true);
  await page.keyboard.up("m");
  // Stand in front of a guard until the real perception system confirms us.
  for(let i=0;i<100&&(await state()).phase!=="ended";i++) {
    await page.evaluate(()=>{
      const g=window.__acreDebug.guardOrders().assignments[4];
      window.__acreDebug.teleport(g.position[0]+Math.sin(g.yaw)*2.5,g.position[2]+Math.cos(g.yaw)*2.5);
    });
    await page.waitForTimeout(100);
  }
  assert.equal((await state()).phase,"ended");
  assert.equal(await page.locator("#end-title").textContent(),"COMPROMISED");
  console.log("Passed: Mission mode fails on visual confirmation");

  await page.goto(base); await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>Boolean(window.__acreDebug));
  await page.locator("#deploy-button").scrollIntoViewIfNeeded();
  assert.equal(await page.locator("#deploy-button").isVisible(),true);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:join(tmpdir(),"acre-final-narrow.jpg"),type:"jpeg",quality:75});
  assert.deepEqual(failures,[]);
  console.log("Passed: narrow layout; no page, console or failed asset errors");
} finally { await browser.close(); }
