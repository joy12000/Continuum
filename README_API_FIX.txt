API Revival Pack (Netlify + Gemini)
===================================

Files in this patch:
- netlify/functions/embed.js        → Gemini embeddings endpoint
- netlify.toml                      → adds /api/* → Functions redirect + keeps COOP/COEP headers
- public/debug/api.html             → one-click API test page

Steps (non-dev friendly):
1) Add environment variable in Netlify → Site settings → Build & deploy → Environment:
   - GEMINI_API_KEY = <your key>
   - (optional) GEMINI_EMBED_MODEL = text-embedding-004
   Save.

2) Commit & Deploy the patch (overwrite existing files).

3) Test after deploy:
   - Open https://<your-site>/public/debug/api.html
   - Click 'Run test' → you should see Status 200 and a JSON with vectors.

4) Frontend calling path:
   - Use '/api/embed' in fetch():
     fetch('/api/embed', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({texts:[q]}) })
   - No extra VITE_API_BASE needed (thanks to netlify.toml redirects).

5) CORS:
   - The function enables CORS for '*' and handles OPTIONS preflight.
     If you only call from same origin, it's simply permissive.

Troubleshooting:
- 404 Not Found → netlify.toml not applied or wrong path → ensure redirect exists and redeploy.
- 401/403 → check GEMINI_API_KEY.
- 500 with INTERNAL → retry; if persists, print the 'details' message in console for specifics.
