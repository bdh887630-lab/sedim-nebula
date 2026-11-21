import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { submitToWeb3Forms } from './feedback-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

app.use(express.json({ limit: '64kb' }));

const PUBLIC_FILES = new Map([
  ['/logo-icon.png', 'logo-icon.png'],
  ['/logo-hero.png', 'logo-hero.png'],
  ['/nebula-links.js', 'nebula-links.js'],
]);

for (const [routePath, fileName] of PUBLIC_FILES.entries()) {
  app.get(routePath, (_req, res) => {
    res.sendFile(path.join(__dirname, fileName));
  });
}

app.post('/api/feedback', async (req, res) => {
  const result = await submitToWeb3Forms({
    name: req.body?.name,
    email: req.body?.email,
    message: req.body?.message,
    botcheck: Boolean(req.body?.botcheck),
    accessKey: process.env.WEB3FORMS_ACCESS_KEY || '',
  });
  return res.status(result.status).json({
    success: result.ok,
    code: result.code,
    message: result.message,
  });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
