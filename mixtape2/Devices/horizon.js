/* Mixtape 2 device: HORIZON, the piano synth for huge atmospheric sound, at church beside the Juno and for writing (it began as
   VESPER, a grand piano with pedals on its lid: desks saved with a VESPER open it as HORIZON). No keyboard on its face: it is played
   from the Juno (or KEYS), and the face is a night sky over mountains and a lake (Steve's picture) with a live aurora that follows how
   loud it plays (THE SKY, below; sketched in Skins\horizon-sky.html):
   - over the sky, on clear glass: along the bottom HORIZON, the PEDAL and KEYS IN lights, the preset (‹ › SAVE; it also shows a knob's
     value while it turns), PIANO / FX ONLY / OFF, the drawers SHAPER REVERSE PAD EFFECTS CHANNEL and STAGE, MASTER; at the top right
     KEYS (the computer keyboard, as HALO's), PANIC, FULL SCREEN (HORIZON over the whole screen, for the stage; Esc leaves)
   - a drawer's strips (and its MORE panel) rise on a pane of glass over the sky; STAGE shows all twelve strips (the CONSOLE, below).
     Knobs: drag up and down or scroll; double-click for where it starts.
   The sky is drawn 30 times a second while it sounds, 8 while it rests, not at all out of sight (at full screen, always in sight);
   silent for a few seconds the sound unhooks from the output.
   The sound: the Salamander Grand (Yamaha C5, Alexander Holm, CC BY 3.0) in Instruments\Salamander Grand, four of its sixteen
   loudness layers, every third note; a key's own recording made once at its own pitch, so every note plays at speed 1 (the
   browser's cheap way), its backwards copy likewise; each note split into its strike and its tail and the two shaped apart (the
   SHAPER), each with its own tube and sends into the delay and the reverb (Crazy Dream Lite's hall, with an octave-up shimmer).
   SPARKLE (as in the core-sample Sustainer): short grains of the key an octave (now and then two) higher, scattered over the ring.
   Jacks: KEYS IN (KEYS, GRAPH PAPER; with nothing there any MIDI keyboard: the Juno, its pedal on CC 64), NOTES OUT (everything
   played, the pedal too: HALO's KEYS IN), FX IN (any sound into the delay and the hall by the TAIL's sends), OUT. */
(()=>{const M2=window.M2,HALO=M2.halo||null;   /* HALO's engine is the PAD (HALO's file loads first) */
const DW=1400,W=640,K=W/DW;   /* the face is laid out 1400 wide and drawn at W on the desk */
const DIR='Instruments/Salamander Grand',LAYERS=[3,7,11,15],LV_TOP=[45,80,105,128];   /* the layers, and the velocity each ends below */
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),pct=v=>Math.round(v*100)+'%',sec=s=>s<1?Math.round(s*1000)+' MS':s.toFixed(2)+' S';
const hold=(p,t)=>{if(p.cancelAndHoldAtTime)p.cancelAndHoldAtTime(t);else{p.cancelScheduledValues(t);}};
const NM=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'],noteName=n=>NM[n%12]+(Math.floor(n/12)-1);

/* ---- the knobs' values (0..1) to sound ---- */
const cutOf=d=>500*Math.pow(40,d);                    /* DAMP: 500 Hz (felt) … 20 kHz (clear) */
const attOf=d=>.002+(1-d)*.016;                       /* and a softer strike as it goes to felt */
const relOf=v=>.06*Math.pow(50,v);                    /* RELEASE: 60 ms … 3 s */
const BEATS=[['1/16',.25],['1/8',.5],['1/8 ·',.75],['1/4',1],['1/4 ·',1.5],['1/2',2],['1 BAR',4]];
const freeT=v=>.03+1.97*v*v;                          /* REVERSE TIME, free: 30 ms … 2 s */
const swellOf=v=>.15*Math.pow(4/.15,v);               /* SWELL: 0.15 … 4 s */
const delT=v=>.06*Math.pow(25,v);                     /* DELAY TIME, free: 60 ms … 1.5 s */
const DIVS={'1/4':1,'1/8d':.75,'1/8':.5};
const decOf=v=>1.5*Math.pow(16,v);                    /* SIZE: 1.5 s … 24 s of hall */
/* SOUND LAB, the piano shaper: each note is split where the hammer's strike gives way to the ringing tail, and each part shaped apart */
const dB=d=>Math.pow(10,d/20),lvDb=v=>-18+30*v;       /* PUNCH, TAIL LEVEL: -18 … +12 dB (0 dB at 0.6) */
const lenOf=v=>.008*Math.pow(20,v);                   /* LENGTH of the strike: 8 … 160 ms */
const warmCut=v=>20000*Math.pow(700/20000,v);         /* WARMTH: the tail's filter, open … 700 Hz */
const SHAPE0={punch:.6,bright:.5,len:.53,hammer:0,tail:.6,soft:0,warmth:0,darken:0,sustain:0,sparkle:0,tubeS:1,delS:1,revS:1,tubeT:1,delT:1,revT:1};   /* neutral: the piano as recorded, each half into every pedal */
/* a sound saved before the strike and the tail had their own sends: its STRIKE → FX becomes the strike's DELAY and REVERB */
/* the PLATE: DECAY 0.4 … 4 s, LOW CUT 100 … 1500 Hz (600 at first, Abbey Road's), HIGH CUT 3 … 18 kHz (10 at first) */
const plDec=v=>.4*Math.pow(10,v),plLow=v=>100*Math.pow(15,v),plHigh=v=>3000*Math.pow(6,v);
/* a plate's ring: dense from the first millisecond (a steel sheet, no early echoes), dying away over DECAY, its highs a little sooner
   and its lows a little later; left and right each their own, so it is wide; made at the level the dry sound has */
function plateIR(ctx,T){const sr=ctx.sampleRate,len=Math.round(sr*Math.min(5,T*1.2+.05)),b=ctx.createBuffer(2,len,sr);
  const aL=Math.exp(-2*Math.PI*700/sr),aH=Math.exp(-2*Math.PI*4500/sr),kL=Math.exp(-6.91/(T*1.15*sr)),kM=Math.exp(-6.91/(T*sr)),kH=Math.exp(-6.91/(T*.6*sr)),kA=Math.exp(-1/(.003*sr));
  let e=0;for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);let lo=0,lh=0,gL=1,gM=1,gH=1,ga=1;
    for(let i=0;i<len;i++){const n=Math.random()*2-1;lo=lo*aL+n*(1-aL);const r=n-lo;lh=lh*aH+r*(1-aH);d[i]=(lo*gL+lh*gM+(r-lh)*gH)*(1-ga);gL*=kL;gM*=kM;gH*=kH;ga*=kA;e+=d[i]*d[i];}}
  const s=.8/Math.sqrt(e/2);for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let i=0;i<len;i++)d[i]*=s;}return b;}
const fixV=v=>{if(v&&v.shape&&"sfx" in v.shape){v.shape.delS=v.shape.revS=v.shape.sfx;delete v.shape.sfx;}return v;};

/* ---- the recordings: decoded once for every VESPER, mono, trimmed (lows ring longer), the silence before the hammer cut off ---- */
const SAMP={state:'none',msg:'',p:null,src:new Map(),meas:new Map(),done:0,total:0};   /* src: 'note|layer' → Float32Array at the engine's rate;
   meas: the same → {s: the strike's level (first 40 ms), t: the tail's (0.25 … 0.75 s), d: how fast the tail dies, dB a second} */
