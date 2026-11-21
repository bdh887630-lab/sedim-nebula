export const PLATFORM_ORIGIN = 'https://nebula-platform.pages.dev';

const VALID_MODES = new Set(['تطبيق', 'رسم', 'نصي']);

export function normalizeLineEndings(text) {
  return String(text ?? '').replace(/\r\n?/g, '\n');
}

export function inferNebulaMode(code) {
  const src = normalizeLineEndings(code);
  if (/(?:^|[\s(])(شاشة|زر|نص_تفاعلي|نافذة|واجهة|تطبيق)(?=$|[\s(:.،؛])/.test(src)) {
    return 'تطبيق';
  }
  if (/(?:^|[\s(])(ارسم|دائرة|مستطيل|خط|لوحة|رسم)(?=$|[\s(:.،؛])/.test(src)) {
    return 'رسم';
  }
  return 'نصي';
}

export function encodeBase64Url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 =
    typeof btoa === 'function'
      ? btoa(binary)
      : Buffer.from(bytes).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function decodeBase64Url(token) {
  const normalized = String(token ?? '').trim().replace(/-/g, '+').replace(/_/g, '/');
  if (!normalized || !/^[A-Za-z0-9+/=]+$/.test(normalized)) {
    throw new Error('Invalid base64url token');
  }
  const mod = normalized.length % 4;
  if (mod === 1) {
    throw new Error('Invalid base64url length');
  }
  const padded = mod === 2 ? `${normalized}==` : mod === 3 ? `${normalized}=` : normalized;
  if (typeof atob === 'function') {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  return new Uint8Array(Buffer.from(padded, 'base64'));
}

export function encodeNebulaSharePayload({ title = 'برنامج_مشترك', code = '', mode } = {}) {
  const cleanCode = normalizeLineEndings(code);
  const resolvedMode = VALID_MODES.has(mode) ? mode : inferNebulaMode(cleanCode);
  const payload = {
    v: 1,
    t: String(title || 'برنامج_مشترك').trim().slice(0, 100) || 'برنامج_مشترك',
    m: resolvedMode,
    c: cleanCode,
  };
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  return encodeBase64Url(bytes);
}

export function parseNebulaShareToken(token) {
  try {
    const trimmed = String(token ?? '').trim();
    if (!trimmed) return null;
    const bytes = decodeBase64Url(trimmed);
    const jsonText = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const parsed = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.c !== 'string') {
      return null;
    }
    const code = normalizeLineEndings(parsed.c);
    const mode = VALID_MODES.has(parsed.m) ? parsed.m : inferNebulaMode(code);
    const title =
      typeof parsed.t === 'string' && parsed.t.trim()
        ? parsed.t.trim().slice(0, 100)
        : 'برنامج_مشترك';
    return {
      version: typeof parsed.v === 'number' ? parsed.v : 1,
      title,
      mode,
      code,
      token: trimmed,
    };
  } catch {
    return null;
  }
}

export function extractShareTokenFromSearchAndHash(search = '', hash = '') {
  const searchStr = String(search ?? '').trim();
  if (searchStr) {
    const query = searchStr.startsWith('?') ? searchStr.slice(1) : searchStr;
    const params = new URLSearchParams(query);
    const token = params.get('share') || params.get('nebula');
    if (token) return { paramName: params.has('share') ? 'share' : 'nebula', token };
  }

  const hashStr = String(hash ?? '').trim();
  if (hashStr) {
    const hashBody = hashStr.startsWith('#') ? hashStr.slice(1) : hashStr;
    const queryPart = hashBody.includes('?') ? hashBody.split('?').slice(1).join('?') : hashBody;
    const params = new URLSearchParams(queryPart);
    const token = params.get('share') || params.get('nebula');
    if (token) return { paramName: params.has('share') ? 'share' : 'nebula', token };
  }

  return null;
}

export function parseInputUrl(rawInput) {
  const trimmed = String(rawInput ?? '').trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('?') || trimmed.startsWith('#') || trimmed.startsWith('/')) {
    return new URL(trimmed, PLATFORM_ORIGIN);
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return new URL(trimmed);
  }

  if (/^[a-z0-9.-]+\.[a-z]{2,}(?:[/?#:]|$)/i.test(trimmed)) {
    return new URL(`https://${trimmed}`);
  }

  return null;
}

export function buildPlatformUrl({
  pathname = '/',
  search = '',
  hash = '',
  shareToken = '',
  paramName = 'share',
} = {}) {
  const cleanPath = pathname && pathname !== '/' ? (pathname.startsWith('/') ? pathname : `/${pathname}`) : '/';
  const url = new URL(cleanPath, PLATFORM_ORIGIN);

  if (shareToken) {
    url.searchParams.set(paramName || 'share', shareToken);
    url.hash = '#preview';
    return url.toString();
  }

  if (search) {
    url.search = search.startsWith('?') ? search : `?${search}`;
  }
  if (hash) {
    url.hash = hash.startsWith('#') ? hash : `#${hash}`;
  }
  return url.toString();
}

export function readNebulaLink({
  inputUrl = '',
  pathname = '/',
  search = '',
  hash = '',
} = {}) {
  let targetPathname = pathname || '/';
  let targetSearch = search || '';
  let targetHash = hash || '';
  let hasExplicitInput = false;

  if (String(inputUrl ?? '').trim()) {
    hasExplicitInput = true;
    let parsed;
    try {
      parsed = parseInputUrl(inputUrl);
    } catch {
      return { ok: false, error: 'صيغة الرابط غير صالحة.', platformUrl: PLATFORM_ORIGIN };
    }
    if (!parsed) {
      return { ok: false, error: 'يرجى إدخال رابط يبدأ بـ https://nebula-platform.pages.dev أو معامل ?share=.', platformUrl: PLATFORM_ORIGIN };
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { ok: false, error: 'يُسمح بروابط http/https فقط.', platformUrl: PLATFORM_ORIGIN };
    }

    const hostname = parsed.hostname.toLowerCase();
    const isKnownHost =
      hostname === 'nebula-platform.pages.dev' ||
      hostname === 'pages.dev' ||
      hostname === 'nebula.platform' ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1';

    if (!isKnownHost && !parsed.searchParams.has('share') && !parsed.searchParams.has('nebula')) {
      return {
        ok: false,
        error: 'هذا الرابط لا يخص منصة سديم (nebula-platform.pages.dev).',
        platformUrl: PLATFORM_ORIGIN,
      };
    }

    targetPathname = parsed.pathname || '/';
    targetSearch = parsed.search || '';
    targetHash = parsed.hash || '';
  }

  const extracted = extractShareTokenFromSearchAndHash(targetSearch, targetHash);
  if (extracted) {
    const project = parseNebulaShareToken(extracted.token);
    if (!project) {
      return {
        ok: false,
        error: 'تعذر فك تشفير رابط المشروع المشترك (share/nebula غير صالح).',
        platformUrl: PLATFORM_ORIGIN,
      };
    }
    return {
      ok: true,
      hasSharedProject: true,
      project,
      pathname: targetPathname,
      platformUrl: buildPlatformUrl({
        pathname: targetPathname,
        shareToken: project.token,
        paramName: extracted.paramName,
      }),
    };
  }

  const cleanPlatformUrl = buildPlatformUrl({
    pathname: targetPathname,
    search: targetSearch,
    hash: targetHash,
  });

  return {
    ok: true,
    hasSharedProject: false,
    hasExplicitInput,
    project: null,
    pathname: targetPathname,
    platformUrl: cleanPlatformUrl,
  };
}
