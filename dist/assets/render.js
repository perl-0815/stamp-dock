const BASE = 512;
const FONT_FAMILY = {
  sans: '"StampDisplay", sans-serif',
  rounded: '"StampRound", sans-serif',
  serif: 'Georgia, "Yu Mincho", "Hiragino Mincho ProN", serif',
  mono: '"Courier New", "StampRound", monospace',
};
const TEXT_LIMIT = 40;
const fontLoads = new Map();
const renderVersions = new WeakMap();

function normalize(config = {}) {
  const text = Array.from(String(config.text ?? 'LGTM').replace(/\r\n?/g, '\n')).slice(0, TEXT_LIMIT).join('');
  return {
    ...config,
    text,
    subtext: Array.from(String(config.subtext ?? '')).slice(0, 40).join(''),
    color: /^#[0-9a-f]{6}$/i.test(config.color ?? '') ? config.color : '#39775b',
    textScale: Math.min(1.3, Math.max(0.7, Number(config.textScale) || 1)),
    rotation: Math.min(12, Math.max(-12, Number(config.rotation) || 0)),
  };
}

function fontSpec(config, size, fallback) {
  const chosen = config.font || fallback || 'sans';
  const weight = chosen === 'rounded' || chosen === 'mono' ? 700 : chosen === 'serif' ? 900 : 400;
  return `${weight} ${size}px ${FONT_FAMILY[chosen] || FONT_FAMILY.sans}`;
}

async function loadFonts(config) {
  if (!document.fonts) return;
  const text = `${config.text}${config.subtext}0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ`;
  const fonts = ['400 64px "StampDisplay"', '700 64px "StampRound"'];
  for (const font of fonts) {
    const key = `${font}:${text}`;
    if (!fontLoads.has(key)) {
      const pending = document.fonts.load(font, text).catch(error => { fontLoads.delete(key); throw error; });
      fontLoads.set(key, pending);
    }
    await fontLoads.get(key);
  }
}

function roundedRect(ctx, x, y, w, h, r = 16) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
}
function strokeLine(ctx, x1, y1, x2, y2, width = 4) {
  ctx.lineWidth = width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
}
function star(ctx, x, y, size = 13) {
  ctx.beginPath();ctx.moveTo(x,y-size);ctx.quadraticCurveTo(x+3,y-3,x+size,y);
  ctx.quadraticCurveTo(x+3,y+3,x,y+size);ctx.quadraticCurveTo(x-3,y+3,x-size,y);
  ctx.quadraticCurveTo(x-3,y-3,x,y-size);ctx.fill();
}
function check(ctx, x, y, s = 22) {
  ctx.lineWidth=6;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(x-s*0.6,y);ctx.lineTo(x-s*0.1,y+s*0.45);ctx.lineTo(x+s*0.75,y-s*0.6);ctx.stroke();
}
function circle(ctx,x,y,r,fill=false){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);fill?ctx.fill():ctx.stroke();}

function wrap(ctx, text, maxWidth) {
  const output=[];
  for(const paragraph of text.split('\n')){
    if (!paragraph) {output.push(''); continue;}
    let line='';
    // Preserve words where possible, while allowing Japanese and very long words to wrap.
    const units = paragraph.match(/[A-Za-z0-9_]+(?:[ !?.,:+/\-]*)|[^A-Za-z0-9_]/gu) || [];
    for(const unit of units){
      if(ctx.measureText(line+unit).width<=maxWidth){line+=unit;continue;}
      if(line.trim()){output.push(line.trimEnd());line='';}
      for(const char of Array.from(unit)){
        if(line && ctx.measureText(line+char).width>maxWidth){output.push(line.trimEnd());line='';}
        line+=char;
      }
    }
    output.push(line.trim());
  }
  return output;
}
function textBlock(ctx,config,{width=350,height=150,y=0,size=88,fallback='sans',lineHeight=1.15}={}){
  let fontSize=size*config.textScale, lines;
  do {
    ctx.font=fontSpec(config,fontSize,fallback);
    lines=!config.text.includes('\n') && Array.from(config.text).length<=14 ? [config.text] : wrap(ctx,config.text,width);
    if(lines.length*fontSize*lineHeight<=height && lines.every(line=>ctx.measureText(line).width<=width))break;
    fontSize-=1;
  } while(fontSize>7);
  ctx.textAlign='center';ctx.textBaseline='middle';
  const pitch=fontSize*lineHeight;
  lines.forEach((line,i)=>ctx.fillText(line,0,y+(i-(lines.length-1)/2)*pitch));
}
function caption(ctx,config,y,maxWidth=300,color=config.color){
  if(!config.subtext)return;
  let size=17;ctx.font=`700 ${size}px "StampRound", sans-serif`;
  while(ctx.measureText(config.subtext).width>maxWidth && size>7){size-=1;ctx.font=`700 ${size}px "StampRound", sans-serif`;}
  ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(config.subtext,0,y);
}

