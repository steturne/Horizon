/* Mixtape 2 device: HALO, the pad and drone synth: a slab of black glass with a big round window where the sound swirls as ribbons of
   light. Steve's photo (Skins\halo.jpg, cut out of its white backdrop as halo.png with tools\cutout.ps1), made from the design sketch
   (Skins\halo.svg → halo-sketch.png): it keeps the sketch's layout a little smaller, so places are written in the sketch's pixels
   (1400 × 820) and MX turns them into the photo's (1376 × 768). The knob caps are cut from the photo and turn; the lights, the
   display and the light in the window are drawn live. Over the picture:
   - CHARACTER: WARM GLASS CHOIR STRINGS AIR ORGAN BOWL SHRUTI. A click lights or unlights one; up to three sound at once, layered (a
     fourth puts out the one lit longest ago; the last one lit stays); scroll over a lit key for its layer's level (its light dims).
     Changing them while notes hold fades the old sound into the new over the swell time, so a drone can drift from one into another.
   - MOTION (STILL BREATHE SHIMMER DRIFT PULSE WANDER), VOICING (SINGLE OCTAVE FIFTH WIDE SUS); the knobs TONE WIDTH SWELL (30 ms to a
     minute in, up to 30 s out) MOTION (depth) SPACE TEXTURE, the MIX knobs BODY SUB AIR SPARKLE, SPEED (one motion cycle: 3 s to 5 min)
     and VOLUME. Knobs: drag up / down or scroll; double-click for where it starts.
   - the display: the preset, or a knob's value while it turns; ‹ › presets (the built-in ones, then those kept with SAVE)
   - SURPRISE ME (a random sound in safe ranges; with the drone on, the drone too), BACK (the sound before the last surprise), SAVE
   - the drone: KEY ‹ › (C at first, Steve's harp), ROOT FIFTH OCT SUB (each lit sounds on its own, until put out); with a chord
     analyzer on CHORDS IN the drone follows the song's chord root. HOLD: keys latch (press again to let one go). FREEZE: the hall
     holds what it has forever while you play on top.
   - KEYS: the computer keyboard plays it, as the KEYS device's does (A S D F… white keys from middle C, W E T… black, Z / X octave,
     C / V softer / louder); off at first. With a KEYS device plugged into KEYS IN, that one types instead.
   The sound (rendered here, not today's pad-synth.js, which cost up to 180 oscillators): each character is a few seconds of a huge,
   smeared, slightly out-of-tune ensemble that loops without a seam, made once by the PADsynth method (each harmonic spread into a
   band, random phases, one inverse FFT; one table an octave, left and right made apart for width) and shared by every HALO; a note is
   one looping playback of it a layer. Breathe, drift, shimmer, pulse, wander, saturation, width and the hall (an 8-line feedback delay
   network, which can freeze) are shared by all notes. Silent for a few seconds (and not frozen), it unhooks from the output, so
   nothing runs; off screen, nothing is drawn.
   Played from KEYS IN ({t:'on'|'off', n, v}, {t:'bend'}, {t:'mod'} = TONE, {t:'pedal'}); with nothing there, any MIDI keyboard (M2.midi). */
(()=>{const M2=window.M2;
const IMG='mixtape2/Skins/halo.png',IW=1376,IH=768,W=600,K=W/IW,H=Math.round(IH*K);
/* the photo keeps the sketch's layout, a little smaller: places below are the sketch's (1400 × 820), MX turns them into the photo's */
const MX=[.948,.9486,21,-3.7],ph=(x,y)=>[x*MX[0]+MX[2],y*MX[1]+MX[3]],RINGP=[685.5,349,284];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),mtof=n=>(globalThis.MIXTAPE_A4||440)*Math.pow(2,(n-69)/12);
const hold=(p,t)=>{if(p.cancelAndHoldAtTime)p.cancelAndHoldAtTime(t);else p.cancelScheduledValues(t);};
const eqPow=m=>[Math.cos(m*Math.PI/2),Math.sin(m*Math.PI/2)];
const NM=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

/* ---- the characters: harmonics (or partials), how wide each is spread (cents, growing with the harmonic by bs), a vowel ---- */
const AH=[[730,1],[1090,.7],[2440,.45]],NASAL=[[1150,1],[2600,.6]];
const form=(F,f)=>{let g=.12;for(const [c,a] of F){const x=Math.log2(f/c)/.28;g+=a*Math.exp(-x*x);}return g;};
const CHARS={
  warm:{label:'WARM',col:['#FF9A3C','#FF5E3A','#FFD27A'],amp:h=>1/h,bw:22,bs:1},
  glass:{label:'GLASS',col:['#7FD6FF','#C8F4FF','#5E8BFF'],parts:[[1,1],[2,.35],[3,.12],[5.04,.06],[7.1,.025]],bw:7,bs:.6},
  choir:{label:'CHOIR',col:['#FF8FB8','#D58CFF','#FFD1E6'],amp:h=>1/Math.pow(h,.8),bw:55,bs:1,form:AH},
  strings:{label:'STRINGS',col:['#9B7BFF','#5F7CFF','#E3BCFF'],amp:h=>(h<4?1:.85)/h,bw:45,bs:1.1},
  air:{label:'AIR',col:['#6FF0D2','#C9FFF2','#58B8FF'],amp:h=>1/Math.pow(h,.6),bw:380,bs:1.2,cap:99},   /* breath on purpose: its bands may run together */
  organ:{label:'ORGAN',col:['#FFC85A','#FF8A3D','#FFE9B0'],parts:[[1,1],[2,.8],[3,.5],[4,.45],[6,.25],[8,.22],[10,.08]],bw:3,bs:.5},
  bowl:{label:'BOWL',col:['#F4D27A','#9EE6C8','#FFF2C9'],parts:[[1,1],[2.71,.55],[5.15,.32],[8.43,.16],[12.4,.06]],bw:4,bs:.7},
  shruti:{label:'SHRUTI',col:['#FF7A59','#FFB36B','#FFD9A8'],amp:h=>(h%2?1:.7)/Math.pow(h,.55),bw:12,bs:1,form:NASAL}};
const CH=Object.keys(CHARS),MOTIONS=['still','breathe','shimmer','drift','pulse','wander'],VO=['one','oct','fifth','wide','sus'];
const VOICE_ADD={one:[],oct:[[12,.55]],fifth:[[7,.6]],wide:[[-12,.5],[7,.45],[12,.4]],sus:[[5,.5],[7,.5]]};
const VO_NAME={one:'SINGLE',oct:'OCTAVE',fifth:'FIFTH',wide:'WIDE',sus:'SUS'};

/* ---- the tables: PADsynth (Nasca O. Paul): every harmonic a Gaussian band in a 2^17-point spectrum, random phases, one inverse FFT:
   a 2.7 s loop with no seam, the ensemble's shimmer inside it. One for every note at its own pitch, so a note plays it at speed 1:
   the browser then copies the samples straight out (measured 14 times cheaper than playing a loop faster or slower, which blends
   between samples). Mono; a note plays it left and right half a loop apart, which sounds as wide as two tables. Made one at a time
   between frames (about 25 ms each), the note asked for first; the last 96 used are kept (half a MB each) for every HALO. */
const TN=1<<17,BASES=[36,48,60,72,84],cache=new Map(),queue=[];let pumping=0;
function rng(s){return ()=>{s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
function ifft(re,im){const n=re.length;
  for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){let t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t;}}
  for(let len=2;len<=n;len<<=1){const a=2*Math.PI/len,wr=Math.cos(a),wi=Math.sin(a),hl=len>>1;
    for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let k=0;k<hl;k++){const p=i+k,q=p+hl,tr=re[q]*cr-im[q]*ci,ti=re[q]*ci+im[q]*cr;re[q]=re[p]-tr;im[q]=im[p]-ti;re[p]+=tr;im[p]+=ti;const nr=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=nr;}}}}
function table(C,note,sr,seed){const df=sr/TN,f0=mtof(note),lim=.46*sr,amp=new Float64Array(TN/2);
  const parts=C.parts||Array.from({length:Math.max(1,Math.floor(lim/f0))},(_,i)=>[i+1,C.amp(i+1)]);
  for(const [h,a] of parts){const f=f0*h;if(f>=lim)continue;/* a band is at most a quarter of the gap to the next harmonic: wider, the high ones run together into hiss */
    const g=a*(C.form?form(C.form,f):1),bw=Math.max(Math.min((Math.pow(2,C.bw/1200)-1)*f0*Math.pow(h,C.bs),(C.cap||.25)*f0)/df,.6),c=f/df;
    for(let i=Math.max(1,Math.floor(c-3*bw)),e=Math.min(TN/2-1,Math.ceil(c+3*bw));i<=e;i++){const x=(i-c)/bw;amp[i]+=g*Math.exp(-x*x)/bw;}}
  const re=new Float64Array(TN),im=new Float64Array(TN),r=rng(seed);
  for(let i=1;i<TN/2;i++){if(!amp[i])continue;const p=r()*2*Math.PI;re[i]=amp[i]*Math.cos(p);im[i]=amp[i]*Math.sin(p);}
  ifft(re,im);let s=0;for(let i=0;i<TN;i++)s+=re[i]*re[i];const k=.2/Math.sqrt(s/TN||1),o=new Float32Array(TN);for(let i=0;i<TN;i++)o[i]=re[i]*k;return o;}
