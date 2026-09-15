import * as THREE from "three";
import { combine, loomTexture } from "./visual-detail.js";

// Original, metre-scale characters. Shaped cross sections replace stacked
// capsules: a jaw, cheek planes, shoulders, waist and tapering limbs share one
// continuous surface each. No downloaded likenesses or runtime asset services.
const TAU = Math.PI * 2;
const lerp = THREE.MathUtils.lerp;
const gaussian = (x, y, cx, cy, sx, sy) => Math.exp(-(((x-cx)/sx)**2+((y-cy)/sy)**2));

function shapedSurface(profile, { segments = 32, rows = 24, deform, smooth = false } = {}) {
  const positions = [], uvs = [], indices = [];
  const low = profile[0][0], high = profile.at(-1)[0];
  for (let row = 0; row <= rows; row++) {
    const v = row / rows, y = lerp(low, high, v);
    let j = 1;
    while (j < profile.length-1 && y > profile[j][0]) j++;
    const a = profile[j-1], b = profile[j], t = (y-a[0])/(b[0]-a[0]);
    const interpolate = axis => {
      if(!smooth)return lerp(a[axis],b[axis],t);
      const before=profile[Math.max(0,j-2)],after=profile[Math.min(profile.length-1,j+1)];
      const m0=(b[axis]-before[axis])/(b[0]-before[0])*(b[0]-a[0]);
      const m1=(after[axis]-a[axis])/(after[0]-a[0])*(b[0]-a[0]);
      return Math.max(.001,(2*t**3-3*t*t+1)*a[axis]+(t**3-2*t*t+t)*m0
        +(-2*t**3+3*t*t)*b[axis]+(t**3-t*t)*m1);
    };
    const width = interpolate(1), depth = interpolate(2);
    for (let col = 0; col <= segments; col++) {
      const u = col/segments, angle = (u-.5)*TAU;
      const p = [Math.sin(angle)*width, y, Math.cos(angle)*depth];
      deform?.(p, angle, v);
      positions.push(...p); uvs.push(u,v);
      if (row < rows && col < segments) {
        const n = row*(segments+1)+col, next = n+segments+1;
        indices.push(n,n+1,next,n+1,next+1,next);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute("uv",new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

export function anatomicalHead() {
  const face = shapedSurface([
    [-.135,.025,.045],[-.12,.053,.071],[-.094,.077,.078],[-.05,.086,.092],
    [0,.094,.095],[.042,.093,.091],[.082,.09,.092],[.112,.067,.077],[.137,.003,.004],
  ], { segments: 48, rows: 48, smooth:true, deform(p,a) {
    const [x,y] = p, front = Math.max(0,Math.cos(a))**8;
    // Flatten the facial plane; continuous relief forms nose, philtrum, lips,
    // eye sockets and chin, not a ball with features glued onto its surface.
    if (Math.cos(a)>0) p[2] += front*(
      .024*gaussian(x,y,0,-.013,.017,.019) + .015*gaussian(x,y,0,.018,.012,.043)
      + .007*gaussian(x,y,0,-.108,.034,.020) + .005*gaussian(x,y,0,-.066,.034,.011)
      - .004*gaussian(x,y,0,-.048,.010,.012)
      - .007*gaussian(x,y,-.041,.024,.026,.014) - .007*gaussian(x,y,.041,.024,.026,.014)
      + .006*gaussian(x,y,-.047,-.018,.032,.021) + .006*gaussian(x,y,.047,-.018,.032,.021));
  }});
  const extras = [
    {geometry:face},
    {geometry:new THREE.CylinderGeometry(.045,.059,.14,16),position:[0,-.173,-.015]},
    ...[-1,1].map(s=>({geometry:new THREE.SphereGeometry(1,12,8),position:[s*.092,-.018,-.002],scale:[.015,.032,.019]})),
  ];
  // Ears and neck sample unmarked skin at the back of the atlas.
  for (const {geometry} of extras.slice(1)) {
    const uv = geometry.attributes.uv;
    for(let i=0;i<uv.count;i++) uv.setXY(i,.06+uv.getX(i)*.04,.3+uv.getY(i)*.1);
  }
  const result = combine(extras);
  extras.forEach(p=>p.geometry.dispose());
  return result;
}

export function faceTexture(bearded = false) {
  const canvas = document.createElement("canvas"); canvas.width=1024; canvas.height=1024;
  const c = canvas.getContext("2d");
  c.fillStyle="#d5af90"; c.fillRect(0,0,1024,1024);
  let seed=713;
  const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<42000;i++) {
    c.fillStyle=i%2?"rgba(76,39,24,.045)":"rgba(255,233,205,.10)";
    c.fillRect(random()*1024,random()*1024,1,1.5);
  }
  const px=x=>(.5+Math.asin(Math.max(-.99,Math.min(.99,x/.094)))/TAU)*1024;
  const py=y=>(1-(y+.135)/.272)*1024;
  function stroke(points,color,width=1) {
    c.strokeStyle=color; c.lineWidth=width; c.lineCap="round"; c.beginPath();
    points.forEach(([x,y],i)=>i?c.lineTo(px(x),py(y)):c.moveTo(px(x),py(y)));c.stroke();
  }
  function oval(x,y,w,h,color) {
    c.fillStyle=color;c.beginPath();c.ellipse(px(x),py(y),w,h,0,0,TAU);c.fill();
  }
  for(const side of [-1,1]) {
    const x=side*.041;
    oval(x,.024,27,20,"#a37c62");
    oval(x,.023,23,15,"#ccc2ad");
    oval(x,.023,9,15,"#605640");oval(x,.023,4.5,11,"#282720");
    oval(x-.002,.025,2,2,"#e2d7bb");
    stroke([[x-.019,.024],[x-.009,.028],[x+.009,.028],[x+.019,.022]],"#503b30",2.5);
    stroke([[x-.019,.014],[x,.010],[x+.02,.014]],"#b18a6e",1.5);
    for(let i=0;i<24;i++) {
      const xx=x-.023+i*.0018, yy=.043+Math.sin(i/24*Math.PI)*.004;
      stroke([[xx,yy],[xx+.002,yy+.004]],"rgba(57,40,28,.8)",1.8);
    }
    oval(side*.011,-.025,4,3,"#76503c");
    stroke([[side*.019,-.035],[side*.026,-.054],[side*.032,-.077]],"#b89073",1.4);
  }
  oval(0,-.069,30,10,"#b58170");
  stroke([[-.025,-.066],[-.010,-.064],[0,-.067],[.010,-.064],[.025,-.066]],"#876052",2);
  stroke([[-.016,-.075],[0,-.078],[.016,-.075]],"#d4a389",1.6);
  if(bearded) for(let i=0;i<7600;i++) {
    const x=(random()-.5)*.175, y=-.035-random()*.099;
    if((Math.abs(x)<.033&&y>-.086&&y<-.052)||Math.abs(x)<.018&&y>-.05)continue;
    stroke([[x,y],[x+.0007,y-.002-random()*.002]],"rgba(58,43,32,.38)",.8);
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=8;texture.name="Original sculpt-aligned skin, eyelids, iris, lips and stubble";
  return texture;
}

export function tailoredTunic(long = false, armor = false) {
  const hem=long?.17:.66, bulk=armor?1.10:1;
  return shapedSurface([
    [hem,long?.29:.25,long?.20:.145],[hem+.05,long?.28:.245,long?.19:.14],[.88,.196,.127],[1.02,.152,.102],
    [1.10,.161,.105],[1.28,.191,.117],[1.39,.208,.11],[1.435,.225,.095],
    [1.46,.19,.089],[1.50,.069,.070],[1.515,.062,.061],
  ],{segments:40,rows:32,smooth:true,deform(p,a) {
    const hanging=Math.max(0,Math.min(1,(1.08-p[1])/.3));
    const fold=Math.sin(a*11+.5)*.009+Math.sin(a*17+1.8)*.004;
    const wrinkle=.003*Math.sin(p[1]*63+a*3)*(1-hanging);
    p[0]*=bulk;p[2]*=bulk;
    p[0]+=Math.sin(a)*(fold*hanging+wrinkle);
    p[2]+=Math.cos(a)*(fold*hanging+wrinkle);
    p[1]+=.009*Math.sin(a*5)*hanging;
  }});
}

// Unit-length sleeve/hose: taper, elbow crease, calf and cuff, rather than pills.
export function tailoredLimb(leg = false) {
  return shapedSurface(leg?[
    [-.11,.001,.001],[-.045,.045,.047],[0,.066,.066],[.22,.074,.073],
    [.50,.078,.077],[.78,.076,.074],[1,.066,.066],[1.06,.045,.045],[1.12,.001,.001],
  ]:[
    [-.12,.001,.001],[-.04,.036,.036],[0,.052,.052],[.18,.054,.056],[.55,.065,.064],
    [.85,.068,.065],[1,.058,.058],[1.1,.03,.03],[1.15,.001,.001],
  ],{segments:16,rows:20,smooth:true,deform(p,a){const crease=.0014*Math.sin(p[1]*34+a*2);p[0]+=Math.sin(a)*crease;p[2]+=Math.cos(a)*crease;}});
}

function handGeometry() {
  const parts=[{geometry:new THREE.SphereGeometry(1,12,8),scale:[.036,.057,.021]}];
  for(let i=0;i<4;i++) parts.push({geometry:new THREE.CapsuleGeometry(.009,.038,3,6),
    position:[(i-1.5)*.017,-.046+(i===0||i===3?.008:0),.002]});
  parts.push({geometry:new THREE.CapsuleGeometry(.012,.033,3,6),position:[.035,-.003,.008],rotation:[0,0,-.46]});
  return combine(parts);
}

function shoeGeometry() {
  const g = shapedSurface([[0,.06,.095],[.02,.068,.113],[.065,.065,.10],[.105,.052,.057],[.13,.045,.047]],
    {segments:20,rows:8,deform(p){p[2]+=(.13-p[1])*.35;}});
  return g;
}

// Positive forward z. Two-link foot placement keeps soles on the floor during
// stance; a swinging foot bends its knee instead of sliding through the road.
export function walkingPose(phase, moving = 1, stride = .26) {
  const legs=[],arms=[];
  for(const side of [-1,1]) {
    const t=phase+(side===1?Math.PI:0), swing=Math.sin(t);
    const lift=Math.max(0,Math.cos(t))*.115*moving;
    const hip=[side*.095,.87,0], foot=[side*.095,.095+lift,swing*stride*moving];
    const dy=foot[1]-hip[1],dz=foot[2],d=Math.hypot(dy,dz),length=.415;
    const h=Math.sqrt(Math.max(0,length*length-d*d/4));
    const knee=[side*.095,(hip[1]+foot[1])/2+dz/d*h,(hip[2]+foot[2])/2-dy/d*h];
    legs.push({hip,knee,foot});
    const shoulder=[side*.219,1.408,0], elbow=[side*.246,1.13,-swing*.085*moving];
    const hand=[side*.246,.891,.028-swing*.155*moving];
    arms.push({shoulder,elbow,hand});
  }
  return {legs,arms,bob:Math.cos(phase*2)*.006*moving};
}

let shared;
function resources() {
  if(shared)return shared;
  const cloth=loomTexture();
  shared={
    head:anatomicalHead(),tunic:tailoredTunic(),robe:tailoredTunic(true),surcoat:tailoredTunic(false,true),
    arm:tailoredLimb(),leg:tailoredLimb(true),hand:handGeometry(),shoe:shoeGeometry(),
    skin:new THREE.MeshStandardMaterial({map:faceTexture(),roughness:.82}),
    beard:new THREE.MeshStandardMaterial({map:faceTexture(true),roughness:.88}),
    cloth:new THREE.MeshStandardMaterial({map:cloth,bumpMap:cloth,bumpScale:.006,roughness:.96}),
    leather:new THREE.MeshStandardMaterial({color:0x473325,roughness:.87}),
    hands:new THREE.MeshStandardMaterial({color:0xc19b7c,roughness:.85}),
    cap:new THREE.SphereGeometry(1,32,20,0,TAU,0,Math.PI*.57).scale(.098,.071,.102),
  };
  const hoodParts=[{geometry:new THREE.SphereGeometry(1,32,20,Math.PI*.77,Math.PI*1.46,0,Math.PI*.83),
    scale:[.112,.153,.117],position:[0,0,-.013]},
    {geometry:new THREE.CylinderGeometry(.105,.15,.22,32,6,true,Math.PI*.25,Math.PI*1.5),
      position:[0,-.165,-.025],scale:[1,1,.73]}];
  hoodParts.push({geometry:new THREE.SphereGeometry(1,32,16,0,TAU,0,Math.PI*.32),scale:[.112,.153,.117],position:[0,0,-.013]});
  shared.hood=combine(hoodParts);
  shared.belt=new THREE.TorusGeometry(.158,.014,5,40).rotateX(Math.PI/2).scale(1,1,.70);
  shared.pouch=combine([
    {geometry:new THREE.SphereGeometry(1,16,12),position:[.142,.92,.113],scale:[.056,.075,.033]},
    {geometry:new THREE.BoxGeometry(.022,.14,.015),position:[.142,1,.118]},
  ]);
  return shared;
}

const clothing=[0x86715b,0xb0a080,0x687c83,0x985b47,0x717650,0xc2b499,0x7e6c79,0x526a74].map(c=>new THREE.Color(c));
const complexions=[0xffffff,0xc69f7e,0xe5c6a8,0xb38d6c,0xd6b392].map(c=>new THREE.Color(c));
const headwear=[new THREE.Color(0xc6b999),new THREE.Color(0x9d8e72),new THREE.Color(0xd8cfb6)];

export function createCrowdModels(root) {
  const r=resources();
  const far=combine([{geometry:shapedSurface([[.65,.23,.15],[1.03,.15,.1],[1.4,.22,.11],[1.5,.06,.06]],{segments:8,rows:8})},
    ...[-1,1].map(s=>({geometry:new THREE.CylinderGeometry(.06,.075,.67,8),position:[s*.095,.35,0]}))]);
  const definitions={
    body:[r.tunic,r.cloth,1],robe:[r.robe,r.cloth,1],head:[r.head,r.skin,1],
    hood:[r.hood,r.cloth,1],cap:[r.cap,r.cloth,1],
    arms:[r.arm,r.cloth,4],legs:[r.leg,r.cloth,4],hands:[r.hand,r.hands,2],
    shoes:[r.shoe,r.leather,2],belt:[r.belt,r.leather,1],pouch:[r.pouch,r.leather,1],
    farBody:[far,r.cloth,1],farHead:[new THREE.SphereGeometry(.115,10,8).scale(.85,1.15,.86),r.hands,1],
  };
  const meshes={};
  for(const [name,[g,material,multiplier]] of Object.entries(definitions)) {
    const mesh=new THREE.InstancedMesh(g,material,32*multiplier);
    mesh.name=`Citizen ${name} · shared anatomical instances`;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;
    mesh.castShadow=['body','robe','head'].includes(name);mesh.receiveShadow=true;
    meshes[name]=mesh;root.add(mesh);
  }
  const object=new THREE.Object3D(),up=new THREE.Vector3(0,1,0),direction=new THREE.Vector3();
  const parent=new THREE.Matrix4(),matrix=new THREE.Matrix4(),q=new THREE.Quaternion();
  const rotation=new THREE.Quaternion(),scale=new THREE.Vector3(),origin=new THREE.Vector3();
  let near=0,farCount=0;
  return {
    begin(population,visible){near=farCount=0;Object.values(meshes).forEach(m=>m.visible=visible);},
    draw(id,p,gait,distance){
      if(distance>90)return;
      const tall=.96+(id%5)*.02,wide=.93+(id%4)*.045;
      rotation.setFromAxisAngle(up,p.yaw);scale.set(wide,tall,wide);
      origin.set(p.x,0,p.z);parent.compose(origin,rotation,scale);
      const place=(name,index,x,y,z,show=true)=>{
        object.position.set(x,y,z);object.rotation.set(0,0,0);object.scale.setScalar(show?1:0);object.updateMatrix();
        matrix.multiplyMatrices(parent,object.matrix);meshes[name].setMatrixAt(index,matrix);
      };
      if(distance>27){
        const i=farCount++;place('farBody',i,0,0,0);place('farHead',i,0,1.64,0);
        meshes.farBody.setColorAt(i,clothing[id%8]);meshes.farHead.setColorAt(i,complexions[id%5]);return;
      }
      const i=near++,long=id%3===0;
      for(const name of ['body','robe','arms','legs','cap','hood','head','hands']) {
        const n=definitions[name][2],color=name==='head'||name==='hands'?complexions[id%5]:
          name==='hood'||name==='cap'?headwear[id%3]:clothing[id%8];
        for(let j=0;j<n;j++)meshes[name].setColorAt(i*n+j,color);
      }
      const pose=walkingPose(p.phase??0,p.moving===undefined?Math.min(1,Math.abs(gait)*4):p.moving?1:0,long?.115:.23);
      place('body',i,0,pose.bob,0,!long);place('robe',i,0,pose.bob,0,long);
      place('head',i,0,1.64+pose.bob,0);place('cap',i,0,1.715+pose.bob,0,!long);
      place('hood',i,0,1.65+pose.bob,0,long);
      place('belt',i,0,1.035+pose.bob,0);place('pouch',i,0,pose.bob,0);
      const segment=(name,index,a,b)=>{
        direction.set(a[0]-b[0],a[1]-b[1],a[2]-b[2]);const length=direction.length();
        q.setFromUnitVectors(up,direction.normalize());origin.set(...b);scale.set(1,length,1);
        if(long&&name==='legs')scale.setScalar(0);
        matrix.compose(origin,q,scale).premultiply(parent);meshes[name].setMatrixAt(index,matrix);
      };
      for(let j=0;j<2;j++){
        const leg=pose.legs[j],arm=pose.arms[j];
        segment('legs',i*4+j*2,leg.hip,leg.knee);segment('legs',i*4+j*2+1,leg.knee,leg.foot);
        segment('arms',i*4+j*2,arm.shoulder,arm.elbow);segment('arms',i*4+j*2+1,arm.elbow,arm.hand);
        place('hands',i*2+j,...arm.hand);place('shoes',i*2+j,leg.foot[0],leg.foot[1]-.095,leg.foot[2]);
      }
    },
    end(){for(const [name,mesh] of Object.entries(meshes)){
      mesh.count=(name.startsWith('far')?farCount:near)*definitions[name][2];mesh.instanceMatrix.needsUpdate=true;
      if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    }},
    budget:{draws:Object.keys(meshes).length,trianglesPerPerson:Object.values(definitions).reduce((n,[g,,k])=>n+k*(g.index?g.index.count:g.attributes.position.count)/3,0)},
  };
}

export function characterResources(){return resources();}

let equipment;
function equipmentGeometry() {
  if(equipment)return equipment;
  const shieldShape=new THREE.Shape();
  shieldShape.moveTo(-.235,.285);shieldShape.lineTo(.235,.285);shieldShape.lineTo(.22,-.02);
  shieldShape.quadraticCurveTo(.16,-.22,0,-.38);shieldShape.quadraticCurveTo(-.16,-.22,-.22,-.02);
  shieldShape.closePath();
  const shield=new THREE.ExtrudeGeometry(shieldShape,{depth:.025,bevelEnabled:true,bevelSize:.012,bevelThickness:.008,bevelSegments:2});
  const p=shield.attributes.position;
  for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)+.055*(1-(p.getX(i)/.25)**2));
  shield.computeVertexNormals();
  const helmet=(kettle)=>combine([
    {geometry:new THREE.SphereGeometry(1,32,16,0,TAU,0,Math.PI/2),position:[0,.06,-.009],scale:[.116,.096,.124]},
    {geometry:new THREE.CylinderGeometry(kettle?.164:.117,kettle?.179:.119,kettle?.014:.022,32),position:[0,.058,-.009],scale:[1,1,1.07]},
    ...(!kettle?[{geometry:new THREE.BoxGeometry(.016,.115,.012),position:[0,.004,.117]}]:[]),
    ...Array.from({length:12},(_,i)=>({geometry:new THREE.SphereGeometry(.0035,6,4),position:[Math.sin(i*TAU/12)*.117,.06,Math.cos(i*TAU/12)*.124-.009]})),
  ]);
  const cross=combine([
    {geometry:new THREE.BoxGeometry(.045,.36,.009),position:[0,-.003,.084]},
    {geometry:new THREE.BoxGeometry(.20,.045,.009),position:[0,.07,.077]},
  ]);
  equipment={shield,cross,kettle:helmet(true),nasal:helmet(false),
    shaft:new THREE.CylinderGeometry(.015,.019,2.35,10),point:new THREE.ConeGeometry(.044,.25,4),
    buckle:new THREE.TorusGeometry(.025,.005,5,4).rotateZ(Math.PI/4),
  };
  return equipment;
}

export function createGuardFigure(index, order, materials) {
  const r=resources(),e=equipmentGeometry(),root=new THREE.Group(),body=new THREE.Group(),head=new THREE.Group();
  root.name="Guard · anatomical articulated model";root.add(body,head);head.position.y=1.64;
  const add=(parent,geometry,material,name,x=0,y=0,z=0)=>{
    const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.position.set(x,y,z);
    mesh.receiveShadow=true;parent.add(mesh);return mesh;
  };
  const cloth=materials.orders[order.id].cloth,heraldry=materials.orders[order.id].heraldry;
  const coat=add(body,r.surcoat,cloth,"Tailored belted surcoat with shoulder line");coat.castShadow=true;
  const belt=add(body,r.belt,materials.leather,"Leather girdle",0,1.035,0);belt.scale.set(1.11,1,1.11);
  add(body,e.buckle,materials.iron,"Small iron belt buckle",0,1.035,.129);
  const apron=add(body,r.pouch,materials.leather,"Belt pouch");apron.position.z=.014;
  if(order.showCross){
    const cross=add(body,e.cross,heraldry,"Sewn order cross",0,1.255,.10);
    cross.scale.set(.78,.68,.5);
  }
  const skin=add(head,r.head,index%3?r.beard:r.skin,"Sculpted face, eyelids and stubble");skin.castShadow=true;
  const coif=add(head,r.hood,materials.chainmail,"Open-face mail coif",0,.006,-.008);coif.castShadow=true;
  const helmet=add(head,index%3===0?e.kettle:e.nasal,materials.iron,"Proportioned riveted iron helmet");helmet.castShadow=true;
  const legs=[],arms=[];
  for(let side=0;side<2;side++) {
    legs.push({upper:add(root,r.leg,materials.leggings[index%2],"Hose · thigh"),
      lower:add(root,r.leg,materials.leggings[index%2],"Hose · bent knee and calf"),
      shoe:add(root,r.shoe,materials.leather,"Leather turnshoe")});
    arms.push({upper:add(root,r.arm,materials.chainmail,"Mail upper sleeve"),
      lower:add(root,r.arm,materials.chainmail,"Mail forearm"),
      hand:add(root,r.hand,r.hands,"Articulated hand")});
  }
  const shield=new THREE.Group();root.add(shield);
  add(shield,e.shield,cloth,"Curved wooden heater shield").castShadow=true;
  if(order.showCross)add(shield,e.cross,heraldry,"Painted shield cross");
  const spear=new THREE.Group();root.add(spear);
  add(spear,e.shaft,materials.leather,"Ash spear shaft");add(spear,e.point,materials.iron,"Forged spear blade",0,1.3,0);
  const up=new THREE.Vector3(0,1,0),direction=new THREE.Vector3();
  function segment(mesh,a,b) {
    direction.set(a[0]-b[0],a[1]-b[1],a[2]-b[2]);const length=direction.length();
    mesh.position.set(...b);mesh.quaternion.setFromUnitVectors(up,direction.normalize());mesh.scale.set(1,length,1);
  }
  const animate=(phase,movement,alert=false)=>{
    const pose=walkingPose(phase,movement,.29);
    root.position.y=pose.bob;body.rotation.z=Math.sin(phase)*.007*movement;
    head.rotation.y=Math.sin(phase*.147)*(alert?.035:.11);
    for(let i=0;i<2;i++) {
      const leg=pose.legs[i],arm=pose.arms[i],side=i===0?-1:1;
      segment(legs[i].upper,leg.hip,leg.knee);segment(legs[i].lower,leg.knee,leg.foot);
      legs[i].shoe.position.set(leg.foot[0],leg.foot[1]-.095,leg.foot[2]);
      // Both wrists and equipment follow the bent forearm. No hovering spear
      // and no shield rigidly pinned to a swinging upper arm.
      arm.elbow=[side*.26,1.135,.012];arm.hand=[side*.25,1.12,.195+Math.sin(phase+side)*.008*movement];
      segment(arms[i].upper,arm.shoulder,arm.elbow);segment(arms[i].lower,arm.elbow,arm.hand);
      arms[i].hand.position.set(...arm.hand);arms[i].hand.rotation.x=-Math.PI/2;
      if(i===0){shield.position.set(-.30,1.115,arm.hand[2]+.06);shield.rotation.y=-.12;}
      else{spear.position.set(.285,1.24,arm.hand[2]+.025);spear.rotation.z=-.025;}
    }
  };
  animate(0,0);
  const budget={meshDraws:0,triangles:0};root.traverse(m=>{
    if(m.isMesh){budget.meshDraws++;budget.triangles+=(m.geometry.index?m.geometry.index.count:m.geometry.attributes.position.count)/3;}
  });
  return {root,body,head,legs,arms,animate,budget};
}
