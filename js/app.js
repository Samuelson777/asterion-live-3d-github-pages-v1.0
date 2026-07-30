import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { versions, subsystemPatterns } from './versions.js';

const $ = (selector, parent=document) => parent.querySelector(selector);
const $$ = (selector, parent=document) => [...parent.querySelectorAll(selector)];
const viewer = $('#viewer');
const loadStatus = $('#load-status');
let selectedIndex = versions.findIndex(v => location.hash === `#${v.id}`);
if (selectedIndex < 0) selectedIndex = versions.length - 1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050a12);
scene.fog = new THREE.FogExp2(0x050a12, 0.0022);
const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 3000);
camera.position.set(60, 36, 60);
const renderer = new THREE.WebGLRenderer({antialias:true, alpha:false, preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.localClippingEnabled = true;
viewer.replaceChildren(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = .06; controls.screenSpacePanning = true;

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), .03).texture;
scene.add(new THREE.HemisphereLight(0xdff4ff,0x132033,2.2));
const key = new THREE.DirectionalLight(0xffffff,4); key.position.set(48,72,40); scene.add(key);
const rim = new THREE.DirectionalLight(0x65caff,2.2); rim.position.set(-50,18,-32); scene.add(rim);
const fill = new THREE.DirectionalLight(0xa9ffd4,1.2); fill.position.set(12,-25,40); scene.add(fill);

const world = new THREE.Group(); scene.add(world);
const overlayGroup = new THREE.Group(); scene.add(overlayGroup);
const grid = new THREE.GridHelper(180, 36, 0x29425b, 0x152336); grid.rotation.z = Math.PI/2; grid.position.x=-30; grid.material.opacity=.26; grid.material.transparent=true; scene.add(grid);
const stars = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({color:0x8dcfff,size:.22,transparent:true,opacity:.75}));
{
  const pts=[]; for(let i=0;i<1600;i++){const r=400+Math.random()*600;const a=Math.random()*Math.PI*2;const z=(Math.random()-.5)*850;pts.push(Math.cos(a)*r,Math.sin(a)*r,z)}
  stars.geometry.setAttribute('position',new THREE.Float32BufferAttribute(pts,3)); scene.add(stars);
}
const loader = new GLTFLoader();
let currentRoot=null, currentMeshes=[], currentBox=new THREE.Box3(), currentSize=new THREE.Vector3();
let autoRotate=true, wireframe=false, xray=false, activeSubsystem='all', explodeFactor=0;
const clippingPlane = new THREE.Plane(new THREE.Vector3(-1,0,0), 100000);
let baseCameraPosition = new THREE.Vector3(60,36,60), baseTarget = new THREE.Vector3();
let fpsCounter=0, fpsTime=performance.now(), fps=0;

