const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = require('./app');
const { connectDB } = require('./config/database');
const logger = require('./utils/logger');
const PORT = process.env.PORT || 5000;
const startServer = async () => {
  try {
    await connectDB();
    logger.info('Database connected successfully');
    app.listen(PORT, () => {
      logger.info(`Pakistan Legal AI API server is running on port ${PORT}`);
      console.log(`Server is running on port ${PORT}`);
    });

    // Automatic Keep-Alive: Ping database every 6 hours to prevent Supabase 7-day auto-pause
    const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
    setInterval(async () => {
      try {
        const { query } = require('./config/database');
        await query('SELECT 1');
        logger.info('Supabase database keep-alive heartbeat ping sent successfully.');
      } catch (pingErr) {
        logger.warn('Database keep-alive ping warning:', pingErr.message);
      }
    }, SIX_HOURS_MS);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

startServer();

module.exports = app;
