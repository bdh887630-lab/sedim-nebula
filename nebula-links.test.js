import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLATFORM_ORIGIN,
  encodeNebulaSharePayload,
  parseNebulaShareToken,
  readNebulaLink,
  buildPlatformUrl,
} from './nebula-links.js';

test('buildPlatformUrl always resolves to nebula-platform.pages.dev', () => {
  assert.equal(buildPlatformUrl(), `${PLATFORM_ORIGIN}/`);
  assert.equal(
    buildPlatformUrl({ pathname: '/editor', shareToken: 'abc', paramName: 'share' }),
    `${PLATFORM_ORIGIN}/editor?share=abc#preview`
  );
});

test('encodeNebulaSharePayload and parseNebulaShareToken roundtrip Arabic project data', () => {
  const token = encodeNebulaSharePayload({
    title: 'مشروع_سدم',
    mode: 'تطبيق',
    code: 'اطبع("مرحباً بسديم")',
  });
  const parsed = parseNebulaShareToken(token);
  assert.ok(parsed);
  assert.equal(parsed.title, 'مشروع_سدم');
  assert.equal(parsed.mode, 'تطبيق');
  assert.equal(parsed.code, 'اطبع("مرحباً بسديم")');
});

test('readNebulaLink reads ?share= link from full nebula-platform.pages.dev URL', () => {
  const token = encodeNebulaSharePayload({
    title: 'لوحة_النجم',
    code: 'ارسم دائرة(10, 20, 30)',
  });
  const url = `https://nebula-platform.pages.dev/?share=${token}#preview`;
  const result = readNebulaLink({ inputUrl: url });

  assert.equal(result.ok, true);
  assert.equal(result.hasSharedProject, true);
  assert.equal(result.project.title, 'لوحة_النجم');
  assert.equal(result.project.mode, 'رسم');
  assert.equal(result.platformUrl, `https://nebula-platform.pages.dev/?share=${token}#preview`);
});

test('readNebulaLink reads ?nebula= from window location search/hash', () => {
  const token = encodeNebulaSharePayload({
    title: 'حاسبة',
    mode: 'نصي',
    code: 'متغير س = 5',
  });
  const result = readNebulaLink({
    pathname: '/ide',
    search: `?nebula=${token}`,
    hash: '#preview',
  });

  assert.equal(result.ok, true);
  assert.equal(result.hasSharedProject, true);
  assert.equal(result.project.title, 'حاسبة');
  assert.equal(result.platformUrl, `https://nebula-platform.pages.dev/ide?nebula=${token}#preview`);
});

test('readNebulaLink accepts bare nebula-platform.pages.dev domain without protocol', () => {
  const result = readNebulaLink({ inputUrl: 'nebula-platform.pages.dev/templates' });
  assert.equal(result.ok, true);
  assert.equal(result.hasSharedProject, false);
  assert.equal(result.platformUrl, 'https://nebula-platform.pages.dev/templates');
});

test('readNebulaLink rejects malformed share tokens and unrelated domains', () => {
  const badToken = readNebulaLink({ inputUrl: 'https://nebula-platform.pages.dev/?share=!!!bad!!!' });
  assert.equal(badToken.ok, false);

  const foreignUrl = readNebulaLink({ inputUrl: 'https://example.com/something' });
  assert.equal(foreignUrl.ok, false);
});
