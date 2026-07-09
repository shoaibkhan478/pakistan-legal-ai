const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');


const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');

// Route imports
// NOTE: only ONE legal routes file/name is used now (legal.routes.js) to match
// the naming convention of every other route file below (xxx.routes.js).
// The old duplicate `const legalRoutes = require('./routes/legalRoutes')`
// caused: SyntaxError: Identifier 'legalRoutes' has already been declared.
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const caseRoutes = require('./routes/case.routes');
const documentRoutes = require('./routes/document.routes');
const chatRoutes = require('./routes/chat.routes');
const draftRoutes = require('./routes/draft.routes');
const analysisRoutes = require('./routes/analysis.routes');
const researchRoutes = require('./routes/research.routes');
const studentRoutes = require('./routes/student.routes');
const adminRoutes = require('./routes/admin.routes');
const notificationRoutes = require('./routes/notification.routes');
const legalRoutes = require('./routes/legal.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());

// // CORS Configuration for frontend connection
// app.use(cors({
//     origin: 'http://localhost:3000',
//     credentials: true,
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization']
// }));
// CORS Configuration for frontend connection
const allowedOrigins = [
    'http://localhost:3000',
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGIN
].filter(Boolean);

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// Rate Limiting
app.use(rateLimiter);

// Routes (all mounted AFTER body-parsing middleware, so req.body works everywhere)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/cases', caseRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/drafts', draftRoutes);
app.use('/api/v1/analysis', analysisRoutes);
app.use('/api/v1/research', researchRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/legal', legalRoutes);

// NOTE: uploaded files are intentionally NOT served as a public static folder.
// They are only accessible through the authenticated route:
//   GET /api/v1/documents/:id/file
// which checks that the requesting user owns the document before sending it.

// Global Error Handler
app.use(errorHandler);

// Start Server Function
const startServer = async () => {
    try {
        await connectDB();
        logger.info('Database connected successfully');

        app.listen(PORT, () => {
            logger.info(`Server is running on port ${PORT}`);
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Handle uncaught exceptions
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
