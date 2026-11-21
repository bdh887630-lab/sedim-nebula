import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFeedbackInput, submitToWeb3Forms, WEB3FORMS_ENDPOINT } from './feedback-service.js';

test('validateFeedbackInput enforces required Arabic feedback fields', () => {
  assert.equal(validateFeedbackInput({ name: 'أ', email: 'a@b.com', message: 'مرحباً بكم' }).valid, false);
  assert.equal(validateFeedbackInput({ name: 'فارس', email: 'bad-email', message: 'مرحباً بكم' }).valid, false);
  assert.equal(validateFeedbackInput({ name: 'فارس', email: 'test@example.com', message: 'قصير' }).valid, false);
  assert.equal(validateFeedbackInput({ name: 'فارس', email: 'test@example.com', message: 'ملاحظة رائعة', botcheck: true }).isBot, true);

  const ok = validateFeedbackInput({ name: ' فارس ', email: ' test@example.com ', message: ' تجربة ممتازة ' });
  assert.equal(ok.valid, true);
  assert.deepEqual(ok.data, { name: 'فارس', email: 'test@example.com', message: 'تجربة ممتازة' });
});

test('submitToWeb3Forms returns 503 when WEB3FORMS_ACCESS_KEY is missing', async () => {
  const res = await submitToWeb3Forms({
    name: 'فارس',
    email: 'test@example.com',
    message: 'اقتراح لتحسين المحرر',
    accessKey: '',
  });
  assert.equal(res.ok, false);
  assert.equal(res.status, 503);
  assert.equal(res.code, 'MISSING_ACCESS_KEY');
});

test('submitToWeb3Forms posts expected payload to Web3Forms endpoint', async () => {
  let capturedUrl = '';
  let capturedOptions = null;

  const mockFetch = async (url, options) => {
    capturedUrl = url;
    capturedOptions = options;
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, message: 'Email sent' }),
    };
  };

  const res = await submitToWeb3Forms({
    name: 'فارس',
    email: 'test@example.com',
    message: 'المنصة تعمل بشكل رائع!',
    accessKey: 'test-access-key',
    fetchImpl: mockFetch,
  });

  assert.equal(res.ok, true);
  assert.equal(res.status, 200);
  assert.equal(capturedUrl, WEB3FORMS_ENDPOINT);
  assert.equal(capturedOptions.method, 'POST');
  const sentBody = JSON.parse(capturedOptions.body);
  assert.equal(sentBody.access_key, 'test-access-key');
  assert.equal(sentBody.name, 'فارس');
  assert.equal(sentBody.email, 'test@example.com');
  assert.equal(sentBody.message, 'المنصة تعمل بشكل رائع!');
});

test('submitToWeb3Forms handles Web3Forms rejection cleanly', async () => {
  const mockFetch = async () => ({
    ok: false,
    status: 400,
    json: async () => ({ success: false, message: 'Invalid access key' }),
  });

  const res = await submitToWeb3Forms({
    name: 'فارس',
    email: 'test@example.com',
    message: 'رسالة تجريبية للتحقق',
    accessKey: 'bad-key',
    fetchImpl: mockFetch,
  });

  assert.equal(res.ok, false);
  assert.equal(res.status, 400);
  assert.equal(res.code, 'UPSTREAM_ERROR');
});