function pump(){if(pumping||!queue.length)return;pumping=setTimeout(()=>{pumping=0;const e=queue.shift();if(e&&!e.v)e.make();pump();},0);}
function tab(ctx,ch,n){n=clamp(Math.round(n),12,120);const a4=globalThis.MIXTAPE_A4||440,key=ch+'|'+n+'|'+a4+'|'+ctx.sampleRate;let e=cache.get(key);
  if(e){cache.delete(key);cache.set(key,e);return e;}
  e={v:null,ch,n};e.p=new Promise(ok=>{e.make=()=>{const b=ctx.createBuffer(1,TN,ctx.sampleRate);b.copyToChannel(table(CHARS[ch],n,ctx.sampleRate,n*7+1),0);e.v=b;ok(b);};});
  cache.set(key,e);queue.push(e);pump();
  while(cache.size>96){const k=cache.keys().next().value,o=cache.get(k);if(o===e)break;cache.delete(k);const i=queue.indexOf(o);if(i>=0)queue.splice(i,1);}
  return e;}
const urgent=e=>{const i=queue.indexOf(e);if(i>0){queue.splice(i,1);queue.unshift(e);}};
/* a character's octave tables (C2 … C6), which stand in while a note's own is made */
const tables=(ctx,ch)=>{const es=BASES.map(b=>tab(ctx,ch,b));return {p:Promise.all(es.map(e=>e.p)),get v(){return es.every(e=>e.v)?es.map(e=>e.v):null;}};};

const attackOf=v=>.03*Math.pow(200,v)+55*Math.pow(v,8);   /* 30 ms … 1 s at the middle … a minute */
const releaseOf=v=>.4+6.5*v+23*Math.pow(v,6);             /* 0.4 s … 30 s */
const cutOf=P=>clamp(250*Math.pow(2,P.tone*6.2),80,18000);
const periodOf=v=>3*Math.pow(100,1-v);                     /* SPEED: one motion cycle, 3 s … 5 min */

/* ---- the engine: notes → breathing filter → pulse gate → saturation → width → hall (FDN) → drift pan → volume ---- */
function Engine(ctx,out){const c=ctx,E={ctx,voices:[],bend:0,frozen:false,awake:false};
  const G=v=>{const g=c.createGain();g.gain.value=v;return g;},osc=(f,type)=>{const o=c.createOscillator();o.type=type||'sine';o.frequency.value=f;o.start();return o;};
  E.bus=G(.22);E.bf=c.createBiquadFilter();E.bf.type='lowpass';E.bf.Q.value=.5;E.bf.frequency.value=16000;
  E.gate=G(1);E.pre=G(.25);E.drive=c.createWaveShaper();E.drive.oversample='2x';E.post=G(4);
  /* drift: one slowly swinging delay bends the pitch of everything at once (a wobble on each note would cost each its cheap playback) */
  E.vib=c.createDelay(.1);E.vib.delayTime.value=.035;
  E.bus.connect(E.vib).connect(E.bf).connect(E.gate).connect(E.pre).connect(E.drive).connect(E.post);
  /* width: left and right mixed toward the middle (the tables are wide on their own) */
  const sp=c.createChannelSplitter(2),mg=c.createChannelMerger(2);E.wa=[G(1),G(0),G(0),G(1)];E.post.connect(sp);
  sp.connect(E.wa[0],0);sp.connect(E.wa[1],1);sp.connect(E.wa[2],0);sp.connect(E.wa[3],1);E.wa[0].connect(mg,0,0);E.wa[1].connect(mg,0,0);E.wa[2].connect(mg,0,1);E.wa[3].connect(mg,0,1);
  E.dry=G(1);E.wet=G(0);E.pan=c.createStereoPanner();E.vol=G(.7);E.an=c.createAnalyser();E.an.fftSize=1024;
  mg.connect(E.dry).connect(E.pan);E.pan.connect(E.vol);
  /* the hall: 8 delay lines fed back through a Householder mix (each line's own sound less a share of all of them), damped; left
     into the even lines, right into the odd; FREEZE stops new sound coming in and the losses, so it holds */
  const DT=[.0503,.0631,.0697,.0743,.0901,.1019,.1151,.1247];E.inj=G(1);const rsp=c.createChannelSplitter(2),rmg=c.createChannelMerger(2),oL=G(.3),oR=G(.3),sum=G(-2/DT.length);
  mg.connect(E.inj).connect(rsp);
  E.lines=DT.map((d,i)=>{const dl=c.createDelay(.2);dl.delayTime.value=d;const dm=c.createBiquadFilter();dm.type='lowpass';dm.frequency.value=6000;dm.Q.value=-6;const mx=G(.8);   /* Q in dB: -6 = no bump at the cutoff, so the loop never gains */
    rsp.connect(dl,i%2);dl.connect(dm);dm.connect(mx);dm.connect(sum);sum.connect(mx);mx.connect(dl);dm.connect(i%2?oR:oL);return {dl,dm,mx,d};});
  oL.connect(rmg,0,0);oR.connect(rmg,0,1);rmg.connect(E.wet).connect(E.pan);
  const wob=G(.0007);osc(.23).connect(wob);wob.connect(E.lines[0].dl.delayTime);wob.connect(E.lines[5].dl.delayTime);   /* a slow wobble, so the hall does not ring metallic */
  /* the motions, shared by every note */
  E.lfo={br:osc(.1),da:osc(.07),pn:osc(.04),sh:osc(6.5)};
  E.breathe=G(0);E.lfo.br.connect(E.breathe).connect(E.bf.detune);
  E.driftA=G(0);E.lfo.da.connect(E.driftA).connect(E.vib.delayTime);
  E.panL=G(0);E.lfo.pn.connect(E.panL).connect(E.pan.pan);E.shim=G(0);E.lfo.sh.connect(E.shim);
  E.gateL=G(0);E.gateL.connect(E.gate.gain);E.pulse=null;E.hiss=G(0);E.hlp=c.createBiquadFilter();E.hlp.type='lowpass';E.hiss.connect(E.hlp).connect(E.bus);   /* TEXTURE's breath: through the notes' own level and TONE, as it was inside each note in pad-synth.js */E.noise=null;
  const curves=new Map();
  E.tap=G(1);   /* what the picture listens to: HALO's own sound, only while awake */
  E.wake=()=>{if(E.awake)return;E.awake=true;E.vol.connect(out);E.vol.connect(E.an);E.vol.connect(E.tap);};
  E.sleep=()=>{if(!E.awake||E.frozen)return;E.awake=false;try{E.vol.disconnect();}catch(e){}};
  E.level=()=>{if(!E.awake)return 0;const b=E._b||(E._b=new Float32Array(E.an.fftSize));E.an.getFloatTimeDomainData(b);let s=0;for(let i=0;i<b.length;i++)s+=b[i]*b[i];return Math.sqrt(s/b.length);};
  E.room=()=>{const P=E.P,t=c.currentTime,T=1.5+P.space*10,f=E.frozen;E.inj.gain.setTargetAtTime(f?0:1,t,.12);
    E.lines.forEach(L=>{L.mx.gain.setTargetAtTime(f?.99995:Math.pow(10,-3*L.d/T),t,.1);L.dm.frequency.setTargetAtTime(f?19000:6500-P.space*2500,t,.1);});
    const [rd,rw]=eqPow(P.space*.72);E.dry.gain.setTargetAtTime(rd,t,.05);E.wet.gain.setTargetAtTime(Math.max(rw*1.1,f?.75:0),t,.05);};
  E.sync=(clock)=>{if(E.pulse){try{E.pulse.stop();E.pulse.disconnect();}catch(e){}E.pulse=null;}if(E.P.motion!=='pulse')return;
    const n=8,re=new Float32Array(n),im=new Float32Array(n);[1,3,5].forEach((h,i)=>{im[h]=1/h*[1,.8,.5][i];});
    const o=c.createOscillator();o.setPeriodicWave(c.createPeriodicWave(re,im));o.frequency.value=clock.bpm/60*2;
    let ts=c.currentTime+.01;if(clock.running)ts=Math.max(ts,clock.timeOf(Math.ceil(clock.beat(ts)*2)/2));   /* starts on an eighth note */
    o.connect(E.gateL);o.start(ts);E.pulse=o;};
  E.apply=(clock)=>{const P=E.P,t=c.currentTime,k=.05,m=P.motion,a=P.amt,d=Math.round((1+P.tex*4)*20)/20,f=1/periodOf(P.speed);
    if(!curves.has(d)){const n=4097,cv=new Float32Array(n);for(let i=0;i<n;i++){const x=i*2/(n-1)-1;cv[i]=Math.tanh(d*4*x)/Math.tanh(d)*.25;}curves.set(d,cv);}   /* stacked chords bend, never clip */
    if(E.drive.curve!==curves.get(d))E.drive.curve=curves.get(d);E.post.gain.setTargetAtTime(4/(1+P.tex*.6),t,k);
    const w=.25+.75*P.width,A=(1+w)/2,B=(1-w)/2;E.wa.forEach((g,i)=>g.gain.setTargetAtTime(i===0||i===3?A:B,t,k));
    E.room();E.bf.frequency.setTargetAtTime(Math.min(18000,cutOf(P)*2.5),t,k);E.hlp.frequency.setTargetAtTime(cutOf(P),t,k);
    E.lfo.br.frequency.setTargetAtTime(f,t,k);E.lfo.da.frequency.setTargetAtTime(Math.max(.05,f*.65),t,k);E.lfo.pn.frequency.setTargetAtTime(f*.43,t,k);
    E.breathe.gain.setTargetAtTime(m==='breathe'?a*1800:0,t,k);
    /* up to 16 cents of swing: a delay swinging by d seconds at f Hz bends the pitch by about d·2πf */
    E.driftA.gain.setTargetAtTime(m==='drift'?Math.min(.03,(Math.pow(2,a*16/1200)-1)/(2*Math.PI*Math.max(.05,f*.65))):0,t,k);
    E.panL.gain.setTargetAtTime(m==='drift'?a*.55:0,t,k);E.shim.gain.setTargetAtTime(m==='shimmer'?a*.05:0,t,k);
    E.gate.gain.setTargetAtTime(m==='pulse'?1-a*.5:1,t,k);E.gateL.gain.setTargetAtTime(m==='pulse'?a*.5:0,t,k);
    if(m!=='wander'){hold(E.bf.detune,t);E.bf.detune.setTargetAtTime(0,t,.5);if(m!=='drift'){hold(E.pan.pan,t);E.pan.pan.setTargetAtTime(0,t,.5);}}
    E.vol.gain.setTargetAtTime(P.vol*2,t,k);   /* +6 dB: as loud as today's pad at the same VOLUME */if((m==='pulse')!==!!E.pulse)E.sync(clock);
    if(P.tex>.02&&!E.noise){const nb=c.createBuffer(1,c.sampleRate,c.sampleRate),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
      E.noise=c.createBufferSource();E.noise.buffer=nb;E.noise.loop=true;const hp=c.createBiquadFilter();hp.type='highpass';hp.frequency.value=3500;E.noise.connect(hp).connect(E.hiss);E.noise.start();}
    E.autoGain(t);E.voices.forEach(v=>v.update());};
  /* wander: every so often a new, slow, random brightness and place, a third of a SPEED cycle apart */
  E.wander=()=>{const P=E.P,t=c.currentTime,per=periodOf(P.speed);if(P.motion!=='wander')return;
    E.bf.detune.setTargetAtTime((Math.random()*2-1)*P.amt*1600-P.amt*400,t,per/6);E.pan.pan.setTargetAtTime((Math.random()*2-1)*P.amt*.5,t,per/5);};
  E.autoGain=(t=c.currentTime)=>{const live=E.voices.filter(v=>!v.released),n=live.length;E.bus.gain.setTargetAtTime(.22/Math.sqrt(Math.max(1,n/3)),t,.25);
    E.hiss.gain.setTargetAtTime(n?E.P.tex*.05*Math.min(1,n*.5):0,t,n?.3:releaseOf(E.P.swell)/4);};
  E.noteOn=(n,vel,drone)=>{E.wake();const t=c.currentTime;if(vel<=1)vel=Math.round(vel*127);
    E.voices.forEach(v=>{if(v.n===n&&!v.released&&!!v.drone===!!drone)v.release(t);});
    /* the audio thread stays easy: at most 10 held notes and 16 sounding (the drone's own notes not counted) */
    const alive=E.voices.filter(v=>!v.drone&&!v.gone&&!v.killed),held=alive.filter(v=>!v.released);
    if(!drone){if(held.length>=10)held[0].kill(t);else if(alive.length>=16)(alive.find(v=>v.released)||alive[0]).kill(t);}
    const v=new Voice(E,n,vel,t,drone);E.voices.push(v);E.autoGain(t);return v;};
  E.dispose=()=>{const t=c.currentTime;E.voices.slice().forEach(v=>v.kill(t));setTimeout(()=>{try{E.vol.disconnect();}catch(e){}
    for(const o of Object.values(E.lfo))try{o.stop();}catch(e){}try{if(E.pulse)E.pulse.stop();if(E.noise)E.noise.stop();}catch(e){}},300);};
  return E;}

