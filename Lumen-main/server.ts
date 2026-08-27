import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { createApiApp } from './server/createApiApp';

dotenv.config();

async function startServer() {
  const app = createApiApp();
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const express = await import('express');
    app.use(express.default.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lumen Prompt server running on http://localhost:${PORT}`);
    if (!process.env.CULQI_PUBLIC_KEY || !process.env.CULQI_SECRET_KEY) {
      console.warn(
        '[Culqi] Claves no configuradas. Agrega CULQI_PUBLIC_KEY y CULQI_SECRET_KEY en .env'
      );
    }
  });
}

startServer();