function drawOutline(ctx,c){
  ctx.lineWidth=7;roundedRect(ctx,-204,-115,408,230,14);ctx.stroke();
  ctx.lineWidth=1.6;roundedRect(ctx,-192,-103,384,206,8);ctx.stroke();
  check(ctx,0,-72,16);
  textBlock(ctx,c,{y:0,height:100,width:350,size:91});
  if(c.subtext){strokeLine(ctx,-110,65,110,65,1.7);caption(ctx,c,87,320);}
}
function drawSolid(ctx,c){
  ctx.save();ctx.translate(6,8);ctx.globalAlpha=.2;roundedRect(ctx,-203,-101,406,202,28);ctx.fill();ctx.restore();
  roundedRect(ctx,-203,-101,406,202,28);ctx.fill();
  ctx.fillStyle='#ffffff';textBlock(ctx,c,{y:c.subtext?-8:0,height:120,width:345,size:77,fallback:'rounded'});
  caption(ctx,c,67,325,'#ffffff');
}
function drawBadge(ctx,c){
  // A ribbon seal with a clear center, not an image of a UI badge.
  ctx.save();ctx.globalAlpha=.24;
  ctx.beginPath();ctx.moveTo(-130,85);ctx.lineTo(-149,172);ctx.lineTo(-100,150);ctx.lineTo(-57,178);ctx.lineTo(-43,95);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(130,85);ctx.lineTo(149,172);ctx.lineTo(100,150);ctx.lineTo(57,178);ctx.lineTo(43,95);ctx.closePath();ctx.fill();ctx.restore();
  ctx.lineWidth=5;ctx.beginPath();for(let i=0;i<48;i++){const a=i*Math.PI/24-Math.PI/2,r=i%2?155:163;const x=Math.cos(a)*r,y=Math.sin(a)*r*.91;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.stroke();
  ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,0,144,130,0,0,Math.PI*2);ctx.stroke();
  check(ctx,0,-78,27);
  textBlock(ctx,c,{width:270,height:105,y:4,size:59});
  caption(ctx,c,84,215);star(ctx,-107,72,7);star(ctx,107,72,7);
}
function drawTerminal(ctx,c){
  roundedRect(ctx,-202,-119,404,238,17);ctx.fill();
  ctx.save();ctx.fillStyle='#ffffff';ctx.globalAlpha=.6;for(let x=-174;x<=-138;x+=18)circle(ctx,x,-94,4,true);ctx.restore();
  ctx.strokeStyle='#ffffff';ctx.globalAlpha=.24;strokeLine(ctx,-201,-72,201,-72,1.5);ctx.globalAlpha=1;
  ctx.fillStyle='#ffffff';ctx.font='700 32px "Courier New", monospace';ctx.textAlign='left';ctx.fillText('>_',-173,-31);
  textBlock(ctx,c,{width:318,height:95,y:6,size:75,fallback:'mono'});
  caption(ctx,c,80,315,'#ffffff');
}
function drawPixel(ctx,c){
  const pts=[[-190,-94],[-178,-94],[-178,-106],[178,-106],[178,-94],[190,-94],[190,94],[178,94],[178,106],[-178,106],[-178,94],[-190,94]];
  ctx.lineWidth=5;ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.stroke();
  ctx.save();ctx.globalAlpha=.15;ctx.fillRect(-177,-91,354,182);ctx.restore();
  textBlock(ctx,c,{width:325,height:118,y:c.subtext?-10:0,size:80,fallback:'mono'});
  caption(ctx,c,67,310);
  for(const [x,y]of [[-164,-76],[158,-76],[-164,70],[158,70]])ctx.fillRect(x,y,6,6);
}
function drawHand(ctx,c){
  star(ctx,-161,-66,17);star(ctx,172,-43,12);star(ctx,143,94,10);
  ctx.save();ctx.rotate(-.035);textBlock(ctx,c,{width:330,height:150,y:-5,size:79,fallback:'rounded'});ctx.restore();
  ctx.lineWidth=6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-143,83);ctx.quadraticCurveTo(-20,65,144,75);ctx.stroke();
  ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(-124,94);ctx.quadraticCurveTo(-8,79,119,87);ctx.stroke();
  caption(ctx,c,124,320);
}
function drawCircle(ctx,c){
  ctx.lineWidth=6;circle(ctx,0,0,168);ctx.lineWidth=2;circle(ctx,0,0,157);
  strokeLine(ctx,-110,-66,110,-66,2);strokeLine(ctx,-110,66,110,66,2);
  textBlock(ctx,c,{width:275,height:110,y:0,size:68});
  if(c.subtext)caption(ctx,c,101,240);else{check(ctx,0,104,24);}
  star(ctx,-57,-110,8);star(ctx,57,-110,8);
}
function drawImpact(ctx,c){
  ctx.save();ctx.globalAlpha=.13;ctx.beginPath();
  const coords=[[-175,-92],[-125,-93],[-137,-142],[-63,-111],[-36,-149],[6,-116],[62,-144],[69,-103],[145,-130],[132,-79],[198,-64],[166,-13],[207,27],[159,52],[175,111],[99,104],[88,149],[28,120],[-18,151],[-50,119],[-124,143],[-115,96],[-190,97],[-163,43],[-207,19],[-171,-25],[-201,-65]];
  coords.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();ctx.restore();
  textBlock(ctx,c,{width:330,height:158,y:c.subtext?-8:0,size:89});
  caption(ctx,c,108,320);
  ctx.lineWidth=4;strokeLine(ctx,-175,-105,-190,-119,4);strokeLine(ctx,171,88,189,105,4);star(ctx,166,-104,11);
}
const drawers={outline:drawOutline,solid:drawSolid,badge:drawBadge,terminal:drawTerminal,pixel:drawPixel,hand:drawHand,circle:drawCircle,impact:drawImpact};