const NOTE_RE=/^([A-G])(#?)(\d)v(\d+)\.mp3$/i,SEMI={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
function loadSamples(ctx,files){if(SAMP.p)return SAMP.p;SAMP.state='loading';SAMP.msg='TUNING…';M2.emit("horizon-samples");
  SAMP.p=(async()=>{let list=[];try{list=await files.list(DIR);}catch(e){}
    const want=list.map(f=>{const m=!f.dir&&NOTE_RE.exec(f.name);return m&&{name:f.name,n:12*(+m[3]+1)+SEMI[m[1].toUpperCase()]+(m[2]?1:0),l:+m[4]};}).filter(x=>x&&LAYERS.includes(x.l));
    if(!want.length){SAMP.state='missing';SAMP.msg='NO PIANO SAMPLES';M2.emit("horizon-samples");SAMP.p=null;throw new Error('missing');}
    want.sort((a,b)=>Math.abs(a.l-9)-Math.abs(b.l-9)||Math.abs(a.n-64)-Math.abs(b.n-64));   /* the middle layers and keys first */
    SAMP.total=want.length;SAMP.done=0;
    const one=async w=>{try{const u=await files.read(DIR+'/'+w.name),b=await ctx.decodeAudioData(u.buffer.slice(u.byteOffset,u.byteOffset+u.byteLength));
        const sr=b.sampleRate,L=b.getChannelData(0),R=b.numberOfChannels>1?b.getChannelData(1):L;let pk=0;for(let i=0;i<L.length;i++){const a=Math.abs(L[i]+R[i]);if(a>pk)pk=a;}
        let s0=0;while(s0<L.length&&Math.abs(L[s0]+R[s0])<pk*.01)s0++;s0=Math.max(0,s0-Math.round(sr*.002));
        const maxS=w.n<48?9:w.n<72?6.5:w.n<88?4.5:3,n=Math.min(L.length-s0,Math.round(sr*maxS)),o=new Float32Array(n),fade=Math.round(sr*.5);
        for(let i=0;i<n;i++)o[i]=(L[s0+i]+R[s0+i])*.5;for(let i=0;i<fade&&i<n;i++)o[n-1-i]*=i/fade;SAMP.src.set(w.n+'|'+w.l,o);
        const rms=(a,b)=>{a=Math.round(a*sr);b=Math.min(n,Math.round(b*sr));let s=0;for(let i=a;i<b;i++)s+=o[i]*o[i];return Math.sqrt(s/Math.max(1,b-a))+1e-7;},
          dur=n/sr,t1=rms(.25,.75),w2=Math.min(1.9,dur-.6),t2=rms(w2-.4,w2);
        SAMP.meas.set(w.n+'|'+w.l,{s:rms(0,.04),t:t1,d:Math.min(0,20*Math.log10(t2/t1)/Math.max(.3,w2-.7))});}catch(e){console.warn('VESPER sample',w.name,e);}
      SAMP.done++;if(SAMP.done%8===0){SAMP.msg='TUNING… '+Math.round(SAMP.done/SAMP.total*100)+'%';M2.emit("horizon-samples");}};
    const q=[...want];await Promise.all([0,1,2,3].map(async()=>{while(q.length)await one(q.shift());}));
    SAMP.state=SAMP.src.size?'ready':'missing';SAMP.msg=SAMP.src.size?'':'NO PIANO SAMPLES';M2.emit("horizon-samples");})();
  return SAMP.p;}
/* the nearest recording of a layer, falling back to the next layer if one note is missing */
function nearest(n,li){for(const d of [0,1,-1,2,-2,3,-3])for(const l of [LAYERS[clamp(li,0,3)],...LAYERS]){const s=clamp(Math.round((n-21)/3)*3+21,21,108)+d*3,a=SAMP.src.get(s+'|'+l);if(a)return {s,a,l};}return null;}
const measOf=(n,li)=>{const r=nearest(n,li);return r&&SAMP.meas.get(r.s+'|'+r.l);};
/* a recording's loudness round a moment (its running sum of squares, made once a recording) */
const SUMS=new WeakMap(),sums=b=>{let p=SUMS.get(b);if(!p){const x=b.getChannelData(0);p=new Float64Array(x.length+1);for(let i=0;i<x.length;i++)p[i+1]=p[i]+x[i]*x[i];SUMS.set(b,p);}return p;};
const envAt=(b,t,w)=>{const p=sums(b),sr=b.sampleRate,a=clamp(Math.round((t-w/2)*sr),0,p.length-2),z=clamp(Math.round((t+w/2)*sr),a+1,p.length-1);return Math.sqrt((p[z]-p[a])/(z-a));};
/* two recordings of a key (HAMMER's and SOFT TAIL's) lined up before they are mixed: each take's start was found by its loudness, which
   can be a millisecond out, enough for the low strings to cancel where they overlap. The lag (±3 ms) that matches them best between
   0.1 and 0.4 s, found once a pair; > 0: the second is late (start it that far in) */
const LAGS=new Map();
function lagOf(a,b){const id=a.length+'|'+b.length+'|'+a.getChannelData(0)[4800]+'|'+b.getChannelData(0)[4800];let k=LAGS.get(id);if(k!=null)return k;
  const x=a.getChannelData(0),y=b.getChannelData(0),sr=a.sampleRate,i0=Math.round(.1*sr),i1=Math.min(Math.round(.4*sr),x.length,y.length-200),M=Math.round(.003*sr);let best=-Infinity;k=0;
  for(let d=-M;d<=M;d++){let s=0;for(let i=i0;i<i1;i+=2){const j=i+d;if(j>=0&&j<y.length)s+=x[i]*y[j];}if(s>best){best=s;k=d;}}
  LAGS.set(id,k);if(LAGS.size>400)LAGS.delete(LAGS.keys().next().value);return k;}
/* SUSTAIN (below ENDLESS): the tail lifted by a share of how far it has died since the strike, never above where it began (+30 dB at most) */
const sustainLift=(b,t0,t,s)=>Math.min(31.6,Math.pow(envAt(b,t0+.05,.1)/Math.max(envAt(b,t,.1),1e-7),s));
/* a key's own recording at its own pitch (cubic, made once and kept: the last 150 used), and its backwards copy */
const KEYC=new Map();
function keyBuf(ctx,n,li,rev){const a4=globalThis.MIXTAPE_A4||440,id=n+'|'+li+'|'+(rev?1:0)+'|'+a4;let b=KEYC.get(id);if(b){KEYC.delete(id);KEYC.set(id,b);return b;}
  if(rev){const f=keyBuf(ctx,n,li,false);if(!f)return null;const L=Math.min(f.length,Math.round(f.sampleRate*4.2));b=ctx.createBuffer(1,L,f.sampleRate);const x=f.getChannelData(0),o=b.getChannelData(0);for(let i=0;i<L;i++)o[i]=x[L-1-i];   /* the first 4.2 s backwards: the longest swell */}
  else{const r=nearest(n,li);if(!r)return null;const src=r.a,ratio=Math.pow(2,(n-r.s)/12)*a4/440,len=Math.floor((src.length-3)/ratio);
    b=ctx.createBuffer(1,len,ctx.sampleRate);const o=b.getChannelData(0);
    for(let i=0;i<len;i++){const p=i*ratio,j=p|0,f=p-j,y0=src[j>0?j-1:0],y1=src[j],y2=src[j+1],y3=src[j+2];
      o[i]=y1+.5*f*(y2-y0+f*(2*y0-5*y1+4*y2-y3+f*(3*(y1-y2)+y3-y0)));}}
  KEYC.set(id,b);while(KEYC.size>160)KEYC.delete(KEYC.keys().next().value);return b;}
/* SUSTAIN at its top (ENDLESS): a stretch of the key's tail (0.6 s … 3.2 s) made level (each part lifted by how far the ring has died
   there) and joined end to start with a 0.25 s crossfade, so it loops while the key is held; it starts in step with the recording */
function keyLoop(ctx,n,li){const a4=globalThis.MIXTAPE_A4||440,id=n+'|'+li+'|L|'+a4;let r=KEYC.get(id);if(r){KEYC.delete(id);KEYC.set(id,r);return r;}
  const f=keyBuf(ctx,n,li,false);if(!f)return null;const sr=f.sampleRate,x=f.getChannelData(0),a=Math.round(.6*sr),xf=Math.round(.25*sr),b=Math.min(x.length-Math.round(.6*sr),Math.round(3.2*sr));
  if(b-a<xf*3)return null;const blk=Math.round(.02*sr),nb=Math.ceil((b-a)/blk),env=new Float32Array(nb),sm=new Float32Array(nb);
  for(let k=0;k<nb;k++){let s=0,c=0;for(let i=a+k*blk;i<Math.min(b,a+(k+1)*blk);i++){s+=x[i]*x[i];c++;}env[k]=Math.sqrt(s/Math.max(1,c))+1e-6;}
  for(let k=0;k<nb;k++){let s=0,c=0;for(let j=k-2;j<=k+2;j++)if(j>=0&&j<nb){s+=env[j];c++;}sm[k]=s/c;}
  const ref=sm[Math.min(nb-1,Math.round((xf+.15*sr)/blk))],len=b-a,y=new Float32Array(len);
  for(let i=0;i<len;i++){const p=i/blk-.5,k=clamp(Math.floor(p),0,nb-1),k2=Math.min(nb-1,k+1),fr=clamp(p-k,0,1);y[i]=x[a+i]*ref/(sm[k]*(1-fr)+sm[k2]*fr);}
  const N=len-xf,buf=ctx.createBuffer(1,N,sr),o=buf.getChannelData(0);
  for(let i=0;i<N;i++){if(i<xf){const w=i/xf*Math.PI/2;o[i]=y[i]*Math.sin(w)+y[i+N]*Math.cos(w);}else o[i]=y[i];}
  r={b:buf,at:(a+xf)/sr,off:xf/sr};KEYC.set(id,r);while(KEYC.size>160)KEYC.delete(KEYC.keys().next().value);return r;}

/* ---- the sound ---- */
function Engine(ctx,outG){
  const G=v=>{const g=ctx.createGain();g.gain.value=v;return g;},B=(type,f,q)=>{const b=ctx.createBiquadFilter();b.type=type;b.frequency.value=f;if(q!=null)b.Q.value=q;return b;};
  const E={voices:[],awake:false};
  const out=G(1),lim=ctx.createDynamicsCompressor();lim.threshold.value=-3;lim.knee.value=2;lim.ratio.value=20;lim.attack.value=.002;lim.release.value=.15;
  const meter=ctx.createAnalyser();meter.fftSize=512;const mbuf=new Float32Array(512);
  /* everything (piano, pad, effects) meets in `out`, then TAPE and the CHANNEL, then the limiter */
  const osc=f=>{const o=ctx.createOscillator();o.frequency.value=f;o.start();return o;};
  /* TAPE: a short delay swung slowly (wow) and quickly (flutter), a soft saturation, a little hiss; off: straight through */
  const tpDry=G(1),tpWet=G(0),tpPre=G(1),tpDl=ctx.createDelay(.05),tpSat=ctx.createWaveShaper(),tpPost=G(1),tape=G(1),wowG=G(0),flG=G(0),hissG=G(0),hissHp=B('highpass',3500,.5);
  tpDl.delayTime.value=.008;tpSat.oversample='2x';osc(.55).connect(wowG);wowG.connect(tpDl.delayTime);osc(6.7).connect(flG);flG.connect(tpDl.delayTime);
  out.connect(tpDry);tpDry.connect(tape);out.connect(tpPre);tpPre.connect(tpDl);tpDl.connect(tpSat);tpSat.connect(tpPost);tpPost.connect(tpWet);tpWet.connect(tape);hissHp.connect(hissG);hissG.connect(tape);
  let hissSrc=null;
  /* the CHANNEL, the glue on everything: LOW CUT, BODY, PRESENCE, AIR, a gentle compressor blended in alongside (parallel: GLUE how hard,
     BLEND how much), WIDTH (left and right mixed toward each other or apart; MONO: the same in both), OUT */
  const chLow=B('highpass',20,.5),chBody=B('peaking',250,.8),chPres=B('peaking',3200,.9),chAir=B('highshelf',10000),chDry=G(1),chComp=ctx.createDynamicsCompressor(),chMake=G(0),chSum=G(1),
    chSp=ctx.createChannelSplitter(2),chMg=ctx.createChannelMerger(2),wLL=G(1),wLR=G(0),wRL=G(0),wRR=G(1),chOut=G(1);
  chComp.knee.value=10;chComp.attack.value=.02;chComp.release.value=.25;
  tape.connect(chLow);chLow.connect(chBody);chBody.connect(chPres);chPres.connect(chAir);chAir.connect(chDry);chDry.connect(chSum);chAir.connect(chComp);chComp.connect(chMake);chMake.connect(chSum);
  chSum.connect(chSp);chSp.connect(wLL,0);chSp.connect(wLR,0);chSp.connect(wRL,1);chSp.connect(wRR,1);wLL.connect(chMg,0,0);wRL.connect(chMg,0,0);wRR.connect(chMg,0,1);wLR.connect(chMg,0,1);chMg.connect(chOut);chOut.connect(lim);
  /* the piano in two halves: each note's strike and its tail, into a few placed panners. The tail: WARMTH, LEVEL, DAMP; the strike:
     DAMP, BRIGHT, PUNCH. Each half then has its own tube (SOUND LAB's TUBE knob: how much of it goes through the tube rather than round
     it, while the TUBE pedal is on), is heard dry while PIANO is ON, and feeds the DELAY and the REVERB by its own two knobs (in FX ONLY
     too: there only the dry halves are silent) */
  const tailBus=G(1),tWarm=B('lowpass',20000,.5),piano=G(.9),damp=B('lowpass',8000,.5);tailBus.connect(tWarm);tWarm.connect(piano);piano.connect(damp);
  const strikeBus=G(1),sDamp=B('lowpass',8000,.5),sBright=B('highshelf',2500),sLevel=G(1);strikeBus.connect(sDamp);sDamp.connect(sBright);sBright.connect(sLevel);
  const pans=new Map(),panTo=(dest,p,key)=>{const k=key+(Math.round(p*10)/10);let n=pans.get(k);if(!n){n=ctx.createStereoPanner();n.pan.value=Math.round(p*10)/10;n.connect(dest);pans.set(k,n);}return n;};
  const delIn=G(0),vIn=G(0);   /* the DELAY's and the REVERB's inputs: their footswitches */
  /* the PAD (HALO's engine, made by the face): heard as it is, and into the hall by INTO HALL; FX ONLY never silences it */
  const padIn=G(1),padLow=B('highpass',20,.5),padDk=G(1),padRev=G(.25);padIn.connect(padLow);padLow.connect(padDk);padDk.connect(out);padDk.connect(padRev);padRev.connect(vIn);E.padIn=padIn;
  const vDk=G(1),dDk=G(1);   /* the reverb's and the delay's returns, ducked under the piano (below) */
  /* TUBE: drive into an uneven soft curve (even harmonics, as a valve), a warm tilt, LEVEL */
  function half(src){const h={through:G(0),round:G(1),pre:G(1),shape:ctx.createWaveShaper(),low:B('lowshelf',220),high:B('highshelf',4200),post:G(1),o:G(1),gate:G(1),del:G(1),rev:G(1)};
    h.shape.oversample='2x';src.connect(h.through);src.connect(h.round);h.through.connect(h.pre);h.pre.connect(h.shape);h.shape.connect(h.low);h.low.connect(h.high);h.high.connect(h.post);
    h.post.connect(h.o);h.round.connect(h.o);h.o.connect(h.gate);h.gate.connect(out);h.o.connect(h.del);h.del.connect(delIn);h.o.connect(h.rev);h.rev.connect(vIn);return h;}
  const tailIn=G(1),sparkG=G(1),sparkHi=B("highshelf",3200);sparkHi.gain.value=6;damp.connect(tailIn);sparkG.connect(sparkHi);sparkHi.connect(tailIn);   /* SPARKLE's grains join the tail after its WARMTH and DAMP: they keep their glitter */
  const HS=half(sLevel),HT=half(tailIn);
  /* DUCK: how loud the piano is playing (its two halves, heard or not: in FX ONLY too), made into a slow envelope, pulls the reverb,
     the delay and the pad down by their DUCK knobs while it plays; they bloom back in the gaps */
  const side=G(1),rect=ctx.createWaveShaper(),env=B('lowpass',3,.5),dShape=ctx.createWaveShaper(),dkV=G(0),dkD=G(0),dkP=G(0);
  rect.curve=Float32Array.from({length:1025},(_,i)=>Math.abs(i/512-1));dShape.curve=Float32Array.from({length:1025},(_,i)=>-Math.min(1,Math.max(0,i/512-1)*45));   /* a firm note ducks fully, a fading ring a little */
  HS.o.connect(side);HT.o.connect(side);side.connect(rect);rect.connect(env);env.connect(dShape);dShape.connect(dkV);dShape.connect(dkD);dShape.connect(dkP);dkV.connect(vDk.gain);dkD.connect(dDk.gain);dkP.connect(padDk.gain);
  /* FX IN (HALO, say): heard as it comes, and into the DELAY and the REVERB by the TAIL's knobs */
  const fxIn=G(1),fDel=G(1),fRev=G(1);fxIn.connect(out);fxIn.connect(fDel);fDel.connect(delIn);fxIn.connect(fRev);fRev.connect(vIn);
  const inMon=ctx.createAnalyser();inMon.fftSize=256;fxIn.connect(inMon);const ibuf=new Float32Array(256);
  /* REVERSE: its backwards notes come in here (they are made from the recordings, not from the sound) */
  const revBus=G(1),rDamp=B('lowpass',8000,.5);revBus.connect(rDamp);rDamp.connect(out);
  /* DELAY: ping-pong; its input stops when switched off, so its echoes ring out */
  const dTone=B('lowpass',6000,.4),dl=ctx.createDelay(3),dr=ctx.createDelay(3),fl=B('lowpass',5000,.3),fr=B('lowpass',5000,.3),fbL=G(.3),fbR=G(.3),dm=ctx.createChannelMerger(2),D=G(.25);
  rDamp.connect(delIn);delIn.connect(dTone);dTone.connect(dl);dl.connect(fl);fl.connect(fbL);fbL.connect(dr);dr.connect(fr);fr.connect(fbR);fbR.connect(dl);
  dl.connect(dm,0,0);dr.connect(dm,0,1);dm.connect(D);D.connect(dDk);dDk.connect(out);
  /* REVERB: Crazy Dream Lite, all wet; its input stops when switched off, so the hall rings out */
  const V=G(.4),shimG=G(0);rDamp.connect(vIn);D.connect(vIn);
  let cdl=null,shim=null,shimOn=false;
  E.reverb=CDL=>{cdl=CDL.create(ctx,{settings:{mix:1,size:.7,decay:6,predelay:.025,highCut:7500,lowCut:110,mod:.3,rate:.2}});vIn.connect(cdl.input);cdl.output.connect(V);V.connect(vDk);vDk.connect(out);E.apply();};
  /* the shimmer: an octave up, two delay lines swept by a sawtooth half a sweep apart, each faded in and out round its jump; fed back into the hall */
  function shimmer(){if(shim)return shim;const Wn=.06,f=1/Wn,saw=ctx.createOscillator(),cos=ctx.createOscillator();saw.type='sawtooth';saw.frequency.value=f;
    cos.setPeriodicWave(ctx.createPeriodicWave(new Float32Array([0,1]),new Float32Array([0,0]),{disableNormalization:true}));cos.frequency.value=f;
    const i=G(1),o=G(1),hp=B('highpass',500,.5),lp=B('lowpass',6500,.5);
    const voice=lag=>{const d=ctx.createDelay(.2),w=G(.5),sg=G(-Wn/2),cg=G(.5);d.delayTime.value=Wn/2;let s=saw,c=cos;
      if(lag){const hs=ctx.createDelay(.2),hc=ctx.createDelay(.2);hs.delayTime.value=hc.delayTime.value=Wn/2;saw.connect(hs);cos.connect(hc);s=hs;c=hc;}   /* half a sweep later: its window, delayed too, is the other half */
      s.connect(sg);sg.connect(d.delayTime);c.connect(cg);cg.connect(w.gain);i.connect(d);d.connect(w);w.connect(o);};
    voice(false);voice(true);o.connect(hp);hp.connect(lp);lp.connect(shimG);const t=ctx.currentTime+.02;saw.start(t);cos.start(t);return shim={i,o,stop(){try{saw.stop();cos.stop();}catch(e){}}};}
  function shimWire(on){if(!cdl||on===shimOn)return;shimOn=on;const s=shimmer();if(on){cdl.output.connect(s.i);shimG.connect(cdl.input);}else{try{cdl.output.disconnect(s.i);shimG.disconnect(cdl.input);}catch(e){}}}
  /* PLATE, on the CHANNEL: a clean, quick plate, as Abbey Road used its EMT plates (the send cut below about 600 Hz and above 10 kHz, so it
     never muddies a big system). Fed from the piano's two halves (in FX ONLY too, as the hall is), the backwards notes, the echoes, the pad
     and FX IN, never from the big hall; a convolver plays a plate's dense, bright ring made here (no feedback loop: it cannot distort or
     build up). A new DECAY makes a new ring in a new convolver and the sound moves across to it, so the old ring dies away untouched;
     switched off it costs nothing (no ring is made until it is first switched on) */
  const plIn=G(0),plHp=B('highpass',600,.6),plLp=B('lowpass',10000,.6),plPre=ctx.createDelay(.2),plOut=G(.4),plDk=G(1),dkL=G(0);let plNow=null;
  HS.o.connect(plIn);HT.o.connect(plIn);rDamp.connect(plIn);D.connect(plIn);padDk.connect(plIn);fxIn.connect(plIn);
  plIn.connect(plHp);plHp.connect(plLp);plLp.connect(plPre);plOut.connect(plDk);plDk.connect(chLow);dShape.connect(dkL);dkL.connect(plDk.gain);
  function plateSwap(T){const t=ctx.currentTime,g=G(0),cv=ctx.createConvolver();cv.normalize=false;cv.buffer=plateIR(ctx,T);plPre.connect(g);g.connect(cv);cv.connect(plOut);
    g.gain.setTargetAtTime(1,t,.03);const old=plNow;plNow={g,cv,T};
    if(old){hold(old.g.gain,t);old.g.gain.setTargetAtTime(0,t,.03);setTimeout(()=>{for(const n of [old.g,old.cv])try{n.disconnect();}catch(e){}},old.T*1200+500);}}

  /* every setting into the sound, gliding */
  E.apply=(clock)=>{const P=E.P;if(!P)return;const t=ctx.currentTime,k=.05,set=(p,v,kk)=>p.setTargetAtTime(v,t,kk||k);
    const sh=P.shape,lv=.9*P.level*P.level*1.6;set(piano.gain,lv*dB(lvDb(sh.tail)));set(sparkG.gain,lv);set(sLevel.gain,lv*dB(lvDb(sh.punch)));
    set(damp.frequency,cutOf(P.damp));set(sDamp.frequency,cutOf(P.damp));set(rDamp.frequency,cutOf(P.damp));set(sBright.gain,(sh.bright-.5)*24+sh.hammer*5);set(tWarm.frequency,warmCut(sh.warmth));
    const on=P.piano==='on'?1:0;set(HS.gate.gain,on);set(HT.gate.gain,on);
    const tb=P.tube,drv=1+tb.drive*14;if(E._drv!==drv||E._warm!==tb.warmth){E._drv=drv;E._warm=tb.warmth;const bias=.08+tb.warmth*.22,c=new Float32Array(2049);
      for(let i=0;i<2049;i++){const x=i/1024-1;c[i]=(Math.tanh(2*(x-bias))-Math.tanh(-2*bias))/Math.tanh(2);}HS.shape.curve=c;HT.shape.curve=c;}
    for(const [h,a,d,r] of [[HS,sh.tubeS,sh.delS,sh.revS],[HT,sh.tubeT,sh.delT,sh.revT]]){const ta=tb.on?a:0;set(h.through.gain,ta,.02);set(h.round.gain,1-ta,.02);
      set(h.pre.gain,drv*.5);set(h.post.gain,(.35+tb.level*1.3)/Math.sqrt(drv*.5+.5));set(h.low.gain,tb.warmth*6);set(h.high.gain,-tb.warmth*9);set(h.del.gain,d);set(h.rev.gain,r);}
    set(fDel.gain,sh.delT);set(fRev.gain,sh.revT);set(padRev.gain,P.pad?P.pad.rev*1.2:0);
    const dv=P.del,bpm=(clock||M2.clock).bpm||120,dtime=dv.sync?60/bpm*(DIVS[dv.div]||.5):delT(dv.time);
    set(dl.delayTime,clamp(dtime,.02,2.9),.08);set(dr.delayTime,clamp(dtime,.02,2.9),.08);set(fbL.gain,dv.rep*.82);set(fbR.gain,dv.rep*.82);
    const tc=900*Math.pow(14,dv.tone);set(fl.frequency,tc);set(fr.frequency,tc);set(dTone.frequency,tc*1.6);set(D.gain,dv.mix*1.1);set(delIn.gain,dv.on?1:0,.02);
    const vb=P.verb;set(V.gain,vb.mix*1.3);set(vIn.gain,vb.on?1:0,.02);set(shimG.gain,vb.shim*.55);
    /* TAPE, the CHANNEL, the ducks, the pad's low cut (a sound saved before these existed reads their defaults) */
    const tp={...TAPE0,...(P.tape||{})},ch={...CHAN0,...(P.chan||{})},ton=!!tp.on;
    set(tpWet.gain,ton?1:0,.03);set(tpDry.gain,ton?0:1,.03);set(wowG.gain,ton?tp.wobble*.0026:0,.1);set(flG.gain,ton?tp.wobble*.00009:0,.1);
    const tk=1+tp.sat*5;if(E._tk!==tk){E._tk=tk;tpSat.curve=Float32Array.from({length:2049},(_,i)=>{const x=i/1024-1;return Math.tanh(tk*x)/Math.tanh(tk);});}
    set(tpPost.gain,1/(1+tp.sat*.35));
    if(ton&&tp.hiss>.01&&!hissSrc){const nb=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
      hissSrc=ctx.createBufferSource();hissSrc.buffer=nb;hissSrc.loop=true;hissSrc.connect(hissHp);hissSrc.start();}
    set(hissG.gain,ton?tp.hiss*tp.hiss*.012:0,.1);
    set(chLow.frequency,ch.low<.02?20:30*Math.pow(12,ch.low));set(chBody.gain,(ch.body-.5)*18);set(chPres.gain,(ch.pres-.5)*18);set(chAir.gain,(ch.air-.5)*18);
    chComp.threshold.setTargetAtTime(-6-30*ch.glue,t,k);chComp.ratio.setTargetAtTime(1.5+6*ch.glue,t,k);set(chMake.gain,ch.blend*dB(ch.glue*14));set(chDry.gain,1-ch.blend*.55);
    const wd=ch.mono?0:ch.width*1.5,A=(1+wd)/2,Bw=(1-wd)/2;set(wLL.gain,A);set(wRR.gain,A);set(wLR.gain,Bw);set(wRL.gain,Bw);set(chOut.gain,dB(-30+36*ch.out));
    const pl={...PLATE0,...(P.plate||{})};set(plIn.gain,pl.on?1:0,.02);set(plOut.gain,pl.mix*4);set(plHp.frequency,plLow(pl.low));set(plLp.frequency,plHigh(pl.high));
    set(plPre.delayTime,pl.pre*.12,.03);set(dkL.gain,pl.duck||0);
    const pT=+plDec(pl.decay).toFixed(2);if(pl.on&&E._plT!==pT){E._plT=pT;clearTimeout(E._plTm);if(plNow)E._plTm=setTimeout(()=>plateSwap(pT),140);else plateSwap(pT);}   /* a knob turning: one new ring when it rests */
    set(dkV.gain,vb.duck||0);set(dkD.gain,P.del.duck||0);set(dkP.gain,P.pad?P.pad.duck||0:0);set(padLow.frequency,P.pad&&P.pad.low>.02?30*Math.pow(13,P.pad.low):20);
    if(cdl){cdl.set({size:.35+vb.size*.65,decay:decOf(vb.size),gravity:-vb.bloom*.9,resonance:vb.shim*.25,predelay:vb.pre*.2,lowCut:40*Math.pow(15,vb.low)});cdl.freeze(!!vb.freeze);shimWire(vb.shim>.01);}};

  /* ---- voices: a source and a gain each, into a placed panner ---- */
  const layerOf=v=>{let i=0;while(i<3&&v>=LV_TOP[i])i++;const lo=i?LV_TOP[i-1]:1;return {i,frac:clamp((v-lo)/(LV_TOP[i]-lo),0,1)};};
  const panOf=n=>clamp((n-64)/44,-1,1)*.45;
  /* a voice: its sources and gains (a note may play two recordings, and a loop); gone when its last source ends */
  function voiceOf(n,t,rev){const v={srcs:[],gains:[],nodes:[],n,t,released:false,rev};E.voices.push(v);
    if(E.voices.length>80){const old=E.voices.find(x=>x.released&&x!==v)||E.voices[0];if(old!==v)E.kill(old,.03);}return v;}
  const src=b=>{const s=ctx.createBufferSource();s.buffer=b;return s;};
  function ends(v,s){s.onended=()=>{for(const x of [...v.gains,...v.nodes,...v.srcs])try{x.disconnect();}catch(e){}const i=E.voices.indexOf(v);if(i>=0)E.voices.splice(i,1);};}
  function play(buf,when,off,amp,att,dest,pan,key,tag){const v=voiceOf(key,when,tag==='r'),s=src(buf),g=ctx.createGain();
    g.gain.setValueAtTime(0,when);g.gain.linearRampToValueAtTime(amp,when+Math.abs(att));s.connect(g);g.connect(panTo(dest,pan,tag));s.start(when,off);v.dur=buf.duration-off;
    v.srcs.push(s);v.gains.push(g);ends(v,s);return v;}
  E.kill=(v,k)=>{const t=ctx.currentTime;k=k||.03;for(const g of v.gains){hold(g.gain,t);g.gain.setTargetAtTime(0,t,k);}for(const s of v.srcs)try{s.stop(t+k*8);}catch(e){}v.released=true;};
  E.release=(v,t,rel)=>{if(v.released)return;v.released=true;if(v.t>t){for(const s of v.srcs)try{s.stop(t);}catch(e){}return;}   /* not begun: never begins */
    for(const g of v.gains){hold(g.gain,t);g.gain.setTargetAtTime(0,t,rel/4);}for(const s of v.srcs)try{s.stop(t+rel*1.6+.05);}catch(e){}};
  /* a struck key, as SOUND LAB shapes it: the strike (its first LENGTH, from the HAMMER's harder recording if turned up, matched in
     level) crossfades into the tail (from SOFT TAIL's softer recording if turned up); SUSTAIN gives back part of the tail's dying away,
     ENDLESS hands it to a level loop; DARKEN closes a filter on the tail as it rings */
  E.strike=(n,vel,t)=>{const P=E.P,sh=P.shape,h=sh.hammer,{i:li,frac}=layerOf(vel),amp=(.62+.38*frac)*1.15;
    const ls=Math.round(li+h*(3-li)),lt=Math.round(li-sh.soft*li),bS=keyBuf(ctx,n,ls,false);if(!bS)return null;
    const bT=lt===ls?bS:(keyBuf(ctx,n,lt,false)||bS),two=bT!==bS,m0=measOf(n,li),mS=measOf(n,ls),mT=measOf(n,lt);
    /* HAMMER hits harder: the harder recording with half its extra loudness kept, and up to 4 dB more (and a brighter strike: E.apply) */
    const aS=amp*(m0&&mS?Math.pow(clamp(m0.s/mS.s,.2,5),1-.5*h):1)*dB(4*h),aT=amp*(m0&&mT?clamp(m0.t/mT.t,.2,5):1),aH=amp*(m0&&mS?clamp(m0.t/mS.t,.2,5):1);
    /* with two recordings the strike's one rings on into the tail for C before the tail's takes over, so a hard hit's ring is heard */
    const L=lenOf(sh.len),X=Math.max(.012,L*.6),C=two?.03+.22*Math.max(h,sh.soft*.5):0,att=attOf(P.damp),pan=panOf(n),v=voiceOf(n,t,false),tEnd=t+L+X,tTail=tEnd+C;
    const gS=ctx.createGain(),gT=ctx.createGain(),sS=src(bS),sT=two?src(bT):sS,dest=panTo(tailBus,pan,'t');
    gS.gain.setValueAtTime(0,t);gS.gain.linearRampToValueAtTime(aS,t+att);gS.gain.setValueAtTime(aS,t+Math.max(att,L));gS.gain.linearRampToValueAtTime(0,t+Math.max(att,L)+X);
    /* two recordings (lined up: lagOf) hand over with a fade between a straight one and an equal-power one: lined up they add like one
       take, but not quite, so this stays within about 1.5 dB either way through the handover */
    const EQ=(a,up)=>{const c=new Float32Array(16);for(let k=0;k<16;k++){const w=k/15*Math.PI/2;c[k]=a*Math.pow(up?Math.sin(w):Math.cos(w),1.5);}return c;};
    gT.gain.setValueAtTime(0,t);if(two){gT.gain.setValueAtTime(0,tEnd);gT.gain.setValueCurveAtTime(EQ(aT,true),tEnd+.001,C);}else{gT.gain.setValueAtTime(0,t+L);gT.gain.linearRampToValueAtTime(aT,tTail);}
    sS.connect(gS);gS.connect(panTo(strikeBus,pan,'s'));sT.connect(gT);v.srcs.push(sS);v.gains.push(gS,gT);
    let tail=gT;if(sh.darken>.02){const f=B('lowpass',18000,.4);f.frequency.setValueAtTime(18000,tTail);f.frequency.exponentialRampToValueAtTime(Math.max(300,18000*Math.pow(.04,sh.darken)),tTail+3.5);f.connect(dest);tail=f;v.nodes.push(f);}
    const into=tail===gT?dest:tail;gT.connect(into);
    if(two){v.srcs.push(sT);const gH=ctx.createGain();gH.gain.setValueAtTime(0,t);gH.gain.setValueAtTime(0,t+L);gH.gain.linearRampToValueAtTime(aH,tEnd);gH.gain.setValueCurveAtTime(EQ(aH,false),tEnd+.001,C);
      sS.connect(gH);gH.connect(into);v.gains.push(gH);}
    let main=sT;const endless=sh.sustain>=.97,lp=endless?keyLoop(ctx,n,lt):null;
    if(lp){const sL=src(lp.b),gL=ctx.createGain(),t1=Math.max(t+lp.at,tTail);sL.loop=true;sL.loopEnd=lp.b.duration;
      gL.gain.setValueAtTime(0,t);gL.gain.setValueAtTime(0,t1);gL.gain.linearRampToValueAtTime(aT,t1+.3);gT.gain.setValueAtTime(aT,t1+.003);gT.gain.linearRampToValueAtTime(0,t1+.3);
      sL.connect(gL);gL.connect(into);sL.start(t+lp.at,lp.off);v.srcs.push(sL);v.gains.push(gL);main=sL;}
    else if(sh.sustain>.01){const s=Math.pow(Math.min(sh.sustain,.96),1.6)*.95,t0=tTail+.003-t,dur=bT.duration-.55-t0;   /* along the recording's own dying away, a point every 80 ms */
      if(dur>.3){const K=Math.max(8,Math.ceil(dur*12)),cur=new Float32Array(K);for(let k=0;k<K;k++)cur[k]=aT*sustainLift(bT,t0,t0+dur*k/(K-1),s);cur[0]=aT;gT.gain.setValueCurveAtTime(cur,tTail+.003,dur);}}
    /* SPARKLE (as the core-sample Sustainer's): short glints taken from the bright early ring of the key an octave or two higher,
       each levelled to the strike (up to about 8 dB under it), a little brightened, scattered over the first seconds of the ring, quieter as it dies, each placed somewhere left to right; they join the tail after its WARMTH and DAMP (so they keep
       their glitter) and stop with the note. v.grains: when each sounds, for the stars */
    if(sh.sparkle>.01){const ref=envAt(bS,.03,.04)*aS*sh.sparkle*.8,cnt=Math.round(3+22*sh.sparkle);v.grains=[];   /* each grain levelled to the strike (a tail is 20-30 dB quieter) */
      for(let k=0;k<cnt;k++){const up=n+24<=108&&Math.random()<.5?24:12;if(n+up>108)continue;const bG=keyBuf(ctx,n+up,lt,false);if(!bG)continue;
        const when=t+.05+Math.pow(Math.random(),1.5)*3,len=.025+Math.random()*.06,off=.03+Math.random()*Math.min(.4,bG.duration-.2),lv=Math.min(40,ref*Math.exp(-(when-t)/2.2)*(.5+Math.random()*.5)/Math.max(envAt(bG,off+len/2,len),1e-5));
        const s=src(bG),g=ctx.createGain();g.gain.setValueAtTime(0,when);g.gain.linearRampToValueAtTime(lv,when+len*.15);g.gain.exponentialRampToValueAtTime(lv*.02,when+len);
        s.connect(g);g.connect(panTo(sparkG,(Math.random()*2-1)*.8,"g"));s.start(when,off);s.stop(when+len+.02);v.srcs.push(s);v.gains.push(g);v.grains.push(when);}}
    sS.start(t);if(two){const d=lagOf(bS,bT)/ctx.sampleRate;sT.start(t+Math.max(0,-d),Math.max(0,d));try{sS.stop(tTail+.05);}catch(e){}}ends(v,main);return v;};
  /* a key: the strike and/or its backwards notes; returns the voices it made */
  E.noteOn=(n,vel,clock)=>{const P=E.P;if(P.piano==='off'||SAMP.state!=='ready')return [];const t=ctx.currentTime+.005,{i:li,frac}=layerOf(vel),amp=(.62+.38*frac)*1.15,made=[];
    const rv=P.rev,back=rv.on&&rv.kind==='back';
    if(!back){const v=E.strike(n,vel,t);if(v)made.push(v);}
    if(rv.on){const rb=keyBuf(ctx,n,li,true);if(rb){const bpm=(clock||M2.clock).bpm||120,beat=60/bpm,
        T=rv.sync?beat*BEATS[Math.round(rv.time*(BEATS.length-1))][1]:freeT(rv.time),sw=Math.min(swellOf(rv.swell),rb.duration-.02),lv=amp*rv.mix*1.3;
      const one=(when,a,pan)=>made.push(play(rb,when,rb.duration-sw,a,-sw*.45,revBus,pan,n,'r'));
      if(back)one(t+(rv.sync?T:Math.min(T,.05)),amp*(.4+rv.mix*.9),panOf(n));          /* BACK: the backwards note is the note (TIME only when synced) */
      else if(rv.kind==='pnobk')one(t+T,lv,panOf(n));
      else{let a=lv;for(let k=1;k<=8&&a>.015;k++){one(t+T*k,a,k%2?-.55:.55);a*=rv.rep*.95;}}}}   /* ECHO: left, right, left… */
    return made;};
  /* every voice of a key let go (the strike always; the backwards ones only when RINGS ON is off) */
  E.noteOff=(n)=>{const t=ctx.currentTime,P=E.P,rel=relOf(P.release);for(const v of E.voices)if(v.n===n&&!v.released&&(!v.rev||!P.rev.rings))E.release(v,t,v.rev?Math.max(rel,.25):rel);};
  E.allOff=()=>{for(const v of [...E.voices])E.kill(v,.02);};
  /* PANIC: notes, echoes and the hall stopped; settings back after the tails are gone */
  E.panic=()=>{E.allOff();const t=ctx.currentTime;for(const g of [fbL,fbR,D,V,shimG,delIn,vIn,plIn,plOut]){hold(g.gain,t);g.gain.setTargetAtTime(0,t,.02);}
    if(E.P)E.P.verb.freeze=false;if(cdl){cdl.freeze(false);cdl.set({decay:.3});}clearTimeout(E._pT);E._pT=setTimeout(()=>E.apply(),1800);};
  /* asleep: unhooked from the output (Chrome then runs nothing behind it); FX IN keeps a small meter to wake it */
  E.vis=G(1);   /* what the sky listens to: fed only while awake, so its analyser keeps nothing running when asleep */
  E.wake=()=>{if(E.awake)return;E.awake=true;lim.connect(outG);lim.connect(meter);lim.connect(E.vis);};
  E.sleep=()=>{if(!E.awake)return;E.awake=false;try{lim.disconnect();}catch(e){}};
  E.level=()=>{if(!E.awake)return 0;meter.getFloatTimeDomainData(mbuf);let s=0;for(const v of mbuf)s+=v*v;return Math.sqrt(s/mbuf.length);};
  E.inLevel=()=>{inMon.getFloatTimeDomainData(ibuf);let p=0;for(const v of ibuf){const a=Math.abs(v);if(a>p)p=a;}return p;};
  E.fxIn=fxIn;E.frozen=()=>!!(E.P&&E.P.verb.freeze&&E.P.verb.on);
  E.dispose=()=>{E.allOff();if(shim)shim.stop();if(cdl)cdl.dispose();setTimeout(()=>{for(const n of [padIn,padRev,out,lim,tailBus,tWarm,strikeBus,sDamp,sBright,sLevel,piano,damp,...Object.values(HS),...Object.values(HT),fxIn,fDel,fRev,revBus,rDamp,delIn,dl,dr,D,vIn,V,shimG,plIn,plPre,plOut,...(plNow?[plNow.g,plNow.cv]:[]),...pans.values()])try{n.disconnect();}catch(e){}},300);};
  return E;}

/* ---- presets: the sound, never the PIANO switch (a stage choice) ---- */
/* the PAD's part: HALO's sound (P), its level, how much goes into the hall, which keys play it, its octave, the drone */
const TAPE0={on:false,wobble:.3,sat:.3,hiss:.1},CHAN0={low:0,body:.5,pres:.5,air:.5,glue:.25,blend:.5,width:.667,mono:false,out:.833};   /* TAPE and the CHANNEL as they start */
const PLATE0={on:false,mix:.35,decay:.5,pre:.15,low:.66,high:.67,duck:0};   /* the PLATE as it starts: 1.3 s, 18 ms, 600 Hz … 10 kHz */
const PAD0=()=>({on:false,P:HALO?{...HALO.DEFAULTS,ch:[...HALO.DEFAULTS.ch],lv:{}}:{},pname:"Warm blanket",level:.5,rev:.25,low:0,duck:0,range:"all",oct:0,drone:{root:0,fifth:0,oct:0,sub:0},dlevel:.6,key:0});
const padOf=(name,o)=>{const p=PAD0(),src=HALO&&HALO.PRESETS[name]||{};const {drone,key,...rest}=src;Object.assign(p.P,rest,{ch:[...(rest.ch||p.P.ch)],lv:{...(rest.lv||{})}});p.pname=name;p.on=true;return Object.assign(p,o||{});};
const PV=(o)=>deep(JSON.parse(JSON.stringify({level:.75,damp:.6,release:.25,shape:{...SHAPE0},pad:PAD0(),tape:{...TAPE0},chan:{...CHAN0},plate:{...PLATE0},
  tube:{on:false,drive:.3,warmth:.5,level:.5},rev:{on:false,kind:'pnobk',time:.35,swell:.45,rep:.45,mix:.5,sync:false,rings:true},
  del:{on:false,time:.45,rep:.3,tone:.5,mix:.25,sync:true,div:"1/8d",duck:0},verb:{on:true,mix:.4,size:.6,shim:0,bloom:0,freeze:false,pre:.12,low:.35,duck:0}})),JSON.parse(JSON.stringify(o||{})));   /* every preset filled out from these */
const deep=(a,b)=>{for(const k in b)if(b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k]))a[k]=deep(a[k]||{},b[k]);else a[k]=b[k];return a;};
const PRESETS={
  'Dry piano':PV({damp:.95,release:.22,verb:{on:false,mix:.4,size:.6,shim:0,bloom:0,freeze:false}}),   /* the first: what a new HORIZON opens with */
  'Sharp & warm':PV({damp:.9,release:.3,shape:{...SHAPE0,punch:.7,bright:.62,len:.45,hammer:.85,soft:.7,warmth:.38,darken:.25,sustain:.45,tubeS:1,delS:.6,revS:.3,tubeT:.7,delT:.2,revT:1},verb:{on:true,mix:.35,size:.6,shim:0,bloom:0,freeze:false}}),
  'Endless felt':PV({damp:.35,release:.45,shape:{...SHAPE0,punch:.45,len:.6,soft:.8,warmth:.3,darken:.15,sustain:1,sparkle:.2},tube:{on:true,drive:.2,warmth:.7,level:.55},verb:{on:true,mix:.5,size:.8,shim:.2,bloom:.2,freeze:false},pad:padOf("Warm blanket",{level:.35,rev:.3})}),
  /* Steve's idea: the tube and the echoes on the hammer's strike, the hall on the ringing tail */
  'Echo hammer':PV({damp:.85,release:.3,shape:{...SHAPE0,punch:.68,bright:.6,hammer:.6,soft:.4,warmth:.2,sustain:.3,tubeS:1,delS:1,revS:.15,tubeT:.15,delT:.08,revT:1},
    tube:{on:true,drive:.4,warmth:.55,level:.5},del:{on:true,time:.45,rep:.38,tone:.45,mix:.32,sync:true,div:'1/8d'},verb:{on:true,mix:.5,size:.75,shim:.1,bloom:.1,freeze:false}}),
  'Meditate':PV({damp:.85,rev:{on:true,kind:'pnobk',time:.42,swell:.5,rep:.45,mix:.55,sync:false,rings:true},verb:{on:true,mix:.45,size:.65,shim:.12,bloom:.05,freeze:false}}),
  'Felt':PV({damp:.18,release:.32,tube:{on:true,drive:.25,warmth:.75,level:.55},verb:{on:true,mix:.35,size:.5,shim:0,bloom:0,freeze:false}}),
  'Sunday hall':PV({damp:.65,verb:{on:true,mix:.5,size:.78,shim:0,bloom:.12,freeze:false}}),
  'Shimmer prayer':PV({damp:.5,release:.35,rev:{on:true,kind:'pnobk',time:.5,swell:.6,rep:.45,mix:.4,sync:false,rings:true},
    del:{on:true,time:.45,rep:.35,tone:.4,mix:.18,sync:true,div:'1/8d'},verb:{on:true,mix:.65,size:.9,shim:.55,bloom:.3,freeze:false},shape:{...SHAPE0,sparkle:.35},pad:padOf("Glass cathedral",{level:.45,rev:.35})}),
  'Backwards dream':PV({damp:.6,rev:{on:true,kind:'back',time:.1,swell:.55,rep:.45,mix:.8,sync:false,rings:true},verb:{on:true,mix:.6,size:.85,shim:.3,bloom:.2,freeze:false}}),
  'Reverse echoes':PV({damp:.7,rev:{on:true,kind:'echo',time:.5,swell:.4,rep:.55,mix:.55,sync:true,rings:true},verb:{on:true,mix:.5,size:.7,shim:.1,bloom:0,freeze:false}}),
  'Warm tape':PV({damp:.4,tube:{on:true,drive:.55,warmth:.6,level:.5},del:{on:true,time:.45,rep:.4,tone:.3,mix:.22,sync:true,div:'1/4'},verb:{on:true,mix:.3,size:.45,shim:0,bloom:0,freeze:false}}),
  'Plain grand':PV({damp:.9,release:.2,verb:{on:true,mix:.2,size:.4,shim:0,bloom:0,freeze:false}}),
  /* for prayer and the moments between songs: the piano soft and far, a choir pad on the left hand, a drone of root and fifth in C */
  "Prayer drone":PV({damp:.55,release:.4,shape:{...SHAPE0,sparkle:.25,sustain:.4},verb:{on:true,mix:.6,size:.85,shim:.3,bloom:.25,freeze:false},
    pad:padOf("Monastery",{level:.45,rev:.3,range:"left",drone:{root:1,fifth:1,oct:0,sub:0},key:0})}),
  "Pad and piano":PV({damp:.8,release:.3,verb:{on:true,mix:.45,size:.7,shim:.15,bloom:.1,freeze:false},pad:padOf("Cinematic strings",{level:.45,rev:.2})})};


