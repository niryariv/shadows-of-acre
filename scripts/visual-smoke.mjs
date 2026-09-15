import assert from 'node:assert/strict';
import * as THREE from 'three';
import { voussoirArch, foldedGarment, merchantHull, createCrowdModels, potteryDisplay } from '../src/visual-detail.js';

const noop=()=>{};
const context=new Proxy({},{get:()=>noop,set:()=>true});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
const triangles=g=>(g.index?g.index.count:g.attributes.position.count)/3;
const finite=g=>{
  for(const attribute of Object.values(g.attributes)) for(const n of attribute.array) assert.ok(Number.isFinite(n));
  g.computeBoundingBox();assert.ok(!g.boundingBox.isEmpty());
};
const arch=voussoirArch(1,.2);
finite(arch);
const mesh=new THREE.Mesh(arch,new THREE.MeshBasicMaterial());mesh.updateMatrixWorld();
assert.equal(new THREE.Raycaster(new THREE.Vector3(0,.1,2),new THREE.Vector3(0,0,-1)).intersectObject(mesh).length,0,'Arch passage is open');
assert.ok(new THREE.Raycaster(new THREE.Vector3(0,1,2),new THREE.Vector3(0,0,-1)).intersectObject(mesh).length>0,'Arch crown is solid');
const hull=merchantHull();finite(hull);
assert.ok(triangles(hull)>1500&&triangles(hull)<1800,'Curved inner and outer hull, bounded detail');
const bottom=12*17+8;
assert.ok(hull.attributes.normal.getY(bottom)<-.95,'Outer hull faces the water');
assert.ok(hull.attributes.normal.getY(bottom+25*17)>.95,'Inner hull faces the hold');
const garment=foldedGarment();finite(garment);assert.ok(triangles(garment)>=1000);
const root=new THREE.Group(),crowd=createCrowdModels(root);
crowd.begin(3,true);
crowd.draw(0,{x:0,z:0,yaw:0},0,3);
crowd.draw(1,{x:40,z:0,yaw:1},.2,40);
crowd.draw(2,{x:100,z:0,yaw:2},.3,100);
crowd.end();
assert.equal(root.children.find(m=>m.name.startsWith('Citizen body ')).count,1);
assert.equal(root.children.find(m=>m.name.startsWith('Citizen farBody ')).count,1);
for(const object of root.children){finite(object.geometry);for(const n of object.instanceMatrix.array)assert.ok(Number.isFinite(n));}
crowd.begin(0,false);crowd.end();assert.ok(root.children.every(m=>m.count===0&&!m.visible));
assert.ok(crowd.budget.draws<=13,'Crowds remain instanced');
const display=new THREE.Group();potteryDisplay(display,new THREE.MeshBasicMaterial(),new THREE.MeshBasicMaterial());
assert.equal(display.children.length,4);
for(const object of display.children)finite(object.geometry);
console.log('Visual geometry: open stone arches, outward/inward hull normals, cloth, pottery and bounded crowd LOD passed.');