/** The preview and exported PNG use this exact renderer. Dimensions are square pixels. */
export async function renderStamp(canvas, config, size=512){
  const version = (renderVersions.get(canvas) || 0) + 1;
  renderVersions.set(canvas, version);
  const c=normalize(config);
  if(!Number.isInteger(size)||size<64||size>2048)throw new Error('画像サイズは64〜2048pxで指定してください。');
  await loadFonts(c);
  if (renderVersions.get(canvas) !== version) return canvas;
  // Resize only after font loading so an old preview stays visible while fonts load.
  canvas.width=size;canvas.height=size;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('画像を描画できませんでした。');
  ctx.clearRect(0,0,size,size);
  if(c.background==='white'||c.background==='color'){
    ctx.fillStyle=c.background==='white'?'#ffffff':(/^#[0-9a-f]{6}$/i.test(c.backgroundColor??'')?c.backgroundColor:'#f7f4ec');ctx.fillRect(0,0,size,size);
  }
  ctx.scale(size/BASE,size/BASE);ctx.translate(BASE/2,BASE/2);ctx.rotate(c.rotation*Math.PI/180);
  ctx.fillStyle=c.color;ctx.strokeStyle=c.color;ctx.lineJoin='round';ctx.lineCap='round';
  (drawers[c.style]||drawOutline)(ctx,c);
  return canvas;
}

export async function createStampBlob(config,size=512){
  const canvas=document.createElement('canvas');await renderStamp(canvas,config,size);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNGの生成に失敗しました。')),'image/png'));
}
