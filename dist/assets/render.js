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


// Fit the visible ink, not just the font's advance width. The badge and burst
// reserve separate rectangular regions that sit wholly inside their outlines.
// Alphabetic baselines let asymmetric ascenders/descenders stay centered too.
function fittedText(ctx, config, { width, height, y, size, fallback = 'sans' }) {
  let fontSize = size * config.textScale;
  let lines = [], metrics = [], ascent = 0, descent = 0, pitch = 0, inkHeight = 0;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  for (let attempt = 0; attempt < 80; attempt++) {
    ctx.font = fontSpec(config, fontSize, fallback);
    lines = !config.text.includes('\n') && Array.from(config.text).length <= 14
      ? [config.text] : wrap(ctx, config.text, width);
    metrics = lines.map(line => ctx.measureText(line));
    ascent = Math.max(fontSize * .45, ...metrics.map(m => m.actualBoundingBoxAscent || 0));
    descent = Math.max(fontSize * .08, ...metrics.map(m => m.actualBoundingBoxDescent || 0));
    pitch = Math.max(fontSize * 1.18, ascent + descent + fontSize * .15);
    inkHeight = ascent + descent + (lines.length - 1) * pitch;
    const inkWidth = Math.max(0, ...metrics.map(m => Math.max(m.width, m.actualBoundingBoxLeft + m.actualBoundingBoxRight)));
    const ratio = Math.min(width / Math.max(1, inkWidth), height / Math.max(1, inkHeight));
    if (ratio >= 1 || fontSize <= .5) break;
    // Rewrap after small steps: a large height-based jump would shrink a long
    // paragraph too far before it can settle into fewer, more legible lines.
    fontSize = Math.max(.5, fontSize * .94);
  }
  const baseline = y - inkHeight / 2 + ascent;
  lines.forEach((line, i) => {
    const m = metrics[i];
    const centeredInk = (m.actualBoundingBoxLeft - m.actualBoundingBoxRight) / 2;
    ctx.fillText(line, centeredInk, baseline + i * pitch);
  });
}
function fittedCaption(ctx, config, { width, height, y }) {
  if (!config.subtext) return;
  fittedText(ctx, { ...config, text: config.subtext, font: 'rounded', textScale: 1 },
    { width, height, y, size: 17, fallback: 'rounded' });
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
  const centerY = -17;
  // Pennants begin outside the seal, so transparent faces never reveal ribbon
  // roots behind either text region. Mirroring keeps the two tails deliberate.
  ctx.save();
  ctx.lineWidth = 2.5;
  for (const side of [-1, 1]) {
    const points = [[52,141],[85,127],[124,199],[95,191],[82,214]];
    ctx.beginPath();
    points.forEach(([x,y],i) => i ? ctx.lineTo(side*x,y) : ctx.moveTo(side*x,y));
    ctx.closePath();
    ctx.globalAlpha = .14; ctx.fill();
    ctx.globalAlpha = .7; ctx.stroke();
  }
  ctx.restore();
  // A true circular, 24-point seal replaces the compressed irregular ellipse.
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  for (let i = 0; i < 48; i++) {
    const angle = i * Math.PI / 24 - Math.PI / 2;
    const radius = i % 2 ? 153 : 161;
    const x = Math.cos(angle) * radius, y = centerY + Math.sin(angle) * radius;
    i ? ctx.lineTo(x,y) : ctx.moveTo(x,y);
  }
  ctx.closePath(); ctx.stroke();
  ctx.lineWidth = 1.5; circle(ctx,0,centerY,141);
  check(ctx,0,-98,23);
  star(ctx,-70,-99,6); star(ctx,70,-99,6);
  // These ink boxes fit inside the inner ring with clearance at every corner.
  // Main: x ±114, y -59..45. Caption: x ±84, y 69..87.
  fittedText(ctx,c,{width:228,height:104,y:-7,size:63});
  fittedCaption(ctx,c,{width:168,height:18,y:78});
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
  // An evenly spaced 20-point burst has a predictable inner envelope. Its
  // central text rectangles are inset from even the shortest inward valleys.
  ctx.beginPath();
  for (let i = 0; i < 40; i++) {
    const angle = i * Math.PI / 20 - Math.PI / 2;
    const rx = i % 2 ? 188 : 205, ry = i % 2 ? 137 : 150;
    const x = Math.cos(angle) * rx, y = Math.sin(angle) * ry;
    i ? ctx.lineTo(x,y) : ctx.moveTo(x,y);
  }
  ctx.closePath();
  ctx.save(); ctx.globalAlpha = .11; ctx.fill(); ctx.restore();
  ctx.save(); ctx.globalAlpha = .7; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
  // Keep both sparks entirely outside the burst instead of crossing its rim.
  star(ctx,-223,0,5); star(ctx,223,0,5);
  // Main: x ±145, y -71..37. Caption: x ±112, y 77..99.
  fittedText(ctx,c,{width:290,height:108,y:-17,size:89});
  ctx.save(); ctx.globalAlpha = .5; strokeLine(ctx,-28,59,28,59,2); ctx.restore();
  fittedCaption(ctx,c,{width:224,height:22,y:88});
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
