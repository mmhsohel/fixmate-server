
import 'dotenv/config';

const get = (key, fallback = '') =>
  process.env[key] ?? fallback;

const required = (key) => {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

export const env = {
  nodeEnv: get('NODE_ENV', 'development'),
  port: Number(get('PORT', 5000)),

  mongoUri: get(
    'MONGODB_URI',
    'mongodb://127.0.0.1:27017'
  ),

  dbName: get('DB_NAME', 'fixmate'),

  jwtSecret:
    get('NODE_ENV', 'development') === 'production'
      ? required('JWT_SECRET')
      : get('JWT_SECRET', 'dev-only-secret'),

  clientUrl: get('CLIENT_URL', 'http://localhost:3000'),

  clientInternalUrl:
    get('CLIENT_INTERNAL_URL') ||
    get('CLIENT_URL', 'http://localhost:3000'),

  corsOrigins: get(
    'CORS_ORIGINS',
    get('CLIENT_URL', 'http://localhost:3000')
  )
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean),

  stripeKey: get('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: get('STRIPE_WEBHOOK_SECRET'),
  imgbbKey: get('IMGBB_API_KEY'),

  seedOnStart: get('SEED_ON_START', 'false') === 'true',
};

export const isProd = env.nodeEnv === 'production';
