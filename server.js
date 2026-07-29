const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const GA_URL = 'https://script.google.com/macros/s/AKfycbwumgDWjK9S75udMmQutWrxRgxwDIc_30acWBsac2T2Y7NVf9CEmzMFx746CbvUFUpP/exec';
const PORT = 3000;

function serveStatic(res, filePath) {
  const ext = path.extname(filePath);
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' });
    res.end(data);
  });
}

function proxyToGA(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const targetUrl = GA_URL + url.parse(req.url).search + '';
  if (req.method === 'GET') {
    https.get(targetUrl, (proxyRes) => {
      let data = '';
      proxyRes.on('data', chunk => data += chunk);
      proxyRes.on('end', () => {
        if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
          https.get(proxyRes.headers.location, (r2) => {
            let d2 = '';
            r2.on('data', c => d2 += c);
            r2.on('end', () => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(d2); });
          });
        } else {
          res.writeHead(proxyRes.statusCode, { 'Content-Type': proxyRes.headers['content-type'] || 'application/json' });
          res.end(data);
        }
      });
    });
  } else if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const parts = new URL(targetUrl);
      const options = { hostname: parts.hostname, path: parts.pathname + parts.search, method: 'POST', headers: { 'Content-Type': req.headers['content-type'] || 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) } };
      const proxyReq = https.request(options, (proxyRes) => {
        let data = '';
        proxyRes.on('data', chunk => data += chunk);
        proxyRes.on('end', () => {
          if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
            https.get(proxyRes.headers.location, (r2) => {
              let d2 = '';
              r2.on('data', c => d2 += c);
              r2.on('end', () => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(d2); });
            });
          } else {
            res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
            res.end(data);
          }
        });
      });
      proxyReq.write(body);
      proxyReq.end();
    });
  }
}

http.createServer((req, res) => {
  const parsed = url.parse(req.url);
  if (parsed.pathname === '/' || parsed.pathname === '/index.html') {
    serveStatic(res, path.join(__dirname, 'index.html'));
  } else if (parsed.pathname.startsWith('/api')) {
    proxyToGA(req, res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT}`);
});
