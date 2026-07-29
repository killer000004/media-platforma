const http = require('http');
const https = require('https');
const url = require('url');

const GA_URL = 'https://script.google.com/macros/s/AKfycbye3rhzS64M80PD700-PbfwgtBQLgubokpV8W6GP7ePf3FhdL9-_FSnsVv5srAqshr_/exec';
const PORT = 3001;

function proxyRequest(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsed = url.parse(req.url, true);
  const query = parsed.query;
  const targetUrl = GA_URL + (parsed.search || '');

  if (req.method === 'GET') {
    https.get(targetUrl, (proxyRes) => {
      let data = '';
      const contentType = proxyRes.headers['content-type'] || '';
      proxyRes.on('data', chunk => data += chunk);
      proxyRes.on('end', () => {
        if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
          https.get(proxyRes.headers.location, (r2) => {
            let d2 = '';
            r2.on('data', c => d2 += c);
            r2.on('end', () => {
              res.setHeader('Content-Type', 'application/json');
              res.end(d2);
            });
          });
        } else {
          res.setHeader('Content-Type', contentType || 'application/json');
          res.end(data);
        }
      });
    });
  } else if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const parts = url.parse(targetUrl);
      const options = {
        hostname: parts.hostname,
        path: parts.path,
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
      };
      const proxyReq = https.request(options, (proxyRes) => {
        let data = '';
        proxyRes.on('data', chunk => data += chunk);
        proxyRes.on('end', () => {
          if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
            https.get(proxyRes.headers.location, (r2) => {
              let d2 = '';
              r2.on('data', c => d2 += c);
              r2.on('end', () => {
                res.setHeader('Content-Type', 'application/json');
                res.end(d2);
              });
            });
          } else {
            res.setHeader('Content-Type', 'application/json');
            res.end(data);
          }
        });
      });
      proxyReq.write(body);
      proxyReq.end();
    });
  }
}

http.createServer(proxyRequest).listen(PORT, () => {
  console.log(`Proxy server running at http://localhost:${PORT}`);
});
