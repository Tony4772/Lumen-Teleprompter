function getCulqiKeys() {
  return {
    publicKey: process.env.CULQI_PUBLIC_KEY || '',
    secretKey: process.env.CULQI_SECRET_KEY || '',
  };
}

async function parseCulqiResponse(response) {
  const raw = await response.text();
  try {
    return { ok: response.ok, status: response.status, data: JSON.parse(raw), raw };
  } catch {
    return {
      ok: false,
      status: response.status,
      data: {
        object: 'error',
        user_message:
          'Culqi devolvió una respuesta inválida. Revisa CULQI_SECRET_KEY en Vercel.',
        merchant_message: raw.slice(0, 180),
      },
      raw,
    };
  }
}

function normalizePeruPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 9 && digits.startsWith('9')) return `51${digits}`;
  if (digits.length === 11 && digits.startsWith('51')) return digits;
  if (digits.length >= 11) return digits.slice(-11);
  return '51999999999';
}

async function createCulqiOrder(body) {
  const { secretKey } = getCulqiKeys();
  if (!secretKey) {
    return {
      status: 503,
      json: {
        error:
          'Falta CULQI_SECRET_KEY en Vercel (Settings → Environment Variables). Luego Redeploy.',
      },
    };
  }

  const { amount, email, firstName, lastName, phone, message } = body || {};
  const parsedAmount = Math.max(1, Number(amount) || 1);
  const amountInCents = Math.round(parsedAmount * 100);
  const orderNumber = `DON${Date.now()}${Math.floor(Math.random() * 1000)}`;

  const orderPayload = {
    amount: amountInCents,
    currency_code: 'PEN',
    description: `Donacion EBYZOM - ${(message || 'Apoyo Lumen').toString().slice(0, 80)}`,
    order_number: orderNumber,
    client_details: {
      first_name: (firstName || 'Donante').trim().slice(0, 50) || 'Donante',
      last_name: (lastName || 'Voluntario').trim().slice(0, 50) || 'Voluntario',
      email: (email || 'donaciones@ebyzom.pe').trim(),
      phone_number: normalizePeruPhone(phone),
    },
    expiration_date: Math.floor(Date.now() / 1000) + 86400,
  };

  const response = await fetch('https://api.culqi.com/v2/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secretKey}`,
    },
    body: JSON.stringify(orderPayload),
  });

  const parsed = await parseCulqiResponse(response);
  const data = parsed.data;

  if (!parsed.ok) {
    return {
      status: parsed.status >= 400 ? parsed.status : 502,
      json: {
        error:
          data?.user_message ||
          data?.merchant_message ||
          data?.message ||
          'Error al generar la orden con Culqi',
        details: data,
      },
    };
  }

  return {
    status: 200,
    json: {
      orderId: data.id,
      orderNumber,
      amount: parsedAmount,
      currency: 'PEN',
      qr: data.qr,
      paymentCode: data.payment_code,
    },
  };
}

async function chargeCulqi(body) {
  const { secretKey } = getCulqiKeys();
  if (!secretKey) {
    return { status: 503, json: { error: 'Falta CULQI_SECRET_KEY en Vercel.' } };
  }

  const { tokenId, amount, email, firstName, lastName, message } = body || {};
  if (!tokenId) {
    return { status: 400, json: { error: 'Token de tarjeta requerido' } };
  }

  const parsedAmount = Math.max(1, Number(amount) || 1);
  const amountInCents = Math.round(parsedAmount * 100);

  const chargePayload = {
    amount: amountInCents,
    currency_code: 'PEN',
    email: (email || 'donaciones@ebyzom.pe').trim(),
    source_id: tokenId,
    description: `Donacion voluntaria EBYZOM - ${(message || 'Lumen').toString().slice(0, 60)}`,
    metadata: {
      donor_name: `${firstName || ''} ${lastName || ''}`.trim(),
      beneficiary: 'EBYZOM E.I.R.L.',
    },
  };

  const response = await fetch('https://api.culqi.com/v2/charges', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secretKey}`,
    },
    body: JSON.stringify(chargePayload),
  });

  const parsed = await parseCulqiResponse(response);
  const data = parsed.data;

  if (!parsed.ok) {
    return {
      status: parsed.status >= 400 ? parsed.status : 502,
      json: {
        error:
          data?.user_message ||
          data?.merchant_message ||
          data?.message ||
          'Error al procesar el cargo con tarjeta',
        details: data,
      },
    };
  }

  return {
    status: 200,
    json: {
      success: true,
      chargeId: data.id,
      amount: parsedAmount,
      currency: 'PEN',
      cardBrand: data.source?.card_brand,
      cardLast4: data.source?.last_four,
      receiptUrl: data.receipt_url,
    },
  };
}

module.exports = { getCulqiKeys, createCulqiOrder, chargeCulqi };
