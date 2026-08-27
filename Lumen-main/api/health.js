function envMeta(name) {
  const raw = process.env[name];
  const trimmed = (raw || '').trim();
  return {
    defined: raw !== undefined,
    length: raw == null ? 0 : String(raw).length,
    trimmedLength: trimmed.length,
    prefix: trimmed ? trimmed.slice(0, 3) : '',
  };
}

function readCulqiPublic() {
  for (const name of [
    'CULQI_PUBLIC_KEY',
    'CULQI_PUBLIC',
    'VITE_CULQI_PUBLIC_KEY',
    'NEXT_PUBLIC_CULQI_PUBLIC_KEY',
  ]) {
    const v = (process.env[name] || '').trim();
    if (v) return v;
  }
  return '';
}

function readCulqiSecret() {
  for (const name of ['CULQI_SECRET_KEY', 'CULQI_SECRET', 'CULQI_PRIVATE_KEY']) {
    const v = (process.env[name] || '').trim();
    if (v) return v;
  }
  return '';
}

export default function handler(_req, res) {
  const publicKey = readCulqiPublic();
  const secretKey = readCulqiSecret();
  const publicMeta = envMeta('CULQI_PUBLIC_KEY');
  const secretMeta = envMeta('CULQI_SECRET_KEY');
  const culqiLikeKeys = Object.keys(process.env)
    .filter((k) => /culqi/i.test(k))
    .sort();

  let hint;
  if (publicKey && secretKey) {
    hint = undefined;
  } else if (culqiLikeKeys.length === 0) {
    hint =
      'No hay variables Culqi en este proyecto. Agrégalas en Settings → Environment Variables (Production).';
  } else if (publicMeta.trimmedLength === 0 || secretMeta.trimmedLength === 0) {
    hint =
      'Las variables EXISTEN pero el VALOR está vacío. En Vercel: edita CULQI_PUBLIC_KEY y CULQI_SECRET_KEY, pega la clave real (pk_live_... / sk_live_...), Save, y Redeploy sin caché.';
  } else {
    hint = 'Revisa el formato de las claves (deben empezar por pk_ y sk_).';
  }

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    culqiConfigured: Boolean(publicKey && secretKey),
    hasPublicKey: Boolean(publicKey),
    hasSecretKey: Boolean(secretKey),
    publicKeyMeta: publicMeta,
    secretKeyMeta: secretMeta,
    culqiEnvNamesFound: culqiLikeKeys,
    vercelEnv: process.env.VERCEL_ENV || null,
    vercelUrl: process.env.VERCEL_URL || null,
    projectId: process.env.VERCEL_PROJECT_ID || null,
    runtime: 'vercel',
    hint,
  });
}
