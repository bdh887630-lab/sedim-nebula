import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSiteOrigin, buildSitemapXml, buildRobotsTxt } from './seo-sitemap.js';

test('resolveSiteOrigin prioritizes APP_URL then request host headers', () => {
  assert.equal(
    resolveSiteOrigin({ appUrl: 'https://nebula-platform.pages.dev/path', host: 'localhost:3000' }),
    'https://nebula-platform.pages.dev'
  );
  assert.equal(
    resolveSiteOrigin({ appUrl: '', protocol: 'https', host: 'sedim.example.com' }),
    'https://sedim.example.com'
  );
  assert.equal(resolveSiteOrigin({}), 'https://nebula-platform.pages.dev');
});

test('buildSitemapXml generates valid Google-compatible XML sitemap', () => {
  const xml = buildSitemapXml({
    origin: 'https://nebula-platform.pages.dev',
    lastmod: '2026-11-23',
  });
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.match(xml, /<loc>https:\/\/nebula-platform\.pages\.dev\/<\/loc>/);
  assert.match(xml, /<lastmod>2026-11-23<\/lastmod>/);
  assert.match(xml, /<\/urlset>/);
});

test('buildRobotsTxt allows crawling and declares Sitemap URL', () => {
  const txt = buildRobotsTxt({ origin: 'https://nebula-platform.pages.dev' });
  assert.match(txt, /User-agent: \*/);
  assert.match(txt, /Allow: \//);
  assert.match(txt, /Disallow: \/api\//);
  assert.match(txt, /Sitemap: https:\/\/nebula-platform\.pages\.dev\/sitemap\.xml/);
});
