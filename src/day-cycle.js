import { ACRE_PLAN, pointInPolygon } from "./acre-plan.js";

// Playable daily rhythm, not an asserted medieval timetable or solar ephemeris.
export const MINUTES_PER_REAL_SECOND = 2 / 3; // One game hour in 90 seconds.
export const DAWN = 6 * 60;
export const NIGHTFALL = 18 * 60;
export const DEFAULT_TIME = 10 * 60;
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };

export function timeOfDay(totalMinutes) {
  const minute = ((totalMinutes % 1440) + 1440) % 1440;
  const hour = Math.floor(minute / 60);
  const daylight = smooth((minute - 330) / 90) * (1 - smooth((minute - 1020) / 90));
  const night = minute < DAWN || minute >= NIGHTFALL;
  const activity = smooth((minute - 360) / 120) * (1 - smooth((minute - 990) / 120));
  return {
    minute, hour, daylight, night, activity,
    day: Math.floor(totalMinutes / 1440) + 1,
    label: minute < 330 || minute >= 1110 ? "NIGHT" : minute < 420 ? "DAWN" : minute < 1020 ? "DAY" : "DUSK",
    clock: `${String(hour).padStart(2, "0")}:${String(Math.floor(minute % 60)).padStart(2, "0")}`,
    population: Math.round(2 + activity * 30),
  };
}

export const RESTRICTED_AREAS = [
  { name: "Hospitaller inner court", minX: -51, maxX: -7, minZ: -61, maxZ: -28 },
  { name: "Templar fortress", minX: -89, maxX: -54, minZ: 47, maxZ: 77 },
];

export function accessAt(position, cycle, inTunnel = false) {
  if (inTunnel) return { suspicious: false, label: "CONCEALED PASSAGE" };
  const restricted = RESTRICTED_AREAS.find(area => position.x >= area.minX && position.x <= area.maxX
    && position.z >= area.minZ && position.z <= area.maxZ);
  if (restricted) return { suspicious: true, label: `RESTRICTED · ${restricted.name}` };
  const inside = pointInPolygon([position.x, position.z], ACRE_PLAN.cityOutline);
  if (cycle.night && inside) return { suspicious: true, label: "NIGHT WATCH · KEEP UNSEEN" };
  return { suspicious: false, label: inside ? "PUBLIC STREET · FREE PASSAGE" : "OUTSIDE THE WALLS" };
}

export function hearingScale(cycle, crowdMask = 0) {
  return (1.15 - cycle.activity * 0.4) * (1 - clamp(crowdMask) * 0.28);
}

export function canRest({ inWater, compromised, phase }) {
  return !inWater && !compromised && (phase === "running" || phase === "paused");
}
