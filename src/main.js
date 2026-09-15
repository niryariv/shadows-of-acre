import "./style.css";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildArena, mergeGeometries } from "./arena.js";
import { StealthAudio } from "./audio.js";
import { createNavigator, routeLength } from "./navigation.js";
import { createCartographer } from "./cartography.js";
import { HISTORIC_STOPS, SETTING_NOTE } from "./history.js";
import { DEFAULT_TIME, MINUTES_PER_REAL_SECOND, timeOfDay, accessAt, hearingScale, sightConditions, canRest } from "./day-cycle.js";
import { loomTexture } from "./visual-detail.js";
import { createGuardFigure } from "./character-models.js";
import { createCityLife } from "./city-life.js";

const $ = (id) => document.getElementById(id);
const canvas = $("game");
const mapCanvas = $("map-canvas");
const drawMap = createCartographer(mapCanvas);
const settings = { brightness: 1.08, sensitivity: 1, reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches };
try {
  const saved = JSON.parse(localStorage.getItem("acre-settings") || "null");
  if (Number.isFinite(saved?.brightness)) settings.brightness = Math.max(.8, Math.min(1.5, saved.brightness));
  if (Number.isFinite(saved?.sensitivity)) settings.sensitivity = Math.max(.4, Math.min(2, saved.sensitivity));
  if (typeof saved?.reducedMotion === "boolean") settings.reducedMotion = saved.reducedMotion;
} catch { /* Storage may be unavailable in a private or embedded session. */ }
const devFastInteractions =
  import.meta.env.DEV && new URLSearchParams(location.search).has("qa-fast");
const devAutoWalk =
  import.meta.env.DEV && new URLSearchParams(location.search).has("qa-walk");
const devAutoDive =
  import.meta.env.DEV && new URLSearchParams(location.search).has("qa-dive");
const devFastBreath =
  import.meta.env.DEV && new URLSearchParams(location.search).has("qa-breath");
const devGuardAudioTest =
  import.meta.env.DEV && new URLSearchParams(location.search).has("qa-audio");
const devGuardAlertTest =
  import.meta.env.DEV && new URLSearchParams(location.search).has("qa-alert-audio");
const devCoverTestId =
  import.meta.env.DEV && new URLSearchParams(location.search).get("qa-cover");
const waterSurfaceY = 0.02;
const waterFloorY = -1.54;
const compactDevice = innerWidth <= 820 || matchMedia("(pointer: coarse)").matches;
const renderQuality = {
  minPixelRatio: compactDevice ? 0.85 : 1,
  maxPixelRatio: Math.min(devicePixelRatio, compactDevice ? 1.25 : 2),
  pixelRatio: Math.min(devicePixelRatio, compactDevice ? 1 : 1.5),
  upgradeWindows: 0,
  lastFps: 60,
  shadows: true,
};
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(renderQuality.pixelRatio);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
renderer.info.autoReset = false;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = settings.brightness;

const scene = new THREE.Scene();
const surfaceBackgroundColor = new THREE.Color(0x030815);
const tunnelBackgroundColor = new THREE.Color(0x070706);
const waterBackgroundColor = new THREE.Color(0x021521);
scene.background = surfaceBackgroundColor.clone();
scene.fog = new THREE.Fog(0x13243a, 68, 240);
const surfaceFogColor = new THREE.Color(0x13243a);
const tunnelFogColor = new THREE.Color(0x12110e);
const waterFogColor = new THREE.Color(0x0a3548);

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.04, 280);
camera.rotation.order = "YXZ";
scene.add(camera);
const viewLight = new THREE.PointLight(0xb8ccff, 0.14, 3.2, 2);
viewLight.position.set(0.25, 0.3, -0.4);
camera.add(viewLight);

const moonDirection = new THREE.Vector3(0.46, 0.76, 0.46).normalize();
const lightDirection = moonDirection.clone();
const sunDirection = new THREE.Vector3();
const nightSky = new THREE.Group();
nightSky.name = "Moon and stars";
scene.add(nightSky);
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(258, 32, 16),
  new THREE.ShaderMaterial({
    uniforms: { daylight: {value: 1}, twilight: {value: 0} },
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `
      varying vec3 vSkyPosition;
      void main() {
        vSkyPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vSkyPosition;
      uniform float daylight;
      uniform float twilight;
      void main() {
        float height = clamp(normalize(vSkyPosition).y, 0.0, 1.0);
        vec3 horizon = vec3(0.035, 0.075, 0.135);
        vec3 zenith = vec3(0.002, 0.008, 0.028);
        vec3 color = mix(horizon, zenith, pow(height, 0.58));
        color += vec3(0.018, 0.03, 0.045) * exp(-height * 12.0);
        vec3 dayColor = mix(vec3(0.64,0.76,0.81),vec3(0.12,0.39,0.68),pow(height,0.5));
        color = mix(color,dayColor,daylight);
        color += vec3(0.22,0.06,0.01) * twilight * exp(-height*5.0);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  }),
);
sky.name = "Mediterranean night sky";
nightSky.add(sky);
let starSeed = 73129;
const starRandom = () => {
  starSeed = (starSeed * 16807) % 2147483647;
  return (starSeed - 1) / 2147483646;
};
const starPositions = [];
for (let index = 0; index < (compactDevice ? 360 : 620); index += 1) {
  const azimuth = starRandom() * Math.PI * 2;
  const elevation = -0.04 + starRandom() * 0.97;
  const horizontal = Math.sqrt(Math.max(0, 1 - elevation * elevation));
  const radius = 246;
  starPositions.push(
    Math.cos(azimuth) * horizontal * radius,
    elevation * radius,
    Math.sin(azimuth) * horizontal * radius,
  );
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(starPositions, 3),
);
const stars = new THREE.Points(
  starGeometry,
  new THREE.PointsMaterial({
    color: 0xcbd9ff,
    size: compactDevice ? 0.8 : 1.05,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    fog: false,
  }),
);
stars.frustumCulled = false;
nightSky.add(stars);
const fixedCelestialRotation = new THREE.Quaternion();
const fixedStarAnchor = new THREE.Vector3(
  starPositions[0],
  starPositions[1],
  starPositions[2],
);

const moonCanvas = document.createElement("canvas");
moonCanvas.width = moonCanvas.height = 256;
const moonContext = moonCanvas.getContext("2d");
const moonHalo = moonContext.createRadialGradient(128, 128, 34, 128, 128, 120);
moonHalo.addColorStop(0, "rgba(211,226,255,.42)");
moonHalo.addColorStop(0.36, "rgba(151,185,255,.12)");
moonHalo.addColorStop(1, "rgba(100,150,255,0)");
moonContext.fillStyle = moonHalo;
moonContext.fillRect(0, 0, 256, 256);
moonContext.beginPath();
moonContext.arc(128, 128, 43, 0, Math.PI * 2);
moonContext.fillStyle = "#e7e9d7";
moonContext.fill();
[
  [111, 114, 9, 0.11],
  [143, 101, 6, 0.09],
  [139, 137, 11, 0.08],
  [116, 148, 5, 0.12],
  [151, 121, 4, 0.1],
].forEach(([x, y, radius, opacity]) => {
  moonContext.beginPath();
  moonContext.arc(x, y, radius, 0, Math.PI * 2);
  moonContext.fillStyle = `rgba(83,93,101,${opacity})`;
  moonContext.fill();
});
const moonTexture = new THREE.CanvasTexture(moonCanvas);
moonTexture.colorSpace = THREE.SRGBColorSpace;
const moon = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: moonTexture,
    color: 0xffffff,
    transparent: true,
    depthWrite: false,
    fog: false,
  }),
);
moon.position.copy(moonDirection).multiplyScalar(222);
moon.scale.set(18, 18, 1);
moon.name = "Moon";
nightSky.add(moon);
const sun = new THREE.Sprite(new THREE.SpriteMaterial({map:moonTexture,color:0xffe6ac,transparent:true,depthWrite:false,fog:false}));
sun.scale.set(15,15,1);
sun.name = "Sun";
nightSky.add(sun);

const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.24;
pmremGenerator.dispose();

// Multisample geometry edges without FXAA blurring fine texture detail.
const renderTarget = new THREE.WebGLRenderTarget(innerWidth, innerHeight, {
  type: THREE.HalfFloatType,
  samples: compactDevice ? 0 : Math.min(2, renderer.capabilities.maxSamples),
});
const composer = new EffectComposer(renderer, renderTarget);
composer.addPass(new RenderPass(scene, camera));
const gradePass = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    void main() {
      vec3 color = texture2D(tDiffuse, vUv).rgb;
      float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
      color = mix(vec3(luma), color, 0.94);
      color = (color - 0.5) * 1.015 + 0.5;
      color += vec3(-0.014, 0.006, 0.038) * smoothstep(0.48, 1.0, luma);
      color += vec3(-0.012, 0.002, 0.024) * smoothstep(0.5, 0.0, luma);
      float vignette = smoothstep(0.84, 0.28, length(vUv - 0.5));
      color *= mix(0.95, 1.0, vignette);
      // No film grain: preserve masonry, mail and distant silhouettes.
      gl_FragColor = vec4(color, 1.0);
    }
  `,
});
composer.addPass(gradePass);
const fxaaPass = new ShaderPass(FXAAShader);
fxaaPass.enabled = compactDevice;
composer.addPass(fxaaPass);
composer.addPass(new OutputPass());

function applyRenderSize() {
  renderer.setPixelRatio(renderQuality.pixelRatio);
  renderer.setSize(innerWidth, innerHeight);
  composer.setPixelRatio(renderQuality.pixelRatio);
  composer.setSize(innerWidth, innerHeight);
  fxaaPass.material.uniforms.resolution.value.set(
    1 / Math.max(1, innerWidth * renderQuality.pixelRatio),
    1 / Math.max(1, innerHeight * renderQuality.pixelRatio),
  );
}

applyRenderSize();

const ambient = new THREE.HemisphereLight(0x536c9d, 0x080b14, 0.38);
scene.add(ambient);
const moonLight = new THREE.DirectionalLight(0xa9c7ff, 1.16);
const moonTarget = new THREE.Object3D();
scene.add(moonTarget);
moonLight.target = moonTarget;
moonLight.position.copy(moonDirection).multiplyScalar(92);
moonLight.castShadow = true;
const shadowResolution = compactDevice ? 1024 : 2048;
moonLight.shadow.mapSize.set(shadowResolution, shadowResolution);
moonLight.shadow.camera.left = -47;
moonLight.shadow.camera.right = 47;
moonLight.shadow.camera.top = 47;
moonLight.shadow.camera.bottom = -47;
moonLight.shadow.camera.near = 1;
moonLight.shadow.camera.far = 190;
moonLight.shadow.bias = -0.00035;
moonLight.shadow.normalBias = 0.025;
scene.add(moonLight);
let shadowUpdateElapsed = Infinity;

const arena = buildArena(THREE, scene);
let surfaceNavigation = createNavigator({ colliders: arena.colliders, bounds: arena.bounds, isGround: arena.isDryLand });
const cityLife = createCityLife(THREE, scene, arena, surfaceNavigation);
const tunnelNavigation = createNavigator({ colliders: arena.colliders,
  bounds: { min: {x:-58,z:47}, max: {x:39,z:53} }, floorY: arena.tunnel.floorY, step: .6 });
const guidance = { path: null, goal: null, label: "", nextUpdate: 0, key: "" };
arena.pickups.forEach((pickup) => {
  pickup.active = false;
  pickup.mesh.visible = false;
});

const audio = new StealthAudio();
const clock = new THREE.Clock();
const keys = new Set();
const mouseButtons = new Set();
const guards = [];
let feedIndex = 0;
let mapVisible = false;
let selectedRouteId = "gate";
let selectedModeId = "stealth";
const discoveredStreetStories = new Set();
let activeStreetStoryId = "";
let streetStoryVisibleUntil = 0;
const discoveredGuardOrders = new Set();
let activeGuardOrderId = "";
let guardOrderVisibleUntil = 0;

const guardOrderDefinitions = Object.freeze({
  hospitaller: {
    id: "hospitaller",
    name: "ORDER OF ST JOHN // HOSPITALLERS",
    shortName: "HOSPITALLERS",
    type: "RELIGIOUS-MILITARY ORDER",
    sigil: "✣",
    accent: "#ded8c8",
    clothColor: 0x20221f,
    heraldryColor: 0xe2dccd,
    showCross: true,
    fact: "Monastic brothers who cared for the sick and pilgrims as well as fighting. Black cloth and a white cross identify the Order of St John.",
  },
  templar: {
    id: "templar",
    name: "ORDER OF THE TEMPLE // TEMPLARS",
    shortName: "TEMPLARS",
    type: "RELIGIOUS-MILITARY ORDER",
    sigil: "✚",
    accent: "#d9584e",
    clothColor: 0xc9bfa7,
    heraldryColor: 0x9d3028,
    showCross: true,
    fact: "Warrior monks sworn to defend the Latin East. A pale mantle and red cross identify the Order of the Temple.",
  },
  garrison: {
    id: "garrison",
    name: "ACRE GARRISON",
    shortName: "ACRE GARRISON",
    type: "SECULAR MEN-AT-ARMS // NOT A MONASTIC ORDER",
    sigil: "◆",
    accent: "#d3a653",
    clothColor: 0x354653,
    heraldryColor: 0xd3a653,
    showCross: false,
    fact: "Secular men-at-arms serving the Kingdom of Jerusalem guard public gates and streets; unlike the military orders, they take no monastic vows.",
  },
});

const game = {
  phase: "briefing",
  stage: "infiltrate",
  elapsed: 0,
  missionTime: 0,
  detection: 0,
  maxDetection: 0,
  interaction: 0,
  tunnelInteraction: 0,
  tunnelCooldown: 0,
  seaWallInteraction: 0,
  entryRoute: arena.entryRoutes[0],
  enteredCity: true,
  inTunnel: false,
  compromised: false,
  mode: "stealth",
  explorationAlerts: 0,
  alarmCooldown: 0,
  insertionUntil: Infinity,
  tourIndex: -1,
  tourDiscovered: new Set(),
  worldMinutes: DEFAULT_TIME,
  restedHours: 0,
};
let cycle = timeOfDay(game.worldMinutes);

