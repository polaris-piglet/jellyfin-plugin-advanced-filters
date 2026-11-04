const http=require('node:http');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');
const routes={'/':['demo/index.html','text/html'],'/mock.js':['demo/mock.js','text/javascript'],'/library-filter.js':['dist/library-filter.js','text/javascript']};
const server=http.createServer((req,res)=>{const route=routes[new URL(req.url,'http://localhost').pathname];if(!route){res.writeHead(404);res.end();return;}try{res.writeHead(200,{'Content-Type':route[1]+'; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(fs.readFileSync(path.join(root,route[0])));}catch{res.writeHead(500);res.end('Run npm run build first');}});
server.listen(18763,'127.0.0.1',()=>console.log('Demo http://127.0.0.1:18763 — Ctrl+C stops; synthetic data only'));
