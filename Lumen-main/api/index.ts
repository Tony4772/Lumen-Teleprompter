import { createApiApp } from '../server/createApiApp';

const app = createApiApp();

export default app;

// Avoid Vercel double-parsing the body before Express.
export const config = {
  api: {
    bodyParser: false,
  },
};
