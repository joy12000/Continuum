// public/debug/api.js
(function(){
  const out = document.querySelector('#out');
  const log = (m)=> out.textContent += m + "\n";
  const set = (m)=> out.textContent = m + "\n";

  async function f(url, init){ const r = await fetch(url, { cache:'no-store', ...(init||{}) }); const t = await r.text(); return { r, t }; }

  async function ping(){ set('GET /api/ping ...'); try{ const {r,t} = await f('/api/ping'); log('Status '+r.status); log(t); }catch(e){ log('ERR '+e); } }
  async function pingDirect(){ set('GET /.netlify/functions/ping ...'); try{ const {r,t} = await f('/.netlify/functions/ping'); log('Status '+r.status); log(t); }catch(e){ log('ERR '+e); } }
  async function embed(){ set('POST /api/embed ...'); try{ const {r,t} = await f('/api/embed', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ texts:['hello continuum'] }) }); log('Status '+r.status); log(t.slice(0,1200)); }catch(e){ log('ERR '+e); } }
  async function generate(){ set('POST /api/generate ...'); try{ const payload = { question:'What is Continuum?', context:[{id:'d1', content:'Continuum is offline-first.'}] }; const {r,t} = await f('/api/generate', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) }); log('Status '+r.status); log(t.slice(0,1200)); }catch(e){ log('ERR '+e); } }

  window.addEventListener('DOMContentLoaded', ()=>{
    document.querySelector('#btnPing').onclick = ping;
    document.querySelector('#btnPingDirect').onclick = pingDirect;
    document.querySelector('#btnEmbed').onclick = embed;
    document.querySelector('#btnGenerate').onclick = generate;
    set('JS loaded ✅'); setTimeout(ping, 100);
  });
})();
