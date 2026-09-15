import { mergeGeometries as mergeBufferGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { ACRE_PLAN, pointInPolygon } from "./acre-plan.js";
import { voussoirArch, decorateHouse, merchantHull, vesselDetailParts, potteryDisplay, sgraffitoTexture, combine } from "./visual-detail.js";
import { HISTORIC_STOPS } from "./history.js";

export function mergeGeometries(geometries, useGroups = false) {
  if (!Array.isArray(geometries) || geometries.length === 0) {
    throw new Error("Cannot merge an empty geometry collection");
  }
  const indexedCount = geometries.reduce(
    (count, geometry) => count + (geometry.index !== null ? 1 : 0),
    0,
  );
  const converted = [];
  const compatibleGeometries = (
    indexedCount > 0 && indexedCount < geometries.length
      ? geometries.map((geometry) => {
        if (geometry.index === null) return geometry;
        const nonIndexed = geometry.toNonIndexed();
        converted.push(nonIndexed);
        return nonIndexed;
      })
      : geometries
  );
  const merged = mergeBufferGeometries(compatibleGeometries, useGroups);
  converted.forEach((geometry) => geometry.dispose());
  if (!merged) {
    throw new Error("Three.js rejected an incompatible geometry merge");
  }
  return merged;
}

/**
 * A playable interpretation of Frankish Acre around 1250 CE.
 *
 * The plan follows the historical peninsula: sea to the west and south, the
 * protected harbour to the south-east, doubled land walls around Montmusard,
 * the Hospitaller compound in the north-west of the old city, the Templar
 * quarter at the south-western tip, and the Italian merchant quarters between
 * the military compounds and harbour.
 */
export function buildArena(THREE, scene) {
  const colliders = [];
  const animated = [];
  const pickups = [];
  const movableProps = [];
  const streetCover = [];
  const streetStories = [];
  const root = new THREE.Group();
  root.name = "Acre, 1250 CE";
  scene.add(root);
  let daylightAmount = 1;

  const objectRenderBudget = {
    entryProps: {
      skiffs: 0,
      hulls: 0,
      floorPlanks: 0,
      thwarts: 0,
      gunwales: 0,
      stemPosts: 0,
      oars: 0,
      rowlocks: 0,
      ropeRuns: 0,
      ropeKnots: 0,
      breachStones: 0,
      renderedTriangles: 0,
    },
    mooringFixtures: {
      posts: 0,
      ropeCoils: 0,
      looseTails: 0,
      staticTriangles: 0,
    },
    fishingGear: {
      netFrames: 0,
      dryingPosts: 0,
      netSegments: 0,
      sinkers: 0,
      staticTriangles: 0,
    },
    landscape: {
      approachRocks: 0,
      shorelineRocks: 0,
      scrubClusters: 0,
      renderedTriangles: 0,
    },
    tunnelLamps: {
      instances: 0,
      wallPlates: 0,
      bracketArms: 0,
      bowls: 0,
      spouts: 0,
      handles: 0,
      wicks: 0,
      pointLights: 0,
      staticTriangles: 0,
    },
    textiles: {
      banners: 0,
      bannerRails: 0,
      awningCanopies: 0,
      awningValances: 0,
      awningPoles: 0,
      awningPoleMeshes: 0,
      awningLashings: 0,
      awningCordSegments: 0,
      awningCordDraws: 0,
      dryingSheets: 0,
      clotheslines: 0,
      staticTriangles: 0,
    },
    atmosphere: {
      cloudDraws: 0,
      smokePuffs: 0,
      smokeDraws: 0,
      dustPoints: 0,
      dustDraws: 0,
      gulls: 0,
      gullDraws: 0,
      gullTriangles: 0,
      animatedSystems: 0,
    },
    marketGoods: {
      producePieces: 0,
      produceStems: 0,
      produceTriangles: 0,
      sugarMolds: 0,
      sugarRims: 0,
      sugarOpenings: 0,
      sugarTriangles: 0,
    },
    baskets: {
      instances: 0,
      bodies: 0,
      rims: 0,
      baseRings: 0,
      handles: 0,
      ribs: 0,
      staticTriangles: 0,
    },
    amphorae: {
      instances: 0,
      bodies: 0,
      rims: 0,
      handles: 0,
      openings: 0,
      staticTriangles: 0,
    },
    tradeCrates: {
      instances: 0,
      bodyPlanks: 0,
      lidPlanks: 0,
      edgeBattens: 0,
      crossBattens: 0,
      diagonalBraces: 0,
      nails: 0,
      staticTriangles: 0,
    },
    movableProps: {
      instances: 0,
      amphorae: 0,
      tradeCrates: 0,
      sourceMeshes: 0,
      dynamicDraws: 0,
    },
    shutters: {
      materialVariants: 2,
      textureSize: 512,
      frontLeaves: 0,
      sideLeaves: 0,
      staticTriangles: 0,
    },
    doors: {
      instances: 0,
      bodyPlanks: 0,
      hingeStraps: 0,
      rivets: 0,
      pullRings: 0,
      footRails: 0,
      staticTriangles: 0,
    },
    windowGrilles: {
      instances: 0,
      verticalBars: 0,
      horizontalBars: 0,
      staticTriangles: 0,
    },
    balconies: {
      instances: 0,
      deckPlanks: 0,
      corbels: 0,
      railPosts: 0,
      crossBraces: 0,
      topRails: 0,
      staticTriangles: 0,
    },
    roofDrainage: {
      spouts: 0,
      troughSurfaces: 0,
      staticTriangles: 0,
    },
    roofParapets: {
      flatRoofs: 0,
      sections: 0,
      staticTriangles: 0,
    },
    chimneys: {
      instances: 0,
      masonryBodies: 0,
      capCourses: 0,
      sootOpenings: 0,
      staticTriangles: 0,
    },
    marketRoof: {
      instances: 0,
      boardPlanks: 0,
      visibleSurfaces: 0,
      staticTriangles: 0,
    },
    towerDetails: {
      towers: 0,
      crossletSlits: 0,
      slitSurfaces: 0,
      staticTriangles: 0,
    },
    crenellations: {
      runs: 0,
      merlons: 0,
      staticTriangles: 0,
    },
    wallDetails: {
      wallRuns: 0,
      lancetSlits: 0,
      staticTriangles: 0,
    },
    gateDetails: {
      landGateButtresses: 0,
      landGateButtressMeshes: 0,
      templarGateRecesses: 0,
      portcullisUprights: 0,
      portcullisCrossrails: 0,
      staticTriangles: 0,
    },
    cargoCover: {
      chests: 0,
      chestLids: 0,
      chestBindings: 0,
      chestKnots: 0,
      clothBales: 0,
      baleBindings: 0,
      staticTriangles: 0,
    },
    barrels: {
      instances: 0,
      bodies: 0,
      heads: 0,
      hoops: 0,
      staveSeams: 0,
      bungs: 0,
      staticTriangles: 0,
    },
    sacks: {
      instances: 0,
      bodies: 0,
      ties: 0,
      cordTails: 0,
      openings: 0,
      staticTriangles: 0,
    },
    handcart: {
      instances: 0,
      bedPlanks: 0,
      sideRails: 0,
      sideStakes: 0,
      headboardSlats: 0,
      carryingShafts: 0,
      axles: 0,
      wheelRims: 0,
      ironTires: 0,
      spokes: 0,
      hubs: 0,
      linchpins: 0,
      staticTriangles: 0,
    },
    well: {
      instances: 0,
      outerWalls: 0,
      innerWalls: 0,
      copingRings: 0,
      shaftShadows: 0,
      framePosts: 0,
      crossbars: 0,
      drums: 0,
      axles: 0,
      ropes: 0,
      crankArms: 0,
      crankGrips: 0,
      staticTriangles: 0,
    },
    courtyardPool: {
      instances: 0,
      copingSections: 0,
      outerWalls: 0,
      innerWalls: 0,
      waterSurfaces: 0,
      staticTriangles: 0,
    },
    courtyardBenches: {
      instances: 0,
      seatPlanks: 0,
      legs: 0,
      backPosts: 0,
      diagonalBraces: 0,
      backrestPlanks: 0,
      staticTriangles: 0,
    },
    harbourCranes: {
      instances: 0,
      trestleLegs: 0,
      booms: 0,
      headBeams: 0,
      braces: 0,
      drums: 0,
      axles: 0,
      windingRims: 0,
      windingSpokes: 0,
      windingHubs: 0,
      pulleyCheeks: 0,
      pulleyWheels: 0,
      pulleyGrooves: 0,
      pulleyPins: 0,
      runningRopes: 0,
      liftingRopes: 0,
      cargoBales: 0,
      slingLegs: 0,
      hooks: 0,
      staticTriangles: 0,
    },
    oliveTrees: {
      instances: 0,
      trunks: 0,
      roots: 0,
      branches: 0,
      foliageCards: 0,
      staticTriangles: 0,
    },
    torches: {
      instances: 0,
      tripodLegs: 0,
      fuelPieces: 0,
      pointLights: 0,
      staticTriangles: 0,
    },
  };
  const geometryTriangles = (geometry) => (
    geometry.index
      ? geometry.index.count / 3
      : geometry.attributes.position.count / 3
  );

  const mission = {
    playerStart: new THREE.Vector3(122, 1.72, -71),
    target: new THREE.Vector3(-30, 0, -41),
    exfil: new THREE.Vector3(51, 0.18, 64),
    guardSpawns: [
      new THREE.Vector3(76, 0, -69),
      new THREE.Vector3(46, 0, -66),
      new THREE.Vector3(17, 0, -60),
      new THREE.Vector3(-3, 0, -39),
      new THREE.Vector3(-24, 0, -42),
      new THREE.Vector3(-2, 0, 5),
      new THREE.Vector3(-22, 0, 29),
      new THREE.Vector3(28, 0, 38),
      new THREE.Vector3(29, 0, 61),
    ],
    wallGuardSpawns: [
      {
        position: new THREE.Vector3(-102, 1.66, -24),
        axis: "z",
        min: -31,
        max: 5,
      },
      {
        position: new THREE.Vector3(-101, 1.66, 39),
        axis: "z",
        min: 20,
        max: 59,
      },
      {
        position: new THREE.Vector3(-84, 1.66, 81),
        axis: "x",
        min: -91,
        max: -51,
      },
      {
        position: new THREE.Vector3(-24, 1.66, 81),
        axis: "x",
        min: -31,
        max: 11,
      },
    ],
  };

  const entryRoutes = [
    {
      id: "gate",
      name: "ST ANTHONY’S GATE",
      shortName: "EASTERN GATE",
      method: "OPEN ROAD",
      description: "Montmusard approach · broad sightlines · no climb",
      spawn: mission.playerStart.clone(),
      arrival: mission.playerStart.clone(),
      yaw: Math.PI / 2,
    },
    {
      id: "genoese-rope",
      name: "GENOESE SEA ROPE",
      shortName: "WESTERN ROPE",
      method: "ROPE CLIMB",
      description: "Close to the western wards · watched from above",
      spawn: new THREE.Vector3(-107, 0.18, -11),
      exterior: new THREE.Vector3(-103.2, 0.02, -11),
      arrival: new THREE.Vector3(-96.6, 1.72, -11),
      yaw: -Math.PI / 2,
    },
    {
      id: "templar-rope",
      name: "TEMPLAR SEA ROPE",
      shortName: "TEMPLAR ROPE",
      method: "ROPE CLIMB",
      description: "Near the tunnel · little cover on the landing",
      spawn: new THREE.Vector3(-70, 0.18, 87.8),
      exterior: new THREE.Vector3(-70, 0.02, 84),
      arrival: new THREE.Vector3(-70, 1.72, 77.6),
      yaw: 0,
    },
    {
      id: "pisan-breach",
      name: "PISAN WALL BREACH",
      shortName: "PISAN BREACH",
      method: "MASONRY CLIMB",
      description: "Fast harbour access · brightest patrol sector",
      spawn: new THREE.Vector3(-9, 0.18, 87.8),
      exterior: new THREE.Vector3(-9, 0.02, 84),
      arrival: new THREE.Vector3(-9, 1.72, 77.6),
      yaw: 0,
    },
  ];

  const bounds = new THREE.Box3(
    new THREE.Vector3(ACRE_PLAN.bounds.min[0], -2, ACRE_PLAN.bounds.min[1]),
    new THREE.Vector3(ACRE_PLAN.bounds.max[0], 26, ACRE_PLAN.bounds.max[1]),
  );

  const canvasTexture = (size, painter, repeatX = 1, repeatY = 1) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    painter(ctx, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;
    return texture;
  };

  const highDetailTextures = typeof matchMedia === "function" && !matchMedia("(max-width: 820px), (pointer: coarse)").matches && (navigator.deviceMemory || 8) >= 4;
  const assetPath = (file) => `${import.meta.env.BASE_URL}assets/textures/${highDetailTextures && !file.includes("rough") ? "2k/" : ""}${file}`;
  const textureLoader = new THREE.TextureLoader();
  const loadSurface = (file, { color = false, anisotropy = 8 } = {}) => {
    const texture = textureLoader.load(assetPath(file));
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = anisotropy;
    if (color) texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };

  // CC0 scanned surfaces from Poly Haven. Acre's fortifications were built from
  // local kurkar sandstone; the warm limestone scan is color-graded toward it.
  const stoneTexture = loadSurface("kurkar-diff.jpg", { color: true });
  const stoneNormal = loadSurface("kurkar-normal.jpg");
  const stoneRough = loadSurface("kurkar-rough.jpg");
  const cobbleTexture = loadSurface("cobbles-diff.jpg", { color: true });
  const cobbleNormal = loadSurface("cobbles-normal.jpg");
  const cobbleRough = loadSurface("cobbles-rough.jpg");
  const plasterTexture = loadSurface("plaster-diff.jpg", { color: true });
  const plasterNormal = loadSurface("plaster-normal.jpg");
  const plasterRough = loadSurface("plaster-rough.jpg");

  const seededPainter = (seed) => {
    let state = seed >>> 0;
    return () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  };
  const cityRandom = seededPainter(0xac1250);
  const woodTexture = canvasTexture(
    1024,
    (ctx, s) => {
      const random = seededPainter(0xa4c3);
      const base = ctx.createLinearGradient(0, 0, s, 0);
      base.addColorStop(0, "#68553e");
      base.addColorStop(0.48, "#968064");
      base.addColorStop(1, "#62533e");
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, s, s);
      for (let plank = 0; plank < 8; plank += 1) {
        const x = plank * (s / 8);
        ctx.fillStyle = plank % 2
          ? "rgba(238,181,119,.055)"
          : "rgba(31,14,6,.09)";
        ctx.fillRect(x, 0, s / 8, s);
        ctx.fillStyle = "rgba(18,9,4,.55)";
        ctx.fillRect(x, 0, 2, s);
        for (let grain = 0; grain < 8; grain += 1) {
          const gx = x + 3 + random() * (s / 8 - 6);
          ctx.strokeStyle = `rgba(31,13,6,${0.12 + random() * 0.18})`;
          ctx.lineWidth = 0.65 + random() * 1.2;
          ctx.beginPath();
          ctx.moveTo(gx, -8);
          for (let y = 0; y <= s + 8; y += 16) {
            ctx.lineTo(gx + Math.sin(y * 0.055 + grain) * (1.2 + random() * 1.6), y);
          }
          ctx.stroke();
        }
        if (plank % 3 === 1) {
          const knotY = 32 + random() * (s - 64);
          ctx.strokeStyle = "rgba(28,12,5,.48)";
          for (let ring = 0; ring < 3; ring += 1) {
            ctx.beginPath();
            ctx.ellipse(
              x + s / 16,
              knotY,
              2.5 + ring * 2.2,
              5 + ring * 3.4,
              0,
              0,
              Math.PI * 2,
            );
            ctx.stroke();
          }
        }
      }
      const wear = ctx.createLinearGradient(0, 0, 0, s);
      wear.addColorStop(0, "rgba(238,212,170,.08)");
      wear.addColorStop(0.45, "rgba(0,0,0,0)");
      wear.addColorStop(1, "rgba(15,7,3,.16)");
      ctx.fillStyle = wear;
      ctx.fillRect(0, 0, s, s);
    },
    3,
    2,
  );
  const shutterTexture = canvasTexture(512, (ctx, s) => {
    const random = seededPainter(0x5a177e);
    ctx.fillStyle = "#c7c0aa";
    ctx.fillRect(0, 0, s, s);
    const plankWidth = s / 4;
    for (let plank = 0; plank < 4; plank += 1) {
      const x = plank * plankWidth;
      ctx.fillStyle = plank % 2
        ? "rgba(255,248,224,.055)"
        : "rgba(48,31,18,.045)";
      ctx.fillRect(x, 0, plankWidth, s);
      if (plank > 0) {
        ctx.fillStyle = "rgba(31,22,14,.48)";
        ctx.fillRect(x - 1.5, 0, 3, s);
        ctx.fillStyle = "rgba(255,246,218,.11)";
        ctx.fillRect(x + 1.5, 0, 1, s);
      }
      for (let grain = 0; grain < 7; grain += 1) {
        const gx = x + 3 + random() * (plankWidth - 6);
        ctx.strokeStyle = `rgba(56,40,25,${0.06 + random() * 0.1})`;
        ctx.lineWidth = 0.5 + random() * 0.8;
        ctx.beginPath();
        ctx.moveTo(gx, -4);
        for (let y = 0; y <= s + 4; y += 12) {
          ctx.lineTo(gx + Math.sin(y * 0.08 + grain) * 1.4, y);
        }
        ctx.stroke();
      }
    }
    for (const y of [s * .226, s * .734]) {
      ctx.fillStyle = "rgba(38,26,16,.28)";
      ctx.fillRect(0, y + 6, s, 3);
      ctx.fillStyle = "rgba(207,196,169,.72)";
      ctx.fillRect(0, y, s, 7);
      ctx.fillStyle = "rgba(255,247,219,.12)";
      ctx.fillRect(0, y, s, 1);
    }
    for (let chip = 0; chip < 42; chip += 1) {
      const x = random() * s;
      const y = random() * s;
      const width = 1.2 + random() * 4.8;
      const height = 0.7 + random() * 2.4;
      ctx.fillStyle = `rgba(69,43,24,${0.18 + random() * 0.36})`;
      ctx.beginPath();
      ctx.ellipse(x, y, width, height, random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
      if (random() > 0.58) {
        ctx.fillStyle = "rgba(230,216,183,.16)";
        ctx.fillRect(x - width * 0.45, y - height, width * 0.9, 1);
      }
    }
    const edgeWear = ctx.createLinearGradient(0, 0, s, 0);
    edgeWear.addColorStop(0, "rgba(38,24,14,.22)");
    edgeWear.addColorStop(0.08, "rgba(255,255,255,0)");
    edgeWear.addColorStop(0.92, "rgba(255,255,255,0)");
    edgeWear.addColorStop(1, "rgba(38,24,14,.22)");
    ctx.fillStyle = edgeWear;
    ctx.fillRect(0, 0, s, s);
  });
  shutterTexture.name = "512px shared worn-painted shutter atlas";
  shutterTexture.anisotropy = 8;
  const sailTexture = canvasTexture(1024, (ctx, s) => {
    const random = seededPainter(0x51a1);
    ctx.fillStyle = "#d8cba8";
    ctx.fillRect(0, 0, s, s);
    for (let line = 0; line <= s; line += 3) {
      ctx.fillStyle = line % 6
        ? "rgba(77,58,35,.025)"
        : "rgba(255,248,218,.045)";
      ctx.fillRect(0, line, s, 1);
      ctx.fillRect(line, 0, 1, s);
    }
    for (let seam = 1; seam < 4; seam += 1) {
      const x = (seam * s) / 4;
      ctx.fillStyle = "rgba(74,52,31,.2)";
      ctx.fillRect(x, 0, 2, s);
      ctx.fillStyle = "rgba(255,244,207,.14)";
      ctx.fillRect(x + 2, 0, 1, s);
    }
    for (let speck = 0; speck < 90; speck += 1) {
      ctx.fillStyle = `rgba(73,49,28,${0.025 + random() * 0.06})`;
      ctx.fillRect(random() * s, random() * s, 1 + random() * 2, 1 + random() * 2);
    }
    const edgeWear = ctx.createRadialGradient(s / 2, s / 2, s * 0.18, s / 2, s / 2, s * 0.72);
    edgeWear.addColorStop(0, "rgba(255,255,255,0)");
    edgeWear.addColorStop(1, "rgba(74,48,26,.22)");
    ctx.fillStyle = edgeWear;
    ctx.fillRect(0, 0, s, s);
  });
  const potteryTexture = canvasTexture(512, (ctx, s) => {
    const random = seededPainter(0xac4e);
    ctx.fillStyle = "#b79370";
    ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 7) {
      ctx.fillStyle = y % 21
        ? "rgba(255,186,126,.035)"
        : "rgba(74,28,17,.12)";
      ctx.fillRect(0, y, s, 1);
    }
    for (let speck = 0; speck < 180; speck += 1) {
      const light = random() > 0.58;
      ctx.fillStyle = light
        ? `rgba(243,173,116,${0.05 + random() * 0.1})`
        : `rgba(62,24,15,${0.04 + random() * 0.1})`;
      const radius = 0.4 + random() * 1.3;
      ctx.beginPath();
      ctx.arc(random() * s, random() * s, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 2, 3);
  const sackTexture = canvasTexture(512, (ctx, s) => {
    const random = seededPainter(0x5ac7);
    ctx.fillStyle = "#a88a5a";
    ctx.fillRect(0, 0, s, s);
    for (let line = 0; line < s; line += 4) {
      ctx.fillStyle = line % 8
        ? "rgba(244,219,167,.1)"
        : "rgba(72,48,25,.08)";
      ctx.fillRect(0, line, s, 1);
      ctx.fillRect(line, 0, 1, s);
      ctx.fillStyle = "rgba(255,238,194,.035)";
      for (let stitch = (line / 4) % 2 ? 2 : 0; stitch < s; stitch += 8) {
        ctx.fillRect(stitch, line + 1, 3, 1);
        ctx.fillRect(line + 1, stitch, 1, 3);
      }
    }
    for (let fiber = 0; fiber < 90; fiber += 1) {
      const x = random() * s;
      const y = random() * s;
      ctx.strokeStyle = `rgba(60,39,20,${0.025 + random() * 0.07})`;
      ctx.lineWidth = 0.5 + random();
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 2 + random() * 6, y + (random() - 0.5) * 2);
      ctx.stroke();
    }
    const wear = ctx.createRadialGradient(s * 0.42, s * 0.38, 4, s * 0.42, s * 0.38, s * 0.7);
    wear.addColorStop(0, "rgba(255,238,191,.08)");
    wear.addColorStop(0.68, "rgba(0,0,0,0)");
    wear.addColorStop(1, "rgba(55,34,17,.12)");
    ctx.fillStyle = wear;
    ctx.fillRect(0, 0, s, s);
    for (let stain = 0; stain < 9; stain += 1) {
      ctx.fillStyle = `rgba(65,43,23,${0.025 + random() * 0.045})`;
      ctx.beginPath();
      ctx.ellipse(
        random() * s,
        random() * s,
        2 + random() * 8,
        1 + random() * 4,
        random() * Math.PI,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }, 3, 3);
  const roofTexture = canvasTexture(
    512,
    (ctx, s) => {
      const ground = ctx.createLinearGradient(0, 0, 0, s);
      ground.addColorStop(0, "#9b5639");
      ground.addColorStop(0.48, "#7d432c");
      ground.addColorStop(1, "#663421");
      ctx.fillStyle = ground;
      ctx.fillRect(0, 0, s, s);
      for (let row = -1, y = -21; y < s + 21; row += 1, y += 21) {
        const offset = row % 2 ? 12 : 0;
        for (let column = -1, x = -24 - offset; x < s + 24; column += 1, x += 24) {
          const tone = Math.sin(row * 12.7 + column * 8.3);
          const red = Math.round(126 + tone * 15);
          const green = Math.round(65 + tone * 8);
          const blue = Math.round(41 + tone * 5);
          ctx.fillStyle = `rgb(${red},${green},${blue})`;
          ctx.beginPath();
          ctx.moveTo(x + 2, y + 1);
          ctx.lineTo(x + 22, y + 1);
          ctx.lineTo(x + 22, y + 9);
          ctx.quadraticCurveTo(x + 20, y + 18, x + 12, y + 20);
          ctx.quadraticCurveTo(x + 4, y + 18, x + 2, y + 9);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = "rgba(43,18,10,.72)";
          ctx.lineWidth = 1.65;
          ctx.beginPath();
          ctx.moveTo(x + 1, y + 2);
          ctx.lineTo(x + 1, y + 9);
          ctx.quadraticCurveTo(x + 3, y + 19, x + 12, y + 21);
          ctx.quadraticCurveTo(x + 21, y + 19, x + 23, y + 9);
          ctx.lineTo(x + 23, y + 2);
          ctx.stroke();

          ctx.strokeStyle = "rgba(247,178,119,.22)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + 4, y + 3);
          ctx.quadraticCurveTo(x + 5, y + 14, x + 11, y + 17);
          ctx.stroke();

          if ((row * 11 + column * 7) % 17 === 0) {
            ctx.strokeStyle = "rgba(47,22,14,.58)";
            ctx.beginPath();
            ctx.moveTo(x + 15, y + 14);
            ctx.lineTo(x + 18, y + 18);
            ctx.lineTo(x + 21, y + 16);
            ctx.stroke();
          }
        }
      }
      const ageWash = ctx.createLinearGradient(0, 0, s, s);
      ageWash.addColorStop(0, "rgba(245,190,132,.08)");
      ageWash.addColorStop(0.52, "rgba(70,31,18,0)");
      ageWash.addColorStop(1, "rgba(40,22,13,.16)");
      ctx.fillStyle = ageWash;
      ctx.fillRect(0, 0, s, s);
      for (let stain = 0; stain < 18; stain += 1) {
        const stainX = (stain * 83 + 29) % s;
        const stainY = (stain * 47 + 61) % s;
        ctx.fillStyle = stain % 3
          ? "rgba(46,27,16,.045)"
          : "rgba(93,102,56,.045)";
        ctx.beginPath();
        ctx.ellipse(
          stainX,
          stainY,
          5 + (stain % 5) * 2,
          2 + (stain % 4),
          stain * 0.73,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    },
    9,
    4,
  );
  const awningTextures = [0xb64532, 0xc99b3d].map((stripeColor, variant) =>
    canvasTexture(256, (ctx, s) => {
      ctx.fillStyle = variant ? "#d8bd76" : "#d2b890";
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = `#${stripeColor.toString(16).padStart(6, "0")}`;
      for (let x = -32; x < s + 32; x += 64) ctx.fillRect(x, 0, 32, s);
      ctx.fillStyle = "rgba(73,43,24,.12)";
      for (let y = 0; y < s; y += 18) ctx.fillRect(0, y, s, 1);
    }),
  );

  const limestone = new THREE.MeshStandardMaterial({
    color: 0xead9ba,
    map: stoneTexture,
    normalMap: stoneNormal,
    normalScale: new THREE.Vector2(0.72, 0.72),
    roughnessMap: stoneRough,
    roughness: 0.96,
    metalness: 0.02,
  });
  const paleStone = new THREE.MeshStandardMaterial({
    color: 0xf3e5cc,
    map: stoneTexture,
    normalMap: stoneNormal,
    normalScale: new THREE.Vector2(0.54, 0.54),
    roughnessMap: stoneRough,
    roughness: 0.92,
  });
  const oldStone = new THREE.MeshStandardMaterial({
    color: 0xccbd9f,
    map: stoneTexture,
    normalMap: stoneNormal,
    normalScale: new THREE.Vector2(0.9, 0.9),
    roughnessMap: stoneRough,
    roughness: 1,
  });
  const dressedStone = new THREE.MeshStandardMaterial({color:0xdad0b9, map:plasterTexture, normalMap:plasterNormal, normalScale:new THREE.Vector2(.16,.16), roughness: .94});
  const cobbles = new THREE.MeshStandardMaterial({
    color: 0x9a8d72,
    map: cobbleTexture,
    normalMap: cobbleNormal,
    normalScale: new THREE.Vector2(0.72, 0.72),
    roughnessMap: cobbleRough,
    roughness: 1,
  });
  const timber = new THREE.MeshStandardMaterial({
    color: 0xd3bf9e,
    map: woodTexture,
    bumpMap: woodTexture,
    bumpScale: 0.035,
    roughness: 0.88,
  });
  const darkTimber = new THREE.MeshStandardMaterial({
    color: 0xa08866,
    map: woodTexture,
    bumpMap: woodTexture,
    bumpScale: 0.042,
    roughness: 0.94,
  });
  woodTexture.repeat.set(1, 1);
  timber.userData.worldTextureScale = darkTimber.userData.worldTextureScale = 2;
  const shutterMaterials = [0x315b5a, 0x6e3827].map(
    (color) => new THREE.MeshStandardMaterial({
      color,
      map: shutterTexture,
      bumpMap: shutterTexture,
      bumpScale: 0.022,
      roughness: 0.93,
    }),
  );
  const roofMaterial = new THREE.MeshStandardMaterial({
    color: 0xf5e2d7,
    map: roofTexture,
    bumpMap: roofTexture,
    bumpScale: 0.1,
    roughness: 0.88,
  });
  const plasterMaterials = [
    new THREE.MeshStandardMaterial({ color: 0xe0d6ba, map: plasterTexture, normalMap: plasterNormal, normalScale: new THREE.Vector2(0.45, 0.45), roughnessMap: plasterRough, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0xcab89a, map: plasterTexture, normalMap: plasterNormal, normalScale: new THREE.Vector2(0.55, 0.55), roughnessMap: plasterRough, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0xf0e7ce, map: plasterTexture, normalMap: plasterNormal, normalScale: new THREE.Vector2(0.4, 0.4), roughnessMap: plasterRough, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0xc4a886, map: plasterTexture, normalMap: plasterNormal, normalScale: new THREE.Vector2(0.6, 0.6), roughnessMap: plasterRough, roughness: 1 }),
  ];
  const packedEarth = new THREE.MeshStandardMaterial({
    color: 0x776047,
    map: cobbleTexture,
    normalMap: cobbleNormal,
    normalScale: new THREE.Vector2(0.38, 0.38),
    roughnessMap: cobbleRough,
    roughness: 1,
  });
  const sandyEarth = new THREE.MeshStandardMaterial({
    color: 0xb39a6c,
    map: plasterTexture,
    normalMap: plasterNormal,
    normalScale: new THREE.Vector2(0.22, 0.22),
    roughnessMap: plasterRough,
    roughness: 1,
  });
  [limestone, paleStone, oldStone, cobbles, packedEarth, sandyEarth, ...plasterMaterials].forEach(
    (material) => {
      material.userData.worldTextureScale = material === cobbles || material === packedEarth ? 2.4 : 4;
    },
  );
  const darkRecess = new THREE.MeshStandardMaterial({ color: 0x151410, roughness: 1 });
  const agedIron = new THREE.MeshStandardMaterial({
    color: 0x2b2b27,
    metalness: 0.72,
    roughness: 0.62,
  });
  const waterNormals = canvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = "#7f7fff";
      ctx.fillRect(0, 0, s, s);
      ctx.globalCompositeOperation = "overlay";
      for (let i = 0; i < 180; i += 1) {
        const x = cityRandom() * s;
        const y = cityRandom() * s;
        const length = 12 + cityRandom() * 42;
        const tone = 105 + Math.floor(cityRandom() * 48);
        ctx.strokeStyle = `rgba(${tone},${210 - tone / 2},255,.45)`;
        ctx.lineWidth = 1 + cityRandom() * 2.2;
        ctx.beginPath();
        ctx.moveTo(x - length / 2, y);
        ctx.bezierCurveTo(
          x - length / 5,
          y - 5 - cityRandom() * 8,
          x + length / 5,
          y + 5 + cityRandom() * 8,
          x + length / 2,
          y,
        );
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
    },
    8,
    8,
  );
  const bronze = new THREE.MeshStandardMaterial({
    color: 0x7f5a27,
    metalness: 0.72,
    roughness: 0.38,
  });
  const sail = new THREE.MeshStandardMaterial({
    color: 0xf1e2be,
    map: sailTexture,
    bumpMap: sailTexture,
    bumpScale: 0.018,
    roughness: 0.94,
    side: THREE.DoubleSide,
  });
  const awningMaterials = awningTextures.map(
    (map) => new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map,
      bumpMap: sackTexture,
      bumpScale: 0.012,
      side: THREE.DoubleSide,
      roughness: 0.94,
    }),
  );
  const hospitallerBannerTexture = canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = "#171a18";
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "#e5dfc9";
    ctx.fillRect(s * 0.42, s * 0.16, s * 0.16, s * 0.68);
    ctx.fillRect(s * 0.18, s * 0.4, s * 0.64, s * 0.16);
    const edge = ctx.createLinearGradient(0, 0, s, 0);
    edge.addColorStop(0, "rgba(0,0,0,.32)");
    edge.addColorStop(0.5, "rgba(255,255,255,.08)");
    edge.addColorStop(1, "rgba(0,0,0,.28)");
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, s, s);
  });
  const hospitallerBannerMaterial = new THREE.MeshStandardMaterial({
    map: hospitallerBannerTexture,
    side: THREE.DoubleSide,
    roughness: 0.95,
  });
  const flameTexture = canvasTexture(128, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    const halo = ctx.createRadialGradient(s / 2, s * 0.58, 2, s / 2, s * 0.58, s * 0.42);
    halo.addColorStop(0, "rgba(255,224,126,.48)");
    halo.addColorStop(0.48, "rgba(255,128,24,.16)");
    halo.addColorStop(1, "rgba(255,72,10,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, s, s);
    const body = ctx.createLinearGradient(0, s * 0.18, 0, s * 0.86);
    body.addColorStop(0, "rgba(255,176,40,.15)");
    body.addColorStop(0.34, "rgba(255,111,15,.92)");
    body.addColorStop(0.72, "rgba(255,198,66,.98)");
    body.addColorStop(1, "rgba(255,246,180,.98)");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.12);
    ctx.bezierCurveTo(s * 0.7, s * 0.38, s * 0.73, s * 0.66, s * 0.54, s * 0.88);
    ctx.bezierCurveTo(s * 0.31, s * 0.83, s * 0.27, s * 0.57, s * 0.42, s * 0.38);
    ctx.bezierCurveTo(s * 0.47, s * 0.31, s * 0.46, s * 0.22, s * 0.5, s * 0.12);
    ctx.fill();
  });
  flameTexture.wrapS = flameTexture.wrapT = THREE.ClampToEdgeWrapping;
  const flameSpriteMaterial = new THREE.SpriteMaterial({
    map: flameTexture,
    color: 0xffffff,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const addCollider = (size, position, mapVisible = true) => {
    const center = new THREE.Vector3(...position);
    const half = new THREE.Vector3(size[0] / 2, size[1] / 2, size[2] / 2);
    const box = new THREE.Box3(center.clone().sub(half), center.clone().add(half));
    box.mapVisible = mapVisible;
    colliders.push(box);
  };

  const addBox = ({
    size,
    position,
    material = limestone,
    collider = false,
    name = "Masonry",
    parent = root,
    shadows = true,
  }) => {
    const geometry = new THREE.BoxGeometry(...size);
    const worldTextureScale = material.userData.worldTextureScale;
    if (worldTextureScale) {
      const positions = geometry.attributes.position;
      const normals = geometry.attributes.normal;
      const uvs = geometry.attributes.uv;
      for (let index = 0; index < positions.count; index += 1) {
        const nx = Math.abs(normals.getX(index));
        const ny = Math.abs(normals.getY(index));
        const x = positions.getX(index);
        const y = positions.getY(index);
        const z = positions.getZ(index);
        if (nx > 0.5) uvs.setXY(index, z / worldTextureScale, y / worldTextureScale);
        else if (ny > 0.5) uvs.setXY(index, x / worldTextureScale, z / worldTextureScale);
        else uvs.setXY(index, x / worldTextureScale, y / worldTextureScale);
      }
      uvs.needsUpdate = true;
    }
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.name = name;
    mesh.castShadow = shadows;
    mesh.receiveShadow = shadows;
    parent.add(mesh);
    if (collider) addCollider(size, position);
    return mesh;
  };

  const addCylinder = ({
    radius = 1,
    height = 2,
    position,
    material = limestone,
    segments = 16,
    parent = root,
    name = "Round tower",
    collider = false,
  }) => {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius * 1.06, height, Math.max(segments, 32)),
      material,
    );
    mesh.position.set(...position);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.name = name;
    parent.add(mesh);
    const uv = mesh.geometry.attributes.uv;
    const scale = material.userData.worldTextureScale;
    if (scale) for (let i=0;i<uv.count;i++) uv.setXY(i,uv.getX(i)*2*Math.PI*radius/scale,uv.getY(i)*height/scale);
    // A near-diameter footprint prevents the player capsule from clipping
    // through the visible outer masonry of towers, apses, and columns.
    if (collider) addCollider([radius * 1.9, height, radius * 1.9], position);
    return mesh;
  };

  const addArch = ({
    radius,
    thickness = 0.42,
    position,
    material = paleStone,
    rotationY = 0,
    parent = root,
    name = "Stone arch",
  }) => {
    const arch = new THREE.Mesh(
      voussoirArch(radius, thickness),
      material === paleStone ? dressedStone : material,
    );
    arch.position.set(...position);
    arch.rotation.y = rotationY;
    arch.name = name;
    arch.castShadow = arch.receiveShadow = true;
    parent.add(arch);
    return arch;
  };

  const addPitchedRoof = ({ x, z, w, d, y, parent, material = roofMaterial }) => {
    const rise = Math.min(2.4, d * 0.24);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [
          -w / 2, 0, -d / 2,
          w / 2, 0, -d / 2,
          -w / 2, 0, d / 2,
          w / 2, 0, d / 2,
          -w / 2, rise, 0,
          w / 2, rise, 0,
        ],
        3,
      ),
    );
    geometry.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute(
        [
          0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 1,
        ],
        2,
      ),
    );
    geometry.setIndex([
      0, 1, 5, 0, 5, 4,
      2, 4, 5, 2, 5, 3,
      0, 4, 2,
      1, 3, 5,
      0, 2, 3, 0, 3, 1,
    ]);
    geometry.computeVertexNormals();
    const roof = new THREE.Mesh(geometry, material);
    roof.position.set(x, y, z);
    roof.name = "Terracotta gabled roof";
    roof.castShadow = roof.receiveShadow = true;
    parent.add(roof);
    return roof;
  };

  // The Mediterranean surrounds the peninsula on three sides.
  // A single-pass sea keeps the coastal sheen without rendering the whole city
  // again for planar reflections. The scrolling normal map supplies motion.
  waterNormals.repeat.set(18, 14);
  const waterMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x031f32,
    normalMap: waterNormals,
    normalScale: new THREE.Vector2(0.46, 0.46),
    roughness: 0.34,
    metalness: 0.12,
    clearcoat: 0.48,
    clearcoatRoughness: 0.3,
    transparent: true,
    opacity: 0.97,
    depthWrite: true,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(430, 360, 1, 1), waterMaterial);
  water.rotation.x = -Math.PI / 2;
  water.position.set(-20, 0.02, 18);
  water.receiveShadow = false;
  water.name = "Mediterranean Sea";
  root.add(water);
  water.userData.animate = (time) => {
    waterNormals.offset.set(time * 0.0022, time * 0.0031);
  };
  animated.push(water);

  // The exposed land follows the archaeology-led peninsula outline rather
  // than the former pair of rectangular ground slabs. ShapeGeometry keeps the
  // irregular coast legible from towers and on the held map.
  const cityShape = new THREE.Shape();
  ACRE_PLAN.cityOutline.forEach(([x, z], index) => {
    if (index === 0) cityShape.moveTo(x, -z);
    else cityShape.lineTo(x, -z);
  });
  cityShape.closePath();
  // The harbour is already an indentation in the coastline. A hole crossing
  // outside that polygon produces invalid triangulation and missing ground.
  const cityGroundGeometry = new THREE.ShapeGeometry(cityShape);
  cityGroundGeometry.rotateX(-Math.PI / 2);
  const cityGround = new THREE.Mesh(cityGroundGeometry, cobbles);
  cityGround.position.y = 0.27;
  cityGround.receiveShadow = true;
  cityGround.name = "Archaeological outline of Frankish Acre";
  root.add(cityGround);
  const mainlandShape = new THREE.Shape(ACRE_PLAN.mainland.map(([x, z]) => new THREE.Vector2(x, -z)));
  const mainlandGeometry = new THREE.ShapeGeometry(mainlandShape);
  mainlandGeometry.rotateX(-Math.PI / 2);
  const mainland = new THREE.Mesh(mainlandGeometry, sandyEarth);
  mainland.position.y = 0.17;
  mainland.receiveShadow = true;
  mainland.name = "Coastal plain north and east of Acre";
  root.add(mainland);
  addBox({
    size: [55, 0.7, 52],
    position: [106.5, -0.18, -71],
    material: sandyEarth,
    name: "Eastern approach",
    shadows: false,
  });
  for (const road of ACRE_PLAN.roads) {
    road.points.slice(1).forEach(([bx, bz], i) => {
      const [ax, az] = road.points[i];
      const mesh = addBox({ size: [Math.hypot(bx - ax, bz - az) + 0.15, 0.04, road.kind === "primary" ? 4.2 : 2.7],
        position: [(ax + bx) / 2, 0.30, (az + bz) / 2], material: packedEarth, shadows: false, name: road.id });
      mesh.rotation.y = -Math.atan2(bz - az, bx - ax);
    });
  }

  // Dry coastal scrub and fieldstone along the landward approach. This was
  // cultivated ground beyond Acre's ditch, not an empty desert apron.
  const createWeatheredRockGeometry = (radius, phase) => {
    const geometry = new THREE.DodecahedronGeometry(radius, 0);
    const positions = geometry.attributes.position;
    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const y = positions.getY(index);
      const z = positions.getZ(index);
      const weathering = 1
        + Math.sin(x * 4.7 + y * 3.1 + phase) * 0.085
        + Math.cos(z * 5.3 - y * 2.2 + phase) * 0.055;
      positions.setXYZ(
        index,
        x * weathering,
        y * (0.9 + Math.sin(x * 3.4 + z * 2.7 + phase) * 0.08),
        z * weathering,
      );
    }
    geometry.computeVertexNormals();
    return geometry;
  };
  const approachRockGeometry = createWeatheredRockGeometry(0.5, 0.7);
  const approachRocks = new THREE.InstancedMesh(
    approachRockGeometry,
    oldStone,
    18,
  );
  approachRocks.name = "Landward fieldstone";
  approachRocks.castShadow = approachRocks.receiveShadow = true;
  const approachMatrix = new THREE.Matrix4();
  const approachQuaternion = new THREE.Quaternion();
  const approachScale = new THREE.Vector3();
  [
    [111, -40, 0.7], [119, -37, 0.5], [125, -31, 0.8], [105, -34, 0.45],
    [114, -10, 0.55], [123, -13, 0.75], [108, -5, 0.48], [127, 1, 0.62],
    [101, -44, 0.42], [128, -46, 0.68], [118, 6, 0.5], [103, 5, 0.58],
    [108, -47, 0.38], [125, 8, 0.46], [120, -4, 0.35], [104, -12, 0.44],
    [127, -39, 0.36], [111, 4, 0.4],
  ].forEach(([x, z, scale], index) => {
    approachQuaternion.setFromEuler(new THREE.Euler(index * 0.37, index * 0.71, index * 0.19));
    approachScale.set(scale * 1.25, scale * 0.72, scale);
    approachMatrix.compose(
      new THREE.Vector3(x, 0.42, z),
      approachQuaternion,
      approachScale,
    );
    approachRocks.setMatrixAt(index, approachMatrix);
  });
  root.add(approachRocks);
  objectRenderBudget.landscape.approachRocks = approachRocks.count;
  objectRenderBudget.landscape.renderedTriangles += (
    geometryTriangles(approachRockGeometry) * approachRocks.count
  );

  const scrubTexture = canvasTexture(128, (ctx, s) => {
    const random = seededPainter(0x5c12b);
    ctx.clearRect(0, 0, s, s);
    for (let stem = 0; stem < 24; stem += 1) {
      const baseX = s * (0.37 + random() * 0.26);
      const baseY = s * (0.9 + random() * 0.05);
      const reach = s * (0.28 + random() * 0.43);
      const angle = -1.18 + random() * 2.36;
      const tipX = baseX + Math.sin(angle) * reach;
      const tipY = baseY - Math.cos(angle) * reach;
      ctx.strokeStyle = random() > 0.45 ? "rgba(72,67,39,.95)" : "rgba(91,75,42,.9)";
      ctx.lineWidth = 1.2 + random() * 2.2;
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.quadraticCurveTo(
        (baseX + tipX) / 2 + (random() - 0.5) * 11,
        (baseY + tipY) / 2,
        tipX,
        tipY,
      );
      ctx.stroke();
      const leafCount = 3 + Math.floor(random() * 4);
      for (let leaf = 0; leaf < leafCount; leaf += 1) {
        const t = 0.35 + (leaf / leafCount) * 0.62;
        const leafX = baseX + (tipX - baseX) * t + (random() - 0.5) * 7;
        const leafY = baseY + (tipY - baseY) * t + (random() - 0.5) * 5;
        const leafWidth = 4 + random() * 6;
        const leafHeight = 2.2 + random() * 4;
        ctx.fillStyle = random() > 0.55 ? "#64704a" : random() > 0.4 ? "#7b794d" : "#4d6245";
        ctx.beginPath();
        ctx.ellipse(leafX, leafY, leafWidth, leafHeight, angle, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
  scrubTexture.wrapS = scrubTexture.wrapT = THREE.ClampToEdgeWrapping;
  const scrubMaterial = new THREE.MeshStandardMaterial({
    color: 0xb8b58d,
    map: scrubTexture,
    alphaTest: 0.38,
    side: THREE.DoubleSide,
    roughness: 1,
  });
  const scrubCards = [];
  for (const angle of [0, Math.PI / 3, Math.PI * 2 / 3]) {
    const card = new THREE.PlaneGeometry(1.12, 1, 1, 1);
    card.translate(0, 0.5, 0);
    card.rotateY(angle);
    scrubCards.push(card);
  }
  const scrubTopCard = new THREE.PlaneGeometry(0.95, 0.72, 1, 1);
  scrubTopCard.rotateX(-Math.PI / 2);
  scrubTopCard.translate(0, 0.62, 0);
  scrubCards.push(scrubTopCard);
  const scrubGeometry = mergeGeometries(scrubCards, false);
  scrubCards.forEach((card) => card.dispose());
  [
    [108, -38, 0.8], [122, -34, 1.15], [112, -8, 0.95], [125, -6, 0.72],
    [104, 3, 0.88], [126, -45, 0.82], [117, 4, 0.7],
    [108, -29, 0.62], [118, -28.5, 0.78], [126, -30, 0.67],
    [110, -15, 0.7], [120, -14.5, 0.82], [127, -16, 0.58],
  ].forEach(([x, z, scale]) => {
    for (let cluster = 0; cluster < 3; cluster += 1) {
      const angle = cluster * 2.15 + x;
      const scrub = new THREE.Mesh(scrubGeometry, scrubMaterial);
      scrub.position.set(
        x + Math.cos(angle) * scale * 0.42,
        0.18,
        z + Math.sin(angle) * scale * 0.35,
      );
      scrub.scale.set(
        scale * (0.85 + cluster * 0.12),
        scale * (0.62 + (cluster % 2) * 0.1),
        scale * (0.72 + (cluster % 2) * 0.15),
      );
      scrub.rotation.y = x + z + cluster * 0.83;
      scrub.castShadow = scrub.receiveShadow = true;
      scrub.name = "Alpha-cut Mediterranean scrub";
      root.add(scrub);
      objectRenderBudget.landscape.scrubClusters += 1;
      objectRenderBudget.landscape.renderedTriangles += geometryTriangles(scrubGeometry);
    }
  });

  // Coastline limits: the long western sea line reaches the full length of
  // Montmusard, while the southern edge bends toward the protected harbour.
  addBox({ size: [3, 2.2, 204], position: [-100, 0.55, -21], material: oldStone, collider: true });
  addBox({ size: [194, 2.2, 3], position: [-2, 0.55, 81], material: oldStone, collider: true });
  addBox({ size: [3, 2, 34], position: [94, 0.45, 63], material: oldStone, collider: true });
  const shorelineRockGeometry = createWeatheredRockGeometry(1.2, 2.4);
  const coastRocks = new THREE.InstancedMesh(
    shorelineRockGeometry,
    oldStone,
    58,
  );
  coastRocks.name = "Kurkar shoreline rocks";
  coastRocks.castShadow = coastRocks.receiveShadow = true;
  const rockMatrix = new THREE.Matrix4();
  const rockQuaternion = new THREE.Quaternion();
  const rockScale = new THREE.Vector3();
  let rockIndex = 0;
  for (let z = -119; z <= 77; z += 6.2) {
    if (Math.abs(z + 11) < 8) continue;
    rockQuaternion.setFromEuler(new THREE.Euler(cityRandom(), cityRandom(), cityRandom()));
    rockScale.set(1.2 + cityRandom() * 1.8, 0.7 + cityRandom() * 0.9, 1 + cityRandom() * 1.5);
    rockMatrix.compose(
      new THREE.Vector3(-101.2 + cityRandom() * 1.5, 0.25 + cityRandom() * 0.4, z + cityRandom() * 2),
      rockQuaternion,
      rockScale,
    );
    coastRocks.setMatrixAt(rockIndex++, rockMatrix);
  }
  for (let x = -94; x <= 38 && rockIndex < 58; x += 5.2) {
    if (Math.abs(x + 70) < 8 || Math.abs(x + 9) < 8) continue;
    rockQuaternion.setFromEuler(new THREE.Euler(cityRandom(), cityRandom(), cityRandom()));
    rockScale.set(1 + cityRandom() * 1.5, 0.65 + cityRandom(), 1.2 + cityRandom() * 1.7);
    rockMatrix.compose(
      new THREE.Vector3(x + cityRandom() * 2, 0.22 + cityRandom() * 0.4, 82 + cityRandom()),
      rockQuaternion,
      rockScale,
    );
    coastRocks.setMatrixAt(rockIndex++, rockMatrix);
  }
  coastRocks.count = rockIndex;
  coastRocks.instanceMatrix.needsUpdate = true;
  root.add(coastRocks);
  objectRenderBudget.landscape.shorelineRocks = rockIndex;
  objectRenderBudget.landscape.renderedTriangles += (
    geometryTriangles(shorelineRockGeometry) * rockIndex
  );

  // Three small boats form playable sea-wall insertions. Their open bows face
  // the masonry, while low gunwales keep the player off the walkable water.
  const ropeMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b6338,
    bumpMap: sackTexture,
    bumpScale: 0.045,
    roughness: 1,
  });
  const boatMaterial = new THREE.MeshStandardMaterial({
    color: 0x654126,
    map: woodTexture,
    bumpMap: woodTexture,
    bumpScale: 0.04,
    roughness: 0.94,
  });
  const craneCargoMaterial = new THREE.MeshStandardMaterial({
    color: 0x9c7e4e,
    map: sackTexture,
    bumpMap: sackTexture,
    bumpScale: 0.035,
    roughness: 1,
  });
  const ropeKnotGeometry = new THREE.TorusGeometry(0.105, 0.03, 5, 8);
  const addRope = (x, z, height = 2.75) => {
    const ropeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.12, 0),
      new THREE.Vector3(0.035, height * 0.28, -0.018),
      new THREE.Vector3(-0.028, height * 0.56, 0.026),
      new THREE.Vector3(0.022, height * 0.8, -0.012),
      new THREE.Vector3(0, height + 0.12, 0),
    ]);
    const ropeGeometry = new THREE.TubeGeometry(ropeCurve, 8, 0.057, 6, false);
    const rope = new THREE.Mesh(
      ropeGeometry,
      ropeMaterial,
    );
    rope.position.set(x, 0, z);
    rope.castShadow = true;
    rope.name = "Weight-curved sea-wall rope";
    root.add(rope);
    objectRenderBudget.entryProps.ropeRuns += 1;
    objectRenderBudget.entryProps.renderedTriangles += geometryTriangles(ropeGeometry);
    for (let knotY = 0.38; knotY < height; knotY += 0.48) {
      const knot = new THREE.Mesh(
        ropeKnotGeometry,
        ropeMaterial,
      );
      const knotPoint = ropeCurve.getPointAt((knotY - 0.12) / height);
      knot.position.set(x + knotPoint.x, knotY, z + knotPoint.z);
      knot.rotation.x = Math.PI / 2;
      knot.rotation.z = knotY * 0.37;
      knot.name = "Hand-tied climbing knot";
      root.add(knot);
      objectRenderBudget.entryProps.ropeKnots += 1;
      objectRenderBudget.entryProps.renderedTriangles += geometryTriangles(ropeKnotGeometry);
    }
  };
  const insertionHullGeometry = createHullGeometry(5.4, 3.25, 0.78);
  const insertionFloorPlankGeometry = new THREE.BoxGeometry(0.37, 0.11, 3.65);
  const insertionThwartGeometry = new THREE.BoxGeometry(2.72, 0.13, 0.34);
  const insertionGunwaleGeometry = new THREE.BoxGeometry(0.11, 0.17, 4.35);
  const insertionStemGeometry = new THREE.CylinderGeometry(0.055, 0.1, 0.82, 6);
  const insertionOarShaftGeometry = new THREE.CylinderGeometry(0.034, 0.045, 2.3, 6);
  const insertionOarBladeGeometry = new THREE.CylinderGeometry(0.17, 0.055, 0.72, 5);
  const insertionRowlockGeometry = new THREE.TorusGeometry(0.105, 0.023, 4, 7, Math.PI);
  const addInsertionBoat = ({ x, z, orientation = "south" }) => {
    const alongZ = orientation === "south";
    const skiff = new THREE.Group();
    skiff.position.set(x, 0, z);
    skiff.rotation.y = alongZ ? 0 : Math.PI / 2;
    skiff.name = "Sea insertion skiff";
    root.add(skiff);
    objectRenderBudget.entryProps.skiffs += 1;

    const hull = new THREE.Mesh(insertionHullGeometry, boatMaterial);
    hull.position.y = 0.72;
    hull.castShadow = hull.receiveShadow = true;
    hull.name = "Curved insertion skiff hull";
    skiff.add(hull);
    objectRenderBudget.entryProps.hulls += 1;
    objectRenderBudget.entryProps.renderedTriangles += geometryTriangles(insertionHullGeometry);
    for (let plank = -2; plank <= 2; plank += 1) {
      const floorboard = new THREE.Mesh(insertionFloorPlankGeometry, darkTimber);
      floorboard.position.set(plank * 0.43, 0.7, 0.2);
      floorboard.rotation.y = plank * 0.002;
      floorboard.castShadow = floorboard.receiveShadow = true;
      floorboard.name = "Separated skiff floor plank";
      skiff.add(floorboard);
      objectRenderBudget.entryProps.floorPlanks += 1;
      objectRenderBudget.entryProps.renderedTriangles += geometryTriangles(insertionFloorPlankGeometry);
    }
    for (const seatZ of [-1.35, 0, 1.35]) {
      const thwart = new THREE.Mesh(insertionThwartGeometry, timber);
      thwart.position.set(0, 0.9, seatZ);
      thwart.name = "Skiff thwart";
      skiff.add(thwart);
      objectRenderBudget.entryProps.thwarts += 1;
      objectRenderBudget.entryProps.renderedTriangles += geometryTriangles(insertionThwartGeometry);
    }
    for (const side of [-1, 1]) {
      const gunwale = new THREE.Mesh(insertionGunwaleGeometry, darkTimber);
      gunwale.position.set(side * 1.46, 0.98, 0.12);
      gunwale.name = "Raised skiff gunwale";
      skiff.add(gunwale);
      objectRenderBudget.entryProps.gunwales += 1;
      objectRenderBudget.entryProps.renderedTriangles += geometryTriangles(insertionGunwaleGeometry);
      const rowlock = new THREE.Mesh(insertionRowlockGeometry, agedIron);
      rowlock.position.set(side * 1.49, 1.11, -0.42);
      rowlock.rotation.y = side * Math.PI / 2;
      rowlock.name = "Forged skiff rowlock";
      skiff.add(rowlock);
      objectRenderBudget.entryProps.rowlocks += 1;
      objectRenderBudget.entryProps.renderedTriangles += geometryTriangles(insertionRowlockGeometry);
    }
    for (const stern of [-1, 1]) {
      const stem = new THREE.Mesh(insertionStemGeometry, darkTimber);
      stem.position.set(0, 0.9, stern * 2.35);
      stem.rotation.x = stern * -0.17;
      stem.castShadow = true;
      stem.name = "Tapered skiff stem post";
      skiff.add(stem);
      objectRenderBudget.entryProps.stemPosts += 1;
      objectRenderBudget.entryProps.renderedTriangles += geometryTriangles(insertionStemGeometry);
    }
    const painter = new THREE.Group();
    painter.position.set(-1.05, 1.02, 0.85);
    painter.rotation.z = Math.PI / 2;
    painter.rotation.y = 0.28;
    painter.name = "Shaped skiff steering oar";
    skiff.add(painter);
    const oarShaft = new THREE.Mesh(insertionOarShaftGeometry, timber);
    oarShaft.name = "Steering-oar shaft";
    painter.add(oarShaft);
    const oarBlade = new THREE.Mesh(insertionOarBladeGeometry, timber);
    oarBlade.position.y = -1.42;
    oarBlade.scale.z = 0.28;
    oarBlade.name = "Flattened steering-oar blade";
    painter.add(oarBlade);
    objectRenderBudget.entryProps.oars += 1;
    objectRenderBudget.entryProps.renderedTriangles += (
      geometryTriangles(insertionOarShaftGeometry)
      + geometryTriangles(insertionOarBladeGeometry)
    );

    // Collision follows the visible narrow hull while leaving the bow open.
    if (alongZ) {
      for (const side of [-1, 1]) {
        addCollider([0.24, 0.82, 4.45], [x + side * 1.46, 0.63, z + 0.1]);
      }
      addCollider([3.15, 0.82, 0.24], [x, 0.63, z + 2.35]);
    } else {
      for (const side of [-1, 1]) {
        addCollider([4.45, 0.82, 0.24], [x + 0.1, 0.63, z + side * 1.46]);
      }
      addCollider([0.24, 0.82, 3.15], [x - 2.35, 0.63, z]);
    }
  };

  addInsertionBoat({ x: -106.1, z: -5, orientation: "west" });
  addRope(-101.82, -10.45);
  addInsertionBoat({ x: -64, z: 87.3 });
  addRope(-69.45, 82.82);
  addInsertionBoat({ x: -3, z: 87.3 });
  // The Pisan approach uses eroded kurkar blocks as handholds instead of rope.
  const breachStoneGeometry = new THREE.BoxGeometry(0.72, 0.38, 0.52, 2, 1, 1);
  const breachStonePositions = breachStoneGeometry.attributes.position;
  for (let index = 0; index < breachStonePositions.count; index += 1) {
    const x = breachStonePositions.getX(index);
    const y = breachStonePositions.getY(index);
    const z = breachStonePositions.getZ(index);
    breachStonePositions.setXYZ(
      index,
      x * (1 + Math.sin(y * 13 + z * 17) * 0.11) + y * 0.045,
      y * (1 + Math.cos(x * 15 - z * 11) * 0.09),
      z * (1 + Math.sin(x * 19 + y * 7) * 0.12) - x * 0.035,
    );
  }
  breachStoneGeometry.computeVertexNormals();
  for (let step = 0; step < 5; step += 1) {
    const handhold = new THREE.Mesh(breachStoneGeometry, paleStone);
    handhold.position.set(
      -9 + (step % 2 ? 0.38 : -0.32),
      0.35 + step * 0.37,
      82.86,
    );
    handhold.scale.set(1.05, 0.7, 0.8);
    handhold.rotation.set(step * 0.21, step * 0.67, step * -0.13);
    handhold.castShadow = handhold.receiveShadow = true;
    handhold.name = "Eroded Pisan breach handhold";
    root.add(handhold);
    objectRenderBudget.entryProps.breachStones += 1;
    objectRenderBudget.entryProps.renderedTriangles += geometryTriangles(breachStoneGeometry);
  }
  for (let block = -1; block <= 1; block += 1) {
    const parapetStone = new THREE.Mesh(breachStoneGeometry, oldStone);
    parapetStone.position.set(-9 + block * 0.72, 1.82 + Math.abs(block) * 0.05, 81.9);
    parapetStone.scale.set(1.08, 1.1, 0.92);
    parapetStone.rotation.set(block * 0.11, block * 0.38, block * -0.08);
    parapetStone.castShadow = parapetStone.receiveShadow = true;
    parapetStone.name = "Broken Pisan parapet stone";
    root.add(parapetStone);
    objectRenderBudget.entryProps.breachStones += 1;
    objectRenderBudget.entryProps.renderedTriangles += geometryTriangles(breachStoneGeometry);
  }

  const addCrenellations = (axis, start, end, fixed, y, parent = root) => {
    objectRenderBudget.crenellations.runs += 1;
    for (let p = start; p <= end; p += 4.5) {
      const merlon = addBox({
        size: axis === "x" ? [2.4, 1.5, 2.2] : [2.2, 1.5, 2.4],
        position: axis === "x" ? [p, y, fixed] : [fixed, y, p],
        material: paleStone,
        parent,
        shadows: false,
      });
      const weathering = Math.sin(p * 0.731 + fixed * 0.173);
      const secondaryWeathering = Math.cos(p * 0.419 - fixed * 0.263);
      merlon.scale.set(
        1 + weathering * 0.018,
        0.975 + secondaryWeathering * 0.025,
        1 - weathering * 0.012,
      );
      merlon.position.y += weathering * 0.035;
      merlon.rotation.y = secondaryWeathering * 0.018;
      merlon.name = "Subtly weathered individual battlement merlon";
      objectRenderBudget.crenellations.merlons += 1;
      objectRenderBudget.crenellations.staticTriangles += geometryTriangles(
        merlon.geometry,
      );
    }
  };

  const wallArrowSlitGeometry = new THREE.BufferGeometry();
  wallArrowSlitGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([
      -0.08, -0.625, 0,
      0.08, -0.625, 0,
      0.08, 0.45, 0,
      0, 0.625, 0,
      -0.08, 0.45, 0,
    ], 3),
  );
  wallArrowSlitGeometry.setAttribute(
    "normal",
    new THREE.Float32BufferAttribute([
      0, 0, 1,
      0, 0, 1,
      0, 0, 1,
      0, 0, 1,
      0, 0, 1,
    ], 3),
  );
  wallArrowSlitGeometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute([
      0, 0,
      1, 0,
      1, 0.86,
      0.5, 1,
      0, 0.86,
    ], 2),
  );
  wallArrowSlitGeometry.setIndex([
    0, 1, 2,
    0, 2, 4,
    4, 2, 3,
  ]);

  const addWall = (size, position, name) => {
    objectRenderBudget.wallDetails.wallRuns += 1;
    addBox({ size, position, material: oldStone, collider: true, name });
    const alongX = size[0] > size[2];
    const length = alongX ? size[0] : size[2];
    const start = (alongX ? position[0] : position[2]) - length / 2 + 7;
    const end = (alongX ? position[0] : position[2]) + length / 2 - 7;
    addCrenellations(
      alongX ? "x" : "z",
      (alongX ? position[0] : position[2]) - (alongX ? size[0] : size[2]) / 2 + 2,
      (alongX ? position[0] : position[2]) + (alongX ? size[0] : size[2]) / 2 - 2,
      alongX ? position[2] : position[0],
      position[1] + size[1] / 2 + 0.75,
    );
    for (let p = start; p <= end; p += 12) {
      const slit = new THREE.Mesh(wallArrowSlitGeometry, darkRecess);
      slit.position.set(
        alongX ? p : position[0] - size[0] / 2 - 0.06,
        position[1] + 0.25,
        alongX ? position[2] + size[2] / 2 + 0.06 : p,
      );
      if (!alongX) slit.rotation.y = -Math.PI / 2;
      slit.name = "Flush pointed-lancet defensive-wall slit";
      root.add(slit);
      objectRenderBudget.wallDetails.lancetSlits += 1;
      objectRenderBudget.wallDetails.staticTriangles += geometryTriangles(
        wallArrowSlitGeometry,
      );
    }
    for (let p = start + 5; p <= end; p += 20) {
      addBox({
        size: alongX ? [2, size[1] * 0.76, 3.3] : [3.3, size[1] * 0.76, 2],
        position: alongX
          ? [p, size[1] * 0.38, position[2] + size[2] / 2 + 1.1]
          : [position[0] - size[0] / 2 - 1.1, size[1] * 0.38, p],
        material: oldStone,
        collider: true,
        shadows: true,
        name: "Wall buttress",
      });
    }
  };

  const addWallSpan = ([startX, startZ], [endX, endZ], name, height = 7.5) => {
    objectRenderBudget.wallDetails.wallRuns += 1;
    const deltaX = endX - startX;
    const deltaZ = endZ - startZ;
    const length = Math.hypot(deltaX, deltaZ);
    const angle = Math.atan2(deltaZ, deltaX);
    const centerX = (startX + endX) / 2;
    const centerZ = (startZ + endZ) / 2;
    const wall = addBox({
      size: [length + 0.25, height, 3.2],
      position: [centerX, height / 2, centerZ],
      material: oldStone,
      name,
    });
    wall.rotation.y = -angle;

    // Short AABBs follow the rotated masonry closely enough that the player
    // cannot cut through a diagonal wall or become trapped in an oversized
    // bounding box.
    const colliderRuns = Math.max(1, Math.ceil(length / 5));
    for (let run = 0; run < colliderRuns; run += 1) {
      const t = (run + 0.5) / colliderRuns;
      const runLength = length / colliderRuns;
      addCollider(
        [
          Math.abs(Math.cos(angle)) * runLength + Math.abs(Math.sin(angle)) * 3.2,
          height,
          Math.abs(Math.sin(angle)) * runLength + Math.abs(Math.cos(angle)) * 3.2,
        ],
        [startX + deltaX * t, height / 2, startZ + deltaZ * t],
      );
    }
    for (let offset = 2.5; offset < length - 1; offset += 4.5) {
      const t = offset / length;
      const merlon = addBox({
        size: [2.35, 1.5, 2.15],
        position: [
          startX + deltaX * t,
          height + 0.72,
          startZ + deltaZ * t,
        ],
        material: paleStone,
        shadows: false,
        name: "Montmusard wall merlon",
      });
      merlon.rotation.y = -angle;
      objectRenderBudget.crenellations.merlons += 1;
      objectRenderBudget.crenellations.staticTriangles += geometryTriangles(merlon.geometry);
    }
  };

  const addWallPolyline = (points, name, height = 7.5) => {
    for (let index = 1; index < points.length; index += 1) {
      addWallSpan(points[index - 1], points[index], name, height);
    }
  };

  // Louis IX's Montmusard works formed an asymmetric double enclosure: the
  // western sea front projected much farther north than the eastern junction
  // with the old city. The former full-width horizontal wall erased that
  // defining feature.
  addWallPolyline(ACRE_PLAN.montmusardOuterWall.slice(0, -1), "Montmusard outer wall");
  addWallSpan([82, -77], [88, -74], "Montmusard outer wall");
  addWallSpan([95, -66], [91, -68], "Montmusard outer wall");
  addWallPolyline(ACRE_PLAN.montmusardInnerWall.slice(0, -2), "Montmusard inner wall", 6.6);
  addWallSpan([44,-85], [72,-74.3], "Montmusard inner wall", 6.6);
  addWallSpan([86,-66], [91,-63], "Inner gate return", 6.6);

  addWallPolyline(ACRE_PLAN.easternWall, "Eastern landward defenses");

  addWall([74, 5.8, 2.7], [-61, 2.9, -64], "Old northern wall");
  addWall([64, 5.8, 2.7], [47, 2.9, -64], "Old northern wall");

  // St Anthony's Gate, the insertion point.
  const landGateZ = ACRE_PLAN.landmarks.stAnthonyGate[1];
  const gate = new THREE.Group();
  gate.name = "St Anthony's Gate";
  root.add(gate);
  addBox({ size: [7, 11, 7], position: [92, 5.5, landGateZ - 9], material: oldStone, collider: true, parent: gate });
  addBox({ size: [7, 11, 7], position: [92, 5.5, landGateZ + 9], material: oldStone, collider: true, parent: gate });
  addBox({ size: [7, 3, 11], position: [92, 9.5, landGateZ], material: paleStone, parent: gate });
  addCrenellations("z", landGateZ - 11, landGateZ + 11, 92, 12.1, gate);
  for (const faceX of [88.42, 95.58]) {
    addArch({
      radius: 3.15,
      thickness: 0.58,
      position: [faceX, 4.15, landGateZ],
      material: paleStone,
      rotationY: Math.PI / 2,
      parent: gate,
      name: "Gate arch",
    });
    for (const side of [-1, 1]) {
      addBox({
        size: [0.62, 4.25, 0.86],
        position: [faceX, 2.12, landGateZ + side * 3.15],
        material: paleStone,
        collider: true,
        parent: gate,
        shadows: false,
        name: "Gate jamb",
      });
    }
  }
  const landGateButtressParts = [landGateZ - 13, landGateZ + 13].map((buttressZ) => {
    const buttress = new THREE.BoxGeometry(5.2, 6.2, 2.2);
    buttress.translate(88.7, 3.1, buttressZ);
    addCollider([5.2, 6.2, 2.2], [88.7, 3.1, buttressZ]);
    return buttress;
  });
  const landGateButtressGeometry = mergeGeometries(
    landGateButtressParts,
    false,
  );
  landGateButtressParts.forEach((buttress) => buttress.dispose());
  const landGateButtresses = new THREE.Mesh(
    landGateButtressGeometry,
    oldStone,
  );
  landGateButtresses.castShadow = landGateButtresses.receiveShadow = true;
  landGateButtresses.name = "Paired projecting St Anthony's Gate buttresses";
  gate.add(landGateButtresses);
  objectRenderBudget.gateDetails.landGateButtresses = 2;
  objectRenderBudget.gateDetails.landGateButtressMeshes = 1;
  objectRenderBudget.gateDetails.staticTriangles += geometryTriangles(
    landGateButtressGeometry,
  );

  const towerArrowSlitParts = [
    new THREE.PlaneGeometry(0.11, 0.92),
    new THREE.PlaneGeometry(0.34, 0.075).translate(0, 0.12, 0),
  ];
  const towerArrowSlitGeometry = mergeGeometries(towerArrowSlitParts, false);
  towerArrowSlitParts.forEach((part) => part.dispose());

  const addTower = (x, z, radius = 5, height = 10, name = "Defensive tower") => {
    objectRenderBudget.towerDetails.towers += 1;
    const tower = addCylinder({
      radius,
      height,
      position: [x, height / 2, z],
      material: oldStone,
      segments: 18,
      collider: true,
      name,
    });
    addCylinder({
      radius: radius + 0.24,
      height: 0.3,
      position: [x, height - 0.58, z],
      material: paleStone,
      segments: 18,
      name: "Tower projecting stone string course",
    });
    for (let slitIndex = 0; slitIndex < 6; slitIndex += 1) {
      const angle = slitIndex * Math.PI / 3;
      const slit = new THREE.Mesh(towerArrowSlitGeometry, darkRecess);
      slit.position.set(
        x + Math.cos(angle) * radius * 1.035,
        height * 0.56,
        z + Math.sin(angle) * radius * 1.035,
      );
      slit.rotation.y = Math.PI / 2 - angle;
      slit.name = "Flush crosslet-shaped tower arrow slit";
      root.add(slit);
      objectRenderBudget.towerDetails.crossletSlits += 1;
      objectRenderBudget.towerDetails.slitSurfaces += 2;
      objectRenderBudget.towerDetails.staticTriangles += geometryTriangles(
        towerArrowSlitGeometry,
      );
    }
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 5) {
      addBox({
        size: [1.7, 1.4, 1.7],
        position: [x + Math.cos(a) * radius * 0.78, height + 0.45, z + Math.sin(a) * radius * 0.78],
        material: paleStone,
        shadows: false,
      });
    }
    return tower;
  };

  addTower(-101, -122, 5.8, 11, "North-west Montmusard sea tower");
  addTower(82, -83, 6.2, 12, "Montmusard eastern tower");
  addTower(92, 18, 5.2, 10, "Eastern wall tower");
  addTower(89, 76, 5.8, 11, "Burj al-Sultan harbour tower");

  const streetDoorPlanks = Array.from({ length: 5 }, (_, plankIndex) => {
    const plank = new THREE.BoxGeometry(0.31, 2.6, 0.18);
    plank.translate((plankIndex - 2) * 0.33, 0, 0);
    return plank;
  });
  const streetDoorGeometry = mergeGeometries(streetDoorPlanks, false);
  streetDoorPlanks.forEach((plank) => plank.dispose());
  const doorHingeStrapGeometry = new THREE.PlaneGeometry(0.72, 0.075);
  const doorRivetGeometry = new THREE.CircleGeometry(0.055, 5);
  const doorPullGeometry = new THREE.TorusGeometry(0.105, 0.018, 3, 8);
  const windowGrilleParts = [
    ...[-0.25, 0, 0.25].map((barX) => {
      const bar = new THREE.PlaneGeometry(0.028, 1.08);
      bar.translate(barX, 0, 0);
      return bar;
    }),
    ...[-0.34, 0.34].map((barY) => {
      const bar = new THREE.PlaneGeometry(0.82, 0.028);
      bar.translate(0, barY, 0);
      return bar;
    }),
  ];
  const windowGrilleGeometry = mergeGeometries(windowGrilleParts, false);
  windowGrilleParts.forEach((bar) => bar.dispose());
  const balconyBraceAngle = Math.atan2(0.6, 1.2);
  const balconyBraceLength = Math.hypot(1.2, 0.6);
  const balconyBraceParts = [-1.2, 0, 1.2].flatMap((braceX) => (
    [-1, 1].map((direction) => {
      const brace = new THREE.PlaneGeometry(balconyBraceLength, 0.07);
      brace.rotateZ(direction * balconyBraceAngle);
      brace.translate(braceX, 0, 0);
      return brace;
    })
  ));
  const balconyCrossBraceGeometry = mergeGeometries(balconyBraceParts, false);
  balconyBraceParts.forEach((brace) => brace.dispose());
  const roofSpoutBottom = new THREE.PlaneGeometry(0.16, 0.72);
  roofSpoutBottom.rotateX(-Math.PI / 2);
  roofSpoutBottom.translate(0, -0.06, 0);
  const roofSpoutRight = new THREE.PlaneGeometry(0.72, 0.12);
  roofSpoutRight.rotateY(Math.PI / 2);
  roofSpoutRight.translate(0.08, 0, 0);
  const roofSpoutLeft = new THREE.PlaneGeometry(0.72, 0.12);
  roofSpoutLeft.rotateY(-Math.PI / 2);
  roofSpoutLeft.translate(-0.08, 0, 0);
  const roofSpoutGeometry = mergeGeometries([
    roofSpoutBottom,
    roofSpoutRight,
    roofSpoutLeft,
  ], false);
  roofSpoutBottom.dispose();
  roofSpoutRight.dispose();
  roofSpoutLeft.dispose();
  const chimneyOpeningGeometry = new THREE.PlaneGeometry(0.43, 0.43);
  chimneyOpeningGeometry.rotateX(-Math.PI / 2);

  const addDoor = (parent, x, y, z, rotation = 0) => {
    const doorway = new THREE.Group();
    doorway.position.set(x, y, z);
    doorway.rotation.y = rotation;
    doorway.name = "Plank-and-iron street door";
    parent.add(doorway);
    objectRenderBudget.doors.instances += 1;

    const door = new THREE.Mesh(streetDoorGeometry, timber);
    door.name = "Five separated vertical door planks";
    doorway.add(door);
    objectRenderBudget.doors.bodyPlanks += 5;
    objectRenderBudget.doors.staticTriangles += geometryTriangles(streetDoorGeometry);

    for (const strapY of [-0.78, 0, 0.78]) {
      const strap = new THREE.Mesh(doorHingeStrapGeometry, agedIron);
      strap.position.set(-0.4, strapY, 0.115);
      strap.name = "Flush hand-forged door hinge strap";
      doorway.add(strap);
      objectRenderBudget.doors.hingeStraps += 1;
      objectRenderBudget.doors.staticTriangles += geometryTriangles(doorHingeStrapGeometry);

      const rivet = new THREE.Mesh(doorRivetGeometry, agedIron);
      rivet.position.set(-0.76, strapY, 0.14);
      rivet.name = "Forged door hinge rivet";
      doorway.add(rivet);
      objectRenderBudget.doors.rivets += 1;
      objectRenderBudget.doors.staticTriangles += geometryTriangles(doorRivetGeometry);
    }

    const latchRing = new THREE.Mesh(doorPullGeometry, agedIron);
    latchRing.position.set(0.48, -0.05, 0.14);
    latchRing.name = "Slim iron door pull";
    doorway.add(latchRing);
    objectRenderBudget.doors.pullRings += 1;
    objectRenderBudget.doors.staticTriangles += geometryTriangles(doorPullGeometry);

    const footRail = addBox({
      size: [1.55, 0.12, 0.07],
      position: [0, -1.18, 0.11],
      material: darkTimber,
      parent: doorway,
      shadows: false,
      name: "Weathered door foot rail",
    });
    objectRenderBudget.doors.footRails += 1;
    objectRenderBudget.doors.staticTriangles += geometryTriangles(footRail.geometry);
    return door;
  };

  const addHouse = ({
    x,
    z,
    w,
    d,
    h,
    material = plasterMaterials[Math.floor(cityRandom() * plasterMaterials.length)],
    roof = true,
    name = "Frankish townhouse",
  }) => {
    const house = new THREE.Group();
    house.name = name;
    root.add(house);
    addBox({
      size: [w, h, d],
      position: [x, h / 2, z],
      material,
      collider: true,
      parent: house,
      name,
    });
    addBox({
      size: [w + 0.18, 0.58, d + 0.18],
      position: [x, 0.29, z],
      material: oldStone,
      parent: house,
      shadows: false,
      name: "Stone foundation course",
    });

    decorateHouse(house, {x,z,w,d,h}, dressedStone, darkTimber);
    const detailCode = Math.abs(Math.round(x * 41 + z * 67 + h * 29));
    const detailVariant = (detailCode % 997) / 997;
    const roofRise = Math.min(2.4, d * 0.24);
    const addHouseChimney = (offsetX, offsetZ, surfaceY) => {
      const chimneyHeight = 1.05 + (detailCode % 3) * 0.16;
      objectRenderBudget.chimneys.instances += 1;
      const chimneyBody = addBox({
        size: [0.62, chimneyHeight, 0.62],
        position: [x + offsetX, surfaceY + chimneyHeight / 2, z + offsetZ],
        material: oldStone,
        parent: house,
        shadows: false,
        name: "Coursed rooftop chimney",
      });
      objectRenderBudget.chimneys.masonryBodies += 1;
      objectRenderBudget.chimneys.staticTriangles += geometryTriangles(
        chimneyBody.geometry,
      );
      const chimneyCap = addBox({
        size: [0.76, 0.16, 0.76],
        position: [x + offsetX, surfaceY + chimneyHeight + 0.02, z + offsetZ],
        material: paleStone,
        parent: house,
        shadows: false,
        name: "Chimney cap course",
      });
      objectRenderBudget.chimneys.capCourses += 1;
      objectRenderBudget.chimneys.staticTriangles += geometryTriangles(
        chimneyCap.geometry,
      );
      const chimneyOpening = new THREE.Mesh(chimneyOpeningGeometry, darkRecess);
      chimneyOpening.position.set(
        x + offsetX,
        surfaceY + chimneyHeight + 0.115,
        z + offsetZ,
      );
      chimneyOpening.name = "Flush soot-black chimney opening";
      house.add(chimneyOpening);
      objectRenderBudget.chimneys.sootOpenings += 1;
      objectRenderBudget.chimneys.staticTriangles += geometryTriangles(
        chimneyOpeningGeometry,
      );
    };

    const pitched = roof && cityRandom() > 0.44;
    if (pitched) {
      addPitchedRoof({ x, z, w: w + 0.55, d: d + 0.55, y: h, parent: house });
      addBox({
        size: [w + 0.75, 0.16, 0.28],
        position: [x, h + roofRise + 0.04, z],
        material: paleStone,
        parent: house,
        shadows: false,
        name: "Roof ridge",
      });
      if (detailVariant > 0.42) {
        const offsetZ = (detailCode % 2 ? -0.22 : 0.19) * d;
        const surfaceY = h + roofRise * (
          1 - Math.min(1, Math.abs(offsetZ) / Math.max(0.1, d / 2))
        );
        addHouseChimney(
          (detailCode % 3 - 1) * w * 0.18,
          offsetZ,
          surfaceY,
        );
      }
    } else {
      addBox({
        size: [w + 0.35, 0.34, d + 0.35],
        position: [x, h + 0.17, z],
        material: paleStone,
        parent: house,
        shadows: false,
        name: "Flat lime roof",
      });
      objectRenderBudget.roofParapets.flatRoofs += 1;
      const parapetSections = [
        [[w + 0.6, 0.62, 0.3], [x, h + 0.58, z - d / 2]],
        [[w + 0.6, 0.62, 0.3], [x, h + 0.58, z + d / 2]],
        [[0.3, 0.62, d], [x - w / 2, h + 0.58, z]],
        [[0.3, 0.62, d], [x + w / 2, h + 0.58, z]],
      ];
      for (const [sideIndex, [size, position]] of parapetSections.entries()) {
        const parapet = addBox({
          size,
          position,
          material: paleStone,
          parent: house,
          shadows: false,
          name: "Weathered uneven roof parapet",
        });
        const weatheringPhase = detailCode * 0.017 + sideIndex * 1.913;
        const heightScale = 1 + Math.sin(weatheringPhase) * 0.035;
        parapet.scale.set(
          1 + Math.cos(weatheringPhase * 0.73) * 0.008,
          heightScale,
          1 - Math.sin(weatheringPhase * 0.61) * 0.008,
        );
        parapet.position.y += (heightScale - 1) * 0.31;
        parapet.rotation.y = Math.cos(weatheringPhase * 1.17) * 0.004;
        objectRenderBudget.roofParapets.sections += 1;
        objectRenderBudget.roofParapets.staticTriangles += geometryTriangles(
          parapet.geometry,
        );
      }
      if (detailVariant > 0.62) {
        const accessX = x + (detailCode % 2 ? -1 : 1) * w * 0.24;
        const accessZ = z - d * 0.18;
        addBox({
          size: [2.15, 1.45, 2.05],
          position: [accessX, h + 0.73, accessZ],
          material,
          parent: house,
          shadows: false,
          name: "Flat-roof stair enclosure",
        });
        addBox({
          size: [2.32, 0.16, 2.22],
          position: [accessX, h + 1.5, accessZ],
          material: paleStone,
          parent: house,
          shadows: false,
          name: "Roof access cap",
        });
        addBox({
          size: [0.82, 1.05, 0.07],
          position: [accessX, h + 0.57, accessZ + 1.06],
          material: darkRecess,
          parent: house,
          shadows: false,
          name: "Roof stair doorway",
        });
      } else if (detailVariant > 0.24) {
        addHouseChimney(
          (detailCode % 2 ? -1 : 1) * w * 0.23,
          -d * 0.16,
          h + 0.34,
        );
      }
      const roofSpout = new THREE.Mesh(roofSpoutGeometry, oldStone);
      roofSpout.position.set(
        x + (detailCode % 2 ? -1 : 1) * w * 0.32,
        h + 0.32,
        z + d / 2 + 0.35,
      );
      roofSpout.name = "Open three-sided stone roof-drainage chute";
      house.add(roofSpout);
      objectRenderBudget.roofDrainage.spouts += 1;
      objectRenderBudget.roofDrainage.troughSurfaces += 3;
      objectRenderBudget.roofDrainage.staticTriangles += geometryTriangles(
        roofSpoutGeometry,
      );
    }

    const facadeZ = z + d / 2 + 0.1;
    addBox({
      size: [2.05, 2.75, 0.18],
      position: [x, 1.375, facadeZ],
      material: darkRecess,
      parent: house,
      shadows: false,
      name: "Recessed doorway",
    });
    addDoor(house, x, 1.3, facadeZ + 0.08);
    addBox({ size: [0.34, 2.85, 0.32], position: [x - 1.08, 1.43, facadeZ], material: paleStone, parent: house, shadows: false });
    addBox({ size: [0.34, 2.85, 0.32], position: [x + 1.08, 1.43, facadeZ], material: paleStone, parent: house, shadows: false });
    addArch({ radius: 1.08, thickness: 0.24, position: [x, 2.72, facadeZ], material: paleStone, parent: house, name: "Door arch" });
    const repairSide = detailCode % 2 ? -1 : 1;
    for (let course = 0; course < 3; course += 1) {
      addBox({
        size: [0.72 + (course % 2) * 0.28, 0.24, 0.075],
        position: [
          x + repairSide * (2.05 + course * 0.42),
          0.72 + course * 0.34,
          facadeZ + 0.145,
        ],
        material: course === 1 ? paleStone : oldStone,
        parent: house,
        shadows: false,
        name: "Exposed masonry repair course",
      });
    }

    // A shared two-colour palette lets all shutters collapse into two static
    // batches instead of creating a separate draw call for every house.
    const shutterMaterial = shutterMaterials[cityRandom() > 0.5 ? 0 : 1];
    const windows = Math.min(3, Math.max(2, Math.floor(w / 4.8)));
    const levels = h > 7.1 ? [3.6, 6.15] : [Math.min(h - 1.35, 3.7)];
    for (const level of levels) {
      for (let i = 0; i < windows; i += 1) {
        const windowPhase = detailCode * 0.031 + level * 0.71 + i * 1.37;
        const wx = (
          x +
          (i - (windows - 1) / 2) * Math.min(3.6, (w - 2.2) / windows) +
          Math.sin(windowPhase) * 0.08
        );
        const windowY = level + Math.cos(windowPhase * 0.83) * 0.055;
        addBox({
          size: [0.92, 1.18, 0.16],
          position: [wx, windowY, facadeZ + 0.02],
          material: darkRecess,
          parent: house,
          shadows: false,
          name: "Irregular deep window recess",
        });
        addBox({
          size: [1.24, 0.2, 0.28],
          position: [wx, windowY + 0.69, facadeZ],
          material: paleStone,
          parent: house,
          shadows: false,
          name: "Hand-set window lintel",
        });
        addBox({
          size: [1.18, 0.12, 0.34],
          position: [wx, windowY - 0.66, facadeZ + 0.08],
          material: paleStone,
          parent: house,
          shadows: false,
          name: "Projecting window sill",
        });
        for (const side of [-1, 1]) {
          const shutter = addBox({
            size: [0.38, 1.14, 0.11],
            position: [wx + side * 0.67, windowY, facadeZ + 0.08],
            material: shutterMaterial,
            parent: house,
            shadows: false,
            name: "Worn painted plank street shutter",
          });
          const shutterWear = Math.sin(windowPhase + side * 2.19);
          shutter.rotation.y = side * (-0.1 - (shutterWear + 1) * 0.035);
          shutter.rotation.z = shutterWear * 0.014;
          objectRenderBudget.shutters.frontLeaves += 1;
          objectRenderBudget.shutters.staticTriangles += geometryTriangles(shutter.geometry);
        }
        const windowGrille = new THREE.Mesh(windowGrilleGeometry, agedIron);
        windowGrille.position.set(wx, windowY, facadeZ + 0.14);
        windowGrille.rotation.z = Math.sin(windowPhase * 1.43) * 0.009;
        windowGrille.name = "Slightly irregular five-bar forged street-window grille";
        house.add(windowGrille);
        objectRenderBudget.windowGrilles.instances += 1;
        objectRenderBudget.windowGrilles.verticalBars += 3;
        objectRenderBudget.windowGrilles.horizontalBars += 2;
        objectRenderBudget.windowGrilles.staticTriangles += geometryTriangles(
          windowGrilleGeometry,
        );
      }
    }

    // Side elevations matter in Acre's narrow, turning lanes. A few deeply
    // recessed openings keep them from reading as untouched level-design boxes.
    for (const side of [-1, 1]) {
      const facadeX = x + side * (w / 2 + 0.09);
      for (const level of levels) {
        for (const [openingIndex, offset] of [-d * 0.22, d * 0.22].entries()) {
          const openingPhase = (
            detailCode * 0.023 +
            level * 0.67 +
            openingIndex * 1.91 +
            side * 0.83
          );
          const wz = z + offset + Math.sin(openingPhase) * 0.075;
          const openingY = level + Math.cos(openingPhase * 0.79) * 0.05;
          addBox({
            size: [0.16, 1.02, 0.82],
            position: [facadeX, openingY, wz],
            material: darkRecess,
            parent: house,
            shadows: false,
            name: "Irregular side window recess",
          });
          addBox({
            size: [0.29, 0.18, 1.12],
            position: [facadeX, openingY + 0.61, wz],
            material: paleStone,
            parent: house,
            shadows: false,
            name: "Hand-set side window lintel",
          });
          addBox({
            size: [0.31, 0.12, 1.08],
            position: [facadeX + side * 0.05, openingY - 0.57, wz],
            material: paleStone,
            parent: house,
            shadows: false,
            name: "Side window sill",
          });
          for (const shutterSide of [-1, 1]) {
            const shutter = addBox({
              size: [0.1, 0.98, 0.3],
              position: [
                facadeX + side * 0.07,
                openingY,
                wz + shutterSide * 0.56,
              ],
              material: shutterMaterial,
              parent: house,
              shadows: false,
              name: "Worn painted plank side shutter",
            });
            const shutterWear = Math.cos(openingPhase + shutterSide * 1.57);
            shutter.rotation.x = shutterSide * (0.06 + (shutterWear + 1) * 0.025);
            shutter.rotation.z = shutterWear * 0.012;
            objectRenderBudget.shutters.sideLeaves += 1;
            objectRenderBudget.shutters.staticTriangles += geometryTriangles(shutter.geometry);
          }
        }
      }
    }

    if (h > 6.2 && cityRandom() > 0.58) {
      objectRenderBudget.balconies.instances += 1;
      for (const supportX of [-1.45, 0, 1.45]) {
        const corbel = addBox({
          size: [0.15, 1.08, 0.16],
          position: [x + supportX, 4.22, facadeZ + 0.35],
          material: darkTimber,
          parent: house,
          shadows: false,
          name: "Diagonal balcony corbel",
        });
        corbel.rotation.x = 0.58;
        objectRenderBudget.balconies.corbels += 1;
        objectRenderBudget.balconies.staticTriangles += geometryTriangles(corbel.geometry);
      }

      const balconyWidth = Math.min(5.4, w * 0.45);
      const deckParts = [-0.45, 0, 0.45].map((boardZ) => {
        const board = new THREE.BoxGeometry(balconyWidth, 0.3, 0.42);
        board.translate(0, 0, boardZ);
        return board;
      });
      const balconyDeckGeometry = mergeGeometries(deckParts, false);
      deckParts.forEach((board) => board.dispose());
      const balconyDeck = new THREE.Mesh(balconyDeckGeometry, timber);
      balconyDeck.position.set(x, 4.7, facadeZ + 0.62);
      balconyDeck.name = "Three separated projecting balcony deck boards";
      house.add(balconyDeck);
      objectRenderBudget.balconies.deckPlanks += 3;
      objectRenderBudget.balconies.staticTriangles += geometryTriangles(
        balconyDeckGeometry,
      );

      for (const railX of [-1.8, -0.6, 0.6, 1.8]) {
        const railPost = addBox({
          size: [0.08, 0.82, 0.08],
          position: [x + railX, 5.2, facadeZ + 1.12],
          material: timber,
          parent: house,
          shadows: false,
          name: "Stout balcony railing post",
        });
        objectRenderBudget.balconies.railPosts += 1;
        objectRenderBudget.balconies.staticTriangles += geometryTriangles(
          railPost.geometry,
        );
      }

      const crossBraces = new THREE.Mesh(balconyCrossBraceGeometry, darkTimber);
      crossBraces.position.set(x, 5.2, facadeZ + 1.125);
      crossBraces.name = "Three-bay crossed balcony railing infill";
      house.add(crossBraces);
      objectRenderBudget.balconies.crossBraces += 6;
      objectRenderBudget.balconies.staticTriangles += geometryTriangles(
        balconyCrossBraceGeometry,
      );

      const topRail = addBox({
        size: [4.2, 0.1, 0.1],
        position: [x, 5.6, facadeZ + 1.12],
        material: timber,
        parent: house,
        shadows: false,
        name: "Continuous balcony handrail",
      });
      objectRenderBudget.balconies.topRails += 1;
      objectRenderBudget.balconies.staticTriangles += geometryTriangles(topRail.geometry);
    }
    return house;
  };

  // Montmusard: a looser northern suburb between the two defensive lines.
  [
    [-86, -107, 13, 10, 5.8], [-67, -106, 12, 10, 6.5],
    [-48, -100, 14, 11, 6], [-29, -94, 13, 10, 6.8],
    [-10, -88, 14, 11, 7], [12, -82, 15, 10, 6],
    [50, -78, 13, 6, 6.8],
  ].forEach(([x, z, w, d, h]) => addHouse({ x, z, w, d, h, name: "Montmusard house" }));

  // Hospitaller headquarters: massive wings around a large central court.
  const hospital = new THREE.Group();
  hospital.name = "Hospitaller headquarters";
  root.add(hospital);
  addBox({ size: [42, 9.5, 10], position: [-31, 4.75, -57], material: limestone, collider: true, parent: hospital, name: "Hospitaller north hall" });
  addBox({ size: [10, 9, 30], position: [-52, 4.5, -42], material: limestone, collider: true, parent: hospital });
  addBox({ size: [10, 8, 10], position: [-10, 4, -52], material: limestone, collider: true, parent: hospital });
  addBox({ size: [10, 8, 10], position: [-10, 4, -31], material: limestone, collider: true, parent: hospital });
  addBox({ size: [14, 7.5, 9], position: [-45, 3.75, -26.5], material: limestone, collider: true, parent: hospital });
  addBox({ size: [14, 7.5, 9], position: [-17, 3.75, -26.5], material: limestone, collider: true, parent: hospital });
  addCrenellations("x", -50, -12, -62, 10.2, hospital);
  addBox({ size: [42.5, 0.45, 10.5], position: [-31, 9.72, -57], material: paleStone, parent: hospital, shadows: false, name: "Hospitaller roof terrace" });
  for (let x = -48; x <= -14; x += 8.5) {
    addBox({
      size: [1.7, 7.4, 2.4],
      position: [x, 3.7, -62.6],
      material: oldStone,
      parent: hospital,
      name: "Hospitaller buttress",
    });
    addBox({
      size: [0.34, 1.55, 0.12],
      position: [x + 3.4, 5.4, -62.08],
      material: darkRecess,
      parent: hospital,
      shadows: false,
      name: "Hospitaller arrow window",
    });
  }

  // Courtyard arcade and documented well/pools.
  for (const z of [-51.2, -30.8]) {
    const arcadeColumns = [-44, -37.5, -31, -24.5, -18];
    for (const x of arcadeColumns) {
      addCylinder({ radius: 0.48, height: 3.5, position: [x, 1.75, z], material: paleStone, segments: 10, parent: hospital, name: "Courtyard column", collider: true });
      addCylinder({ radius: 0.66, height: 0.22, position: [x, 0.11, z], material: oldStone, segments: 10, parent: hospital, name: "Column base" });
      addCylinder({ radius: 0.66, height: 0.24, position: [x, 3.46, z], material: oldStone, segments: 10, parent: hospital, name: "Column capital" });
    }
    for (let i = 0; i < arcadeColumns.length - 1; i += 1) {
      addArch({
        radius: 2.95,
        thickness: 0.42,
        position: [(arcadeColumns[i] + arcadeColumns[i + 1]) / 2, 3.15, z],
        material: paleStone,
        parent: hospital,
        name: "Hospitaller courtyard arch",
      });
    }
  }
  for (const x of [-44, -31, -18]) {
    const bannerGeometry = new THREE.PlaneGeometry(2.05, 3.5, 5, 6);
    const positions = bannerGeometry.attributes.position;
    for (let index = 0; index < positions.count; index += 1) {
      const px = positions.getX(index);
      const py = positions.getY(index);
      const drop = THREE.MathUtils.clamp((-py + 1.75) / 3.5, 0, 1);
      const taperedX = px * (1 - drop * 0.075);
      const raggedHem = py < -1.7 ? Math.sin(px * 5.1) * 0.055 : 0;
      positions.setXYZ(
        index,
        taperedX,
        py + raggedHem,
        Math.sin(py * 2.1 + px) * (0.035 + drop * 0.045)
          + Math.cos(px * 2.7) * 0.018,
      );
    }
    bannerGeometry.computeVertexNormals();
    const banner = new THREE.Mesh(bannerGeometry, hospitallerBannerMaterial);
    banner.position.set(x, 6.45, -51.88);
    banner.castShadow = true;
    banner.name = "Wind-shaped Hospitaller black banner";
    hospital.add(banner);
    objectRenderBudget.textiles.banners += 1;
    objectRenderBudget.textiles.staticTriangles += geometryTriangles(bannerGeometry);
    addBox({
      size: [2.55, 0.11, 0.11],
      position: [x, 8.25, -51.82],
      material: timber,
      parent: hospital,
      shadows: false,
      name: "Banner rail",
    });
    objectRenderBudget.textiles.bannerRails += 1;
    objectRenderBudget.textiles.staticTriangles += 12;
  }
  objectRenderBudget.well.instances = 1;
  const wellOuterGeometry = new THREE.CylinderGeometry(1.35, 1.35, 0.9, 10, 1, true);
  const wellOuter = new THREE.Mesh(wellOuterGeometry, paleStone);
  wellOuter.position.set(-37, 0.45, -42);
  wellOuter.castShadow = wellOuter.receiveShadow = true;
  wellOuter.name = "Worn outer masonry of Hospitaller well";
  hospital.add(wellOuter);
  objectRenderBudget.well.outerWalls += 1;
  objectRenderBudget.well.staticTriangles += geometryTriangles(wellOuterGeometry);

  const wellInnerGeometry = new THREE.CylinderGeometry(1.05, 1.05, 0.9, 10, 1, true);
  wellInnerGeometry.scale(-1, 1, 1);
  const wellInner = new THREE.Mesh(wellInnerGeometry, oldStone);
  wellInner.position.set(-37, 0.45, -42);
  wellInner.receiveShadow = true;
  wellInner.name = "Visible stone lining inside Hospitaller well";
  hospital.add(wellInner);
  objectRenderBudget.well.innerWalls += 1;
  objectRenderBudget.well.staticTriangles += geometryTriangles(wellInnerGeometry);

  const wellCopingGeometry = new THREE.RingGeometry(1.05, 1.35, 10, 1);
  const wellCoping = new THREE.Mesh(wellCopingGeometry, paleStone);
  wellCoping.position.set(-37, 0.905, -42);
  wellCoping.rotation.x = -Math.PI / 2;
  wellCoping.receiveShadow = true;
  wellCoping.name = "Broad worn well coping ring";
  hospital.add(wellCoping);
  objectRenderBudget.well.copingRings += 1;
  objectRenderBudget.well.staticTriangles += geometryTriangles(wellCopingGeometry);

  const wellShaftGeometry = new THREE.CircleGeometry(1.04, 10);
  const wellShaft = new THREE.Mesh(wellShaftGeometry, darkRecess);
  wellShaft.position.set(-37, 0.04, -42);
  wellShaft.rotation.x = -Math.PI / 2;
  wellShaft.name = "Deep shadow inside Hospitaller well shaft";
  hospital.add(wellShaft);
  objectRenderBudget.well.shaftShadows += 1;
  objectRenderBudget.well.staticTriangles += geometryTriangles(wellShaftGeometry);
  addCollider([2.565, 0.9, 2.565], [-37, 0.45, -42]);

  const wellFramePostParts = [-1, 1].map((side) => {
    const post = new THREE.BoxGeometry(0.18, 2.6, 0.18);
    post.translate(-37 + side * 1.15, 1.7, -42);
    return post;
  });
  const wellFramePostGeometry = mergeGeometries(wellFramePostParts, false);
  wellFramePostParts.forEach((post) => post.dispose());
  const wellFramePosts = new THREE.Mesh(wellFramePostGeometry, timber);
  wellFramePosts.castShadow = wellFramePosts.receiveShadow = true;
  wellFramePosts.name = "Paired squared timber well-frame posts";
  hospital.add(wellFramePosts);
  objectRenderBudget.well.framePosts += 2;
  objectRenderBudget.well.staticTriangles += geometryTriangles(wellFramePostGeometry);
  const wellCrossbar = addBox({
    size: [2.7, 0.18, 0.18],
    position: [-37, 2.95, -42],
    material: timber,
    parent: hospital,
    name: "Mortised timber well crossbar",
  });
  objectRenderBudget.well.crossbars += 1;
  objectRenderBudget.well.staticTriangles += geometryTriangles(wellCrossbar.geometry);

  const wellWindlassGeometry = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.26, -1.15),
      new THREE.Vector2(0.19, -1.03),
      new THREE.Vector2(0.19, 1.03),
      new THREE.Vector2(0.26, 1.15),
    ],
    6,
  );
  const wellWindlass = new THREE.Mesh(
    wellWindlassGeometry,
    darkTimber,
  );
  wellWindlass.position.set(-37, 2.68, -42);
  wellWindlass.rotation.z = Math.PI / 2;
  wellWindlass.castShadow = true;
  wellWindlass.name = "Flanged timber well windlass drum";
  hospital.add(wellWindlass);
  objectRenderBudget.well.drums += 1;
  objectRenderBudget.well.staticTriangles += geometryTriangles(wellWindlassGeometry);

  const wellAxleGeometry = new THREE.CylinderGeometry(0.052, 0.052, 2.72, 5);
  const wellAxle = new THREE.Mesh(
    wellAxleGeometry,
    agedIron,
  );
  wellAxle.position.set(-37, 2.68, -42);
  wellAxle.rotation.z = Math.PI / 2;
  wellAxle.name = "Forged windlass axle";
  hospital.add(wellAxle);
  objectRenderBudget.well.axles += 1;
  objectRenderBudget.well.staticTriangles += geometryTriangles(wellAxleGeometry);

  const wellRopeGeometry = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(-37, 2.6, -42.18),
      new THREE.Vector3(-37.04, 1.78, -42.16),
      new THREE.Vector3(-36.98, 0.55, -42.19),
    ]),
    3,
    0.034,
    3,
    false,
  );
  const wellRope = new THREE.Mesh(
    wellRopeGeometry,
    ropeMaterial,
  );
  wellRope.castShadow = true;
  wellRope.name = "Weight-bowed well rope";
  hospital.add(wellRope);
  objectRenderBudget.well.ropes += 1;
  objectRenderBudget.well.staticTriangles += geometryTriangles(wellRopeGeometry);

  const wellCrankArm = addBox({
    size: [0.08, 0.68, 0.08],
    position: [-38.48, 2.4, -42],
    material: agedIron,
    parent: hospital,
    shadows: false,
    name: "Forged offset well-crank arm",
  });
  objectRenderBudget.well.crankArms += 1;
  objectRenderBudget.well.staticTriangles += geometryTriangles(wellCrankArm.geometry);

  const wellCrankGripGeometry = new THREE.CylinderGeometry(0.065, 0.075, 0.38, 4);
  const wellCrankGrip = new THREE.Mesh(
    wellCrankGripGeometry,
    timber,
  );
  wellCrankGrip.position.set(-38.48, 2.07, -41.84);
  wellCrankGrip.rotation.x = Math.PI / 2;
  wellCrankGrip.name = "Faceted worn timber crank grip";
  hospital.add(wellCrankGrip);
  objectRenderBudget.well.crankGrips += 1;
  objectRenderBudget.well.staticTriangles += geometryTriangles(wellCrankGripGeometry);

  const poolOuterWidth = 5.2;
  const poolOuterDepth = 3;
  const poolInnerWidth = 4.5;
  const poolInnerDepth = 2.3;
  const poolCopingWidth = (poolOuterWidth - poolInnerWidth) / 2;
  const poolTopY = 0.32;
  const poolWallHeight = 0.3;
  const poolBasinParts = [];
  const addPoolPlane = ({
    width,
    height,
    x = 0,
    y = 0,
    z = 0,
    rotateX = 0,
    rotateY = 0,
  }) => {
    const plane = new THREE.PlaneGeometry(width, height);
    if (rotateX) plane.rotateX(rotateX);
    if (rotateY) plane.rotateY(rotateY);
    plane.translate(x, y, z);
    poolBasinParts.push(plane);
  };

  for (const side of [-1, 1]) {
    addPoolPlane({
      width: poolOuterWidth,
      height: poolCopingWidth,
      y: poolTopY,
      z: side * (poolInnerDepth / 2 + poolCopingWidth / 2),
      rotateX: -Math.PI / 2,
    });
    addPoolPlane({
      width: poolCopingWidth,
      height: poolInnerDepth,
      x: side * (poolInnerWidth / 2 + poolCopingWidth / 2),
      y: poolTopY,
      rotateX: -Math.PI / 2,
    });
  }
  addPoolPlane({
    width: poolOuterWidth,
    height: poolWallHeight,
    y: poolTopY - poolWallHeight / 2,
    z: poolOuterDepth / 2,
  });
  addPoolPlane({
    width: poolOuterWidth,
    height: poolWallHeight,
    y: poolTopY - poolWallHeight / 2,
    z: -poolOuterDepth / 2,
    rotateY: Math.PI,
  });
  addPoolPlane({
    width: poolOuterDepth,
    height: poolWallHeight,
    x: poolOuterWidth / 2,
    y: poolTopY - poolWallHeight / 2,
    rotateY: Math.PI / 2,
  });
  addPoolPlane({
    width: poolOuterDepth,
    height: poolWallHeight,
    x: -poolOuterWidth / 2,
    y: poolTopY - poolWallHeight / 2,
    rotateY: -Math.PI / 2,
  });
  addPoolPlane({
    width: poolInnerWidth,
    height: poolWallHeight,
    y: poolTopY - poolWallHeight / 2,
    z: poolInnerDepth / 2,
    rotateY: Math.PI,
  });
  addPoolPlane({
    width: poolInnerWidth,
    height: poolWallHeight,
    y: poolTopY - poolWallHeight / 2,
    z: -poolInnerDepth / 2,
  });
  addPoolPlane({
    width: poolInnerDepth,
    height: poolWallHeight,
    x: poolInnerWidth / 2,
    y: poolTopY - poolWallHeight / 2,
    rotateY: -Math.PI / 2,
  });
  addPoolPlane({
    width: poolInnerDepth,
    height: poolWallHeight,
    x: -poolInnerWidth / 2,
    y: poolTopY - poolWallHeight / 2,
    rotateY: Math.PI / 2,
  });

  const poolBasinGeometry = mergeGeometries(poolBasinParts, false);
  poolBasinParts.forEach((part) => part.dispose());
  const courtyardPoolBasin = new THREE.Mesh(poolBasinGeometry, paleStone);
  courtyardPoolBasin.position.set(-23, 0, -45);
  courtyardPoolBasin.name = "Recessed stone-lined Hospitaller courtyard basin";
  courtyardPoolBasin.castShadow = courtyardPoolBasin.receiveShadow = true;
  hospital.add(courtyardPoolBasin);

  const poolWaterGeometry = new THREE.PlaneGeometry(
    poolInnerWidth - 0.08,
    poolInnerDepth - 0.08,
  );
  const poolWater = new THREE.Mesh(
    poolWaterGeometry,
    new THREE.MeshStandardMaterial({
      color: 0x315f67,
      roughness: 0.32,
      metalness: 0,
    }),
  );
  poolWater.position.set(-23, 0.1, -45);
  poolWater.rotation.x = -Math.PI / 2;
  poolWater.name = "Still water recessed below courtyard-basin coping";
  hospital.add(poolWater);
  objectRenderBudget.courtyardPool.instances = 1;
  objectRenderBudget.courtyardPool.copingSections = 4;
  objectRenderBudget.courtyardPool.outerWalls = 4;
  objectRenderBudget.courtyardPool.innerWalls = 4;
  objectRenderBudget.courtyardPool.waterSurfaces = 1;
  objectRenderBudget.courtyardPool.staticTriangles = (
    geometryTriangles(poolBasinGeometry) + geometryTriangles(poolWaterGeometry)
  );

  const benchSeatParts = [-0.18, 0, 0.18].map((plankZ) => {
    const plank = new THREE.BoxGeometry(3.2, 0.18, 0.16);
    plank.translate(0, 0, plankZ);
    return plank;
  });
  const benchSeatGeometry = mergeGeometries(benchSeatParts, false);
  benchSeatParts.forEach((plank) => plank.dispose());
  const benchBackParts = [-0.1, 0.1].map((plankY) => {
    const plank = new THREE.BoxGeometry(3.2, 0.14, 0.16);
    plank.translate(0, plankY, 0);
    return plank;
  });
  const benchBackGeometry = mergeGeometries(benchBackParts, false);
  benchBackParts.forEach((plank) => plank.dispose());
  const benchBraceGeometry = new THREE.PlaneGeometry(0.12, 0.78);

  for (const [x, z, rotation] of [[-42, -37, 0], [-27, -35, Math.PI / 2]]) {
    const bench = new THREE.Group();
    bench.position.set(x, 0, z);
    bench.rotation.y = rotation;
    bench.name = "Plank-built Hospitaller courtyard bench";
    hospital.add(bench);
    objectRenderBudget.courtyardBenches.instances += 1;

    const seat = new THREE.Mesh(benchSeatGeometry, timber);
    seat.position.y = 0.68;
    seat.name = "Three separated courtyard-bench seat planks";
    bench.add(seat);
    objectRenderBudget.courtyardBenches.seatPlanks += 3;
    objectRenderBudget.courtyardBenches.staticTriangles += geometryTriangles(benchSeatGeometry);

    for (const bx of [-1.25, 1.25]) {
      const leg = addBox({
        size: [0.18, 0.65, 0.18],
        position: [bx, 0.33, 0],
        material: timber,
        parent: bench,
        shadows: false,
        name: "Squared courtyard-bench leg",
      });
      objectRenderBudget.courtyardBenches.legs += 1;
      objectRenderBudget.courtyardBenches.staticTriangles += geometryTriangles(leg.geometry);

      const backPost = addBox({
        size: [0.14, 1.12, 0.14],
        position: [bx, 0.72, -0.24],
        material: darkTimber,
        parent: bench,
        shadows: false,
        name: "Bench back post",
      });
      objectRenderBudget.courtyardBenches.backPosts += 1;
      objectRenderBudget.courtyardBenches.staticTriangles += geometryTriangles(
        backPost.geometry,
      );

      const brace = new THREE.Mesh(benchBraceGeometry, darkTimber);
      brace.position.set(bx * 0.82, 0.46, -0.22);
      brace.rotation.z = bx < 0 ? -0.42 : 0.42;
      brace.name = "Flush courtyard-bench diagonal brace";
      bench.add(brace);
      objectRenderBudget.courtyardBenches.diagonalBraces += 1;
      objectRenderBudget.courtyardBenches.staticTriangles += geometryTriangles(
        benchBraceGeometry,
      );
    }

    const backrest = new THREE.Mesh(benchBackGeometry, timber);
    backrest.position.set(0, 1.17, -0.24);
    backrest.name = "Two separated courtyard-bench backrest planks";
    bench.add(backrest);
    objectRenderBudget.courtyardBenches.backrestPlanks += 2;
    objectRenderBudget.courtyardBenches.staticTriangles += geometryTriangles(
      benchBackGeometry,
    );
  }

  // Conjectural Romanesque cathedral elevation. Earlier material survives as
  // reused columns, not a claimed Byzantine dome over a Frankish cathedral.
  const cathedral = new THREE.Group();
  cathedral.name = "Cathedral of the Holy Cross";
  root.add(cathedral);
  addBox({ size: [22, 9, 30], position: [-20, 4.5, -5], material: paleStone, collider: true, parent: cathedral });
  addBox({ size: [8, 13, 8], position: [-20, 6.5, -22], material: limestone, collider: true, parent: cathedral });
  const naveRoof = addPitchedRoof({
    x: -20,
    z: -5,
    w: 30.8,
    d: 22.8,
    y: 9,
    parent: cathedral,
    material: roofMaterial,
  });
  naveRoof.rotation.y = Math.PI / 2;
  const towerRoof = new THREE.Mesh(new THREE.ConeGeometry(5.2, 3.4, 4), roofMaterial);
  towerRoof.position.set(-20, 14.7, -22);
  towerRoof.rotation.y = Math.PI / 4;
  towerRoof.castShadow = true;
  cathedral.add(towerRoof);
  addArch({
    radius: 1.55,
    thickness: 0.3,
    position: [-20, 8.5, -26.08],
    material: oldStone,
    parent: cathedral,
    name: "Cathedral rose window",
  });
  const roseGlass = new THREE.Mesh(
    new THREE.CircleGeometry(1.25, 24),
    new THREE.MeshStandardMaterial({
      color: 0x244857,
      emissive: 0x18384a,
      emissiveIntensity: 0.45,
      roughness: 0.25,
      metalness: 0.1,
    }),
  );
  roseGlass.position.set(-20, 8.5, -26.1);
  cathedral.add(roseGlass);
  for (const x of [-31.5, -8.5]) {
    for (const z of [-15, -4, 7]) {
      addBox({
        size: [2.2, 6.3, 1.7],
        position: [x, 3.15, z],
        material: oldStone,
        parent: cathedral,
        name: "Cathedral buttress",
      });
    }
  }
  const apse = addCylinder({ radius: 6, height: 9, position: [-20, 4.5, 10], material: paleStone, segments: 20, parent: cathedral, name: "Cathedral apse", collider: true });
  apse.scale.z = 0.62;
  for (const x of [-27, -13]) {
    addCylinder({ radius: 0.65, height: 5.2, position: [x, 2.6, 13], material: oldStone, segments: 12, parent: cathedral, name: "Reused Byzantine column", collider: true });
  }
  const apseRoof = new THREE.Mesh(
    new THREE.ConeGeometry(5.8, 2.5, 32),
    roofMaterial,
  );
  apseRoof.position.set(-20, 10.15, 10);
  apseRoof.scale.z = .65;
  apseRoof.name = "Interpreted apsidal roof, not a surviving elevation";
  apseRoof.castShadow = true;
  cathedral.add(apseRoof);
  const lancet = new THREE.Shape();
  lancet.moveTo(-.47,0);lancet.lineTo(.47,0);lancet.lineTo(.47,1.65);
  lancet.quadraticCurveTo(.45,2.15,0,2.52);
  lancet.quadraticCurveTo(-.45,2.15,-.47,1.65);lancet.closePath();
  const lancetGeometry=new THREE.ShapeGeometry(lancet,16);
  for(const side of [-1,1]) for(const z of [-12,-1,8]) {
    const bay=new THREE.Group();bay.position.set(-20+side*11.03,4.9,z);
    bay.rotation.y=side*Math.PI/2;cathedral.add(bay);
    const reveal=new THREE.Mesh(lancetGeometry,darkRecess);bay.add(reveal);
    for(const edge of [-1,1]) addBox({size:[.18,1.9,.27],position:[edge*.55,.9,.04],material:dressedStone,parent:bay,name:"Dressed lancet reveal"});
    addArch({radius:.48,thickness:.13,position:[0,1.78,.04],parent:bay,material:dressedStone,name:"Arched clerestory dressing"});
  }

  // Dense but navigable merchant quarters and vaulted market lanes.
  [
    [64, -48, 15, 13, 6.5], [44, -48, 15, 12, 7.5], [20, -48, 14, 12, 6],
    [70, -33, 14, 13, 8], [48, -33, 15, 11, 6.5], [26, -33, 13, 10, 7],
    [68, -7, 14, 12, 6], [48, -9, 14, 12, 8], [26, -8, 13, 11, 6],
    [72, 14, 13, 12, 7], [50, 13, 15, 12, 6], [28, 12, 13, 11, 7.5],
    [68, 33, 15, 11, 6], [46, 32, 13, 11, 7], [24, 31, 14, 12, 6.5],
    [5, 27, 12, 14, 6], [-13, 30, 13, 12, 7], [-36, 30, 15, 12, 6],
    [5, 50, 13, 12, 7], [-14, 51, 14, 12, 6], [-37, 52, 14, 11, 7],
    [-58, 13, 13, 12, 6], [-77, 9, 12, 14, 7], [-58, -9, 14, 13, 7],
    [-77, -13, 13, 12, 6], [-72, -35, 15, 13, 7], [-72, -54, 13, 10, 6],
  ].forEach(([x, z, w, d, h], index) =>
    addHouse({
      x,
      z,
      w,
      d,
      h,
      roof: index % 4 !== 0,
      name: index < 8 ? "Venetian merchant house" : index < 20 ? "Pisan merchant house" : "Frankish townhouse",
    }),
  );

  // Covered Genoese market street.
  for (let z = -19; z <= 18; z += 6.5) {
    for (const x of [5, 13]) {
      addCylinder({ radius: 0.48, height: 3.6, position: [x, 1.8, z], material: paleStone, segments: 10, name: "Market arcade column", collider: true });
    }
    addArch({
      radius: 3.45,
      thickness: 0.42,
      position: [9, 3.2, z],
      material: paleStone,
      name: "Genoese market arch",
    });
  }
  const marketRoofParts = [];
  for (let board = 0; board < 21; board += 1) {
    const boardZ = (board - 10) * 1.95;
    const topSurface = new THREE.PlaneGeometry(10, 1.82);
    topSurface.rotateX(-Math.PI / 2);
    topSurface.translate(0, 0.125, boardZ);
    marketRoofParts.push(topSurface);
    const bottomSurface = new THREE.PlaneGeometry(10, 1.82);
    bottomSurface.rotateX(Math.PI / 2);
    bottomSurface.translate(0, -0.125, boardZ);
    marketRoofParts.push(bottomSurface);
  }
  const marketRoofGeometry = mergeGeometries(marketRoofParts, false);
  marketRoofParts.forEach((surface) => surface.dispose());
  const marketRoof = new THREE.Mesh(marketRoofGeometry, timber);
  marketRoof.position.set(9, 6.62, -0.5);
  marketRoof.name = "Twenty-one separated two-sided Genoese market roof boards";
  root.add(marketRoof);
  objectRenderBudget.marketRoof.instances = 1;
  objectRenderBudget.marketRoof.boardPlanks = 21;
  objectRenderBudget.marketRoof.visibleSurfaces = 42;
  objectRenderBudget.marketRoof.staticTriangles = geometryTriangles(
    marketRoofGeometry,
  );

  // Templar fortress at the south-western edge.
  const templar = new THREE.Group();
  templar.name = "Templar fortress";
  root.add(templar);
  addBox({ size: [34, 10, 27], position: [-78, 5, 58], material: oldStone, collider: true, parent: templar });
  addCrenellations("x", -93, -63, 44.8, 10.7, templar);
  addCrenellations("x", -93, -63, 71.2, 10.7, templar);
  addCrenellations("z", 48, 68, -95.2, 10.7, templar);
  addCrenellations("z", 48, 68, -60.8, 10.7, templar);
  [[-93, 46], [-63, 46], [-93, 70], [-63, 70]].forEach(([x, z]) =>
    addTower(x, z, 5.2, 12, "Templar fortress tower"),
  );
  const templarGateRecessGeometry = new THREE.PlaneGeometry(5.4, 6.6);
  templarGateRecessGeometry.rotateY(Math.PI / 2);
  const templarGateRecess = new THREE.Mesh(
    templarGateRecessGeometry,
    darkRecess,
  );
  templarGateRecess.position.set(-60.88, 3.3, 58);
  templarGateRecess.name = "Deep recessed Templar fortress gateway";
  templar.add(templarGateRecess);
  objectRenderBudget.gateDetails.templarGateRecesses = 1;
  objectRenderBudget.gateDetails.staticTriangles += geometryTriangles(
    templarGateRecessGeometry,
  );

  const portcullisParts = [];
  for (let upright = 0; upright < 7; upright += 1) {
    const bar = new THREE.PlaneGeometry(0.12, 5.9);
    bar.rotateY(Math.PI / 2);
    bar.translate(-60.76, 3.25, 58 + (upright - 3) * 0.75);
    portcullisParts.push(bar);
  }
  for (const crossrailY of [1.5, 3.2, 4.9]) {
    const bar = new THREE.PlaneGeometry(4.9, 0.12);
    bar.rotateY(Math.PI / 2);
    bar.translate(-60.75, crossrailY, 58);
    portcullisParts.push(bar);
  }
  const portcullisGeometry = mergeGeometries(portcullisParts, false);
  portcullisParts.forEach((bar) => bar.dispose());
  const portcullis = new THREE.Mesh(portcullisGeometry, agedIron);
  portcullis.name = "Forged ten-bar Templar fortress portcullis";
  templar.add(portcullis);
  objectRenderBudget.gateDetails.portcullisUprights = 7;
  objectRenderBudget.gateDetails.portcullisCrossrails = 3;
  objectRenderBudget.gateDetails.staticTriangles += geometryTriangles(
    portcullisGeometry,
  );
  addArch({
    radius: 3.05,
    thickness: 0.5,
    position: [-60.72, 4.1, 58],
    material: paleStone,
    rotationY: Math.PI / 2,
    parent: templar,
    name: "Templar gate arch",
  });

  // The strategic Templar passage ran west-to-east from the sea fortress,
  // beneath the Pisan quarter, toward the port. It is compressed to 95 metres
  // here while retaining its bedrock base and half-barrel cut-stone vault.
  const tunnelFloorY = -5.25;
  const tunnelStartX = -57;
  const tunnelEndX = 38;
  const tunnelLength = tunnelEndX - tunnelStartX;
  const tunnelCenterX = (tunnelStartX + tunnelEndX) / 2;
  const tunnelCenterZ = 50;
  const tunnelStone = new THREE.MeshStandardMaterial({
    color: 0x81755f,
    map: stoneTexture,
    normalMap: stoneNormal,
    normalScale: new THREE.Vector2(0.68, 0.68),
    roughnessMap: stoneRough,
    roughness: 0.9,
  });
  tunnelStone.userData.worldTextureScale = 2;
  const vaultStone = tunnelStone.clone();
  vaultStone.map = stoneTexture.clone();
  vaultStone.normalMap = stoneNormal.clone();
  vaultStone.roughnessMap = stoneRough.clone();
  [vaultStone.map, vaultStone.normalMap, vaultStone.roughnessMap].forEach((texture) => {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 34);
  });
  vaultStone.side = THREE.BackSide;
  const tunnelWater = new THREE.MeshPhysicalMaterial({
    color: 0x20474b,
    roughness: 0.24,
    metalness: 0.05,
    transmission: 0.08,
    transparent: true,
    opacity: 0.72,
  });

  addBox({
    size: [tunnelLength, 0.25, 4.25],
    position: [tunnelCenterX, tunnelFloorY - 0.125, tunnelCenterZ],
    material: cobbles,
    name: "Templar tunnel bedrock floor",
  });
  addBox({
    size: [tunnelLength - 2, 0.035, 0.52],
    position: [tunnelCenterX, tunnelFloorY + 0.025, tunnelCenterZ],
    material: tunnelWater,
    shadows: false,
    name: "Templar tunnel drainage channel",
  });
  for (const z of [47.72, 52.28]) {
    addBox({
      size: [tunnelLength, 1.45, 0.62],
      position: [tunnelCenterX, -4.525, z],
      material: tunnelStone,
      collider: true,
      name: "Templar tunnel bedrock wall",
    });
  }

  const vaultGeometry = new THREE.CylinderGeometry(
    2.3,
    2.3,
    tunnelLength,
    28,
    24,
    true,
    0,
    Math.PI,
  );
  vaultGeometry.rotateZ(Math.PI / 2);
  const vault = new THREE.Mesh(vaultGeometry, vaultStone);
  vault.position.set(tunnelCenterX, -4.0, tunnelCenterZ);
  vault.castShadow = vault.receiveShadow = true;
  vault.name = "Templar tunnel half-barrel vault";
  root.add(vault);
  addCollider([tunnelLength, 0.5, 5.2], [tunnelCenterX, -1.55, tunnelCenterZ]);

  for (let x = tunnelStartX + 4; x < tunnelEndX - 3; x += 8) {
    addArch({
      radius: 2.08,
      thickness: 0.16,
      position: [x, -4.0, tunnelCenterZ],
      material: paleStone,
      rotationY: Math.PI / 2,
      name: "Templar tunnel vault rib",
    });
  }
  for (const x of [tunnelStartX - 0.3, tunnelEndX + 0.3]) {
    addBox({
      size: [0.62, 3.7, 5.05],
      position: [x, -3.55, tunnelCenterZ],
      material: tunnelStone,
      collider: true,
      name: "Templar tunnel sealed stair wall",
    });
  }

  const tunnelLampPlateGeometry = new THREE.BoxGeometry(0.22, 0.3, 0.06);
  const tunnelLampArmGeometry = new THREE.CylinderGeometry(0.025, 0.035, 0.72, 5);
  const tunnelLampBowlGeometry = new THREE.SphereGeometry(
    0.19,
    10,
    5,
    0,
    Math.PI * 2,
    Math.PI / 2,
    Math.PI / 2,
  );
  const tunnelLampRimGeometry = new THREE.TorusGeometry(0.19, 0.022, 4, 10);
  const tunnelLampSpoutGeometry = new THREE.CylinderGeometry(0.055, 0.11, 0.28, 6);
  const tunnelLampHandleGeometry = new THREE.TorusGeometry(0.14, 0.017, 4, 8, Math.PI);
  const tunnelLampWickGeometry = new THREE.CylinderGeometry(0.022, 0.03, 0.12, 5);
  const addTunnelLamp = (x, side) => {
    const z = tunnelCenterZ + side * 1.82;
    objectRenderBudget.tunnelLamps.instances += 1;
    const wallPlate = new THREE.Mesh(tunnelLampPlateGeometry, bronze);
    wallPlate.position.set(x, -3.5, tunnelCenterZ + side * 2.38);
    wallPlate.name = "Hammered tunnel-lamp wall plate";
    root.add(wallPlate);
    objectRenderBudget.tunnelLamps.wallPlates += 1;
    objectRenderBudget.tunnelLamps.staticTriangles += geometryTriangles(tunnelLampPlateGeometry);
    const bracketArm = new THREE.Mesh(tunnelLampArmGeometry, bronze);
    bracketArm.position.set(x, -3.48, tunnelCenterZ + side * 2.03);
    bracketArm.rotation.x = side * Math.PI / 2;
    bracketArm.name = "Forged tunnel-lamp bracket arm";
    root.add(bracketArm);
    objectRenderBudget.tunnelLamps.bracketArms += 1;
    objectRenderBudget.tunnelLamps.staticTriangles += geometryTriangles(tunnelLampArmGeometry);
    const bowl = new THREE.Mesh(tunnelLampBowlGeometry, bronze);
    bowl.position.set(x, -3.35, z);
    bowl.name = "Shallow hammered tunnel oil-lamp bowl";
    root.add(bowl);
    objectRenderBudget.tunnelLamps.bowls += 1;
    objectRenderBudget.tunnelLamps.staticTriangles += geometryTriangles(tunnelLampBowlGeometry);
    const rim = new THREE.Mesh(tunnelLampRimGeometry, bronze);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(x, -3.27, z);
    rim.name = "Tunnel lamp rim";
    root.add(rim);
    objectRenderBudget.tunnelLamps.staticTriangles += geometryTriangles(tunnelLampRimGeometry);
    const spout = new THREE.Mesh(tunnelLampSpoutGeometry, bronze);
    spout.position.set(x, -3.31, tunnelCenterZ + side * 1.7);
    spout.rotation.x = side * -Math.PI / 2;
    spout.scale.z = 0.72;
    spout.name = "Pinched tunnel-lamp wick spout";
    root.add(spout);
    objectRenderBudget.tunnelLamps.spouts += 1;
    objectRenderBudget.tunnelLamps.staticTriangles += geometryTriangles(tunnelLampSpoutGeometry);
    const handle = new THREE.Mesh(tunnelLampHandleGeometry, bronze);
    handle.position.set(x, -3.27, tunnelCenterZ + side * 1.88);
    handle.rotation.y = Math.PI / 2;
    handle.rotation.z = side > 0 ? 0 : Math.PI;
    handle.name = "Looped tunnel-lamp handle";
    root.add(handle);
    objectRenderBudget.tunnelLamps.handles += 1;
    objectRenderBudget.tunnelLamps.staticTriangles += geometryTriangles(tunnelLampHandleGeometry);
    const wick = new THREE.Mesh(tunnelLampWickGeometry, darkTimber);
    wick.position.set(x, -3.2, tunnelCenterZ + side * 1.63);
    wick.name = "Charred tunnel-lamp wick";
    root.add(wick);
    objectRenderBudget.tunnelLamps.wicks += 1;
    objectRenderBudget.tunnelLamps.staticTriangles += geometryTriangles(tunnelLampWickGeometry);
    const flame = new THREE.Sprite(flameSpriteMaterial);
    flame.position.set(x, -3.03, tunnelCenterZ + side * 1.63);
    flame.scale.set(0.42, 0.62, 1);
    flame.userData.dynamic = true;
    root.add(flame);
    const light = new THREE.PointLight(0xff9a42, 7.5, 9, 2);
    light.position.set(x, -3.03, tunnelCenterZ + side * 1.63);
    root.add(light);
    objectRenderBudget.tunnelLamps.pointLights += 1;
    flame.userData.animate = (time) => {
      const flicker = 0.86 + Math.sin(time * 10.5 + x) * 0.14;
      flame.scale.set(0.4 + flicker * 0.05, 0.55 + flicker * 0.12, 1);
      light.intensity = 5.8 + flicker * 2.4;
    };
    animated.push(flame);
  };
  for (let x = tunnelStartX + 7, lamp = 0; x < tunnelEndX - 4; x += 13, lamp += 1) {
    addTunnelLamp(x, lamp % 2 ? -1 : 1);
  }

  // Port stairhouse: a discreet stone entry beside the harbour approach.
  const stairhouse = new THREE.Group();
  stairhouse.name = "Templar tunnel port stairhouse";
  root.add(stairhouse);
  addBox({ size: [5.4, 3.5, 0.55], position: [33.1, 1.75, 47.25], material: oldStone, collider: true, parent: stairhouse });
  addBox({ size: [5.4, 3.5, 0.55], position: [33.1, 1.75, 52.75], material: oldStone, collider: true, parent: stairhouse });
  addBox({ size: [0.55, 3.5, 6.05], position: [30.4, 1.75, 50], material: oldStone, collider: true, parent: stairhouse });
  addBox({ size: [5.4, 0.48, 6.05], position: [33.1, 3.48, 50], material: paleStone, parent: stairhouse });
  for (const z of [48.85, 51.15]) {
    addBox({ size: [0.55, 3.5, 1.75], position: [35.8, 1.75, z], material: oldStone, collider: true, parent: stairhouse });
  }
  addBox({
    size: [0.1, 2.85, 2.45],
    position: [36.1, 1.43, 50],
    material: darkRecess,
    parent: stairhouse,
    shadows: false,
    name: "Tunnel stair darkness",
  });
  addArch({
    radius: 1.28,
    thickness: 0.24,
    position: [36.13, 2.72, 50],
    material: paleStone,
    rotationY: Math.PI / 2,
    parent: stairhouse,
    name: "Port stair arch",
  });

  const tunnel = {
    floorY: tunnelFloorY,
    portals: [
      {
        id: "fortress",
        surface: new THREE.Vector3(-59, 0, 58),
        underground: new THREE.Vector3(-54.6, tunnelFloorY, 50),
        enterYaw: -Math.PI / 2,
        exitYaw: Math.PI / 2,
      },
      {
        id: "port",
        surface: new THREE.Vector3(37.1, 0, 50),
        underground: new THREE.Vector3(35.2, tunnelFloorY, 50),
        enterYaw: Math.PI / 2,
        exitYaw: -Math.PI / 2,
      },
    ],
  };

  // Inner harbour, stone quays, mole, and the extraction skiff.
  // Visible quay masonry supplies collision. The sea itself is swimmable.
  const addQuaySpan = ([startX, startZ], [endX, endZ], width, height, name) => {
    const deltaX = endX - startX;
    const deltaZ = endZ - startZ;
    const length = Math.hypot(deltaX, deltaZ);
    const angle = Math.atan2(deltaZ, deltaX);
    const quay = addBox({
      size: [length + 0.2, height, width],
      position: [(startX + endX) / 2, height / 2 - 0.52, (startZ + endZ) / 2],
      material: oldStone,
      name,
    });
    quay.rotation.y = -angle;
    const colliderRuns = Math.max(1, Math.ceil(length / 4.5));
    for (let run = 0; run < colliderRuns; run += 1) {
      const t = (run + 0.5) / colliderRuns;
      const runLength = length / colliderRuns;
      addCollider(
        [
          Math.abs(Math.cos(angle)) * runLength + Math.abs(Math.sin(angle)) * width,
          height,
          Math.abs(Math.sin(angle)) * runLength + Math.abs(Math.cos(angle)) * width,
        ],
        [startX + deltaX * t, height / 2 - 0.52, startZ + deltaZ * t],
      );
    }
  };
  addQuaySpan([42, 43], [74, 42], 3, 1.65, "Northern inner-harbour quay");
  addQuaySpan([42, 43], [40.85, 58.4], 3, 1.65, "Western inner-harbour quay");
  addQuaySpan([40.15, 68.7], [40, 70], 3, 1.65, "Western inner-harbour quay");
  addBox({
    size: [24, 0.5, 5.55],
    position: [42, 0.25, 64],
    material: darkTimber,
    name: "Harbour jetty substructure",
  });
  for (let plank = -11.4, index = 0; plank <= 11.4; plank += 0.95, index += 1) {
    const deckPlank = addBox({
      size: [0.88, 0.14, 5.82],
      position: [42 + plank, 0.57 + (index % 4 === 0 ? 0.018 : 0), 64],
      material: index % 5 === 0 ? darkTimber : timber,
      shadows: false,
      name: "Individual jetty deck plank",
    });
    deckPlank.rotation.y = (index % 3 - 1) * 0.002;
  }
  const mooringPostGeometry = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.17, -0.75),
      new THREE.Vector2(0.16, 0.45),
      new THREE.Vector2(0.19, 0.53),
      new THREE.Vector2(0.15, 0.65),
      new THREE.Vector2(0.11, 0.78),
      new THREE.Vector2(0, 0.88),
    ],
    7,
  );
  const mooringCoilGeometry = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.21, 0.68, 0),
      new THREE.Vector3(0, 0.72, 0.21),
      new THREE.Vector3(-0.21, 0.68, 0),
      new THREE.Vector3(0, 0.64, -0.21),
      new THREE.Vector3(0.21, 0.6, 0),
    ]),
    5,
    0.026,
    3,
    false,
  );
  const mooringTailGeometry = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.21, 0.6, 0),
      new THREE.Vector3(0.32, 0.54, 0.1),
      new THREE.Vector3(0.46, 0.52, 0.23),
    ]),
    3,
    0.026,
    3,
    false,
  );
  for (const postX of [31.2, 42, 52.8]) {
    for (const postZ of [61.3, 66.7]) {
      const post = new THREE.Mesh(mooringPostGeometry, darkTimber);
      post.position.set(postX, 0.12, postZ);
      post.castShadow = post.receiveShadow = true;
      post.name = "Hewn mooring post with wear collar and chamfered cap";
      root.add(post);
      objectRenderBudget.mooringFixtures.posts += 1;
      objectRenderBudget.mooringFixtures.staticTriangles += (
        geometryTriangles(mooringPostGeometry)
      );
      if (postZ === 61.3) {
        const coil = new THREE.Mesh(mooringCoilGeometry, ropeMaterial);
        coil.position.set(postX, 0.12, postZ);
        coil.rotation.y = (postX - 42) * 0.035;
        coil.name = "Working rope coil around mooring post";
        root.add(coil);
        objectRenderBudget.mooringFixtures.ropeCoils += 1;
        objectRenderBudget.mooringFixtures.staticTriangles += (
          geometryTriangles(mooringCoilGeometry)
        );
        const tail = new THREE.Mesh(mooringTailGeometry, ropeMaterial);
        tail.position.copy(coil.position);
        tail.rotation.copy(coil.rotation);
        tail.name = "Loose mooring-rope tail resting on jetty";
        root.add(tail);
        objectRenderBudget.mooringFixtures.looseTails += 1;
        objectRenderBudget.mooringFixtures.staticTriangles += (
          geometryTriangles(mooringTailGeometry)
        );
      }
    }
  }
  for (let index = 1; index < ACRE_PLAN.harbour.southernBreakwater.length; index += 1) {
    addQuaySpan(
      ACRE_PLAN.harbour.southernBreakwater[index - 1],
      ACRE_PLAN.harbour.southernBreakwater[index],
      4,
      2.2,
      "Southern harbour breakwater",
    );
  }
  for (let index = 1; index < ACRE_PLAN.harbour.easternBreakwater.length; index += 1) {
    addQuaySpan(
      ACRE_PLAN.harbour.easternBreakwater[index - 1],
      ACRE_PLAN.harbour.easternBreakwater[index],
      4,
      2.2,
      "Eastern harbour breakwater",
    );
  }
  addTower(
    ACRE_PLAN.harbour.towerOfFlies[0],
    ACRE_PLAN.harbour.towerOfFlies[1],
    5.6,
    10,
    "Tower of the Flies",
  );
  const [chainStart, chainEnd] = ACRE_PLAN.harbour.chain;
  const harbourChainGeometry = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(chainStart[0], 1.1, chainStart[1]),
      new THREE.Vector3(
        (chainStart[0] + chainEnd[0]) / 2,
        0.28,
        (chainStart[1] + chainEnd[1]) / 2,
      ),
      new THREE.Vector3(chainEnd[0], 1.25, chainEnd[1]),
    ]),
    22,
    0.09,
    5,
    false,
  );
  const harbourChain = new THREE.Mesh(harbourChainGeometry, agedIron);
  harbourChain.name = "Sagging Constantinople harbour chain";
  harbourChain.castShadow = true;
  root.add(harbourChain);

  const craneDrumGeometry = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.44, -0.81),
      new THREE.Vector2(0.35, -0.69),
      new THREE.Vector2(0.35, 0.69),
      new THREE.Vector2(0.44, 0.81),
    ],
    8,
  );
  const craneAxleGeometry = new THREE.CylinderGeometry(0.07, 0.07, 2.35, 6);
  const craneWindingRimGeometry = new THREE.TorusGeometry(0.62, 0.055, 3, 10);
  const craneWindingSpokeGeometry = mergeGeometries([
    new THREE.PlaneGeometry(0.06, 0.52).rotateY(Math.PI / 2),
    new THREE.PlaneGeometry(0.06, 0.52).rotateY(-Math.PI / 2),
  ], false);
  const craneWindingHubGeometry = new THREE.CylinderGeometry(0.11, 0.13, 0.22, 6);
  const cranePulleyGeometry = new THREE.CylinderGeometry(0.22, 0.22, 0.1, 8);
  const cranePulleyGrooveGeometry = new THREE.TorusGeometry(0.22, 0.025, 3, 8);
  const cranePulleyPinGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.38, 4);
  const craneRunningRopeGeometry = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 2.75, 0.35),
      new THREE.Vector3(0, 4.55, 1.1),
      new THREE.Vector3(0, 4.55, 3.2),
      new THREE.Vector3(0, 4.34, 4.34),
    ]),
    5,
    0.026,
    3,
    false,
  );
  const craneLiftingRopeGeometry = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 4.34, 4.34),
      new THREE.Vector3(0.025, 3.05, 4.37),
      new THREE.Vector3(0, 1.66, 4.4),
    ]),
    4,
    0.026,
    3,
    false,
  );
  const craneCargoGeometry = new THREE.BoxGeometry(1.1, 0.9, 0.9, 2, 2, 2);
  const craneCargoPositions = craneCargoGeometry.attributes.position;
  for (let vertex = 0; vertex < craneCargoPositions.count; vertex += 1) {
    const px = craneCargoPositions.getX(vertex);
    const py = craneCargoPositions.getY(vertex);
    const pz = craneCargoPositions.getZ(vertex);
    const nx = Math.abs(px) / 0.55;
    const ny = Math.abs(py) / 0.45;
    const nz = Math.abs(pz) / 0.45;
    craneCargoPositions.setXYZ(
      vertex,
      px * (1 - ny * nz * 0.065),
      py - (1 - nx) * (1 - nz) * 0.035,
      pz * (1 - nx * ny * 0.055),
    );
  }
  craneCargoGeometry.computeVertexNormals();
  const craneSlingGeometries = [
    [-1, -1], [-1, 1], [1, -1], [1, 1],
  ].map(([sideX, sideZ]) => (
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(sideX * 0.48, 1.18, 4.4 + sideZ * 0.36),
        new THREE.Vector3(sideX * 0.28, 1.38, 4.4 + sideZ * 0.2),
        new THREE.Vector3(0, 1.55, 4.4),
      ]),
      2,
      0.024,
      3,
      false,
    )
  ));
  const craneHookGeometry = new THREE.TorusGeometry(
    0.12,
    0.025,
    3,
    8,
    Math.PI * 1.5,
  );

  const addHarbourCrane = (x, z, rotation = 0) => {
    const crane = new THREE.Group();
    crane.position.set(x, 0.25, z);
    crane.rotation.y = rotation;
    crane.name = "Working timber quay crane";
    root.add(crane);
    objectRenderBudget.harbourCranes.instances += 1;
    const trackCraneMesh = (mesh, counter) => {
      objectRenderBudget.harbourCranes[counter] += 1;
      objectRenderBudget.harbourCranes.staticTriangles += geometryTriangles(mesh.geometry);
      return mesh;
    };
    const addCraneBox = (options, counter) => (
      trackCraneMesh(addBox(options), counter)
    );
    for (const side of [-1, 1]) {
      const leg = addCraneBox({
        size: [0.26, 4.8, 0.3],
        position: [side * 1.05, 2.35, 0],
        material: timber,
        parent: crane,
        name: "Splayed mortised crane trestle leg",
      }, "trestleLegs");
      leg.rotation.z = side * -0.18;
    }
    const boom = addCraneBox({
      size: [0.32, 0.34, 5.7],
      position: [0, 4.45, 1.65],
      material: timber,
      parent: crane,
      name: "Long timber lifting boom",
    }, "booms");
    boom.rotation.x = -0.08;
    addCraneBox({
      size: [2.7, 0.26, 0.32],
      position: [0, 4.25, 0],
      material: timber,
      parent: crane,
      name: "Mortised crane head beam",
    }, "headBeams");
    for (const direction of [-1, 1]) {
      const brace = addCraneBox({
        size: [0.18, 3.25, 0.2],
        position: [0, 2.35, 0.02],
        material: darkTimber,
        parent: crane,
        shadows: false,
        name: "Cross-braced crane trestle",
      }, "braces");
      brace.rotation.z = direction * 0.72;
    }
    const drum = new THREE.Mesh(craneDrumGeometry, darkTimber);
    drum.position.set(0, 2.62, 0.28);
    drum.rotation.z = Math.PI / 2;
    drum.name = "Flanged timber crane rope drum";
    crane.add(drum);
    trackCraneMesh(drum, "drums");
    const axle = new THREE.Mesh(craneAxleGeometry, agedIron);
    axle.position.copy(drum.position);
    axle.rotation.z = Math.PI / 2;
    axle.name = "Forged crane drum axle";
    crane.add(axle);
    trackCraneMesh(axle, "axles");

    const windingWheel = new THREE.Mesh(craneWindingRimGeometry, darkTimber);
    windingWheel.position.set(1.18, 2.62, 0.28);
    windingWheel.rotation.y = Math.PI / 2;
    windingWheel.name = "Felloed crane winding-wheel rim";
    crane.add(windingWheel);
    trackCraneMesh(windingWheel, "windingRims");
    for (let spoke = 0; spoke < 6; spoke += 1) {
      const angle = spoke * Math.PI / 3;
      const spokeMesh = new THREE.Mesh(craneWindingSpokeGeometry, darkTimber);
      spokeMesh.position.set(
        1.18,
        2.62 + Math.cos(angle) * 0.32,
        0.28 + Math.sin(angle) * 0.32,
      );
      spokeMesh.rotation.x = angle;
      spokeMesh.name = "Mortised winding-wheel spoke";
      crane.add(spokeMesh);
      trackCraneMesh(spokeMesh, "windingSpokes");
    }
    const windingHub = new THREE.Mesh(craneWindingHubGeometry, darkTimber);
    windingHub.position.copy(windingWheel.position);
    windingHub.rotation.z = Math.PI / 2;
    windingHub.name = "Heavy winding-wheel nave";
    crane.add(windingHub);
    trackCraneMesh(windingHub, "windingHubs");

    for (const side of [-1, 1]) {
      addCraneBox({
        size: [0.08, 0.56, 0.18],
        position: [side * 0.13, 4.34, 4.34],
        material: agedIron,
        parent: crane,
        shadows: false,
        name: "Forged crane-pulley cheek",
      }, "pulleyCheeks");
    }
    const pulley = new THREE.Mesh(cranePulleyGeometry, darkTimber);
    pulley.position.set(0, 4.34, 4.34);
    pulley.rotation.z = Math.PI / 2;
    pulley.name = "Solid timber crane pulley wheel";
    crane.add(pulley);
    trackCraneMesh(pulley, "pulleyWheels");
    const pulleyGroove = new THREE.Mesh(cranePulleyGrooveGeometry, agedIron);
    pulleyGroove.position.copy(pulley.position);
    pulleyGroove.rotation.y = Math.PI / 2;
    pulleyGroove.name = "Iron pulley wear groove";
    crane.add(pulleyGroove);
    trackCraneMesh(pulleyGroove, "pulleyGrooves");
    const pulleyPin = new THREE.Mesh(cranePulleyPinGeometry, agedIron);
    pulleyPin.position.copy(pulley.position);
    pulleyPin.rotation.z = Math.PI / 2;
    pulleyPin.name = "Forged pulley pin";
    crane.add(pulleyPin);
    trackCraneMesh(pulleyPin, "pulleyPins");

    const runningRope = new THREE.Mesh(craneRunningRopeGeometry, ropeMaterial);
    runningRope.name = "Rope led from drum along crane boom";
    crane.add(runningRope);
    trackCraneMesh(runningRope, "runningRopes");
    const liftingRope = new THREE.Mesh(craneLiftingRopeGeometry, ropeMaterial);
    liftingRope.name = "Weight-tensioned crane lifting rope";
    crane.add(liftingRope);
    trackCraneMesh(liftingRope, "liftingRopes");

    const cargo = new THREE.Mesh(craneCargoGeometry, craneCargoMaterial);
    cargo.position.set(0, 0.82, 4.4);
    cargo.castShadow = true;
    cargo.name = "Soft-cornered suspended cloth bale";
    crane.add(cargo);
    trackCraneMesh(cargo, "cargoBales");
    craneSlingGeometries.forEach((geometry) => {
      const sling = new THREE.Mesh(geometry, ropeMaterial);
      sling.name = "Four-leg cargo lifting sling";
      crane.add(sling);
      trackCraneMesh(sling, "slingLegs");
    });
    const hook = new THREE.Mesh(craneHookGeometry, agedIron);
    hook.position.set(0, 1.59, 4.4);
    hook.rotation.y = Math.PI / 2;
    hook.name = "Open forged crane hook";
    crane.add(hook);
    trackCraneMesh(hook, "hooks");
  };
  addHarbourCrane(46, 52, 0);
  addHarbourCrane(84, 44, Math.PI / 2);

  function createHullGeometry(length, width, depth) {
    return merchantHull(length, width, depth);
  }

  const createLateenSailGeometry = (subdivisions = 24) => {
    const a = new THREE.Vector3(-2.2, 2.6, 0);
    const b = new THREE.Vector3(2.2, 1.15, 0);
    const c = new THREE.Vector3(-1.65, -2.5, 0);
    const positions = [];
    const uvs = [];
    const indexOf = new Map();
    for (let i = 0; i <= subdivisions; i += 1) {
      for (let j = 0; j <= subdivisions - i; j += 1) {
        const u = i / subdivisions;
        const v = j / subdivisions;
        const point = a.clone()
          .multiplyScalar(1 - u - v)
          .addScaledVector(b, u)
          .addScaledVector(c, v);
        point.z = Math.sin(Math.PI * u) * Math.sin(Math.PI * v) * 0.52 + Math.sin(v * 40) * Math.sin(Math.PI * u) * .012;
        indexOf.set(`${i},${j}`, positions.length / 3);
        positions.push(point.x, point.y, point.z);
        uvs.push(u, 1 - v);
      }
    }
    const indices = [];
    for (let i = 0; i < subdivisions; i += 1) {
      for (let j = 0; j < subdivisions - i; j += 1) {
        indices.push(
          indexOf.get(`${i},${j}`),
          indexOf.get(`${i + 1},${j}`),
          indexOf.get(`${i},${j + 1}`),
        );
        if (i + j <= subdivisions - 2) {
          indices.push(
            indexOf.get(`${i + 1},${j}`),
            indexOf.get(`${i + 1},${j + 1}`),
            indexOf.get(`${i},${j + 1}`),
          );
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  };

  const mergeVesselParts = (parts) => mergeGeometries(
    parts.map(({ geometry, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1] }) => {
      const transformed = geometry.clone();
      transformed.applyMatrix4(
        new THREE.Matrix4().compose(
          new THREE.Vector3(...position),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
          new THREE.Vector3(...scale),
        ),
      );
      return transformed;
    }),
    false,
  );

  const merchantTimberGeometry = mergeVesselParts([
    { geometry: vesselDetailParts() },
    {
      geometry: createHullGeometry(),
      position: [0, 0.52, 0],
    },
    {
      geometry: new THREE.CylinderGeometry(0.1, 0.14, 8, 8),
      position: [0, 4, 0],
    },
    {
      geometry: new THREE.CylinderGeometry(0.07, 0.09, 5, 8),
      position: [0, 6.22, 0],
      rotation: [0, Math.PI / 2, Math.PI / 2 - 0.32],
    },
    ...[-1, 1].map((side) => ({
      geometry: new THREE.BoxGeometry(0.12, 0.17, 5.9),
      position: [side * 1.44, 0.74, 0.35],
    })),
    ...[-1.7, 0.25, 2.25].map((z) => ({
      geometry: new THREE.BoxGeometry(2.82, 0.11, 0.22),
      position: [0, 0.67, z],
    })),
    {
      geometry: new THREE.CylinderGeometry(0.08, 0.11, 1.28, 7),
      position: [0, 1.05, -3.72],
      rotation: [0.16, 0, 0],
    },
    {
      geometry: new THREE.CylinderGeometry(0.08, 0.11, 1.2, 7),
      position: [0, 1.02, 3.7],
      rotation: [-0.14, 0, 0],
    },
    {
      geometry: new THREE.CylinderGeometry(0.04, 0.055, 3.15, 7),
      position: [1.43, 1.18, 1.75],
      rotation: [1.03, 0, 0.14],
    },
  ]);
  const merchantDeckGeometry = mergeVesselParts([
    {
      geometry: new THREE.BoxGeometry(2.45, 0.16, 5.2),
      position: [0, 0.48, 0.7],
    },
    {
      geometry: new THREE.BoxGeometry(1.08, 0.16, 0.88),
      position: [0, 0.64, 1.28],
    },
    {
      geometry: new THREE.BoxGeometry(2.18, 0.13, 1.1),
      position: [0, 0.62, 2.72],
    },
  ]);
  const extractionSkiffGeometry = mergeVesselParts([
    {
      geometry: createHullGeometry(4.4, 1.8, 0.7),
      position: [0, 0.3, 0],
    },
    ...[-0.9, 0.2, 1.2].map((z) => ({
      geometry: new THREE.BoxGeometry(1.45, 0.12, 0.24),
      position: [0, 0.46, z],
    })),
    ...[-1, 1].map((side) => ({
      geometry: new THREE.BoxGeometry(0.08, 0.13, 3.55),
      position: [side * 0.72, 0.53, 0.12],
    })),
    {
      geometry: new THREE.CylinderGeometry(0.03, 0.045, 2.65, 6),
      position: [-0.77, 0.7, 0.78],
      rotation: [1.04, 0, 0.16],
    },
  ]);
  const merchantSailGeometry = createLateenSailGeometry();
  const merchantRiggingGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 7.8, 0),
    new THREE.Vector3(-1.4, 0.7, 3.3),
    new THREE.Vector3(0, 7.8, 0),
    new THREE.Vector3(1.4, 0.7, 3.3),
    new THREE.Vector3(0, 7.8, 0),
    new THREE.Vector3(-1.4, 0.7, -3.25),
    new THREE.Vector3(0, 7.8, 0),
    new THREE.Vector3(1.4, 0.7, -3.25),
    new THREE.Vector3(0, 7.8, 0),
    new THREE.Vector3(0, 0.7, -3.82),
    new THREE.Vector3(0, 7.8, 0),
    new THREE.Vector3(0, 0.7, 3.72),
    new THREE.Vector3(0, 6.95, 2.2),
    new THREE.Vector3(0, 0.78, -3.45),
    new THREE.Vector3(0, 5.5, -2.2),
    new THREE.Vector3(0, 0.78, 3.38),
  ]);

  const riggingPoints = merchantRiggingGeometry.attributes.position;
  const ropeParts=[];
  for(let i=0;i<riggingPoints.count;i+=2) {
    const a=new THREE.Vector3().fromBufferAttribute(riggingPoints,i), b=new THREE.Vector3().fromBufferAttribute(riggingPoints,i+1);
    ropeParts.push({geometry:new THREE.TubeGeometry(new THREE.LineCurve3(a,b),1,.016,5,false)});
  }
  const riggingRopes=combine(ropeParts);
  ropeParts.forEach(p=>p.geometry.dispose());
  merchantRiggingGeometry.dispose();
  const addBoat = (x, z, scale = 1, rotation = 0) => {
    const boat = new THREE.Group();
    boat.position.set(x, 0.15, z);
    boat.rotation.y = rotation;
    boat.scale.setScalar(scale);
    boat.name = "Mediterranean merchant vessel";
    root.add(boat);
    const timberStructure = new THREE.Mesh(merchantTimberGeometry, timber);
    timberStructure.castShadow = timberStructure.receiveShadow = true;
    timberStructure.name = "Merged hull, spars, rails, beams, and steering oar";
    boat.add(timberStructure);
    const deck = new THREE.Mesh(merchantDeckGeometry, darkTimber);
    deck.castShadow = true;
    deck.name = "Merged vessel deck, hatch, and stern platform";
    boat.add(deck);
    const canvas = new THREE.Mesh(merchantSailGeometry, sail);
    canvas.position.set(0, 4.35, 0);
    canvas.rotation.y = Math.PI / 2;
    canvas.castShadow = true;
    canvas.name = "Billowed stitched lateen sail";
    boat.add(canvas);
    const rigging = new THREE.Mesh(riggingRopes, ropeMaterial);
    rigging.name = "Standing and running rigging";
    boat.add(rigging);
    boat.userData.animate = (time) => {
      boat.rotation.z = Math.sin(time * 0.65 + x) * 0.018;
      boat.position.y = 0.12 + Math.sin(time * 0.8 + z) * 0.06;
    };
    animated.push(boat);
    return boat;
  };
  const merchantBoats = [
    addBoat(70, 64, 1.85, 0.08),
    addBoat(79, 48, 0.72, Math.PI / 2),
    addBoat(57, 73, 0.58, -0.25),
    addBoat(54, 55, 0.7, 0.42),
  ];

  // Extraction skiff, reachable from the wooden jetty.
  const skiff = new THREE.Group();
  skiff.position.set(55, 0.2, 64);
  skiff.rotation.y = Math.PI / 2;
  skiff.name = "Waiting skiff";
  root.add(skiff);
  const skiffHull = new THREE.Mesh(extractionSkiffGeometry, timber);
  skiffHull.castShadow = true;
  skiffHull.name = "Merged extraction skiff with thwarts, rails, and oar";
  skiff.add(skiffHull);
  skiff.userData.animate = (time) => {
    skiff.position.y = 0.18 + Math.sin(time * 1.1) * 0.05;
    skiff.rotation.z = Math.sin(time * 0.75) * 0.022;
  };
  animated.push(skiff);
  const measureMovingModel = (model) => {
    const budget = { draws: 0, triangles: 0, lineSegments: 0 };
    model.traverse((object) => {
      if (object.isMesh) {
        budget.draws += 1;
        budget.triangles += object.geometry.index
          ? object.geometry.index.count / 3
          : object.geometry.attributes.position.count / 3;
      } else if (object.isLineSegments) {
        budget.draws += 1;
        budget.lineSegments += object.geometry.attributes.position.count / 2;
      }
    });
    return budget;
  };
  const vesselRenderBudget = {
    merchantVessel: measureMovingModel(merchantBoats[0]),
    merchantInstances: merchantBoats.length,
    extractionSkiff: measureMovingModel(skiff),
  };

  // Market props, amphorae, olive trees, and linen awnings.
  const pottery = new THREE.MeshStandardMaterial({
    color: 0xd17d58,
    map: potteryTexture,
    bumpMap: potteryTexture,
    bumpScale: 0.022,
    roughness: 0.96,
  });
  const glazedPottery = new THREE.MeshStandardMaterial({color:0xe1c787, map:sgraffitoTexture(), roughness:.28, metalness:0});
  const eatingBowlClay = new THREE.MeshStandardMaterial({color:0xc8a888, map:potteryTexture, roughness:.9});
  const amphoraGeometry = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.03, -0.76),
      new THREE.Vector2(0.1, -0.7),
      new THREE.Vector2(0.2, -0.55),
      new THREE.Vector2(0.34, -0.28),
      new THREE.Vector2(0.38, 0.08),
      new THREE.Vector2(0.32, 0.31),
      new THREE.Vector2(0.25, 0.43),
      new THREE.Vector2(0.15, 0.54),
      new THREE.Vector2(0.13, 0.66),
      new THREE.Vector2(0.19, 0.7),
    ],
    32,
  );
  const amphoraHandleGeometries = [-1, 1].map((side) => (
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(side * 0.14, 0.61, 0),
          new THREE.Vector3(side * 0.28, 0.59, 0),
          new THREE.Vector3(side * 0.39, 0.49, 0),
          new THREE.Vector3(side * 0.38, 0.36, 0),
          new THREE.Vector3(side * 0.3, 0.29, 0),
        ],
        false,
        "centripetal",
      ),
      14,
      0.028,
      6,
      false,
    )
  ));
  const amphoraRimGeometry = new THREE.TorusGeometry(0.19, 0.028, 8, 32);
  const amphoraOpeningGeometry = new THREE.CircleGeometry(0.15, 32);
  const addAmphora = ({
    x,
    y,
    z,
    scale = 1,
    rotation = 0,
    parent = root,
    name = "Trade amphora",
  }) => {
    const jar = new THREE.Group();
    jar.position.set(x, y, z);
    jar.rotation.y = rotation;
    jar.scale.setScalar(scale);
    jar.name = name;
    parent.add(jar);
    objectRenderBudget.amphorae.instances += 1;

    const body = new THREE.Mesh(amphoraGeometry, pottery);
    body.castShadow = body.receiveShadow = true;
    body.name = `${name} pointed transport-vessel body`;
    jar.add(body);
    objectRenderBudget.amphorae.bodies += 1;
    objectRenderBudget.amphorae.staticTriangles += geometryTriangles(amphoraGeometry);

    const rim = new THREE.Mesh(amphoraRimGeometry, pottery);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.7;
    rim.name = `${name} wheel-thrown rolled rim`;
    jar.add(rim);
    objectRenderBudget.amphorae.rims += 1;
    objectRenderBudget.amphorae.staticTriangles += geometryTriangles(amphoraRimGeometry);

    amphoraHandleGeometries.forEach((geometry) => {
      const handle = new THREE.Mesh(geometry, pottery);
      handle.name = `${name} neck-to-shoulder handle`;
      jar.add(handle);
      objectRenderBudget.amphorae.handles += 1;
      objectRenderBudget.amphorae.staticTriangles += geometryTriangles(geometry);
    });

    const opening = new THREE.Mesh(amphoraOpeningGeometry, darkRecess);
    opening.rotation.x = -Math.PI / 2;
    opening.position.y = 0.703;
    opening.name = `${name} shadowed mouth`;
    jar.add(opening);
    objectRenderBudget.amphorae.openings += 1;
    objectRenderBudget.amphorae.staticTriangles += geometryTriangles(amphoraOpeningGeometry);
    return jar;
  };
  const registerMovableProp = (
    object,
    {
      kind,
      material,
      radius,
      height,
      fallThreshold,
      noise,
    },
  ) => {
    let sourceMeshes = 0;
    const batches = new Map();
    object.traverse((child) => {
      if (!child.isMesh || child.parent !== object || Array.isArray(child.material)) return;
      sourceMeshes += 1;
      child.updateMatrix();
      if (!batches.has(child.material.uuid)) {
        batches.set(child.material.uuid, {
          material: child.material,
          geometries: [],
          castShadow: false,
          receiveShadow: false,
        });
      }
      const batch = batches.get(child.material.uuid);
      const geometry = child.geometry.clone();
      geometry.applyMatrix4(child.matrix);
      batch.geometries.push(geometry);
      batch.castShadow ||= child.castShadow;
      batch.receiveShadow ||= child.receiveShadow;
    });
    [...object.children]
      .filter((child) => child.isMesh)
      .forEach((child) => child.removeFromParent());
    for (const batch of batches.values()) {
      const geometry = batch.geometries.length === 1
        ? batch.geometries[0]
        : mergeGeometries(batch.geometries, false);
      if (batch.geometries.length > 1) {
        batch.geometries.forEach((part) => part.dispose());
      }
      const mesh = new THREE.Mesh(geometry, batch.material);
      mesh.castShadow = batch.castShadow;
      mesh.receiveShadow = batch.receiveShadow;
      mesh.name = `Dynamic ${kind} material batch`;
      object.add(mesh);
      objectRenderBudget.movableProps.dynamicDraws += 1;
    }
    object.userData.dynamic = true;
    object.userData.movable = {
      kind,
      material,
      radius,
      height,
      fallThreshold,
      noise,
      baseY: object.position.y,
    };
    movableProps.push(object);
    objectRenderBudget.movableProps.instances += 1;
    objectRenderBudget.movableProps[kind] += 1;
    objectRenderBudget.movableProps.sourceMeshes += sourceMeshes;
    return object;
  };
  const awningCordPoints = [];
  const awningLashingParts = [];
  const addMarketAwning = (x, z, variant = 0) => {
    const geometry = new THREE.PlaneGeometry(6.2, 4.2, 8, 4);
    const position = geometry.attributes.position;
    for (let index = 0; index < position.count; index += 1) {
      const px = position.getX(index);
      const py = position.getY(index);
      const nx = px / 3.1;
      const ny = py / 2.1;
      const weightedSag = -Math.max(0, (1 - nx * nx) * (1 - ny * ny)) * 0.14;
      position.setZ(
        index,
        weightedSag + Math.sin(px * 2.4) * 0.045 + Math.cos(py * 1.7) * 0.025,
      );
    }
    geometry.computeVertexNormals();
    const clothMaterial = awningMaterials[variant % awningMaterials.length];
    const cloth = new THREE.Mesh(geometry, clothMaterial);
    cloth.position.set(x, 3.18, z);
    cloth.rotation.x = -Math.PI / 2;
    cloth.rotation.z = variant % 2 ? 0.035 : -0.035;
    cloth.castShadow = true;
    cloth.name = "Weight-sagged striped linen market awning";
    root.add(cloth);
    objectRenderBudget.textiles.awningCanopies += 1;
    objectRenderBudget.textiles.staticTriangles += geometryTriangles(geometry);
    const valanceGeometry = new THREE.PlaneGeometry(6.2, 0.48, 8, 1);
    const valancePositions = valanceGeometry.attributes.position;
    for (let index = 0; index < valancePositions.count; index += 1) {
      const px = valancePositions.getX(index);
      const py = valancePositions.getY(index);
      valancePositions.setXYZ(
        index,
        px,
        py + (py < 0 ? Math.sin(px * 3.05 + variant) * 0.045 : 0),
        Math.sin(px * 1.85 + variant * 0.7) * 0.025,
      );
    }
    valanceGeometry.computeVertexNormals();
    const valance = new THREE.Mesh(valanceGeometry, clothMaterial);
    valance.position.set(x, 2.94, z + 2.06);
    valance.rotation.y = variant % 2 ? 0.018 : -0.018;
    valance.castShadow = true;
    valance.name = "Hanging striped awning valance";
    root.add(valance);
    objectRenderBudget.textiles.awningValances += 1;
    objectRenderBudget.textiles.staticTriangles += geometryTriangles(valanceGeometry);
    const awningPoleParts = [-2.75, 2.75].map((poleX) => {
      const pole = new THREE.CylinderGeometry(0.07, 0.085, 3.05, 4, 1, true);
      pole.translate(x + poleX, 1.53, z + 1.7);
      return pole;
    });
    const awningPoleGeometry = mergeGeometries(awningPoleParts, false);
    awningPoleParts.forEach((pole) => pole.dispose());
    const awningPoles = new THREE.Mesh(awningPoleGeometry, timber);
    awningPoles.name = "Paired faceted market-awning poles";
    awningPoles.receiveShadow = true;
    root.add(awningPoles);
    objectRenderBudget.textiles.awningPoles += 2;
    objectRenderBudget.textiles.awningPoleMeshes += 1;
    objectRenderBudget.textiles.staticTriangles += geometryTriangles(
      awningPoleGeometry,
    );

    for (const poleX of [-2.75, 2.75]) {
      const frontTie = new THREE.PlaneGeometry(0.18, 0.055);
      frontTie.translate(x + poleX, 3.02, z + 1.7);
      awningLashingParts.push(frontTie);
      const sideTie = new THREE.PlaneGeometry(0.18, 0.055);
      sideTie.rotateY(Math.PI / 2);
      sideTie.translate(x + poleX, 3.02, z + 1.7);
      awningLashingParts.push(sideTie);
      objectRenderBudget.textiles.awningLashings += 1;
    }
    awningCordPoints.push(
      new THREE.Vector3(x - 3.05, 3.12, z - 2.05),
      new THREE.Vector3(x - 2.75, 3.05, z + 1.7),
      new THREE.Vector3(x + 3.05, 3.12, z - 2.05),
      new THREE.Vector3(x + 2.75, 3.05, z + 1.7),
    );
    objectRenderBudget.textiles.awningCordSegments += 2;
  };
  [
    [61, -19], [42, -20], [18, -17], [19, 20], [-4, 35], [35, 48], [40, 57],
  ].forEach(([x, z], index) => {
    for (let i = 0; i < 3; i += 1) {
      const jar = addAmphora({
        x: x + i * 0.68,
        y: 0.7 * (0.82 + i * 0.08),
        z: z + (i % 2) * 0.55,
        scale: 0.82 + i * 0.08,
        rotation: (index * 0.61 + i * 0.83) % (Math.PI * 2),
      });
      if (i === 0 && (index === 0 || index === 4)) {
        registerMovableProp(jar, {
          kind: "amphorae",
          material: "pottery",
          radius: 0.42 * jar.scale.x,
          height: 1.46 * jar.scale.y,
          fallThreshold: 3.25,
          noise: 76,
        });
      }
    }
    if (index < 5) {
      addMarketAwning(x, z, index);
    }
  });
  const awningLashingGeometry = mergeGeometries(awningLashingParts, false);
  awningLashingParts.forEach((lashing) => lashing.dispose());
  const awningLashings = new THREE.Mesh(awningLashingGeometry, ropeMaterial);
  awningLashings.name = "Merged rope lashings securing market awnings to poles";
  root.add(awningLashings);
  objectRenderBudget.textiles.staticTriangles += geometryTriangles(
    awningLashingGeometry,
  );
  const awningCords = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(awningCordPoints),
    new THREE.LineBasicMaterial({ color: 0x58402b }),
  );
  awningCords.name = "Merged market-awning tension cords";
  root.add(awningCords);
  objectRenderBudget.textiles.awningCordDraws = 1;

  const tradeCrateBodyGeometry = mergeGeometries(
    Array.from({ length: 5 }, (_, plank) => (
      new THREE.BoxGeometry(1.35, 0.205, 1.2)
        .translate(0, 0.11 + plank * 0.22, 0)
    )),
    false,
  );
  const tradeCrateLidGeometry = mergeGeometries(
    Array.from({ length: 4 }, (_, plank) => (
      new THREE.BoxGeometry(0.31, 0.08, 1.15)
        .translate((plank - 1.5) * 0.34, 1.145, 0)
    )),
    false,
  );
  const tradeCrateNailGeometry = new THREE.CircleGeometry(0.03, 5);
  const addTradeCrate = (x, z, scale = 1, rotation = 0) => {
    const crate = new THREE.Group();
    crate.position.set(x, 0, z);
    crate.rotation.y = rotation;
    crate.scale.setScalar(scale);
    crate.name = "Plank-built merchant cargo crate";
    root.add(crate);
    objectRenderBudget.tradeCrates.instances += 1;
    const body = new THREE.Mesh(tradeCrateBodyGeometry, timber);
    body.castShadow = body.receiveShadow = true;
    body.name = "Five separated crate body planks";
    crate.add(body);
    objectRenderBudget.tradeCrates.bodyPlanks += 5;
    objectRenderBudget.tradeCrates.staticTriangles += geometryTriangles(tradeCrateBodyGeometry);
    const lid = new THREE.Mesh(tradeCrateLidGeometry, timber);
    lid.castShadow = lid.receiveShadow = true;
    lid.name = "Four fitted crate lid planks";
    crate.add(lid);
    objectRenderBudget.tradeCrates.lidPlanks += 4;
    objectRenderBudget.tradeCrates.staticTriangles += geometryTriangles(tradeCrateLidGeometry);
    for (const edge of [-0.58, 0.58]) {
      const edgeBatten = addBox({
        size: [0.12, 1.2, 1.28],
        position: [edge, 0.58, 0],
        material: darkTimber,
        parent: crate,
        shadows: false,
        name: "Vertical crate edge batten",
      });
      objectRenderBudget.tradeCrates.edgeBattens += 1;
      objectRenderBudget.tradeCrates.staticTriangles += geometryTriangles(edgeBatten.geometry);
    }
    for (const y of [0.08, 1.08]) {
      const crossBatten = addBox({
        size: [1.44, 0.1, 1.3],
        position: [0, y, 0],
        material: darkTimber,
        parent: crate,
        shadows: false,
        name: "Horizontal crate cross batten",
      });
      objectRenderBudget.tradeCrates.crossBattens += 1;
      objectRenderBudget.tradeCrates.staticTriangles += geometryTriangles(crossBatten.geometry);
    }
    for (const faceZ of [-0.615, 0.615]) {
      const brace = addBox({
        size: [0.11, 1.42, 0.07],
        position: [0, 0.58, faceZ],
        material: darkTimber,
        parent: crate,
        shadows: false,
        name: "Diagonal crate brace",
      });
      brace.rotation.z = faceZ > 0 ? -0.78 : 0.78;
      objectRenderBudget.tradeCrates.diagonalBraces += 1;
      objectRenderBudget.tradeCrates.staticTriangles += geometryTriangles(brace.geometry);
      for (const xNail of [-0.47, 0.47]) {
        for (const yNail of [0.18, 0.98]) {
          const nail = new THREE.Mesh(
            tradeCrateNailGeometry,
            agedIron,
          );
          nail.rotation.y = faceZ < 0 ? Math.PI : 0;
          nail.position.set(xNail, yNail, faceZ + Math.sign(faceZ) * 0.041);
          nail.name = "Flush hand-forged crate nail head";
          crate.add(nail);
          objectRenderBudget.tradeCrates.nails += 1;
          objectRenderBudget.tradeCrates.staticTriangles += geometryTriangles(tradeCrateNailGeometry);
        }
      }
    }
    return crate;
  };
  [
    [58, -20, 1, 0.1], [56.5, -19, 0.7, -0.2], [22, 19, 0.8, 0.2],
    [33, 47, 1.1, 0.05], [36, 58, 0.85, -0.1], [44, 60, 0.75, 0.3],
  ].forEach(([x, z, scale, rotation], index) => {
    const crate = addTradeCrate(x, z, scale, rotation);
    if ([2,4,5].includes(index)) potteryDisplay(crate, eatingBowlClay, glazedPottery);
    if (index === 0 || index === 3) {
      registerMovableProp(crate, {
        kind: "tradeCrates",
        material: "wood",
        radius: 0.82 * scale,
        height: 1.24 * scale,
        fallThreshold: 4.2,
        noise: 69,
      });
    }
  });

  const barrelGeometry = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.39, -0.62),
      new THREE.Vector2(0.44, -0.53),
      new THREE.Vector2(0.5, -0.28),
      new THREE.Vector2(0.52, 0),
      new THREE.Vector2(0.5, 0.28),
      new THREE.Vector2(0.44, 0.53),
      new THREE.Vector2(0.39, 0.62),
    ],
    32,
  );
  const barrelLidGeometry = new THREE.CylinderGeometry(0.39, 0.39, 0.05, 32);
  const barrelHoopGeometry = new THREE.TorusGeometry(0.485, 0.032, 6, 32);
  const barrelBellyHoopGeometry = new THREE.TorusGeometry(0.52, 0.032, 6, 32);
  const barrelSeamGeometry = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.395, -0.6, 0),
      new THREE.Vector3(0.49, -0.3, 0),
      new THREE.Vector3(0.52, 0, 0),
      new THREE.Vector3(0.49, 0.3, 0),
      new THREE.Vector3(0.395, 0.6, 0),
    ]),
    4,
    0.008,
    3,
    false,
  );
  const barrelBungGeometry = new THREE.CylinderGeometry(0.055, 0.065, 0.045, 6);
  [
    [60, -17], [23, 17], [-2, 31], [37, 55], [43, 58],
  ].forEach(([x, z], barrelIndex) => {
    const barrel = new THREE.Group();
    barrel.position.set(x, 0.63, z);
    barrel.name = "Coopered barrel";
    root.add(barrel);
    objectRenderBudget.barrels.instances += 1;
    const body = new THREE.Mesh(barrelGeometry, timber);
    body.castShadow = body.receiveShadow = true;
    body.name = "Bulging barrel staves";
    barrel.add(body);
    objectRenderBudget.barrels.bodies += 1;
    objectRenderBudget.barrels.staticTriangles += geometryTriangles(barrelGeometry);
    for (const y of [-0.6, 0.6]) {
      const lid = new THREE.Mesh(barrelLidGeometry, darkTimber);
      lid.position.y = y;
      lid.name = "Recessed barrel head";
      barrel.add(lid);
      objectRenderBudget.barrels.heads += 1;
      objectRenderBudget.barrels.staticTriangles += geometryTriangles(barrelLidGeometry);
    }
    for (const y of [-0.4, 0, 0.4]) {
      const hoopGeometry = y === 0 ? barrelBellyHoopGeometry : barrelHoopGeometry;
      const hoop = new THREE.Mesh(hoopGeometry, agedIron);
      hoop.rotation.x = Math.PI / 2;
      hoop.position.y = y;
      hoop.name = "Barrel iron hoop";
      barrel.add(hoop);
      objectRenderBudget.barrels.hoops += 1;
      objectRenderBudget.barrels.staticTriangles += geometryTriangles(hoopGeometry);
    }
    for (let stave = 0; stave < 8; stave += 1) {
      const seam = new THREE.Mesh(barrelSeamGeometry, darkTimber);
      seam.rotation.y = stave * Math.PI / 4;
      seam.name = "Curved barrel stave seam";
      barrel.add(seam);
      objectRenderBudget.barrels.staveSeams += 1;
      objectRenderBudget.barrels.staticTriangles += geometryTriangles(barrelSeamGeometry);
    }
    const bungAngle = barrelIndex * 1.17 + 0.35;
    const bungDirection = new THREE.Vector3(Math.cos(bungAngle), 0, Math.sin(bungAngle));
    const bung = new THREE.Mesh(barrelBungGeometry, darkTimber);
    bung.position.set(bungDirection.x * 0.512, 0.12, bungDirection.z * 0.512);
    bung.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bungDirection);
    bung.name = "Inset barrel bung";
    barrel.add(bung);
    objectRenderBudget.barrels.bungs += 1;
    objectRenderBudget.barrels.staticTriangles += geometryTriangles(barrelBungGeometry);
  });

  const wicker = new THREE.MeshStandardMaterial({
    color: 0xad824c,
    map: sackTexture,
    bumpMap: sackTexture,
    bumpScale: 0.018,
    roughness: 1,
  });
  const marketProduce = [
    new THREE.MeshStandardMaterial({ color: 0x7e5224, roughness: 0.96 }),
    new THREE.MeshStandardMaterial({ color: 0x60713a, roughness: 0.98 }),
    new THREE.MeshStandardMaterial({ color: 0x974231, roughness: 0.96 }),
  ];
  const produceGeometry = new THREE.SphereGeometry(0.14, 16, 12).toNonIndexed();
  const producePositions = produceGeometry.attributes.position;
  for (let index = 0; index < producePositions.count; index += 1) {
    const x = producePositions.getX(index);
    const y = producePositions.getY(index);
    const z = producePositions.getZ(index);
    const organicScale = 1 + Math.sin(x * 31 + y * 23 + z * 17) * 0.055;
    producePositions.setXYZ(
      index,
      x * organicScale,
      y * (organicScale + Math.cos(x * 29 - z * 19) * 0.035),
      z * organicScale,
    );
  }
  produceGeometry.computeVertexNormals();
  const produceStemGeometry = new THREE.CylinderGeometry(
    0.014,
    0.023,
    0.09,
    5,
  ).toNonIndexed();
  const produceScales = [
    [1.05, 0.84, 1],
    [0.78, 1.32, 0.78],
    [0.98, 1.08, 0.98],
  ];
  const produceNames = ["onion", "cucumber", "pomegranate"];
  const basketBodyGeometry = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.31, 0.04),
      new THREE.Vector2(0.41, 0.22),
      new THREE.Vector2(0.46, 0.42),
    ],
    10,
  );
  const basketBodyPositions = basketBodyGeometry.attributes.position;
  for (let vertex = 0; vertex < basketBodyPositions.count; vertex += 1) {
    const x = basketBodyPositions.getX(vertex);
    const y = basketBodyPositions.getY(vertex);
    const z = basketBodyPositions.getZ(vertex);
    const angle = Math.atan2(z, x);
    const handwovenVariation = (
      1
      + Math.sin(angle * 5 + y * 7) * 0.014
      + Math.cos(angle * 3 - y * 9) * 0.009
    );
    basketBodyPositions.setXYZ(
      vertex,
      x * handwovenVariation,
      y,
      z * handwovenVariation,
    );
  }
  basketBodyGeometry.computeVertexNormals();
  const basketRimGeometry = new THREE.TorusGeometry(0.46, 0.05, 3, 12);
  const basketBaseGeometry = new THREE.TorusGeometry(0.31, 0.025, 3, 10);
  const basketRibGeometry = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0.315, 0.05, 0),
        new THREE.Vector3(0.4, 0.22, 0),
        new THREE.Vector3(0.458, 0.42, 0),
      ],
      false,
      "centripetal",
    ),
    3,
    0.014,
    3,
    false,
  );
  const basketHandleGeometry = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-0.43, 0.42, 0),
        new THREE.Vector3(-0.46, 0.61, 0.015),
        new THREE.Vector3(-0.32, 0.82, -0.01),
        new THREE.Vector3(0, 0.93, 0.02),
        new THREE.Vector3(0.32, 0.82, -0.01),
        new THREE.Vector3(0.46, 0.61, 0.015),
        new THREE.Vector3(0.43, 0.42, 0),
      ],
      false,
      "centripetal",
    ),
    6,
    0.03,
    3,
    false,
  );
  [
    [59, -18.3], [20.5, 18.4], [-3, 33], [39, 54.5],
  ].forEach(([x, z], basketIndex) => {
    const basket = new THREE.Group();
    basket.position.set(x, 0, z);
    basket.rotation.y = basketIndex % 2 ? 0.08 : -0.08;
    basket.name = "Handwoven produce basket";
    root.add(basket);
    objectRenderBudget.baskets.instances += 1;

    const bowl = new THREE.Mesh(basketBodyGeometry, wicker);
    bowl.castShadow = bowl.receiveShadow = true;
    bowl.name = "Irregular handwoven basket body";
    basket.add(bowl);
    objectRenderBudget.baskets.bodies += 1;
    objectRenderBudget.baskets.staticTriangles += geometryTriangles(basketBodyGeometry);

    const rim = new THREE.Mesh(basketRimGeometry, wicker);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.43;
    rim.name = "Bound wicker basket rim";
    basket.add(rim);
    objectRenderBudget.baskets.rims += 1;
    objectRenderBudget.baskets.staticTriangles += geometryTriangles(basketRimGeometry);

    const baseRing = new THREE.Mesh(basketBaseGeometry, wicker);
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.y = 0.055;
    baseRing.name = "Reinforced wicker basket foot";
    basket.add(baseRing);
    objectRenderBudget.baskets.baseRings += 1;
    objectRenderBudget.baskets.staticTriangles += geometryTriangles(basketBaseGeometry);

    for (let ribIndex = 0; ribIndex < 8; ribIndex += 1) {
      const rib = new THREE.Mesh(basketRibGeometry, wicker);
      rib.rotation.y = ribIndex * Math.PI / 4;
      rib.name = "Curved structural basket rib";
      basket.add(rib);
      objectRenderBudget.baskets.ribs += 1;
      objectRenderBudget.baskets.staticTriangles += geometryTriangles(basketRibGeometry);
    }

    const handle = new THREE.Mesh(basketHandleGeometry, wicker);
    handle.name = "Bent neck-to-neck wicker handle";
    basket.add(handle);
    objectRenderBudget.baskets.handles += 1;
    objectRenderBudget.baskets.staticTriangles += geometryTriangles(basketHandleGeometry);

    for (let i = 0; i < 7; i += 1) {
      const produceType = (basketIndex + i) % marketProduce.length;
      const size = 0.92 + (i % 2) * 0.14;
      const produce = new THREE.Mesh(
        produceGeometry,
        marketProduce[produceType],
      );
      const angle = i * 2.4;
      produce.position.set(Math.cos(angle) * 0.27, 0.46 + (i % 3) * 0.07, Math.sin(angle) * 0.27);
      produce.scale.set(
        produceScales[produceType][0] * size,
        produceScales[produceType][1] * size,
        produceScales[produceType][2] * size,
      );
      produce.rotation.set((i % 3 - 1) * 0.08, angle * 0.31, (basketIndex - 1.5) * 0.035);
      produce.castShadow = true;
      produce.name = `Market ${produceNames[produceType]}`;
      basket.add(produce);
      objectRenderBudget.marketGoods.producePieces += 1;
      objectRenderBudget.marketGoods.produceTriangles += geometryTriangles(produceGeometry);
      const stem = new THREE.Mesh(produceStemGeometry, marketProduce[1]);
      stem.position.y = 0.155;
      stem.rotation.z = (i % 3 - 1) * 0.16;
      stem.name = `${produceNames[produceType]} stem`;
      produce.add(stem);
      objectRenderBudget.marketGoods.produceStems += 1;
      objectRenderBudget.marketGoods.produceTriangles += geometryTriangles(produceStemGeometry);
    }
  });

  const sackMaterial = new THREE.MeshStandardMaterial({
    color: 0xc1a578,
    map: sackTexture,
    bumpMap: sackTexture,
    bumpScale: 0.028,
    roughness: 1,
  });
  const sackProfile = [
    new THREE.Vector2(0.22, 0.02),
    new THREE.Vector2(0.37, 0.08),
    new THREE.Vector2(0.46, 0.24),
    new THREE.Vector2(0.48, 0.5),
    new THREE.Vector2(0.43, 0.72),
    new THREE.Vector2(0.29, 0.84),
    new THREE.Vector2(0.13, 0.91),
    new THREE.Vector2(0.12, 1.02),
    new THREE.Vector2(0.18, 1.12),
  ];
  const createSackGeometry = (variant) => {
    const geometry = new THREE.LatheGeometry(sackProfile, 10);
    const positions = geometry.attributes.position;
    const phase = variant * 1.37;
    for (let vertex = 0; vertex < positions.count; vertex += 1) {
      const x = positions.getX(vertex);
      const y = positions.getY(vertex);
      const z = positions.getZ(vertex);
      const angle = Math.atan2(z, x);
      const bodyFullness = Math.sin(Math.min(1, y / 0.9) * Math.PI);
      const gatheredCloth = Math.max(0, (y - 0.76) / 0.36);
      const radialVariation = (
        1
        + Math.sin(angle * 3 + phase) * (0.018 + bodyFullness * 0.025)
        + Math.cos(angle * 5 - phase * 0.7) * gatheredCloth * 0.055
      );
      const lean = Math.sin(y * Math.PI / 1.12) * (variant - 2) * 0.008;
      const settle = Math.cos(angle - phase) * Math.max(0, 0.18 - y) * 0.045;
      positions.setXYZ(
        vertex,
        x * radialVariation + lean,
        y,
        z * radialVariation + settle,
      );
    }
    geometry.computeVertexNormals();
    return geometry;
  };
  const sackTieGeometry = new THREE.TorusGeometry(0.135, 0.024, 4, 8);
  const sackOpeningGeometry = new THREE.CircleGeometry(0.145, 10);
  const sackCordTailGeometries = [
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.05, 0.91, 0.11),
        new THREE.Vector3(-0.12, 0.82, 0.13),
        new THREE.Vector3(-0.16, 0.73, 0.1),
      ]),
      3,
      0.017,
      3,
      false,
    ),
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.05, 0.91, 0.11),
        new THREE.Vector3(0.13, 0.84, 0.12),
        new THREE.Vector3(0.18, 0.77, 0.08),
      ]),
      3,
      0.017,
      3,
      false,
    ),
  ];
  [
    [57.5, -17.5, 0.9], [55.8, -18.2, 0.68], [21.4, 20.2, 0.76],
    [35.2, 55.5, 0.82], [46, 59.2, 0.72],
  ].forEach(([x, z, scale], index) => {
    const sack = new THREE.Group();
    sack.position.set(x, 0, z);
    sack.scale.set(scale * 0.86, scale, scale * 0.76);
    sack.rotation.y = index * 0.7;
    sack.name = "Slumped merchant grain sack";
    root.add(sack);
    objectRenderBudget.sacks.instances += 1;

    const bodyGeometry = createSackGeometry(index);
    const body = new THREE.Mesh(bodyGeometry, sackMaterial);
    body.castShadow = body.receiveShadow = true;
    body.name = "Continuous filled sack body and gathered neck";
    sack.add(body);
    objectRenderBudget.sacks.bodies += 1;
    objectRenderBudget.sacks.staticTriangles += geometryTriangles(bodyGeometry);

    const tie = new THREE.Mesh(sackTieGeometry, wicker);
    tie.rotation.x = Math.PI / 2;
    tie.position.y = 0.91;
    tie.name = "Twine cinching the sack neck";
    sack.add(tie);
    objectRenderBudget.sacks.ties += 1;
    objectRenderBudget.sacks.staticTriangles += geometryTriangles(sackTieGeometry);

    sackCordTailGeometries.forEach((geometry, tailIndex) => {
      const tail = new THREE.Mesh(geometry, wicker);
      tail.rotation.y = (index % 3 - 1) * 0.16;
      tail.name = `Loose sack-cord tail ${tailIndex + 1}`;
      sack.add(tail);
      objectRenderBudget.sacks.cordTails += 1;
      objectRenderBudget.sacks.staticTriangles += geometryTriangles(geometry);
    });

    const opening = new THREE.Mesh(sackOpeningGeometry, darkRecess);
    opening.rotation.x = -Math.PI / 2;
    opening.position.y = 1.115;
    opening.name = "Shadowed folds inside sack mouth";
    sack.add(opening);
    objectRenderBudget.sacks.openings += 1;
    objectRenderBudget.sacks.staticTriangles += geometryTriangles(sackOpeningGeometry);
  });

  // Street life is also stealth infrastructure. These clusters are based on
  // excavated or documented activities in thirteenth-century Acre: communal
  // merchant warehouses, imported ceramics, Hospitaller water and sugar
  // storage, the working harbour, and the Templar port passage. Unlike the
  // smaller decorative market props above, every substantial cluster has
  // conservative collision volumes so it blocks both the player and a
  // guard's line of sight.
  const dyedCloth = [
    new THREE.MeshStandardMaterial({
      color: 0x8b493e,
      map: sackTexture,
      bumpMap: sackTexture,
      bumpScale: 0.026,
      roughness: 1,
      side: THREE.DoubleSide,
    }),
    new THREE.MeshStandardMaterial({
      color: 0x445e67,
      map: sackTexture,
      bumpMap: sackTexture,
      bumpScale: 0.026,
      roughness: 1,
      side: THREE.DoubleSide,
    }),
    new THREE.MeshStandardMaterial({
      color: 0x9a7a43,
      map: sackTexture,
      bumpMap: sackTexture,
      bumpScale: 0.026,
      roughness: 1,
      side: THREE.DoubleSide,
    }),
  ];
  const fishNetMaterial = new THREE.LineBasicMaterial({
    color: 0x8a7555,
    transparent: true,
    opacity: 0.82,
  });

  const beginStreetCover = ({
    id,
    title,
    context,
    fact,
    position,
    approach,
    radius = 5.5,
  }) => {
    const cover = {
      id,
      title,
      position: new THREE.Vector3(position[0], 0, position[1]),
      approach: new THREE.Vector3(approach[0], 0, approach[1]),
      colliderIndexes: [],
    };
    streetCover.push(cover);
    streetStories.push({
      id,
      title,
      context,
      fact,
      position: cover.position.clone(),
      radius,
    });
    return cover;
  };
  const addStreetCoverCollider = (cover, size, position) => {
    cover.colliderIndexes.push(colliders.length);
    addCollider(size, position);
  };
  const cargoKnotGeometry = new THREE.TorusGeometry(0.065, 0.016, 3, 5);
  const addRoundCargoBinding = ({
    x,
    z,
    offset,
    height,
    depth,
    name,
    knot = false,
  }) => {
    const verticalGeometry = new THREE.CylinderGeometry(
      0.025,
      0.029,
      height + 0.06,
      5,
    );
    for (const face of [-1, 1]) {
      const vertical = new THREE.Mesh(verticalGeometry, ropeMaterial);
      vertical.position.set(
        x + offset,
        height / 2,
        z + face * (depth / 2 + 0.028),
      );
      vertical.name = `${name} vertical rope`;
      root.add(vertical);
      objectRenderBudget.cargoCover.staticTriangles += geometryTriangles(verticalGeometry);
    }
    const topGeometry = new THREE.CylinderGeometry(
      0.025,
      0.029,
      depth + 0.08,
      5,
    );
    const top = new THREE.Mesh(topGeometry, ropeMaterial);
    top.position.set(x + offset, height + 0.03, z);
    top.rotation.x = Math.PI / 2;
    top.name = `${name} top rope`;
    root.add(top);
    objectRenderBudget.cargoCover.staticTriangles += geometryTriangles(topGeometry);
    if (knot) {
      const tie = new THREE.Mesh(cargoKnotGeometry, ropeMaterial);
      tie.position.set(x + offset, height * 0.72, z + depth / 2 + 0.065);
      tie.rotation.z = offset * 0.37;
      tie.name = "Hand-tied cargo knot";
      root.add(tie);
      objectRenderBudget.cargoCover.chestKnots += 1;
      objectRenderBudget.cargoCover.staticTriangles += geometryTriangles(cargoKnotGeometry);
    }
  };
  const addBoundCrate = (cover, x, z, size = [1.65, 1.45, 1.25]) => {
    const bodyHeight = size[1] - 0.16;
    addBox({
      size: [size[0], bodyHeight, size[2]],
      position: [x, bodyHeight / 2, z],
      material: timber,
      name: "Merchant chest body",
    });
    objectRenderBudget.cargoCover.chests += 1;
    objectRenderBudget.cargoCover.staticTriangles += 12;
    addBox({
      size: [size[0] + 0.08, 0.16, size[2] + 0.08],
      position: [x, size[1] - 0.08, z],
      material: darkTimber,
      name: "Raised merchant chest lid",
    });
    objectRenderBudget.cargoCover.chestLids += 1;
    objectRenderBudget.cargoCover.staticTriangles += 12;
    for (const offset of [-size[0] * 0.28, size[0] * 0.28]) {
      addRoundCargoBinding({
        x,
        z,
        offset,
        height: size[1],
        depth: size[2],
        name: "Chest binding",
        knot: true,
      });
      objectRenderBudget.cargoCover.chestBindings += 1;
    }
    addStreetCoverCollider(cover, size, [x, size[1] / 2, z]);
  };
  const addAmphoraRack = (cover, x, z, columns = 3) => {
    const rackWidth = columns * 0.72 + 0.35;
    addBox({
      size: [rackWidth, 0.16, 1.16],
      position: [x, 0.16, z],
      material: timber,
      name: "Amphora rack sill",
    });
    for (const offset of [-rackWidth / 2 + 0.1, rackWidth / 2 - 0.1]) {
      addBox({
        size: [0.13, 1.72, 1.18],
        position: [x + offset, 0.86, z],
        material: timber,
        name: "Amphora rack upright",
      });
    }
    addBox({
      size: [rackWidth, 0.14, 0.14],
      position: [x, 1.58, z - 0.5],
      material: darkTimber,
      shadows: false,
      name: "Amphora rack top rail",
    });
    const rackBrace = addBox({
      size: [0.11, Math.hypot(rackWidth - 0.3, 1.28), 0.11],
      position: [x, 0.83, z - 0.51],
      material: darkTimber,
      shadows: false,
      name: "Amphora rack diagonal brace",
    });
    rackBrace.rotation.z = Math.atan2(rackWidth - 0.3, 1.28);
    for (let column = 0; column < columns; column += 1) {
      addAmphora({
        x: x + (column - (columns - 1) / 2) * 0.72,
        y: 0.72,
        z,
        rotation: column * 0.73,
        name: "Stored transport jar",
      });
    }
    addStreetCoverCollider(cover, [rackWidth, 1.72, 1.18], [x, 0.86, z]);
  };
  const addClothBale = (cover, x, z, width, height, materialIndex = 0) => {
    const depth = 1.18;
    const baleGeometry = new THREE.BoxGeometry(width, height, depth, 2, 2, 1);
    const positions = baleGeometry.attributes.position;
    for (let index = 0; index < positions.count; index += 1) {
      const px = positions.getX(index);
      const py = positions.getY(index);
      const pz = positions.getZ(index);
      const nx = Math.abs(px) / (width / 2);
      const ny = Math.abs(py) / (height / 2);
      const nz = Math.abs(pz) / (depth / 2);
      positions.setXYZ(
        index,
        px * (1 - ny * nz * 0.055),
        py * (1 - nx * nz * 0.06),
        pz * (1 - nx * ny * 0.045),
      );
    }
    baleGeometry.computeVertexNormals();
    const bale = new THREE.Mesh(
      baleGeometry,
      dyedCloth[materialIndex % dyedCloth.length],
    );
    bale.position.set(x, height / 2, z);
    bale.castShadow = bale.receiveShadow = true;
    bale.name = "Soft-cornered rope-bound cloth bale";
    root.add(bale);
    objectRenderBudget.cargoCover.clothBales += 1;
    objectRenderBudget.cargoCover.staticTriangles += geometryTriangles(baleGeometry);
    for (const offset of [-width * 0.27, width * 0.27]) {
      addRoundCargoBinding({
        x,
        z,
        offset,
        height,
        depth,
        name: "Bale binding",
      });
      objectRenderBudget.cargoCover.baleBindings += 1;
    }
    addStreetCoverCollider(cover, [width, height, depth], [x, height / 2, z]);
  };

  const venetianCargo = beginStreetCover({
    id: "venetian-fondaco",
    title: "THE VENETIAN FONDACO",
    context: "WAREHOUSE, SHOPS, AND LODGING",
    fact: "A Venetian fondaco in Acre combined a warehouse, sixteen retail spaces, and lodgings above—commerce and daily life shared one building.",
    position: [64.8, -17.5],
    approach: [64.8, -15.2],
  });
  addBoundCrate(venetianCargo, 64.1, -17.55, [2.15, 1.8, 1.35]);
  addBoundCrate(venetianCargo, 66.05, -18.0, [1.35, 1.32, 1.2]);
  addAmphoraRack(venetianCargo, 62.15, -17.6, 2);

  const genoeseMarket = beginStreetCover({
    id: "genoese-market",
    title: "A MEDITERRANEAN MARKET",
    context: "GENOESE QUARTER",
    fact: "Ceramics excavated in Crusader Acre came from Cyprus, the Aegean, Syria, Italy, and North Africa—a material record of the people and cargo passing through its markets.",
    position: [14.25, 5.4],
    approach: [16.6, 5.4],
  });
  addClothBale(genoeseMarket, 14.25, 4.85, 2.4, 1.58, 0);
  addClothBale(genoeseMarket, 14.9, 6.12, 1.35, 1.24, 1);
  const marketRoll = addCylinder({
    radius: 0.34,
    height: 2.2,
    position: [13.05, 0.82, 6.12],
    material: dyedCloth[2],
    segments: 14,
    name: "Rolled market textile",
  });
  marketRoll.rotation.z = Math.PI / 2;
  addStreetCoverCollider(genoeseMarket, [2.2, 0.72, 0.72], [13.05, 0.72, 6.12]);

  const hospitallerWater = beginStreetCover({
    id: "hospitaller-water",
    title: "WATER FOR A CROWDED HOUSE",
    context: "HOSPITALLER SERVICE LANE",
    fact: "The Hospitaller court had wells and plastered pools: the northern installation served drinking and laundry, while the southern pool was probably used for washing.",
    position: [-8.45, -48],
    approach: [-8.45, -45.4],
  });
  addAmphoraRack(hospitallerWater, -8.45, -48.1, 3);
  const dryingLinenGeometry = new THREE.PlaneGeometry(2.65, 1.3, 6, 4);
  const dryingLinenPositions = dryingLinenGeometry.attributes.position;
  for (let index = 0; index < dryingLinenPositions.count; index += 1) {
    const x = dryingLinenPositions.getX(index);
    const foldOffset = dryingLinenPositions.getY(index);
    const fold = Math.abs(foldOffset) / 0.65;
    dryingLinenPositions.setXYZ(
      index,
      x,
      -fold * 0.78 - Math.cos(x * 3.1) * 0.035 * fold,
      foldOffset,
    );
  }
  dryingLinenGeometry.computeVertexNormals();
  const dryingLinen = new THREE.Mesh(dryingLinenGeometry, dyedCloth[1]);
  dryingLinen.position.set(-8.4, 2.05, -48.1);
  dryingLinen.castShadow = true;
  dryingLinen.name = "Folded drying linen";
  root.add(dryingLinen);
  objectRenderBudget.textiles.dryingSheets += 1;
  objectRenderBudget.textiles.staticTriangles += geometryTriangles(dryingLinenGeometry);
  const clotheslineGeometry = new THREE.CylinderGeometry(0.022, 0.022, 2.82, 5);
  const clothesline = new THREE.Mesh(clotheslineGeometry, ropeMaterial);
  clothesline.position.set(-8.4, 2.05, -48.1);
  clothesline.rotation.z = Math.PI / 2;
  clothesline.name = "Linen clothesline";
  root.add(clothesline);
  objectRenderBudget.textiles.clotheslines += 1;
  objectRenderBudget.textiles.staticTriangles += geometryTriangles(clotheslineGeometry);
  addStreetCoverCollider(hospitallerWater, [2.65, 0.22, 1.3], [-8.4, 1.86, -48.1]);

  const sugarStore = beginStreetCover({
    id: "hospitaller-sugar",
    title: "SUGAR VESSELS",
    context: "HOSPITALLER QUARTER",
    fact: "Excavators found hundreds of cone-shaped sugar pots and smaller molasses jars stored in rows here. Sugar was one of the region's major Crusader-period industries.",
    position: [-6, -31.5],
    approach: [-3.2, -31.5],
  });
  addBoundCrate(sugarStore, -6.05, -32.1, [2.35, 1.55, 1.2]);
  const sugarMoldGeometry = new THREE.CylinderGeometry(0.32, 0.11, 0.85, 10, 1, true);
  const sugarMoldRimGeometry = new THREE.TorusGeometry(0.32, 0.025, 4, 8);
  const sugarMoldOpeningGeometry = new THREE.CircleGeometry(0.275, 10);
  for (let column = 0; column < 4; column += 1) {
    const x = -7.1 + column * 0.7;
    const sugarMold = new THREE.Mesh(sugarMoldGeometry, pottery);
    sugarMold.position.set(x, 1.95, -31.45);
    sugarMold.rotation.y = column * 0.19;
    sugarMold.castShadow = true;
    sugarMold.name = "Hollow conical sugar mold";
    root.add(sugarMold);
    objectRenderBudget.marketGoods.sugarMolds += 1;
    objectRenderBudget.marketGoods.sugarTriangles += geometryTriangles(sugarMoldGeometry);
    const rim = new THREE.Mesh(sugarMoldRimGeometry, pottery);
    rim.position.set(x, 2.375, -31.45);
    rim.rotation.x = Math.PI / 2;
    rim.name = "Rolled sugar-mold rim";
    root.add(rim);
    objectRenderBudget.marketGoods.sugarRims += 1;
    objectRenderBudget.marketGoods.sugarTriangles += geometryTriangles(sugarMoldRimGeometry);
    const opening = new THREE.Mesh(sugarMoldOpeningGeometry, darkRecess);
    opening.position.set(x, 2.374, -31.45);
    opening.rotation.x = -Math.PI / 2;
    opening.name = "Sugar-mold dark interior";
    root.add(opening);
    objectRenderBudget.marketGoods.sugarOpenings += 1;
    objectRenderBudget.marketGoods.sugarTriangles += geometryTriangles(sugarMoldOpeningGeometry);
  }
  addStreetCoverCollider(sugarStore, [2.85, 1.02, 0.78], [-6.05, 1.58, -31.45]);

  const pisanJars = beginStreetCover({
    id: "pisan-quayside",
    title: "THE PISAN QUAYSIDE",
    context: "PORT-SIDE MERCHANT QUARTER",
    fact: "The Pisan quarter stood between the Templar fortress and the harbour mole. Racks protected fragile transport jars while cargo waited for a shop or ship.",
    position: [14.65, 33.2],
    approach: [14.65, 30.5],
  });
  addAmphoraRack(pisanJars, 14.65, 33.2, 4);
  addBoundCrate(pisanJars, 15.5, 34.65, [1.6, 1.35, 1.2]);

  const templarFreight = beginStreetCover({
    id: "templar-freight",
    title: "FORTRESS TO PORT",
    context: "TEMPLAR QUARTER",
    fact: "A 150-metre strategic tunnel linked the Templar fortress to Acre's port and crossed beneath the Pisan quarter.",
    position: [-46, 39.6],
    approach: [-46, 37.2],
  });
  objectRenderBudget.handcart.instances = 1;
  const addHandcartBox = (options, counter) => {
    const mesh = addBox(options);
    objectRenderBudget.handcart[counter] += 1;
    objectRenderBudget.handcart.staticTriangles += geometryTriangles(mesh.geometry);
    return mesh;
  };
  for (let plank = 0; plank < 5; plank += 1) {
    const board = addHandcartBox({
      size: [0.7, 0.18, 1.78],
      position: [
        -47.44 + plank * 0.72,
        0.66 + Math.sin(plank * 2.1) * 0.012,
        39.6,
      ],
      material: plank % 2 ? darkTimber : timber,
      name: "Individually fitted handcart bed plank",
    }, "bedPlanks");
    board.rotation.y = (plank - 2) * 0.006;
  }
  for (const side of [-1, 1]) {
    addHandcartBox({
      size: [0.14, 0.14, 1.84],
      position: [-46 + side * 1.78, 1.25, 39.6],
      material: darkTimber,
      name: "Handcart upper side rail",
    }, "sideRails");
    for (const z of [38.86, 39.6, 40.34]) {
      const stake = addHandcartBox({
        size: [0.13, 0.76, 0.13],
        position: [-46 + side * 1.78, 0.94, z],
        material: darkTimber,
        name: "Mortised handcart side stake",
      }, "sideStakes");
      stake.rotation.z = side * (z - 39.6) * 0.018;
    }
    const handle = addHandcartBox({
      size: [0.14, 0.14, 3.15],
      position: [-46 + side * 1.42, 0.72, 37.15],
      material: timber,
      name: "Handcart carrying shaft",
    }, "carryingShafts");
    handle.rotation.x = side * 0.018;
  }
  for (const [slat, y] of [0.82, 1.08, 1.34].entries()) {
    const headboard = addHandcartBox({
      size: [3.7, 0.13, 0.14],
      position: [-46, y, 40.42],
      material: slat === 1 ? timber : darkTimber,
      name: "Spaced handcart headboard slat",
    }, "headboardSlats");
    headboard.rotation.z = (slat - 1) * 0.004;
  }
  const cartAxleGeometry = new THREE.CylinderGeometry(0.09, 0.09, 3.22, 8);
  const cartAxle = new THREE.Mesh(
    cartAxleGeometry,
    agedIron,
  );
  cartAxle.position.set(-46, 0.78, 39.6);
  cartAxle.rotation.z = Math.PI / 2;
  cartAxle.name = "Handcart iron axle";
  root.add(cartAxle);
  objectRenderBudget.handcart.axles += 1;
  objectRenderBudget.handcart.staticTriangles += geometryTriangles(cartAxleGeometry);
  const cartWheelGeometry = new THREE.TorusGeometry(0.74, 0.1, 3, 8);
  const cartTireGeometry = new THREE.TorusGeometry(0.845, 0.035, 3, 10);
  const cartHubGeometry = new THREE.CylinderGeometry(0.17, 0.19, 0.28, 6);
  const cartLinchpinGeometry = new THREE.CylinderGeometry(0.035, 0.035, 0.32, 4);
  const cartSpokeGeometry = mergeGeometries([
    new THREE.PlaneGeometry(0.075, 0.62).rotateY(Math.PI / 2),
    new THREE.PlaneGeometry(0.075, 0.62).rotateY(-Math.PI / 2),
  ], false);
  for (const side of [-1, 1]) {
    const x = -46 + side * 1.35;
    const wheel = new THREE.Mesh(
      cartWheelGeometry,
      timber,
    );
    wheel.position.set(x, 0.78, 39.6);
    wheel.rotation.y = Math.PI / 2;
    wheel.castShadow = true;
    wheel.name = "Felloed timber handcart wheel";
    root.add(wheel);
    objectRenderBudget.handcart.wheelRims += 1;
    objectRenderBudget.handcart.staticTriangles += geometryTriangles(cartWheelGeometry);

    const tire = new THREE.Mesh(cartTireGeometry, agedIron);
    tire.position.copy(wheel.position);
    tire.rotation.copy(wheel.rotation);
    tire.castShadow = true;
    tire.name = "Shrunk iron handcart tire";
    root.add(tire);
    objectRenderBudget.handcart.ironTires += 1;
    objectRenderBudget.handcart.staticTriangles += geometryTriangles(cartTireGeometry);

    for (let spokeIndex = 0; spokeIndex < 6; spokeIndex += 1) {
      const rotation = spokeIndex * Math.PI / 3;
      const spoke = new THREE.Mesh(cartSpokeGeometry, darkTimber);
      spoke.position.set(
        x,
        0.78 + Math.cos(rotation) * 0.38,
        39.6 + Math.sin(rotation) * 0.38,
      );
      spoke.rotation.x = rotation;
      spoke.name = "Thin mortised handcart wheel spoke";
      root.add(spoke);
      objectRenderBudget.handcart.spokes += 1;
      objectRenderBudget.handcart.staticTriangles += geometryTriangles(cartSpokeGeometry);
    }
    const hub = new THREE.Mesh(
      cartHubGeometry,
      darkTimber,
    );
    hub.position.set(x, 0.78, 39.6);
    hub.rotation.z = Math.PI / 2;
    hub.name = "Heavy handcart wheel nave";
    root.add(hub);
    objectRenderBudget.handcart.hubs += 1;
    objectRenderBudget.handcart.staticTriangles += geometryTriangles(cartHubGeometry);

    const linchpin = new THREE.Mesh(cartLinchpinGeometry, agedIron);
    linchpin.position.set(x + side * 0.18, 0.78, 39.6);
    linchpin.rotation.z = side * 0.06;
    linchpin.name = "Forged axle linchpin";
    root.add(linchpin);
    objectRenderBudget.handcart.linchpins += 1;
    objectRenderBudget.handcart.staticTriangles += geometryTriangles(cartLinchpinGeometry);
  }
  addClothBale(templarFreight, -46.35, 39.6, 2.45, 1.72, 2);
  addStreetCoverCollider(templarFreight, [3.8, 1.75, 1.85], [-46, 0.88, 39.6]);

  const harbourWork = beginStreetCover({
    id: "harbour-work",
    title: "THE WORKING HARBOUR",
    context: "INNER HARBOUR",
    fact: "Acre's natural bay made it the main Crusader port of the Holy Land. Ships, porters, merchants, and pilgrims pressed into a densely built city behind the quays.",
    position: [39.2, 49.2],
    approach: [39.2, 51.7],
  });
  const netPostParts = [37.8, 40.6].map((postX) => {
    const post = new THREE.CylinderGeometry(0.11, 0.125, 2.35, 4, 1, true);
    post.translate(postX, 1.18, 49.2);
    return post;
  });
  const netPostGeometry = mergeGeometries(netPostParts, false);
  netPostParts.forEach((post) => post.dispose());
  const netPosts = new THREE.Mesh(netPostGeometry, timber);
  netPosts.castShadow = netPosts.receiveShadow = true;
  netPosts.name = "Paired faceted fishing-net drying posts";
  root.add(netPosts);
  objectRenderBudget.fishingGear.netFrames = 1;
  objectRenderBudget.fishingGear.dryingPosts = 2;
  objectRenderBudget.fishingGear.staticTriangles += geometryTriangles(netPostGeometry);

  const netPoints = [];
  for (let row = 0; row <= 5; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      const t0 = column / 8;
      const t1 = (column + 1) / 8;
      const baseY = 0.35 + row * 0.35;
      netPoints.push(
        new THREE.Vector3(37.8 + t0 * 2.8, baseY - Math.sin(t0 * Math.PI) * 0.16, 49.2),
        new THREE.Vector3(37.8 + t1 * 2.8, baseY - Math.sin(t1 * Math.PI) * 0.16, 49.2),
      );
    }
  }
  for (let column = 0; column <= 8; column += 1) {
    const t = column / 8;
    const x = 37.8 + column * 0.35;
    const sag = Math.sin(t * Math.PI) * 0.16;
    for (let row = 0; row < 5; row += 1) {
      netPoints.push(
        new THREE.Vector3(x, 0.35 + row * 0.35 - sag, 49.2),
        new THREE.Vector3(x, 0.35 + (row + 1) * 0.35 - sag, 49.2),
      );
    }
  }
  const dryingNet = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(netPoints),
    fishNetMaterial,
  );
  dryingNet.name = "Knotted sagging harbour fishing net";
  root.add(dryingNet);
  objectRenderBudget.fishingGear.netSegments = (
    dryingNet.geometry.attributes.position.count / 2
  );

  const netSinkerParts = Array.from({ length: 5 }, (_, sinkerIndex) => {
    const t = (sinkerIndex + 1) / 6;
    const sinkerX = 37.8 + t * 2.8;
    const sinkerY = 0.24 - Math.sin(t * Math.PI) * 0.16;
    const sinker = new THREE.BufferGeometry();
    sinker.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([
        sinkerX - 0.065, sinkerY + 0.06, 49.205,
        sinkerX, sinkerY - 0.08, 49.205,
        sinkerX + 0.065, sinkerY + 0.06, 49.205,
      ], 3),
    );
    sinker.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute([
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
      ], 3),
    );
    sinker.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute([
        0, 1,
        0.5, 0,
        1, 1,
      ], 2),
    );
    sinker.setIndex([0, 1, 2]);
    return sinker;
  });
  const netSinkerGeometry = mergeGeometries(netSinkerParts, false);
  netSinkerParts.forEach((sinker) => sinker.dispose());
  const netSinkers = new THREE.Mesh(netSinkerGeometry, oldStone);
  netSinkers.name = "Five stone sinkers weighting the fishing-net foot";
  root.add(netSinkers);
  objectRenderBudget.fishingGear.sinkers = 5;
  objectRenderBudget.fishingGear.staticTriangles += geometryTriangles(netSinkerGeometry);

  addBoundCrate(harbourWork, 39.2, 49.55, [3.25, 1.18, 1.35]);
  addStreetCoverCollider(harbourWork, [3.25, 2.2, 1.35], [39.2, 1.1, 49.35]);

  const oliveLeafTexture = canvasTexture(256, (ctx, s) => {
    const random = seededPainter(0x0117e);
    ctx.clearRect(0, 0, s, s);
    ctx.strokeStyle = "rgba(83,66,39,.9)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(s * 0.08, s * 0.75);
    ctx.bezierCurveTo(s * 0.38, s * 0.58, s * 0.63, s * 0.4, s * 0.94, s * 0.23);
    ctx.stroke();
    for (let leaf = 0; leaf < 34; leaf += 1) {
      const t = 0.08 + random() * 0.86;
      const x = s * (0.08 + t * 0.86) + (random() - 0.5) * 24;
      const y = s * (0.75 - t * 0.52) + (random() - 0.5) * 34;
      const length = 11 + random() * 10;
      const width = 3.2 + random() * 3;
      const angle = -0.75 + (random() - 0.5) * 1.9;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      const leafGradient = ctx.createLinearGradient(-length / 2, 0, length / 2, 0);
      leafGradient.addColorStop(0, random() > 0.45 ? "#263f2b" : "#455d3e");
      leafGradient.addColorStop(0.55, random() > 0.52 ? "#61705a" : "#3a5638");
      leafGradient.addColorStop(1, "#1f3526");
      ctx.fillStyle = leafGradient;
      ctx.beginPath();
      ctx.moveTo(-length / 2, 0);
      ctx.quadraticCurveTo(0, -width, length / 2, 0);
      ctx.quadraticCurveTo(0, width, -length / 2, 0);
      ctx.fill();
      ctx.strokeStyle = "rgba(185,189,145,.28)";
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(-length * 0.38, 0);
      ctx.lineTo(length * 0.38, 0);
      ctx.stroke();
      ctx.restore();
    }
  });
  oliveLeafTexture.wrapS = oliveLeafTexture.wrapT = THREE.ClampToEdgeWrapping;
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: 0xb2c1a5,
    map: oliveLeafTexture,
    alphaTest: 0.38,
    side: THREE.DoubleSide,
    roughness: 0.96,
  });
  // Alpha-cut foliage gets its silhouette from the texture, so two broad
  // quads are enough. The saved subdivisions pay for a gnarled trunk, tapered
  // limbs, and root flares without increasing the vegetation triangle budget.
  const oliveCardGeometry = new THREE.PlaneGeometry(2.1, 1.35, 2, 1);
  const oliveCardPositions = oliveCardGeometry.attributes.position;
  for (let index = 0; index < oliveCardPositions.count; index += 1) {
    const x = oliveCardPositions.getX(index);
    const y = oliveCardPositions.getY(index);
    oliveCardPositions.setZ(index, Math.sin(x * 2.1) * Math.cos(y * 2.8) * 0.065);
  }
  oliveCardGeometry.computeVertexNormals();
  const oliveTrunkGeometry = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.46, -2.15),
      new THREE.Vector2(0.36, -1.72),
      new THREE.Vector2(0.31, -0.96),
      new THREE.Vector2(0.38, -0.18),
      new THREE.Vector2(0.29, 0.62),
      new THREE.Vector2(0.25, 1.42),
      new THREE.Vector2(0.17, 2.15),
    ],
    9,
  );
  const oliveTrunkPositions = oliveTrunkGeometry.attributes.position;
  for (let index = 0; index < oliveTrunkPositions.count; index += 1) {
    const y = oliveTrunkPositions.getY(index);
    oliveTrunkPositions.setX(
      index,
      oliveTrunkPositions.getX(index) + Math.sin((y + 2.15) * 1.34) * 0.08,
    );
    oliveTrunkPositions.setZ(
      index,
      oliveTrunkPositions.getZ(index) + Math.sin((y + 2.15) * 1.91 + 0.7) * 0.055,
    );
  }
  oliveTrunkGeometry.computeVertexNormals();
  const oliveBranchGeometry = new THREE.CylinderGeometry(0.042, 0.14, 2.8, 7);
  const oliveRootGeometry = new THREE.CylinderGeometry(0.045, 0.24, 0.9, 6);
  [
    [104, -44], [105, 8], [103, 26], [-90, -46], [-91, -23], [-89, 21],
  ].forEach(([x, z], treeIndex) => {
    objectRenderBudget.oliveTrees.instances += 1;
    const trunk = new THREE.Mesh(oliveTrunkGeometry, darkTimber);
    trunk.position.set(x, 2.15, z);
    trunk.rotation.y = treeIndex * 0.73;
    trunk.castShadow = trunk.receiveShadow = true;
    trunk.name = "Gnarled olive trunk";
    root.add(trunk);
    objectRenderBudget.oliveTrees.trunks += 1;
    objectRenderBudget.oliveTrees.staticTriangles += geometryTriangles(oliveTrunkGeometry);
    for (let rootFlare = 0; rootFlare < 3; rootFlare += 1) {
      const rootAngle = treeIndex * 0.57 + rootFlare * Math.PI * 2 / 3;
      const flare = new THREE.Mesh(oliveRootGeometry, darkTimber);
      flare.position.set(
        x + Math.cos(rootAngle) * 0.27,
        0.3,
        z + Math.sin(rootAngle) * 0.27,
      );
      flare.rotation.z = Math.cos(rootAngle) * 0.98;
      flare.rotation.x = Math.sin(rootAngle) * -0.98;
      flare.castShadow = flare.receiveShadow = true;
      flare.name = "Olive root flare";
      root.add(flare);
      objectRenderBudget.oliveTrees.roots += 1;
      objectRenderBudget.oliveTrees.staticTriangles += geometryTriangles(oliveRootGeometry);
    }
    for (let branch = 0; branch < 4; branch += 1) {
      const angle = branch * Math.PI * 0.5 + 0.35;
      const limb = new THREE.Mesh(oliveBranchGeometry, darkTimber);
      limb.position.set(x + Math.cos(angle) * 0.58, 4.25, z + Math.sin(angle) * 0.58);
      limb.rotation.z = Math.cos(angle) * 0.55;
      limb.rotation.x = Math.sin(angle) * -0.55;
      limb.castShadow = limb.receiveShadow = true;
      limb.name = "Tapered olive branch";
      root.add(limb);
      objectRenderBudget.oliveTrees.branches += 1;
      objectRenderBudget.oliveTrees.staticTriangles += geometryTriangles(oliveBranchGeometry);
    }
    const clusters = [
      [0, 5.45, 0, 1.7, 0.75, 1.35],
      [-1.5, 4.95, 0.35, 1.35, 0.65, 1.1],
      [1.35, 5.0, -0.55, 1.45, 0.72, 1.15],
      [-0.45, 5.05, -1.25, 1.2, 0.62, 1.35],
      [0.7, 5.25, 1.25, 1.25, 0.65, 1.25],
    ];
    clusters.forEach(([ox, oy, oz, sx, sy, sz], clusterIndex) => {
      for (let card = 0; card < 3; card += 1) {
        const crown = new THREE.Mesh(oliveCardGeometry, leafMaterial);
        crown.scale.set(sx, sy * 1.7, sz);
        crown.position.set(
          x + ox + (card - 1) * 0.08,
          oy + (card % 2) * 0.08,
          z + oz,
        );
        crown.rotation.y = card * Math.PI / 3 + clusterIndex * 0.19;
        crown.rotation.x = card === 2 ? 0.48 : (card - 0.5) * 0.08;
        crown.castShadow = true;
        crown.receiveShadow = false;
        crown.name = "Olive leaf spray";
        root.add(crown);
        objectRenderBudget.oliveTrees.foliageCards += 1;
        objectRenderBudget.oliveTrees.staticTriangles += geometryTriangles(oliveCardGeometry);
      }
    });
  });

  const torchStandardGeometry = new THREE.CylinderGeometry(0.035, 0.06, 1.82, 6);
  const torchLegGeometry = new THREE.CylinderGeometry(0.024, 0.046, 0.82, 5);
  const torchFuelGeometry = new THREE.CylinderGeometry(0.035, 0.052, 0.48, 5);
  const torchBasketGeometry = new THREE.ConeGeometry(0.24, 0.28, 10, 1, true);
  const torchBasketRimGeometry = new THREE.TorusGeometry(0.24, 0.026, 4, 12);
  const torchProngGeometry = new THREE.CylinderGeometry(0.018, 0.023, 0.42, 5);
  const addTorch = (x, z, y = 2.4) => {
    objectRenderBudget.torches.instances += 1;
    const standard = new THREE.Mesh(torchStandardGeometry, agedIron);
    standard.position.set(x, y - 1.08, z);
    standard.name = "Tapered forged torch standard";
    root.add(standard);
    objectRenderBudget.torches.staticTriangles += geometryTriangles(torchStandardGeometry);
    for (let leg = 0; leg < 3; leg += 1) {
      const angle = leg * Math.PI * 2 / 3;
      const tripodLeg = new THREE.Mesh(torchLegGeometry, agedIron);
      tripodLeg.position.set(
        x + Math.cos(angle) * 0.19,
        y - 1.76,
        z + Math.sin(angle) * 0.19,
      );
      tripodLeg.rotation.z = Math.cos(angle) * 0.52;
      tripodLeg.rotation.x = Math.sin(angle) * -0.52;
      tripodLeg.name = "Forged torch tripod leg";
      root.add(tripodLeg);
      objectRenderBudget.torches.tripodLegs += 1;
      objectRenderBudget.torches.staticTriangles += geometryTriangles(torchLegGeometry);
    }
    const basket = new THREE.Mesh(
      torchBasketGeometry,
      bronze,
    );
    basket.rotation.z = Math.PI;
    basket.position.set(x, y - 0.18, z);
    basket.name = "Hammered torch basket";
    root.add(basket);
    objectRenderBudget.torches.staticTriangles += geometryTriangles(torchBasketGeometry);
    const basketRim = new THREE.Mesh(torchBasketRimGeometry, bronze);
    basketRim.rotation.x = Math.PI / 2;
    basketRim.position.set(x, y - 0.05, z);
    basketRim.name = "Torch basket rim";
    root.add(basketRim);
    objectRenderBudget.torches.staticTriangles += geometryTriangles(torchBasketRimGeometry);
    for (const direction of [-1, 1]) {
      const fuel = new THREE.Mesh(torchFuelGeometry, darkTimber);
      fuel.position.set(x, y - 0.02, z);
      fuel.rotation.z = direction * 0.72;
      fuel.rotation.x = direction * 0.18;
      fuel.name = "Charred brazier fuel";
      root.add(fuel);
      objectRenderBudget.torches.fuelPieces += 1;
      objectRenderBudget.torches.staticTriangles += geometryTriangles(torchFuelGeometry);
    }
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 2) {
      const prong = new THREE.Mesh(
        torchProngGeometry,
        agedIron,
      );
      prong.position.set(
        x + Math.cos(angle) * 0.19,
        y + 0.05,
        z + Math.sin(angle) * 0.19,
      );
      prong.rotation.z = Math.cos(angle) * -0.13;
      prong.rotation.x = Math.sin(angle) * 0.13;
      prong.name = "Torch basket prong";
      root.add(prong);
      objectRenderBudget.torches.staticTriangles += geometryTriangles(torchProngGeometry);
    }
    const flame = new THREE.Sprite(flameSpriteMaterial);
    flame.position.set(x, y + 0.17, z);
    flame.scale.set(0.62, 0.92, 1);
    flame.userData.dynamic = true;
    root.add(flame);
    const light = new THREE.PointLight(0xff9d42, 8, 10, 2);
    light.position.set(x, y + 0.1, z);
    root.add(light);
    objectRenderBudget.torches.pointLights += 1;
    flame.userData.animate = (time) => {
      const flicker = 0.82 + Math.sin(time * 8 + x) * 0.18;
      flame.scale.set(0.55 + flicker * 0.09, 0.78 + flicker * 0.18, 1);
      light.intensity = (6.5 + flicker * 2.8) * (1-daylightAmount*.95);
      flame.visible = daylightAmount < .8;
    };
    animated.push(flame);
  };
  [
    [88, -27], [88, -17], [-9, -37], [-9, -45], [18, -20], [18, 20],
    [38, 51], [40, 64], [-58, 58],
  ].forEach(([x, z]) => addTorch(x, z));

  // Atmospheric depth: sea haze, chimney smoke, dust motes, and harbour birds.
  const cloudTexture = canvasTexture(256, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    const puffs = [
      [0.25, 0.57, 0.28], [0.42, 0.46, 0.34], [0.61, 0.5, 0.31],
      [0.76, 0.61, 0.22], [0.5, 0.66, 0.38],
    ];
    for (const [x, y, radius] of puffs) {
      const gradient = ctx.createRadialGradient(x * s, y * s, 0, x * s, y * s, radius * s);
      gradient.addColorStop(0, "rgba(255,244,218,.58)");
      gradient.addColorStop(0.48, "rgba(224,224,210,.34)");
      gradient.addColorStop(1, "rgba(185,198,194,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, s, s);
    }
  });
  // Cloud sprites were disabled but still animated. Their soft texture now
  // serves a single batched chimney-smoke point system instead.
  const smokeSources = [
    [48, 8.4, -9], [-13, 7.4, 30], [68, 6.4, -7], [5, 7.4, 50],
  ];
  const smokePuffCount = smokeSources.length * 4;
  const smokePositions = new Float32Array(smokePuffCount * 3);
  const smokeMetadata = [];
  let smokeIndex = 0;
  smokeSources.forEach(([x, y, z], chimney) => {
    for (let puff = 0; puff < 4; puff += 1) {
      const phase = puff * 1.25 + chimney * 0.7;
      smokePositions[smokeIndex * 3] = x;
      smokePositions[smokeIndex * 3 + 1] = y + puff * 1.25;
      smokePositions[smokeIndex * 3 + 2] = z;
      smokeMetadata.push({ x, y, z, phase });
      smokeIndex += 1;
    }
  });
  const smokeGeometry = new THREE.BufferGeometry();
  smokeGeometry.setAttribute("position", new THREE.BufferAttribute(smokePositions, 3));
  const smoke = new THREE.Points(
    smokeGeometry,
    new THREE.PointsMaterial({
      map: cloudTexture,
      color: 0x777c77,
      size: 2.45,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.2,
      alphaTest: 0.025,
      depthWrite: false,
      fog: true,
    }),
  );
  smoke.name = "Cooking-fire smoke";
  smoke.frustumCulled = false;
  root.add(smoke);
  smoke.userData.animate = (time) => {
    const positions = smoke.geometry.attributes.position;
    smokeMetadata.forEach((puff, index) => {
      const lift = (time * 0.42 + puff.phase) % 6;
      positions.setXYZ(
        index,
        puff.x + lift * 0.16,
        puff.y + lift,
        puff.z + Math.sin(time * 0.31 + puff.phase) * 0.12,
      );
    });
    positions.needsUpdate = true;
  };
  animated.push(smoke);
  objectRenderBudget.atmosphere.smokePuffs = smokePuffCount;
  objectRenderBudget.atmosphere.smokeDraws = 1;
  objectRenderBudget.atmosphere.animatedSystems += 1;

  const dustCount = 260;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i += 1) {
    dustPositions[i * 3] = -90 + cityRandom() * 180;
    dustPositions[i * 3 + 1] = 0.35 + cityRandom() * 7;
    dustPositions[i * 3 + 2] = -70 + cityRandom() * 140;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(
    dustGeometry,
    new THREE.PointsMaterial({
      color: 0xffd59b,
      size: 0.04,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  dust.name = "Sunlit dust motes";
  root.add(dust);
  dust.userData.animate = (time) => {
    dust.rotation.y = time * 0.006;
    dust.position.y = Math.sin(time * 0.25) * 0.15;
  };
  animated.push(dust);
  objectRenderBudget.atmosphere.dustPoints = dustCount;
  objectRenderBudget.atmosphere.dustDraws = 1;
  objectRenderBudget.atmosphere.animatedSystems += 1;

  const birds = new THREE.Group();
  birds.position.set(64, 25, 59);
  birds.name = "Harbour gulls";
  root.add(birds);
  const gullGeometries = [];
  for (let i = 0; i < 9; i += 1) {
    const wingSpan = 0.55 + cityRandom() * 0.45;
    const wingLift = Math.sin(i * 1.7) * 0.14;
    const birdGeometry = new THREE.BufferGeometry();
    birdGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([
        0, 0.015, -0.24,
        -0.075, 0, 0,
        0, 0, 0.23,
        0.075, 0, 0,
        -wingSpan, wingLift, 0.015,
        -0.18, -0.09, 0.12,
        wingSpan, wingLift, 0.015,
        0.18, -0.09, 0.12,
      ], 3),
    );
    birdGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute([
        0.84, 0.82, 0.74,
        0.78, 0.77, 0.7,
        0.64, 0.64, 0.59,
        0.78, 0.77, 0.7,
        0.34, 0.36, 0.36,
        0.72, 0.72, 0.68,
        0.34, 0.36, 0.36,
        0.72, 0.72, 0.68,
      ], 3),
    );
    birdGeometry.setIndex([
      0, 1, 2, 0, 2, 3,
      1, 4, 5, 1, 5, 2,
      3, 2, 7, 3, 7, 6,
    ]);
    const birdMatrix = new THREE.Matrix4().compose(
      new THREE.Vector3(
        (cityRandom() - 0.5) * 22,
        cityRandom() * 8,
        (cityRandom() - 0.5) * 18,
      ),
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, cityRandom() * Math.PI * 2, 0),
      ),
      new THREE.Vector3(1, 1, 1),
    );
    birdGeometry.applyMatrix4(birdMatrix);
    gullGeometries.push(birdGeometry);
  }
  const gullGeometry = mergeGeometries(gullGeometries, false);
  gullGeometries.forEach((geometry) => geometry.dispose());
  const gullFlock = new THREE.Mesh(
    gullGeometry,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      fog: true,
    }),
  );
  gullFlock.name = "Merged filled harbour-gull flock";
  birds.add(gullFlock);
  birds.userData.animate = (time) => {
    birds.rotation.y = time * 0.07;
    birds.position.y = 25 + Math.sin(time * 0.42) * 1.2;
    birds.rotation.z = Math.sin(time * 0.19) * 0.025;
  };
  animated.push(birds);
  objectRenderBudget.atmosphere.gulls = 9;
  objectRenderBudget.atmosphere.gullDraws = 1;
  objectRenderBudget.atmosphere.gullTriangles = geometryTriangles(gullGeometry);
  objectRenderBudget.atmosphere.animatedSystems += 1;

  // Invisible outer limits and harbour safety volumes. Leave the landward
  // insertion open on St Anthony's road at the south-eastern edge of
  // Montmusard.
  addCollider([3, 8, 52], [128, 4, -106], false);
  addCollider([3, 8, 156], [128, 4, 16], false);
  addCollider([244, 8, 3], [6, 4, -134], false);

  // Compact residential infill: preserve lanes, courtyards and all interaction
  // approaches. Flat lime roofs and small courts vary the merchant skyline.
  const distanceToRoad = (x,z,[ax,az],[bx,bz]) => {
    const dx=bx-ax,dz=bz-az;
    const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
    return Math.hypot(x-ax-dx*t,z-az-dz*t);
  };
  const protectedPoints = [mission.target,mission.exfil,...entryRoutes.map(r=>r.arrival),
    ...tunnel.portals.map(p=>p.surface),...streetCover.map(c=>c.approach),...HISTORIC_STOPS];
  let infillCount=0;
  for (let z=-108;z<72;z+=13) for (let x=-89;x<85;x+=13) {
    if(infillCount>=28) break;
    const w=5.4+cityRandom()*1.2,d=5.2+cityRandom()*1.4,h=3.7+cityRandom()*2.4;
    const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([sx,sz])=>[x+sx*(w/2+2),z+sz*(d/2+2)]);
    if(!corners.every(p=>pointInPolygon(p,ACRE_PLAN.cityOutline)))continue;
    if(colliders.some(b=>b.max.y>0&&b.min.y<4&&x+w/2+2>b.min.x&&x-w/2-2<b.max.x&&z+d/2+2>b.min.z&&z-d/2-2<b.max.z))continue;
    if(protectedPoints.some(p=>Math.hypot(p.x-x,p.z-z)<9))continue;
    if(ACRE_PLAN.roads.some(r=>r.points.slice(1).some((p,i)=>distanceToRoad(x,z,r.points[i],p)<Math.max(w,d)/2+3.5)))continue;
    const group=new THREE.Group(); group.name="Reconstructed courtyard dwelling"; root.add(group);
    const material=plasterMaterials[infillCount%plasterMaterials.length];
    addBox({size:[w,h,d],position:[x,h/2,z],material,collider:true,parent:group});
    addBox({size:[w+.15,.45,d+.15],position:[x,.225,z],material:oldStone,parent:group});
    for(const side of [-1,1]) {
      addBox({size:[w,.55,.22],position:[x,h+.2,z+side*d/2],material:paleStone,parent:group});
      addBox({size:[.22,.55,d],position:[x+side*w/2,h+.2,z],material:paleStone,parent:group});
      addBox({size:[.68,1.1,.08],position:[x+side*w*.29,h*.7,z+d/2+.06],material:darkTimber,parent:group,shadows:false});
    }
    addBox({size:[1.15,2.1,.12],position:[x,1.05,z+d/2+.05],material:timber,parent:group,shadows:false});
    decorateHouse(group,{x,z,w,d,h},dressedStone,darkTimber);
    infillCount++;
  }

  const zones = [
    { name: "TEMPLAR TUNNEL", box: new THREE.Box3(new THREE.Vector3(-58, -7, 47), new THREE.Vector3(39, -1, 53)) },
    { name: "ST ANTHONY'S GATE", box: new THREE.Box3(new THREE.Vector3(72, -2, -84), new THREE.Vector3(126, 12, -61)) },
    { name: "MONTMUSART", box: new THREE.Box3(new THREE.Vector3(-102, -2, -126), new THREE.Vector3(92, 12, -63)) },
    { name: "HOSPITALLER QUARTER", box: new THREE.Box3(new THREE.Vector3(-58, -2, -63), new THREE.Vector3(-5, 14, -23)) },
    { name: "TEMPLAR QUARTER", box: new THREE.Box3(new THREE.Vector3(-98, -2, 34), new THREE.Vector3(-48, 15, 80)) },
    { name: "PISAN QUARTER", box: new THREE.Box3(new THREE.Vector3(-58, -2, 31), new THREE.Vector3(40, 10, 80)) },
    { name: "CATHEDRAL CLOSE", box: new THREE.Box3(new THREE.Vector3(-52, -2, -24), new THREE.Vector3(2, 15, 21)) },
    { name: "GENOESE QUARTER", box: new THREE.Box3(new THREE.Vector3(-68, -2, -22), new THREE.Vector3(7, 10, 38)) },
    { name: "VENETIAN QUARTER", box: new THREE.Box3(new THREE.Vector3(1, -2, -21), new THREE.Vector3(87, 12, 43)) },
    { name: "INNER HARBOUR", box: new THREE.Box3(new THREE.Vector3(38, -2, 41), new THREE.Vector3(92, 12, 80)) },
  ];

  // The authored city is made from thousands of modular pieces. Merge static
  // pieces by material so the reflective sea, shadow map and main view render
  // the same detail with a small fraction of the draw-call overhead.
  root.updateMatrixWorld(true);
  const staticBatches = new Map();
  const staticMeshes = [];
  const isAnimatedHierarchy = (object) => {
    let current = object;
    while (current && current !== root) {
      if (current.userData.animate || current.userData.dynamic) return true;
      current = current.parent;
    }
    return false;
  };
  root.traverse((object) => {
    if (
      !object.isMesh ||
      object.isInstancedMesh ||
      Array.isArray(object.material) ||
      isAnimatedHierarchy(object)
    ) return;
    const attributes = Object.keys(object.geometry.attributes).sort().join(",");
    const key = `${object.material.uuid}:${object.geometry.index ? "indexed" : "plain"}:${attributes}`;
    if (!staticBatches.has(key)) {
      staticBatches.set(key, {
        material: object.material,
        geometries: [],
        castShadow: false,
        receiveShadow: false,
      });
    }
    const batch = staticBatches.get(key);
    const geometry = object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld);
    batch.geometries.push(geometry);
    batch.castShadow ||= object.castShadow;
    batch.receiveShadow ||= object.receiveShadow;
    staticMeshes.push(object);
  });
  staticMeshes.forEach((mesh) => {
    mesh.removeFromParent();
    mesh.geometry.dispose();
  });
  const renderBudget = {
    sourceStaticMeshes: staticMeshes.length,
    staticBatches: 0,
    staticTriangles: 0,
    staticVertices: 0,
  };
  for (const batch of staticBatches.values()) {
    if (!batch.geometries.length) continue;
    const geometry = batch.geometries.length === 1
      ? batch.geometries[0]
      : mergeGeometries(batch.geometries, false);
    if (!geometry) continue;
    renderBudget.staticBatches += 1;
    renderBudget.staticVertices += geometry.attributes.position.count;
    renderBudget.staticTriangles += geometry.index
      ? geometry.index.count / 3
      : geometry.attributes.position.count / 3;
    const mesh = new THREE.Mesh(geometry, batch.material);
    mesh.castShadow = batch.castShadow;
    mesh.receiveShadow = batch.receiveShadow;
    mesh.name = `Static city batch: ${batch.material.name || batch.material.type}`;
    root.add(mesh);
  }

  return {
    colliders,
    setDaylight(value) {
      daylightAmount = value;
      waterMaterial.color.setRGB(0.012+value*.025,0.122+value*.19,0.196+value*.23);
      birds.visible = value > .12;
    },
    isDryLand: (x, z) => pointInPolygon([x, z], ACRE_PLAN.cityOutline)
      || pointInPolygon([x, z], ACRE_PLAN.mainland)
      || (x >= 30 && x <= 54 && z >= 61.1 && z <= 66.9),
    spawnPoints: entryRoutes.map((route) => route.spawn.clone()),
    enemySpawns: [
      ...mission.guardSpawns.map((position) => position.clone()),
      ...mission.wallGuardSpawns.map((guard) => guard.position.clone()),
    ],
    pickups,
    movableProps,
    animated,
    bounds,
    mission,
    entryRoutes,
    tunnel,
    zones,
    streetCover,
    streetStories,
    renderBudget,
    vesselRenderBudget,
    objectRenderBudget,
    infillCount,
    surfaceTextures: [stoneTexture,stoneNormal,cobbleTexture,cobbleNormal,plasterTexture,plasterNormal],
    textureResolution: highDetailTextures ? 2048 : 1024,
  };
}
