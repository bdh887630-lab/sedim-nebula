import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

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

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
