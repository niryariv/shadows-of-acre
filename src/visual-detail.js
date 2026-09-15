import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Original geometry. Sources and the limits of each reconstruction are recorded
// in HISTORICAL_NOTES.md. Detail is shared/batched, never one draw per stone.
export function combine(parts) {
  const geometries = parts.map(({ geometry, position = [0,0,0], rotation = [0,0,0], scale = [1,1,1] }) => {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(...scale)));
    return g;
  });
  const result = mergeGeometries(geometries, false);
  geometries.forEach(g => g.dispose());
  if (!result) throw new Error("Historical detail geometry could not be merged");
  return result;
}

export function voussoirArch(radius, thickness, segments = 17) {
  const pieces = [];
  for (let i=0;i<segments;i++) {
    const start=i*Math.PI/segments+.007, end=(i+1)*Math.PI/segments-.007;
    const inner=radius-thickness, outer=radius+thickness;
    const shape=new THREE.Shape();
    shape.moveTo(Math.cos(start)*inner,Math.sin(start)*inner);
    shape.lineTo(Math.cos(start)*outer,Math.sin(start)*outer);
    shape.absarc(0,0,outer,start,end,false);
    shape.lineTo(Math.cos(end)*inner,Math.sin(end)*inner);
    shape.absarc(0,0,inner,end,start,true);
    shape.closePath();
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:thickness*1.5,bevelEnabled:true,
      bevelSize:.012,bevelThickness:.012,bevelSegments:1,curveSegments:2});
    geometry.translate(0,0,-thickness*.75);
    pieces.push({geometry});
  }
  const result=combine(pieces);
  pieces.forEach(p=>p.geometry.dispose());
  return result;
}

