import { createCrowdModels } from "./visual-detail.js";

// Low-cost civilian traffic and the working land gate. All moving pieces stay
// outside static geometry batches; gate collision shares the navigation data.
export function createCityLife(THREE, scene, arena, navigation) {
  const root = new THREE.Group();
  root.name = "Daily life of Acre";
  scene.add(root);
  const gateRoot = new THREE.Group();
  gateRoot.name = "St Anthony's Gate · working timber closure";
  root.add(gateRoot);
  const timber = new THREE.MeshStandardMaterial({ color: 0x523722, roughness: 0.92 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x282a29, roughness: 0.75 });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7.4, 11), timber);
  slab.position.set(92, 3.7, -71);
  slab.castShadow = slab.receiveShadow = true;
  gateRoot.add(slab);
  for (const y of [1.2, 3.6, 6.2]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 11), iron);
    bar.position.set(92, y, -71); gateRoot.add(bar);
  }
  const gateBox = new THREE.Box3(new THREE.Vector3(91.68, 0, -76.5), new THREE.Vector3(92.32, 7.4, -65.5));
  gateBox.enabled = false;
  arena.colliders.push(gateBox);
  gateRoot.visible = false;

  const points = [[69,-71],[40,-71],[9,-58],[9,-30],[9,1],[15,25],[15,40],[35,43],[37,64],[-34,61],[-52,40],[-48,22],[-88,22],[-3,-36],[58,22],[83,2],[-58,-77]]
    .map(([x,z]) => ({x,z})).filter(p => navigation.walkable(p.x,p.z));
  const paths = points.map((start,i) => navigation.route(start, points[(i+1)%points.length])).filter(path => path?.length > 1);
  const crowd = createCrowdModels(root);
  const people = Array.from({length:32}, (_,i) => {
    const path = paths[i % paths.length] || [{x:9,z:0},{x:9,z:1}];
    const segment = i % (path.length-1), a=path[segment], b=path[segment+1];
    const fraction = ((i*0.618)%1);
    return { x:a.x+(b.x-a.x)*fraction,z:a.z+(b.z-a.z)*fraction,path,target:segment+1,direction:1,yaw:0,phase:i*1.7,speed:0.65+(i%5)*0.07 };
  });
  let population = 32;
  function update(dt, cycle, player, inTunnel) {
    population = cycle.population;
    crowd.begin(population, !inTunnel);
    for (let i=0;i<population;i++) {
      const p=people[i], target=p.path[p.target];
      let dx=target.x-p.x,dz=target.z-p.z, length=Math.hypot(dx,dz);
      let moving=false;
      if (length<0.2) {
        if (p.target===p.path.length-1) p.direction=-1;
        if (p.target===0) p.direction=1;
        p.target+=p.direction;
      } else if (dt>0) {
        const step=Math.min(length,p.speed*dt), x=p.x+dx/length*step,z=p.z+dz/length*step;
        // Civilians yield; crowds never become an impassable collision wall.
        if (Math.hypot(x-player.position.x,z-player.position.z)>0.9) {
          p.x=x;p.z=z;p.yaw=Math.atan2(dx,dz);moving=true;
        }
      }
      p.phase+=moving?dt*6:0;
      const gait=moving?Math.sin(p.phase)*0.3:0;
      crowd.draw(i,p,gait,Math.hypot(p.x-player.position.x,p.z-player.position.z));
    }
    crowd.end();
  }
  return {
    gateBox,
    modelBudget: crowd.budget,
    get closed() { return gateBox.enabled; },
    get population() { return population; },
    setClosed(closed, occupants) {
      if (closed && gateBox.enabled) return false;
      // Never materialize a gate through a person. Hold it open until clear.
      const occupied=occupants.some(p=>p.x>90.7&&p.x<93.3&&p.z>-77.1&&p.z<-64.9);
      const enabled=closed&&!occupied;
      if(enabled===gateBox.enabled)return false;
      gateBox.enabled=enabled;gateRoot.visible=enabled;
      return true;
    },
    crowdMask(position) {
      let nearby=0;
      for(let i=0;i<population;i++) if(Math.hypot(people[i].x-position.x,people[i].z-position.z)<16) nearby++;
      return Math.min(1,nearby/5);
    },
    update,
  };
}