const player = {
  position: arena.mission.playerStart.clone(),
  velocity: new THREE.Vector3(),
  yaw: Math.PI / 2,
  pitch: -0.03,
  height: 1.72,
  floorY: 0,
  radius: 0.46,
  crouched: false,
  inWater: false,
  submerged: false,
  breath: 100,
  needsBreath: false,
  wasSubmerged: false,
  noise: 0,
  bob: 0,
  roll: 0,
  stepDistance: 0,
};
const worldNoiseEvents = [];
arena.movableProps.forEach((prop) => {
  prop.userData.movableRuntime = {
    velocityX: 0,
    velocityZ: 0,
    targetTiltX: prop.rotation.x,
    targetTiltZ: prop.rotation.z,
    touching: false,
    cooldown: 0,
    fallen: false,
    impacts: 0,
  };
});
if (import.meta.env.DEV) {
  const requestedView = new URLSearchParams(location.search).get("view");
  if (requestedView) {
    const [x, z, yaw, floorY = 0, pitch = player.pitch] = requestedView
      .split(",")
      .map(Number);
    if ([x, z, yaw, floorY, pitch].every(Number.isFinite)) {
      player.floorY = floorY;
      player.position.set(x, floorY + player.height, z);
      player.yaw = yaw;
      player.pitch = THREE.MathUtils.clamp(pitch, -1.45, 1.45);
    }
  }
}
camera.position.copy(player.position);
camera.rotation.set(player.pitch, player.yaw, 0);

if (import.meta.env.DEV) {
  globalThis.__acreDebug = {
    setWorldMinutes(value) {
      if(!Number.isFinite(value)||value<0)throw new Error("Invalid world time");
      game.worldMinutes=value;updateWorldTime(0,false);
      cityLife.update(0,cycle,player,game.inTunnel);updateTunnelAtmosphere(1);
      guidance.nextUpdate=0;
    },
    teleport(x, z, yaw = player.yaw, floorY = 0, pitch = player.pitch) {
      guidance.nextUpdate = 0;
      player.floorY = floorY;
      player.position.set(x, floorY + player.height, z);
      player.velocity.set(0, 0, 0);
      player.yaw = yaw;
      player.pitch = THREE.MathUtils.clamp(pitch, -1.45, 1.45);
    },
    civilians() { return cityLife.snapshots(); },
    sightProbe(from, to, minutes = game.worldMinutes) {
      const root = new THREE.Object3D();
      root.position.set(from[0], 0, from[1]);
      root.lookAt(to[0], 0, to[1]);
      const point = new THREE.Vector3(to[0], 1.65, to[1]);
      const conditions = sightConditions(timeOfDay(minutes));
      return {
        visible: guardCanSee({ root }, point, 15 * conditions.range),
        // Diagnostic only; this sample never enters gameplay perception.
        sunlit: nearestWallHit(point, sunDirection) > 72,
        ...conditions,
      };
    },
    stats() {
      return {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        textures: renderer.info.memory.textures,
        geometries: renderer.info.memory.geometries,
        staticCity: arena.renderBudget,
        vessels: arena.vesselRenderBudget,
        objects: arena.objectRenderBudget,
        guardModel: guards[0]?.modelBudget || null,
        civilians: cityLife.modelBudget,
        surfaceTextures: arena.surfaceTextures.map(t=>({name:t.image?.currentSrc?.split("/").slice(-2).join("/"),width:t.image?.width || 0})),
        quality: {textureResolution:arena.textureResolution, pixelRatio:renderer.getPixelRatio(), samples:renderTarget.samples, shadowResolution},
        missionObjects: missionObjects.modelBudget,
      };
    },
    blockedAt(x, z, floorY = 0) {
      return boxCollides(new THREE.Vector3(x, floorY + player.height, z));
    },
    setKey(code, down) {
      if (down) keys.add(code);
      else keys.delete(code);
    },
    missionState() {
      return {
        phase: game.phase,
        mode: game.mode,
        route: game.entryRoute?.id,
        enteredCity: game.enteredCity,
        stage: game.stage,
        player: player.position.toArray(),
        inTunnel: game.inTunnel,
        detection: game.detection,
        worldMinutes: game.worldMinutes,
        cycle: {...cycle, gateClosed:cityLife.closed, population:cityLife.population},
        access: accessAt(player.position,cycle,game.inTunnel,player.inWater),
        guidance: { label: guidance.label, path: guidance.path, goal: guidance.goal },
        wallGuards: guards
          .filter((guard) => guard.wallPatrol)
          .map((guard) => ({
            position: guard.root.position.toArray(),
            axis: guard.wallPatrol.axis,
            min: guard.wallPatrol.min,
            max: guard.wallPatrol.max,
          })),
      };
    },
    coverSites() {
      return arena.streetCover.map((cover) => ({
        id: cover.id,
        position: cover.position.toArray(),
        approach: cover.approach.toArray(),
        colliders: cover.colliderIndexes.length,
      }));
    },
    movableProps() {
      return arena.movableProps.map((prop) => ({
        name: prop.name,
        kind: prop.userData.movable.kind,
        position: prop.position.toArray(),
        fallen: prop.userData.movableRuntime.fallen,
        impacts: prop.userData.movableRuntime.impacts,
      }));
    },
    worldNoiseEvents() {
      return worldNoiseEvents.map((event) => ({
        position: event.position.toArray(),
        strength: event.strength,
        ttl: event.ttl,
      }));
    },
    audioDiagnostics() {
      return audio.guardDiagnostics();
    },
    guardOrders() {
      return {
        discovered: [...discoveredGuardOrders],
        active: activeGuardOrderId,
        assignments: guards.map((guard) => ({
          index: guard.index,
          order: guard.order.id,
          position: guard.root.position.toArray(),
          yaw: guard.root.rotation.y,
          state: guard.state,
          awareness: guard.awareness,
        })),
      };
    },
  };
  const gateRoute = arena.entryRoutes.find((route) => route.id === "gate");
  document.documentElement.dataset.gateCorridorClear = String(
    gateRoute &&
      Array.from({ length: 41 }, (_, index) =>
        gateRoute.spawn.clone().lerp(gateRoute.arrival, index / 40),
      ).every((point) => {
        point.y = player.height;
        return !boxCollides(point);
      }),
  );
  document.documentElement.dataset.streetCoverCount = String(arena.streetCover.length);
  document.documentElement.dataset.streetStoriesCount = String(arena.streetStories.length);
  document.documentElement.dataset.streetCoverCollidersValid = String(
    arena.streetCover.every(
      (cover) =>
        cover.colliderIndexes.length > 0 &&
        cover.colliderIndexes.every(
          (index) => index >= 0 && index < arena.colliders.length,
        ),
    ),
  );
  const blockedCoverApproaches = arena.streetCover
    .filter(
      (cover) =>
        boxCollides(
          new THREE.Vector3(cover.approach.x, player.height, cover.approach.z),
        ),
    )
    .map((cover) => cover.id);
  const failedCoverOcclusion = arena.streetCover
    .filter((cover) => {
      const approachEye = cover.approach.clone();
      approachEye.y = 1.55;
      const oppositeEye = cover.position
        .clone()
        .multiplyScalar(2)
        .sub(cover.approach);
      oppositeEye.y = 1.55;
      return clearLineOfSight(approachEye, oppositeEye);
    })
    .map((cover) => cover.id);
  document.documentElement.dataset.streetCoverApproachesClear = String(
    blockedCoverApproaches.length === 0,
  );
  document.documentElement.dataset.streetCoverBlockedApproaches =
    blockedCoverApproaches.join(",");
  document.documentElement.dataset.streetCoverOccludes = String(
    failedCoverOcclusion.length === 0,
  );
  document.documentElement.dataset.streetCoverFailedOcclusion =
    failedCoverOcclusion.join(",");
}

const guardShieldShape = new THREE.Shape();
guardShieldShape.moveTo(-0.30, 0.35);
guardShieldShape.lineTo(0.30, 0.35);
guardShieldShape.lineTo(0.28, -0.06);
guardShieldShape.quadraticCurveTo(0.20, -0.32, 0, -0.48);
guardShieldShape.quadraticCurveTo(-0.20, -0.32, -0.28, -0.06);
guardShieldShape.closePath();
const guardVisionRange = 15;
const guardVisionWidth = Math.tan(THREE.MathUtils.degToRad(33)) * guardVisionRange;
const guardVisionGeometry = new THREE.BufferGeometry();
guardVisionGeometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(
    [
      0, 0.035, 0.35,
      -guardVisionWidth, 0.035, guardVisionRange,
      guardVisionWidth, 0.035, guardVisionRange,
    ],
    3,
  ),
);
guardVisionGeometry.setIndex([0, 1, 2]);
guardVisionGeometry.computeVertexNormals();
const transformedGeometry = (
  geometry,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
) => {
  const transformed = geometry.clone();
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
    new THREE.Vector3(...scale),
  );
  transformed.applyMatrix4(matrix);
  return transformed;
};
const mergeParts = (parts) => mergeGeometries(
  parts.map(({ geometry, position, rotation, scale }) =>
    transformedGeometry(geometry, position, rotation, scale)),
  false,
);
const guardGeometries = {
  farBody: mergeParts([
    {
      geometry: new THREE.CapsuleGeometry(0.3, 0.58, 3, 6),
      position: [0, 1.2, 0],
    },
    {
      geometry: new THREE.CylinderGeometry(0.3, 0.39, 0.55, 7),
      position: [0, 0.86, 0],
    },
    {
      geometry: new THREE.IcosahedronGeometry(0.205, 1),
      position: [0, 1.83, 0.07],
      scale: [0.9, 1.08, 0.9],
    },
    {
      geometry: new THREE.BoxGeometry(0.18, 0.62, 0.2),
      position: [-0.16, 0.38, 0],
    },
    {
      geometry: new THREE.BoxGeometry(0.18, 0.62, 0.2),
      position: [0.16, 0.38, 0],
    },
    {
      geometry: new THREE.BoxGeometry(0.045, 2.5, 0.045),
      position: [0.47, 1.2, 0.15],
      rotation: [0, 0, -0.16],
    },
    {
      geometry: new THREE.ExtrudeGeometry(guardShieldShape, {
        depth: 0.035,
        bevelEnabled: false,
        curveSegments: 1,
      }),
      position: [-0.4, 1.2, 0.22],
      scale: [0.88, 0.88, 0.88],
    },
  ]),
  vision: guardVisionGeometry,
};
const createGuardSurface = (size, painter, repeatX = 1, repeatY = 1) => {
  const surface = document.createElement("canvas");
  surface.width = surface.height = size;
  const context = surface.getContext("2d");
  painter(context, size);
  const texture = new THREE.CanvasTexture(surface);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 4;
  return texture;
};
const mailTexture = createGuardSurface(1024, (context, size) => {
  context.fillStyle = "#8f9692";
  context.fillRect(0, 0, size, size);
  context.lineWidth = 2.1;
  for (let row = -1; row < 74; row += 1) {
    for (let column = -1; column < 66; column += 1) {
      const x = column * 16 + (row % 2 ? 8 : 0);
      const y = row * 14;
      context.strokeStyle = "rgba(25,29,28,.72)";
      context.beginPath();
      context.ellipse(x, y, 7.1, 5.1, 0, 0, Math.PI * 2);
      context.stroke();
      context.strokeStyle = "rgba(230,235,224,.42)";
      context.beginPath();
      context.arc(x - 0.5, y - 1.2, 5.2, Math.PI * 1.05, Math.PI * 1.78);
      context.stroke();
    }
  }
}, 1, 1.5);
const clothTexture = loomTexture();
const leatherTexture = createGuardSurface(128, (context, size) => {
  context.fillStyle = "#765035";
  context.fillRect(0, 0, size, size);
  for (let mark = 0; mark < 95; mark += 1) {
    const x = (mark * 47) % size;
    const y = (mark * 83) % size;
    context.fillStyle = mark % 4
      ? "rgba(31,16,8,.07)"
      : "rgba(239,193,126,.065)";
    context.beginPath();
    context.ellipse(x, y, 1 + (mark % 3), 0.5 + (mark % 2), mark * 0.31, 0, Math.PI * 2);
    context.fill();
  }
}, 2, 3);
const guardMaterials = {
  chainmail: new THREE.MeshStandardMaterial({
    color: 0x9b9f9b,
    map: mailTexture,
    bumpMap: mailTexture,
    bumpScale: 0.012,
    metalness: 0.72,
    roughness: 0.62,
  }),
  orders: Object.fromEntries(
    Object.values(guardOrderDefinitions).map((order) => [
      order.id,
      {
        cloth: new THREE.MeshStandardMaterial({
          color: order.clothColor,
          map: clothTexture,
          metalness: 0.05,
          roughness: 0.95,
        }),
        heraldry: new THREE.MeshStandardMaterial({
          color: order.heraldryColor,
          map: clothTexture,
          roughness: 0.96,
        }),
      },
    ]),
  ),
  leggings: [0x303636, 0x382f2b].map(
    (color) => new THREE.MeshStandardMaterial({
      color,
      map: clothTexture,
      roughness: 0.98,
    }),
  ),
  leather: new THREE.MeshStandardMaterial({
    color: 0x4c2e1b,
    map: leatherTexture,
    bumpMap: leatherTexture,
    bumpScale: 0.018,
    roughness: 0.88,
  }),
  iron: new THREE.MeshStandardMaterial({
    color: 0x747a78,
    metalness: 0.78,
    roughness: 0.48,
  }),
};

