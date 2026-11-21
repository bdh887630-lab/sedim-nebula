export const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateFeedbackInput(payload = {}) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'بيانات النموذج غير صالحة.' };
  }

  if (payload.botcheck) {
    return { valid: false, isBot: true, error: 'تم رفض الطلب.' };
  }

  const name = String(payload.name ?? '').trim();
  const email = String(payload.email ?? '').trim();
  const message = String(payload.message ?? '').trim();

  if (name.length < 2 || name.length > 120) {
    return { valid: false, error: 'يرجى إدخال الاسم (حرفان على الأقل).' };
  }

  if (!EMAIL_RE.test(email) || email.length > 180) {
    return { valid: false, error: 'يرجى إدخال بريد إلكتروني صحيح.' };
  }

  if (message.length < 5 || message.length > 3000) {
    return { valid: false, error: 'يرجى كتابة ملاحظتك (5 أحرف على الأقل).' };
  }

  return {
    valid: true,
    data: { name, email, message },
  };
}

export async function submitToWeb3Forms({
  name,
  email,
  message,
  botcheck = false,
  accessKey = '',
  fetchImpl = globalThis.fetch,
} = {}) {
  const validation = validateFeedbackInput({ name, email, message, botcheck });
  if (!validation.valid) {
    return {
      ok: false,
      status: 400,
      code: validation.isBot ? 'BOT_DETECTED' : 'VALIDATION_ERROR',
      message: validation.error,
    };
  }

  const trimmedKey = String(accessKey ?? '').trim();
  if (!trimmedKey) {
    return {
      ok: false,
      status: 503,
      code: 'MISSING_ACCESS_KEY',
      message: 'خدمة Web3Forms غير مفعّلة بعد: أضف WEB3FORMS_ACCESS_KEY في متغيرات البيئة.',
    };
  }

  try {
    const response = await fetchImpl(WEB3FORMS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        access_key: trimmedKey,
        subject: 'ملاحظة جديدة من موقع سديم Nebula',
        from_name: 'منصة سديم Nebula',
        name: validation.data.name,
        email: validation.data.email,
        message: validation.data.message,
      }),
    });

    const result = await response.json().catch(() => null);
    if (!response.ok || !result || result.success !== true) {
      return {
        ok: false,
        status: response.status >= 400 ? response.status : 502,
        code: 'UPSTREAM_ERROR',
        message: (result && result.message) || 'تعذر إرسال الملاحظة عبر Web3Forms حالياً.',
      };
    }

    return {
      ok: true,
      status: 200,
      code: 'SENT',
      message: 'تم إرسال ملاحظتك بنجاح! شكراً لمساهمتك في تطوير سديم.',
    };
  } catch {
    return {
      ok: false,
      status: 502,
      code: 'NETWORK_ERROR',
      message: 'حدث خطأ في الاتصال بخدمة Web3Forms. حاول مرة أخرى.',
    };
  }
}