/* ---- a note: each character layer (and each voicing note) its own table at speed 1, a soft sub, air and sparkle if mixed in ---- */
class Voice{
  constructor(E,n,vel,t,drone){const c=E.ctx,P=E.P;this.E=E;this.n=n;this.drone=drone;this.released=false;this.gone=false;this.lay=new Map();this.srcs=[];this.mods=[];
    this.vca=c.createGain();this.vca.gain.value=0;this.f=c.createBiquadFilter();this.f.type='lowpass';this.f.Q.value=.6;this.f.connect(this.vca).connect(E.bus);
    this.notes=[[n,1],...(drone?[]:VOICE_ADD[P.voicing].map(([o,l])=>[n+o,l]))].filter(([m])=>m>=12&&m<=120);
    for(const ch of P.ch)this.addLayer(ch,0);
    if(P.sub>.01){const o=c.createOscillator();o.frequency.value=mtof(n)/2;if(E.bend)o.detune.value=E.bend*200;this.subG=c.createGain();this.subG.gain.value=P.sub*.5;o.connect(this.subG).connect(this.f);o.start(t);this.track(o);}
    if(P.air>.01)this.extra('air',n,'airG',P.air*.9,this.f);
    if(P.spark>.01||P.motion==='shimmer')this.extra(P.ch[0],n+24,'spG',P.spark*.08+(P.motion==='shimmer'?P.amt*.07:0),this.vca,true);
    /* swell: loudness and brightness bloom together */
    const att=attackOf(P.swell),cut=cutOf(P),peak=(.25+.75*Math.pow(clamp(vel,1,127)/127,1.2))/Math.sqrt(Math.max(1,this.notes.length*.7));
    this.vca.gain.setValueAtTime(0,t);this.vca.gain.setTargetAtTime(peak,t,att/3);
    this.f.frequency.setValueAtTime(cut*.3,t);this.f.frequency.linearRampToValueAtTime(cut,t+att*.8);}
  track(s){this.srcs.push(s);s.onended=()=>{const i=this.srcs.indexOf(s);if(i>=0)this.srcs.splice(i,1);if(!this.srcs.length&&this.released)this.dispose();};}
  /* one note of one character, left and right half a loop apart, at speed 1; until the note's own table is made, the nearest
     octave's at a speed near 1 (the costly way, for a moment), crossfaded over to its own as soon as it is ready */
  play(ch,m,dest,L){const E=this.E,c=E.ctx,e=tab(c,ch,m);
    const go=(buf,rate,f)=>{const t=c.currentTime,g=c.createGain(),mg=c.createChannelMerger(2),part={g,srcs:[]};mg.connect(g);g.connect(dest);
      if(f){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(1,t+f);}const o=Math.floor(Math.random()*buf.length);
      for(const side of [0,1]){const s=c.createBufferSource();s.buffer=buf;s.loop=true;s.playbackRate.value=rate;if(E.bend)s.detune.value=E.bend*200;s.connect(mg,0,side);
        s.start(t,((o+side*(buf.length>>1))%buf.length)/c.sampleRate);this.track(s);part.srcs.push(s);}
      L.parts.push(part);return part;};
    if(e.v)return go(e.v,1,0);
    urgent(e);const b=BASES.reduce((a,x)=>Math.abs(x-m)<Math.abs(a-m)?x:a),fb=tab(c,ch,b),tmp=fb.v?go(fb.v,mtof(m)/mtof(b),.02):null;
    e.p.then(buf=>{if(this.released||L.dead)return;go(buf,1,tmp?.25:.05);
      if(tmp){const t=c.currentTime;hold(tmp.g.gain,t);tmp.g.gain.linearRampToValueAtTime(0,t+.25);tmp.srcs.forEach(s=>{try{s.stop(t+.3);}catch(x){}});}});}
  level(ch){const P=this.E.P;return (P.lv[ch]!=null?P.lv[ch]:1)*P.body/Math.sqrt(P.ch.length);}
  /* a layer comes in faded over `fade` seconds (0: at once) */
  addLayer(ch,fade){if(this.lay.has(ch)||this.released)return;const c=this.E.ctx,t=c.currentTime,g=c.createGain(),L={g,parts:[],dead:false};g.connect(this.f);
    if(fade){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(this.level(ch),t+fade);}else g.gain.value=this.level(ch);
    for(const [m,l] of this.notes){let d=g;if(l!==1){d=c.createGain();d.gain.value=l;d.connect(g);}this.play(ch,m,d,L);}
    this.lay.set(ch,L);}
  dropLayer(ch,fade){const L=this.lay.get(ch);this.lay.delete(ch);if(!L)return;L.dead=true;const t=this.E.ctx.currentTime;hold(L.g.gain,t);L.g.gain.linearRampToValueAtTime(0,t+fade);
    L.parts.forEach(p=>p.srcs.forEach(s=>{try{s.stop(t+fade+.05);}catch(e){}}));}
  extra(ch,n,key,lv,dest,shim){const E=this.E,g=E.ctx.createGain();g.gain.value=lv;g.connect(dest);this[key]=g;this.play(ch,n,g,{parts:[],dead:false});
    if(shim){E.shim.connect(g.gain);this.mods.push([E.shim,g.gain]);}}
  update(){if(this.released)return;const E=this.E,P=E.P,t=E.ctx.currentTime;
    hold(this.f.frequency,t);this.f.frequency.linearRampToValueAtTime(cutOf(P),t+.08);
    for(const [ch,L] of this.lay)L.g.gain.setTargetAtTime(this.level(ch),t,.05);
    if(this.subG)this.subG.gain.setTargetAtTime(P.sub*.5,t,.05);if(this.airG)this.airG.gain.setTargetAtTime(P.air*.9,t,.05);
    if(this.spG)this.spG.gain.setTargetAtTime(P.spark*.08+(P.motion==='shimmer'?P.amt*.07:0),t,.05);}
  /* the characters changed while it holds: the old ones fade out as the new fade in, over the swell time */
  morph(){if(this.released)return;const P=this.E.P,f=Math.max(.3,Math.min(8,attackOf(P.swell)));
    for(const ch of [...this.lay.keys()])if(!P.ch.includes(ch))this.dropLayer(ch,f);for(const ch of P.ch)this.addLayer(ch,f);}
  /* the pitch wheel: set straight (not glided), so back at the middle each playback is exactly at speed 1 again, the cheap way */
  bendTo(b){const t=this.E.ctx.currentTime;for(const s of this.srcs){hold(s.detune,t);s.detune.setValueAtTime(b*200,t);}}
  release(t){if(this.released)return;this.released=true;const R=releaseOf(this.E.P.swell);hold(this.vca.gain,t);this.vca.gain.setTargetAtTime(0,t,R/4.5);
    this.E.autoGain(t);const end=t+R*1.5+.1;this.srcs.forEach(s=>{try{s.stop(end);}catch(e){}});if(!this.srcs.length)this.dispose();}
  kill(t){this.released=true;this.killed=true;hold(this.vca.gain,t);this.vca.gain.setTargetAtTime(0,t,.03);this.srcs.forEach(s=>{try{s.stop(t+.15);}catch(e){}});
    setTimeout(()=>this.dispose(),Math.max(0,(t-this.E.ctx.currentTime)*1000)+300);}
  dispose(){if(this.gone)return;this.gone=true;this.mods.forEach(([s,d])=>{try{s.disconnect(d);}catch(e){}});try{this.vca.disconnect();}catch(e){}
    const v=this.E.voices,i=v.indexOf(this);if(i>=0)v.splice(i,1);}}