function createGuard(index, position, options = {}) {
  const root = new THREE.Group();
  root.position.copy(position);

  const order = guardOrderDefinitions[options.orderId] || guardOrderDefinitions.garrison;
  const cloth = guardMaterials.orders[order.id].cloth;
  root.name = `${order.shortName} patrol guard`;
  const figure = createGuardFigure(index, order, guardMaterials);
  const {body:torso, head:headGroup, legs, arms} = figure;
  const detailRoot = figure.root;

  const coneMaterial = new THREE.MeshBasicMaterial({
    color: 0xff3d25,
    transparent: true,
    opacity: 0.045,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const visionCone = new THREE.Mesh(guardGeometries.vision, coneMaterial);

  const farBody = new THREE.Mesh(
    guardGeometries.farBody,
    cloth,
  );
  farBody.name = "Guard distance silhouette";
  farBody.position.y = 0;
  farBody.scale.set(.63,.89,.63);
  farBody.visible = false;
  farBody.castShadow = true;
  farBody.receiveShadow = true;
  const modelBudget = figure.budget;
  root.add(visionCone, detailRoot, farBody);
  scene.add(root);

  const guard = {
    index,
    order,
    root,
    body: torso,
    head: headGroup,
    legs,
    arms,
    detailRoot,
    farBody,
    visionCone,
    coneMaterial,
    modelBudget,
    animate: figure.animate,
    home: root.position.clone(),
    target: root.position.clone(),
    lastSeen: root.position.clone(),
    awareness: 0,
    identifiedUntil: 0,
    searchUntil: 0,
    navigationUntil: 0,
    path: null,
    patrolIndex: index,
    pauseUntil: 0,
    state: "patrol",
    phase: Math.random() * Math.PI * 2,
    speed: 1.25 + Math.random() * 0.18,
    idle: Math.random(),
    wallPatrol: options.wallPatrol
      ? {
          axis: options.axis,
          min: options.min,
          max: options.max,
          fixed: options.axis === "x" ? root.position.z : root.position.x,
          floorY: root.position.y,
          next: options.max,
        }
      : null,
  };
  guard.lastFootstepIndex = Math.floor((guard.phase * 7.5) / Math.PI);
  guard.lastAudioDistance = Math.hypot(
    root.position.x - player.position.x,
    root.position.z - player.position.z,
  );
  guard.approachRate = 0;
  if (guard.wallPatrol) {
    guard.target.copy(guard.home);
    guard.target[guard.wallPatrol.axis] = guard.wallPatrol.next;
    guard.speed = 0.92 + Math.random() * 0.16;
  }
  return guard;
}

const guardSpawns = arena.mission.guardSpawns;
const streetGuardOrders = [
  "garrison",
  "garrison",
  "garrison",
  "hospitaller",
  "hospitaller",
  "garrison",
  "templar",
  "garrison",
  "garrison",
];
const wallGuardOrders = ["hospitaller", "templar", "templar", "garrison"];
guardSpawns.forEach((position, index) => {
  guards.push(
    createGuard(index, position, {
      orderId: streetGuardOrders[index],
    }),
  );
});
arena.mission.wallGuardSpawns.forEach((wallGuard, wallIndex) => {
  guards.push(
    createGuard(guardSpawns.length + wallIndex, wallGuard.position, {
      orderId: wallGuardOrders[wallIndex],
      wallPatrol: true,
      axis: wallGuard.axis,
      min: wallGuard.min,
      max: wallGuard.max,
    }),
  );
});
if (import.meta.env.DEV) {
  document.documentElement.dataset.guardModelBudget = JSON.stringify(
    guards[0]?.modelBudget || null,
  );
  document.documentElement.dataset.guardOrderCount = String(
    Object.keys(guardOrderDefinitions).length,
  );
  document.documentElement.dataset.guardAffiliationsComplete = String(
    guards.every((guard) => Boolean(guard.order)),
  );
  document.documentElement.dataset.guardOrderAssignments = guards
    .map((guard) => guard.order.id)
    .join(",");
}

function createMissionObjects() {
  const terminal = new THREE.Group();
  terminal.position.copy(arena.mission.target);
  terminal.name = "Sealed harbour dispatch";
  const dark = new THREE.MeshStandardMaterial({
    color: 0x5a351e,
    map: leatherTexture,
    bumpMap: leatherTexture,
    bumpScale: 0.025,
    metalness: 0.08,
    roughness: 0.88,
  });
  const chestIron = new THREE.MeshStandardMaterial({
    color: 0x242622,
    metalness: 0.72,
    roughness: 0.58,
  });
  const parchmentTexture = createGuardSurface(256, (context, size) => {
    context.fillStyle = "#d5c08d";
    context.fillRect(0, 0, size, size);
    for (let line = 0; line < 15; line += 1) {
      const y = 34 + line * 12;
      context.fillStyle = line % 4
        ? "rgba(67,43,24,.18)"
        : "rgba(67,43,24,.1)";
      context.fillRect(28 + (line % 3) * 7, y, size - 65 - (line % 4) * 8, 1.25);
    }
    const edge = context.createRadialGradient(
      size / 2,
      size / 2,
      size * 0.18,
      size / 2,
      size / 2,
      size * 0.72,
    );
    edge.addColorStop(0, "rgba(255,250,218,0)");
    edge.addColorStop(1, "rgba(74,43,20,.28)");
    context.fillStyle = edge;
    context.fillRect(0, 0, size, size);
    context.fillStyle = "rgba(111,42,29,.72)";
    context.fillRect(29, 32, 4, 19);
    context.fillRect(29, 32, 13, 4);
    context.fillRect(29, 40, 10, 3);
    context.fillStyle = "rgba(84,56,31,.12)";
    context.fillRect(size * 0.5, 12, 1, size - 24);
    context.fillRect(14, size * 0.52, size - 28, 1);
    for (const [x, y, radius] of [[54, 72, 3], [202, 47, 2], [181, 196, 4]]) {
      context.fillStyle = "rgba(84,49,24,.11)";
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
  });
  const parchmentMaterial = new THREE.MeshStandardMaterial({
    color: 0xe7d2a0,
    map: parchmentTexture,
    bumpMap: parchmentTexture,
    bumpScale: 0.012,
    roughness: 0.96,
    side: THREE.DoubleSide,
  });
  const glow = new THREE.MeshStandardMaterial({
    color: 0x8d251d,
    emissive: 0x9d321f,
    emissiveIntensity: 0.9,
    metalness: 0.05,
    roughness: 0.8,
  });
  const chestGeometry = mergeParts([
    {
      geometry: new THREE.BoxGeometry(1.45, 0.7, 0.9),
      position: [0, 0.39, 0],
    },
    {
      geometry: new THREE.BoxGeometry(1.52, 0.16, 0.96),
      position: [0, 0.79, 0],
    },
    ...[-1, 1].flatMap((xSide) => [-1, 1].map((zSide) => ({
      geometry: new THREE.BoxGeometry(0.18, 0.12, 0.18),
      position: [xSide * 0.55, 0.06, zSide * 0.32],
    }))),
  ]);
  const chest = new THREE.Mesh(chestGeometry, dark);
  chest.castShadow = chest.receiveShadow = true;
  chest.name = "Leather-covered dispatch coffer";

  const nailGeometry = new THREE.CylinderGeometry(0.022, 0.022, 0.026, 6);
  const hardwareGeometry = mergeParts([
    ...[-0.51, 0.51].map((x) => ({
      geometry: new THREE.BoxGeometry(0.085, 0.86, 0.94),
      position: [x, 0.43, 0],
    })),
    {
      geometry: new THREE.BoxGeometry(0.21, 0.25, 0.07),
      position: [0, 0.58, 0.49],
    },
    {
      geometry: new THREE.BoxGeometry(0.075, 0.32, 0.055),
      position: [0, 0.76, 0.505],
    },
    ...[-0.51, 0.51].flatMap((x) => [0.24, 0.66].map((y) => ({
      geometry: nailGeometry,
      position: [x, y, 0.515],
      rotation: [Math.PI / 2, 0, 0],
    }))),
    ...[-0.47, 0.47].map((z) => ({
      geometry: new THREE.BoxGeometry(1.52, 0.055, 0.05),
      position: [0, 0.82, z],
    })),
  ]);
  const hardware = new THREE.Mesh(hardwareGeometry, chestIron);
  hardware.castShadow = true;
  hardware.name = "Merged forged coffer straps, hasp, and nails";

  const scrollGeometry = new THREE.PlaneGeometry(0.9, 0.58, 6, 4);
  const scrollPositions = scrollGeometry.attributes.position;
  for (let index = 0; index < scrollPositions.count; index += 1) {
    const x = scrollPositions.getX(index);
    const y = scrollPositions.getY(index);
    const edgeCurl = Math.pow(Math.abs(x) / 0.45, 3) * 0.022;
    scrollPositions.setZ(
      index,
      Math.sin(x * 11) * 0.008 + Math.cos(y * 15) * 0.006 + edgeCurl,
    );
  }
  scrollGeometry.computeVertexNormals();
  const parchmentGeometry = mergeParts([
    {
      geometry: scrollGeometry,
      position: [0, 0.895, 0],
      rotation: [-Math.PI / 2, 0, 0],
    },
    ...[-0.45, 0.45].map((x) => ({
      geometry: new THREE.CylinderGeometry(0.07, 0.07, 0.58, 8),
      position: [x, 0.915, 0],
      rotation: [Math.PI / 2, 0, 0],
    })),
  ]);
  const scroll = new THREE.Mesh(parchmentGeometry, parchmentMaterial);
  scroll.castShadow = true;
  scroll.name = "Merged curled dispatch parchment";

  const sealGeometry = mergeParts([
    {
      geometry: new THREE.BoxGeometry(0.075, 0.018, 0.58),
      position: [0.17, 0.935, 0],
    },
    {
      geometry: new THREE.CylinderGeometry(0.12, 0.12, 0.055, 12),
      position: [0.17, 0.965, 0.11],
    },
    {
      geometry: new THREE.TorusGeometry(0.102, 0.011, 4, 10),
      position: [0.17, 0.996, 0.11],
      rotation: [Math.PI / 2, 0, 0],
    },
    {
      geometry: new THREE.BoxGeometry(0.085, 0.012, 0.024),
      position: [0.17, 1.006, 0.11],
    },
    {
      geometry: new THREE.BoxGeometry(0.024, 0.012, 0.085),
      position: [0.17, 1.006, 0.11],
    },
  ]);
  const screen = new THREE.Mesh(sealGeometry, glow);
  screen.name = "Wax seal";
  screen.castShadow = true;
  const light = new THREE.PointLight(0xff9b48, 2.2, 4.5, 2);
  light.position.set(0, 1.25, 0.25);
  terminal.add(chest, hardware, scroll, screen, light);
  scene.add(terminal);
  const terminalMeshes = [chest, hardware, scroll, screen];
  const triangleCount = (geometry) => (
    geometry.index ? geometry.index.count / 3 : geometry.attributes.position.count / 3
  );

  const exfil = new THREE.Group();
  exfil.position.copy(arena.mission.exfil);
  exfil.name = "Harbour skiff extraction";
  exfil.visible = false;
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xe8b85c,
    transparent: true,
    opacity: 0.68,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const rings = [1.2, 1.65, 2.1].map((radius, index) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(radius - 0.035, radius, 32), ringMaterial.clone());
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = index * 0.035;
    exfil.add(ring);
    return ring;
  });
  const beacon = new THREE.PointLight(0xffaa45, 8, 10, 2);
  beacon.position.y = 1.5;
  exfil.add(beacon);
  scene.add(exfil);

  const modelBudget = {
    terminalMeshDraws: terminalMeshes.length,
    terminalTriangles: terminalMeshes.reduce(
      (total, mesh) => total + triangleCount(mesh.geometry),
      0,
    ),
    terminalPointLights: 1,
    exfilMeshDraws: rings.length,
    exfilTriangles: rings.reduce(
      (total, ring) => total + triangleCount(ring.geometry),
      0,
    ),
    exfilPointLights: 1,
  };
  if (
    modelBudget.terminalMeshDraws !== 4 ||
    modelBudget.terminalTriangles > 520 ||
    modelBudget.terminalPointLights !== 1 ||
    modelBudget.exfilMeshDraws !== 3 ||
    modelBudget.exfilTriangles > 192 ||
    modelBudget.exfilPointLights !== 1
  ) {
    throw new Error(`Mission-object render budget regressed: ${JSON.stringify(modelBudget)}`);
  }
  return {
    terminal,
    terminalScreen: screen,
    terminalLight: light,
    exfil,
    rings,
    modelBudget,
  };
}

const missionObjects = createMissionObjects();
if (import.meta.env.DEV) {
  document.documentElement.dataset.missionObjectBudget = JSON.stringify(
    missionObjects.modelBudget,
  );
}

function nearestWallHit(origin, direction) {
  const ray = new THREE.Ray(origin, direction);
  let bestDistance = Infinity;
  const hit = new THREE.Vector3();
  for (const box of arena.colliders) {
    if (box.enabled === false) continue;
    if (ray.intersectBox(box, hit)) {
      const distance = origin.distanceTo(hit);
      if (distance > 0.1 && distance < bestDistance) bestDistance = distance;
    }
  }
  return bestDistance;
}

function clearLineOfSight(from, to) {
  const direction = to.clone().sub(from);
  const distance = direction.length();
  direction.normalize();
  return nearestWallHit(from, direction) >= distance - 0.35;
}

function boxCollides(position) {
  const minY = position.y - player.height;
  // Surface masonry has submerged foundations: diving must not let the
  // swimmer pass beneath a wall whose visible mesh begins at ground level.
  const topY = player.inWater && !game.inTunnel ? Math.max(position.y, 0.25) : position.y;
  for (const box of arena.colliders) {
    if (box.enabled === false) continue;
    if (
      position.x + player.radius > box.min.x &&
      position.x - player.radius < box.max.x &&
      position.z + player.radius > box.min.z &&
      position.z - player.radius < box.max.z &&
      topY > box.min.y &&
      minY < box.max.y
    ) {
      return true;
    }
  }
  return false;
}

function guardBlocked(position) {
  return !arena.isDryLand(position.x, position.z) || arena.colliders.some(
    (box) =>
      box.enabled !== false && position.x + 0.42 > box.min.x &&
      position.x - 0.42 < box.max.x &&
      position.z + 0.42 > box.min.z &&
      position.z - 0.42 < box.max.z &&
      box.max.y > 0.2,
  );
}

const collisionCandidate = new THREE.Vector3();
function movePlayerWithCollisions(deltaX, deltaZ) {
  // Substep the capsule so a sprinting player cannot cross a thin wall between
  // two rendered frames. Axis-separated checks preserve natural wall sliding.
  const distance = Math.hypot(deltaX, deltaZ);
  const maxStep = player.radius * 0.4;
  const steps = Math.max(1, Math.ceil(distance / maxStep));
  const stepX = deltaX / steps;
  const stepZ = deltaZ / steps;

  for (let step = 0; step < steps; step += 1) {
    collisionCandidate.copy(player.position);
    collisionCandidate.x += stepX;
    if (!boxCollides(collisionCandidate)) {
      player.position.x = collisionCandidate.x;
    } else {
      player.velocity.x = 0;
    }

    collisionCandidate.copy(player.position);
    collisionCandidate.z += stepZ;
    if (!boxCollides(collisionCandidate)) {
      player.position.z = collisionCandidate.z;
    } else {
      player.velocity.z = 0;
    }
  }
  player.position.x = THREE.MathUtils.clamp(player.position.x, arena.bounds.min.x + player.radius, arena.bounds.max.x - player.radius);
  player.position.z = THREE.MathUtils.clamp(player.position.z, arena.bounds.min.z + player.radius, arena.bounds.max.z - player.radius);
}

const propCollisionDirection = new THREE.Vector3();
const propLocalDirection = new THREE.Vector3();
const propCandidate = new THREE.Vector3();
const propPlayerSeparation = new THREE.Vector3();
const propUpAxis = new THREE.Vector3(0, 1, 0);
function movablePropBlocked(prop, x, z) {
  const definition = prop.userData.movable;
  return arena.colliders.some(
    (box) =>
      x + definition.radius > box.min.x &&
      x - definition.radius < box.max.x &&
      z + definition.radius > box.min.z &&
      z - definition.radius < box.max.z &&
      box.max.y > definition.baseY + 0.08 &&
      box.min.y < definition.baseY + definition.height,
  );
}

function emitWorldNoise(prop, strength) {
  const position = prop.getWorldPosition(new THREE.Vector3());
  position.y = prop.userData.movable.baseY + 0.35;
  worldNoiseEvents.push({ position, strength, ttl: 0.9 });
  if (worldNoiseEvents.length > 8) worldNoiseEvents.shift();
}

function updateMovableProps(dt, playerSpeed) {
  for (let index = worldNoiseEvents.length - 1; index >= 0; index -= 1) {
    worldNoiseEvents[index].ttl -= dt;
    if (worldNoiseEvents[index].ttl <= 0) worldNoiseEvents.splice(index, 1);
  }

  for (const prop of arena.movableProps) {
    const definition = prop.userData.movable;
    const state = prop.userData.movableRuntime;
    state.cooldown = Math.max(0, state.cooldown - dt);

    propCandidate.set(
      prop.position.x + state.velocityX * dt,
      definition.baseY,
      prop.position.z + state.velocityZ * dt,
    );
    if (
      !movablePropBlocked(
        prop,
        propCandidate.x,
        propCandidate.z,
      )
    ) {
      prop.position.x = propCandidate.x;
      prop.position.z = propCandidate.z;
    } else {
      state.velocityX = 0;
      state.velocityZ = 0;
    }
    const movementDamping = Math.exp(-5.2 * dt);
    state.velocityX *= movementDamping;
    state.velocityZ *= movementDamping;

    if (!state.fallen && state.cooldown <= 0) {
      state.targetTiltX = THREE.MathUtils.damp(state.targetTiltX, 0, 3.8, dt);
      state.targetTiltZ = THREE.MathUtils.damp(state.targetTiltZ, 0, 3.8, dt);
    }
    prop.rotation.x = THREE.MathUtils.damp(
      prop.rotation.x,
      state.targetTiltX,
      state.fallen ? 7 : 11,
      dt,
    );
    prop.rotation.z = THREE.MathUtils.damp(
      prop.rotation.z,
      state.targetTiltZ,
      state.fallen ? 7 : 11,
      dt,
    );

    propCollisionDirection
      .set(prop.position.x - player.position.x, 0, prop.position.z - player.position.z);
    const distance = propCollisionDirection.length();
    const touching = distance < player.radius + definition.radius;
    if (distance > 0.001) {
      propCollisionDirection.multiplyScalar(1 / distance);
    }
    if (touching && !state.touching && state.cooldown <= 0 && playerSpeed > 0.9) {
      if (distance <= 0.001) {
        propCollisionDirection.set(player.velocity.x, 0, player.velocity.z);
        if (propCollisionDirection.lengthSq() > 0.001) propCollisionDirection.normalize();
        else propCollisionDirection.set(1, 0, 0);
      }

      const strength = THREE.MathUtils.clamp((playerSpeed - 0.65) / 6.2, 0.18, 1);
      const fall = playerSpeed >= definition.fallThreshold;
      state.fallen ||= fall;
      state.impacts += 1;
      state.cooldown = 0.42;
      state.velocityX += propCollisionDirection.x * (0.65 + strength * 1.25);
      state.velocityZ += propCollisionDirection.z * (0.65 + strength * 1.25);

      propLocalDirection
        .copy(propCollisionDirection)
        .applyAxisAngle(propUpAxis, -prop.rotation.y);
      const tilt = state.fallen ? 1.18 : 0.16 + strength * 0.2;
      state.targetTiltX = propLocalDirection.z * tilt;
      state.targetTiltZ = -propLocalDirection.x * tilt;

      const impactNoise = Math.round(
        THREE.MathUtils.lerp(definition.noise * 0.55, definition.noise, strength),
      );
      emitWorldNoise(prop, impactNoise);
      const forwardX = -Math.sin(player.yaw);
      const forwardZ = -Math.cos(player.yaw);
      const pan = THREE.MathUtils.clamp(
        propCollisionDirection.x * -forwardZ +
          propCollisionDirection.z * forwardX,
        -1,
        1,
      );
      audio.objectImpact({
        material: definition.material,
        strength,
        pan,
      });
    }
    if (touching && distance > 0.001) {
      const overlap = player.radius + definition.radius - distance;
      propPlayerSeparation
        .copy(player.position)
        .addScaledVector(propCollisionDirection, -(overlap + 0.012));
      if (!boxCollides(propPlayerSeparation)) {
        player.position.x = propPlayerSeparation.x;
        player.position.z = propPlayerSeparation.z;
      }
    }
    state.touching = touching;
  }
}

function updatePlayer(dt) {
  if (!game.inTunnel && game.enteredCity) {
    player.inWater = !arena.isDryLand(player.position.x, player.position.z);
    player.floorY = player.inWater ? waterFloorY : 0;
  }
  const crouchRequested =
    mouseButtons.has(2) ||
    keys.has("ControlLeft") ||
    keys.has("ControlRight") ||
    keys.has("KeyC");
  if (
    player.inWater &&
    player.needsBreath &&
    !crouchRequested &&
    player.breath >= 35
  ) {
    player.needsBreath = false;
  }
  player.crouched = player.inWater
    ? crouchRequested && !player.needsBreath
    : crouchRequested;
  player.submerged = player.inWater && player.crouched;

  if (player.inWater) {
    if (player.submerged) {
      player.breath = Math.max(
        0,
        player.breath - dt * (devFastBreath ? 85 : 14),
      );
      if (player.breath <= 0 && !player.needsBreath) {
        player.needsBreath = true;
        player.submerged = false;
        player.crouched = false;
        player.noise = Math.max(player.noise, 76);
        addFeed("BREATH EXHAUSTED // FORCED TO SURFACE");
        audio.gasp();
      }
    } else {
      player.breath = Math.min(100, player.breath + dt * 30);
    }
    if (player.submerged !== player.wasSubmerged) {
      audio.splash(player.submerged ? 0.35 : 0.58);
      if (player.submerged) addFeed("SUBMERGED // INVISIBLE // WATCH BREATH");
      player.wasSubmerged = player.submerged;
    }
  } else {
    player.breath = 100;
    player.needsBreath = false;
    player.submerged = false;
    player.wasSubmerged = false;
  }

  const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const right = new THREE.Vector3(-forward.z, 0, forward.x);
  const move = new THREE.Vector3();
  if (keys.has("KeyW")) move.add(forward);
  if (keys.has("KeyS")) move.sub(forward);
  if (keys.has("KeyD")) move.add(right);
  if (keys.has("KeyA")) move.sub(right);
  const moving = move.lengthSq() > 0;
  if (moving) move.normalize();

  const sprintHeld = mouseButtons.has(0) || keys.has("ShiftLeft") || keys.has("ShiftRight");
  const sprinting =
    !player.inWater &&
    !player.crouched &&
    sprintHeld &&
    keys.has("KeyW") &&
    moving;
  const speed = player.inWater
    ? player.submerged
      ? 1.18
      : 1.72
    : player.crouched
      ? 2.05
      : sprinting
        ? 7.25
        : 4.15;
  player.velocity.x = THREE.MathUtils.damp(player.velocity.x, move.x * speed, 13, dt);
  player.velocity.z = THREE.MathUtils.damp(player.velocity.z, move.z * speed, 13, dt);

  const previousX = player.position.x, previousZ = player.position.z;
  movePlayerWithCollisions(player.velocity.x * dt, player.velocity.z * dt);

  const targetHeight = player.crouched ? 1.12 : 1.72;
  player.height = THREE.MathUtils.damp(player.height, targetHeight, 14, dt);
  player.position.y = player.floorY + player.height;

  const horizontalSpeed = Math.hypot(player.velocity.x, player.velocity.z);
  const targetNoise = player.inWater
    ? player.submerged
      ? moving
        ? 5
        : 1
      : moving
        ? 22
        : player.needsBreath
          ? 38
          : 7
    : horizontalSpeed < 0.1
      ? 2
      : player.crouched
        ? 12
        : sprinting
          ? 92
          : 34;
  player.noise = THREE.MathUtils.damp(player.noise, targetNoise, 9, dt);
  const travelled = Math.hypot(player.position.x - previousX, player.position.z - previousZ);
  if (travelled > 0.0001) {
    player.bob += dt * (player.inWater ? 3.2 : player.crouched ? 5 : sprinting ? 12 : 8);
    player.stepDistance += travelled;
    const stride = player.inWater ? 1.25 : player.crouched ? 1.0 : 1.65;
    if (player.stepDistance >= stride) {
      player.stepDistance %= stride;
      if (player.inWater) audio.splash(player.submerged ? 0.18 : 0.32);
      else audio.footstep(sprinting ? 1.1 : player.crouched ? 0.25 : 0.55);
    }
  }
  updateMovableProps(dt, horizontalSpeed);

  const bobScale = settings.reducedMotion ? 0 : player.inWater ? 0.18 : player.crouched ? 0.25 : sprinting ? 1.1 : 0.55;
  const bobX = Math.sin(player.bob) * 0.011 * bobScale;
  const bobY = Math.abs(Math.cos(player.bob)) * 0.015 * bobScale;
  player.roll = THREE.MathUtils.damp(player.roll, move.x * -0.007, 8, dt);

  camera.position.copy(player.position);
  camera.position.x += bobX;
  camera.position.y -= bobY;
  camera.rotation.set(player.pitch, player.yaw, settings.reducedMotion ? 0 : player.roll);
  camera.fov = THREE.MathUtils.damp(camera.fov, sprinting && !settings.reducedMotion ? 76 : 72, 9, dt);
  camera.updateProjectionMatrix();
}

function guardCanSee(guard, point, range = 15, fov = 66) {
  const eye = guard.root.position.clone().add(new THREE.Vector3(0, 1.65, 0));
  if (Math.abs(point.y - eye.y) > 3.5) return false;
  const toPoint = point.clone().sub(eye);
  const distance = toPoint.length();
  if (distance > range) return false;
  toPoint.normalize();
  const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(guard.root.quaternion);
  if (forward.dot(toPoint) < Math.cos(THREE.MathUtils.degToRad(fov / 2))) return false;
  return clearLineOfSight(eye, point);
}

const guardAudioPoint = new THREE.Vector3();
const guardAudioDirection = new THREE.Vector3();
const guardAudioRight = new THREE.Vector3();
function getGuardAudioSpatial(guard, distance) {
  guardAudioPoint.copy(guard.root.position);
  guardAudioPoint.y += 0.24;
  guardAudioDirection.copy(guard.root.position).sub(player.position).setY(0);
  if (guardAudioDirection.lengthSq() > 0.0001) guardAudioDirection.normalize();
  const forwardX = -Math.sin(player.yaw);
  const forwardZ = -Math.cos(player.yaw);
  guardAudioRight.set(-forwardZ, 0, forwardX);
  return {
    distance,
    pan: THREE.MathUtils.clamp(guardAudioDirection.dot(guardAudioRight), -1, 1),
    muffled: !clearLineOfSight(player.position, guardAudioPoint),
  };
}

function updateGuards(dt) {
  game.alarmCooldown = Math.max(0, game.alarmCooldown - dt);
  if (game.inTunnel) {
    guards.forEach((guard) => {
      guard.root.visible = false;
    });
    game.detection = 0;
    updateDetectionDirection(null);
    return;
  }

  let mostAware = null;
  const access = accessAt(player.position, cycle, game.inTunnel, player.inWater);
  const crowdMask = cityLife.crowdMask(player.position);
  const soundScale = hearingScale(cycle, crowdMask);
  for (const guard of guards) {
    guard.root.visible = true;
    guard.phase += dt;
    const stateBeforeSense = guard.state;

    const distance = guard.root.position.distanceTo(player.position);
    const fullDetail = distance < (compactDevice ? 24 : 38);
    guard.detailRoot.visible = fullDetail;
    guard.farBody.visible = !fullDetail;
    const suspicious = access.suspicious || game.elapsed < guard.identifiedUntil;
    guard.visionCone.visible = distance < 34 && suspicious;
    const sight = sightConditions(cycle);
    const sightRange = player.inWater
      ? 9
      : player.crouched
        ? 12.5
        : 15;
    const seesPlayer =
      suspicious &&
      !player.submerged &&
      !devGuardAudioTest &&
      game.elapsed >= game.insertionUntil &&
      guardCanSee(
        guard,
        player.position,
        sightRange * sight.range,
        66,
      );
    const ear = guard.root.position.clone().add(new THREE.Vector3(0, 1.55, 0));
    const hearingRadius = (2.2 + player.noise * 0.115) * soundScale * (clearLineOfSight(ear, player.position) ? 1 : .28);
    const hearsPlayer =
      (suspicious || player.noise > 70) &&
      !player.submerged &&
      !devGuardAudioTest &&
      distance < hearingRadius &&
      player.noise > 20;
    let heardWorldNoise = null;
    let heardWorldNoiseScore = -Infinity;
    if (!devGuardAudioTest) {
      for (const event of worldNoiseEvents) {
        const eventDistance = guard.root.position.distanceTo(event.position);
        const eventRadius = (2.2 + event.strength * 0.115) * soundScale * (clearLineOfSight(ear, event.position) ? 1 : .32);
        const score = event.strength - eventDistance * 4;
        if (eventDistance < eventRadius && score > heardWorldNoiseScore) {
          heardWorldNoise = event;
          heardWorldNoiseScore = score;
        }
      }
    }

    if (seesPlayer) {
      guard.identifiedUntil = game.elapsed + 30;
      guard.searchUntil = game.elapsed + 5;
      guard.lastSeen.copy(player.position);
      const proximity = THREE.MathUtils.clamp(1.35 - distance / 22, 0.5, 1.2);
      const posture = player.inWater
        ? 0.38
        : player.crouched
          ? 0.52
          : player.noise > 70
            ? 1.35
            : 1;
      guard.awareness += dt * 48 * proximity * posture * sight.recognition;
      guard.state = "suspicious";
    } else {
      guard.awareness = Math.max(0, guard.awareness - dt * 18);
      if (heardWorldNoise || hearsPlayer) {
        guard.searchUntil = game.elapsed + 4.5;
        const soundPosition = heardWorldNoise?.position || player.position;
        const soundStrength = heardWorldNoise?.strength || player.noise;
        guard.lastSeen.copy(soundPosition);
        guard.awareness = Math.max(guard.awareness, soundStrength > 65 ? 34 : 18);
        guard.state = "investigate";
      } else if (game.elapsed < guard.searchUntil) {
        guard.state = "investigate";
      } else if (guard.awareness <= 1 && guard.state !== "patrol") {
        guard.state = "patrol";
      }
    }

    if (guard.awareness >= 100) {
      const missionFailed = triggerAlarm("VISUAL CONFIRMATION // IDENTITY EXPOSED");
      if (missionFailed) return;
      guard.awareness = 75;
      guard.state = "investigate";
      guard.lastSeen.copy(player.position);
    }

    let desired = new THREE.Vector3();
    if (guard.state === "suspicious" || guard.state === "investigate") {
      desired.copy(guard.lastSeen).sub(guard.root.position).setY(0);
      if (guard.wallPatrol) {
        const crossAxis = guard.wallPatrol.axis === "x" ? "z" : "x";
        desired[crossAxis] = 0;
      }
      if (desired.length() > 1.25) {
        desired.normalize();
        guard.root.lookAt(guard.lastSeen.x, guard.root.position.y, guard.lastSeen.z);
      } else {
        desired.set(0, 0, 0);
        guard.root.rotation.y += dt * 0.42;
      }
    } else {
      if (
        guard.wallPatrol &&
        Math.abs(
          guard.root.position[guard.wallPatrol.axis] -
            guard.target[guard.wallPatrol.axis],
        ) < 1.1
      ) {
        guard.wallPatrol.next =
          guard.wallPatrol.next === guard.wallPatrol.max
            ? guard.wallPatrol.min
            : guard.wallPatrol.max;
        guard.target.copy(guard.home);
        guard.target[guard.wallPatrol.axis] = guard.wallPatrol.next;
      } else if (!guard.wallPatrol && guard.root.position.distanceTo(guard.target) < 1.1) {
        guard.pauseUntil = game.elapsed + 1.2;
        const offsets = [[5,0],[0,5],[-5,0],[0,-5],[3,3],[-3,-3]];
        for (let i = 0; i < offsets.length; i++) {
          const [dx,dz] = offsets[(++guard.patrolIndex) % offsets.length];
          if (surfaceNavigation.walkable(guard.home.x+dx, guard.home.z+dz)) {
            guard.target.set(guard.home.x+dx, 0, guard.home.z+dz); break;
          }
        }
        guard.navigationUntil = 0;
      }
      desired.copy(guard.target).sub(guard.root.position).setY(0).normalize();
      guard.root.lookAt(guard.target.x, guard.root.position.y, guard.target.z);
    }

    if (!guard.wallPatrol) {
      const destination = guard.state === "patrol" ? guard.target : guard.lastSeen;
      if (game.elapsed >= guard.navigationUntil || stateBeforeSense !== guard.state) {
        guard.path = surfaceNavigation.route(guard.root.position, destination);
        guard.navigationUntil = game.elapsed + 1.6 + guard.index * .03;
      }
      while (guard.path?.length > 1 && Math.hypot(guard.path[1].x-guard.root.position.x, guard.path[1].z-guard.root.position.z) < .65) guard.path.shift();
      const next = guard.path?.[1];
      if (next) {
        desired.set(next.x-guard.root.position.x, 0, next.z-guard.root.position.z).normalize();
        guard.root.lookAt(next.x, guard.root.position.y, next.z);
      } else desired.set(0,0,0);
      if (guard.state === "patrol" && game.elapsed < guard.pauseUntil) desired.set(0,0,0);
    }
    const old = guard.root.position.clone();
    const guardSpeed = guard.state === "patrol" ? guard.speed : 1.75;
    guard.root.position.addScaledVector(desired, guardSpeed * dt);
    if (guard.wallPatrol) {
      const axis = guard.wallPatrol.axis;
      const crossAxis = axis === "x" ? "z" : "x";
      guard.root.position[axis] = THREE.MathUtils.clamp(
        guard.root.position[axis],
        guard.wallPatrol.min,
        guard.wallPatrol.max,
      );
      guard.root.position[crossAxis] = guard.wallPatrol.fixed;
      guard.root.position.y = guard.wallPatrol.floorY;
    } else if (guardBlocked(guard.root.position)) {
      guard.root.position.copy(old);
      guard.target.copy(guard.home).add(
        new THREE.Vector3((Math.random() - 0.5) * 8, 0, (Math.random() - 0.5) * 8),
      );
      guard.root.rotation.y += Math.PI * 0.35;
    }

    const movement = Math.min(guard.root.position.distanceTo(old) / Math.max(dt, .001), 1);
    guard.animate(guard.phase * 7.5, movement, guard.state !== "patrol");
    guard.coneMaterial.opacity = 0.035 + (guard.awareness / 100) * 0.13;
    guard.coneMaterial.color.setHex(guard.awareness > 55 ? 0xff281b : 0xff8a25);

    const horizontalDistance = Math.hypot(
      guard.root.position.x - player.position.x,
      guard.root.position.z - player.position.z,
    );
    const rawApproach =
      (guard.lastAudioDistance - horizontalDistance) / Math.max(dt, 0.001);
    guard.approachRate = THREE.MathUtils.damp(
      guard.approachRate,
      THREE.MathUtils.clamp(rawApproach, -3, 3),
      5,
      dt,
    );
    guard.lastAudioDistance = horizontalDistance;
    const audioSpatial = getGuardAudioSpatial(guard, horizontalDistance);
    const footstepIndex = Math.floor((guard.phase * 7.5) / Math.PI);
    if (
      footstepIndex !== guard.lastFootstepIndex &&
      movement > 0.2
    ) {
      guard.lastFootstepIndex = footstepIndex;
      audio.guardFootstep({
        ...audioSpatial,
        approach: guard.approachRate,
        alerted: guard.state !== "patrol",
        muffled: audioSpatial.muffled,
        submerged: player.submerged,
        armor: (footstepIndex + guard.index) % 4 === 0,
        masking: 1 - cycle.activity * 0.25 - crowdMask * 0.25,
      });
    }
    if (
      stateBeforeSense === "patrol" &&
      (guard.state === "suspicious" || guard.state === "investigate")
    ) {
      audio.guardSuspicion(audioSpatial);
    }

    if (!mostAware || guard.awareness > mostAware.awareness) mostAware = guard;
  }

  game.detection = mostAware?.awareness || 0;
  game.maxDetection = Math.max(game.maxDetection, game.detection);
  updateDetectionDirection(mostAware);
}

function updateDetectionDirection(guard) {
  const indicator = $("damage-direction");
  if (!guard || guard.awareness < 8) {
    indicator.classList.remove("show", "suspicion");
    return;
  }
  const direction = guard.root.position.clone().sub(player.position);
  const attackerAngle = Math.atan2(-direction.x, -direction.z);
  const relative = THREE.MathUtils.radToDeg(attackerAngle - player.yaw);
  indicator.style.transform = `rotate(${relative}deg)`;
  indicator.classList.add("show", "suspicion");
}

function triggerAlarm(reason) {
  if (game.phase !== "running") return false;
  if (game.mode === "explore") {
    game.maxDetection = 100;
    if (game.alarmCooldown <= 0) {
      game.explorationAlerts += 1;
      game.alarmCooldown = 3.5;
      audio.alarm();
      $("damage-vignette").classList.add("flash");
      setTimeout(() => $("damage-vignette").classList.remove("flash"), 320);
      addFeed(`${reason} // EXPLORATION CONTINUES`);
    }
    return false;
  }
  if (game.compromised) return true;
  game.compromised = true;
  game.detection = 100;
  game.maxDetection = 100;
  audio.alarm();
  $("damage-vignette").classList.add("flash");
  addFeed(reason);
  setTimeout(() => endGame(false), 480);
  return true;
}

function nearestSeaEntry() {
  return arena.entryRoutes.filter(route => route.exterior).reduce((nearest, route) => {
    const distance = item => Math.hypot(player.position.x-item.exterior.x, player.position.z-item.exterior.z);
    return !nearest || distance(route) < distance(nearest) ? route : nearest;
  }, null);
}

function updateSeaWallTraversal(dt, prompt) {
  // Ropes remain usable if the player returns to the sea later in the mission.
  const route = nearestSeaEntry();
  if (game.inTunnel || !route) {
    game.seaWallInteraction = Math.max(0, game.seaWallInteraction - dt * 2.2);
    return false;
  }

  const distance = Math.hypot(
    player.position.x - route.exterior.x,
    player.position.z - route.exterior.z,
  );
  if (distance > 2.25) {
    game.seaWallInteraction = Math.max(0, game.seaWallInteraction - dt * 2.2);
    return false;
  }

  if (player.submerged) {
    game.seaWallInteraction = Math.max(0, game.seaWallInteraction - dt * 2);
    prompt.innerHTML =
      `RELEASE <strong>[ RMB / CTRL ]</strong> TO SURFACE // CLIMB`;
    prompt.classList.remove("hidden");
    return true;
  }

  // Continuing to press forward at a marked climb should never feel like
  // walking into an unexplained invisible wall. E remains available for
  // deliberate interaction, while W naturally commits to the ascent.
  const climbHeld = keys.has("KeyE") || keys.has("KeyW");
  if (climbHeld) {
    game.seaWallInteraction += dt;
    player.noise = Math.max(player.noise, 24);
  } else {
    game.seaWallInteraction = Math.max(0, game.seaWallInteraction - dt * 2);
  }
  const duration = devFastInteractions
    ? 0.04
    : route.method === "MASONRY CLIMB"
      ? 1.65
      : 1.35;
  const progress = THREE.MathUtils.clamp(game.seaWallInteraction / duration, 0, 1);
  prompt.innerHTML = `HOLD <strong>[ W ]</strong> TO CLIMB <small>${route.method} · [ E ] ALSO</small>
    <span class="progress"><i style="width:${progress * 100}%"></i></span>`;
  prompt.classList.remove("hidden");

  if (progress >= 1) {
    player.height = 1.72;
    player.floorY = 0;
    player.position.copy(route.arrival);
    player.velocity.set(0, 0, 0);
    player.yaw = route.yaw;
    player.pitch = -0.03;
    player.inWater = false;
    player.submerged = false;
    player.breath = 100;
    player.needsBreath = false;
    player.wasSubmerged = false;
    game.enteredCity = true;
    game.seaWallInteraction = 0;
    game.interaction = 0;
    game.insertionUntil = game.elapsed + 0.7;
    $("objective").textContent = game.mode === "explore"
      ? "EXPLORE AT YOUR PACE · N FOR NEXT HISTORIC PLACE"
      : game.stage === "extract"
        ? "EXFILTRATE // REACH THE HARBOUR SKIFF"
        : "INFILTRATE // RECOVER THE SEALED DISPATCH";
    addFeed(`${route.shortName} // CITY BREACHED`);
    audio.pickup();
  }
  return true;
}

function updateTunnelTraversal(dt, prompt) {
  game.tunnelCooldown = Math.max(0, game.tunnelCooldown - dt);
  if (player.inWater) return false;
  const underground = game.inTunnel;
  const portal = arena.tunnel.portals.find((item) => {
    const point = underground ? item.underground : item.surface;
    return Math.hypot(player.position.x - point.x, player.position.z - point.z) < 2.35;
  });

  if (!portal || game.tunnelCooldown > 0) {
    game.tunnelInteraction = Math.max(0, game.tunnelInteraction - dt * 2.2);
    return false;
  }

  if (keys.has("KeyE")) game.tunnelInteraction += dt;
  else game.tunnelInteraction = Math.max(0, game.tunnelInteraction - dt * 2);
  const progress = THREE.MathUtils.clamp(game.tunnelInteraction / 0.9, 0, 1);
  const destination =
    portal.id === "fortress" ? "TEMPLAR FORTRESS" : "HARBOUR STAIR";
  prompt.innerHTML = `HOLD <strong>[ E ]</strong> ${
    underground ? `ASCEND TO ${destination}` : "ENTER TEMPLAR TUNNEL"
  }
    <span class="progress"><i style="width:${progress * 100}%"></i></span>`;
  prompt.classList.remove("hidden");

  if (progress >= 1) {
    const target = underground ? portal.surface : portal.underground;
    player.floorY = target.y;
    player.position.set(target.x, target.y + player.height, target.z);
    player.velocity.set(0, 0, 0);
    player.yaw = underground ? portal.exitYaw : portal.enterYaw;
    game.inTunnel = !underground;
    game.tunnelCooldown = 1.1;
    game.tunnelInteraction = 0;
    game.interaction = 0;
    addFeed(
      underground
        ? `${destination} // PASSAGE EXITED`
        : "TEMPLAR TUNNEL // BENEATH THE PISAN QUARTER",
    );
    audio.pickup();
  }
  return true;
}

function updateMission(dt) {
  missionObjects.terminalScreen.material.emissiveIntensity =
    0.78 + Math.sin(game.elapsed * 3.1) * 0.16;
  missionObjects.terminalLight.intensity = 2.1 + Math.sin(game.elapsed * 2.4) * 0.55;
  missionObjects.rings.forEach((ring, index) => {
    ring.rotation.z += dt * (0.18 + index * 0.08);
    ring.material.opacity = 0.45 + Math.sin(game.elapsed * 2 + index) * 0.2;
  });

  const prompt = $("interact-prompt");
  const seaWallPrompt = updateSeaWallTraversal(dt, prompt);
  const tunnelPrompt = !seaWallPrompt && updateTunnelTraversal(dt, prompt);
  let inRange = seaWallPrompt || tunnelPrompt;
  if (!seaWallPrompt && !tunnelPrompt && game.stage === "infiltrate") {
    const distance = player.position.distanceTo(missionObjects.terminal.position);
    if (distance < 2.15) {
      inRange = true;
      if (keys.has("KeyE")) game.interaction += dt;
      else game.interaction = Math.max(0, game.interaction - dt * 1.7);
      const progress = THREE.MathUtils.clamp(game.interaction / 3.5, 0, 1);
      prompt.innerHTML = `HOLD <strong>[ E ]</strong> TAKE SEALED DISPATCH
        <span class="progress"><i style="width:${progress * 100}%"></i></span>`;
      prompt.classList.remove("hidden");
      player.noise = Math.max(player.noise, keys.has("KeyE") ? 20 : player.noise);
      if (progress >= 1) {
        game.stage = "extract";
        game.interaction = 0;
        missionObjects.exfil.visible = true;
        missionObjects.terminalScreen.material.color.setHex(0x6b281c);
        missionObjects.terminalScreen.material.emissive.setHex(0x693017);
        $("objective").textContent = "EXFILTRATE // REACH THE HARBOUR SKIFF";
        addFeed("DISPATCH SECURED // SKIFF SIGNALLED");
        audio.pickup();
      }
    }
  } else if (!seaWallPrompt && !tunnelPrompt && game.stage === "extract") {
    const distance = player.position.distanceTo(missionObjects.exfil.position);
    if (distance < 2.8) {
      inRange = true;
      if (keys.has("KeyE")) game.interaction += dt;
      else game.interaction = Math.max(0, game.interaction - dt * 2);
      const progress = THREE.MathUtils.clamp(game.interaction / 1.6, 0, 1);
      prompt.innerHTML = `HOLD <strong>[ E ]</strong> BOARD SKIFF
        <span class="progress"><i style="width:${progress * 100}%"></i></span>`;
      prompt.classList.remove("hidden");
      if (progress >= 1) endGame(true);
    }
  }

  if (!inRange) {
    game.interaction = Math.max(0, game.interaction - dt * 2);
    prompt.classList.add("hidden");
  }
}

function updateArena(dt) {
  for (const item of arena.animated) {
    if (typeof item.userData.animate === "function") item.userData.animate(game.elapsed, dt);
  }
}

function updateWorldTime(dt, announce = true) {
  const wasNight = cycle.night;
  game.worldMinutes += dt * MINUTES_PER_REAL_SECOND;
  cycle = timeOfDay(game.worldMinutes);
  const occupants = [player.position, ...guards.filter(g=>!g.wallPatrol).map(g=>g.root.position)];
  if (cityLife.setClosed(cycle.night, occupants)) {
    arena.gateClosed = cityLife.closed;
    surfaceNavigation = createNavigator({colliders:arena.colliders,bounds:arena.bounds,isGround:arena.isDryLand});
    guidance.nextUpdate = 0;
    guards.forEach(guard=>{guard.navigationUntil=0;});
    renderer.shadowMap.needsUpdate = true;
    if (mapVisible) drawCityMap();
  }
  if (announce && wasNight !== cycle.night) {
    addFeed(cycle.night ? "NIGHTFALL · GATE CLOSING · KEEP UNSEEN" : "DAWN · GATE OPEN · PUBLIC STREETS WELCOME YOU");
    audio.timeBell();
  }
  const angle = (cycle.minute / 60 - 6) / 12 * Math.PI;
  sunDirection.set(Math.cos(angle),Math.max(0.04,Math.sin(angle)),0.45).normalize();
  sun.position.copy(sunDirection).multiplyScalar(222);
  sun.material.opacity = cycle.daylight;
  sun.visible = cycle.daylight > 0.01;
  moon.material.opacity = 1-cycle.daylight;
  stars.material.opacity = 0.82*(1-cycle.daylight);
  sky.material.uniforms.daylight.value = cycle.daylight;
  sky.material.uniforms.twilight.value = 4*cycle.daylight*(1-cycle.daylight);
  lightDirection.copy(moonDirection).lerp(sunDirection,cycle.daylight).normalize();
  moonTarget.position.set(player.position.x,0,player.position.z);
  moonLight.position.copy(player.position).addScaledVector(lightDirection,92);
  ambient.color.setRGB(0.326+cycle.daylight*.47,0.424+cycle.daylight*.43,0.616+cycle.daylight*.31);
  ambient.groundColor.setRGB(0.031+cycle.daylight*.23,0.043+cycle.daylight*.19,0.078+cycle.daylight*.1);
  moonLight.color.setRGB(0.663+cycle.daylight*.337,0.78+cycle.daylight*.15,1-cycle.daylight*.24);
  surfaceFogColor.setRGB(0.075+cycle.daylight*.45,0.141+cycle.daylight*.51,0.227+cycle.daylight*.51);
  surfaceBackgroundColor.copy(surfaceFogColor);
  arena.setDaylight(cycle.daylight);
  document.documentElement.dataset.timeOfDay = cycle.label.toLowerCase();
  $("world-clock").textContent = `${cycle.clock} · ${cycle.label}`;
  $("gate-status").textContent = cityLife.closed ? "GATE CLOSED · OPENS 06:00" : cycle.night ? "GATE CLOSING · CLEAR THE PASSAGE" : "GATE OPEN · CLOSES 18:00";
  $("city-rhythm").textContent = cycle.activity>.5 ? "Busy streets · footsteps masked" : "Few people · sound carries";
  $("map-time").textContent = `Day ${cycle.day} · ${cycle.clock} · ${cityLife.closed?"Land gate closed":"Land gate open"}`;
  $("pause-time").textContent = `Day ${cycle.day} · ${cycle.clock} · ${cityLife.closed?"Gate closed":"Gate open"}`;
  $("rest-button").disabled = !canRest({...game,inWater:player.inWater});
}

function restOneHour() {
  if (!canRest({...game,inWater:player.inWater})) {
    addFeed(player.inWater ? "REACH DRY GROUND TO REST" : "CANNOT REST NOW");
    return;
  }
  keys.clear();mouseButtons.clear();player.velocity.set(0,0,0);
  game.interaction=0;game.tunnelInteraction=0;game.seaWallInteraction=0;
  player.noise=0;
  game.worldMinutes+=60;game.restedHours++;
  updateWorldTime(0);
  guidance.nextUpdate=0;
  cityLife.update(0,cycle,player,game.inTunnel);
  updateTunnelAtmosphere(1);
  updateHUD();
  if(game.phase==="paused") showHUD(false);
  if(mapVisible) drawCityMap();
  renderer.shadowMap.needsUpdate=true;
  composer.render();
  $("rest-feedback").textContent = `One hour passes · Day ${cycle.day} · ${cycle.clock}`;
  $("rest-feedback").classList.add("show");
  clearTimeout(restFeedbackTimer);
  restFeedbackTimer=setTimeout(()=>$("rest-feedback").classList.remove("show"),1800);
  // Rest does not erase a witness's memory or make a restricted location safe.
}
let restFeedbackTimer;

function updateTunnelAtmosphere(dt) {
  const underground = game.inTunnel;
  const submerged = player.submerged;
  const blend = 1 - Math.exp(-dt * 4.5);
  ambient.intensity = THREE.MathUtils.damp(
    ambient.intensity,
    underground ? 0.12 : submerged ? 0.2 + cycle.daylight*.4 : 0.38 + cycle.daylight*1.35,
    4.5,
    dt,
  );
  moonLight.intensity = THREE.MathUtils.damp(
    moonLight.intensity,
    underground ? 0.03 : submerged ? 0.12 : 1.16 + cycle.daylight*1.9,
    4.5,
    dt,
  );
  viewLight.intensity = THREE.MathUtils.damp(
    viewLight.intensity,
    underground ? 0.2 : submerged ? 0.1 : 0.14,
    4.5,
    dt,
  );
  scene.environmentIntensity = THREE.MathUtils.damp(
    scene.environmentIntensity,
    underground ? 0.12 : submerged ? 0.08 : 0.24 + cycle.daylight*.35,
    4.5,
    dt,
  );
  scene.fog.color.lerp(
    underground ? tunnelFogColor : submerged ? waterFogColor : surfaceFogColor,
    blend,
  );
  scene.background.lerp(
    underground
      ? tunnelBackgroundColor
      : submerged
        ? waterBackgroundColor
        : surfaceBackgroundColor,
    blend,
  );
  scene.fog.near = THREE.MathUtils.damp(
    scene.fog.near,
    underground ? 7 : submerged ? 1.2 : 68,
    4.5,
    dt,
  );
  scene.fog.far = THREE.MathUtils.damp(
    scene.fog.far,
    underground ? 43 : submerged ? 24 : 240,
    4.5,
    dt,
  );
  const targetCameraFar = underground ? 68 : submerged ? 42 : 280;
  const nextCameraFar = THREE.MathUtils.damp(camera.far, targetCameraFar, 5, dt);
  if (Math.abs(nextCameraFar - camera.far) > 0.05) {
    camera.far = nextCameraFar;
    camera.updateProjectionMatrix();
  }
  sky.visible = !underground && !submerged;
  nightSky.visible = !underground && !submerged;
}

function updateHUD() {
  if (import.meta.env.DEV) {
    document.documentElement.dataset.mouseRun = String(mouseButtons.has(0));
    document.documentElement.dataset.mouseCrouch = String(mouseButtons.has(2));
    document.documentElement.dataset.posture = player.crouched ? "crouched" : "upright";
    document.documentElement.dataset.playerX = player.position.x.toFixed(3);
    document.documentElement.dataset.playerY = player.position.y.toFixed(3);
    document.documentElement.dataset.playerZ = player.position.z.toFixed(3);
    document.documentElement.dataset.inWater = String(player.inWater);
    document.documentElement.dataset.submerged = String(player.submerged);
    document.documentElement.dataset.breath = player.breath.toFixed(2);
    document.documentElement.dataset.needsBreath = String(player.needsBreath);
    document.documentElement.dataset.entryRoute = game.entryRoute?.id || "";
    document.documentElement.dataset.enteredCity = String(game.enteredCity);
    document.documentElement.dataset.wallGuardsValid = String(
      guards
        .filter((guard) => guard.wallPatrol)
        .every((guard) => {
          const patrol = guard.wallPatrol;
          const axis = patrol.axis;
          const crossAxis = axis === "x" ? "z" : "x";
          return (
            guard.root.position[axis] >= patrol.min - 0.01 &&
            guard.root.position[axis] <= patrol.max + 0.01 &&
            Math.abs(guard.root.position[crossAxis] - patrol.fixed) < 0.01 &&
            Math.abs(guard.root.position.y - patrol.floorY) < 0.01
          );
        }),
    );
    const liveStarAnchor = new THREE.Vector3(
      stars.geometry.attributes.position.getX(0),
      stars.geometry.attributes.position.getY(0),
      stars.geometry.attributes.position.getZ(0),
    );
    document.documentElement.dataset.starFieldFixed = String(
      liveStarAnchor.distanceToSquared(fixedStarAnchor) < 1e-10 &&
      nightSky.quaternion.angleTo(fixedCelestialRotation) < 1e-10,
    );
    document.documentElement.dataset.starAnchor = liveStarAnchor
      .toArray()
      .map((value) => value.toFixed(3))
      .join(",");
    document.documentElement.dataset.guardAudio = JSON.stringify(
      audio.guardDiagnostics(),
    );
    document.documentElement.dataset.streetDiscoveries = String(
      discoveredStreetStories.size,
    );
    document.documentElement.dataset.activeStreetStory = activeStreetStoryId;
    document.documentElement.dataset.guardOrderDiscoveries = String(
      discoveredGuardOrders.size,
    );
    document.documentElement.dataset.activeGuardOrder = activeGuardOrderId;
    document.documentElement.dataset.guardOrderGuideAvailable = String(
      Boolean($("guard-order-panel") && document.querySelector(".map-orders")),
    );
    document.documentElement.dataset.gameMode = game.mode;
    document.documentElement.dataset.invulnerable = String(game.mode === "explore");
    document.documentElement.dataset.explorationAlerts = String(game.explorationAlerts);
  }
  const detection = Math.round(game.detection);
  $("detection").textContent = `${String(detection).padStart(2, "0")}%`;
  $("detection").classList.toggle("caution", detection >= 20 && detection < 65);
  $("detection").classList.toggle("danger", detection >= 65);

  let profile = game.mode === "explore" ? "EXPLORER" : "GHOST";
  if (game.mode !== "explore" && game.maxDetection >= 55) profile = "EXPOSED";
  else if (game.mode !== "explore" && game.maxDetection >= 15) profile = "SHADOW";
  $("profile").textContent = profile;
  $("profile").classList.toggle("compromised", profile === "EXPOSED");

  const minutes = Math.floor(game.missionTime / 60);
  const seconds = Math.floor(game.missionTime % 60);
  $("timer").textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  $("noise-bar").style.width = `${Math.max(3, player.noise)}%`;
  $("noise-bar").style.background =
    player.noise > 65 ? "var(--danger)" : player.noise > 25 ? "var(--accent)" : "var(--cyan)";
  $("noise-state").textContent =
    player.noise > 65 ? "LOUD" : player.noise > 25 ? "AUDIBLE" : "SILENT";

  const waterOverlay = $("water-overlay");
  waterOverlay.classList.toggle("surface", player.inWater && !player.submerged);
  waterOverlay.classList.toggle("submerged", player.submerged);
  const breathPanel = $("breath-panel");
  breathPanel.classList.toggle("hidden", !player.inWater);
  breathPanel.classList.toggle(
    "warning",
    player.submerged && player.breath <= 32 && !player.needsBreath,
  );
  breathPanel.classList.toggle("gasping", player.needsBreath);
  $("breath-bar").style.width = `${THREE.MathUtils.clamp(player.breath, 0, 100)}%`;
  $("breath-state").textContent = player.needsBreath
    ? "GASPING"
    : player.submerged
      ? player.breath <= 32
        ? "LOW AIR"
        : "SUBMERGED"
      : "HEAD VISIBLE";
  const degrees = THREE.MathUtils.euclideanModulo(-THREE.MathUtils.radToDeg(player.yaw), 360);
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const cardinal = directions[Math.round(degrees / 45) % 8];
  $("compass-left").textContent = directions[(Math.round(degrees / 45) + 6) % 8];
  $("compass-right").textContent = directions[(Math.round(degrees / 45) + 2) % 8];
  $("bearing").textContent = `${cardinal}  ${String(Math.round(degrees)).padStart(3, "0")}`;

  updateNavigation();
  const next = guidance.path?.[1] || guidance.goal;
  const dx = (next?.x ?? player.position.x) - player.position.x;
  const dz = (next?.z ?? player.position.z) - player.position.z;
  $("waypoint-arrow").style.transform = `rotate(${THREE.MathUtils.radToDeg(Math.atan2(dx, -dz) + player.yaw)}deg)`;
  $("waypoint-arrow").style.opacity = guidance.path ? "1" : ".25";
  $("waypoint-task").textContent = guidance.label;
  $("waypoint-distance").textContent = guidance.path ? `${Math.round(routeLength(guidance.path))} PACES · VIA LANES` : "CHECK YOUR MAP";
  $("waypoint").classList.toggle("close", routeLength(guidance.path) < 4);
  $("map-objective").textContent = guidance.label;
  $("watch-state").textContent = game.detection > 65 ? "YOU ARE BEING IDENTIFIED · BREAK SIGHT" : game.detection > 35 ? "WATCH IS SEARCHING · FIND COVER" : game.detection > 10 ? "SOMETHING WAS NOTICED" : accessAt(player.position,cycle,game.inTunnel,player.inWater).label;
  $("watch-state").classList.toggle("danger", game.detection > 65);
  const firstMinute = game.missionTime < 24;
  $("travel-hint").classList.toggle("hidden", !firstMinute || game.detection > 35);
  $("travel-hint").textContent = player.inWater ? "Hold RMB to dive. Surface before your breath runs out. At a marked wall, hold E to climb." : "WASD move · RMB crouch · LMB run · Hold M to plan · E at stairs and objects";
  const currentZone = arena.zones.find((zone) => zone.box.containsPoint(player.position));
  $("location").textContent = player.inWater
    ? "MEDITERRANEAN SEA"
    : currentZone?.name || "OLD ACRE";
  updateStreetStories();
  updateGuardOrderGuide();
}

function updateStreetStories() {
  const panel = $("life-panel");
  if (game.inTunnel || player.inWater) {
    if (game.elapsed >= streetStoryVisibleUntil) panel.classList.add("hidden");
    return;
  }

  let nearest = null;
  let nearestDistance = Infinity;
  for (const story of arena.streetStories) {
    const distance = Math.hypot(
      story.position.x - player.position.x,
      story.position.z - player.position.z,
    );
    if (distance <= story.radius && distance < nearestDistance) {
      nearest = story;
      nearestDistance = distance;
    }
  }

  if (nearest) {
    streetStoryVisibleUntil = game.elapsed + 7.5;
    if (activeStreetStoryId !== nearest.id) {
      activeStreetStoryId = nearest.id;
      const firstDiscovery = !discoveredStreetStories.has(nearest.id);
      discoveredStreetStories.add(nearest.id);
      $("life-title").textContent = nearest.title;
      $("life-context").textContent = nearest.context;
      $("life-copy").textContent = nearest.fact;
      $("life-progress").textContent =
        `DISCOVERED ${discoveredStreetStories.size} / ${arena.streetStories.length}`;
      panel.classList.add("hidden");
      requestAnimationFrame(() => panel.classList.remove("hidden"));
      if (firstDiscovery) addFeed(`LIFE IN ACRE // ${nearest.title}`);
    } else {
      panel.classList.remove("hidden");
    }
  } else if (game.elapsed >= streetStoryVisibleUntil) {
    panel.classList.add("hidden");
    activeStreetStoryId = "";
  }
}

const guardOrderEye = new THREE.Vector3();
const guardOrderPoint = new THREE.Vector3();
const guardOrderDirection = new THREE.Vector3();
const guardOrderForward = new THREE.Vector3();
function revealGuardOrder(order) {
  const panel = $("guard-order-panel");
  activeGuardOrderId = order.id;
  guardOrderVisibleUntil = game.elapsed + 9;
  discoveredGuardOrders.add(order.id);
  panel.style.setProperty("--order-color", order.accent);
  $("guard-order-sigil").textContent = order.sigil;
  $("guard-order-name").textContent = order.name;
  $("guard-order-type").textContent = order.type;
  $("guard-order-copy").textContent = order.fact;
  panel.classList.toggle("pressure", game.detection >= 55);
  panel.classList.add("hidden");
  void panel.offsetWidth;
  panel.classList.remove("hidden");
  addFeed(`FIELD GUIDE // ${order.shortName}`);
}

function updateGuardOrderGuide() {
  const panel = $("guard-order-panel");
  panel.classList.toggle("pressure", game.detection >= 55);
  if (game.inTunnel || player.submerged || game.detection >= 55) {
    panel.classList.add("hidden");
    return;
  }

  if (activeGuardOrderId && game.elapsed < guardOrderVisibleUntil) {
    panel.classList.remove("hidden");
    return;
  }
  panel.classList.add("hidden");
  activeGuardOrderId = "";
  if (
    game.detection > 25 || activeStreetStoryId || discoveredGuardOrders.size >= Object.keys(guardOrderDefinitions).length
  ) return;

  guardOrderEye.copy(player.position);
  guardOrderEye.y += 0.04;
  camera.getWorldDirection(guardOrderForward);
  guardOrderForward.y = 0;
  if (guardOrderForward.lengthSq() > 0.001) guardOrderForward.normalize();

  let nearestGuard = null;
  let nearestDistance = Infinity;
  for (const guard of guards) {
    if (discoveredGuardOrders.has(guard.order.id)) continue;
    guardOrderDirection.copy(guard.root.position).sub(player.position);
    guardOrderDirection.y = 0;
    const distance = guardOrderDirection.length();
    if (distance > 17 || distance >= nearestDistance || distance < 0.001) continue;
    guardOrderDirection.multiplyScalar(1 / distance);
    if (guardOrderForward.dot(guardOrderDirection) < 0.4) continue;
    guardOrderPoint.copy(guard.root.position);
    guardOrderPoint.y += 1.25;
    if (!clearLineOfSight(guardOrderEye, guardOrderPoint)) continue;
    nearestGuard = guard;
    nearestDistance = distance;
  }
  if (nearestGuard) revealGuardOrder(nearestGuard.order);
}

function updateNavigation() {
  const key = `${game.stage}:${game.inTunnel}:${game.enteredCity}:${game.tourIndex}:${player.inWater}:${cityLife.closed}`;
  if (key === guidance.key && game.elapsed < guidance.nextUpdate) return;
  guidance.key = key;
  guidance.nextUpdate = game.elapsed + .85;
  const tour = game.mode === "explore" && game.tourIndex >= 0 ? HISTORIC_STOPS[game.tourIndex] : null;
  let goal = tour || (game.stage === "infiltrate" ? arena.mission.target : arena.mission.exfil);
  let label = tour ? `${game.tourIndex + 1}. ${tour.name}` : game.stage === "infiltrate" ? "Recover the sealed dispatch" : "Reach the harbour skiff";
  if (player.inWater && !game.inTunnel) {
    const entry = nearestSeaEntry();
    goal = entry.exterior;
    label = `${entry.shortName} · hold E to climb`;
    guidance.path = [{x:player.position.x,z:player.position.z}, {x:goal.x,z:goal.z}];
  } else if (game.inTunnel) {
    const portal = arena.tunnel.portals[goal.x < 0 ? 0 : 1];
    goal = portal.underground;
    label = `Follow the tunnel · ${portal.id === "port" ? "harbour stair" : "fortress stair"}`;
    guidance.path = tunnelNavigation.route(player.position, goal);
  } else {
    guidance.path = surfaceNavigation.route(player.position, goal);
    if (!guidance.path && cityLife.closed && player.position.x>92 && player.position.z<-60) {
      goal = {x:100,z:-71};
      label = "Gate closed · R to rest · opens 06:00";
      guidance.path = surfaceNavigation.route(player.position,goal);
    }
    if (!guidance.path && !tour && game.stage === "extract") {
      goal = arena.tunnel.portals[0].surface;
      label = "Reach the Templar passage · hold E at stair";
      guidance.path = surfaceNavigation.route(player.position, goal);
    }
  }
  guidance.goal = {x:goal.x,z:goal.z}; guidance.label = label;
  $("map-objective").textContent = guidance.label;
  if (tour) {
    const reached = !game.inTunnel && Math.hypot(tour.x-player.position.x,tour.z-player.position.z)<7;
    if (reached && !game.tourDiscovered.has(game.tourIndex)) {
      game.tourDiscovered.add(game.tourIndex);
      addFeed(`${tour.name} · hold M to read · N for next place`);
    }
    $("tour-title").textContent = `${game.tourIndex+1} / ${HISTORIC_STOPS.length} · ${tour.name}`;
    $("tour-evidence").textContent = tour.evidence;
    $("tour-copy").textContent = tour.text;
    $("tour-progress").textContent = `${game.tourDiscovered.size} places visited · N next · Shift+N previous`;
  }
}

function drawCityMap() {
  updateNavigation();
  drawMap({ arena, player, path: guidance.path, goal: guidance.goal,
    elapsed: settings.reducedMotion ? 0 : game.elapsed,
    inTunnel: game.inTunnel, exploring: game.mode === "explore" });
}
function addFeed(text) {
  const item = document.createElement("span");
  item.textContent = text;
  item.dataset.feed = `${feedIndex++}`;
  $("combat-feed").prepend(item);
  setTimeout(() => item.remove(), 3500);
}

function showHUD(show) {
  ["top-hud", "bottom-hud", "compass", "waypoint", "map-key", "combat-feed", "watch-state", "time-panel"].forEach((id) => {
    $(id).classList.toggle("hidden", !show);
  });
  if (!show) {
    $("life-panel").classList.add("hidden");
    $("guard-order-panel").classList.add("hidden");
    $("travel-hint").classList.add("hidden");
  }
}

function hideCityMap() {
  mapVisible = false;
  $("city-map").classList.add("hidden");
}

function pauseGame(message = "Take your time. The watch is paused.") {
  if (game.phase === "briefing" || game.phase === "ended") return;
  game.phase = "paused";
  if (document.pointerLockElement === canvas) document.exitPointerLock();
  keys.clear(); mouseButtons.clear(); hideCityMap(); showHUD(false);
  player.velocity.set(0,0,0);
  $("interact-prompt").classList.add("hidden");
  $("pause-copy").textContent = message;
  $("pause-screen").classList.remove("hidden");
  $("pause-screen").classList.add("visible");
}

function requestGamePointerLock() {
  const failed = () => pauseGame("Mouse capture was unavailable. Click Return to Acre to try again; if this is an embedded preview, open the game in its own browser tab.");
  try {
    const request = canvas.requestPointerLock();
    if (request?.catch) request.catch(failed);
  } catch {
    failed();
  }
}

function selectEntryRoute(routeId) {
  const route = arena.entryRoutes.find((candidate) => candidate.id === routeId);
  if (!route) return;
  selectedRouteId = route.id;
  document.querySelectorAll(".route-option").forEach((button) => {
    button.classList.toggle("active", button.dataset.route === route.id);
  });
  $("route-status").innerHTML = `<i></i> INSERTION · ${route.name}`;
  const closedGate = route.id === "gate" && cycle.night;
  $("route-method").textContent = closedGate ? "CLOSED UNTIL DAWN" : route.method;
  $("route-description").textContent = closedGate
    ? "Gate closed until 06:00 · rest outside or choose a sea entry"
    : route.description;
}

function selectGameMode(modeId) {
  if (modeId !== "stealth" && modeId !== "explore") return;
  selectedModeId = modeId;
  const exploring = modeId === "explore";
  document.querySelectorAll(".mode-option").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === modeId);
  });
  $("mode-method").textContent = exploring ? "INVULNERABLE" : "STEALTH MISSION";
  $("mode-description").textContent = exploring
    ? "No death or detection failure · explore the city freely"
    : "Detection ends the mission · intended stealth challenge";
  $("deploy-button").innerHTML = exploring
    ? "BEGIN EXPLORATION <i>→</i>"
    : "BEGIN INFILTRATION <i>→</i>";
}

