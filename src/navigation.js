// Bounded, deterministic A* over the solid volumes used for movement.
// No Three.js dependency: routes can be tested without a renderer.
export function createNavigator({ colliders, bounds, floorY = 0, radius = 0.47,
  step = 1.25, isGround = () => true }) {
  const minX = bounds.min.x, minZ = bounds.min.z;
  const cols = Math.ceil((bounds.max.x - minX) / step) + 1;
  const rows = Math.ceil((bounds.max.z - minZ) / step) + 1;
  const solids = colliders.filter(box => box.enabled !== false && box.max.y > floorY && box.min.y < floorY + 1.72);
  const point = id => ({ x: minX + id % cols * step, z: minZ + Math.floor(id / cols) * step });
  const walkable = (x, z) => x >= minX && x <= bounds.max.x && z >= minZ && z <= bounds.max.z
    && isGround(x, z) && !solids.some(box => x + radius > box.min.x && x - radius < box.max.x
      && z + radius > box.min.z && z - radius < box.max.z);
  const blocked = new Uint8Array(cols * rows);
  for (let id = 0; id < blocked.length; id++) {
    const p = point(id);
    blocked[id] = walkable(p.x, p.z) ? 0 : 1;
  }
  const clear = (a, b) => {
    if (!walkable(a.x,a.z) || !walkable(b.x,b.z)) return false;
    // Exact segment/expanded-box intersections prevent a smoothed route from
    // clipping a tiny corner between samples, especially at angled walls.
    for (const box of solids) {
      let enter=0, exit=1;
      for (const axis of ["x","z"]) {
        const delta=b[axis]-a[axis],lo=box.min[axis]-radius,hi=box.max[axis]+radius;
        if (Math.abs(delta)<1e-10) {
          if(a[axis]<=lo||a[axis]>=hi){enter=2;break;}
        } else {
          const t1=(lo-a[axis])/delta,t2=(hi-a[axis])/delta;
          enter=Math.max(enter,Math.min(t1,t2));exit=Math.min(exit,Math.max(t1,t2));
        }
      }
      if(enter<=exit) return false;
    }
    const count = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.2));
    for (let i = 0; i <= count; i++) {
      if (!isGround(a.x + (b.x - a.x) * i / count, a.z + (b.z - a.z) * i / count)) return false;
    }
    return true;
  };
  const anchor = p => {
    const col = Math.round((p.x - minX) / step), row = Math.round((p.z - minZ) / step);
    let best = -1, distance = Infinity;
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      const x = col + dx, z = row + dz, id = z * cols + x;
      if (x < 0 || x >= cols || z < 0 || z >= rows || blocked[id]) continue;
      const candidate = point(id), d = Math.hypot(candidate.x - p.x, candidate.z - p.z);
      if (d < distance && clear(p, candidate)) { best = id; distance = d; }
    }
    return best;
  };
  function route(start, goal) {
    if (clear(start, goal)) return [{ x: start.x, z: start.z }, { x: goal.x, z: goal.z }];
    const first = anchor(start), last = anchor(goal);
    if (first < 0 || last < 0) return null;
    const cost = new Float64Array(blocked.length).fill(Infinity);
    const parent = new Int32Array(blocked.length).fill(-1);
    const closed = new Uint8Array(blocked.length);
    const heap = [];
    const estimate = id => Math.hypot(id % cols - last % cols, Math.floor(id / cols) - Math.floor(last / cols));
    const push = (id, score) => {
      let i = heap.length;
      heap.push({ id, score });
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heap[p].score <= score) break;
        [heap[i], heap[p]] = [heap[p], heap[i]]; i = p;
      }
    };
    const pop = () => {
      const first = heap[0], tail = heap.pop();
      if (heap.length) {
        heap[0] = tail;
        for (let i = 0;;) {
          let child = i * 2 + 1;
          if (child >= heap.length) break;
          if (child + 1 < heap.length && heap[child + 1].score < heap[child].score) child++;
          if (heap[i].score <= heap[child].score) break;
          [heap[i], heap[child]] = [heap[child], heap[i]]; i = child;
        }
      }
      return first.id;
    };
    cost[first] = 0; push(first, estimate(first));
    while (heap.length) {
      const current = pop();
      if (closed[current]) continue;
      if (current === last) {
        const path = [{ x: goal.x, z: goal.z }];
        for (let id = last; id !== -1; id = parent[id]) path.push(point(id));
        path.push({ x: start.x, z: start.z }); path.reverse();
        const smooth = [path[0]];
        for (let index = 0; index < path.length - 1;) {
          let next = index + 1;
          while (next + 1 < path.length && clear(path[index], path[next + 1])) next++;
          smooth.push(path[next]); index = next;
        }
        return smooth;
      }
      closed[current] = 1;
      const x = current % cols, z = Math.floor(current / cols);
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        if ((!dx && !dz) || x + dx < 0 || x + dx >= cols || z + dz < 0 || z + dz >= rows) continue;
        const next = current + dz * cols + dx;
        if (blocked[next] || closed[next]) continue;
        if (dx && dz && (blocked[current + dx] || blocked[current + dz * cols])) continue;
        const nextCost = cost[current] + Math.hypot(dx, dz);
        if (nextCost >= cost[next] || !clear(point(current), point(next))) continue;
        cost[next] = nextCost; parent[next] = current;
        push(next, nextCost + estimate(next));
      }
    }
    return null;
  }
  return { route, clear, walkable };
}

export function routeLength(path) {
  return path?.reduce((sum, p, i) => i ? sum + Math.hypot(p.x - path[i - 1].x, p.z - path[i - 1].z) : 0, 0) ?? 0;
}