function status(text, mode='ready'){
  loadStatus.className=`load-status ${mode==='loading'?'loading':mode==='error'?'error':''}`;
  $('b',loadStatus).textContent=text;
}
function disposeObject(object){
  object.traverse(node=>{if(node.geometry) node.geometry.dispose(); if(node.material){const ms=Array.isArray(node.material)?node.material:[node.material];ms.forEach(m=>m.dispose?.());}});
}
function clearWorld(){
  overlayGroup.clear();
  if(currentRoot){world.remove(currentRoot);disposeObject(currentRoot);currentRoot=null;}
  currentMeshes=[];
}
function cloneMaterials(root){
  root.traverse(node=>{
    if(!node.isMesh) return;
    if(Array.isArray(node.material)) node.material=node.material.map(m=>m.clone()); else node.material=node.material.clone();
    const mats=Array.isArray(node.material)?node.material:[node.material];
    mats.forEach(m=>{m.userData.base={opacity:m.opacity,transparent:m.transparent,color:m.color?.clone(),emissive:m.emissive?.clone(),wireframe:!!m.wireframe};m.clippingPlanes=[clippingPlane];m.clipShadows=true;});
    node.userData.basePosition=node.position.clone();
    node.userData.displayName=(node.name||node.parent?.name||'component').toUpperCase();
  });
}
function createProceduralConcept(){
  const group=new THREE.Group(); group.name='ASTERION_V0_1_CONCEPT';
  const metal=new THREE.MeshStandardMaterial({color:0xb8cad8,metalness:.75,roughness:.3});
  const cyan=new THREE.MeshStandardMaterial({color:0x4cc8ff,metalness:.2,roughness:.35,emissive:0x062b40});
  const green=new THREE.MeshStandardMaterial({color:0x75e7b0,metalness:.15,roughness:.4,emissive:0x083523});
  const dark=new THREE.MeshStandardMaterial({color:0x1e3753,metalness:.25,roughness:.45});
  const spine=new THREE.Mesh(new THREE.CylinderGeometry(1.25,1.25,42,24),metal);spine.rotation.z=Math.PI/2;spine.name='central_spine';group.add(spine);
  [-2.5,2.5].forEach((x,i)=>{const ring=new THREE.Mesh(new THREE.TorusGeometry(12,1.0,18,96),i?green:cyan);ring.rotation.y=Math.PI/2;ring.position.x=x;ring.name=`habitat_ring_${i+1}`;group.add(ring)});
  [[0,28,0],[0,-28,0],[0,0,28],[0,0,-28]].forEach((p,i)=>{const panel=new THREE.Mesh(new THREE.BoxGeometry(12,.22,5),dark);panel.position.set(...p);if(i>1)panel.rotation.x=Math.PI/2;panel.name=`solar_array_${i+1}`;group.add(panel)});
  for(let i=0;i<6;i++){const a=i*Math.PI/3;const pod=new THREE.Mesh(new THREE.CylinderGeometry(.75,.9,4,20),metal);pod.rotation.z=Math.PI/2;pod.position.set(-18,Math.cos(a)*3.4,Math.sin(a)*3.4);pod.name=`propulsion_pod_${i+1}`;group.add(pod)}
  const skimmer=new THREE.Mesh(new THREE.ConeGeometry(3.4,8,4),dark);skimmer.rotation.z=-Math.PI/2;skimmer.position.x=25;skimmer.name='skimmer_concept';group.add(skimmer);
  return group;
}
async function loadSingle(path){
  return new Promise((resolve,reject)=>loader.load(path,g=>resolve(g.scene),xhr=>{if(xhr.total)status(`Loading ${Math.round(xhr.loaded/xhr.total*100)}%`,'loading')},reject));
}
async function loadManufacturing(paths){
  const group=new THREE.Group(); group.name='V0_7_MANUFACTURING_PORTFOLIO';
  const roots=await Promise.all(paths.map(loadSingle));
  const positions=[[-3.5,3.2,0],[3.5,3.2,0],[-3.5,-3.2,0],[3.5,-3.2,0]];
  roots.forEach((root,i)=>{const box=new THREE.Box3().setFromObject(root);const size=box.getSize(new THREE.Vector3());const center=box.getCenter(new THREE.Vector3());root.position.sub(center);const scale=4.5/(Math.max(size.x,size.y,size.z)||1);root.scale.setScalar(scale);root.position.add(new THREE.Vector3(...positions[i]));group.add(root)});
  return group;
}
function prepareRoot(root){
  cloneMaterials(root); currentRoot=root; world.add(root); currentMeshes=[];
  root.traverse(n=>{if(n.isMesh)currentMeshes.push(n)});
  currentBox.setFromObject(root); const center=currentBox.getCenter(new THREE.Vector3()); currentSize=currentBox.getSize(new THREE.Vector3());
  root.position.sub(center); root.updateMatrixWorld(true); currentBox.setFromObject(root); currentSize=currentBox.getSize(new THREE.Vector3());
  currentMeshes.forEach(mesh=>{
    const b=new THREE.Box3().setFromObject(mesh);const c=b.getCenter(new THREE.Vector3());
    const local=mesh.parent.worldToLocal(c.clone()); const base=mesh.position.clone();
    mesh.userData.basePosition=base; mesh.userData.explodeVector=local.sub(base).normalize().multiplyScalar(Math.max(currentSize.length()*.08,1));
  });
  applyDisplayState(); fitView();
  $('#hud-model').textContent=versions[selectedIndex].id.toUpperCase();
  $('#hud-size').textContent=`${currentSize.x.toFixed(1)} × ${currentSize.y.toFixed(1)} × ${currentSize.z.toFixed(1)}`;
  $('#hud-objects').textContent=String(currentMeshes.length);
}
function frameDistance(){const maxDim=Math.max(currentSize.x,currentSize.y,currentSize.z)||20;return maxDim/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)))*1.25}
function fitView(){const d=frameDistance();camera.position.set(d*.85,d*.55,d*.85);camera.near=Math.max(d/1000,.01);camera.far=d*40;camera.updateProjectionMatrix();controls.target.set(0,0,0);controls.update();baseCameraPosition=camera.position.clone();baseTarget=controls.target.clone()}
function resetView(){camera.position.copy(baseCameraPosition);controls.target.copy(baseTarget);controls.update()}
function addArrow(origin,dir,length,color,label){const arrow=new THREE.ArrowHelper(dir.clone().normalize(),origin,length,color,Math.min(length*.22,2),Math.min(length*.1,1));arrow.name=label;overlayGroup.add(arrow)}
function addOverlay(version){
  overlayGroup.clear(); if(version.overlay==='loads'){
    addArrow(new THREE.Vector3(22,0,0),new THREE.Vector3(-1,0,0),12,0x66c9ff,'Docking compression');
    addArrow(new THREE.Vector3(-20,0,0),new THREE.Vector3(1,0,0),15,0xa7ffd0,'Propulsion thrust');
    addArrow(new THREE.Vector3(0,11,0),new THREE.Vector3(0,0,1),8,0xffb36c,'Ring braking');
  } else if(version.overlay==='optimised'){
    const material=new THREE.LineBasicMaterial({color:0xa7ffd0,transparent:true,opacity:.85});
    const points=[];for(let i=0;i<80;i++){const a=i/79*Math.PI*2;points.push(new THREE.Vector3(0,13.5*Math.cos(a),13.5*Math.sin(a)))}
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),material);line.rotation.y=Math.PI/2;overlayGroup.add(line);
  }
}
async function loadVersion(index){
  selectedIndex=(index+versions.length)%versions.length; const v=versions[selectedIndex];
  location.hash=v.id; status(`Loading ${v.id}…`,'loading'); clearWorld(); activeSubsystem='all'; explodeFactor=0; $('#explode').value='0'; $('#clip').value='1';
  $$('.subsystem').forEach(b=>b.classList.toggle('active',b.dataset.subsystem==='all'));
  try{
    let root;
    if(v.modelMode==='procedural') root=createProceduralConcept();
    else if(v.modelMode==='manufacturing') root=await loadManufacturing(v.models);
    else root=await loadSingle(v.model);
    prepareRoot(root); addOverlay(v); updateVersionUI(v); status(`${v.id} loaded`);
  }catch(error){console.error(error);status('Model failed to load','error');viewer.insertAdjacentHTML('beforeend','<div class="viewer-fallback"><strong>3D model unavailable</strong><span>Run the site through a local HTTP server or GitHub Pages.</span></div>');}
}
function applyDisplayState(){
  const patterns=subsystemPatterns[activeSubsystem]||[];
  currentMeshes.forEach(mesh=>{
    const name=mesh.userData.displayName||''; const selected=activeSubsystem==='all'||patterns.some(p=>name.includes(p));
    const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];
    mats.forEach(m=>{
      const b=m.userData.base||{};m.wireframe=wireframe;
      m.transparent=xray||!selected||b.transparent;
      m.opacity=xray?(selected?.72:.10):(selected?(b.opacity??1):.08);
      if(m.color&&b.color)m.color.copy(b.color);
      if(m.emissive&&b.emissive)m.emissive.copy(b.emissive);
      if(selected&&activeSubsystem!=='all'&&m.emissive)m.emissive.setHex(0x0d4a61);
      m.needsUpdate=true;
    });
    const base=mesh.userData.basePosition||new THREE.Vector3();const vec=mesh.userData.explodeVector||new THREE.Vector3();mesh.position.copy(base).addScaledVector(vec,explodeFactor);
  });
  const maxX=Math.max(currentSize.x/2,1);clippingPlane.constant=Number($('#clip').value)*maxX;
}
function updateVersionUI(v){
  $$('.version-button').forEach((b,i)=>b.classList.toggle('active',i===selectedIndex));
  $('#detail-version').textContent=v.id;$('#detail-phase').textContent=v.phase;$('#detail-title').textContent=v.title;$('#detail-summary').textContent=v.summary;$('#detail-status').textContent=v.status;
  $('#skills').innerHTML=v.skills.map(x=>`<span>${x}</span>`).join('');
  $('#version-metrics').innerHTML=v.metrics.map(([l,val,n])=>`<div class="version-metric"><span>${l}</span><b>${val}</b><small>${n}</small></div>`).join('');
  $('#results-title').textContent=`${v.id} — ${v.title}`;$('#results-intro').textContent=v.summary;
  const disciplines=[['CAD',v.progress.cad],['CAE',v.progress.cae],['CAM',v.progress.cam],['Documentation',v.progress.docs]];
  $('#discipline-progress').innerHTML=disciplines.map(([l,val])=>progressHTML(l,val,'%')).join('');
  $('#stage-results').innerHTML=v.results.map(r=>progressHTML(r.label,r.value,r.suffix)).join('');
  $('#engineering-notes').innerHTML=v.notes.map(n=>`<li>${n}</li>`).join('');
  $('#gallery').innerHTML=v.gallery.length?v.gallery.map((src,i)=>`<figure><img src="${src}" alt="${v.id} engineering evidence ${i+1}" loading="lazy"><figcaption>${v.title} evidence ${i+1}</figcaption></figure>`).join(''):'<p class="empty-state">This phase is represented by the live procedural 3D concept and its requirements data.</p>';
  $('#version-deliverables').innerHTML=`<strong>${v.id} resources:</strong>`+v.deliverables.map(([label,href])=>`<a href="${href}">${label}</a>`).join('');
}
function progressHTML(label,value,suffix){const width=Math.min(Math.max(Number(value),0),100);return `<div class="progress-row"><div class="progress-label"><span>${label}</span><b>${value}${suffix}</b></div><div class="progress-track"><div class="progress-fill" style="width:${width}%"></div></div></div>`}
function buildVersionList(){
  $('#version-list').innerHTML=versions.map((v,i)=>`<button class="version-button" type="button" data-index="${i}"><span class="number">${v.label}</span><span><b>${v.title}</b><small>${v.phase}</small></span></button>`).join('');
  $$('.version-button').forEach(b=>b.addEventListener('click',()=>loadVersion(Number(b.dataset.index))));
}
function togglePressed(button,value){button.classList.toggle('active',value);button.setAttribute('aria-pressed',String(value))}
$('#reset-view').addEventListener('click',resetView);$('#fit-view').addEventListener('click',fitView);
$('#auto-rotate').addEventListener('click',e=>{autoRotate=!autoRotate;togglePressed(e.currentTarget,autoRotate)});
$('#wireframe').addEventListener('click',e=>{wireframe=!wireframe;togglePressed(e.currentTarget,wireframe);applyDisplayState()});
$('#xray').addEventListener('click',e=>{xray=!xray;togglePressed(e.currentTarget,xray);applyDisplayState()});
$('#explode').addEventListener('input',e=>{explodeFactor=Number(e.target.value);applyDisplayState()});
$('#clip').addEventListener('input',applyDisplayState);
$('#capture').addEventListener('click',()=>{renderer.render(scene,camera);const a=document.createElement('a');a.download=`asterion-${versions[selectedIndex].id}-snapshot.png`;a.href=renderer.domElement.toDataURL('image/png');a.click()});
$('#previous-version').addEventListener('click',()=>loadVersion(selectedIndex-1));$('#next-version').addEventListener('click',()=>loadVersion(selectedIndex+1));
$$('.subsystem').forEach(b=>b.addEventListener('click',()=>{activeSubsystem=b.dataset.subsystem;$$('.subsystem').forEach(x=>x.classList.toggle('active',x===b));applyDisplayState()}));
$('#theme-toggle').addEventListener('click',()=>{const root=document.documentElement;const light=root.dataset.theme==='light';root.dataset.theme=light?'dark':'light'});
window.addEventListener('keydown',e=>{if(e.target.matches('input,button,a'))return;const k=e.key.toLowerCase();if(k==='r')resetView();if(k==='w')$('#wireframe').click();if(k==='a')$('#auto-rotate').click()});
window.addEventListener('hashchange',()=>{const i=versions.findIndex(v=>location.hash===`#${v.id}`);if(i>=0&&i!==selectedIndex)loadVersion(i)});
function resize(){const w=viewer.clientWidth,h=viewer.clientHeight;camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();renderer.setSize(w,h,false)}new ResizeObserver(resize).observe(viewer);
function animate(now){requestAnimationFrame(animate);controls.update();if(currentRoot&&autoRotate)currentRoot.rotation.y+=.0012;stars.rotation.x+=.00002;renderer.render(scene,camera);fpsCounter++;if(now-fpsTime>700){fps=Math.round(fpsCounter*1000/(now-fpsTime));fpsCounter=0;fpsTime=now;$('#hud-fps').textContent=String(fps)}}requestAnimationFrame(animate);
if('serviceWorker' in navigator) addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
buildVersionList();loadVersion(selectedIndex);