function deploy() {
  const route =
    arena.entryRoutes.find((candidate) => candidate.id === selectedRouteId) ||
    arena.entryRoutes[0];
  const seaInsertion = route.id !== "gate";
  game.worldMinutes = Number($("arrival-time").value);
  audio.unlock();
  audio.ambientStart();
  game.tourIndex = selectedModeId === "explore" ? 0 : -1;
  $("map-tour").classList.toggle("hidden", selectedModeId !== "explore");
  $("tour-key").classList.toggle("hidden", selectedModeId !== "explore");
  guidance.nextUpdate = 0;
  player.height = 1.72;
  player.floorY = seaInsertion ? waterFloorY : route.spawn.y - player.height;
  player.position.copy(route.spawn);
  if (seaInsertion) player.position.y = waterSurfaceY + 0.16;
  if (devGuardAudioTest && route.id === "gate") {
    player.position.set(99, 1.72, -71);
  }
  if (devGuardAlertTest && route.id === "gate") {
    player.position.set(90, 1.72, -71);
  }
  const coverTest = arena.streetCover.find((cover) => cover.id === devCoverTestId);
  if (coverTest) {
    player.floorY = 0;
    player.position.copy(coverTest.approach);
    player.position.y = player.height;
  }
  player.velocity.set(0, 0, 0);
  player.yaw = route.yaw;
  player.pitch = -0.03;
  if (coverTest) {
    player.yaw = Math.atan2(
      coverTest.approach.x - coverTest.position.x,
      coverTest.approach.z - coverTest.position.z,
    );
  }
  guards.forEach((guard) => {
    guard.lastAudioDistance = Math.hypot(
      guard.root.position.x - player.position.x,
      guard.root.position.z - player.position.z,
    );
    guard.approachRate = 0;
    guard.lastFootstepIndex = Math.floor((guard.phase * 7.5) / Math.PI);
  });
  player.inWater = seaInsertion;
  player.submerged = false;
  player.breath = 100;
  player.needsBreath = false;
  player.wasSubmerged = false;
  game.phase = "running";
  game.mode = selectedModeId;
  game.compromised = false;
  game.explorationAlerts = 0;
  game.alarmCooldown = 0;
  game.entryRoute = route;
  game.enteredCity = !seaInsertion;
  game.seaWallInteraction = 0;
  game.insertionUntil = game.elapsed + (game.enteredCity ? 2.5 : 1.25);
  updateWorldTime(0,false);
  cityLife.update(0,cycle,player,game.inTunnel);
  updateTunnelAtmosphere(1);
  if (devFastInteractions && !game.enteredCity) {
    keys.add("KeyE");
    setTimeout(() => keys.delete("KeyE"), 180);
  }
  if (devAutoWalk) {
    keys.add("KeyW");
    setTimeout(() => keys.delete("KeyW"), 3000);
  }
  if (devAutoDive && seaInsertion) {
    keys.add("ControlLeft");
    setTimeout(
      () => keys.delete("ControlLeft"),
      devFastBreath ? 3000 : 9000,
    );
  }
  $("objective").textContent = game.enteredCity
    ? "INFILTRATE // RECOVER THE SEALED DISPATCH"
    : `INFILTRATE // ${route.method} AT ${route.shortName}`;
  $("mode-status").textContent =
    game.mode === "explore" ? "EXPLORATION // INVULNERABLE" : "STEALTH MISSION";
  $("mode-status").classList.toggle("exploration", game.mode === "explore");
  if(game.mode === "explore") $("objective").textContent = "EXPLORE AT YOUR PACE · N FOR NEXT HISTORIC PLACE";
  $("start-screen").classList.remove("visible");
  $("start-screen").classList.add("hidden");
  $("pause-screen").classList.add("hidden");
  showHUD(true);
  if (import.meta.env.DEV && new URLSearchParams(location.search).has("map")) {
    mapVisible = true;
    $("city-map").classList.remove("hidden");
    drawCityMap();
  }
  requestGamePointerLock();
  addFeed(`${route.shortName} // INSERTION BEGUN`);
  if (seaInsertion) addFeed("WATERLINE // CROUCH TO SUBMERGE");
  addFeed(
    game.mode === "explore"
      ? "EXPLORATION MODE // NO FAILURE"
      : "UNARMED // LEAVE NO TRACE",
  );
}