/* ---- sounds ---- */
const DEFAULTS={ch:['warm'],lv:{},voicing:'one',motion:'breathe',tone:.45,width:.65,swell:.55,amt:.35,space:.55,tex:.25,speed:.75,body:1,sub:.3,air:0,spark:0,vol:.7};
const PRESETS={
  'Warm blanket':{sub:.5},
  'Glass cathedral':{ch:['glass'],voicing:'oct',motion:'shimmer',tone:.7,width:.7,swell:.6,amt:.5,space:.85,tex:.05,sub:0,spark:.3},
  'Night choir':{ch:['choir'],voicing:'fifth',motion:'drift',tone:.5,width:.6,swell:.7,amt:.4,space:.75,tex:.1,sub:.15},
  'Cinematic strings':{ch:['strings'],voicing:'wide',motion:'breathe',tone:.55,width:.85,swell:.65,amt:.3,space:.7,tex:.15,sub:.2},
  'Ocean air':{ch:['air'],voicing:'oct',motion:'drift',tone:.6,width:.9,swell:.8,amt:.6,space:.8,tex:.2,sub:.1},
  'Pulse ribbon':{ch:['warm'],voicing:'fifth',motion:'pulse',tone:.6,width:.6,swell:.3,amt:.7,space:.55,tex:.2},
  'Dream sus':{ch:['glass'],voicing:'sus',motion:'drift',tone:.62,width:.75,swell:.7,amt:.45,space:.8,tex:.1,sub:0},
  'Lo-fi tape pad':{ch:['warm'],voicing:'oct',motion:'drift',tone:.35,width:.5,swell:.5,amt:.55,space:.45,tex:.7},
  'Glass choir':{ch:['glass','choir'],lv:{glass:.8},voicing:'oct',motion:'breathe',tone:.6,width:.8,swell:.7,amt:.35,space:.8,tex:.08,sub:.1},
  'Harp drone':{ch:['shruti'],motion:'wander',tone:.5,width:.7,swell:.8,amt:.45,space:.7,tex:.15,speed:.5,sub:.3,drone:{root:1,fifth:1},key:0},
  'Singing bowl':{ch:['bowl','air'],lv:{air:.35},motion:'breathe',tone:.6,width:.75,swell:.75,amt:.3,space:.85,tex:.05,speed:.45,sub:0,drone:{root:1,oct:1}},
  'Deep space':{ch:['air','glass'],lv:{glass:.5},motion:'drift',tone:.4,width:1,swell:.9,amt:.6,space:.95,tex:.2,speed:.35,sub:.45,drone:{root:1,sub:1}},
  'Cathedral organ':{ch:['organ'],voicing:'oct',motion:'still',tone:.55,width:.6,swell:.35,amt:.2,space:.9,tex:.05,sub:.3},
  'Monastery':{ch:['choir','strings'],lv:{strings:.5},motion:'drift',tone:.45,width:.7,swell:.85,amt:.35,space:.85,tex:.1,speed:.4,sub:.35,drone:{root:1,fifth:1,sub:1}}};
const copyP=P=>({...P,ch:[...P.ch],lv:{...P.lv}});
M2.halo={Engine,tables,tab,haloPic,DEFAULTS,PRESETS,CHARS,MOTIONS,VO,VO_NAME};   /* for tools\probes\m2-halo.js, which times the engine against today's pad-synth.js offline; and for HORIZON, whose PAD is this engine */

/* ---- the face: places in the picture's own pixels ---- */
const RING=[700,372,296];
const KN={tone:[288,200,44],width:[288,385,44],swell:[288,570,44],amt:[1112,200,44],space:[1112,385,44],tex:[1112,570,44],
  body:[1248,392,22],sub:[1320,392,22],air:[1248,470,22],spark:[1320,470,22],speed:[1248,566,22],vol:[1320,566,26]};
const KNAME={tone:'TONE',width:'WIDTH',swell:'SWELL',amt:'MOTION',space:'SPACE',tex:'TEXTURE',body:'BODY',sub:'SUB',air:'AIR',spark:'SPARKLE',speed:'SPEED',vol:'VOLUME'};
const pct=v=>Math.round(v*100)+'%',secs=s=>s<1?Math.round(s*1000)+' MS':s<60?s.toFixed(s<10?1:0)+' S':Math.floor(s/60)+' MIN '+Math.round(s%60)+' S';
const KFMT={swell:v=>secs(attackOf(v))+' IN · '+secs(releaseOf(v))+' OUT',speed:v=>'A CYCLE EVERY '+secs(periodOf(v)),tone:v=>Math.round(cutOf({tone:v}))+' HZ',
  space:v=>v<.01?'DRY':'HALL '+(1.5+v*10).toFixed(1)+' S'};
const ROW=(x,i,w)=>[x,150+i*34,w,28],CHK=i=>ROW(50,i,134),MOK=i=>[50,460+i*34,134,28],VOK=i=>ROW(1214,i,140);
const BTN={prev:[1302,34,26,58],next:[1336,34,26,58],surprise:[50,732,150,40],back:[214,732,70,40],save:[298,732,80,40],kprev:[420,738,34,34],knext:[518,738,34,34],
  freeze:[1046,732,120,40],keys:[1196,732,150,40]};
const HOLDB=[985,754,38],DRK=i=>[590+i*88,736,80,38],DRONES=['root','fifth','oct','sub'],DRONE_ST={root:0,fifth:7,oct:12,sub:-12};
const OLED=[1044,40,242,46],KLCD=[462,740,48,30],CK_BASE=60;
const CK={KeyA:0,KeyW:1,KeyS:2,KeyE:3,KeyD:4,KeyF:5,KeyT:6,KeyG:7,KeyY:8,KeyH:9,KeyU:10,KeyJ:11,KeyK:12,KeyO:13,KeyL:14,KeyP:15,Semicolon:16,Quote:17};
const near=(pc,c)=>{let n=c+(((pc-c)%12)+12)%12;if(n-c>6)n-=12;return n;};
/* the picture in the window: calm, flowing MilkDrop presets from the pack the MUSIC CANVAS uses, picked by eye inside HALO from 33 tried (busy, garish, near-black and beat-driven ones left out; Magellan's Nebula jams) */
const MN=448,VIEWS=['picture','both','ribbons'],VIEW_NAME={picture:'PICTURE',both:'PICTURE + RIBBONS',ribbons:'RIBBONS'};
const PICS=['Geiss - Cauldron - painterly 2 (saturation remix)','martin - angel flight','martin - castle in the air','martin - frosty caves 2','martin - stormy sea (2010 update)',
  'cope + martin - mother-of-pearl','Zylot - True Visionary (Final Mix)','Eo.S. + Zylot - skylight (Stained Glass Majesty mix)','Flexi - alien fish pond','Zylot - Star Ornament','martin - ghost city'];
/* HALO's own MilkDrop picture, written for it: three rings of light in the lit characters' colours, wobbling with the sound and
   turning slowly against each other, a glow in the middle that swells with the bass; every frame the picture before is drawn again
   a little bigger, turned and rippled, so the rings leave halos flowing outward like smoke. Made again when the characters change. */
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255),f3=v=>(+v).toFixed(3);
function haloPic(chs){const col=i=>rgb(CHARS[chs[i%chs.length]].col[Math.floor(i/chs.length)%3]);
  const wave=i=>{const [r,g,b]=col(i),turn=f3(.035*(i%2?1:-1));return {baseVals:{enabled:1,samples:200,thick:1,additive:1,smoothing:.6,scaling:1,r,g,b,a:.45},init_eqs_str:'',frame_eqs_str:'',
    point_eqs_str:`a.ang=a.sample*6.28318;a.rad=${f3(.16+.075*i)}+.045*a.value1+.022*Math.sin(a.ang*${3+i}+a.time*${f3(.31+.07*i)})+.012*a.bass_att;`+
      `a.x=.5+a.rad*Math.cos(a.ang+a.time*${turn});a.y=.5+a.rad*Math.sin(a.ang+a.time*${turn});a.a=.55+.45*Math.sin(a.ang*2+a.time*.2+${i});`};};
  const [r,g,b]=col(0),[r2,g2,b2]=col(2),off={baseVals:{enabled:0}};
  return {baseVals:{gammaadj:1,decay:1,echo_zoom:1,echo_alpha:0,wave_a:0,wrap:0,warpanimspeed:.3,warpscale:2,zoom:1.006,warp:.15,ob_size:0,ib_size:0,mv_a:0},
    init_eqs_str:'',pixel_eqs_str:'',pixel_eqs:'',
    frame_eqs_str:'a.zoom=1.005+.003*a.bass_att;a.rot=.002*Math.sin(a.time*.05);a.warp=.15+.1*Math.sin(a.time*.09);',
    waves:[wave(0),wave(1),wave(2),off],
    shapes:[{baseVals:{enabled:1,sides:64,additive:1,rad:.1,x:.5,y:.5,r,g,b,a:.22,r2,g2,b2,a2:0,border_a:0},init_eqs_str:'',frame_eqs_str:'a.rad=.08+.05*a.bass_att;a.a=.1+.16*a.mid_att;'},off,off,off],
    warp:` shader_body {
  vec2 d = uv - 0.5;
  float s = 0.004*sin(time*0.11);
  vec2 p = vec2(cos(s)*d.x - sin(s)*d.y, sin(s)*d.x + cos(s)*d.y) + 0.5;
  p += 0.0025*vec2(sin(uv.y*11.0 + time*0.37), cos(uv.x*9.0 - time*0.29));
  ret = texture(sampler_main, p).xyz*0.93;
 }`,
    comp:` shader_body {
  vec3 c = texture(sampler_main, uv).xyz;
  vec3 g = texture(sampler_blur1, uv).xyz*scale1 + bias1;
  vec3 col = c*0.75 + g*0.9;
  col = max(mix(vec3(dot(col, vec3(0.333))), col, 1.7), 0.0);   // richer colour: the overlapping trails would fade to grey-white
  ret = (1.0 - exp(-col*1.4))*smoothstep(0.5, 0.3, length(uv - 0.5));   // bright parts glow towards their colour, never burn to white
 }`};}