/* ---- the face: laid out 1400 × 788 (16:9, as a laptop's screen). The sky fills all of it; along the bottom a bar of clear glass (HORIZON,
   the PEDAL and KEYS IN lights, the preset, PIANO / FX ONLY / OFF, the drawers, MASTER); a drawer's strips (or STAGE: all twelve) rise on
   a pane of clear glass over the sky (the drawer's button again closes it); KEYS, PANIC and FULL SCREEN at the top right. FULL SCREEN puts
   the face over the whole screen (Esc leaves) while the desk plays on behind; every word on the glass is bright, with a dark shadow. ---- */
/* the CONSOLE: every module a channel strip built the same way (its name, ON, its modes, three knob places, its main level on a fader),
   in the order the sound flows, coloured by family; STAGE shows all twelve side by side, a drawer shows its strips and, beside them, a
   MORE panel on the same rows with the settings that are not needed while playing */
const FH=788,STRIP_H=408,BAR_H=62;
const FAM={pno:['PIANO','#FF7A3C'],pad:['PAD','#C29BFF'],fx:['EFFECTS','#7AB8FF'],out:['OUT','#D8D8E8']};
/* a strip: family, name, its ON switch, its modes (buttons), or a ‹ name › line, three knobs, its fader */
const STRIPS={
  piano:{fam:'pno',title:'PIANO',modes:[['p.on','ON'],['p.fx','FX'],['p.off','OFF']],knobs:['damp','release','shape.sparkle'],fader:'level'},
  strike:{fam:'pno',title:'STRIKE',modes:[['sk.soft','SOFT'],['sk.hard','HARD']],knobs:['shape.bright','shape.hammer','shape.len'],fader:'shape.punch'},
  tail:{fam:'pno',title:'TAIL',modes:[['tl.nat','NATURAL'],['tl.end','ENDLESS']],knobs:['shape.warmth','shape.sustain','shape.soft'],fader:'shape.tail'},
  pad:{fam:'pad',title:'PAD',sw:'pad',name:'pp',knobs:['pad.P.swell','pad.P.tone','pad.duck'],fader:'pad.level'},
  drone:{fam:'pad',title:'DRONE',name:'dk',toggles:[['dr.root','ROOT'],['dr.fifth','FIFTH'],['dr.oct','OCTAVE'],['dr.sub','SUB']],fader:'pad.dlevel'},
  plate:{fam:'out',title:'PLATE',sw:'plate',knobs:['plate.decay','plate.pre','plate.low'],fader:'plate.mix'},
  reverse:{fam:'pno',title:'REVERSE',sw:'rev',modes:[['rev.back','BACK'],['rev.pnobk','P+B'],['rev.echo','ECHO']],knobs:['rev.time','rev.swell','rev.rep'],fader:'rev.mix'},
  tube:{fam:'fx',title:'TUBE',sw:'tube',knobs:['tube.drive','tube.warmth'],fader:'tube.level'},
  tape:{fam:'fx',title:'TAPE',sw:'tape',knobs:['tape.wobble','tape.sat','tape.hiss']},
  delay:{fam:'fx',title:'DELAY',sw:'del',modes:[['del.1/4','1/4'],['del.1/8d','1/8·'],['del.1/8','1/8']],knobs:['del.time','del.rep','del.duck'],fader:'del.mix'},
  reverb:{fam:'fx',title:'REVERB',sw:'verb',modes:[['s:freeze','FREEZE']],knobs:['verb.size','verb.shim','verb.duck'],fader:'verb.mix'},
  chan:{fam:'out',title:'CHANNEL',modes:[['chan.mono','MONO']],knobs:['chan.glue','chan.low','chan.width'],fader:'chan.out'}};