function endGame(success) {
  if (game.phase === "ended") return;
  game.phase = "ended";
  try {
    document.exitPointerLock();
  } catch {
    // No active lock in embedded previews.
  }
  showHUD(false);
  hideCityMap();
  $("water-overlay").classList.remove("surface", "submerged");
  $("interact-prompt").classList.add("hidden");
  $("damage-direction").classList.remove("show", "suspicion");
  $("end-screen").classList.remove("hidden");
  $("end-screen").classList.add("visible");

  const exploring = game.mode === "explore";
  const immaculate = success && game.maxDetection < 12;
  $("end-title").textContent = success
    ? exploring
      ? "EXPLORATION COMPLETE"
      : immaculate
        ? "UNSEEN PASSAGE"
        : "THE SEA ROAD"
    : "COMPROMISED";
  $("end-copy").textContent = success
    ? exploring
      ? "The city remains open to memory. The dispatch is aboard whenever you are ready to leave."
      : immaculate
        ? "The dispatch is aboard. No witnesses, no injuries, no trace."
        : "The dispatch is aboard. The watch grew suspicious, but no alarm was raised."
    : "The city watch confirmed an intruder. The mission has failed.";

  $("final-detection").textContent = `${Math.round(game.maxDetection)}%`;
  $("final-alarm").textContent = game.compromised ? "YES" : "NO";
  const minutes = Math.floor(game.missionTime / 60);
  const seconds = Math.floor(game.missionTime % 60);
  $("final-time").textContent = `${minutes}:${String(seconds).padStart(2, "0")}`;
}

