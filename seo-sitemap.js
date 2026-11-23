export function resolveSiteOrigin({ appUrl = '', protocol = 'https', host = '' } = {}) {
  const envUrl = String(appUrl ?? '').trim();
  if (envUrl) {
    try {
      return new URL(envUrl).origin;
    } catch {
      // fall back to request headers
    }
  }

  const cleanHost = String(host ?? '')
    .split(',')[0]
    .trim()
    .replace(/[^a-zA-Z0-9.:-]/g, '');

  if (cleanHost) {
    const cleanProto = String(protocol ?? 'https').split(',')[0].trim().toLowerCase() === 'http'
      ? 'http'
      : 'https';
    return `${cleanProto}://${cleanHost}`;
  }

  return 'https://nebula-platform.pages.dev';
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildSitemapXml({
  origin = 'https://nebula-platform.pages.dev',
  lastmod = new Date().toISOString().slice(0, 10),
  paths = [
    { path: '/', changefreq: 'weekly', priority: '1.0' },
  ],
} = {}) {
  const normalizedOrigin = String(origin || 'https://nebula-platform.pages.dev').replace(/\/+$/, '');
  const urlEntries = paths
    .map((entry) => {
      const cleanPath = entry.path.startsWith('/') ? entry.path : `/${entry.path}`;
      const loc = escapeXml(`${normalizedOrigin}${cleanPath}`);
      const mod = escapeXml(entry.lastmod || lastmod);
      const freq = escapeXml(entry.changefreq || 'weekly');
      const prio = escapeXml(entry.priority || '0.8');
      return [
        '  <url>',
        `    <loc>${loc}</loc>`,
        `    <lastmod>${mod}</lastmod>`,
        `    <changefreq>${freq}</changefreq>`,
        `    <priority>${prio}</priority>`,
        '  </url>',
      ].join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urlEntries,
    '</urlset>',
    '',
  ].join('\n');
}

export function buildRobotsTxt({ origin = 'https://nebula-platform.pages.dev' } = {}) {
  const normalizedOrigin = String(origin || 'https://nebula-platform.pages.dev').replace(/\/+$/, '');
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    '',
    `Sitemap: ${normalizedOrigin}/sitemap.xml`,
    '',
  ].join('\n');
}
