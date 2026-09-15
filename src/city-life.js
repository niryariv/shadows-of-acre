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
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xa87952, roughness: 1 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x30271f, roughness: 1 });
  const parts = {
    body: new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18,0.3,0.92,8),bodyMat,32),
    head: new THREE.InstancedMesh(new THREE.SphereGeometry(0.155,8,6),skinMat,32),
    cap: new THREE.InstancedMesh(new THREE.SphereGeometry(0.164,8,4,0,Math.PI*2,0,Math.PI/2),bodyMat,32),
    arms: new THREE.InstancedMesh(new THREE.BoxGeometry(0.13,0.65,0.16),bodyMat,64),
    legs: new THREE.InstancedMesh(new THREE.BoxGeometry(0.15,0.48,0.2),shoeMat,64),
  };
  const palette = [0x82705a,0xb19c77,0x756657,0x65736b,0xa57d54,0x706985];
  for (const mesh of Object.values(parts)) {
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
  }
  const people = Array.from({length:32}, (_,i) => {
    const path = paths[i % paths.length] || [{x:9,z:0},{x:9,z:1}];
    const segment = i % (path.length-1), a=path[segment], b=path[segment+1];
    const fraction = ((i*0.618)%1);
    const color = new THREE.Color(palette[i%palette.length]);
    for (const name of ["body","cap"]) parts[name].setColorAt(i,color);
    parts.arms.setColorAt(i*2,color); parts.arms.setColorAt(i*2+1,color);
    return { x:a.x+(b.x-a.x)*fraction,z:a.z+(b.z-a.z)*fraction,path,target:segment+1,direction:1,yaw:0,phase:i*1.7,speed:0.65+(i%5)*0.07 };
  });
  const transform = new THREE.Object3D();
  let population = 32;
  function update(dt, cycle, player, inTunnel) {
    population = cycle.population;
    for (const [name,mesh] of Object.entries(parts)) {
      mesh.visible = !inTunnel;
      mesh.count = population * (name === "arms" || name === "legs" ? 2 : 1);
    }
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
      const place=(mesh,index,lx,y,lz,tilt=0)=>{
        transform.position.set(p.x+Math.cos(p.yaw)*lx+Math.sin(p.yaw)*lz,y,p.z-Math.sin(p.yaw)*lx+Math.cos(p.yaw)*lz);
        transform.rotation.set(tilt,p.yaw,0);transform.updateMatrix();mesh.setMatrixAt(index,transform.matrix);
      };
      place(parts.body,i,0,0.94,0);
      place(parts.head,i,0,1.58,0);
      place(parts.cap,i,0,1.62,0);
      for(const side of [-1,1]) {
        const index=i*2+(side===1?1:0);
        place(parts.arms,index,side*0.28,1.03,0,-side*gait*.5);
        place(parts.legs,index,side*0.12,0.36,0,side*gait);
      }
    }
    Object.values(parts).forEach(mesh=>{mesh.instanceMatrix.needsUpdate=true;});
  }
  return {
    gateBox,
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