document.addEventListener("keydown", (event) => {
  if (/^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName)) return;
  if (game.phase !== "running") return;
  if(event.code==="KeyR"&&!event.repeat) { event.preventDefault();restOneHour();return; }
  if (["KeyW","KeyA","KeyS","KeyD","KeyE","KeyM","Space","ControlLeft"].includes(event.code)) event.preventDefault();
  keys.add(event.code);
  if (event.code === "KeyN" && !event.repeat && game.mode === "explore") {
    game.tourIndex = (game.tourIndex + (event.shiftKey ? HISTORIC_STOPS.length-1 : 1)) % HISTORIC_STOPS.length;
    guidance.nextUpdate = 0; updateNavigation();
    addFeed(`Visit ${HISTORIC_STOPS[game.tourIndex].name} · M for history`);
    if (mapVisible) drawCityMap();
  }
  if (event.code === "KeyM" && game.phase === "running" && !event.repeat) {
    mapVisible = true;
    mouseButtons.clear();
    player.velocity.set(0,0,0);
    $("city-map").classList.remove("hidden");
    drawCityMap();
  }
  if (event.code === "KeyV" && !event.repeat) {
    audio.setMuted(!audio.muted);
    addFeed(audio.muted ? "AUDIO MUTED" : "AUDIO RESTORED");
  }
});
document.addEventListener("keyup", (event) => {
  keys.delete(event.code);
  if (event.code === "KeyM") {
    mapVisible = false;
    $("city-map").classList.add("hidden");
  }
});
document.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement !== canvas || game.phase !== "running" || mapVisible) return;
  player.yaw -= event.movementX * 0.00175 * settings.sensitivity;
  player.pitch -= event.movementY * 0.00175 * settings.sensitivity;
  player.pitch = THREE.MathUtils.clamp(player.pitch, -1.42, 1.42);
});
document.addEventListener("mousedown", (event) => {
  if (import.meta.env.DEV) {
    document.documentElement.dataset.lastMouseDown = String(event.button);
  }
  if (
    game.phase === "running" && document.pointerLockElement === canvas && !mapVisible &&
    (event.button === 0 || event.button === 2)
  ) {
    mouseButtons.add(event.button);
  }
});
document.addEventListener("mouseup", (event) => {
  mouseButtons.delete(event.button);
});
document.addEventListener("contextmenu", (event) => event.preventDefault());
document.addEventListener("pointerlockchange", () => {
  if (game.phase === "ended" || game.phase === "briefing") return;
  if (document.pointerLockElement !== canvas) {
    pauseGame();
  } else {
    game.phase = "running";
    $("pause-screen").classList.remove("visible");
    $("pause-screen").classList.add("hidden");
    showHUD(true);
  }
});
addEventListener("blur", () => pauseGame());
document.addEventListener("visibilitychange", () => { if (document.hidden) pauseGame(); });
document.addEventListener("pointerlockerror", () => pauseGame("Mouse capture was denied. Click Return to Acre to retry."));

