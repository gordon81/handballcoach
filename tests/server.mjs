// Kleiner statischer Webserver für die Tests (liefert den Projektordner aus, wie GitHub Pages).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TYPES = {'.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.css':'text/css', '.json':'application/json', '.wav':'audio/wav', '.svg':'image/svg+xml', '.webmanifest':'application/manifest+json'};

// → {url, close()}; Port wird frei gewählt.
export function serve(){
  const srv = createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if(p.endsWith('/')) p += 'index.html';
    const f = normalize(join(ROOT, p));
    if(!f.startsWith(ROOT)){ res.writeHead(403); res.end(); return; }
    try{ const b = await readFile(f); res.writeHead(200, {'content-type': TYPES[extname(f)] || 'application/octet-stream'}); res.end(b); }
    catch{ res.writeHead(404); res.end('not found'); }
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({url:`http://127.0.0.1:${srv.address().port}/`, close:() => srv.close()})));
}
