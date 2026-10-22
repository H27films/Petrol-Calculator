import { createServer, ServerResponse } from 'http';

const PORT = 3001;

function resolveApi(pathname) {
  // Strip leading /api/ and map to ./api/<name>.js
  const rel = pathname.replace(/^\/api\//, '');
  return new URL(`./api/${rel}.js`, import.meta.url).pathname;
}

async function loadHandler(apiPath) {
  // Invalidate the module cache so edits apply without restart
  const mod = await import(apiPath);
  return mod.default;
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj ?? {});
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Length': 0,
    });
    res.end();
    return;
  }

  // Only handle /api/* routes
  if (!pathname.startsWith('/api/')) {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }

  // Parse query string onto req.query
  req.query = Object.fromEntries(url.searchParams);

  // Parse JSON body onto req.body
  req.body = {};
  if (req.method === 'PUT' || req.method === 'POST') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString();
    if (raw.trim()) {
      try {
        req.body = JSON.parse(raw);
      } catch {
        req.body = {};
      }
    }
  }

  try {
    const apiPath = resolveApi(pathname);
    const handler = await loadHandler(apiPath);
    await handler(req, res);
  } catch (err) {
    // Module not found or handler error
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
      sendJson(res, 404, { error: 'API route not found' });
    } else {
      console.error(err);
      sendJson(res, 500, { error: 'Internal server error' });
    }
  }
});

// Attach status/json helpers to response prototype so handlers can use them
const origWriteHead = ServerResponse.prototype.writeHead;
ServerResponse.prototype.status = function (code) {
  this._statusCode = code;
  return this;
};
ServerResponse.prototype.json = function (obj) {
  sendJson(this, this._statusCode ?? 200, obj);
};

server.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});