$("deploy-button").addEventListener("click", deploy);
document.querySelectorAll(".route-option").forEach((button) => {
  button.addEventListener("click", () => selectEntryRoute(button.dataset.route));
});
document.querySelectorAll(".mode-option").forEach((button) => {
  button.addEventListener("click", () => selectGameMode(button.dataset.mode));
});
$("resume-button").addEventListener("click", requestGamePointerLock);
$("restart-button").addEventListener("click", () => location.reload());
$("new-route-button").addEventListener("click", () => location.reload());
$("rest-button").addEventListener("click", restOneHour);
$("arrival-time").addEventListener("change",()=>{
  game.worldMinutes=Number($("arrival-time").value);updateWorldTime(0,false);
  selectEntryRoute(selectedRouteId);
  cityLife.update(0,cycle,player,false);updateTunnelAtmosphere(1);
});
document.querySelectorAll("[data-setting]").forEach(input => {
  const name = input.dataset.setting;
  if (input.type === "checkbox") input.checked = settings[name];
  else input.value = settings[name];
  input.addEventListener("input", () => {
    settings[name] = input.type === "checkbox" ? input.checked : Number(input.value);
    renderer.toneMappingExposure = settings.brightness;
    document.documentElement.classList.toggle("reduced-motion", settings.reducedMotion);
    document.querySelectorAll(`[data-setting="${name}"]`).forEach(other => {
      if (other.type === "checkbox") other.checked = settings[name]; else other.value = settings[name];
    });
    try { localStorage.setItem("acre-settings", JSON.stringify(settings)); } catch {}
    composer.render();
  });
});
$("setting-note").textContent = SETTING_NOTE;
document.documentElement.classList.toggle("reduced-motion", settings.reducedMotion);
canvas.addEventListener("click", () => {
  if (game.phase === "running" && document.pointerLockElement !== canvas) requestGamePointerLock();
});
if (import.meta.env.DEV && new URLSearchParams(location.search).has("map")) {
  // Deterministic map-only entry for visual regression captures.
  setTimeout(deploy, 50);
}

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderQuality.maxPixelRatio = Math.min(
    devicePixelRatio,
    innerWidth <= 820 ? 1.25 : 2,
  );
  renderQuality.pixelRatio = Math.min(renderQuality.pixelRatio, renderQuality.maxPixelRatio);
  applyRenderSize();
  renderer.shadowMap.needsUpdate = true;
  if (mapVisible) drawCityMap();
});

