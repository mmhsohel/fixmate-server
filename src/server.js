import { createApp } from './app.js';
import { env } from './config/env.js';
import { closeDb, connectDb } from './config/db.js';

async function main() {
  await connectDb();
  const app = createApp();
  const server = app.listen(env.port, "0.0.0.0", () => {
    console.log(
      `✔ FixMate API listening on :${env.port} (${env.nodeEnv})`
    );
  });
  if (env.seedOnStart) {
    import('./seed.js').then((m) => m.runSeed()).catch((e) => console.error('[seed] failed:', e.message));
  }

  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close(async () => { await closeDb(); process.exit(0); });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
