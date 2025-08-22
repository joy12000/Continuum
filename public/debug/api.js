// public/debug/api.js
(function(){'use strict';
const Q = (s)=>document.querySelector(s);
const out = Q('#out');
function log(msg){ out.textContent += msg + '\n'; }
function set(msg){ out.textContent = msg + '\n'; }

function timeoutFetch(input, init, ms=10000){
  const ctrl = new AbortController();
  const t = setTimeout(()=>ctrl.abort(), ms);
  return fetch(input, {...(init||{}), signal: ctrl.signal}).finally(()=>clearTimeout(t));
}

function showLoaded(){
  set('JS loaded ✅\nPath: ' + location.pathname);
}

async function testPing(){
  try{ set('GET /api/ping ...'); const r = await timeoutFetch('/api/ping?v=1755856691', { cache:'no-store' }); const t = await r.text(); log('Status '+r.status); log(t); }
  catch(e){ log('ERR '+e); }
}
async function testPingDirect(){
  try{ set('GET /.netlify/functions/ping ...'); const r = await timeoutFetch('/.netlify/functions/ping?v=1755856691', { cache:'no-store' }); const t = await r.text(); log('Status '+r.status); log(t); }
  catch(e){ log('ERR '+e); }
}
async function testEmbed(){
  try{ 
    set('POST /api/embed ...');
    const r = await timeoutFetch('/api/embed?v=1755856691', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ texts: ['hello continuum'] }), cache:'no-store' });
    const t = await r.text(); log('Status '+r.status); log(t.slice(0, 1200));
  } catch(e){ log('ERR '+e); }
}

window.addEventListener('DOMContentLoaded', ()=>{
  showLoaded();
  Q('#btnPing').addEventListener('click', testPing);
  Q('#btnPingDirect').addEventListener('click', testPingDirect);
  Q('#btnEmbed').addEventListener('click', testEmbed);
  // Auto-run a tiny check so user sees something immediately
  setTimeout(testPing, 100);
});
})();