const CSS=`
.halo{position:absolute;left:0;top:0;width:${IW}px;height:${IH}px;transform:scale(${K});transform-origin:0 0;user-select:none}
.halo>*{position:absolute;left:0;top:0}
.halo .body{width:${IW}px;height:${IH}px;pointer-events:none}
.halo canvas{left:${RINGP[0]-RINGP[2]}px;top:${RINGP[1]-RINGP[2]}px;width:${2*RINGP[2]}px;height:${2*RINGP[2]}px;border-radius:50%;pointer-events:none;mix-blend-mode:screen}
.halo .cap{border-radius:50%;background-size:${IW}px ${IH}px;pointer-events:none}
.halo svg{width:${IW}px;height:${IH}px;overflow:visible}
.halo [data-k]{cursor:ns-resize}.halo [data-ch],.halo [data-mo],.halo [data-vo],.halo [data-b],.halo [data-d]{cursor:pointer}
.halo .hit{fill:transparent}.halo .hit:hover{fill:rgba(255,255,255,.05)}.halo .glass{fill:transparent}
.halo canvas.milk{opacity:0}
.halo text.ol{font-family:Consolas,"Lucida Console",monospace;fill:#DCD6FF;letter-spacing:1px}
`;
function style(){if(document.getElementById('halo-css'))return;const s=document.createElement('style');s.id='halo-css';s.textContent=CSS;document.head.appendChild(s);}
function bodyEl(url){style();const m=document.createElement('div');m.className='halo';const img=document.createElement('img');img.className='body';img.src=url;img.alt='';img.draggable=false;m.appendChild(img);return m;}

