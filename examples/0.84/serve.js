const fs = require('fs');
const http = require('http');

http
  .createServer((req, res) => {
    console.log('Req', req.url);

    if (req.url === '/status') {
      res.end('packager-status:running');
      return;
    }

    if (req.url.startsWith('/index.bundle?')) {
      const bundle = fs.readFileSync('dist/bundle.js');
      res.setHeader('Content-Type', 'application/javascript');
      res.statusCode = 200;
      res.end(bundle);
    }
  })
  .listen(8081, () => {
    console.log('Server is running on port 8081');
  });