let performanceFrames = 0;
let performanceWindowStarted = performance.now();
let lastFrameRenderStats = { calls: 0, triangles: 0 };
let renderTimeSamples = [];
let frameWorkSamples = [];
let hudElapsed = Infinity;
function updateAdaptiveQuality(now) {
  performanceFrames += 1;
  const windowDuration = now - performanceWindowStarted;
  if (windowDuration < 2000) return;

  const measuredFps = (performanceFrames * 1000) / windowDuration;
  const fps = Math.round(measuredFps);
  const sortedRenderTimes = renderTimeSamples.slice().sort((a, b) => a - b);
  const averageRenderMs = sortedRenderTimes.length
    ? sortedRenderTimes.reduce((sum, value) => sum + value, 0) / sortedRenderTimes.length
    : 0;
  const p95RenderMs = sortedRenderTimes.length
    ? sortedRenderTimes[Math.min(
        sortedRenderTimes.length - 1,
        Math.floor(sortedRenderTimes.length * 0.95),
      )]
    : 0;
  const sortedFrameWork = frameWorkSamples.slice().sort((a, b) => a - b);
  const averageFrameWorkMs = sortedFrameWork.length
    ? sortedFrameWork.reduce((sum, value) => sum + value, 0) / sortedFrameWork.length
    : 0;
  const p95FrameWorkMs = sortedFrameWork.length
    ? sortedFrameWork[Math.min(
        sortedFrameWork.length - 1,
        Math.floor(sortedFrameWork.length * 0.95),
      )]
    : 0;
  renderQuality.lastFps = fps;
  let qualityChanged = false;
  if (game.phase === "running" && !mapVisible) {
    const renderOverloaded =
      p95RenderMs > 16 ||
      averageRenderMs > 12 ||
      // Driver submission time can be low while Retina fill-rate is saturated.
      // Respect actual frame cadence too; never undersample desktop below 1×.
      measuredFps < 52;
    const renderHasHeadroom =
      measuredFps >= 58 &&
      p95RenderMs > 0 &&
      p95RenderMs < 9 &&
      averageRenderMs < 7;
    if (renderOverloaded) {
      renderQuality.upgradeWindows = 0;
      if (renderQuality.pixelRatio > renderQuality.minPixelRatio + 0.01) {
        renderQuality.pixelRatio = Math.max(
          renderQuality.minPixelRatio,
          renderQuality.pixelRatio - 0.12,
        );
        qualityChanged = true;
      }
    } else if (renderHasHeadroom) {
      renderQuality.upgradeWindows += 1;
      if (
        renderQuality.upgradeWindows >= 3 &&
        renderQuality.pixelRatio < renderQuality.maxPixelRatio - 0.01
      ) {
        renderQuality.pixelRatio = Math.min(
          renderQuality.maxPixelRatio,
          renderQuality.pixelRatio + 0.08,
        );
        renderQuality.upgradeWindows = 0;
        qualityChanged = true;
      }
    } else {
      renderQuality.upgradeWindows = 0;
    }
  }
  if (qualityChanged) applyRenderSize();

  if (import.meta.env.DEV) {
    document.documentElement.dataset.renderStats = JSON.stringify({
      fps,
      calls: lastFrameRenderStats.calls,
      triangles: lastFrameRenderStats.triangles,
      textures: renderer.info.memory.textures,
      geometries: renderer.info.memory.geometries,
      pixelRatio: Number(renderQuality.pixelRatio.toFixed(2)),
      ao: false,
      shadows: renderQuality.shadows,
      averageRenderMs: Number(averageRenderMs.toFixed(2)),
      p95RenderMs: Number(p95RenderMs.toFixed(2)),
      averageFrameWorkMs: Number(averageFrameWorkMs.toFixed(2)),
      p95FrameWorkMs: Number(p95FrameWorkMs.toFixed(2)),
    });
  }
  renderTimeSamples = [];
  frameWorkSamples = [];
  performanceFrames = 0;
  performanceWindowStarted = now;
}

function animate() {
  requestAnimationFrame(animate);
  const frameWorkStarted = performance.now();
  const dt = Math.min(clock.getDelta(), 0.04);
  const playing = game.phase === "running" && !mapVisible;
  if (playing) { game.elapsed += dt;updateWorldTime(dt); }
  gradePass.uniforms.time.value = settings.reducedMotion ? 0 : game.elapsed;
  shadowUpdateElapsed += dt;
  if (renderQuality.shadows && shadowUpdateElapsed >= 0.12) {
    moonTarget.position.set(player.position.x, 0, player.position.z);
    moonLight.position.copy(player.position).addScaledVector(lightDirection, 92);
    renderer.shadowMap.needsUpdate = true;
    shadowUpdateElapsed = 0;
  }
  updateArena(dt);
  updateTunnelAtmosphere(dt);

  if (playing) {
    game.missionTime += dt;
    updatePlayer(dt);
    cityLife.update(dt,cycle,player,game.inTunnel);
    audio.cityAmbience(dt,cycle.activity,cityLife.crowdMask(player.position),game.inTunnel||player.submerged);
    updateGuards(dt);
    if (game.phase === "running") updateMission(dt);
    hudElapsed += dt;
    if (hudElapsed >= 0.05) {
      updateHUD();
      hudElapsed = 0;
    }
  } else if (game.phase === "briefing") {
    camera.position.set(100, 25, 105);
    camera.lookAt(-18, 5, -18);
  }
  nightSky.position.copy(camera.position);
  nightSky.quaternion.copy(fixedCelestialRotation);
  if (!mapVisible && (game.phase === "running" || game.phase === "briefing")) {
    const renderStarted = performance.now();
    composer.render();
    renderTimeSamples.push(performance.now() - renderStarted);
    lastFrameRenderStats = {
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
    };
  }
  renderer.info.reset();
  frameWorkSamples.push(performance.now() - frameWorkStarted);
  updateAdaptiveQuality(performance.now());
}

if (import.meta.env.DEV) {
  const savedPosition = player.position.clone();
  const savedVelocity = player.velocity.clone();
  const savedHeight = player.height;
  const savedFloorY = player.floorY;

  player.height = 1.72;
  player.floorY = 0;
  player.position.set(99, 1.72, -50);
  movePlayerWithCollisions(-10, 0);
  const eastWallStop = player.position.x;

  player.position.set(-31, 1.72, -48);
  movePlayerWithCollisions(0, -20);
  const hospitallerWallStop = player.position.z;

  player.floorY = -5.25;
  player.position.set(-10, -3.53, 50);
  movePlayerWithCollisions(0, -10);
  const tunnelWallStop = player.position.z;

  document.documentElement.dataset.collisionSelfTest = String(
    eastWallStop >= 96.05 &&
      hospitallerWallStop >= -51.55 &&
      tunnelWallStop >= 48.48,
  );
  document.documentElement.dataset.collisionStops = [
    eastWallStop,
    hospitallerWallStop,
    tunnelWallStop,
  ]
    .map((value) => value.toFixed(3))
    .join(",");
  document.documentElement.dataset.missionAnchorsClear = String(
    !boxCollides(
      new THREE.Vector3(
        arena.mission.target.x,
        1.72,
        arena.mission.target.z,
      ),
    ) &&
      !boxCollides(
        new THREE.Vector3(
          arena.mission.exfil.x,
          1.72,
          arena.mission.exfil.z,
        ),
      ) &&
      !boxCollides(
        new THREE.Vector3(
          arena.tunnel.portals[0].underground.x,
          arena.tunnel.floorY + 1.72,
          arena.tunnel.portals[0].underground.z,
        ),
      ) &&
      !boxCollides(
        new THREE.Vector3(
          arena.tunnel.portals[1].underground.x,
          arena.tunnel.floorY + 1.72,
          arena.tunnel.portals[1].underground.z,
        ),
      ),
  );
  document.documentElement.dataset.entryAnchorsClear = String(
    arena.entryRoutes.every((route) => {
      const points = [route.spawn, route.arrival];
      if (route.exterior) {
        points.push(
          new THREE.Vector3(
            route.exterior.x,
            route.exterior.y + player.height,
            route.exterior.z,
          ),
        );
      }
      return points.every((point) => !boxCollides(point));
    }),
  );

  player.position.copy(savedPosition);
  player.velocity.copy(savedVelocity);
  player.height = savedHeight;
  player.floorY = savedFloorY;
}

updateWorldTime(0,false);
cityLife.update(0,cycle,player,false);
updateTunnelAtmosphere(1);
animate();
