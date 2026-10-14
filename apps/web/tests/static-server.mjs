import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
const root = resolve('out');
const mime = { '.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.xml':'application/xml','.txt':'text/plain' };
createServer(async (req,res)=>{
 try {
  const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let file = resolve(root, `.${pathname}`);
  if (file !== root && !file.startsWith(root+sep)) { res.writeHead(403).end(); return; }
  if ((await stat(file)).isDirectory()) file=resolve(file,'index.html');
  const content=await readFile(file); res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream'}).end(content);
 } catch { res.writeHead(404,{'Content-Type':'text/html'}).end(await readFile(resolve(root,'404.html')).catch(()=>Buffer.from('Not found'))); }
}).listen(4180,'127.0.0.1',()=>console.log('Static preview: http://127.0.0.1:4180'));
