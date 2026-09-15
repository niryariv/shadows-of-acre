/**
 * Shared spatial reconstruction of Frankish Acre around 1250 CE.
 *
 * This is deliberately a reconstruction, not a claimed measured medieval
 * survey. Geometry follows David Jacoby's archaeology-led plan of the old
 * city and harbour, while the asymmetric Montmusard enclosure follows the
 * dimensions and wall relationships assembled by Pringle and Jotischky.
 *
 * World convention: west/east = negative/positive x; north/south =
 * negative/positive z.
 */
export const ACRE_PLAN = {
  date: "c. 1250 CE",
  evidenceLabel: "ARCHAEOLOGICAL RECONSTRUCTION",
  world: {
    left: -116,
    right: 132,
    top: -132,
    bottom: 94,
  },
  bounds: {
    min: [-112, -132],
    max: [126, 94],
  },
  cityOutline: [
    [-102, -124],
    [-72, -128],
    [-38, -119],
    [5, -105],
    [48, -90],
    [82, -77],
    [95, -66],
    [96, -36],
    [94, 8],
    [88, 36],
    [74, 42],
    [40, 43],
    [40, 70],
    [25, 79],
    [-20, 82],
    [-62, 82],
    [-91, 76],
    [-101, 62],
    [-104, 25],
    [-104, -31],
  ],
  oldCityWall: [
    [-101, -64],
    [-62, -64],
    [-24, -64],
    [15, -64],
    [52, -63],
    [91, -61],
  ],
  // The northern and eastern defenses faced the coastal plain, not the sea.
  mainland: [
    [-102, -124], [-104, -180], [180, -180], [180, 31],
    [118, 32], [88, 36], [94, 8], [96, -36], [95, -66],
    [82, -77], [48, -90], [5, -105], [-38, -119], [-72, -128],
  ],
  montmusardOuterWall: [
    [-102, -124],
    [-72, -128],
    [-38, -119],
    [5, -105],
    [48, -90],
    [82, -77],
    [95, -66],
  ],
  montmusardInnerWall: [
    [-99, -118],
    [-71, -121],
    [-39, -113],
    [3, -99],
    [44, -85],
    [78, -72],
    [91, -63],
  ],
  westernSeaWall: [
    [-102, -124],
    [-104, -72],
    [-104, -31],
    [-103, 24],
    [-99, 61],
    [-90, 75],
  ],
  southernSeaWall: [
    [-90, 75],
    [-62, 82],
    [-20, 82],
    [25, 79],
    [40, 70],
  ],
  easternWall: [
    [95, -66],
    [96, -36],
    [94, 8],
    [88, 36],
  ],
  harbour: {
    innerWater: [
      [40, 43],
      [74, 42],
      [88, 50],
      [89, 67],
      [73, 76],
      [42, 70],
    ],
    southernBreakwater: [
      [25, 79],
      [54, 79],
      [72, 72],
      [73, 60],
    ],
    easternBreakwater: [
      [88, 36],
      [101, 43],
      [112, 58],
      [117, 70],
    ],
    chain: [
      [73, 60],
      [111, 68],
    ],
    towerOfFlies: [117, 70],
    courtOfChain: [52, 56],
    arsenal: [82, 29],
  },
  roads: [
    {
      id: "st-anthony-road",
      kind: "primary",
      points: [[122, -71], [93, -71], [69, -71], [40, -71], [9, -71], [9, -58]],
    },
    {
      id: "porta-hospitalis",
      kind: "primary",
      points: [[9, -94], [9, -64], [-3, -57], [-3, -36], [-3, -23]],
    },
    {
      id: "market-street",
      kind: "primary",
      points: [[9, -58], [9, -20], [9, 18], [15, 25], [15, 43]],
    },
    {
      id: "harbour-road",
      kind: "primary",
      points: [[-50, 41], [-24, 41], [15, 43], [35, 43], [37, 50], [37, 64], [51, 64]],
    },
    {
      id: "genoese-lane",
      kind: "secondary",
      points: [[-88, 22], [-48, 22], [-33, 19], [0, 19], [9, 18]],
    },
    {
      id: "pisan-lane",
      kind: "secondary",
      points: [[-57, 61], [-34, 61], [-10, 62], [18, 62], [37, 64]],
    },
    {
      id: "venetian-lane",
      kind: "secondary",
      points: [[9, 2], [33, 2], [58, 2], [83, 2], [83, 28]],
    },
    {
      id: "western-shore-road",
      kind: "secondary",
      points: [[-93, -55], [-92, -18], [-88, 23], [-57, 25], [-52, 40], [-52, 61]],
    },
  ],
  districts: [
    {
      id: "montmusard",
      name: "MONTMUSART",
      label: [-48, -95],
      tone: "rgba(128,102,62,.11)",
      polygon: [
        [-99, -119], [-72, -123], [-39, -114], [3, -100],
        [45, -86], [82, -71], [90, -64], [-98, -66],
      ],
    },
    {
      id: "hospitaller",
      name: "HOSPITALLER",
      label: [-32, -50],
      tone: "rgba(130,63,43,.14)",
      polygon: [[-57, -62], [-5, -62], [-5, -24], [-57, -24]],
    },
    {
      id: "genoese",
      name: "GENOESE",
      label: [-35, 18],
      tone: "rgba(76,103,78,.12)",
      polygon: [[-67, -22], [-8, -22], [7, 4], [-5, 32], [-48, 37], [-68, 18]],
    },
    {
      id: "templar",
      name: "TEMPLAR",
      label: [-77, 67],
      tone: "rgba(130,63,43,.15)",
      polygon: [[-98, 34], [-58, 34], [-48, 55], [-59, 79], [-89, 74]],
    },
    {
      id: "pisan",
      name: "PISAN",
      label: [-23, 69],
      tone: "rgba(76,103,78,.1)",
      polygon: [[-57, 33], [-4, 31], [31, 43], [39, 69], [23, 78], [-58, 79], [-48, 55]],
    },
    {
      id: "venetian",
      name: "VENETIAN",
      label: [43, 25],
      tone: "rgba(76,103,78,.11)",
      polygon: [[1, -21], [76, -18], [86, 16], [73, 41], [42, 43], [30, 34], [2, 25]],
    },
    {
      id: "patriarchal",
      name: "HOLY CROSS",
      label: [-18, -7],
      tone: "rgba(135,105,55,.11)",
      polygon: [[-53, -23], [0, -23], [1, 4], [-8, 20], [-52, 20]],
    },
    {
      id: "royal",
      name: "ROYAL & ARSENAL",
      label: [71, -39],
      tone: "rgba(128,102,62,.09)",
      polygon: [[0, -61], [91, -59], [92, -18], [76, -18], [1, -21]],
    },
  ],
  landmarks: {
    hospitaller: [-31, -43],
    cathedral: [-20, -5],
    templar: [-78, 58],
    pisanFondaco: [-18, 52],
    genoeseCommune: [-39, 12],
    venetianFondaco: [48, 8],
    arsenal: [82, 29],
    courtOfChain: [52, 56],
    stAnthonyGate: [92, -71],
  },
  tunnel: {
    surfaceLine: [[-59, 58], [-54, 50], [35, 50], [37, 50]],
  },
};

export function pointInPolygon([x, z], polygon) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const [xi, zi] = polygon[index];
    const [xj, zj] = polygon[previous];
    const crosses = ((zi > z) !== (zj > z))
      && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function planBounds(polygon) {
  return polygon.reduce(
    (bounds, [x, z]) => ({
      minX: Math.min(bounds.minX, x),
      minZ: Math.min(bounds.minZ, z),
      maxX: Math.max(bounds.maxX, x),
      maxZ: Math.max(bounds.maxZ, z),
    }),
    { minX: Infinity, minZ: Infinity, maxX: -Infinity, maxZ: -Infinity },
  );
}
