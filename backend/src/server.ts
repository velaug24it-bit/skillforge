import { createApp } from './app';
import { connectDatabase } from './config/database';
import { env } from './config/env';
import { ensureAdminUser } from './utils/initAdmin';

const startServer = async () => {
  try {
    // Establish database connection
    await connectDatabase();
    await ensureAdminUser();

    const app = createApp();
    const server = app.listen(env.PORT, () => {
      console.log(`====================================================`);
      console.log(`  SKILLFORGE ASSESSMENT PORTAL BACKEND SERVICE`);
      console.log(`  Server listening on: http://localhost:${env.PORT}`);
      console.log(`  Health Check URL:    http://localhost:${env.PORT}/api/health`);
      console.log(`  Environment:         ${env.NODE_ENV}`);
      console.log(`====================================================`);
    });

    const shutdown = async (signal: string) => {
      console.log(`\nReceived ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        const { disconnectDatabase } = await import('./config/database');
        await disconnectDatabase();
        console.log('SkillForge server shut down cleanly.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Fatal error starting SkillForge server:', error);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
