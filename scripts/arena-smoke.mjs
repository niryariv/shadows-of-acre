import * as THREE from "three";
import { createServer } from "vite";

const noop = () => {};
const gradient = { addColorStop: noop };
const mergeDiagnostics = [];
const originalConsoleError = console.error;
console.error = (...args) => {
  const message = args.map(String).join(" ");
  if (message.includes("BufferGeometryUtils") && message.includes("mergeGeometries")) {
    mergeDiagnostics.push(message);
  }
  originalConsoleError(...args);
};
const context = new Proxy(
  {
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
  },
  {
    get(target, property) {
      if (property in target) return target[property];
      return noop;
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    },
  },
);

class MockImage {
  listeners = new Map();

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  removeEventListener(type) {
    this.listeners.delete(type);
  }

  set src(value) {
    this.currentSrc = value;
    queueMicrotask(() => this.listeners.get("load")?.());
  }
}

globalThis.document = {
  createElement(type) {
    if (type === "canvas") {
      return {
        width: 1,
        height: 1,
        getContext: () => context,
      };
    }
    return new MockImage();
  },
  createElementNS() {
    return new MockImage();
  },
};

const vite = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true, hmr: false },
});

try {
  const { buildArena, mergeGeometries } = await vite.ssrLoadModule("/src/arena.js");
  const { ACRE_PLAN, pointInPolygon } = await vite.ssrLoadModule("/src/acre-plan.js");
  const mixedMergeIndexed = new THREE.BoxGeometry(1, 1, 1);
  const mixedMergePlain = new THREE.PlaneGeometry(1, 1).toNonIndexed();
  const mixedMergeResult = mergeGeometries([
    mixedMergeIndexed,
    mixedMergePlain,
  ]);
  if (!mixedMergeResult?.attributes.position || mixedMergeResult.index) {
    throw new Error("Mixed-index geometry normalization regressed");
  }
  mixedMergeIndexed.dispose();
  mixedMergePlain.dispose();
  mixedMergeResult.dispose();

  const scene = new THREE.Scene();
  const arena = buildArena(THREE, scene);
  const missingGeometryMeshes = [];
  scene.traverse((object) => {
    if (object.isMesh && !object.geometry) {
      missingGeometryMeshes.push(object.name || object.type);
    }
  });
  if (missingGeometryMeshes.length) {
    throw new Error(
      `Meshes have missing geometry: ${missingGeometryMeshes.join(", ")}`,
    );
  }
  if (mergeDiagnostics.length) {
    throw new Error(
      `Three.js geometry merge diagnostics: ${mergeDiagnostics.join(" | ")}`,
    );
  }
  const budget = arena.renderBudget;

  if (!budget || budget.staticBatches <= 0 || budget.staticTriangles <= 0) {
    throw new Error("Static city batching did not produce a valid render budget");
  }
  if (budget.staticBatches > 40) {
    throw new Error(`Static draw-call budget regressed: ${budget.staticBatches} batches`);
  }
  if (budget.sourceStaticMeshes > 4200) {
    throw new Error(
      `Static source-mesh budget regressed: ${budget.sourceStaticMeshes} meshes`,
    );
  }
  if (budget.staticTriangles > 110000) {
    throw new Error(`Static triangle budget regressed: ${budget.staticTriangles} triangles`);
  }
  if (!arena.colliders.length || !arena.entryRoutes.length || !arena.zones.length) {
    throw new Error("Arena navigation metadata is incomplete");
  }
  if (
    arena.vesselRenderBudget.merchantVessel.draws > 4 ||
    arena.vesselRenderBudget.extractionSkiff.draws > 1
  ) {
    throw new Error(
      `Animated vessel draw budget regressed: ${JSON.stringify(arena.vesselRenderBudget)}`,
    );
  }
  const objectBudget = arena.objectRenderBudget;
  if (
    arena.movableProps.length !== 4 ||
    objectBudget.movableProps.instances !== 4 ||
    objectBudget.movableProps.amphorae !== 2 ||
    objectBudget.movableProps.tradeCrates !== 2 ||
    objectBudget.movableProps.sourceMeshes > 42 ||
    objectBudget.movableProps.dynamicDraws > 10 ||
    arena.movableProps.some(
      (prop) =>
        !prop.userData.dynamic ||
        !prop.userData.movable ||
        prop.userData.movable.radius <= 0 ||
        prop.userData.movable.noise <= 0,
    )
  ) {
    throw new Error(
      `Movable-prop construction regressed: ${JSON.stringify(
        objectBudget?.movableProps,
      )}`,
    );
  }
  if (
    !objectBudget ||
    objectBudget.entryProps.skiffs !== 3 ||
    objectBudget.entryProps.hulls !== 3 ||
    objectBudget.entryProps.floorPlanks !== 15 ||
    objectBudget.entryProps.thwarts !== 9 ||
    objectBudget.entryProps.gunwales !== 6 ||
    objectBudget.entryProps.stemPosts !== 6 ||
    objectBudget.entryProps.oars !== 3 ||
    objectBudget.entryProps.rowlocks !== 6 ||
    objectBudget.entryProps.ropeRuns !== 2 ||
    objectBudget.entryProps.ropeKnots !== 10 ||
    objectBudget.entryProps.breachStones !== 8
  ) {
    throw new Error(
      `Entry-prop construction regressed: ${JSON.stringify(objectBudget?.entryProps)}`,
    );
  }
  if (objectBudget.entryProps.renderedTriangles > 2250) {
    throw new Error(
      `Entry-prop triangle budget regressed: ${objectBudget.entryProps.renderedTriangles}`,
    );
  }
  if (
    objectBudget.mooringFixtures.posts !== 6 ||
    objectBudget.mooringFixtures.ropeCoils !== 3 ||
    objectBudget.mooringFixtures.looseTails !== 3
  ) {
    throw new Error(
      `Mooring-fixture construction regressed: ${JSON.stringify(objectBudget?.mooringFixtures)}`,
    );
  }
  if (objectBudget.mooringFixtures.staticTriangles > 564) {
    throw new Error(
      `Mooring-fixture triangle budget regressed: ${objectBudget.mooringFixtures.staticTriangles}`,
    );
  }
  if (
    objectBudget.fishingGear.netFrames !== 1 ||
    objectBudget.fishingGear.dryingPosts !== 2 ||
    objectBudget.fishingGear.netSegments !== 93 ||
    objectBudget.fishingGear.sinkers !== 5
  ) {
    throw new Error(
      `Fishing-gear construction regressed: ${
        JSON.stringify(objectBudget?.fishingGear)
      }`,
    );
  }
  if (objectBudget.fishingGear.staticTriangles > 21) {
    throw new Error(
      `Fishing-gear triangle budget regressed: ${
        objectBudget.fishingGear.staticTriangles
      }`,
    );
  }
  if (
    objectBudget.landscape.approachRocks !== 18 ||
    objectBudget.landscape.shorelineRocks !== 50 ||
    objectBudget.landscape.scrubClusters !== 39
  ) {
    throw new Error(
      `Exterior landscape construction regressed: ${JSON.stringify(objectBudget?.landscape)}`,
    );
  }
  if (objectBudget.landscape.renderedTriangles > 3000) {
    throw new Error(
      `Exterior landscape triangle budget regressed: ${objectBudget.landscape.renderedTriangles}`,
    );
  }
  if (
    objectBudget.tunnelLamps.instances !== 7 ||
    objectBudget.tunnelLamps.wallPlates !== 7 ||
    objectBudget.tunnelLamps.bracketArms !== 7 ||
    objectBudget.tunnelLamps.bowls !== 7 ||
    objectBudget.tunnelLamps.spouts !== 7 ||
    objectBudget.tunnelLamps.handles !== 7 ||
    objectBudget.tunnelLamps.wicks !== 7 ||
    objectBudget.tunnelLamps.pointLights !== 7
  ) {
    throw new Error(
      `Tunnel-lamp construction regressed: ${JSON.stringify(objectBudget.tunnelLamps)}`,
    );
  }
  if (objectBudget.tunnelLamps.staticTriangles > 2200) {
    throw new Error(
      `Tunnel-lamp triangle budget regressed: ${objectBudget.tunnelLamps.staticTriangles}`,
    );
  }
  if (
    objectBudget.textiles.banners !== 3 ||
    objectBudget.textiles.bannerRails !== 3 ||
    objectBudget.textiles.awningCanopies !== 5 ||
    objectBudget.textiles.awningValances !== 5 ||
    objectBudget.textiles.awningPoles !== 10 ||
    objectBudget.textiles.awningPoleMeshes !== 5 ||
    objectBudget.textiles.awningLashings !== 10 ||
    objectBudget.textiles.awningCordSegments !== 10 ||
    objectBudget.textiles.awningCordDraws !== 1 ||
    objectBudget.textiles.dryingSheets !== 1 ||
    objectBudget.textiles.clotheslines !== 1
  ) {
    throw new Error(
      `Textile construction regressed: ${JSON.stringify(objectBudget.textiles)}`,
    );
  }
  if (objectBudget.textiles.staticTriangles > 804) {
    throw new Error(
      `Textile triangle budget regressed: ${objectBudget.textiles.staticTriangles}`,
    );
  }
  if (
    objectBudget.atmosphere.cloudDraws !== 0 ||
    objectBudget.atmosphere.smokePuffs !== 16 ||
    objectBudget.atmosphere.smokeDraws !== 1 ||
    objectBudget.atmosphere.dustPoints !== 260 ||
    objectBudget.atmosphere.dustDraws !== 1 ||
    objectBudget.atmosphere.gulls !== 9 ||
    objectBudget.atmosphere.gullDraws !== 1 ||
    objectBudget.atmosphere.animatedSystems !== 3
  ) {
    throw new Error(
      `Atmospheric-object construction regressed: ${JSON.stringify(objectBudget.atmosphere)}`,
    );
  }
  if (objectBudget.atmosphere.gullTriangles > 54) {
    throw new Error(
      `Harbour-gull triangle budget regressed: ${objectBudget.atmosphere.gullTriangles}`,
    );
  }
  if (
    objectBudget.marketGoods.producePieces !== 28 ||
    objectBudget.marketGoods.produceStems !== 28 ||
    objectBudget.marketGoods.sugarMolds !== 4 ||
    objectBudget.marketGoods.sugarRims !== 4 ||
    objectBudget.marketGoods.sugarOpenings !== 4
  ) {
    throw new Error(
      `Market-goods construction regressed: ${JSON.stringify(objectBudget.marketGoods)}`,
    );
  }
  if (
    objectBudget.marketGoods.produceTriangles > 1568 ||
    objectBudget.marketGoods.sugarTriangles > 376
  ) {
    throw new Error(
      `Market-goods triangle budget regressed: ${JSON.stringify(objectBudget.marketGoods)}`,
    );
  }
  if (
    objectBudget.baskets.instances !== 4 ||
    objectBudget.baskets.bodies !== 4 ||
    objectBudget.baskets.rims !== 4 ||
    objectBudget.baskets.baseRings !== 4 ||
    objectBudget.baskets.handles !== 4 ||
    objectBudget.baskets.ribs !== 32
  ) {
    throw new Error(
      `Produce-basket construction regressed: ${JSON.stringify(objectBudget?.baskets)}`,
    );
  }
  if (objectBudget.baskets.staticTriangles > 1408) {
    throw new Error(
      `Produce-basket triangle budget regressed: ${objectBudget.baskets.staticTriangles}`,
    );
  }
  if (
    objectBudget.amphorae.instances !== 30 ||
    objectBudget.amphorae.bodies !== 30 ||
    objectBudget.amphorae.rims !== 30 ||
    objectBudget.amphorae.handles !== 60 ||
    objectBudget.amphorae.openings !== 30
  ) {
    throw new Error(
      `Amphora construction regressed: ${JSON.stringify(objectBudget?.amphorae)}`,
    );
  }
  if (objectBudget.amphorae.staticTriangles > 10980) {
    throw new Error(
      `Amphora triangle budget regressed: ${objectBudget.amphorae.staticTriangles}`,
    );
  }
  if (
    objectBudget.tradeCrates.instances !== 6 ||
    objectBudget.tradeCrates.bodyPlanks !== 30 ||
    objectBudget.tradeCrates.lidPlanks !== 24 ||
    objectBudget.tradeCrates.edgeBattens !== 12 ||
    objectBudget.tradeCrates.crossBattens !== 12 ||
    objectBudget.tradeCrates.diagonalBraces !== 12 ||
    objectBudget.tradeCrates.nails !== 48
  ) {
    throw new Error(
      `Merchant-crate construction regressed: ${JSON.stringify(objectBudget?.tradeCrates)}`,
    );
  }
  if (objectBudget.tradeCrates.staticTriangles > 1320) {
    throw new Error(
      `Merchant-crate triangle budget regressed: ${objectBudget.tradeCrates.staticTriangles}`,
    );
  }
  if (
    objectBudget.shutters.materialVariants !== 2 ||
    objectBudget.shutters.textureSize !== 128 ||
    objectBudget.shutters.frontLeaves !== 170 ||
    objectBudget.shutters.sideLeaves !== 304
  ) {
    throw new Error(
      `City-shutter construction regressed: ${JSON.stringify(objectBudget?.shutters)}`,
    );
  }
  if (objectBudget.shutters.staticTriangles > 5712) {
    throw new Error(
      `City-shutter triangle budget regressed: ${objectBudget.shutters.staticTriangles}`,
    );
  }
  if (
    objectBudget.doors.instances !== 34 ||
    objectBudget.doors.bodyPlanks !== 170 ||
    objectBudget.doors.hingeStraps !== 102 ||
    objectBudget.doors.rivets !== 102 ||
    objectBudget.doors.pullRings !== 34 ||
    objectBudget.doors.footRails !== 34
  ) {
    throw new Error(
      `Street-door construction regressed: ${JSON.stringify(objectBudget?.doors)}`,
    );
  }
  if (objectBudget.doors.staticTriangles > 4794) {
    throw new Error(
      `Street-door triangle budget regressed: ${objectBudget.doors.staticTriangles}`,
    );
  }
  if (
    objectBudget.windowGrilles.instances !== 85 ||
    objectBudget.windowGrilles.verticalBars !== 255 ||
    objectBudget.windowGrilles.horizontalBars !== 170
  ) {
    throw new Error(
      `Window-grille construction regressed: ${JSON.stringify(objectBudget?.windowGrilles)}`,
    );
  }
  if (objectBudget.windowGrilles.staticTriangles > 860) {
    throw new Error(
      `Window-grille triangle budget regressed: ${objectBudget.windowGrilles.staticTriangles}`,
    );
  }
  if (
    objectBudget.balconies.instances !== 8 ||
    objectBudget.balconies.deckPlanks !== 24 ||
    objectBudget.balconies.corbels !== 24 ||
    objectBudget.balconies.railPosts !== 32 ||
    objectBudget.balconies.crossBraces !== 48 ||
    objectBudget.balconies.topRails !== 8
  ) {
    throw new Error(
      `Townhouse-balcony construction regressed: ${
        JSON.stringify(objectBudget?.balconies)
      }`,
    );
  }
  if (objectBudget.balconies.staticTriangles > 1152) {
    throw new Error(
      `Townhouse-balcony triangle budget regressed: ${
        objectBudget.balconies.staticTriangles
      }`,
    );
  }
  if (
    objectBudget.roofDrainage.spouts !== 17 ||
    objectBudget.roofDrainage.troughSurfaces !== 51
  ) {
    throw new Error(
      `Roof-drainage construction regressed: ${
        JSON.stringify(objectBudget?.roofDrainage)
      }`,
    );
  }
  if (objectBudget.roofDrainage.staticTriangles > 102) {
    throw new Error(
      `Roof-drainage triangle budget regressed: ${
        objectBudget.roofDrainage.staticTriangles
      }`,
    );
  }
  if (
    objectBudget.roofParapets.flatRoofs !== 17 ||
    objectBudget.roofParapets.sections !== 68
  ) {
    throw new Error(
      `Roof-parapet construction regressed: ${
        JSON.stringify(objectBudget?.roofParapets)
      }`,
    );
  }
  if (objectBudget.roofParapets.staticTriangles > 816) {
    throw new Error(
      `Roof-parapet triangle budget regressed: ${
        objectBudget.roofParapets.staticTriangles
      }`,
    );
  }
  if (
    objectBudget.chimneys.instances !== 12 ||
    objectBudget.chimneys.masonryBodies !== 12 ||
    objectBudget.chimneys.capCourses !== 12 ||
    objectBudget.chimneys.sootOpenings !== 12
  ) {
    throw new Error(
      `Rooftop-chimney construction regressed: ${
        JSON.stringify(objectBudget?.chimneys)
      }`,
    );
  }
  if (objectBudget.chimneys.staticTriangles > 320) {
    throw new Error(
      `Rooftop-chimney triangle budget regressed: ${
        objectBudget.chimneys.staticTriangles
      }`,
    );
  }
  if (
    objectBudget.marketRoof.instances !== 1 ||
    objectBudget.marketRoof.boardPlanks !== 21 ||
    objectBudget.marketRoof.visibleSurfaces !== 42
  ) {
    throw new Error(
      `Genoese-market-roof construction regressed: ${
        JSON.stringify(objectBudget?.marketRoof)
      }`,
    );
  }
  if (objectBudget.marketRoof.staticTriangles > 84) {
    throw new Error(
      `Genoese-market-roof triangle budget regressed: ${
        objectBudget.marketRoof.staticTriangles
      }`,
    );
  }
  if (
    objectBudget.towerDetails.towers !== 9 ||
    objectBudget.towerDetails.crossletSlits !== 54 ||
    objectBudget.towerDetails.slitSurfaces !== 108
  ) {
    throw new Error(
      `Tower-detail construction regressed: ${
        JSON.stringify(objectBudget?.towerDetails)
      }`,
    );
  }
  if (objectBudget.towerDetails.staticTriangles > 220) {
    throw new Error(
      `Tower-detail triangle budget regressed: ${
        objectBudget.towerDetails.staticTriangles
      }`,
    );
  }
  if (
    objectBudget.crenellations.runs < 8 ||
    objectBudget.crenellations.merlons < 160
  ) {
    throw new Error(
      `Battlement construction regressed: ${
        JSON.stringify(objectBudget?.crenellations)
      }`,
    );
  }
  if (objectBudget.crenellations.staticTriangles > 2100) {
    throw new Error(
      `Battlement triangle budget regressed: ${
        objectBudget.crenellations.staticTriangles
      }`,
    );
  }
  if (
    objectBudget.wallDetails.wallRuns < 18 ||
    objectBudget.wallDetails.lancetSlits < 8
  ) {
    throw new Error(
      `Defensive-wall-detail construction regressed: ${
        JSON.stringify(objectBudget?.wallDetails)
      }`,
    );
  }
  if (objectBudget.wallDetails.staticTriangles > 102) {
    throw new Error(
      `Defensive-wall-detail triangle budget regressed: ${
        objectBudget.wallDetails.staticTriangles
      }`,
    );
  }
  if (
    objectBudget.gateDetails.landGateButtresses !== 2 ||
    objectBudget.gateDetails.landGateButtressMeshes !== 1 ||
    objectBudget.gateDetails.templarGateRecesses !== 1 ||
    objectBudget.gateDetails.portcullisUprights !== 7 ||
    objectBudget.gateDetails.portcullisCrossrails !== 3
  ) {
    throw new Error(
      `Gate-detail construction regressed: ${
        JSON.stringify(objectBudget?.gateDetails)
      }`,
    );
  }
  if (objectBudget.gateDetails.staticTriangles > 46) {
    throw new Error(
      `Gate-detail triangle budget regressed: ${
        objectBudget.gateDetails.staticTriangles
      }`,
    );
  }
  if (
    objectBudget.cargoCover.chests !== 5 ||
    objectBudget.cargoCover.chestLids !== 5 ||
    objectBudget.cargoCover.chestBindings !== 10 ||
    objectBudget.cargoCover.chestKnots !== 10 ||
    objectBudget.cargoCover.clothBales !== 3 ||
    objectBudget.cargoCover.baleBindings !== 6
  ) {
    throw new Error(
      `Cargo-cover construction regressed: ${JSON.stringify(objectBudget.cargoCover)}`,
    );
  }
  if (objectBudget.cargoCover.staticTriangles > 1476) {
    throw new Error(
      `Cargo-cover triangle budget regressed: ${objectBudget.cargoCover.staticTriangles}`,
    );
  }
  if (
    objectBudget.barrels.instances !== 5 ||
    objectBudget.barrels.bodies !== 5 ||
    objectBudget.barrels.heads !== 10 ||
    objectBudget.barrels.hoops !== 15 ||
    objectBudget.barrels.staveSeams !== 40 ||
    objectBudget.barrels.bungs !== 5
  ) {
    throw new Error(
      `Barrel construction regressed: ${JSON.stringify(objectBudget.barrels)}`,
    );
  }
  if (objectBudget.barrels.staticTriangles > 3920) {
    throw new Error(
      `Barrel triangle budget regressed: ${objectBudget.barrels.staticTriangles}`,
    );
  }
  if (
    objectBudget.sacks.instances !== 5 ||
    objectBudget.sacks.bodies !== 5 ||
    objectBudget.sacks.ties !== 5 ||
    objectBudget.sacks.cordTails !== 10 ||
    objectBudget.sacks.openings !== 5
  ) {
    throw new Error(
      `Grain-sack construction regressed: ${JSON.stringify(objectBudget?.sacks)}`,
    );
  }
  if (objectBudget.sacks.staticTriangles > 1350) {
    throw new Error(
      `Grain-sack triangle budget regressed: ${objectBudget.sacks.staticTriangles}`,
    );
  }
  if (
    objectBudget.handcart.instances !== 1 ||
    objectBudget.handcart.bedPlanks !== 5 ||
    objectBudget.handcart.sideRails !== 2 ||
    objectBudget.handcart.sideStakes !== 6 ||
    objectBudget.handcart.headboardSlats !== 3 ||
    objectBudget.handcart.carryingShafts !== 2 ||
    objectBudget.handcart.axles !== 1 ||
    objectBudget.handcart.wheelRims !== 2 ||
    objectBudget.handcart.ironTires !== 2 ||
    objectBudget.handcart.spokes !== 12 ||
    objectBudget.handcart.hubs !== 2 ||
    objectBudget.handcart.linchpins !== 2
  ) {
    throw new Error(
      `Handcart construction regressed: ${JSON.stringify(objectBudget?.handcart)}`,
    );
  }
  if (objectBudget.handcart.staticTriangles > 592) {
    throw new Error(
      `Handcart triangle budget regressed: ${objectBudget.handcart.staticTriangles}`,
    );
  }
  if (
    objectBudget.well.instances !== 1 ||
    objectBudget.well.outerWalls !== 1 ||
    objectBudget.well.innerWalls !== 1 ||
    objectBudget.well.copingRings !== 1 ||
    objectBudget.well.shaftShadows !== 1 ||
    objectBudget.well.framePosts !== 2 ||
    objectBudget.well.crossbars !== 1 ||
    objectBudget.well.drums !== 1 ||
    objectBudget.well.axles !== 1 ||
    objectBudget.well.ropes !== 1 ||
    objectBudget.well.crankArms !== 1 ||
    objectBudget.well.crankGrips !== 1
  ) {
    throw new Error(
      `Hospitaller-well construction regressed: ${JSON.stringify(objectBudget?.well)}`,
    );
  }
  if (objectBudget.well.staticTriangles > 208) {
    throw new Error(
      `Hospitaller-well triangle budget regressed: ${objectBudget.well.staticTriangles}`,
    );
  }
  if (
    objectBudget.courtyardPool.instances !== 1 ||
    objectBudget.courtyardPool.copingSections !== 4 ||
    objectBudget.courtyardPool.outerWalls !== 4 ||
    objectBudget.courtyardPool.innerWalls !== 4 ||
    objectBudget.courtyardPool.waterSurfaces !== 1
  ) {
    throw new Error(
      `Courtyard-pool construction regressed: ${
        JSON.stringify(objectBudget?.courtyardPool)
      }`,
    );
  }
  if (objectBudget.courtyardPool.staticTriangles > 26) {
    throw new Error(
      `Courtyard-pool triangle budget regressed: ${
        objectBudget.courtyardPool.staticTriangles
      }`,
    );
  }
  if (
    objectBudget.courtyardBenches.instances !== 2 ||
    objectBudget.courtyardBenches.seatPlanks !== 6 ||
    objectBudget.courtyardBenches.legs !== 4 ||
    objectBudget.courtyardBenches.backPosts !== 4 ||
    objectBudget.courtyardBenches.diagonalBraces !== 4 ||
    objectBudget.courtyardBenches.backrestPlanks !== 4
  ) {
    throw new Error(
      `Courtyard-bench construction regressed: ${
        JSON.stringify(objectBudget?.courtyardBenches)
      }`,
    );
  }
  if (objectBudget.courtyardBenches.staticTriangles > 224) {
    throw new Error(
      `Courtyard-bench triangle budget regressed: ${
        objectBudget.courtyardBenches.staticTriangles
      }`,
    );
  }
  if (
    objectBudget.harbourCranes.instances !== 2 ||
    objectBudget.harbourCranes.trestleLegs !== 4 ||
    objectBudget.harbourCranes.booms !== 2 ||
    objectBudget.harbourCranes.headBeams !== 2 ||
    objectBudget.harbourCranes.braces !== 4 ||
    objectBudget.harbourCranes.drums !== 2 ||
    objectBudget.harbourCranes.axles !== 2 ||
    objectBudget.harbourCranes.windingRims !== 2 ||
    objectBudget.harbourCranes.windingSpokes !== 12 ||
    objectBudget.harbourCranes.windingHubs !== 2 ||
    objectBudget.harbourCranes.pulleyCheeks !== 4 ||
    objectBudget.harbourCranes.pulleyWheels !== 2 ||
    objectBudget.harbourCranes.pulleyGrooves !== 2 ||
    objectBudget.harbourCranes.pulleyPins !== 2 ||
    objectBudget.harbourCranes.runningRopes !== 2 ||
    objectBudget.harbourCranes.liftingRopes !== 2 ||
    objectBudget.harbourCranes.cargoBales !== 2 ||
    objectBudget.harbourCranes.slingLegs !== 8 ||
    objectBudget.harbourCranes.hooks !== 2
  ) {
    throw new Error(
      `Harbour-crane construction regressed: ${JSON.stringify(objectBudget?.harbourCranes)}`,
    );
  }
  if (objectBudget.harbourCranes.staticTriangles > 1140) {
    throw new Error(
      `Harbour-crane triangle budget regressed: ${objectBudget.harbourCranes.staticTriangles}`,
    );
  }
  if (
    objectBudget.oliveTrees.instances !== 6 ||
    objectBudget.oliveTrees.trunks !== 6 ||
    objectBudget.oliveTrees.roots !== 18 ||
    objectBudget.oliveTrees.branches !== 24 ||
    objectBudget.oliveTrees.foliageCards !== 90
  ) {
    throw new Error(
      `Olive-tree construction regressed: ${JSON.stringify(objectBudget?.oliveTrees)}`,
    );
  }
  if (objectBudget.oliveTrees.staticTriangles > 2200) {
    throw new Error(
      `Olive-tree triangle budget regressed: ${objectBudget.oliveTrees.staticTriangles}`,
    );
  }
  if (
    objectBudget.torches.instances !== 9 ||
    objectBudget.torches.tripodLegs !== 27 ||
    objectBudget.torches.fuelPieces !== 18 ||
    objectBudget.torches.pointLights !== 9
  ) {
    throw new Error(
      `Torch construction regressed: ${JSON.stringify(objectBudget.torches)}`,
    );
  }
  if (objectBudget.torches.staticTriangles > 3000) {
    throw new Error(
      `Torch triangle budget regressed: ${objectBudget.torches.staticTriangles}`,
    );
  }

  const playerHeight = 1.72;
  const playerRadius = 0.46;
  const blockedAt = (position) => {
    const minY = position.y - playerHeight;
    return arena.colliders.some(
      (box) =>
        position.x + playerRadius > box.min.x &&
        position.x - playerRadius < box.max.x &&
        position.z + playerRadius > box.min.z &&
        position.z - playerRadius < box.max.z &&
        position.y > box.min.y &&
        minY < box.max.y,
    );
  };
  const blockedEntryAnchors = arena.entryRoutes
    .flatMap((route) => {
      const anchors = [
        [route.id, "spawn", route.spawn],
        [route.id, "arrival", route.arrival],
      ];
      if (route.exterior) {
        anchors.push([
          route.id,
          "exterior",
          new THREE.Vector3(
            route.exterior.x,
            route.exterior.y + playerHeight,
            route.exterior.z,
          ),
        ]);
      }
      return anchors;
    })
    .filter(([, , position]) => blockedAt(position))
    .map(([routeId, anchor]) => `${routeId}:${anchor}`);
  if (blockedEntryAnchors.length) {
    throw new Error(`Blocked entry anchors: ${blockedEntryAnchors.join(", ")}`);
  }

  const oldWallZ = ACRE_PLAN.oldCityWall[0][1];
  const westMontmusardReach = oldWallZ - ACRE_PLAN.montmusardOuterWall[0][1];
  const eastMontmusardReach = oldWallZ
    - ACRE_PLAN.montmusardOuterWall.at(-1)[1];
  if (
    westMontmusardReach < 50 ||
    eastMontmusardReach > 20 ||
    ACRE_PLAN.landmarks.hospitaller[1] >= ACRE_PLAN.landmarks.genoeseCommune[1] ||
    ACRE_PLAN.landmarks.templar[0] >= ACRE_PLAN.landmarks.pisanFondaco[0] ||
    !pointInPolygon(ACRE_PLAN.landmarks.hospitaller, ACRE_PLAN.cityOutline) ||
    !pointInPolygon(ACRE_PLAN.landmarks.templar, ACRE_PLAN.cityOutline) ||
    pointInPolygon(ACRE_PLAN.harbour.towerOfFlies, ACRE_PLAN.cityOutline)
  ) {
    throw new Error("Historical-plan topology regressed");
  }

  const { createNavigator } = await vite.ssrLoadModule("/src/navigation.js");
  const { HISTORIC_STOPS } = await vite.ssrLoadModule("/src/history.js");
  const navigator = createNavigator({colliders:arena.colliders,bounds:arena.bounds,isGround:arena.isDryLand});
  const routeExists = (start, goal) => {
    const path = navigator.route(start, goal);
    if (!path) {
      console.error('No dry, unobstructed route', {start,goal});
      return false;
    }
    // Independently sample the route against the actual player collision rule.
    for (let i=1;i<path.length;i++) {
      const a=path[i-1],b=path[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.15);
      for(let j=0;j<=steps;j++) {
        const t=j/Math.max(1,steps),x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
        if(blockedAt(new THREE.Vector3(x,playerHeight,z))||!arena.isDryLand(x,z)) throw Error("Guidance crosses masonry or water");
      }
    }
    return true;
  };
  for(const stop of HISTORIC_STOPS) {
    if(!routeExists(arena.mission.target,stop)) throw Error(`Unreachable historical stop: ${stop.name}`);
  }
  if(!arena.isDryLand(115,-40)||arena.isDryLand(-110,15)||arena.isDryLand(70,62)) throw Error("Coastal geography regressed");
  if(!navigator.clear(arena.mission.playerStart,{x:86,z:-71})) throw Error("Gate approach is obstructed");
  for(const guard of arena.mission.guardSpawns) {
    if(!arena.isDryLand(guard.x,guard.z)||blockedAt(new THREE.Vector3(guard.x,playerHeight,guard.z))) throw Error(`Invalid guard spawn: ${guard.toArray()}`);
  }
  const tunnelNavigator = createNavigator({colliders:arena.colliders,bounds:{min:{x:-58,z:47},max:{x:39,z:53}},floorY:arena.tunnel.floorY,step:.6});
  if(!tunnelNavigator.route(arena.tunnel.portals[0].underground,arena.tunnel.portals[1].underground)) throw Error("Tunnel crossing blocked");
  const unreachableMissionRoutes = arena.entryRoutes
    .filter((route) => !routeExists(route.arrival, arena.mission.target))
    .map((route) => route.id);
  const targetToFortressTunnel = routeExists(
    arena.mission.target,
    arena.tunnel.portals[0].surface,
  );
  const portTunnelToExfil = routeExists(
    arena.tunnel.portals[1].surface,
    arena.mission.exfil,
  );
  if (
    unreachableMissionRoutes.length
    || !targetToFortressTunnel
    || !portTunnelToExfil
  ) {
    throw new Error(
      `Mission navigation regressed: entries=${unreachableMissionRoutes.join(",") || "none"}, fortressTunnel=${targetToFortressTunnel}, portExfil=${portTunnelToExfil}`,
    );
  }

  const {createCityLife}=await vite.ssrLoadModule("/src/city-life.js");
  const life=createCityLife(THREE,scene,arena,navigator);
  const cycleNav=()=>createNavigator({colliders:arena.colliders,bounds:arena.bounds,isGround:arena.isDryLand});
  if(!cycleNav().route(arena.mission.playerStart,arena.mission.target))throw Error("Open gate blocks entry");
  life.setClosed(true,[new THREE.Vector3(92,1.72,-71)]);
  if(life.closed)throw Error("Gate closed through an occupant");
  life.setClosed(true,[]);
  life.setClosed(true,[new THREE.Vector3(92.9,1.72,-71)]);
  if(!life.closed||cycleNav().route(arena.mission.playerStart,arena.mission.target))throw Error("Closed land gate is bypassable on foot");
  if(!cycleNav().route(arena.entryRoutes[1].arrival,arena.mission.target))throw Error("Closing gate blocked sea insertion");
  life.setClosed(false,[]);
  if(!cycleNav().route(arena.mission.playerStart,arena.mission.target))throw Error("Dawn did not reopen gate navigation");
  console.log("Gate cycle: blocked at night, sea route intact, occupant protected, dawn route restored.");

  console.log(JSON.stringify({
    renderBudget: budget,
    colliders: arena.colliders.length,
    entryRoutes: arena.entryRoutes.length,
    blockedEntryAnchors,
    missionNavigation: {
      entryRoutesReachTarget: arena.entryRoutes.length,
      targetToFortressTunnel,
      portTunnelToExfil,
    },
    zones: arena.zones.length,
    vesselRenderBudget: arena.vesselRenderBudget,
    objectRenderBudget: objectBudget,
  }, null, 2));
} finally {
  console.error = originalConsoleError;
  await vite.close();
}
