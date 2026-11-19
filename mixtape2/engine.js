/* Mixtape 2: the shared parts every device plugs into.
   - one sound engine (a single AudioContext), so a sound cable on the desk is a real audio connection underneath
   - one clock (tempo and beat) that every device can follow, so Sync, loops and drum machines agree later
   - the device list (M2.define) and the cables between devices (M2.patch)
   Cables come in four kinds: sound, control (play, load a tape, knob moves, MIDI), sync (tempo and beat) and video. */
(()=>{const M2=window.M2=window.M2||{};

/* ---- little message board: M2.on('library', f) / M2.emit('library') ---- */
const subs={};
M2.on=(ev,f)=>{(subs[ev]=subs[ev]||new Set()).add(f);return ()=>subs[ev].delete(f);};
M2.emit=(ev,...a)=>{if(subs[ev])for(const f of [...subs[ev]]){try{f(...a);}catch(e){console.error(ev,e);}}};

/* ---- the sound engine ---- */
let ctx=null;const acts=new Set();
const engine=M2.engine={
  /* made on first use, so a desk without sound devices runs no audio at all */
  get ctx(){if(!ctx){ctx=new AudioContext({latencyHint:'interactive'});ctx.onstatechange=()=>M2.emit('engine',ctx.state);}
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});return ctx;},
  get made(){return !!ctx;},
  /* devices say when they are making sound (busy(id,true/false)); speaker cones and meters only animate while something is */
  busy(id,on){const n=acts.size;on?acts.add(id):acts.delete(id);if(acts.size!==n)M2.emit('activity',acts.size);},
  get playing(){return acts.size;},
  /* the computer's sound output. A sound out jack marked normal (like a cassette player's built-in speaker) plays here while nothing
     is plugged into it; plugging a cable in takes the sound to that device instead. */
  get master(){const c=engine.ctx;if(!engine._m){engine._m=c.createGain();engine._m.connect(c.destination);if(engine._sink)engine.setOutput(engine._sink);}return engine._m;},
  async outputs(){try{return (await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='audiooutput');}catch(e){return [];}},
  /* '' = the computer's default output */
  async setOutput(id){engine._sink=id||'';if(!ctx||!ctx.setSinkId)return;try{await ctx.setSinkId(id||'');}catch(e){M2.ui&&M2.ui.toast('That sound output is not available');}},
};
/* normalled jacks: back to the computer's output when the last cable comes out */
const normal=(uid,sock,on)=>{const d=M2.desk.get(uid),s=d&&d.def.sockets.find(x=>x.id===sock);if(!s||!s.normal||s.dir!=='out'||s.kind!=='sound')return;
  const n=d.inst.node&&d.inst.node(sock);if(!n)return;try{on?n.connect(engine.master):n.disconnect(engine.master);}catch(e){}};
M2.on('placed',uid=>{const d=M2.desk.get(uid);for(const s of d.def.sockets)if(s.normal&&!patch.at(uid,s.id).length)normal(uid,s.id,true);});

/* ---- the clock: one tempo and one beat for the whole desk ---- */
const clock=M2.clock={bpm:120,running:false,t0:0,
  set(bpm){bpm=+bpm;if(!(bpm>20&&bpm<400))return;const b=clock.beat();clock.bpm=bpm;if(clock.running)clock.t0=engine.ctx.currentTime-b*60/bpm;M2.emit('tempo',bpm);},
  start(at){clock.t0=at!=null?at:engine.ctx.currentTime;clock.running=true;M2.emit('clock',true);},
  stop(){clock.running=false;M2.emit('clock',false);},
  /* where the beat is at a sound-engine time (now if left out), and when a given beat falls */
  beat(t){if(!clock.running||!ctx)return 0;return ((t!=null?t:ctx.currentTime)-clock.t0)*clock.bpm/60;},
  timeOf(beat){return clock.t0+beat*60/clock.bpm;},
  nextBeat(t){return clock.timeOf(Math.ceil(clock.beat(t)));},
};

/* ---- devices ---- */
M2.FORMAT=1;   /* the device format version: a device file says which one it was written for; newer Mixtapes keep loading older ones */
M2.TYPES=[['player','Players'],['input','Inputs'],['console','Consoles'],['effect','Effects'],['instrument','Instruments'],['utility','Utilities'],['rack','Racks']];
M2.KINDS=['sound','control','sync','video'];
const defs=M2.defs=new Map();
M2.define=def=>{
  const bad=m=>{console.warn('Device not loaded ('+(def&&def.id)+'): '+m);};
  if(!def||!/^[a-z0-9-]+$/.test(def.id||''))return bad('it needs an id made of a-z, 0-9 and -');
  if(!M2.TYPES.some(t=>t[0]===def.type))return bad('type must be one of '+M2.TYPES.map(t=>t[0]).join(', '));
  if(typeof def.create!=='function')return bad('it needs create(host)');
  if((def.format||1)>M2.FORMAT)return bad('it needs a newer Mixtape (device format '+def.format+')');
  def.format=def.format||1;def.version=def.version||'1.0';def.name=def.name||def.id;def.sockets=def.sockets||[];def.settings=def.settings||{};
  for(const s of def.sockets){if(!M2.KINDS.includes(s.kind))return bad('socket '+s.id+' has an unknown kind '+s.kind);s.dir=s.dir==='in'?'in':'out';s.side=s.side||(s.dir==='in'?'left':'right');if(s.at==null)s.at=.5;}
  defs.set(def.id,def);M2.emit('defs',def);};

