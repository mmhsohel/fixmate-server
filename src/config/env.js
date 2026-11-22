import 'dotenv/config';

const get = (key, fallback = '') => process.env[key] ?? fallback;

export const env = {
  nodeEnv: get('NODE_ENV', 'development'),
  port: Number(get('PORT', 5000)),
  mongoUri: get('MONGODB_URI', 'mongodb://127.0.0.1:27017'),
  dbName: get('DB_NAME', 'fixmate'),
  jwtSecret: get('JWT_SECRET', 'dev-only-secret'),
  clientUrl: get('CLIENT_URL', 'http://localhost:3000'),
  clientInternalUrl: get('CLIENT_INTERNAL_URL') || get('CLIENT_URL', 'http://localhost:3000'),
  corsOrigins: get('CORS_ORIGINS', get('CLIENT_URL', 'http://localhost:3000'))
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean),
  stripeKey: get('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: get('STRIPE_WEBHOOK_SECRET'),
  imgbbKey: get('IMGBB_API_KEY'),
  seedOnStart: get('SEED_ON_START', 'false') === 'true',
};

export const isProd = env.nodeEnv === 'production';

if (isProd && env.jwtSecret === 'dev-only-secret') {
  throw new Error('JWT_SECRET must be set in production');
}
