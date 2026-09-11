(() => {
  'use strict';
  const canvas = document.querySelector('#idea-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const scene = document.querySelector('.idea-story');
  const action = scene.querySelector('.idea-action');
  const status = scene.querySelector('.idea-status');
  const hint = scene.querySelector('.idea-hint');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = { x: 280, y: 200, inside: false };
  const starts = [[103, 65, -.13], [413, 59, .12], [124, 184, -.12], [451, 238, .1], [120, 331, .09], [358, 386, -.13]];
  const slots = [[137,82,128,32], [344,82,150,32], [165,157,174,84], [354,214,136,178], [165,229,174,38], [156,289,156,38]];
  const pieces = starts.map(([x, y, a], i) => ({ x, y, a, sx: x, sy: y, sa: a, tx: slots[i][0], ty: slots[i][1], w: slots[i][2], h: slots[i][3], delay: 0, settle: 0, vx: 0, vy: 0, collected: false }));
  let frame = 0, lastTime = 0, time = 0, progress = 0, visible = true, latest = -1;
  const ink = '#f5f4f1', paper = '#111113';
  let gazeX = 0, gazeY = 0, characterX = 280, characterY = 222;
  const total = () => pieces.filter(p => p.collected).length;
  const lerp = (a, b, t) => a + (b - a) * t;
  function line(points, color = ink, width = 2) {
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = width;
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
  }
  function roundRect(x, y, w, h, r, fill, stroke) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  }
  function circle(x, y, r, fill, stroke) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  }
  function text(str, x, y, size = 14, color = ink, font = 'sans-serif') {
    ctx.fillStyle = color; ctx.font = `${size}px ${font}`; ctx.fillText(str, x, y);
  }
  function syncCopy() {
    const n = total();
    status.textContent = n === 0 ? 'Potential, looking for a little direction.' : n === 6 ? 'A clear story. A meaningful next step.' : 'Identity. Story. A reason to act.';
    hint.textContent = n === 6 ? 'That’s what I bring to your next project.' : matchMedia('(max-width: 700px), (pointer: coarse)').matches ? 'Tap the scattered pieces to bring them together.' : 'Move over the pieces. Give them a little direction.';
    action.innerHTML = n === 6 ? 'Scatter & replay <span aria-hidden="true">↺</span>' : 'Organize the ideas <span aria-hidden="true">↗</span>';
  }
  function collect(i) {
    if (pieces[i].collected) return;
    pieces[i].collected = true; pieces[i].delay = 0; latest = i; syncCopy(); start();
  }
  function locate(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = (event.clientX - rect.left) * 560 / rect.width;
    pointer.y = (event.clientY - rect.top) * 440 / rect.height;
    pointer.inside = true;
    let hit = false;
    pieces.forEach((p, i) => {
      const dx=pointer.x-p.x, dy=pointer.y-p.y;
      const rx=dx*Math.cos(p.a)+dy*Math.sin(p.a), ry=-dx*Math.sin(p.a)+dy*Math.cos(p.a);
      if (!p.collected && Math.abs(rx)<p.w/2+12 && Math.abs(ry)<p.h/2+12) { hit=true; collect(i); }
    });
    canvas.style.cursor=hit?'pointer':'default';
    start();
  }
  let touchStart = null;
  canvas.addEventListener('pointermove', event => {
    if (event.pointerType !== 'touch') locate(event);
    else if (touchStart && Math.hypot(event.clientX-touchStart.x,event.clientY-touchStart.y)>10) touchStart=null;
  });
  canvas.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') touchStart={id:event.pointerId,x:event.clientX,y:event.clientY};
    else locate(event);
  });
  canvas.addEventListener('pointerup', event => {
    if (event.pointerType === 'touch' && touchStart && touchStart.id===event.pointerId && Math.hypot(event.clientX-touchStart.x,event.clientY-touchStart.y)<=10) locate(event);
    touchStart=null;
  });
  canvas.addEventListener('pointercancel', () => { touchStart=null; });
  canvas.addEventListener('pointerleave', () => { pointer.inside = false; start(); });
  action.addEventListener('click', () => {
    if (total() === 6) { pieces.forEach(p => { p.collected = false; p.delay = 0; }); latest = -1; }
    else { pieces.forEach((p,i) => { p.delay = motion.matches || p.collected ? 0 : i*.12; p.collected = true; }); latest = 5; }
    syncCopy(); start();
  });
  function infinity(x,y,size,color=ink,width=3) {
    ctx.beginPath();
    ctx.moveTo(x,y);
    ctx.bezierCurveTo(x-size*.55,y-size*.8,x-size*1.25,y-size*.55,x-size,y);
    ctx.bezierCurveTo(x-size*.65,y+size*.65,x-size*.35,y+size*.4,x,y);
    ctx.bezierCurveTo(x+size*.55,y-size*.8,x+size*1.25,y-size*.55,x+size,y);
    ctx.bezierCurveTo(x+size*.65,y+size*.65,x+size*.35,y+size*.4,x,y);
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
  }
  function drawPiece(p, i) {
    ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.a);
    // Editorial fragments lose their loose backing as they find their place.
    const loose=1-p.settle;
    if(loose>.01) {
      ctx.save();ctx.globalAlpha=loose;
      roundRect(-p.w/2-7,-p.h/2-7,p.w+14,p.h+14,3,'#161618','#ffffff26');ctx.restore();
    }
    if(i===0) { infinity(-46,0,11,ink,2);text('sofinityx',-27,5,18,ink,'Manrope, sans-serif'); }
    if(i===1) { text('Work',-66,4,12,'#c6c6cd');text('About',-20,4,12,'#c6c6cd');roundRect(28,-13,46,26,13,null,'#b9b9c1');text('Hello',36,4,11); }
    if(i===2) { text('Ideas into',-87,-9,30,ink,'Manrope, sans-serif');text('experiences.',-87,27,31,ink,'Georgia'); }
    if(i===3) {
      roundRect(-68,-89,136,178,4,'#e7e7e7');
      // A bespoke typographic brand artwork, rather than a generic picture icon.
      ctx.save();ctx.translate(0,-7);ctx.rotate(-.48);
      for(let j=8;j>=0;j--) infinity(j*.8,j*2,46,j===0?'#161618':'#ababaf',j===0?8:1);
      ctx.restore();text('FORM / FEELING',-53,68,9,'#37373b');
    }
    if(i===4) { text('Distinctive by design.',-87,-4,13,'#b7b7c1');text('Built around your next move.',-87,15,12,'#b7b7c1'); }
    if(i===5) { roundRect(-78,-19,156,38,19,ink);text('Let’s build',-61,5,14,paper);line([[52,-5],[60,-5],[60,3]],paper,1.7);line([[50,5],[60,-5]],paper,1.7); }
    ctx.restore();
  }
  function drawCharacter(dt) {
    const targetX=lerp(278,486,progress),targetY=lerp(217,349,progress);
    characterX=motion.matches?targetX:lerp(characterX,targetX,1-Math.pow(.9,dt));
    characterY=motion.matches?targetY:lerp(characterY,targetY,1-Math.pow(.9,dt));
    const bob=motion.matches?0:Math.sin(time*2.1)*2;
    const gx=pointer.inside?Math.max(-3,Math.min(3,(pointer.x-characterX)/55)):Math.sin(time*.7)*1.4;
    const gy=pointer.inside?Math.max(-2,Math.min(2,(pointer.y-characterY)/70)):0;
    gazeX=lerp(gazeX,gx,.13);gazeY=lerp(gazeY,gy,.13);
    ctx.save();ctx.translate(characterX,characterY+bob);ctx.lineCap='round';ctx.lineJoin='round';
    // Offset feet, a tapered ink body, and a ribbon head create one branded silhouette.
    const stride=motion.matches?0:Math.sin(time*8)*Math.min(1,Math.abs(targetX-characterX)/12)*7;
    line([[-8,44],[-15,65+stride],[-26,67+stride]],ink,3);
    line([[8,44],[18,63-stride],[27,63-stride]],ink,3);
    ctx.beginPath();ctx.moveTo(-10,8);ctx.bezierCurveTo(-16,20,-21,37,-14,46);
    ctx.quadraticCurveTo(1,51,16,43);ctx.quadraticCurveTo(11,22,8,8);ctx.closePath();
    ctx.fillStyle=paper;ctx.fill();ctx.strokeStyle=ink;ctx.lineWidth=2;ctx.stroke();
    line([[-4,27],[4,35]],ink,1.5);line([[4,27],[-4,35]],ink,1.5);
    const active=latest>=0?pieces[latest]:null;
    const reaching=active&&active.collected&&Math.hypot(active.x-active.tx,active.y-active.ty)>8;
    let handX=-39,handY=progress>.9?-17:28;
    if(reaching) {const angle=Math.atan2(active.y-characterY,active.x-characterX);handX=Math.cos(angle)*53;handY=Math.sin(angle)*44;}
    ctx.beginPath();ctx.moveTo(-10,17);ctx.quadraticCurveTo(handX*.7-9,handY+20,handX,handY);ctx.lineWidth=2.5;ctx.strokeStyle=ink;ctx.stroke();
    line([[10,17],[30,31],[37,progress>.9?9:26]],ink,2.5);
    line([[handX-3,handY+3],[handX,handY],[handX-2,handY-5]],ink,1.7);
    // Infinity is the head itself: asymmetric ribbon loops with a curious pair of eyes.
    ctx.save();ctx.rotate(lerp(-.15,.08,progress)+(motion.matches?0:Math.sin(time*1.2)*.025));
    infinity(0,-9,30,ink,10);
    const blink=!motion.matches&&time%5.4>5.23;
    [-19,19].forEach(ex=>{if(blink)line([[ex-3,-10],[ex+3,-10]],ink,1.5);else circle(ex+gazeX,-10+gazeY,2.2,ink);});
    ctx.restore();
    if(progress<.25) {
      // A readable sign of uncertainty, resolved as the fragments find their place.
      ctx.save();ctx.globalAlpha=(1-progress*4)*.85;
      ctx.translate(0,-62+(motion.matches?0:Math.sin(time*1.6)*1.5));
      ctx.beginPath();ctx.moveTo(-7,-8);
      ctx.bezierCurveTo(-7,-18,8,-20,8,-10);
      ctx.bezierCurveTo(8,-4,0,-4,0,3);
      ctx.strokeStyle=ink;ctx.lineWidth=2.5;ctx.stroke();
      circle(0,10,1.7,ink);ctx.restore();
    }
    ctx.restore();
  }
  function draw(now = 0) {
    frame = 0;
    const dt = lastTime ? Math.min((now-lastTime)/16.667, 2) : 1; lastTime=now;
    if(!motion.matches) time += dt / 60;
    const target = total()/6;
    progress = motion.matches ? target : lerp(progress,target,1-Math.pow(.94,dt));
    ctx.clearRect(0,0,560,440); ctx.lineCap='round'; ctx.lineJoin='round';
    // Only alignment rules appear; the stage stays transparent and borderless.
    ctx.save();ctx.globalAlpha=progress;
    line([[68,108],[426,108]],'#ffffff30',1);
    line([[68,326],[426,326]],'#ffffff20',1);
    text('01 / A DISTINCTIVE DIGITAL EXPERIENCE',68,349,9,'#93939e');
    ctx.restore();
    pieces.forEach((p,i) => {
      p.delay = Math.max(0,p.delay-dt/60);
      const ready=p.collected && (p.delay===0 || motion.matches);
      p.settle=motion.matches?(ready?1:0):lerp(p.settle,ready?1:0,1-Math.pow(.91,dt));
      const tx = ready ? p.tx : p.sx + (motion.matches ? 0 : Math.sin(time*.75+i*1.7)*6);
      const ty = ready ? p.ty : p.sy + (motion.matches ? 0 : Math.cos(time*.9+i*1.3)*7);
      const angle=ready?0:p.sa+(motion.matches?0:Math.sin(time*.6+i)*.035);
      if(motion.matches) { p.x=tx; p.y=ty; p.a=angle; p.vx=0; p.vy=0; }
      else { p.vx=(p.vx+(tx-p.x)*.055*dt)*Math.pow(.72,dt); p.vy=(p.vy+(ty-p.y)*.055*dt)*Math.pow(.72,dt); p.x+=p.vx*dt; p.y+=p.vy*dt; p.a=lerp(p.a,angle,1-Math.pow(.89,dt)); }
      if(i===latest && p.collected && Math.hypot(tx-p.x,ty-p.y)>12) {
        ctx.save(); ctx.setLineDash([3,6]); line([[p.x,p.y],[tx,ty]],'#ffffff20',1); ctx.restore();
      }
      drawPiece(p,i);
    });
    drawCharacter(dt);
    if(!motion.matches && visible && !document.hidden) frame=requestAnimationFrame(draw);
  }
  function start() { if(!frame && visible && !document.hidden) frame=requestAnimationFrame(draw); }
  function resize() {
    // Supersample the fine typography and artwork, independently of CSS size.
    // Keep the 560 × 440 coordinate system so layout and pointer hits stay exact.
    const displayWidth=canvas.getBoundingClientRect().width || 560;
    const density=Math.max(3,(window.devicePixelRatio || 1)*1.5);
    const scale=Math.min(4,Math.max(2,displayWidth*density/560));
    const width=Math.round(560*scale), height=Math.round(440*scale);
    if(canvas.width!==width || canvas.height!==height) {
      canvas.width=width; canvas.height=height;
      ctx.setTransform(width/560,0,0,height/440,0,0);
    }
    start();
  }
  new IntersectionObserver(entries => { visible=entries[0].isIntersecting; if(visible)start(); else {cancelAnimationFrame(frame);frame=0;lastTime=0;} }).observe(scene);
  document.addEventListener('visibilitychange',()=>{ if(document.hidden){cancelAnimationFrame(frame);frame=0;lastTime=0;}else start(); });
  motion.addEventListener('change',()=>{lastTime=0;start();});
  window.addEventListener('resize',resize);
  new ResizeObserver(resize).observe(canvas);
  // Refresh after the site's typeface loads, including in reduced-motion mode.
  if(document.fonts) document.fonts.ready.then(start);
  resize(); syncCopy();

  const strip=document.querySelector('.experience-strip');
  if(strip) {
    const group=strip.querySelector('.experience-group');
    const clone=group.cloneNode(true); clone.setAttribute('aria-hidden','true'); group.after(clone);

  }
})();

// A cursor-following sheen, scoped to the homepage's primary invitation.
(() => {
  const button=document.querySelector('.prism-cta');
  if(!button)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  button.addEventListener('pointermove',event=>{
    if(reduced.matches||event.pointerType==='touch')return;
    const rect=button.getBoundingClientRect();
    button.style.setProperty('--prism-x',((event.clientX-rect.left)/rect.width*100).toFixed(1)+'%');
    button.style.setProperty('--prism-y',((event.clientY-rect.top)/rect.height*100).toFixed(1)+'%');
  });
  button.addEventListener('pointerleave',()=>{button.style.removeProperty('--prism-x');button.style.removeProperty('--prism-y');});
})();