const ORDER=['piano','strike','tail','reverse','pad','drone','tube','tape','delay','reverb','plate','chan'],SW=104,GAP=6;   /* twelve strips of SW, GAP apart, fit the 1400 with the glass around them */
/* the MORE panels: a title; up to two lines of buttons (at the strips' modes); up to three rows of knobs (on the strips' knob rows); and
   at the faders' row either the note's picture or more lines of buttons */
const CHB=()=>HALO?Object.keys(HALO.CHARS).map(c=>['pc.'+c,HALO.CHARS[c].label]):[];
const DETAILS={
  shaper:{strips:['piano','strike','tail'],title:'SHAPER · MORE',rows:[['STRIKE INTO',['shape.tubeS','shape.delS','shape.revS']],['TAIL INTO',['shape.tubeT','shape.delT','shape.revT']],['TAIL',['shape.darken']]],bottom:'pic'},
  pad:{strips:['pad','drone'],title:'PAD · MORE',top:[['CHARACTER',CHB()],['MOTION',HALO?HALO.MOTIONS.map(x=>['pm.'+x,x.toUpperCase()]):[]]],
    rows:[['SOUND',['pad.P.width','pad.P.amt','pad.P.speed','pad.P.space']],['',['pad.P.tex','pad.P.sub','pad.P.air','pad.P.spark']],['MIX',['pad.rev','pad.low']]],
    bottom:[['VOICING',HALO?HALO.VO.map(x=>['pv.'+x,HALO.VO_NAME[x]]):[]],['PLAYED BY',[['pr.all','ALL KEYS'],['pr.left','LEFT HAND'],['po.-1','OCT −'],['po.0','OCT 0'],['po.1','OCT +']]]]},
  reverse:{strips:['reverse'],title:'REVERSE · MORE',top:[['TIME',[['rev.sync','IN BEATS OF THE TEMPO']]],['NOTES',[['rev.rings','RING ON AFTER THE KEY']]]]},
  effects:{strips:['tube','tape','delay','reverb'],title:'EFFECTS · MORE',top:[['DELAY',[['del.sync','IN BEATS OF THE TEMPO']]]],rows:[['DELAY',['del.tone']],['REVERB',['verb.bloom','verb.pre','verb.low']]]},
  chan:{strips:['plate','chan'],title:'CHANNEL · MORE',rows:[['TONE',['chan.body','chan.pres','chan.air']],['GLUE',['chan.blend']],['PLATE',['plate.high','plate.duck']]]}};
const KNAME={level:'PIANO LEVEL',damp:'DAMP',release:'RELEASE','tube.drive':'TUBE DRIVE','tube.warmth':'TUBE WARMTH','tube.level':'TUBE LEVEL','rev.time':'REVERSE TIME','rev.swell':'REVERSE SWELL',
  'rev.rep':'REVERSE REPEATS','rev.mix':'REVERSE MIX','del.time':'DELAY TIME','del.rep':'DELAY REPEATS','del.tone':'DELAY TONE','del.mix':'DELAY MIX','del.duck':'DELAY DUCK','verb.mix':'REVERB MIX',
  'verb.size':'REVERB SIZE','verb.shim':'SHIMMER','verb.bloom':'BLOOM','verb.pre':'PRE-DELAY','verb.low':'REVERB LOW CUT','verb.duck':'REVERB DUCK',
  'shape.punch':'PUNCH','shape.bright':'BRIGHT','shape.len':'STRIKE LENGTH','shape.hammer':'HAMMER','shape.tail':'TAIL LEVEL','shape.soft':'SOFT TAIL','shape.warmth':'WARMTH',
  'shape.darken':'DARKEN','shape.sustain':'SUSTAIN','shape.sparkle':'SPARKLE','shape.tubeS':'STRIKE → TUBE','shape.delS':'STRIKE → DELAY','shape.revS':'STRIKE → REVERB',
  'shape.tubeT':'TAIL → TUBE','shape.delT':'TAIL → DELAY','shape.revT':'TAIL → REVERB','pad.level':'PAD LEVEL','pad.P.swell':'PAD SWELL','pad.P.tone':'PAD TONE','pad.P.width':'PAD WIDTH',
  'pad.P.amt':'PAD MOTION','pad.P.speed':'PAD SPEED','pad.P.space':'PAD SPACE','pad.P.tex':'PAD TEXTURE','pad.P.sub':'PAD SUB','pad.P.air':'PAD AIR','pad.P.spark':'PAD SPARKLE',
  'pad.rev':'PAD INTO HALL','pad.low':'PAD LOW CUT','pad.duck':'PAD DUCK','tape.wobble':'TAPE WOBBLE','tape.sat':'TAPE SATURATION','tape.hiss':'TAPE HISS',
  'chan.glue':'GLUE','chan.blend':'GLUE BLEND','chan.low':'LOW CUT','chan.body':'BODY','chan.pres':'PRESENCE','chan.air':'AIR','chan.width':'WIDTH','chan.out':'MASTER','pad.dlevel':'DRONE LEVEL','plate.mix':'PLATE MIX','plate.decay':'PLATE DECAY','plate.pre':'PLATE PRE-DELAY',
  'plate.low':'PLATE LOW CUT','plate.high':'PLATE HIGH CUT','plate.duck':'PLATE DUCK'};
const LABEL={level:'LEVEL','shape.punch':'PUNCH','shape.len':'LENGTH','shape.tail':'LEVEL','shape.tubeS':'TUBE','shape.delS':'DELAY','shape.revS':'REVERB','shape.tubeT':'TUBE',
  'shape.delT':'DELAY','shape.revT':'REVERB','pad.level':'LEVEL','pad.P.swell':'SWELL','pad.P.tone':'TONE','pad.P.width':'WIDTH','pad.P.amt':'MOTION','pad.P.speed':'SPEED',
  'pad.P.space':'SPACE','pad.P.tex':'TEXTURE','pad.P.sub':'SUB','pad.P.air':'AIR','pad.P.spark':'SPARKLE','pad.rev':'INTO HALL','pad.low':'LOW CUT','pad.duck':'DUCK',
  'rev.time':'TIME','rev.swell':'SWELL','rev.rep':'REPEATS','rev.mix':'MIX','tube.drive':'DRIVE','tube.warmth':'WARMTH','tube.level':'LEVEL','tape.wobble':'WOBBLE','tape.sat':'SATURATE',
  'tape.hiss':'HISS','del.time':'TIME','del.rep':'REPEATS','del.tone':'TONE','del.mix':'MIX','del.duck':'DUCK','verb.mix':'MIX','verb.size':'SIZE','verb.shim':'SHIMMER','verb.bloom':'BLOOM',
  'verb.pre':'PRE-DELAY','verb.low':'LOW CUT','verb.duck':'DUCK','chan.glue':'GLUE','chan.blend':'BLEND','chan.low':'LOW CUT','chan.body':'BODY','chan.pres':'PRESENCE','chan.air':'AIR',
  'chan.width':'WIDTH','chan.out':'MASTER','pad.dlevel':'LEVEL','plate.mix':'MIX','plate.decay':'DECAY','plate.pre':'PRE-DELAY','plate.low':'LOW CUT','plate.high':'HIGH CUT','plate.duck':'DUCK'};
const DEFK={level:.75,damp:.6,release:.25,'tube.drive':.3,'tube.warmth':.5,'tube.level':.5,'rev.time':.35,'rev.swell':.45,'rev.rep':.45,'rev.mix':.5,
  'del.time':.45,'del.rep':.3,'del.tone':.5,'del.mix':.25,'del.duck':0,'verb.mix':.4,'verb.size':.6,'verb.shim':0,'verb.bloom':0,'verb.pre':.12,'verb.low':.35,'verb.duck':0,
  'pad.level':.5,'pad.rev':.25,'pad.low':0,'pad.duck':0,'pad.dlevel':.6};
for(const [k,v] of Object.entries(SHAPE0))DEFK['shape.'+k]=v;for(const [k,v] of Object.entries(PLATE0))DEFK['plate.'+k]=v;for(const [k,v] of Object.entries(TAPE0))DEFK['tape.'+k]=v;for(const [k,v] of Object.entries(CHAN0))DEFK['chan.'+k]=v;
if(HALO)for(const k of ['swell','tone','width','amt','speed','space','tex','sub','air','spark'])DEFK['pad.P.'+k]=HALO.DEFAULTS[k];
const TIP={'shape.punch':'how loud the hammer\'s strike is','shape.bright':'the strike\'s own tone','shape.len':'how long counts as the strike before the tail takes over',
  'shape.hammer':'a harder hit: the strike from a harder-played recording, louder and brighter','shape.tail':'how loud the ringing tail is',
  'shape.soft':'the tail from a softer-played recording: rounder, warmer','shape.warmth':'a filter on the tail only','shape.darken':'the tail grows darker as it rings',
  'shape.sustain':'how slowly the tail dies away; at the top, ENDLESS: it rings while the key is held','shape.sparkle':'tiny glints an octave or two up over the ring (the stars)',
  damp:'felt … clear',release:'how fast a let-go note stops','pad.level':'how loud the pad is','pad.P.swell':'how slowly the pad swells in and fades away',
  'pad.P.tone':'darker … brighter','pad.P.width':'narrow … wide','pad.P.amt':'how deep the MOTION moves','pad.P.speed':'how slow one cycle of the MOTION is',
  'pad.P.space':'the pad\'s own hall','pad.P.tex':'breath and grit','pad.P.sub':'a soft octave below','pad.P.air':'breathy air on top','pad.P.spark':'a glint two octaves up',
  'pad.rev':'how much of the pad also goes into the REVERB','pad.low':'takes the pad\'s lowest notes away, so it leaves room for the piano and the bass',
  'pad.duck':'the pad dips a little each time you play and swells back as the piano rings','del.duck':'the echoes step back while you play and come up in the gaps',
  'verb.duck':'the hall steps back while you play and blooms in the gaps','verb.pre':'a short wait before the hall starts, so each note lands clean',
  'verb.low':'takes the low notes out of the hall only, so a big room stays airy','tape.wobble':'the slow, gentle pitch wobble of an old tape',
  'tape.sat':'tape\'s soft saturation','tape.hiss':'a little tape hiss','chan.glue':'a gentle compressor on everything together: the glue',
  'chan.blend':'how much of the glued sound is mixed in beside the natural one (parallel)','chan.low':'takes the lowest notes of everything away (they fight the bass guitar)',
  'chan.body':'the warm low middle','chan.pres':'the middle that cuts through a band','chan.air':'the sparkle on top','chan.width':'how wide left and right are (MONO: the same in both)',
  'chan.out':'the level of everything HORIZON sends out','pad.dlevel':'how loud the drone is, apart from the pad played by the keys',
  'plate.mix':'how much plate is heard: a clean, quick plate reverb, as Abbey Road\'s, that stays clear on big speakers',
  'plate.decay':'how long the plate rings','plate.pre':'a short wait before the plate starts, so each note lands clean',
  'plate.low':'takes the lows out of the plate only (Abbey Road\'s trick: about 600 Hz), so it never muddies',
  'plate.high':'takes the very top out of the plate (about 10 kHz), so it stays smooth','plate.duck':'the plate steps back while you play and comes up in the gaps'};
const CK={KeyA:0,KeyW:1,KeyS:2,KeyE:3,KeyD:4,KeyF:5,KeyT:6,KeyG:7,KeyY:8,KeyH:9,KeyU:10,KeyJ:11,KeyK:12,KeyO:13,KeyL:14,KeyP:15,Semicolon:16,Quote:17},CK_BASE=60;