M2.define({id:'halo',name:'HALO pad synth',short:'HALO',type:'instrument',version:'1.0',format:1,w:W,h:H,scale:2,   /* opens at the desk's 200%: the window is the point */
  blurb:'Pad and drone synth: layered characters, a held drone, a glowing ring',
  sockets:[{id:'keys',kind:'control',dir:'in',label:'Keys in',side:'top',at:.3,tag:'notes'},{id:'chords',kind:'sync',dir:'in',label:'Chords in',side:'top',at:.37},
    {id:'out',kind:'sound',dir:'out',label:'Output',side:'top',at:.63,normal:true}],
  settings:{P:null,preset:0,edited:false,drone:{root:0,fifth:0,oct:0,sub:0},key:0,hold:false,freeze:false,mine:[],view:'picture',pic:'',lock:false},
  preview(){const d=document.createElement('div');d.style.position='relative';d.appendChild(bodyEl(M2.fileUrl(IMG)));return d;},
  create(host){const S=host.settings,ctx=host.engine.ctx,clock=host.clock||M2.clock,m=bodyEl(host.fileUrl(IMG));host.el.appendChild(m);
    const outG=ctx.createGain(),E=Engine(ctx,outG);
    if(!S.P)Object.assign(S,{P:copyP({...DEFAULTS,...PRESETS['Warm blanket']})});S.P={...DEFAULTS,...S.P,ch:[...(S.P.ch||['warm'])],lv:{...(S.P.lv||{})}};
    S.drone={root:0,fifth:0,oct:0,sub:0,...(S.drone||{})};if(!Array.isArray(S.mine))S.mine=[];E.P=S.P;
    let dead=false,raf=0,still=0,flashT=0,sleepT=0,wanderT=0,followT=0,quietSince=0,comp=false,koct=0,kvel=100,pedal=false,follow=null,offMidi=null,hist=[],lit=[],glassT=0;
    const held=new Map(),sus=new Set(),latched=new Set(),typed=new Set(),drones=new Map();lit=[...S.P.ch];   /* lit: the order characters came on, oldest first */
    const P=()=>S.P,plugged=s=>M2.patch.at(host.uid,s).length>0;
    const preload=()=>{for(const ch of P().ch)tables(ctx,ch);if(P().air>.01)tables(ctx,'air');};

    /* ---- the overlay: lights, pointers, the display, the places a click lands ---- */
    const ns='http://www.w3.org/2000/svg';let sv='';
    const rect=([x,y,w,h],a,r=6)=>`<rect class="hit" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ${a}/>`;
    const glowKey=([x,y,w,h],id)=>`<rect id="${id}g" x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#fff" opacity="0" style="mix-blend-mode:screen;pointer-events:none"/><circle id="${id}l" cx="${x+14}" cy="${y+h/2}" r="3.6" opacity="0" style="pointer-events:none"/><circle id="${id}h" cx="${x+14}" cy="${y+h/2}" r="9" opacity="0" style="pointer-events:none"/>`;
    CH.forEach((ch,i)=>{sv+=glowKey(CHK(i),'c'+i)+rect(CHK(i),`data-ch="${ch}"`);});
    MOTIONS.forEach((mo,i)=>{sv+=glowKey(MOK(i),'m'+i)+rect(MOK(i),`data-mo="${mo}"`);});
    VO.forEach((vo,i)=>{sv+=glowKey(VOK(i),'v'+i)+rect(VOK(i),`data-vo="${vo}"`);});
    DRONES.forEach((d,i)=>{sv+=glowKey(DRK(i),'d'+i)+rect(DRK(i),`data-d="${d}"`);});
    for(const [k,[x,y,r]] of Object.entries(KN)){
      if(r>30)for(let i=0;i<21;i++){const a=(-135+270*i/20-90)*Math.PI/180;sv+=`<circle id="${k}${i}" cx="${(x+Math.cos(a)*(r+13)).toFixed(1)}" cy="${(y+Math.sin(a)*(r+13)).toFixed(1)}" r="2.8" fill="#9B86FF" opacity="0" style="pointer-events:none"/>`;}
      sv+=`<circle class="hit" data-k="${k}" cx="${x}" cy="${y}" r="${r+14}"/>`;}
    for(const [b,a] of Object.entries(BTN))sv+=`<rect id="b_${b}" x="${a[0]}" y="${a[1]}" width="${a[2]}" height="${a[3]}" rx="${Math.min(a[2],a[3])/2}" fill="none" stroke="none" stroke-width="2" style="pointer-events:none"/>`+rect(a,`data-b="${b}"`,Math.min(a[2],a[3])/2);
    sv+=`<circle id="holdr" cx="${HOLDB[0]}" cy="${HOLDB[1]}" r="31" fill="none" stroke="#F06A2A" stroke-width="4" opacity="0" style="pointer-events:none"/><circle class="hit" data-b="hold" cx="${HOLDB[0]}" cy="${HOLDB[1]}" r="${HOLDB[2]}"/>`;
    for(let i=0;i<12;i++){const a=(i/12*360-90)*Math.PI/180;sv+=`<circle id="n${i}" cx="${(RING[0]+Math.cos(a)*306).toFixed(1)}" cy="${(RING[1]+Math.sin(a)*306).toFixed(1)}" r="4" fill="#F2A93B" opacity="0" style="pointer-events:none"/>`;}
    sv+=`<text id="o1" class="ol" x="${OLED[0]+12}" y="${OLED[1]+20}" font-size="15"></text><text id="o2" class="ol" x="${OLED[0]+12}" y="${OLED[1]+38}" font-size="11" opacity=".7"></text>`;
    sv+=`<text id="kl" class="ol" x="${KLCD[0]+KLCD[2]/2}" y="${KLCD[1]+21}" font-size="16" text-anchor="middle"></text>`;
    /* the display's glass is darkened behind the words (the photo shows faint unlit segments there) */
    sv=`<rect x="${OLED[0]+2}" y="${OLED[1]+2}" width="${OLED[2]-4}" height="${OLED[3]-4}" rx="4" fill="#030305" opacity=".82" style="pointer-events:none"/>`+sv;
    /* the window itself: a click changes the view, scrolling the picture, a double-click locks it (a small padlock lights at its foot) */
    sv+=`<g id="lockI" opacity="0" style="pointer-events:none" fill="none" stroke="#E6E9EE" stroke-width="2"><path d="M${RING[0]-5} ${RING[1]+246}v-5a5 5 0 0 1 10 0v5"/><rect x="${RING[0]-8}" y="${RING[1]+246}" width="16" height="12" rx="2" fill="#E6E9EE"/></g>`;
    sv+=`<circle class="glass" data-b="glass" cx="${RING[0]}" cy="${RING[1]}" r="292"/>`;
    const glc=document.createElement('canvas');glc.className='milk';glc.width=glc.height=MN;m.appendChild(glc);   /* the evolving picture */
    const cv=document.createElement('canvas');cv.width=cv.height=600;m.appendChild(cv);   /* the ribbons: light added onto the photo's own dark glass */
    /* the knobs' caps, cut from the photo with their pointers, turn; the knurled skirts stay */
    const caps={};for(const [k,[x,y,r]] of Object.entries(KN)){const [px,py]=ph(x,y),cr=r*.74*MX[0]+1,d=document.createElement('div');d.className='cap';
      Object.assign(d.style,{left:px-cr+'px',top:py-cr+'px',width:2*cr+'px',height:2*cr+'px',backgroundImage:`url("${host.fileUrl(IMG)}")`,backgroundPosition:`${cr-px}px ${cr-py}px`});caps[k]=d;m.appendChild(d);}
    const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${IW} ${IH}`);svg.innerHTML=`<g transform="matrix(${MX[0]} 0 0 ${MX[1]} ${MX[2]} ${MX[3]})">${sv}</g>`;m.appendChild(svg);
    const $=id=>svg.getElementById?svg.getElementById(id):svg.querySelector('#'+id);
    const light=(id,on,col,lv=1)=>{const g=$(id+'g'),l=$(id+'l'),h=$(id+'h');g.setAttribute('opacity',on?.1*lv+.04:0);g.setAttribute('fill',col);
      l.setAttribute('fill',col);l.setAttribute('opacity',on?.4+.6*lv:0);h.setAttribute('fill',col);h.setAttribute('opacity',on?.25*lv:0);};

    /* ---- the display ---- */
    const names=()=>[...Object.keys(PRESETS),...S.mine.map(x=>x.name)];
    const sub2=()=>P().ch.map(c=>CHARS[c].label).join(P().ch.length>1?'+':'')+' · '+VO_NAME[P().voicing]+' · '+P().motion.toUpperCase();
    /* a line too long for the display's glass is squeezed to fit, never spilling out over the panel */
    const fit=id=>{const t=$(id),w=OLED[2]-24;t.removeAttribute('textLength');t.removeAttribute('lengthAdjust');
      try{if(t.getComputedTextLength()>w){t.setAttribute('textLength',w);t.setAttribute('lengthAdjust','spacingAndGlyphs');}}catch(e){}};
    const lines=(a,b)=>{$('o1').textContent=a;$('o2').textContent=b||'';fit('o1');fit('o2');};
    const show=()=>{const n=names()[S.preset];lines(n?String(S.preset+1).padStart(2,'0')+' '+n.toUpperCase()+(S.edited?' *':''):'MY SOUND',sub2());};
    const flash=(a,b)=>{lines(a,b);clearTimeout(flashT);flashT=setTimeout(show,1400);};
    const keyName=()=>NM[follow!=null?follow:S.key]+(follow!=null?'·':'');
    function paint(){const p=P(),ck=p.ch.join('+');
      /* new characters: a new picture (locked: only HALO's own takes the new colours) */
      if(milk&&ck!==picChars){picChars=ck;pics.HALO=haloPic(p.ch);if(S.view!=='ribbons'&&(!S.lock||S.pic==='HALO'))pic(S.lock||S.pic==='HALO'||Math.random()<.5?'HALO':anyPic(),5);}
      $('lockI').setAttribute('opacity',S.lock&&S.view!=='ribbons'?.7:0);
      CH.forEach((ch,i)=>{const on=p.ch.includes(ch);light('c'+i,on,CHARS[ch].col[0],on?clamp(p.lv[ch]!=null?p.lv[ch]:1,.15,1):0);});
      MOTIONS.forEach((mo,i)=>light('m'+i,p.motion===mo,'#B9C6FF'));VO.forEach((vo,i)=>light('v'+i,p.voicing===vo,'#B9C6FF'));
      DRONES.forEach((d,i)=>light('d'+i,!!S.drone[d],'#F2A93B'));
      for(const [k,[x,y,r]] of Object.entries(KN)){const u=p[k];caps[k].style.transform=`rotate(${-135+270*u}deg)`;
        if(r>30)for(let i=0;i<21;i++)$(k+i).setAttribute('opacity',i/20<=u+1e-6?.95:0);}
      $('holdr').setAttribute('opacity',S.hold?1:0);
      const ring=(b,col,on)=>{const e=$('b_'+b);e.setAttribute('stroke',on?col:'none');e.setAttribute('fill',on?col:'none');e.setAttribute('fill-opacity',on?.1:0);};
      ring('freeze','#7CC4F0',!!S.freeze);ring('keys','#E6E9EE',comp);$('kl').textContent=keyName();notesLit();show();wake();}
    function notesLit(){const pcs=new Set();for(const n of held.keys())pcs.add(n%12);for(const n of latched)pcs.add(n%12);for(const n of drones.keys())pcs.add(((n%12)+12)%12);
      for(let i=0;i<12;i++)$('n'+i).setAttribute('opacity',pcs.has(i)?1:0);}

    /* ---- the ring: each character layer a silk ribbon of light (twelve fine strands) in its own colours, swirling with the motion ---- */
    const g2=cv.getContext('2d');let lev=0,sparks=[],tf=0,lastT=0;
    function draw(){const p=P(),t0=ctx.currentTime,dt=Math.min(.1,Math.max(0,t0-lastT));lastT=t0;if(!S.freeze)tf+=dt;const t=tf,Rr=300,cx=300,cy=300;
      g2.setTransform(1,0,0,1,0,0);g2.globalCompositeOperation='source-over';g2.globalAlpha=1;g2.clearRect(0,0,600,600);
      const L=p.ch.length,m=p.motion,a=p.amt,f=1/periodOf(p.speed),mv=m==='still'?.2:1,bright=.6+.6*p.tone;
      const br=m==='breathe'?1-a*.5*(1+Math.sin(2*Math.PI*f*t0))/2:1,rot=m==='drift'?t*f*2*Math.PI*.15*(.5+a):m==='wander'?Math.sin(t*f*.9)*a*1.2:0;
      const gate=m==='pulse'?1-a*.5*(1+Math.cos(2*Math.PI*((clock.running?clock.beat(t0):t0*clock.bpm/60)*2)))/2:1,k=lev*br*gate*bright;
      g2.globalCompositeOperation='lighter';
      const c0=CHARS[p.ch[0]].col[0],gl=g2.createRadialGradient(cx,cy,0,cx,cy,Rr*(.7+.3*p.space));gl.addColorStop(0,c0+'5A');gl.addColorStop(1,c0+'00');g2.globalAlpha=k;g2.fillStyle=gl;g2.fillRect(0,0,600,600);
      for(let i=0;i<3;i++){const ch=p.ch[i%L],col=CHARS[ch].col[Math.floor(i/L)%3],lv=clamp(p.lv[ch]!=null?p.lv[ch]:1,.15,1),sp=.1+.12*p.width;
        for(let s=0;s<12;s++){const o=(s-6)*1.8*(.6+p.width*.8);g2.beginPath();
          for(let q=0;q<=210;q++){const ang=q/210*Math.PI*2,w=Math.sin(3*ang+t*.35*mv+i*2.1+s*.03)*.5+Math.sin(5*ang-t*.23*mv+i)*.3+Math.sin(2*ang+t*.17*mv+i*4)*.4,
            r=Rr*(.4+sp*i)*(.86+.14*br)+o*(.6+.4*Math.sin(4*ang+t*.4*mv+i))+Rr*.16*w*(.4+.6*lev),aa=ang+rot*(i%2?1:-1),x=cx+Math.cos(aa)*r,y=cy+Math.sin(aa)*r;q?g2.lineTo(x,y):g2.moveTo(x,y);}
          g2.strokeStyle=S.freeze?'#DDF2FF':col;g2.lineWidth=s===6?2.6:1.2;g2.globalAlpha=Math.min(1,k*lv*(s===6?.85:.17));g2.stroke();}}
      if((m==='shimmer'||p.spark>.05)&&lev>.05&&!S.freeze)for(let q=0;q<2;q++)sparks.push({a:Math.random()*7,r:Rr*(.25+Math.random()*.65),l:1});
      sparks=sparks.filter(s=>(s.l-=.013)>0);g2.fillStyle='#fff';for(const s of sparks){g2.globalAlpha=s.l*lev*(.5+.5*Math.sin(s.l*28));g2.beginPath();g2.arc(cx+Math.cos(s.a)*s.r,cy+Math.sin(s.a)*s.r,1.8,0,7);g2.fill();}
      g2.globalCompositeOperation='source-over';g2.globalAlpha=1;g2.textAlign='center';g2.font='600 15px Arial';g2.fillStyle=`rgba(225,228,236,${.12+.35*Math.min(1,lev)})`;
      g2.fillText(p.ch.map(c=>CHARS[c].label).join(' + '),cx,cy-6);
      const pcs=[...new Set([...held.keys(),...latched,...drones.keys()].map(n=>NM[((n%12)+12)%12]))];if(pcs.length){g2.font='600 14px Arial';g2.fillStyle=`rgba(242,169,59,${.3+.6*Math.min(1,lev)})`;g2.fillText(pcs.join(' · '),cx,cy+16);}}
    /* ---- the picture: MilkDrop (Butterchurn, in lib\ as the MUSIC CANVAS has it), loaded the first time it is shown, listening to
       HALO alone; HALO's own picture (its characters' colours) and calm pack pictures, one blending slowly into the next, more often
       the faster SPEED is; a new character brings a new one. Drawn 30 times a second, only while it sounds and is in sight ---- */
    let milk=null,milkErr='',pics=null,picT=0,mf=0,picChars='';
    const lib=src=>new Promise((res,rej)=>{if(document.querySelector(`script[data-lib="${src}"]`))return res();const s=document.createElement('script');s.src=M2.fileUrl(src);s.dataset.lib=src;
      s.onload=res;s.onerror=()=>{s.remove();rej(new Error(src+' is missing'));};document.head.appendChild(s);});
    async function milkStart(){if(milk||milkErr||milkStart.busy)return;milkStart.busy=true;
      try{await lib('lib/butterchurn.min.js');await lib('lib/butterchurnPresets.min.js');
        const B=window.butterchurn&&(window.butterchurn.default||window.butterchurn),PP=window.butterchurnPresets&&(window.butterchurnPresets.default||window.butterchurnPresets),all=PP.getPresets();
        pics={HALO:haloPic(P().ch)};picChars=P().ch.join('+');for(const n of PICS)if(all[n])pics[n]=all[n];
        milk=B.createVisualizer(ctx,glc,{width:MN,height:MN,pixelRatio:1,textureRatio:1,meshWidth:24,meshHeight:18});   /* a coarser warp grid: a third less work, no visible difference in the round window */milk.connectAudio(E.tap);pic(pics[S.pic]?S.pic:'HALO',0);}
      catch(e){milkErr=e.message;console.warn(e);S.view='ribbons';host.toast('HALO: the picture needs MilkDrop\'s two files in the Mixtape folder\'s lib folder; showing the ribbons');}
      milkStart.busy=false;wake();}
    /* the next picture: HALO's own two times in five, else a calm one from the pack */
    const anyPic=()=>{if(S.pic!=='HALO'&&Math.random()<.4)return 'HALO';const n=Object.keys(pics).filter(x=>x!==S.pic&&x!=='HALO');return n[Math.random()*n.length|0];};
    const picName=n=>n==='HALO'?'HALO · '+P().ch.map(c=>CHARS[c].label).join('+'):n.replace(/^_/,'').toUpperCase();
    /* a picture that will not load or draw is left out from then on, and another takes its place */
    function pic(n,blend){if(!milk||!pics[n])return;try{milk.loadPreset(pics[n],blend);}catch(e){console.warn('HALO picture',n,e);if(n!=='HALO'){delete pics[n];return pic(anyPic(),blend);}return;}S.pic=n;picT=performance.now();host.changed('picture');}
    function stepPic(d){if(!milk)return milkStart();const n=Object.keys(pics),i=n.indexOf(S.pic);pic(n[(i+d+n.length)%n.length],2.5);flash('PICTURE '+(n.indexOf(S.pic)+1)+' OF '+n.length,picName(S.pic));}
    function frame(){raf=0;if(dead)return;const l=E.level();lev+=(Math.min(1,l*9)-lev)*.15;
      const showPic=S.view!=='ribbons',showRib=S.view!=='picture';cv.style.display=showRib?'':'none';glc.style.display=showPic?'':'none';
      if(showRib)draw();
      if(showPic){if(!milk)milkStart();else if(!S.freeze&&!(mf++&1)){if(!S.lock&&performance.now()-picT>clamp(periodOf(P().speed)*1500,20000,180000))pic(anyPic(),8);
          try{milk.render();}catch(e){console.warn('HALO picture',S.pic,e);if(S.pic!=='HALO'){delete pics[S.pic];pic('HALO',1);}}}
        glc.style.opacity=Math.min(1,lev*2.2).toFixed(3);}   /* the picture blooms with the sound and fades back to dark glass */
      const on=l>.0015||E.voices.some(v=>!v.released);host.engine.busy(host.uid,on);if(on)still=performance.now();
      if(host.visible!==false&&(performance.now()-still<900||lev>.01))raf=requestAnimationFrame(frame);else glc.style.opacity=0;}
    function wake(){still=performance.now();if(!raf&&!dead)raf=requestAnimationFrame(frame);}

    /* ---- asleep: silent for 4 s with nothing held (and not frozen) it unhooks from the output; wander ticks only while awake ---- */
    function watch(){clearTimeout(sleepT);if(dead)return;
      if(E.awake){const busy=E.voices.length||S.freeze||E.level()>1e-4;if(busy)quietSince=0;else if(!quietSince)quietSince=performance.now();
        if(quietSince&&performance.now()-quietSince>4000){E.sleep();quietSince=0;}}
      if(E.awake)sleepT=setTimeout(watch,500);}
    function wanderLoop(){clearTimeout(wanderT);if(dead||!E.awake||P().motion!=='wander')return;E.wander();wanderT=setTimeout(wanderLoop,periodOf(P().speed)*1000/3);}
    const awake=()=>{const was=E.awake;E.wake();if(!was){watch();wanderLoop();}};

    /* ---- notes ---- */
    const start=(n,v)=>{awake();preload();const old=held.get(n);if(old&&!old.released)old.release(ctx.currentTime);held.set(n,E.noteOn(n,v||100));notesLit();wake();};
    const stop=n=>{const v=held.get(n);if(v){v.release(ctx.currentTime);held.delete(n);}notesLit();};
    function key(x){if(!x)return;
      if(x.t==='on'){if(S.hold){if(latched.has(x.n)){latched.delete(x.n);stop(x.n);}else{latched.add(x.n);start(x.n,x.v);}return;}sus.delete(x.n);start(x.n,x.v);}
      else if(x.t==='off'){if(S.hold)return;if(pedal){sus.add(x.n);return;}stop(x.n);}
      else if(x.t==='pedal'){pedal=!!x.on;if(!pedal){for(const n of sus)stop(n);sus.clear();}}
      else if(x.t==='bend'){E.bend=clamp(+x.v||0,-1,1);E.voices.forEach(v=>{if(!v.released)v.bendTo(E.bend);});}
      else if(x.t==='mod')set('tone',clamp(+x.v||0,0,1),true);}
    const midi=x=>{if(plugged('keys'))return;key(x.t==='cc'?(x.n===1?{t:'mod',v:x.v}:x.n===64?{t:'pedal',on:x.v>=.5}:null):x);};
    const allUp=()=>{for(const n of [...held.keys()])stop(n);latched.clear();sus.clear();};

    /* ---- the drone: its own notes, apart from the keys; the key, or the song's chord root when one comes in on CHORDS IN ---- */
    const droneKey=()=>follow!=null?follow:S.key;
    function drone(restart){const want=new Map();for(const d of DRONES)if(S.drone[d])want.set(48+droneKey()+DRONE_ST[d],d);
      for(const [n,v] of [...drones])if(restart||!want.has(n)){v.release(ctx.currentTime);drones.delete(n);}
      if(want.size){awake();preload();}for(const n of want.keys())if(!drones.has(n))drones.set(n,E.noteOn(n,92,true));
      runFollow();notesLit();wake();}
    const chordAt=t=>{for(const a of host.send('chords',{t:'chord',at:t}))if(a){if(a.notes&&a.notes.length)return Math.min(...a.notes)%12;if(a.pcs&&a.pcs.length)return ((a.pcs[0]+(a.st||0))%12+12)%12;}return null;};
    function runFollow(){const on=plugged('chords')&&DRONES.some(d=>S.drone[d]);if(on&&!followT)followT=setInterval(()=>{const pc=chordAt(ctx.currentTime);
        if(pc!=null&&pc!==follow){follow=pc;drone(true);$('kl').textContent=keyName();}},400);
      else if(!on&&followT){clearInterval(followT);followT=0;if(follow!=null){follow=null;drone(true);}$('kl').textContent=keyName();}}

    /* ---- every change: into the engine, into the setup, onto the face ---- */
    function set(k,v,quiet){P()[k]=v;if(k!=='vol')S.edited=true;E.apply(clock);paint();if(k==='motion')wanderLoop();
      if(!quiet&&KN[k])flash(KNAME[k],(KFMT[k]||pct)(v));host.changed('knob');}
    function setChars(list,lv){const p=P();p.ch=list;lit=[...lit.filter(c=>list.includes(c)),...list.filter(c=>!lit.includes(c))];if(lv)p.lv=lv;S.edited=true;preload();E.apply(clock);E.voices.forEach(v=>v.morph());paint();host.changed('character');}
    function toggleChar(ch){const p=P();let l=p.ch.filter(c=>c!==ch);
      if(l.length===p.ch.length){l=[...p.ch,ch];if(l.length>3){const old=lit.find(c=>l.includes(c)&&c!==ch)||l[0];l=l.filter(c=>c!==old);}}
      else if(!l.length)return flash(CHARS[ch].label,'ALWAYS ONE LIT');
      setChars(l);flash(l.map(c=>CHARS[c].label).join(' + '),l.length>1?'LAYERED · SCROLL A KEY FOR ITS LEVEL':'');}
    function usePreset(i){const L=names();if(!L.length)return;i=(i+L.length)%L.length;const n=L[i],mine=S.mine.find(x=>x.name===n),pr=mine?mine.P:PRESETS[n],d=mine?mine.drone:pr.drone;
      const {drone:_d,key:_k,...rest}=pr;S.P={...DEFAULTS,...copyP({...DEFAULTS,...rest}),vol:P().vol};E.P=S.P;lit=[...S.P.ch];S.preset=i;S.edited=false;
      if(d)S.drone={root:0,fifth:0,oct:0,sub:0,...d};const kk=mine?mine.key:pr.key;if(kk!=null)S.key=kk;
      preload();E.apply(clock);E.voices.forEach(v=>v.morph());drone(!!d);paint();host.changed('preset');}
    const snap=()=>({P:copyP(P()),drone:{...S.drone},preset:S.preset,edited:S.edited});
    function surprise(){hist.push(snap());if(hist.length>12)hist.shift();const r=(a,b)=>a+Math.random()*(b-a),one=a=>a[Math.floor(Math.random()*a.length)];
      const chs=[one(CH)];if(Math.random()<.35){const b=one(CH.filter(c=>c!==chs[0]));chs.push(b);}
      const lv={};if(chs[1])lv[chs[1]]=+r(.35,.8).toFixed(2);const droning=DRONES.some(d=>S.drone[d]);
      S.P={...P(),ch:chs,lv,voicing:one(['one','one','oct','oct','fifth','wide','sus']),motion:droning?one(['breathe','drift','wander']):one(['still','breathe','breathe','shimmer','drift','drift','pulse','wander']),
        tone:r(.3,.8),width:r(.4,1),swell:r(.35,droning?.92:.85),amt:r(.2,.7),space:r(.4,.9),tex:r(0,.45),speed:r(.4,.9),sub:r(0,.6),air:Math.random()<.3?r(.1,.4):0,spark:Math.random()<.3?r(.1,.4):0};
      E.P=S.P;lit=[...S.P.ch];S.edited=true;if(droning){S.drone={root:1,fifth:Math.random()<.6?1:0,oct:Math.random()<.4?1:0,sub:Math.random()<.3?1:0};}
      preload();E.apply(clock);E.voices.forEach(v=>v.morph());if(droning)drone(false);paint();wanderLoop();host.changed('surprise');
      flash('SURPRISE!',sub2());}
    function back(){const h=hist.pop();if(!h)return flash('BACK','NO SURPRISE TO UNDO');S.P=h.P;E.P=S.P;lit=[...S.P.ch];S.drone=h.drone;S.preset=h.preset;S.edited=h.edited;
      preload();E.apply(clock);E.voices.forEach(v=>v.morph());drone(false);paint();wanderLoop();host.changed('back');flash('BACK',sub2());}
    function save(){let i=1;while(S.mine.some(x=>x.name==='My sound '+i))i++;const name='My sound '+i;S.mine.push({name,P:copyP(P()),drone:{...S.drone},key:S.key});
      S.preset=names().indexOf(name);S.edited=false;show();host.changed('save');flash('SAVED',name.toUpperCase());}

    /* ---- the computer keyboard (KEYS lit): listens only while on ---- */
    const busyTyping=t=>!!(t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))||!!document.querySelector('.modal');
    function kd(e){if(!comp||dead||e.ctrlKey||e.altKey||e.metaKey||busyTyping(e.target))return;const c=e.code;
      if(c in CK){e.preventDefault();if(e.repeat||typed.has(c))return;typed.add(c);key({t:'on',n:CK_BASE+12*koct+CK[c],v:kvel});return;}
      if(c==='KeyZ'||c==='KeyX'){e.preventDefault();if(!e.repeat){blur();koct=clamp(koct+(c==='KeyX'?1:-1),-3,3);flash('KEYS','OCTAVE '+(koct>0?'+':'')+koct);}}
      else if(c==='KeyC'||c==='KeyV'){e.preventDefault();if(!e.repeat){kvel=clamp(kvel+(c==='KeyV'?20:-20),1,127);flash('KEYS','VELOCITY '+kvel);}}}
    function ku(e){if(typed.delete(e.code))key({t:'off',n:CK_BASE+12*koct+CK[e.code]});}
    function blur(){for(const c of typed)key({t:'off',n:CK_BASE+12*koct+CK[c]});typed.clear();}
    function compKeys(on){if(on&&plugged('keys')){host.toast('HALO: a KEYS device is plugged into KEYS IN: turn on its COMPUTER KEYS instead');return;}
      comp=on;if(on){addEventListener('keydown',kd);addEventListener('keyup',ku);addEventListener('blur',blur);}else{blur();removeEventListener('keydown',kd);removeEventListener('keyup',ku);removeEventListener('blur',blur);}
      paint();flash('KEYS',on?'A S D F… PLAY · Z X OCTAVE':'OFF');}

    /* ---- the hands on it ---- */
    const drag=(e,mv,up)=>{e.preventDefault();e.stopPropagation();const M=ev=>mv(ev),U=ev=>{removeEventListener('pointermove',M);removeEventListener('pointerup',U);if(up)up(ev);};addEventListener('pointermove',M);addEventListener('pointerup',U);};
    const val=k=>P()[k];
    m.addEventListener('pointerdown',e=>{if(e.button)return;const t=e.target,d=t.dataset||{};
      if(d.k){const k=d.k,y0=e.clientY,u0=val(k),h=t.getBoundingClientRect().height;drag(e,ev=>set(k,clamp(u0+(y0-ev.clientY)/(h*4),0,1)));return;}
      if(d.ch||d.mo||d.vo||d.b||d.d){drag(e,()=>{},()=>{
        if(d.ch)toggleChar(d.ch);else if(d.mo){set('motion',d.mo,true);flash('MOTION',d.mo.toUpperCase());}else if(d.vo){set('voicing',d.vo,true);flash('VOICING',VO_NAME[d.vo]);}
        else if(d.d){S.drone[d.d]=S.drone[d.d]?0:1;drone(false);paint();host.changed('drone');flash('DRONE',DRONES.filter(x=>S.drone[x]).map(x=>x.toUpperCase()).join(' + ')||'OFF');}
        else button(d.b);});}});
    function button(b){
      if(b==='prev'||b==='next')usePreset(S.preset+(b==='next'?1:-1));else if(b==='surprise')surprise();else if(b==='back')back();else if(b==='save')save();
      else if(b==='kprev'||b==='knext'){S.key=(S.key+(b==='knext'?1:11))%12;if(follow==null)drone(true);paint();host.changed('key');flash('DRONE KEY',NM[S.key]);}
      else if(b==='hold'){S.hold=!S.hold;if(!S.hold){for(const n of latched)stop(n);latched.clear();}paint();host.changed('hold');flash('HOLD',S.hold?'KEYS LATCH: PRESS AGAIN TO LET GO':'OFF');}
      else if(b==='freeze'){S.freeze=!S.freeze;E.frozen=S.freeze;if(S.freeze)awake();E.room();paint();watch();host.changed('freeze');flash('FREEZE',S.freeze?'THE HALL HOLDS':'OFF');}
      else if(b==='keys')compKeys(!comp);
      /* the glass: waits a moment, so a double-click (the lock) does not also change the view */
      else if(b==='glass'){clearTimeout(glassT);glassT=setTimeout(()=>{if(dead)return;S.view=VIEWS[(VIEWS.indexOf(S.view)+1)%VIEWS.length];paint();host.changed('view');
        flash('VIEW',VIEW_NAME[S.view]+(S.view!=='ribbons'?' · SCROLL: ANOTHER · DOUBLE-CLICK: LOCK':''));},260);}}
    function lockPic(){clearTimeout(glassT);if(S.view==='ribbons')return;S.lock=!S.lock;paint();host.changed('lock');
      flash(S.lock?'PICTURE LOCKED':'PICTURE UNLOCKED',S.lock?(milk?picName(S.pic):'')+' · DOUBLE-CLICK TO FREE':'IT DRIFTS ON AGAIN');}
    m.addEventListener('wheel',e=>{const d=e.target.dataset||{};if(d.b==='glass'&&S.view!=='ribbons'){e.preventDefault();e.stopPropagation();stepPic(e.deltaY<0?-1:1);return;}
      if(!d.k&&!d.ch)return;e.preventDefault();e.stopPropagation();const s=-Math.sign(e.deltaY)*.03;
      if(d.k)set(d.k,clamp(val(d.k)+s,0,1));
      else if(P().ch.includes(d.ch)){const lv={...P().lv},c=d.ch;lv[c]=Math.round(clamp((lv[c]!=null?lv[c]:1)+s*1.5,.05,1)*100)/100;P().lv=lv;S.edited=true;E.voices.forEach(v=>v.update());paint();host.changed('level');flash(CHARS[c].label,'LEVEL '+pct(lv[c]));}},{passive:false});
    m.addEventListener('dblclick',e=>{const d=e.target.dataset||{};if(d.k){e.stopPropagation();set(d.k,DEFAULTS[d.k]);}else if(d.b==='glass'){e.stopPropagation();lockPic();}});

    if(!VIEWS.includes(S.view))S.view='picture';E.frozen=!!S.freeze;E.apply(clock);preload();paint();offMidi=M2.midi.listen(midi);
    const offTempo=M2.on?M2.on('tempo',()=>{if(E.pulse)E.sync(clock);}):null;
    if(S.freeze){awake();E.room();}if(DRONES.some(d=>S.drone[d]))setTimeout(()=>{if(!dead)drone(false);},300);
    return {node:s=>s==='out'?outG:null,
      receive(sock,msg){if(sock==='keys')key(msg);return true;},
      plugged(sock){if(sock==='keys'){allUp();if(comp&&plugged('keys'))compKeys(false);}if(sock==='chords')runFollow();},
      visible(v){if(v)wake();},
      /* for tools\probes\m2-halo.js: what is running inside */
      probe:()=>({awake:E.awake,voices:E.voices.length,live:E.voices.filter(v=>!v.released).length,players:E.voices.reduce((s,v)=>s+v.srcs.length,0),
        drones:[...drones.keys()],held:[...held.keys()],latched:[...latched],frozen:E.frozen,level:+E.level().toFixed(4),tables:[...new Set([...cache.values()].filter(e=>e.v).map(e=>e.ch))],made:[...cache.values()].filter(e=>e.v).length}),
      destroy(){dead=true;clearTimeout(flashT);clearTimeout(sleepT);clearTimeout(wanderT);clearInterval(followT);if(raf)cancelAnimationFrame(raf);if(comp)compKeys(false);
        if(offMidi)offMidi();if(typeof offTempo==='function')offTempo();host.engine.busy(host.uid,false);E.frozen=false;E.dispose();setTimeout(()=>{try{outG.disconnect();}catch(e){}},400);}};}});
})();
