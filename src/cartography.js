import { ACRE_PLAN } from "./acre-plan.js";
import { HISTORIC_STOPS } from "./history.js";

// The map shows the actual collision footprints. Illustrated houses that have
// no counterpart in the world would mislead the player at every junction.
export function createCartographer(canvas) {
  const cache = document.createElement("canvas");
  let cacheKey = "";
  return function draw({ arena, player, path, goal, elapsed, inTunnel, exploring }) {
    const { width, height } = canvas.getBoundingClientRect();
    if (width < 10 || height < 10) return;
    const ratio = Math.min(devicePixelRatio, 2);
    const pixelsX = Math.round(width * ratio), pixelsY = Math.round(height * ratio);
    if (canvas.width !== pixelsX || canvas.height !== pixelsY) { canvas.width = pixelsX; canvas.height = pixelsY; }
    const world = ACRE_PLAN.world, margin = 24;
    const scale = Math.min((width - margin * 2) / (world.right - world.left), (height - margin * 2) / (world.bottom - world.top));
    const ox = (width - (world.right - world.left) * scale) / 2;
    const oy = (height - (world.bottom - world.top) * scale) / 2;
    const project = (x, z) => [ox + (x - world.left) * scale, oy + (z - world.top) * scale];
    const line = (ctx, points, color, weight, close = false, fill) => {
      ctx.beginPath();
      points.forEach(([x, z], i) => ctx[i ? "lineTo" : "moveTo"](...project(x, z)));
      if (close) ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = color; ctx.lineWidth = weight; ctx.stroke();
    };
    const key = `${pixelsX}:${pixelsY}:${arena.gateClosed}`;
    if (cacheKey !== key) {
      cacheKey = key; cache.width = pixelsX; cache.height = pixelsY;
      const ctx = cache.getContext("2d"); ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.fillStyle = "#dfcea4"; ctx.fillRect(0, 0, width, height);
      ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, (world.right - world.left) * scale, (world.bottom - world.top) * scale); ctx.clip();
      ctx.fillStyle = "#8da8a5"; ctx.fillRect(0, 0, width, height);
      line(ctx, ACRE_PLAN.mainland, "#b7a777", 1, true, "#d8c99e");
      line(ctx, ACRE_PLAN.cityOutline, "#796644", 2, true, "#eadab4");
      ACRE_PLAN.districts.forEach(d => line(ctx, d.polygon, "#927d5138", .5, true, d.tone));
      ACRE_PLAN.roads.forEach(road => line(ctx, road.points, "#f5e9cf", road.kind === "primary" ? 4.2 * scale : 2.7 * scale));
      for (const box of arena.colliders) {
        if (box.enabled === false || box.mapVisible === false || box.max.y <= 0 || box.min.y >= 1.72) continue;
        const [x, z] = project(box.min.x, box.min.z);
        const w = (box.max.x - box.min.x) * scale, d = (box.max.z - box.min.z) * scale;
        ctx.fillStyle = box.max.y > 4 ? "#9b8160" : "#b7a080";
        ctx.fillRect(x, z, w, d); ctx.strokeStyle = "#5d4a3399"; ctx.lineWidth = .5; ctx.strokeRect(x, z, w, d);
      }
      const jetty = [[30,61.1],[54,61.1],[54,66.9],[30,66.9]];
      line(ctx, jetty, "#735331", 1, true, "#c1a375");
      line(ctx, ACRE_PLAN.harbour.chain, "#765233", 1.5);
      ctx.setLineDash([4, 4]); line(ctx, ACRE_PLAN.tunnel.surfaceLine, "#965e39", 2); ctx.setLineDash([]);
      ctx.font = `${Math.max(9, Math.min(12, scale * 5))}px Georgia, serif`;
      ctx.textAlign = "center"; ctx.fillStyle = "#f8efd8";
      ACRE_PLAN.districts.forEach(d => {
        const [x,z] = project(...d.label); const label = d.id === "montmusard" ? "MONTMUSARD" : d.name;
        const w = ctx.measureText(label).width + 10;
        ctx.fillStyle = "#e9dabbdc"; ctx.fillRect(x-w/2,z-11,w,15);
        ctx.fillStyle = "#5d472d"; ctx.fillText(label, x, z);
      });
      arena.entryRoutes.forEach(route => {
        const p = route.exterior || {x:92,z:-71}; const [x,z] = project(p.x,p.z);
        ctx.fillStyle = "#396764"; ctx.beginPath(); ctx.arc(x,z,4,0,Math.PI*2); ctx.fill();
      });
      ctx.restore();
      ctx.fillStyle = "#456762"; ctx.font = "italic 12px Georgia, serif"; ctx.textAlign = "left";
      ctx.save(); ctx.translate(...project(-108,12)); ctx.rotate(-Math.PI/2); ctx.fillText("Mediterranean Sea",0,0); ctx.restore();
      ctx.fillText("Bay of Acre", ...project(82,88));
      ctx.fillStyle = "#685635"; ctx.font = "12px Georgia, serif";
      ctx.fillText("N ↑", ox+5, oy+12);
      ctx.font = "10px Georgia, serif";
      ctx.fillText("Streets and distances compressed for play", ox+5, height-7);
    }
    const ctx = canvas.getContext("2d"); ctx.setTransform(1,0,0,1,0,0); ctx.drawImage(cache,0,0); ctx.setTransform(ratio,0,0,ratio,0,0);
    if (exploring) HISTORIC_STOPS.forEach((stop, i) => {
      const [x,z] = project(stop.x,stop.z); ctx.fillStyle="#526052"; ctx.beginPath(); ctx.arc(x,z,7,0,Math.PI*2); ctx.fill();
      ctx.font="bold 10px system-ui"; ctx.textAlign="center"; ctx.fillStyle="#fff0d2"; ctx.fillText(String(i+1),x,z+3);
    });
    if (path?.length) { ctx.setLineDash([4,4]); line(ctx,path.map(p=>[p.x,p.z]),"#225e61",2); ctx.setLineDash([]); }
    if (goal) {
      const [x,z] = project(goal.x,goal.z); ctx.strokeStyle="#a44230"; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(x,z,7+Math.sin(elapsed*2),0,Math.PI*2); ctx.stroke();
      ctx.fillStyle="#a44230"; ctx.beginPath(); ctx.arc(x,z,3,0,Math.PI*2); ctx.fill();
    }
    ctx.save(); ctx.translate(...project(player.position.x,player.position.z)); ctx.rotate(-player.yaw);
    ctx.beginPath(); ctx.moveTo(0,-10); ctx.lineTo(6,7); ctx.lineTo(0,3); ctx.lineTo(-6,7); ctx.closePath();
    ctx.fillStyle=inTunnel?"#9d5e2c":"#173f49"; ctx.fill(); ctx.strokeStyle="#fff1cf"; ctx.lineWidth=1.5; ctx.stroke(); ctx.restore();
  };
}
