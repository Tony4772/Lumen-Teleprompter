function readEnv(name) {
  return (process.env[name] || '').trim();
}

/** Nombres alternativos por si la variable se creó con otro label. */
function readCulqiPublic() {
  return (
    readEnv('CULQI_PUBLIC_KEY') ||
    readEnv('CULQI_PUBLIC') ||
    readEnv('VITE_CULQI_PUBLIC_KEY') ||
    readEnv('NEXT_PUBLIC_CULQI_PUBLIC_KEY')
  );
}

function readCulqiSecret() {
  return (
    readEnv('CULQI_SECRET_KEY') ||
    readEnv('CULQI_SECRET') ||
    readEnv('CULQI_PRIVATE_KEY')
  );
}

module.exports = function handler(_req, res) {
  const publicKey = readCulqiPublic();
  const secretKey = readCulqiSecret();
  const culqiLikeKeys = Object.keys(process.env)
    .filter((k) => /culqi|CULQI/i.test(k))
    .sort();

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    culqiConfigured: Boolean(publicKey && secretKey),
    hasPublicKey: Boolean(publicKey),
    hasSecretKey: Boolean(secretKey),
    // Diagnóstico: nombres de vars Culqi que SÍ existen (sin valores)
    culqiEnvNamesFound: culqiLikeKeys,
    vercelEnv: process.env.VERCEL_ENV || null,
    vercelUrl: process.env.VERCEL_URL || null,
    projectId: process.env.VERCEL_PROJECT_ID || null,
    runtime: 'vercel-root',
    hint:
      publicKey && secretKey
        ? undefined
        : culqiLikeKeys.length === 0
          ? 'Este deploy NO ve ninguna variable con "CULQI" en el nombre. Estás editando otro proyecto de Vercel, u otro entorno (Preview en vez de Production), o el nombre no coincide.'
          : 'Hay variables Culqi pero con otro nombre. Renómbralas exactamente a CULQI_PUBLIC_KEY y CULQI_SECRET_KEY.',
  });
};