const CSS=`
.hz{position:absolute;left:0;top:0;width:${DW}px;height:${FH}px;transform:scale(${K});transform-origin:0 0;font-family:Bahnschrift,"Segoe UI",Arial,sans-serif;color:#F4F6FF;user-select:none;border-radius:26px;overflow:hidden;background:#05080F}
.hz.full{transform:none!important;width:100vw!important;height:100vh!important;border-radius:0!important}
.hz::backdrop{background:#000}
.hz canvas.sky{position:absolute;left:0;top:0;width:100%;height:100%;display:block}
.hz .ui{position:absolute;left:50%;bottom:0;width:${DW}px;height:${FH}px;transform:translateX(-50%);transform-origin:50% 100%;pointer-events:none}
.hz .ui>*{pointer-events:auto}
/* clear glass; every word on it bright, with a soft dark shadow, so it reads over the brightest aurora */
.hz .glass{background:rgba(6,8,20,.38);border:1px solid rgba(255,255,255,.15);border-radius:18px;box-shadow:0 12px 44px rgba(0,0,0,.38),inset 0 1px 0 rgba(255,255,255,.14);text-shadow:0 1px 2px rgba(0,0,0,.9),0 0 7px rgba(0,0,0,.7)}
.hz .bar{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);height:${BAR_H}px;display:flex;align-items:center;gap:7px;padding:0 16px 0 22px;white-space:nowrap;box-sizing:border-box}
.hz .word{font-weight:300;font-size:20px;letter-spacing:8px;background:linear-gradient(90deg,#FFB27A,#FF7AA8 45%,#B9A2FF);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:none;filter:drop-shadow(0 1px 2px rgba(0,0,0,.9))}
.hz .dots{display:flex;flex-direction:column;gap:3px;margin-left:2px}
.hz .dot{display:flex;align-items:center;gap:6px;font-size:9px;letter-spacing:1.5px;color:#E6EAF8}.hz .dot i{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.2)}
.hz .dot i.on{background:#FF9A50;box-shadow:0 0 10px #FF7A3C}.hz .dot i.dim{background:#A8785A}
.hz .sep{width:1px;height:32px;background:rgba(255,255,255,.14);margin:0 3px}
.hz .pre{display:flex;align-items:center;gap:2px}
.hz .pre i{font-style:normal;font-size:20px;color:#FFE2D0;cursor:pointer;padding:4px 8px;border-radius:8px}.hz .pre i:hover{background:rgba(255,255,255,.1)}
.hz .lcd{width:220px;display:flex;flex-direction:column;align-items:center;line-height:1.25;pointer-events:none}
.hz .lcd b{font-weight:600;font-size:13.5px;letter-spacing:2.4px;color:#FFFFFF;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.hz .lcd span{font-size:10px;letter-spacing:1.5px;color:#FFD2BC;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.hz .save{font-size:11px;letter-spacing:2px;padding:7px 10px;border-radius:9px;color:#FFFFFF;cursor:pointer}.hz .save:hover{background:rgba(255,255,255,.1)}
.hz .pill{display:flex;background:rgba(0,0,0,.3);border-radius:11px;padding:2px}
.hz .pill span{font-size:11px;letter-spacing:1.5px;padding:7px 9px;border-radius:9px;color:#EEF2FF;cursor:pointer}.hz .pill span.on{background:rgba(255,122,60,.32);color:#FFFFFF;box-shadow:inset 0 0 0 1px rgba(255,122,60,.65)}
.hz .mod{position:relative;font-size:11.5px;letter-spacing:1.6px;padding:8px 9px;border-radius:10px;color:#EEF2FF;cursor:pointer}
.hz .mod::after{content:'';position:absolute;left:50%;bottom:3px;width:14px;height:2px;margin-left:-7px;border-radius:2px;background:var(--c);opacity:.85}
.hz .mod:hover{background:rgba(255,255,255,.08)}
.hz .mod.on{color:#fff;background:color-mix(in srgb,var(--c) 24%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 60%,transparent),0 0 18px color-mix(in srgb,var(--c) 30%,transparent)}
.hz .corner{position:absolute;right:16px;top:14px;display:flex;gap:3px;padding:4px;border-radius:14px}
.hz .cb{font-size:11px;letter-spacing:1.5px;padding:7px 11px;border-radius:10px;color:#EEF2FF;cursor:pointer}.hz .cb:hover{background:rgba(255,255,255,.1)}
.hz .cb.on{background:rgba(255,122,60,.32);box-shadow:inset 0 0 0 1px rgba(255,122,60,.65)}
.hz .cb.panic{color:#FFC8BC}.hz .cb.panic:hover{background:rgba(160,40,30,.5)}
.hz .mod.down,.hz .cb.down,.hz .save.down,.hz .pill span.down,.hz .pre i.down{transform:translateY(1px);filter:brightness(.8)}
/* the pane of glass a drawer's strips (or STAGE) rise on */
.hz .pane{position:absolute;left:50%;bottom:${BAR_H+26}px;transform:translate(-50%,0);padding:12px;display:flex;flex-direction:column;align-items:center;transition:opacity .25s,transform .25s}
.hz .pane.none{opacity:0;transform:translate(-50%,20px);pointer-events:none}
.hz .fams{display:grid;grid-template-columns:repeat(${ORDER.length},${SW}px);column-gap:${GAP}px;height:24px;width:100%;justify-content:center}
.hz .fam{font-size:10.5px;letter-spacing:3px;font-weight:600;color:color-mix(in srgb,var(--c) 75%,#fff);border-bottom:2px solid var(--c);padding:0 0 4px 4px;margin:0 2px 6px;align-self:end}
.hz .rowc{display:flex;gap:${GAP}px;justify-content:center}
/* a strip, and a MORE panel, on the same rows: name 22, switch 24, modes 50, three knob rows of 64, the fader 104 */
.hz .strip,.hz .more{box-sizing:border-box;height:${STRIP_H}px;border-radius:12px;background:rgba(0,0,0,.28);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);padding:8px 3px;display:grid;
  grid-template-rows:22px 24px 50px 64px 64px 64px 104px;justify-items:center;align-items:start;flex:0 0 auto}
.hz .strip{width:${SW}px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08),inset 0 2px 0 color-mix(in srgb,var(--c) 75%,transparent)}
.hz .strip h3,.hz .more h3{margin:0;font-weight:600;font-size:12px;letter-spacing:2.6px;color:color-mix(in srgb,var(--c) 75%,#fff);align-self:center;white-space:nowrap}
.hz .strip .modes{display:grid;gap:3px;width:100%;padding:3px 3px 0;box-sizing:border-box;align-self:start}
.hz .chip{font-size:9.5px;letter-spacing:.6px;font-weight:600;padding:5px 0;border-radius:6px;background:rgba(0,0,0,.32);border:1px solid rgba(255,255,255,.14);color:#EEF2FF;text-align:center;cursor:pointer;white-space:nowrap;overflow:hidden}
.hz .chip:hover{border-color:rgba(255,255,255,.38)}.hz .chip.lit{border-color:var(--c);color:#FFFFFF;background:color-mix(in srgb,var(--c) 32%,rgba(0,0,0,.3))}
.hz .chip.down{transform:translateY(1px);filter:brightness(.8)}
.hz .strip .chip{letter-spacing:0;font-size:8.5px}
.hz .nmrow{display:grid;grid-template-columns:18px 1fr 18px;gap:3px;width:100%;padding:3px 3px 0;box-sizing:border-box}
.hz .nmrow .chip.nm{font-size:8.5px;letter-spacing:.3px;white-space:normal;line-height:1.15;padding:3px 1px;display:flex;align-items:center;justify-content:center;min-height:30px}
.hz .nmrow .chip:not(.nm){display:flex;align-items:center;justify-content:center}
.hz .tg{display:grid;grid-template-columns:1fr 1fr;gap:5px;width:100%;padding:8px 3px 0;box-sizing:border-box;align-self:start}
.hz .tg .chip{padding:9px 0;font-size:9.5px}
.hz .sw{display:flex;align-items:center;gap:6px;font-size:10px;font-weight:600;letter-spacing:2px;color:#EEF2FF;padding:3px 9px;border-radius:12px;border:1px solid rgba(255,255,255,.22);background:rgba(0,0,0,.3);cursor:pointer;height:20px;box-sizing:border-box}
.hz .sw i{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.25)}.hz .sw.on{border-color:var(--c);color:#fff}.hz .sw.on i{background:var(--c);box-shadow:0 0 8px var(--c)}
/* knobs: a ring showing the value in the family's colour */
.hz .kn{width:76px;display:flex;flex-direction:column;align-items:center;gap:1px;cursor:ns-resize}   /* knob 35 + name 11 + value 11 fits its row of 64 */
.hz .kn .cap{--v:.5;width:35px;height:35px;border-radius:50%;position:relative;background:conic-gradient(from 225deg,var(--c,#FF7A3C) calc(var(--v)*270deg),rgba(255,255,255,.16) 0 270deg,transparent 0)}
.hz .kn .cap::before{content:"";position:absolute;inset:4px;border-radius:50%;background:radial-gradient(circle at 45% 35%,#4A4E66,#141620 70%);box-shadow:0 2px 4px rgba(0,0,0,.6)}
.hz .kn .cap i{position:absolute;left:50%;top:6px;width:3px;height:10px;margin-left:-1.5px;border-radius:2px;background:#FFF2E8;transform-origin:50% 11.5px;z-index:1;pointer-events:none}
.hz .kn b,.hz .kn em,.hz .fd b,.hz .fd em{pointer-events:none}.hz .kn b,.hz .fd b{font-weight:600;font-size:9.5px;letter-spacing:1px;color:#EEF2FF;white-space:nowrap;line-height:11px;height:11px}
.hz .kn em,.hz .fd em{font-style:normal;font-size:9.5px;color:color-mix(in srgb,var(--c,#FF9A60) 70%,#fff);font-family:Consolas,"Lucida Console",monospace;line-height:11px;height:11px;white-space:nowrap}
.hz .kn:hover .cap::before{filter:brightness(1.25)}.hz .kn.off,.hz .fd.off{opacity:.42}
/* MASTER in the bar: the knob, its name and value beside it */
.hz .bar .kn.tk{--c:#FF7A3C;width:auto;display:grid;grid-template-columns:35px auto;column-gap:7px;row-gap:1px;align-items:center;justify-items:start}
.hz .bar .kn.tk .cap{grid-row:1 / 3}
/* faders: the strip's main level */
.hz .fd{display:flex;flex-direction:column;align-items:center;gap:2px;cursor:ns-resize}
.hz .fd .track{--v:.5;position:relative;width:34px;height:76px;border-radius:7px;background:rgba(0,0,0,.42);border:1px solid rgba(255,255,255,.1);box-sizing:border-box}
.hz .fd .track::before{content:"";position:absolute;left:50%;top:7px;bottom:7px;width:4px;margin-left:-2px;border-radius:2px;background:linear-gradient(to top,var(--c) calc(var(--v)*100%),rgba(255,255,255,.12) 0)}
.hz .fd .track i{position:absolute;left:3px;right:3px;height:14px;border-radius:4px;background:linear-gradient(#F4F4FA,#A9A9B8);bottom:calc(var(--v)*46px + 7px);box-shadow:0 2px 5px rgba(0,0,0,.6);pointer-events:none}
.hz .fd .track i::after{content:"";position:absolute;left:3px;right:3px;top:6px;height:2px;background:var(--c)}
/* the MORE panel: the same rows, with labelled lines of buttons and rows of knobs */
.hz .more{justify-items:stretch;padding:8px 12px;--c:#B8C0E0;min-width:300px}
.hz .more .ln{display:flex;align-items:center;gap:4px;flex-wrap:nowrap;overflow:hidden}
.hz .more .ln>i,.hz .more .kr>i{font-style:normal;font-size:9.5px;font-weight:600;letter-spacing:1.5px;color:#DDE2F4;width:76px;flex:0 0 auto}
.hz .more .ln .chip{padding:4px 7px;font-size:9.5px}
.hz .more .two{display:flex;flex-direction:column;gap:4px;justify-content:center}
.hz .more .kr{display:flex;align-items:start;gap:0}.hz .more .kr>i{padding-top:13px}
.hz .more .pic{position:relative;width:236px;height:103px;border-radius:9px;overflow:hidden;border:1px solid rgba(255,255,255,.12);justify-self:start}
.hz .more .pic canvas{width:100%;height:100%;display:block}
`;
function style(){if(document.getElementById('hz-css'))return;const s=document.createElement('style');s.id='hz-css';s.textContent=CSS;document.head.appendChild(s);}

let engineP=null;
const cdlEngine=()=>engineP||(engineP=window.CrazyDreamLite?Promise.resolve(window.CrazyDreamLite):new Promise((ok,no)=>{const s=document.createElement('script');s.src=M2.fileUrl('crazy-dream-lite.js');
  s.onload=()=>ok(window.CrazyDreamLite);s.onerror=()=>{engineP=null;no(new Error('crazy-dream-lite.js is missing'));};document.head.appendChild(s);}));
const lib=src=>new Promise((res,rej)=>{if(document.querySelector(`script[data-lib="${src}"]`))return res();const s=document.createElement('script');s.src=M2.fileUrl(src);s.dataset.lib=src;
  s.onload=()=>res();s.onerror=()=>rej(new Error(src+' is missing'));document.head.appendChild(s);});

/* ---- THE SKY: HORIZON's own picture program on the graphics card (WebGL2; it replaced MilkDrop; sketched in Skins\horizon-sky.html).
   Steve's picture (Skins\horizon-mountains.jpg, mountains over a lake under the Milky Way; it comes in horizon-mountains.js with the
   skyline traced across it, so it works from file:// too) with a live aurora drawn into its sky, behind the mountains, mirrored in its
   lake, its light on the rock and snow; the picture's own stars twinkle and its campfire flickers. Two kinds of aurora: sharp curtains
   (their rays leaning and bending, their hems winding, patches brightening and dimming, green with purple in places and purple-red tops)
   and behind them the cloud kind (soft patches over whole parts of the sky). SURGES sweep across (with loud notes, and now and then by
   themselves); CLOUD SWEEPS light the cloud kind. One thing drives it all: how loud HORIZON plays (E.level and the pad), so it costs the
   same whatever is switched on. Without the picture: a plain night with the same aurora. ---- */
let photoP=null;
const photoLib=()=>photoP||(photoP=(async()=>{if(!window.HZ_IMG)await lib('mixtape2/Skins/horizon-mountains.js');const im=new Image();await new Promise((ok,no)=>{im.onload=ok;im.onerror=()=>no(new Error('the picture did not load'));im.src=window.HZ_IMG;});   /* (not decode(): out of sight it can wait for ever) */
  return {im,sky:window.HZ_SKY,refl:window.HZ_REFL,y0:window.HZ_MIRROR,fire:window.HZ_FIRE};})().catch(e=>{photoP=null;throw e;}));
const SKY_TAB=new Uint8Array(256);{let s=20261119;for(let i=0;i<256;i++){s=(Math.imul(s,1664525)+1013904223)>>>0;SKY_TAB[i]=s>>>24;}}   /* the random numbers the noise is made of */
const SKY_FS=`#version 300 es
precision highp float;
uniform vec2 uRes;uniform float uT,uAsp,uH,uAur,uLev,uPulse,uPh,uPhoto,uY0;uniform vec3 uAA,uAB,uAC,uAP;uniform vec4 uSw[4];
uniform sampler2D uTab,uImg,uSky;uniform vec2 uImgSize,uFit,uFire;
out vec4 o;
float h1(float i){return texelFetch(uTab,ivec2(int(mod(i,256.)),0),0).r;}
float n1(float x){float i=floor(x),f=x-i;f=f*f*(3.-2.*f);return mix(h1(i),h1(i+1.),f);}
float h2(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+1.),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*n2(p);p=p*2.03+vec2(17.1,9.2);a*=.5;}return s;}
float luma(vec3 c){return dot(c,vec3(.3,.59,.11));}
/* the cloud aurora: noise bent by noise, drifting; patches pulsing; lit by the sweeps (swD) */
vec3 cloudAur(vec2 q,float swD){float e=q.y-uH;float band=smoothstep(.1,.32,e)*smoothstep(1.1,.5,e);if(band<.001)return vec3(0.);
  vec2 p=q*vec2(1.5,2.4);vec2 w=vec2(fbm(p+vec2(uT*.025,0.)),fbm(p+vec2(5.2,1.3)-vec2(0.,uT*.02)));
  float n=fbm(p*1.25+w*1.9+vec2(uT*.035,uT*.012)),shape=smoothstep(.42,.82,n);
  float pp=n2(vec2(q.x*2.2+uT*.04,uT*.3+q.y*1.5));
  float I=shape*band*(uAur*.22+uLev*.4+uPulse*.2+swD*2.4)*(.35+1.1*pp*pp);
  vec3 c=mix(uAA*vec3(.75,1.,.9),uAP,smoothstep(.35,.8,n2(q*1.4+vec2(uT*.02,3.))));c=mix(c,uAC,smoothstep(.45,.95,e)*.6);
  return c*I*.8;}
/* the curtains: three, each a winding hem with rays rising from it; q in screen heights (x 0…uAsp, y 0 at the bottom) */
vec3 aurora(vec2 q){vec3 acc=vec3(0.);
  float sw=0.,swD=0.;for(int i=0;i<4;i++){float d=(q.x-uSw[i].x)/uSw[i].z,d2=d/2.2;float a=uSw[i].y*exp(-d*d);if(uSw[i].w<.5)sw+=a;swD+=uSw[i].y*exp(-d2*d2);}
  for(int k=0;k<3;k++){float fk=float(k);
    float wx=q.x+.16*(n1(q.x*1.6+uT*.07+fk*3.)-.5)+.07*(n1(q.x*4.1-uT*.13+fk*7.)-.5);   /* folds */
    float yb=uH+.2+.085*fk+.2*(n1(wx*1.05+fk*5.3+uT*.03)-.5)+.06*(n1(wx*3.3-uT*.09+fk)-.5)+.08*pow(n1(wx*.6+fk*9.-uT*.02),3.)+.02*uPulse*sin(q.x*7.-uPh*2.4+fk*1.7);
    float d=q.y-yb;if(d<-.07)continue;
    /* rays lean toward a point high above the middle (as rays seen in perspective do), more or less as the ribbon twists, and bend */
    float lean=-(q.x-.5*uAsp)*.38+.5*(n1(wx*1.3+uT*.05+fk*4.)-.5),bend=1.2*(n1(wx*.9-uT*.04+fk*6.)-.5);
    float sl=wx+d*lean+d*d*bend;
    float run=uPh*(.9+.3*fk)+2.5*n1(sl*.6+uT*.05+fk*11.);
    float rays=n1(sl*(20.+fk*8.)+run);rays=.06+1.9*pow(rays,3.2);rays*=.55+.9*pow(n1(sl*64.-run*2.2+fk*9.),1.5);
    float env=smoothstep(.2,.78,n1(wx*.85+fk*2.7+uT*.022+40.));
    float pat=n2(vec2(wx*4.5+fk*13.,uT*.45+fk*3.));env*=.35+1.3*pat*pat;
    float fl=sw*(.8+.4*pat);
    float H=(.17+.1*fk+.14*env)*(.7+.55*uLev+.35*fl),up=exp(-max(d,0.)/H),hem=smoothstep(-.06,0.,d),edge=1.+(1.3+uPulse+fl)*exp(-max(d,0.)/.014);
    float I=rays*(env*.85+.12)*up*hem*edge*(uAur+uLev*.9+uPulse*.35+fl*1.5);
    float purp=smoothstep(.5,.85,n2(vec2(wx*1.2+fk*4.,uT*.035+fk)));
    vec3 c=mix(uAA,uAP,purp*.75);c=mix(c,mix(uAB,uAP,purp*.5),smoothstep(0.,.55,d/H));c=mix(c,uAC,smoothstep(.4,1.4,d/H));
    c=mix(c,uAP*1.25,exp(-max(d,0.)/.01)*clamp(uPulse*.5+fl*.9+uLev*.25,0.,.85));
    acc+=c*I*(.6-.13*fk);}
  acc+=cloudAur(q,swD);
  return (1.-exp(-acc*1.9))*1.15+mix(uAA,uAP,.35)*swD*.04;}
/* without the picture: a plain night, stars, the aurora, dark ground */
vec3 night(vec2 q){float e=q.y-uH,g=clamp(e/(1.-uH),0.,1.);vec3 col=mix(vec3(.05,.2,.19),vec3(.02,.07,.08),smoothstep(0.,.2,g));col=mix(col,vec3(.008,.035,.05),smoothstep(.1,.55,g));col=mix(col,vec3(.004,.01,.025),smoothstep(.45,1.,g));
  vec2 p=q*90.,c=floor(p);float h=h2(c);if(h>.93){float d=length(fract(p)-.5-(vec2(h2(c+3.),h2(c+7.))-.5)*.6)/90.*uRes.y;col+=vec3(.85,.9,1.)*exp(-d*d)*(.3+.7*h2(c+2.))*(.6+.4*sin(uT*(1.+3.*h2(c+5.))+h*40.));}
  if(e<0.)return vec3(.008,.01,.014)+aurora(vec2(q.x,2.*uH-q.y))*.12;
  return col+aurora(q);}
/* the picture: where the sky ends in each column (uSky), in the picture's pixels (y down); 1 = sky */
float skyY(float x){float i=clamp(floor(x),0.,uImgSize.x-2.),f=clamp(x-i,0.,1.);return mix(texelFetch(uSky,ivec2(int(i),0),0).r,texelFetch(uSky,ivec2(int(i)+1,0),0).r,f);}
float reflY(float x){float i=clamp(floor(x),0.,uImgSize.x-2.),f=clamp(x-i,0.,1.);return mix(texelFetch(uSky,ivec2(int(i),1),0).r,texelFetch(uSky,ivec2(int(i)+1,1),0).r,f);}
float skyMask(vec2 p){return smoothstep(-1.2,1.2,skyY(p.x)-p.y-.5);}
vec3 photo(vec2 uv){vec2 p=vec2(.5+(uv.x-.5)*uFit.x,.5-(uv.y-.5)*uFit.y)*uImgSize,t=p/uImgSize;
  vec3 c=texture(uImg,t).rgb;float sm=skyMask(p);
  /* its stars twinkle: a star is brighter than all four of its neighbours (an edge of the sky is not) */
  vec2 o2=2./uImgSize;vec3 mx=max(max(texture(uImg,t+vec2(o2.x,0.)).rgb,texture(uImg,t-vec2(o2.x,0.)).rgb),max(texture(uImg,t+vec2(0.,o2.y)).rgb,texture(uImg,t-vec2(0.,o2.y)).rgb));
  vec3 st=max(c-mx,0.)*1.6;float ch=h2(floor(p*.5));float tw=.6+.4*sin(uT*(1.2+3.5*ch)+ch*60.+uPh*ch*3.);
  c+=st*sm*((tw-1.)*.9+uLev*.35*tw);
  vec3 col=c;
  if(sm>.001)col+=aurora(vec2(uv.x*uAsp,uv.y))*sm;
  col+=mix(uAA,uAP,.25)*luma(c)*(1.-sm)*smoothstep(1.,5.,p.y-skyY(p.x))*(uAur*.3+uLev*.7)*step(p.y,uY0);   /* its light on the rock and snow */
  /* the lake: the picture's reflections are stretched and lower than a true mirror's, so the aurora is mapped onto them: where the
     reflected mountains end in each column (row 1 of uSky) is where the skyline is, and down the water the sky goes up (a little
     faster: the reflections are stretched by about 1.17); as bright as water reflects (Fresnel): near-mirror at the far shore, looking
     across, about 90%, half as the water comes near */
  if(p.y>uY0+3.){float w=(n2(vec2(p.x*.05,p.y*.35-uT*.6))-.5)*2.5*(1.+(p.y-uY0)*.012),x=p.x+w,below=p.y-reflY(x),rs=smoothstep(-1.5,1.5,below);
    if(rs>.001){float ys=skyY(x)-below*.85,my=.5-(ys/uImgSize.y-.5)/uFit.y;col+=aurora(vec2(uv.x*uAsp,my))*rs*mix(.9,.5,clamp((p.y-uY0)/(uImgSize.y-uY0),0.,1.));}}
  float fl=.62+.38*n1(uT*7.3)+.18*n1(uT*19.+5.);vec2 f2=vec2(uFire.x,2.*uY0-uFire.y),a=p-uFire,b=p-f2;   /* the campfire */
  col+=vec3(1.,.5,.18)*(exp(-dot(a,a)/30.)+.25*exp(-dot(a,a)/900.)+.6*exp(-dot(b,b)/50.))*(fl-.8)*.9;
  return col;}
void main(){vec2 uv=gl_FragCoord.xy/uRes;vec3 col=uPhoto>.5?photo(uv):night(vec2(uv.x*uAsp,uv.y));
  col*=1.-.22*pow(length((uv-.5)*vec2(1.,1.2)),2.2);
  col+=(h2(gl_FragCoord.xy+fract(uT*7.))-.5)/255.;o=vec4(col,1.);}`;