export function foldedGarment(top=.22, waist=.20, hem=.32, height=1) {
  const profile=[];
  for(let row=0;row<=16;row++) {
    const t=row/16;
    // Broad chest, gathered waist, hanging gores; not a rigid cone.
    const radius=t<.55 ? THREE.MathUtils.lerp(hem,waist,t/.55)
      : THREE.MathUtils.lerp(waist,top,(t-.55)/.45);
    profile.push(new THREE.Vector2(radius,(t-.5)*height));
  }
  const geometry=new THREE.LatheGeometry(profile,40);
  const p=geometry.attributes.position;
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(x,z);
    const t=y/height+.5;
    const fold=1+(.045+.055*(1-t))*Math.sin(a*12+.3*Math.sin(t*3));
    p.setXYZ(i,x*fold,y+.009*Math.cos(a*12)*(1-t),z*fold*.72);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function loomTexture(size=1024) {
  const canvas=document.createElement("canvas");canvas.width=canvas.height=size;
  const c=canvas.getContext("2d");
  c.fillStyle="#e5dfd0";c.fillRect(0,0,size,size);
  for(let i=0;i<size;i+=2) {
    c.fillStyle=i%6===0?"rgba(76,62,43,.12)":"rgba(255,255,255,.17)";
    c.fillRect(i,0,1,size);c.fillRect(0,i,size,1);
  }
  for(let i=0;i<4200;i++) {
    const x=(i*193)%size,y=(i*379)%size;
    c.fillStyle=i%3?"rgba(73,52,31,.055)":"rgba(255,255,255,.2)";
    c.fillRect(x,y,1,2+i%5);
  }
  const texture=new THREE.CanvasTexture(canvas);
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
  texture.name="1024px individually woven linen and wool threads";
  return texture;
}

export function decorateHouse(parent,{x,z,w,d,h},stone,timber) {
  const stones=[],wood=[];
  const box=new THREE.BoxGeometry(1,1,1);
  // Dressed quoins and continuous string courses make thickness and storeys
  // legible. All lie against existing solid walls, clear of navigable streets.
  for(const sx of [-1,1]) for(const sz of [-1,1]) {
    for(let row=0;row<Math.floor(h/.48);row++) {
      const scale=row%2?[.40,.445,.8]:[.8,.445,.40];
      stones.push({geometry:box,position:[x+sx*(w/2-scale[0]/2+.025),.25+row*.48,z+sz*(d/2-scale[2]/2+.025)],scale});
    }
  }
  for(const y of [3.05,h-.2].filter((v,i,a)=>i===0||v-a[0]>1)) {
    stones.push({geometry:box,position:[x,y,z+d/2+.06],scale:[w+.12,.13,.18]},
      {geometry:box,position:[x-w/2-.06,y,z],scale:[.18,.13,d]},
      {geometry:box,position:[x+w/2+.06,y,z],scale:[.18,.13,d]});
  }
  // Timber lintels and visible joist ends: small, shallow, non-colliding trim.
  for(let xx=-w/2+.65;xx<w/2;xx+=1.15) {
    wood.push({geometry:box,position:[x+xx,h-.42,z+d/2+.10],scale:[.14,.19,.28]});
  }
  if(w>8) {
    const levels=h>7.1?[3.6,6.15]:[Math.min(h-1.35,3.7)];
    const windows=Math.min(3,Math.max(2,Math.floor(w/4.8)));
    const code=Math.abs(Math.round(x*41+z*67+h*29));
    for(const level of levels) for(let i=0;i<windows;i++) {
      const phase=code*.031+level*.71+i*1.37;
      const wx=x+(i-(windows-1)/2)*Math.min(3.6,(w-2.2)/windows)+Math.sin(phase)*.08;
      const wy=level+Math.cos(phase*.83)*.055;
      for(const side of [-1,1]) stones.push({geometry:box,
        position:[wx+side*.52,wy,z+d/2+.20],scale:[.14,1.2,.26]});
      // Recessed reveal casts its own shadow rather than a flat black decal.
      wood.push({geometry:box,position:[wx,wy-.49,z+d/2+.19],scale:[.92,.07,.18]});
    }
  }
  const ashlar=new THREE.Mesh(combine(stones),stone);
  ashlar.name="Dressed corner quoins and storey string courses";
  ashlar.castShadow=ashlar.receiveShadow=true;parent.add(ashlar);
  const beams=new THREE.Mesh(combine(wood),timber);
  beams.name="Exposed timber joist ends";beams.receiveShadow=true;parent.add(beams);
  box.dispose();
}

// 24 longitudinal stations and 16 curved bilge divisions instead of a six-
// station triangular hull. UVs follow the strakes; the gunwale remains open.
export function merchantHull(length=8,width=3.5,depth=1.25) {
  const positions=[],uvs=[],indices=[];const rows=24,columns=16;
  const stride=(rows+1)*(columns+1);
  for(let shell=0;shell<2;shell++) for(let row=0;row<=rows;row++) {
    const t=row/rows,q=t*2-1;
    const beam=Math.max(.025,Math.pow(Math.sin(Math.PI*t),.64))*(1-.14*q);
    const sheer=.025+.23*Math.pow(Math.abs(q),3);
    for(let col=0;col<=columns;col++) {
      const a=-Math.PI/2+col/columns*Math.PI;
      positions.push(Math.sin(a)*width*.5*beam*(shell?.96:1),
        sheer-Math.cos(a)*depth*(.25+.75*beam)+(shell?.035:0),q*length*.5);
      uvs.push(t*2,col/columns);
      if(row<rows&&col<columns) {
        const a0=shell*stride+row*(columns+1)+col,b=a0+columns+1;
        if(shell) indices.push(a0,b,a0+1,a0+1,b,b+1);
        else indices.push(a0,a0+1,b,a0+1,b+1,b);
      }
    }
  }
  for(let row=0;row<rows;row++) for(const col of [0,columns]) {
    const a=row*(columns+1)+col,b=a+columns+1;
    if(col===0) indices.push(a,b,a+stride,b,b+stride,a+stride);
    else indices.push(a,a+stride,b,b,a+stride,b+stride);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute("uv",new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  return geometry;
}

export function vesselDetailParts() {
  const box=new THREE.BoxGeometry(1,1,1),parts=[];
  // Deck planks, hatch coaming, frames, stem head, quarter-rudder blade.
  for(let i=0;i<11;i++) parts.push({geometry:box,position:[(i-5)*.215,.60,.35],scale:[.205,.08,5.1]});
  for(const side of [-1,1]) {
    parts.push({geometry:box,position:[side*.62,.82,1.25],scale:[.12,.28,1.35]},
      {geometry:box,position:[0,.82,1.25+side*.64],scale:[1.35,.28,.1]});
    for(let i=0;i<9;i++) {
      const z=-2.65+i*.64,half=1.63*Math.pow(Math.sin(Math.PI*(z/8+.5)),.64);
      parts.push({geometry:box,position:[side*half,.57,z],scale:[.09,.42,.11]});
    }
  }
  parts.push({geometry:box,position:[1.43,.08,2.95],rotation:[1.03,0,.14],scale:[.34,.85,.09]});
  const result=combine(parts);box.dispose();return result;
}

export function potteryDisplay(parent, clay, glaze) {
  // Open vessels with a real wall, foot ring and inner bowl. Shapes are
  // interpretations of Acre's common tablewares, not copies of catalog finds.
  const profile=[[.07,0],[.10,.02],[.14,.03],[.23,.10],[.29,.18],
    [.295,.21],[.27,.22],[.25,.18],[.19,.10],[.10,.065],[0,.065]];
  const bowlGeometry=new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),40);
  const footGeometry=new THREE.TorusGeometry(.085,.014,6,32).rotateX(Math.PI/2);
  const parts=[];
  for(let i=0;i<3;i++) {
    const bowl=new THREE.Mesh(bowlGeometry,i===0?glaze:clay);
    bowl.position.set((i-1)*.34,1.195,i===1?.2:-.18);
    bowl.scale.setScalar(.68);bowl.castShadow=bowl.receiveShadow=true;
    bowl.name=i===0?"Glazed sgraffito serving bowl":"Unglazed Acre-type eating bowl";
    parent.add(bowl);
    parts.push({geometry:footGeometry,position:[bowl.position.x,1.2,bowl.position.z],scale:[.68,.68,.68]});
  }
  const feet=new THREE.Mesh(combine(parts),clay);feet.name="Pottery foot rings";parent.add(feet);
  footGeometry.dispose();
}

export function sgraffitoTexture() {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const c=canvas.getContext('2d');c.fillStyle='#c5a269';c.fillRect(0,0,512,512);
  c.strokeStyle='#6d522d';c.lineWidth=2;
  for(const y of [75,88,307,320]){c.beginPath();c.moveTo(0,y);c.lineTo(512,y);c.stroke();}
  for(let x=0;x<512;x+=64) {
    c.beginPath();c.moveTo(x,120);c.bezierCurveTo(x+64,165,x,225,x+64,275);c.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=8;return texture;
}

export function createCrowdModels(root) {
  const cloth=new THREE.MeshStandardMaterial({color:0xffffff,map:loomTexture(),roughness:.94});
  const skin=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.82});
  const leather=new THREE.MeshStandardMaterial({color:0x544131,roughness:.84});
  const hair=new THREE.MeshStandardMaterial({color:0x342a21,roughness:1});
  const head=combine([
    {geometry:new THREE.SphereGeometry(.137,20,14),scale:[.83,1.19,.93]},
    {geometry:new THREE.SphereGeometry(.025,8,6),position:[0,-.01,.126],scale:[.8,1.5,1.3]},
    ...[-1,1].map(s=>({geometry:new THREE.SphereGeometry(.031,8,6),position:[s*.116,0,0],scale:[.4,1,.7]})),
  ]);
  const face=combine([-1,1].flatMap(s=>[
    {geometry:new THREE.SphereGeometry(.01,8,6),position:[s*.049,.027,.12],scale:[1,.65,.4]},
    {geometry:new THREE.BoxGeometry(.036,.009,.009),position:[s*.049,.046,.119]},
  ]).concat([{geometry:new THREE.BoxGeometry(.046,.006,.008),position:[0,-.059,.124]}]));
  const hood=new THREE.SphereGeometry(.163,20,12,Math.PI*.85,Math.PI*1.3,0,Math.PI*.78);
  const veil=combine([{geometry:hood,scale:[1,1.15,1]},
    {geometry:new THREE.CylinderGeometry(.145,.24,.32,20,1,true,Math.PI*.32,Math.PI*1.36),position:[0,-.21,-.015],scale:[1,1,.75]}]);
  const definitions={
    body:[foldedGarment(.235,.175,.27,1.04),cloth,1],
    head:[head,skin,1],face:[face,hair,1],
    cap:[new THREE.SphereGeometry(.144,20,10,0,Math.PI*2,0,Math.PI*.53),cloth,1],
    veil:[veil,cloth,1],
    arms:[new THREE.CapsuleGeometry(.062,.36,6,12),cloth,2],
    hands:[new THREE.CapsuleGeometry(.042,.055,5,10),skin,2],
    legs:[new THREE.CapsuleGeometry(.062,.46,6,12),cloth,2],
    shoes:[new THREE.SphereGeometry(.1,12,8).scale(.73,.56,1.6),leather,2],
    belt:[new THREE.TorusGeometry(.186,.017,5,32).rotateX(Math.PI/2).scale(1,1,.74),leather,1],
    pouch:[new THREE.SphereGeometry(.08,12,8).scale(.9,1.25,.55),leather,1],
    farBody:[combine([
      {geometry:new THREE.CylinderGeometry(.22,.26,.90,10),position:[0,.95,0],scale:[1,1,.72]},
      ...[-1,1].map(s=>({geometry:new THREE.BoxGeometry(.12,.48,.16),position:[s*.10,.26,0]})),
      ...[-1,1].map(s=>({geometry:new THREE.BoxGeometry(.12,.5,.15),position:[s*.25,1.12,0]})),
    ]),cloth,1],
    farHead:[new THREE.SphereGeometry(.135,10,8).scale(.9,1.15,1),skin,1],
  };
  const meshes={};
  for(const [name,[geometry,material,multiplier]] of Object.entries(definitions)) {
    const mesh=new THREE.InstancedMesh(geometry,material,32*multiplier);
    mesh.name=`Citizen ${name} · shared detailed instances`;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;
    mesh.castShadow=['body','head','veil'].includes(name);mesh.receiveShadow=true;
    root.add(mesh);meshes[name]=mesh;
  }
  const palette=[0x8a6650,0xb3a27d,0x668184,0x9c6855,0x69734c,0xb9ad90,0x766d87,0x4d6577];
  const skinColors=[0xc59670,0xa97550,0xd6aa84,0x976642,0xb78159];
  for(let i=0;i<32;i++) {
    const color=new THREE.Color(palette[i%palette.length]);
    for(const name of ['body','arms','legs','cap','veil','head','hands']) {
      const count=definitions[name][2];
      const tone=name==='head'||name==='hands'?new THREE.Color(skinColors[i%skinColors.length]):
        name==='cap'||name==='veil'?new THREE.Color(i%3?0xd9d0b5:0x81765e):color;
      for(let n=0;n<count;n++)meshes[name].setColorAt(i*count+n,tone);
    }
  }
  const object=new THREE.Object3D();
  let nearCount=0,farCount=0;
  return {
    begin(population,visible) {
      nearCount=farCount=0;
      for(const mesh of Object.values(meshes)) mesh.visible=visible;
    },
    draw(sourceIndex,p,gait,distance) {
      if(distance>90)return;
      if(distance>27) {
        const index=farCount++;
        for(const name of ['farBody','farHead']) {
          object.position.set(p.x,name==='farHead'?1.59:0,p.z);
          object.rotation.set(0,p.yaw,0);object.scale.setScalar(1);object.updateMatrix();
          meshes[name].setMatrixAt(index,object.matrix);
          meshes[name].setColorAt(index,new THREE.Color(name==='farHead'?skinColors[sourceIndex%skinColors.length]:palette[sourceIndex%palette.length]));
        }
        return;
      }
      const i=nearCount++;
      for(const name of ['body','arms','legs','cap','veil','head','hands']) {
        const count=definitions[name][2];
        const tone=name==='head'||name==='hands'?skinColors[sourceIndex%skinColors.length]:
          name==='cap'||name==='veil'?(sourceIndex%3?0xd9d0b5:0x81765e):palette[sourceIndex%palette.length];
        for(let n=0;n<count;n++)meshes[name].setColorAt(i*count+n,new THREE.Color(tone));
      }
      const tall=.95+(sourceIndex%4)*.025, long=sourceIndex%3===0;
      const place=(name,index,x,y,z,tilt=0,scaleY=1,show=true)=>{
        object.position.set(p.x+Math.cos(p.yaw)*x+Math.sin(p.yaw)*z,y*tall,p.z-Math.sin(p.yaw)*x+Math.cos(p.yaw)*z);
        object.rotation.set(0,p.yaw,0);object.rotateX(tilt);
        object.scale.set(show?1:0,show?scaleY*tall:0,show?1:0);object.updateMatrix();
        meshes[name].setMatrixAt(index,object.matrix);
      };
      place('body',i,0,long?.9:1.02,0,0,long?1:.78);
      place('head',i,0,1.59,.015);place('face',i,0,1.59,.015);
      place('cap',i,0,1.635,0,0,1,!long);place('veil',i,0,1.63,0,0,1,long);
      place('belt',i,0,1.045,0);place('pouch',i,.16,.94,.14);
      for(const side of [-1,1]) {
        const index=i*2+(side===1?1:0),swing=side*gait;
        place('arms',index,side*.258,1.185,Math.sin(swing)*.18,-swing*.6);
        place('hands',index,side*.263,.91,Math.sin(swing)*.33);
        place('legs',index,side*.10,.37,-Math.sin(swing)*.14,swing);
        place('shoes',index,side*.10,.08,.065-Math.sin(swing)*.27);
      }
    },
    end(){Object.entries(meshes).forEach(([name,mesh])=>{
      mesh.count=(name.startsWith('far')?farCount:nearCount)*definitions[name][2];
      mesh.instanceMatrix.needsUpdate=true;
      if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    });},
    budget:{draws:Object.keys(meshes).length,trianglesPerPerson:Object.values(definitions).reduce((sum,[g,,n])=>sum+n*(g.index?g.index.count:g.attributes.position.count)/3,0)},
  };
}
