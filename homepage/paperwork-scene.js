import * as T from './assets/vendor/three-0.160.0.module.min.js';

export function createPaperworkScene(host){
 const compact=host.clientWidth<500;
 const renderer=new T.WebGLRenderer({alpha:false,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,compact?1.5:1.6));
 renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.toneMapping=T.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.05;
 renderer.shadowMap.enabled=true;
 renderer.shadowMap.type=T.VSMShadowMap;
 renderer.domElement.className='paperwork-canvas';
 renderer.domElement.setAttribute('aria-hidden','true');
 host.append(renderer.domElement);
 const scene=new T.Scene();
 scene.background=new T.Color('#0d0e10');
 scene.fog=new T.Fog('#0d0e10',13,28);
 const camera=new T.PerspectiveCamera(34,1,.1,50);
 camera.position.set(4.8,6.95,7.95);
 camera.lookAt(0,.82,.55);
 const group=new T.Group();
 group.rotation.y=-.16;
 group.position.z=.28;
 scene.add(group);

 // Stable procedural fibers and desk grain; no photographic assets are changed.
 let seed=719;
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 function canvasTexture(w,h,paint){
  const c=document.createElement('canvas');c.width=w;c.height=h;
  paint(c.getContext('2d'),w,h);
  const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;
  texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  return texture;
 }
 const grain=canvasTexture(512,512,(ctx,w,h)=>{
  const im=ctx.createImageData(w,h);
  for(let i=0;i<im.data.length;i+=4){const v=100+random()*76;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255;}
  ctx.putImageData(im,0,0);
 });
 grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(5,5);
 const desk=new T.Mesh(new T.PlaneGeometry(80,80),new T.MeshStandardMaterial({color:'#101113',roughness:.93,bumpMap:grain,bumpScale:.014}));
 desk.rotation.x=-Math.PI/2;desk.position.y=-.12;desk.receiveShadow=true;scene.add(desk);

 // Softbox reflection gives the steel a brushed, dimensional highlight.
 const environment=new T.Scene();
 environment.background=new T.Color('#292a2c');
 const boxLight=(w,h,x,y,z,color)=>{
  const panel=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color,side:T.DoubleSide}));
  panel.position.set(x,y,z);panel.lookAt(0,0,0);environment.add(panel);
 };
 boxLight(8,3,-3,6,4,'#ffffff');boxLight(3,7,5,3,-2,'#b7c3cf');boxLight(7,1,-2,1,-6,'#e2d2b6');
 const pmrem=new T.PMREMGenerator(renderer);
 const envMap=pmrem.fromScene(environment,.04).texture;scene.environment=envMap;pmrem.dispose();
 const key=new T.DirectionalLight('#fff7e9',2.5);key.position.set(-3,7,5);key.castShadow=true;
 key.shadow.mapSize.set(1024,1024);
 key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;
 key.shadow.camera.near=.5;key.shadow.camera.far=18;key.shadow.normalBias=.006;key.shadow.bias=-.00005;key.shadow.radius=4;key.shadow.blurSamples=8;
 scene.add(key);
 const fill=new T.DirectionalLight('#dbe6ef',2.0);fill.position.set(5,3,-4);scene.add(fill);
 scene.add(new T.HemisphereLight('#eef0f2','#898888',1.6));

 const leather=new T.MeshStandardMaterial({color:'#161719',roughness:.81,bumpMap:grain,bumpScale:.018,envMapIntensity:.22});
 const gold=new T.MeshStandardMaterial({color:'#ffd84f',roughness:.64,metalness:.12});
 const steel=new T.MeshStandardMaterial({color:'#d4d6d7',roughness:.27,metalness:.8,envMapIntensity:2.3});
 function rounded(w,d,r,depth,material,x,y,z){
  const shape=new T.Shape(),a=-w/2,b=-d/2;
  shape.moveTo(a+r,b);shape.lineTo(a+w-r,b);shape.quadraticCurveTo(a+w,b,a+w,b+r);
  shape.lineTo(a+w,b+d-r);shape.quadraticCurveTo(a+w,b+d,a+w-r,b+d);
  shape.lineTo(a+r,b+d);shape.quadraticCurveTo(a,b+d,a,b+d-r);
  shape.lineTo(a,b+r);shape.quadraticCurveTo(a,b,a+r,b);
  const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:.012,bevelSize:.013,bevelSegments:2,curveSegments:12,steps:1});
  g.rotateX(-Math.PI/2);
  const m=new T.Mesh(g,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;group.add(m);return m;
 }
 rounded(2.92,4.04,.12,.07,leather,0,0,1.26);
 rounded(.64,.85,.065,.012,gold,1.35,.1,2.1);
 rounded(2.86,3.97,.1,.024,leather,.015,.105,1.24);

 const edges=canvasTexture(256,1024,(ctx,w,h)=>{
  ctx.fillStyle='#cac9c4';ctx.fillRect(0,0,w,h);
  for(let y=0;y<h;y+=13){const v=Math.floor(125+random()*55);ctx.fillStyle=`rgb(${v},${v},${v-3})`;ctx.fillRect(0,y,w,2);ctx.fillStyle='rgba(255,255,251,.75)';ctx.fillRect(0,y+3,w,2);}
  const shade=ctx.createLinearGradient(0,0,w,0);shade.addColorStop(0,'#00000016');shade.addColorStop(.35,'#ffffff00');shade.addColorStop(1,'#00000012');ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
 });
 const edgeMat=new T.MeshStandardMaterial({map:edges,roughness:.9,color:'#ecebe6',envMapIntensity:.18});
 function paperTexture(variant){
  return canvasTexture(768,1024,(ctx,w,h)=>{
   ctx.fillStyle='#e7e6e1';ctx.fillRect(0,0,w,h);
   for(let i=0;i<12000;i++){ctx.fillStyle=random()>.5?'#ffffff19':'#3731260a';ctx.fillRect(random()*w,random()*h,1,1);}
   // Quiet printed schedules, with no invented customer data or new marketing copy.
   const left=64,right=w-62,top=132;
   ctx.fillStyle='#333536';ctx.fillRect(left,72,22,26);
   ctx.fillStyle='#737577';ctx.fillRect(left+36,74,158+variant*11,5);ctx.fillStyle='#999a9b';ctx.fillRect(left+36,88,111,3);
   ctx.strokeStyle='#757779';ctx.lineWidth=1.05;
   const rows=15+variant,step=40;
   for(let row=0;row<=rows;row++){ctx.beginPath();ctx.moveTo(left,top+row*step);ctx.lineTo(right,top+row*step);ctx.stroke();}
   for(const x of [left,left+55,left+222,left+360,right]){ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,top+rows*step);ctx.stroke();}
   ctx.fillStyle='#565b6040';ctx.fillRect(left,top,right-left,step);
   for(let row=1;row<rows;row++)for(const x of [left+12,left+70,left+239,left+376]){
    ctx.fillStyle='#666c7390';ctx.fillRect(x,top+row*step+15,18+random()*35,2.6);
   }
   ctx.fillStyle='#7c7e81';ctx.fillRect(left,top+rows*step+33,235,2);ctx.fillRect(left,top+rows*step+44,173,2);
   ctx.fillStyle='#717579';ctx.font='12px sans-serif';ctx.fillText(String(variant+1).padStart(2,'0'),right-18,h-48);
  });
 }
 const paperMaterials=Array.from({length:4},(_,i)=>new T.MeshStandardMaterial({map:paperTexture(i),color:'#e7e5df',side:T.DoubleSide,roughness:.94,metalness:0,envMapIntensity:.3}));
 const blank=new T.MeshStandardMaterial({color:'#dddcd7',roughness:.9});
 const stack=new T.Mesh(new T.BoxGeometry(2.453,.53,3.25),[edgeMat,edgeMat,blank,edgeMat,edgeMat,edgeMat]);
 stack.position.set(0,.43,1.63);stack.castShadow=stack.receiveShadow=true;group.add(stack);
 const edgeLayers=new T.InstancedMesh(new T.BoxGeometry(2.464,.0077,3.266),blank,58);
 const matrix=new T.Matrix4();
 for(let i=0;i<58;i++){matrix.makeTranslation(Math.sin(i*2.73)*.006,.171+i*.0091,1.63+Math.sin(i*1.97)*.005);edgeLayers.setMatrixAt(i,matrix);}
 edgeLayers.receiveShadow=true;group.add(edgeLayers);
 // Fine individual offsets on the top of the deep block catch the side light.
 for(let i=0;i<14;i++){
  const slice=new T.Mesh(new T.BoxGeometry(2.46,.007,3.26),[edgeMat,edgeMat,blank,edgeMat,edgeMat,edgeMat]);
  slice.position.set(Math.sin(i*4.9)*.007,.701+i*.007,1.63+Math.cos(i*2.1)*.005);slice.castShadow=slice.receiveShadow=true;group.add(slice);
 }

 // Steel spring clip: rounded jaw, curled barrel and pierced upper handle.
 rounded(1.52,.48,.09,.055,steel,0,.925,.085);
 const barrel=new T.Mesh(new T.CylinderGeometry(.105,.105,1.23,28),steel);barrel.rotation.z=Math.PI/2;barrel.position.set(0,1.005,-.06);barrel.castShadow=true;group.add(barrel);
 const handleShape=new T.Shape();handleShape.moveTo(-.39,0);handleShape.lineTo(.39,0);handleShape.lineTo(.28,.56);handleShape.quadraticCurveTo(0,.79,-.28,.56);handleShape.closePath();
 const hole=new T.Path();hole.absellipse(0,.47,.115,.14,0,Math.PI*2,true);handleShape.holes.push(hole);
 const handle=new T.Mesh(new T.ExtrudeGeometry(handleShape,{depth:.035,bevelEnabled:true,bevelSize:.018,bevelThickness:.01,bevelSegments:3,curveSegments:28}),steel);
 handle.rotation.x=-1.04;handle.position.set(0,1.01,-.13);handle.castShadow=true;group.add(handle);

 const count=18,cols=12,rows=48,width=2.46,length=3.26;
 const pages=[];
 for(let i=0;i<count;i++){
  const geometry=new T.PlaneGeometry(width,length,cols,rows);
  geometry.attributes.position.setUsage(T.DynamicDrawUsage);
  const sheet=new T.Mesh(geometry,paperMaterials[i%4]);
  sheet.castShadow=true;sheet.receiveShadow=false;sheet.frustumCulled=false;group.add(sheet);
  pages.push({sheet,last:-1});
 }
 function pose(index,t){
  const page=pages[index];if(Math.abs(page.last-t)<.000015)return;page.last=t;
  const positions=page.sheet.geometry.attributes.position;
  const activity=Math.sin(Math.PI*t);
  const finish=t*t*(3-2*t);
  const base=.807+((count-index)*(1-finish)+(index+1)*finish)*.0038;
  for(let x=0;x<=cols;x++){
   const across=x/cols-.5;
   let yy=0,zz=0;
   for(let j=0;j<=rows;j++){
    const s=j/rows;
    if(j){
     const along=(j-.5)/rows;
     // Integrating a rotating tangent keeps each sheet's arc length constant.
     const root=Math.min(1,along/.085);
     const angle=root*Math.max(0,(Math.PI+.27)*finish+activity*(-.75+1.5*along+across*.2));
     yy+=Math.sin(angle)*length/rows;zz+=Math.cos(angle)*length/rows;
    }
    const ripple=activity*Math.sin(s*Math.PI)*Math.sin(across*3+index*.47)*.018;
    positions.setXYZ(j*(cols+1)+x,across*width,base+yy+ripple,zz+.02);
   }
  }
  positions.needsUpdate=true;page.sheet.geometry.computeVertexNormals();
 }
 let previous=-1,enabled=true,widthPx=0,heightPx=0;
 function resize(){
  widthPx=host.clientWidth;heightPx=host.clientHeight;
  renderer.setSize(widthPx,heightPx,false);camera.aspect=widthPx/heightPx;camera.updateProjectionMatrix();previous=-1;
 }
 function render(progress){
  if(!enabled||!widthPx||Math.abs(previous-progress)<.00002)return;
  previous=progress;
  // Overlapping turns form a flowing paper fan while retaining a thick base stack.
  const travel=progress*(count+4.2)*.35;
  for(let i=0;i<count;i++)pose(i,Math.max(0,Math.min(1,(travel-i)/4.2)));
  renderer.render(scene,camera);
  renderer.domElement.classList.add('is-ready');
  host.dataset.paperworkState='ready';
  host.dataset.paperworkProgress=progress.toFixed(4);
 }
 renderer.domElement.addEventListener('webglcontextlost',event=>{
  event.preventDefault();enabled=false;renderer.domElement.classList.remove('is-ready');host.dataset.paperworkState='fallback';
 });
 renderer.domElement.addEventListener('webglcontextrestored',()=>{enabled=true;previous=-1;render(Number(host.dataset.paperworkProgress)||0)});
 resize();
 return {render,resize,setEnabled(value){enabled=value;renderer.domElement.classList.toggle('is-ready',value&&previous>=0);previous=-1}};
}