/* ---- cables ---- */
let cid=0;
const patch=M2.patch={cables:[],
  sock(uid,id){const d=M2.desk.get(uid);return d?d.def.sockets.find(s=>s.id===id):null;},
  at(uid,id){return patch.cables.filter(c=>(c.from.uid===uid&&c.from.sock===id)||(c.to.uid===uid&&c.to.sock===id));},
  /* a jack takes one cable, unless the device says it takes many (speakers mix every player plugged into them) */
  free(uid,id){const s=patch.sock(uid,id);return !!s&&(s.many||!patch.at(uid,id).length);},
  /* turns two jacks into {from: the output, to: the input}, or null when they do not fit together */
  fit(a,b){const sa=patch.sock(a.uid,a.sock),sb=patch.sock(b.uid,b.sock);
    if(!sa||!sb||a.uid===b.uid||sa.kind!==sb.kind||sa.dir===sb.dir)return null;
    if((sa.tag||'')!==(sb.tag||''))return null;   /* a tagged jack (tag:'notes', a keyboard's) only fits jacks with the same tag */
    const [from,to]=sa.dir==='out'?[a,b]:[b,a];
    if(patch.cables.some(c=>c.from.uid===from.uid&&c.from.sock===from.sock&&c.to.uid===to.uid&&c.to.sock===to.sock))return null;
    if(!patch.free(from.uid,from.sock)||!patch.free(to.uid,to.sock))return null;
    return {from:{uid:from.uid,sock:from.sock},to:{uid:to.uid,sock:to.sock},kind:sa.kind};},
  connect(a,b,quiet){const f=patch.fit(a,b);if(!f)return null;const c={id:++cid,...f};
    const A=M2.desk.get(c.from.uid),B=M2.desk.get(c.to.uid);
    if(c.kind==='sound'){const o=A.inst.node&&A.inst.node(c.from.sock),i=B.inst.node&&B.inst.node(c.to.sock);if(!o||!i)return null;o.connect(i);}
    patch.cables.push(c);if(c.kind==='sound')normal(c.from.uid,c.from.sock,false);
    for(const [d,s] of [[A,c.from.sock],[B,c.to.sock]])if(d.inst.plugged)try{d.inst.plugged(s,true,c);}catch(e){console.error(e);}
    M2.emit('cables',{add:c,quiet});return c;},
  disconnect(c,quiet){const k=patch.cables.indexOf(c);if(k<0)return;patch.cables.splice(k,1);
    const A=M2.desk.get(c.from.uid),B=M2.desk.get(c.to.uid);
    if(c.kind==='sound'&&A&&B){try{A.inst.node(c.from.sock).disconnect(B.inst.node(c.to.sock));}catch(e){}}
    if(c.kind==='sound'&&A&&!patch.at(c.from.uid,c.from.sock).length)normal(c.from.uid,c.from.sock,true);
    for(const [d,s] of [[A,c.from.sock],[B,c.to.sock]])if(d&&d.inst.plugged)try{d.inst.plugged(s,false,c);}catch(e){console.error(e);}
    M2.emit('cables',{remove:c,quiet});},
  /* control, sync and video messages: delivered to whatever sits at the other end of the cables on that jack.
     Returns what the receivers answered (an empty list = nothing plugged in). */
  send(uid,sock,msg){const out=[];
    for(const c of patch.at(uid,sock)){const o=c.from.uid===uid&&c.from.sock===sock?c.to:c.from,d=M2.desk.get(o.uid);
      if(d&&d.inst.receive)try{out.push(d.inst.receive(o.sock,msg,{uid,sock}));}catch(e){console.error(e);}}
    return out;},
  /* automatic wiring: each free jack of a newly placed device plugs into the nearest device with a free jack that fits */
  autowire(uid){const d=M2.desk.get(uid);if(!d)return;const made=[];
    for(const s of d.def.sockets){if(s.auto===false||!patch.free(uid,s.id))continue;
      let best=null;
      for(const o of M2.desk.all()){if(o.uid===uid)continue;
        for(const t of o.def.sockets){if(t.auto===false||t.kind!==s.kind||t.dir===s.dir||!patch.free(o.uid,t.id))continue;
          const dist=M2.desk.distance(d,o);if(!best||dist<best.dist)best={dist,uid:o.uid,sock:t.id};}}
      if(best){const c=patch.connect({uid,sock:s.id},best,true);if(c)made.push(c);}}
    return made;},
};
})();