function skyGL(cv){const gl=cv.getContext('webgl2',{antialias:false,alpha:false,depth:false,preserveDrawingBuffer:false,powerPreference:'low-power'});if(!gl)throw new Error('no WebGL2');
  const sh=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
  const pg=gl.createProgram();gl.attachShader(pg,sh(gl.VERTEX_SHADER,'#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'));gl.attachShader(pg,sh(gl.FRAGMENT_SHADER,SKY_FS));gl.linkProgram(pg);
  if(!gl.getProgramParameter(pg,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(pg));gl.useProgram(pg);
  const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);const pl=gl.getAttribLocation(pg,'p');gl.enableVertexAttribArray(pl);gl.vertexAttribPointer(pl,2,gl.FLOAT,false,0,0);
  const tex=(unit,fn)=>{const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);fn();gl.activeTexture(gl.TEXTURE0);return t;};
  const nearest=()=>{gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);};
  tex(0,()=>{gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.texImage2D(gl.TEXTURE_2D,0,gl.R8,256,1,0,gl.RED,gl.UNSIGNED_BYTE,SKY_TAB);nearest();});
  const U={};for(const n of ['uRes','uT','uAsp','uH','uAur','uLev','uPulse','uPh','uPhoto','uY0','uAA','uAB','uAC','uAP','uSw','uTab','uImg','uSky','uImgSize','uFit','uFire'])U[n]=gl.getUniformLocation(pg,n);
  gl.uniform1i(U.uTab,0);gl.uniform1i(U.uImg,1);gl.uniform1i(U.uSky,2);
  gl.uniform3f(U.uAA,.2,1,.55);gl.uniform3f(U.uAB,.08,.8,.72);gl.uniform3f(U.uAC,.55,.22,.85);gl.uniform3f(U.uAP,.78,.28,1);gl.uniform1f(U.uAur,.385);
  let P=null;
  return {photo(ph){tex(1,()=>{gl.pixelStorei(gl.UNPACK_ALIGNMENT,4);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,ph.im);
        for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,v);});
      const n=ph.sky.length,rows=new Float32Array(n*2);rows.set(ph.sky);for(let i=0;i<n;i++)rows[n+i]=ph.refl&&ph.refl[i]!=null?ph.refl[i]:2*ph.y0-ph.sky[i];   /* row 0 the skyline, row 1 the lake's reflected one (else a true mirror) */
      tex(2,()=>{gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.texImage2D(gl.TEXTURE_2D,0,gl.R32F,n,2,0,gl.RED,gl.FLOAT,rows);nearest();});
      P={w:ph.im.width,h:ph.im.height,y0:ph.y0,fire:ph.fire};},
    /* st: t (the drift's clock), ph (the rays' run), lev, pulse, sw (four surges: x, strength, width, cloud) */
    draw(st){const W=cv.width,H=cv.height,asp=W/H;gl.viewport(0,0,W,H);gl.uniform2f(U.uRes,W,H);gl.uniform1f(U.uT,st.t);gl.uniform1f(U.uAsp,asp);gl.uniform1f(U.uPh,st.ph);
      gl.uniform1f(U.uLev,st.lev);gl.uniform1f(U.uPulse,st.pulse);gl.uniform4fv(U.uSw,st.sw);gl.uniform1f(U.uPhoto,P?1:0);gl.uniform1f(U.uH,P?.29:.2);
      if(P){const s=Math.max(W/P.w,H/P.h);gl.uniform2f(U.uImgSize,P.w,P.h);gl.uniform2f(U.uFit,W/(P.w*s),H/(P.h*s));gl.uniform2f(U.uFire,P.fire[0],P.fire[1]);gl.uniform1f(U.uY0,P.y0);}   /* the picture covers the sky, cut evenly */
      gl.drawArrays(gl.TRIANGLES,0,3);},
    finish(){const b=new Uint8Array(4);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,b);},lost:   /* (reading a pixel back waits for the card) */()=>gl.isContextLost(),
    dispose(){const x=gl.getExtension('WEBGL_lose_context');if(x)x.loseContext();}};}
M2.horizon={Engine,PRESETS,PV,SAMP,loadSamples,cdlEngine,skyGL,photoLib};

