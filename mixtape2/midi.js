/* Mixtape 2: MIDI keyboards (M2.midi). MIDI is opened only when a device listens, so a desk without instruments never opens it.
     const stop = M2.midi.listen(m => …);   // m = {t:'on'|'off', n, v} · {t:'bend', v: -1..1} · {t:'cc', n, v: 0..1}, plus ch and port
     M2.midi.listen(f, {drums:true})        // a drum machine: gets channel 10 (drum pads) as well
   Left out, because Mixtape uses them for other things: DJ controllers (the DDJ-FLX4), the Launchkey's DAW port (its pads in
   InControl mode) and, unless asked for, channel 10 (drum pads). Chrome keeps unplugged ports in its list as "disconnected": only
   connected ones count. */
(()=>{const M2=window.M2;
const fns=new Map();let acc=null,asking=null;
const skip=n=>/DDJ|FLX|MIDIIN2|InControl|DAW/i.test(n||'');
function hook(){if(!acc)return;for(const i of acc.inputs.values())i.onmidimessage=i.state==='connected'&&!skip(i.name)?e=>msg(e,i):null;M2.emit('midi');}
function msg(e,i){const [s,a,b]=e.data,ch=s&15,k=s&240;let m=null;
  if(k===144&&b>0)m={t:'on',n:a,v:b};else if(k===128||k===144)m={t:'off',n:a,v:0};
  else if(k===224)m={t:'bend',v:Math.max(-1,((b<<7|a)-8192)/8191)};else if(k===176)m={t:'cc',n:a,v:b/127};
  if(!m)return;m.ch=ch;m.port=i.name;for(const [f,o] of [...fns])if(ch!==9||o.drums)try{f(m);}catch(x){console.error(x);}}
M2.midi={
  listen(f,o){fns.set(f,o||{});if(!acc&&!asking&&navigator.requestMIDIAccess)asking=navigator.requestMIDIAccess().then(a=>{acc=a;a.onstatechange=hook;hook();},()=>{asking=null;});return ()=>fns.delete(f);},
  /* the keyboards plugged in now (names) */
  get inputs(){return acc?[...acc.inputs.values()].filter(i=>i.state==='connected'&&!skip(i.name)).map(i=>i.name):[];}};
})();
