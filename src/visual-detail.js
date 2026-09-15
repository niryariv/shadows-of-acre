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

export { createCrowdModels } from "./character-models.js";