const DEF={id:'horizon',name:'HORIZON piano synth',short:'HORIZON',type:'instrument',version:'1.0',format:1,w:W,h:Math.round(FH*K),scale:2,
  size:()=>({w:W,h:Math.round(FH*K)}),
  blurb:'Atmospheric piano under a live aurora (full screen for the stage), with shaper, reverse, pad, tube, tape, delay, a shimmering hall and a plate',
  sockets:[{id:'keys',kind:'control',dir:'in',label:'Keys in',side:'left',at:.3,tag:'notes'},{id:'notes',kind:'control',dir:'out',label:'Notes out',side:'left',at:.42,tag:'notes'},
    {id:'fx',kind:'sound',dir:'in',label:'FX in',side:'top',at:.1,auto:false},{id:'out',kind:'sound',dir:'out',label:'Output',side:'right',at:.2,normal:true}],
  settings:{v:null,piano:'on',preset:0,edited:false,view:'simple',open:''},
  preview(){style();const d=document.createElement('div');   /* the picture, a touch of aurora over it */
    d.style.cssText=`position:relative;width:180px;height:101px;border-radius:12px;overflow:hidden;background:radial-gradient(ellipse 60% 40% at 45% 32%,rgba(60,255,150,.35),transparent),url("${M2.fileUrl('mixtape2/Skins/horizon-mountains.jpg')}") center/cover,#05080F`;
    d.innerHTML='<b style="position:absolute;left:10px;top:8px;font:300 13px Bahnschrift,Arial;letter-spacing:5px;color:#FFF0E4;text-shadow:0 1px 3px #000">HORIZON</b>';return d;},
  create(host){style();const S=host.settings,ctx=host.engine.ctx,clock=host.clock||M2.clock,uid=host.uid;
    const outG=ctx.createGain(),E=Engine(ctx,outG);
    /* the PAD: HALO's engine, its sound into E.padIn; played by the same keys (all of them, or the left hand: below middle C), an octave
       up or down; its drone's notes sound on their own; the sky's aurora is its sound, in its characters' colours */
    const padE=HALO?HALO.Engine(ctx,E.padIn):null,padHeld=new Map(),drones=new Map(),NMK=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];let wanderT=0;
    /* the drone's notes go through their own level (LEVEL on the DRONE strip: 0 dB at 0.6, up to +7.5 dB) into the pad's sound */
    const droneG=ctx.createGain(),dlvOf=v=>v<.01?0:Math.pow(v/.6,1.7);if(padE)droneG.connect(padE.bus);   /* (set by padApply) */
    if(!S.v)S.v=PV(PRESETS[Object.keys(PRESETS)[0]]);else S.v=fixV(deep(PV({}),S.v));
    if(!['simple','stage'].includes(S.view))S.view='simple';if(!DETAILS[S.open])S.open='';
    const P=()=>{E.P=Object.assign(S.v,{piano:S.piano});return S.v;};P();
    let dead=false,flashT=0,sleepT=0,quietSince=0,offMidi=null,pedal=false,comp=false,koct=0,kvel=100,litT=0,raf=0,frameN=0,skyR=null,skyErr='',photoOK=false;
    const sus=new Set(),down=new Set(),typed=new Set();
    const plugged=s=>M2.patch.at(host.uid,s).length>0;

    /* ---- the face ---- */
    const m=document.createElement('div');m.className='hz';host.el.appendChild(m);
    const tipOf=k=>KNAME[k]+(TIP[k]?': '+TIP[k]:'');
    const knob=(k,cls)=>`<div class="kn${cls?' '+cls:''}" data-k="${k}" title="${tipOf(k)}"><div class="cap" data-k="${k}"><i></i></div><b>${LABEL[k]||KNAME[k]}</b><em></em></div>`;
    const fader=k=>`<div class="fd" data-k="${k}" title="${tipOf(k)}"><div class="track" data-k="${k}"><i></i></div><b>${LABEL[k]||KNAME[k]}</b><em></em></div>`;
    const chip=([b,l])=>b.startsWith('s:')?`<span class="chip" data-s="${b.slice(2)}">${l}</span>`:`<span class="chip${/\.name$/.test(b)?' nm':''}" data-b="${b}">${l}</span>`;
    /* a strip: the same rows for every module, empty where it has nothing */
    function stripHTML(id){const s=STRIPS[id],ks=s.knobs||[];
      const modes=s.modes?`<div class="modes" style="grid-template-columns:repeat(${s.modes.length},1fr)">${s.modes.map(chip).join('')}</div>`:
        s.name?`<div class="nmrow">${chip([s.name+'.prev','‹'])}${chip([s.name+'.name',''])}${chip([s.name+'.next','›'])}</div>`:'<span></span>';
      const slots=s.toggles?[`<div class="tg">${s.toggles.map(chip).join('')}</div>`,'<span></span>','<span></span>']:[0,1,2].map(i=>ks[i]?knob(ks[i]):'<span></span>');
      return `<div class="strip" data-st="${id}" style="--c:${FAM[s.fam][1]}"><h3>${s.title}</h3>${s.sw?`<span class="sw" data-s="${s.sw}"><i></i>ON</span>`:'<span></span>'}
        ${modes}${slots.join('')}${s.fader?fader(s.fader):'<span></span>'}</div>`;}
    /* a MORE panel: its lines of buttons at the strips' modes, its knob rows on their knob rows, the picture or more buttons at the faders' */
    function moreHTML(id){const d=DETAILS[id],ln=([l,bs])=>`<div class="ln"><i>${l}</i>${bs.map(chip).join('')}</div>`,top=d.top||[],rows=d.rows||[];
      return `<div class="more" data-more="${id}"><h3 style="justify-self:start">${d.title}</h3><span></span>
        <div class="two">${top.map(ln).join('')}</div>${[0,1,2].map(i=>rows[i]?`<div class="kr"><i>${rows[i][0]}</i>${rows[i][1].map(k=>knob(k)).join('')}</div>`:'<span></span>').join('')}
        ${d.bottom==='pic'?'<div class="pic"><canvas width="660" height="288"></canvas></div>':d.bottom?`<div class="two">${d.bottom.map(ln).join('')}</div>`:'<span></span>'}</div>`;}
    m.innerHTML=`<canvas class="sky"></canvas>
      <div class="ui"><div class="corner glass"><span class="cb" data-b="keys" title="Play HORIZON from the computer keyboard: A S D F… white keys from middle C, W E T… black, Z X octave, C V softer / louder">⌨ KEYS</span><span class="cb panic" data-b="panic">PANIC</span><span class="cb" data-b="full" title="FULL SCREEN: HORIZON over the whole screen (Esc leaves)">⛶ FULL SCREEN</span></div>
        <div class="pane glass none"></div>
        <div class="bar glass"><span class="word">HORIZON</span><span class="dots"><span class="dot"><i data-l="pedal"></i>PEDAL</span><span class="dot"><i data-l="kin"></i>KEYS IN</span></span><span class="sep"></span>
          <span class="pre"><i data-b="prev">‹</i><span class="lcd"><b></b><span></span></span><i data-b="next">›</i></span><span class="save" data-b="save">SAVE</span><span class="sep"></span>
          <span class="pill"><span data-b="p.on">PIANO</span><span data-b="p.fx">FX ONLY</span><span data-b="p.off">OFF</span></span><span class="sep"></span>
          ${[['shaper','SHAPER','#FF7A3C'],['reverse','REVERSE','#FF7A3C'],['pad','PAD','#C29BFF'],['effects','EFFECTS','#7AB8FF'],['chan','CHANNEL','#D8D8E8'],['stage','STAGE','#FFE7A8']].map(([d,l,c])=>`<span class="mod" data-m="${d}" style="--c:${c}">${l}</span>`).join('')}
          <span class="sep"></span>${knob("chan.out","tk")}</div></div>`;
    const $=s=>m.querySelector(s),skyc=$('canvas.sky'),ui=$('.ui'),drw=$('.pane');
    /* the strips and MORE panels are made once and moved between the drawers and STAGE (their clicks are caught on the whole face) */
    const el1=h=>{const t=document.createElement('div');t.innerHTML=h;return t.firstElementChild;};
    const stEl={},moreEl={};for(const id of ORDER)stEl[id]=el1(stripHTML(id));for(const id of Object.keys(DETAILS))moreEl[id]=el1(moreHTML(id));
    const parts=()=>[m,...Object.values(stEl),...Object.values(moreEl)];
    const picEl=moreEl.shaper.querySelector('.pic'),tipEl=document.createElement('div');
    /* the pane: STAGE (every strip, under its families' names) or a drawer (its strips and its MORE panel); closed, it fades away */
    function layout(){const st=S.view==='stage',open=st||!!S.open;
      if(open){drw.innerHTML='';
        if(st){const fams=document.createElement('div');fams.className='fams';let col=1;
          for(const [f,[l,c]] of Object.entries(FAM)){const n=ORDER.filter(id=>STRIPS[id].fam===f).length;fams.insertAdjacentHTML('beforeend',`<div class="fam" style="grid-column:${col} / span ${n};--c:${c}">${l}</div>`);col+=n;}
          drw.appendChild(fams);const row=document.createElement('div');row.className='rowc';for(const id of ORDER)row.appendChild(stEl[id]);drw.appendChild(row);}
        else{const d=DETAILS[S.open],row=document.createElement('div');row.className='rowc';for(const id of d.strips)row.appendChild(stEl[id]);row.appendChild(moreEl[S.open]);drw.appendChild(row);}}
      drw.classList.toggle('none',!open);
      m.querySelectorAll('.mod[data-m]').forEach(b=>b.classList.toggle('on',b.dataset.m==='stage'?st:!st&&S.open===b.dataset.m));
      fitUI();host.resized&&host.resized();paint();}
    /* FULL SCREEN: the face over the whole screen, the sky filling it, the glass grown to fit; Esc (or the button) leaves */
    /* host.fill (the stand-alone HORIZON, mixtape2\horizon.html): the face always fills the window, laid out as at full screen */
    const big=()=>full()||!!host.fill;
    function fitUI(){const f=big()?Math.min(innerWidth/DW,innerHeight/FH):1;ui.style.transform=`translateX(-50%) scale(${f.toFixed(4)})`;}
    function onFull(){m.classList.toggle('full',big());$('[data-b="full"]').textContent=full()?'⛶ LEAVE FULL SCREEN':'⛶ FULL SCREEN';fitUI();skySize();go();}
    function toggleFull(){if(full())document.exitFullscreen().catch(()=>{});else m.requestFullscreen().catch(e=>host.toast('HORIZON: full screen was refused ('+e.message+')'));}

    /* ---- the sky (THE SKY, above): drawn 30 times a second while HORIZON sounds, 8 while it rests (the aurora drifts on), not at all
       out of sight; its canvas three quarters of its size on the screen (the sky is soft) ---- */
    const SURGE=[];let simT=0,drift=0,ph=0,slow=0,pulse=0,nextSurge=0,nextCloud=0,lastDraw=0,sizeN=0;
    const full=()=>document.fullscreenElement===m;
    function skySize(){const r=skyc.getBoundingClientRect();if(!r.width)return;const w=Math.min(1600,Math.round(r.width*.75)),h=Math.max(1,Math.round(w*r.height/r.width));if(skyc.width!==w||skyc.height!==h){skyc.width=w;skyc.height=h;}}
    async function skyStart(){try{skySize();skyR=skyGL(skyc);}catch(e){skyErr=e.message;console.warn('HORIZON sky',e);return;}go();
      try{const p=await photoLib();if(dead||!skyR)return;skyR.photo(p);photoOK=true;go();}catch(e){skyErr='no picture: '+e.message;console.warn('HORIZON sky picture',e);}}
    /* a surge: a bright wave sweeping across the sky one way or the other, at its own speed and width; cloud: it lights only the cloud
       aurora, broader and slower */
    function surge(a,cloud){SURGE.push({t0:simT,dir:Math.random()<.5?-1:1,a,sp:(cloud?.45:.7)+Math.random()*.9,w:(cloud?.3:.18)+Math.random()*.3,cloud:cloud?1:0});if(SURGE.length>4)SURGE.shift();}
    function skyHit(vel){const v=vel/127;pulse=Math.min(1,pulse+.2+.5*v);if(v>.75&&Math.random()<.35)surge(.6+.4*Math.random());go();}
    function step(dt){simT+=dt;drift+=dt;
      const raw=E.level()+(padE&&padE.awake?padE.level():0),want=Math.min(1.2,Math.sqrt(raw)*2.2);   /* how loud, gently: quick to rise, slow to fall */
      slow+=(want-slow)*Math.min(1,dt*(want>slow?2.5:.8));pulse*=Math.exp(-dt*2.2);ph+=dt*(.25+1.3*slow);
      if(simT>nextSurge){if(nextSurge)surge(.3+.5*slow);nextSurge=simT+6+Math.random()*12;}   /* now and then by themselves */
      if(simT>nextCloud){if(nextCloud)surge(.45+.55*slow,1);nextCloud=simT+4+Math.random()*9;}
      for(let i=SURGE.length-1;i>=0;i--)if(simT-SURGE[i].t0>14)SURGE.splice(i,1);}
    function skyDraw(){if(!skyR)return;if(sizeN++%30===0)skySize();const asp=skyc.width/skyc.height,sw=new Float32Array(16);
      SURGE.forEach((s,i)=>{const a=simT-s.t0;sw[i*4]=s.dir>0?-.4+a*s.sp:asp+.4-a*s.sp;sw[i*4+1]=s.a*Math.min(1,a/(s.cloud?.8:.3))*Math.exp(-a*(s.cloud?.25:.35));sw[i*4+2]=s.w;sw[i*4+3]=s.cloud;});
      try{skyR.draw({t:drift,ph,lev:slow,pulse,sw});}catch(e){console.warn('HORIZON sky',e);skyErr=e.message;skyR=null;}}
    function frame(now){raf=0;if(dead)return;const t=now/1000,fps=E.awake||(padE&&padE.awake)?30:8;
      if(!lastDraw||t-lastDraw>=1/fps-.004){step(Math.min(.15,lastDraw?t-lastDraw:1/30));lastDraw=t;skyDraw();frameN++;}
      if(skyR&&(full()||host.visible!==false))raf=requestAnimationFrame(frame);else lastDraw=0;}
    function go(){if(!raf&&!dead)raf=requestAnimationFrame(frame);}

    /* ---- the controls' state onto the face ---- */
    const names=()=>[...Object.keys(PRESETS),...(M2.settings.vesperMine||[]).map(x=>x.name)];
    const get=k=>k.split('.').reduce((o,p)=>o==null?o:o[p],S.v);
    const put=(k,v)=>{const ps=k.split('.'),last=ps.pop();ps.reduce((o,p)=>o[p],S.v)[last]=v;};
    /* ---- the PAD's workings ---- */
    const padPrime=()=>{if(padE&&(S.v.pad.on||Object.values(S.v.pad.drone).some(Boolean)))for(const ch of S.v.pad.P.ch)HALO.tables(ctx,ch);};   /* its octave tables, made between frames */
    function padApply(){if(!padE)return;const pd=S.v.pad;pd.P.vol=pd.level;padE.P=pd.P;padE.apply(clock);padPrime();droneG.gain.setTargetAtTime(dlvOf(pd.dlevel),ctx.currentTime,.05);}
    function padOn(n,vel){const pd=S.v.pad;if(!padE||!pd.on||pd.range==='left'&&n>=60)return;const old=padHeld.get(n);if(old)old.release(ctx.currentTime);
      padHeld.set(n,padE.noteOn(clamp(n+12*pd.oct,12,120),vel));wanderLoop();}
    function padOff(n){const v=padHeld.get(n);if(v){v.release(ctx.currentTime);padHeld.delete(n);}}
    function droneSync(restart){if(!padE)return;const pd=S.v.pad,OFF={root:0,fifth:7,oct:12,sub:-12},want=new Map();for(const d in OFF)if(pd.drone[d])want.set(48+pd.key+OFF[d],d);
      for(const [n,v] of [...drones])if(restart||!want.has(n)){v.release(ctx.currentTime);drones.delete(n);}
      if(want.size){awake();padPrime();}
      for(const n of want.keys())if(!drones.has(n)){const v=padE.noteOn(n,92,true);try{v.vca.disconnect();v.vca.connect(droneG);}catch(e){}drones.set(n,v);}   /* through the DRONE's own LEVEL */
      wanderLoop();}
    function wanderLoop(){clearTimeout(wanderT);if(dead||!padE||S.v.pad.P.motion!=='wander'||!padE.awake)return;padE.wander();wanderT=setTimeout(wanderLoop,(1+S.v.pad.P.speed*30)*1000/3);}
    const morph=()=>{if(padE)padE.voices.forEach(v=>v.morph());};
    function padButton(b){const pd=S.v.pad,P0=pd.P,[g,x]=[b.slice(0,2),b.slice(3)];let msg='';
      if(g==='pp'){const L=Object.keys(HALO.PRESETS);let i=L.indexOf(pd.pname);i=(i+(x==='prev'?-1:1)+L.length)%L.length;const keep=padOf(L[i]);pd.P=keep.P;pd.pname=L[i];morph();msg=L[i].toUpperCase();}
      else if(g==='pc'){let l=P0.ch.filter(c=>c!==x);if(l.length===P0.ch.length){l=[...P0.ch,x];if(l.length>3)l=l.slice(1);}else if(!l.length)return flash('PAD','ALWAYS ONE CHARACTER');P0.ch=l;morph();msg=l.map(c=>HALO.CHARS[c].label).join(' + ');}
      else if(g==='pm'){P0.motion=x;msg='MOTION: '+x.toUpperCase();}else if(g==='pv'){P0.voicing=x;msg='VOICING: '+HALO.VO_NAME[x];}
      else if(g==='pr'){pd.range=x;msg=x==='left'?'PLAYED BY THE LEFT HAND (BELOW MIDDLE C)':'PLAYED BY ALL KEYS';}else if(g==='po'){pd.oct=+x;msg='PAD OCTAVE '+(pd.oct>0?'+':'')+pd.oct;}
      else if(g==='dk'){pd.key=(pd.key+(x==='prev'?11:1))%12;droneSync(true);msg='DRONE IN '+NMK[pd.key];}
      else if(g==='dr'){pd.drone[x]=pd.drone[x]?0:1;droneSync(false);msg='DRONE: '+(Object.keys(pd.drone).filter(d=>pd.drone[d]).map(d=>d.toUpperCase()).join(' + ')||'OFF');}
      S.edited=true;P();padApply();paint();host.changed('pad');flash(g==='pp'?'PAD SOUND':'PAD',msg);}
    const lines=(a,b)=>{$('.lcd b').textContent=a||'';$('.lcd span').textContent=b||'';};
    function show(){if(SAMP.state==='loading')return lines('TUNING THE PIANO',SAMP.msg);if(SAMP.state==='missing')return lines('NO PIANO','THE RECORDINGS ARE NOT IN INSTRUMENTS');
      const L=names(),n=L[S.preset]||'';lines(n.toUpperCase()+(S.edited?' *':''),({on:'PIANO ON',fx:'FX ONLY',off:'PIANO OFF'})[S.piano]+' · '+(S.preset+1)+' / '+L.length);}
    const flash=(a,b)=>{lines(a,b);clearTimeout(flashT);flashT=setTimeout(show,1500);};
    const sgn=d=>(d>=0?'+':'')+d.toFixed(1)+' dB';
    const fmt=k=>{const v=get(k);
      if(k==='release')return sec(relOf(v));if(k==='damp')return v<.35?'FELT':v>.75?'CLEAR':pct(v);
      if(k==='rev.time')return S.v.rev.sync?BEATS[Math.round(v*(BEATS.length-1))][0]:sec(freeT(v));if(k==='rev.swell')return sec(swellOf(v));
      if(k==='del.time')return S.v.del.sync?({'1/4':'1/4','1/8d':'1/8 ·','1/8':'1/8'})[S.v.del.div]:sec(delT(v));if(k==='verb.size')return decOf(v).toFixed(1)+' s';
      if(k==='shape.punch'||k==='shape.tail')return sgn(lvDb(v));if(k==='shape.bright')return sgn((v-.5)*24);if(k==='shape.len')return Math.round(lenOf(v)*1000)+' ms';
      if(k==='shape.warmth')return v<.02?'OPEN':warmCut(v)>=1000?(warmCut(v)/1000).toFixed(1)+' kHz':Math.round(warmCut(v))+' Hz';
      if(k==='shape.sustain')return v<.01?'NATURAL':v>=.97?'ENDLESS':pct(v);if(/shape\.(hammer|soft|darken|sparkle)/.test(k)&&v<.02)return 'OFF';
      if(k==='chan.out')return sgn(-30+36*v);if(k==='chan.low')return v<.02?'OFF':Math.round(30*Math.pow(12,v))+' Hz';if(/^chan\.(body|pres|air)$/.test(k))return sgn((v-.5)*18);
      if(k==='chan.width')return S.v.chan.mono?'MONO':Math.round(v*150)+'%';if(k==='verb.pre')return Math.round(v*200)+' ms';if(k==='verb.low')return Math.round(40*Math.pow(15,v))+' Hz';
      if(k==='pad.low')return v<.02?'OFF':Math.round(30*Math.pow(13,v))+' Hz';if(k==='pad.dlevel')return v<.01?'OFF':sgn(20*Math.log10(dlvOf(v)));
      if(k==='plate.decay')return plDec(v).toFixed(1)+' s';if(k==='plate.pre')return Math.round(v*120)+' ms';if(k==='plate.low')return Math.round(plLow(v))+' Hz';
      if(k==='plate.high')return (plHigh(v)/1000).toFixed(1)+' kHz';if(/duck$/.test(k)&&v<.02)return 'OFF';return pct(v);};
    function paint(){const all=parts(),q=s=>all.flatMap(r=>[...r.querySelectorAll(s)]);
      for(const d of q('.kn')){const k=d.dataset.k,v=clamp(+get(k)||0,0,1);d.querySelector('.cap').style.setProperty('--v',v);d.querySelector('i').style.transform=`rotate(${-135+270*v}deg)`;d.querySelector('em').textContent=fmt(k);}
      for(const d of q('.fd')){const k=d.dataset.k,v=clamp(+get(k)||0,0,1);d.querySelector('.track').style.setProperty('--v',v);d.querySelector('em').textContent=fmt(k);}
      /* a knob dims while what it feeds is switched off */
      const offOf={tube:!S.v.tube.on,del:!S.v.del.on,rev:!S.v.verb.on};
      for(const d of q('.kn')){const k=d.dataset.k,mm=/^shape\.(tube|del|rev)[ST]$/.exec(k);if(mm)d.classList.toggle('off',offOf[mm[1]]);}
      for(const id of ['pad','tube','tape','delay','reverb','reverse','plate'])stEl[id].querySelectorAll('.kn,.fd').forEach(d=>d.classList.toggle('off',!({pad:S.v.pad.on,tube:S.v.tube.on,tape:S.v.tape.on,delay:S.v.del.on,reverb:S.v.verb.on,reverse:S.v.rev.on,plate:S.v.plate.on})[id]));
      moreEl.chan.querySelectorAll('.kn[data-k^="plate."]').forEach(d=>d.classList.toggle('off',!S.v.plate.on));
      q('[data-b="sk.soft"]').forEach(x=>x.classList.toggle('lit',S.v.shape.hammer<.05));q('[data-b="sk.hard"]').forEach(x=>x.classList.toggle('lit',S.v.shape.hammer>=.05));
      q('[data-b="tl.nat"]').forEach(x=>x.classList.toggle('lit',S.v.shape.sustain<.97));q('[data-b="tl.end"]').forEach(x=>x.classList.toggle('lit',S.v.shape.sustain>=.97));
      q('[data-b="chan.mono"]').forEach(x=>x.classList.toggle('lit',!!S.v.chan.mono));
      for(const b of ['on','fx','off'])q(`[data-b="p.${b}"]`).forEach(x=>x.classList.toggle(x.classList.contains('chip')?'lit':'on',S.piano===b));
      const rv=S.v.rev,dv=S.v.del,vb=S.v.verb;
      for(const k of ['back','pnobk','echo'])q(`[data-b="rev.${k}"]`).forEach(x=>x.classList.toggle('lit',rv.kind===k));
      q('[data-b="rev.sync"]').forEach(x=>x.classList.toggle('lit',!!rv.sync));q('[data-b="rev.rings"]').forEach(x=>x.classList.toggle('lit',!!rv.rings));
      for(const k of ['1/4','1/8d','1/8'])q(`[data-b="del.${k}"]`).forEach(x=>x.classList.toggle('lit',!!dv.sync&&dv.div===k));q('[data-b="del.sync"]').forEach(x=>x.classList.toggle('lit',!!dv.sync));
      for(const [s,on] of [['tube',S.v.tube.on],['rev',rv.on],['del',dv.on],['verb',vb.on],['freeze',!!vb.freeze&&vb.on],['pad',S.v.pad.on],['tape',S.v.tape.on],['plate',S.v.plate.on]])q(`[data-s="${s}"]`).forEach(x=>x.classList.toggle(x.classList.contains('chip')?'lit':'on',on));
      /* the PAD's buttons */
      const pd=S.v.pad,PP=pd.P;q(`[data-b^="pc."]`).forEach(x=>x.classList.toggle('lit',PP.ch.includes(x.dataset.b.slice(3))));
      q(`[data-b^="pm."]`).forEach(x=>x.classList.toggle('lit',PP.motion===x.dataset.b.slice(3)));q(`[data-b^="pv."]`).forEach(x=>x.classList.toggle('lit',PP.voicing===x.dataset.b.slice(3)));
      q(`[data-b^="pr."]`).forEach(x=>x.classList.toggle('lit',pd.range===x.dataset.b.slice(3)));q(`[data-b^="po."]`).forEach(x=>x.classList.toggle('lit',pd.oct===+x.dataset.b.slice(3)));
      q(`[data-b^="dr."]`).forEach(x=>x.classList.toggle('lit',!!pd.drone[x.dataset.b.slice(3)]));
      q('[data-b="pp.name"]').forEach(x=>x.textContent=(pd.pname||'').toUpperCase());q('[data-b="dk.name"]').forEach(x=>x.textContent=NMK[pd.key]);
      q('[data-b="keys"]').forEach(x=>x.classList.toggle('on',comp));$('[data-l="pedal"]').classList.toggle('on',pedal);show();if(S.open==='shaper'&&S.view!=='stage')drawLab();}
    const kinLamp=()=>{const there=plugged('keys')||M2.midi.inputs.length>0;$('[data-l="kin"]').classList.toggle('dim',there);};
    const kinFlash=()=>{$('[data-l="kin"]').classList.add('on');clearTimeout(litT);litT=setTimeout(()=>$('[data-l="kin"]').classList.remove('on'),90);};

    /* ---- the SHAPER's picture: middle C as it sounds now, as SOUND LAB drew it ---- */
    const T0=.003,T1=6,rmsAt=envAt;let labHit=-1e9,labRaf=0;
    function drawLab(){const cv=picEl.firstChild,c=cv.getContext('2d'),w=cv.width,h=cv.height,X0=30,X1=w-18,Y0=40,Y1=h-40,mid=(Y0+Y1)/2,hh=(Y1-Y0)/2;
      const bg=c.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#14141C');bg.addColorStop(1,'#09090D');c.fillStyle=bg;c.fillRect(0,0,w,h);
      const xs=t=>X0+(X1-X0)*Math.log(t/T0)/Math.log(T1/T0),ya=a=>hh*clamp((20*Math.log10(Math.max(a,1e-7))+60)/60,0,1);
      c.strokeStyle='rgba(255,154,96,.12)';c.lineWidth=1.5;c.font='600 17px Bahnschrift, Arial';c.fillStyle='rgba(255,154,96,.55)';c.textAlign='center';
      for(const [t,l] of [[.01,'10 ms'],[.03,'30 ms'],[.1,'0.1 s'],[.3,'0.3 s'],[1,'1 s'],[3,'3 s']]){const x=xs(t);c.beginPath();c.moveTo(x,Y0);c.lineTo(x,Y1);c.stroke();c.fillText(l,x,h-12);}
      if(SAMP.state!=='ready'){c.fillStyle='#FF9A60';c.font='600 26px Bahnschrift, Arial';c.fillText(SAMP.msg||'TUNING…',w/2,mid+10);return;}
      const sh=S.v.shape,n=60,li=2,ls=Math.round(li+sh.hammer*(3-li)),lt=Math.round(li-sh.soft*li),b0=keyBuf(ctx,n,li,false);if(!b0)return;
      const bS=keyBuf(ctx,n,ls,false)||b0,bT=keyBuf(ctx,n,lt,false)||b0,m0=measOf(n,li),mS=measOf(n,ls),mT=measOf(n,lt);
      const aS=(m0&&mS?Math.pow(clamp(m0.s/mS.s,.2,5),1-.5*sh.hammer):1)*dB(4*sh.hammer),aT=m0&&mT?clamp(m0.t/mT.t,.2,5):1,lv=S.v.level*S.v.level*1.44;
      const L=lenOf(sh.len),Xf=Math.max(.012,L*.6),gP=dB(lvDb(sh.punch)),gTl=dB(lvDb(sh.tail)),endless=sh.sustain>=.97,sus=!endless&&sh.sustain>.01?Math.pow(Math.min(sh.sustain,.96),1.6)*.95:0;
      const N=260,pts=[];
      for(let k=0;k<N;k++){const t=T0*Math.pow(T1/T0,k/(N-1)),wd=Math.max(.0015,t*.12),sW=t<L?1:t<L+Xf?1-(t-L)/Xf:0;
        const nat=t<b0.duration?rmsAt(b0,t,wd):0,st=t<bS.duration?rmsAt(bS,t,wd)*aS*sW*gP:0;
        let tl=endless&&t>.85?rmsAt(bT,.85,.1)*aT*gTl:t<bT.duration?rmsAt(bT,t,wd)*aT*(1-sW)*gTl*(sus&&t>L+Xf?sustainLift(bT,L+Xf,t,sus):1):0;
        if(sh.warmth>.02)tl*=.55+.45*(1-sh.warmth);
        pts.push({x:xs(t),nat:ya(nat*lv),st:ya(st*lv),tl:ya(tl*lv)});}
      const fill=(key,f)=>{c.beginPath();c.moveTo(pts[0].x,mid-pts[0][key]);for(const p of pts)c.lineTo(p.x,mid-p[key]);for(let k=N-1;k>=0;k--)c.lineTo(pts[k].x,mid+pts[k][key]);c.closePath();c.fillStyle=f;c.fill();};
      const mx=(a,b,f)=>a.map((v,i)=>Math.round(v+(b[i]-v)*f)),tc=mx([255,140,90],[200,60,70],sh.warmth);
      const tg=c.createLinearGradient(xs(Math.max(T0,L)),0,X1,0);tg.addColorStop(0,`rgba(${tc},.9)`);tg.addColorStop(1,`rgba(${mx(tc,[50,20,40],sh.darken*.85)},.86)`);fill('tl',tg);
      const sb=clamp(sh.bright+sh.hammer*.25,0,1);c.save();c.shadowColor=`rgba(255,240,220,${(.3+sb*.6).toFixed(2)})`;c.shadowBlur=8+sb*30;fill('st',`rgba(${mx([255,214,170],[255,255,255],sb)},.96)`);c.restore();
      c.strokeStyle='rgba(255,255,255,.35)';c.setLineDash([6,6]);c.lineWidth=2;for(const s of [-1,1]){c.beginPath();pts.forEach((p,k)=>k?c.lineTo(p.x,mid+s*p.nat):c.moveTo(p.x,mid+s*p.nat));c.stroke();}c.setLineDash([]);
      const xb=xs(L+Xf/2);c.strokeStyle='rgba(255,230,210,.6)';c.lineWidth=2;c.beginPath();c.moveTo(xb,Y0-8);c.lineTo(xb,Y1);c.stroke();
      c.font='600 18px Bahnschrift, Arial';c.fillStyle='#FFF0E4';c.textAlign='right';c.fillText('STRIKE',xb-8,Y0+4);c.textAlign='left';c.fillStyle=`rgb(${tc})`;c.fillText('TAIL'+(endless?'  ∞ ENDLESS':''),xb+8,Y0+4);
      c.textAlign='right';c.fillStyle='rgba(255,255,255,.45)';c.font='15px Bahnschrift, Arial';c.fillText('- - - AS RECORDED',X1,Y0+4);
      const age=(performance.now()-labHit)/1000;if(age>0&&age<T1){const x=xs(Math.max(T0,age)),g=c.createLinearGradient(x-44,0,x,0);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(255,255,255,.4)');c.fillStyle=g;c.fillRect(x-44,Y0,44,Y1-Y0);}}
    function labRun(){labRaf=0;if(dead||S.open!=='shaper'||S.view==='stage')return;drawLab();if((performance.now()-labHit)/1000<T1&&host.visible!==false)labRaf=requestAnimationFrame(labRun);}

    /* ---- awake / asleep ---- */
    function watch(){clearTimeout(sleepT);if(dead)return;
      if(E.awake){const busy=E.voices.length||E.frozen()||E.level()>1e-4||E.inLevel()>1e-4||(padE&&(padE.voices.length||padE.level()>1e-4));if(busy)quietSince=0;else if(!quietSince)quietSince=performance.now();
        if(quietSince&&performance.now()-quietSince>5000){E.sleep();if(padE)padE.sleep();quietSince=0;host.engine.busy(host.uid,false);}}
      else if(plugged('fx')&&E.inLevel()>1e-4)awake();
      sleepT=setTimeout(watch,E.awake?400:plugged('fx')?150:1000);}
    const awake=()=>{const was=E.awake;E.wake();if(!was){quietSince=0;host.engine.busy(host.uid,true);}go();};

    /* ---- notes ---- */
    const send=x=>{host.send('notes',x);};
    function key(x){if(!x)return;
      if(x.t==='on'){awake();down.add(x.n);sus.delete(x.n);for(const v of E.voices)if(v.n===x.n&&!v.released&&!v.rev)E.release(v,ctx.currentTime,.08);   /* the string struck again */
        padOn(x.n,x.v||100);E.noteOn(x.n,x.v||100,clock);skyHit(x.v||100);labHit=performance.now();if(!labRaf&&S.open==='shaper')labRaf=requestAnimationFrame(labRun);
        send({t:'on',n:x.n,v:x.v||100});kinFlash();}
      else if(x.t==='off'){down.delete(x.n);if(pedal)sus.add(x.n);else{E.noteOff(x.n);padOff(x.n);}send({t:'off',n:x.n,v:0});}
      else if(x.t==='pedal'){pedal=!!x.on;if(!pedal){for(const n of sus)if(!down.has(n)){E.noteOff(n);padOff(n);}sus.clear();}$('[data-l="pedal"]').classList.toggle('on',pedal);send({t:'pedal',on:pedal});}
      else if(x.t==='bend'){send(x);if(padE){padE.bend=clamp(+x.v||0,-1,1);padE.voices.forEach(v=>{if(!v.released&&!v.drone)v.bendTo(padE.bend);});}}
      else if(x.t==='mod')send(x);}
    const midi=x=>{if(plugged('keys'))return;key(x.t==='cc'?(x.n===64?{t:'pedal',on:x.v>=.5}:x.n===1?{t:'mod',v:x.v}:null):x);};
    const allUp=()=>{for(const n of [...down])key({t:'off',n});if(pedal)key({t:'pedal',on:false});};
    function panic(){E.panic();for(const n of [...down,...sus])send({t:'off',n,v:0});send({t:'pedal',on:false});down.clear();sus.clear();pedal=false;
      if(padE){const t=ctx.currentTime;padE.voices.slice().forEach(v=>v.kill(t));}padHeld.clear();drones.clear();for(const d in S.v.pad.drone)S.v.pad.drone[d]=0;
      paint();flash('PANIC','ALL STOPPED · THE DRONE TOO');}

    /* ---- settings ---- */
    function set(k,v,quiet){put(k,v);S.edited=true;P();E.apply(clock);if(k.startsWith('pad.'))padApply();paint();if(!quiet)flash(KNAME[k]||k,fmt(k));host.changed('knob');go();}
    function usePreset(i){const L=names();i=(i+L.length)%L.length;const n=L[i],mine=(M2.settings.vesperMine||[]).find(x=>x.name===n);
      S.v=fixV(deep(PV({}),JSON.parse(JSON.stringify(mine?mine.v:PRESETS[n]))));S.v.verb.freeze=false;S.preset=i;S.edited=false;P();E.apply(clock);padApply();morph();droneSync(true);paint();host.changed('preset');flash(n.toUpperCase(),'PRESET '+(i+1)+' / '+L.length);}
    function save(){const mine=[...(M2.settings.vesperMine||[])];let i=1;while(mine.some(x=>x.name==='My piano '+i))i++;const name='My piano '+i,v=JSON.parse(JSON.stringify(S.v));delete v.piano;v.verb.freeze=false;
      mine.push({name,v});M2.prefs.set('vesperMine',mine);S.preset=names().indexOf(name);S.edited=false;host.changed('save');flash('SAVED',name.toUpperCase()+' · EVERY HORIZON');}
    function button(b){const rv=S.v.rev,dv=S.v.del,sh=S.v.shape;
      /* the strips' quick modes: STRIKE SOFT / HARD (HAMMER off / on), TAIL NATURAL / ENDLESS (SUSTAIN back to where it was / the top), MONO */
      if(b==='sk.soft'){if(sh.hammer>=.05)sh._ham=sh.hammer;return set('shape.hammer',0);}if(b==='sk.hard')return set('shape.hammer',sh.hammer>=.05?sh.hammer:(sh._ham||.8));
      if(b==='tl.end'){if(sh.sustain<.97)sh._sus=sh.sustain;return set('shape.sustain',1);}if(b==='tl.nat')return set('shape.sustain',sh.sustain>=.97?(sh._sus||0):sh.sustain);
      if(b==='chan.mono'){S.v.chan.mono=!S.v.chan.mono;S.edited=true;P();E.apply(clock);paint();host.changed('mono');return flash('CHANNEL',S.v.chan.mono?'MONO: AS A MONO CHURCH SYSTEM PLAYS IT':'STEREO');}
      if(/^(pp|pc|pm|pv|pr|po|dk|dr)\./.test(b))return padE?padButton(b):host.toast('HORIZON: the PAD needs HALO\'s file (Devices\\halo.js)');
      if(b==='p.on'||b==='p.fx'||b==='p.off'){S.piano=b.slice(2);P();if(S.piano==='off')E.allOff();E.apply(clock);paint();host.changed('piano');
        flash(({on:'PIANO ON',fx:'FX ONLY',off:'PIANO OFF'})[S.piano],({on:'THE PIANO AND ITS EFFECTS',fx:'ONLY THE EFFECTS: AROUND THE JUNO\'S PIANO',off:'NOTES PASS ON TO NOTES OUT'})[S.piano]);}
      else if(b==='prev'||b==='next')usePreset(S.preset+(b==='next'?1:-1));
      else if(b==='save')save();else if(b==='keys')compKeys(!comp);else if(b==='panic')panic();else if(b==='full')toggleFull();
      else if(b.startsWith('rev.')){const k=b.slice(4);if(k==='sync'||k==='rings')rv[k]=!rv[k];else{rv.kind=k;rv.on=true;}S.edited=true;P();E.apply(clock);paint();host.changed('reverse');
        flash('REVERSE',k==='sync'?(rv.sync?'TIME IN BEATS':'TIME FREE'):k==='rings'?(rv.rings?'RINGS ON AFTER THE KEY':'STOPS WITH THE KEY'):({back:'BACKWARDS ONLY',pnobk:'PIANO, THEN BACKWARDS',echo:'BACKWARDS ECHOES'})[k]);}
      else if(b.startsWith('del.')){const k=b.slice(4);if(k==='sync')dv.sync=!dv.sync;else{dv.div=k;dv.sync=true;dv.on=true;}S.edited=true;P();E.apply(clock);paint();host.changed('delay');flash('DELAY',fmt('del.time'));}}
    function stomp(s){const T={tube:S.v.tube,rev:S.v.rev,del:S.v.del,verb:S.v.verb,tape:S.v.tape,plate:S.v.plate};
      if(s==='freeze'){S.v.verb.freeze=!S.v.verb.freeze;if(S.v.verb.freeze){S.v.verb.on=true;awake();}flash('FREEZE',S.v.verb.freeze?'THE HALL HOLDS':'OFF');}
      else if(s==='pad'){const pd=S.v.pad;pd.on=!pd.on;if(!pd.on)for(const n of [...padHeld.keys()])padOff(n);padApply();flash('PAD',pd.on?'ON · '+pd.pname.toUpperCase():'OFF (THE DRONE STAYS)');}
      else{T[s].on=!T[s].on;flash(({tube:'TUBE',rev:'REVERSE',del:'DELAY',verb:'REVERB',tape:'TAPE',plate:'PLATE'})[s],T[s].on?(s==='plate'?'ON · CLEAN AND QUICK, CUT BELOW '+Math.round(plLow(T[s].low))+' HZ':'ON'):'OFF');}
      S.edited=true;P();E.apply(clock);paint();host.changed('switch');}
    function openDrawer(id){if(id==='stage'){S.view=S.view==='stage'?'simple':'stage';}else{if(S.view==='stage')S.view='simple';S.open=S.open===id?'':id;}host.changed('view');layout();}

    /* ---- the computer keyboard (KEYS lit), as HALO's; a slider or button clicked last is not a box being typed into ---- */
    const busyTyping=t=>!!(t&&(t.isContentEditable||/^(TEXTAREA|SELECT)$/.test(t.tagName)||t.tagName==='INPUT'&&!/^(range|checkbox|radio|button|submit|color)$/.test(t.type)))||!!document.querySelector('.modal');
    function kd(e){if(!comp||dead||e.ctrlKey||e.altKey||e.metaKey||busyTyping(e.target))return;const c=e.code;
      if(c in CK){e.preventDefault();if(e.repeat||typed.has(c))return;typed.add(c);key({t:'on',n:CK_BASE+12*koct+CK[c],v:kvel});return;}
      if(c==='KeyZ'||c==='KeyX'){e.preventDefault();if(!e.repeat){blur();koct=clamp(koct+(c==='KeyX'?1:-1),-3,3);flash('KEYS','OCTAVE '+(koct>0?'+':'')+koct);}}
      else if(c==='KeyC'||c==='KeyV'){e.preventDefault();if(!e.repeat){kvel=clamp(kvel+(c==='KeyV'?20:-20),1,127);flash('KEYS','VELOCITY '+kvel);}}}
    function ku(e){if(typed.delete(e.code))key({t:'off',n:CK_BASE+12*koct+CK[e.code]});}
    function blur(){for(const c of typed)key({t:'off',n:CK_BASE+12*koct+CK[c]});typed.clear();}
    function compKeys(on){if(on&&plugged('keys')){host.toast('HORIZON: a KEYS device is plugged into KEYS IN: turn on its COMPUTER KEYS instead');return;}
      comp=on;if(on){addEventListener('keydown',kd);addEventListener('keyup',ku);addEventListener('blur',blur);}else{blur();removeEventListener('keydown',kd);removeEventListener('keyup',ku);removeEventListener('blur',blur);}
      paint();flash('KEYS',on?'A S D F… PLAY · Z X OCTAVE':'OFF');}

    /* ---- the hands on it: knobs (drag, scroll, double-click), buttons, switches, the drawers; anywhere else that is not a control (the
       sky, the glass between controls) is where the desk picks the device up; at full screen a click on the sky puts the glass away ---- */
    const drag=(e,mv,up)=>{e.preventDefault();e.stopPropagation();const M=ev=>mv(ev),U=ev=>{removeEventListener('pointermove',M);removeEventListener('pointerup',U);if(up)up(ev);};addEventListener('pointermove',M);addEventListener('pointerup',U);};
    m.addEventListener('pointerdown',e=>{if(e.button)return;const t=e.target,d=t.dataset||{};
      if(d.k){const k=d.k,y0=e.clientY,u0=+get(k)||0,fd=t.closest('.fd');   /* a fader follows the hand along its track; a knob turns a full sweep in three and a half of its heights */
        const h=fd?fd.querySelector('.track').getBoundingClientRect().height*.67:t.closest('.kn').querySelector('.cap').getBoundingClientRect().height*3.5;drag(e,ev=>set(k,clamp(u0+(y0-ev.clientY)/h,0,1)));return;}
      if(d.b||d.m||d.s){t.classList.add('down');drag(e,()=>{},()=>{t.classList.remove('down');if(d.b)button(d.b);else if(d.m)openDrawer(d.m);else stomp(d.s);});return;}
      if(big()&&(S.open||S.view==='stage')&&!t.closest('.glass')){S.open='';S.view='simple';host.changed('view');layout();}});   /* full screen: a click on the sky puts the glass away */
    m.addEventListener('wheel',e=>{const d=e.target.dataset||{};if(!d.k)return;e.preventDefault();e.stopPropagation();set(d.k,clamp(get(d.k)-Math.sign(e.deltaY)*.03,0,1));},{passive:false});
    m.addEventListener('dblclick',e=>{const d=e.target.dataset||{};if(d.k){e.stopPropagation();set(d.k,DEFK[d.k]);}});
    m.addEventListener('pointerover',e=>{const k=e.target.dataset&&e.target.dataset.k;if(k&&k.startsWith('shape.'))tipEl.textContent=(KNAME[k]||k)+': '+(TIP[k]||'')+(e.target.closest('.kn').classList.contains('off')?' · its effect is switched off':'');});
    host.tool('🎚','SHAPER: shape the piano (the strike and the tail)',()=>openDrawer('shaper'));

    /* ---- start: the samples (shared), the hall, the sky, MIDI ---- */
    const offStat=M2.on('horizon-samples',()=>{if(!dead){show();if(S.open==='shaper')drawLab();}});
    loadSamples(ctx,host.files||window.mixtapeFiles).catch(()=>{if(!dead)host.toast('HORIZON: the piano recordings are not in Instruments\\Salamander Grand');});
    cdlEngine().then(CDL=>{if(!dead)E.reverb(CDL);}).catch(e=>host.toast('HORIZON: '+e.message+' (no reverb)'));
    layout();E.apply(clock);padApply();paint();watch();offMidi=M2.midi.listen(midi);skyStart();
    const onResize=()=>{if(big()){fitUI();skySize();}};document.addEventListener('fullscreenchange',onFull);addEventListener('resize',onResize);if(host.fill)onFull();
    if(Object.values(S.v.pad.drone).some(Boolean))setTimeout(()=>{if(!dead)droneSync(false);},300);   /* a desk saved droning drones again */
    const offIn=M2.on('midi',kinLamp);kinLamp();
    const offTempo=M2.on('tempo',()=>E.apply(clock));
    return {node:s=>s==='out'?outG:s==='fx'?E.fxIn:null,
      receive(sock,msg){if(sock==='keys')key(msg);return true;},
      visible(v){if(v)go();},
      plugged(sock){if(sock==='keys'){allUp();if(comp&&plugged('keys'))compKeys(false);kinLamp();}if(sock==='fx')watch();},
      /* for tools\probes\m2-horizon.js */
      probe:()=>({samples:SAMP.state,loaded:SAMP.src.size,awake:E.awake,voices:E.voices.length,srcs:E.voices.reduce((s,v)=>s+v.srcs.length,0),live:E.voices.filter(v=>!v.released).length,rev:E.voices.filter(v=>v.rev).length,
        keyBufs:KEYC.size,level:+E.level().toFixed(4),piano:S.piano,preset:names()[S.preset],pedal,down:[...down],view:S.view,open:S.open,sky:skyR?(photoOK?'picture':'plain night'+(skyErr?' ('+skyErr+')':'')):'none: '+skyErr,
        drawing:!!raf,frames:frameN,canvas:[skyc.width,skyc.height],full:full(),skyLevel:+slow.toFixed(3),pulse:+pulse.toFixed(3),surges:SURGE.length,
        pad:padE?{on:S.v.pad.on,name:S.v.pad.pname,ch:S.v.pad.P.ch.join('+'),voices:padE.voices.length,held:[...padHeld.keys()],drones:[...drones.keys()],awake:!!padE.awake,level:+padE.level().toFixed(4)}:'no HALO'}),
      debugSet:(k,v)=>set(k,v,true),
      /* the sky's cost: n frames drawn back to back and waited for (the graphics card's work included), ms each */
      debugFrame:n=>{if(!skyR)return null;const a=performance.now();for(let i=0;i<n;i++){step(1/30);skyDraw();}skyR.finish();return +((performance.now()-a)/n).toFixed(2);},
      debugSurge:cloud=>surge(1,!!cloud),debugFull:()=>toggleFull(),
      destroy(){dead=true;if(raf)cancelAnimationFrame(raf);if(labRaf)cancelAnimationFrame(labRaf);clearTimeout(flashT);clearTimeout(sleepT);clearTimeout(litT);if(comp)compKeys(false);if(offMidi)offMidi();offStat();offIn();offTempo();
        document.removeEventListener('fullscreenchange',onFull);removeEventListener('resize',onResize);if(full())document.exitFullscreen().catch(()=>{});if(skyR)try{skyR.dispose();}catch(e){}host.engine.busy(host.uid,false);clearTimeout(wanderT);if(padE)padE.dispose();E.dispose();setTimeout(()=>{try{outG.disconnect();}catch(e){}},400);}};}};
M2.define(DEF);
/* desks saved while it was called VESPER: the same device under its old name (not on the shelf) */
if(M2.defs.has('horizon'))M2.defs.set('vesper',Object.assign(Object.create(M2.defs.get('horizon')),{id:'vesper',type:'retired'}));
})();
