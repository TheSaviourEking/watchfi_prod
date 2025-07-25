import fastify, { FastifyReply, FastifyRequest } from 'fastify';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import prisma from './lib/prisma.js';
import productRoutes from './modules/products/product.route.js';
import bookingRoutes from './modules/bookings/booking.route.js';
import customerRoutes from './modules/customer/customer.route.js';
import filterRoutes from './modules/filter/filter.route.js';

// Since we're using ES modules, define __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = fastify({
    logger: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
    }
});

// Register CORS plugin
await server.register(import('@fastify/cors'), {
    origin: process.env.NODE_ENV === 'production'
        ? ['https://watchfi-prod.onrender.com']
        : true,
    credentials: true,
});

// Health check endpoint
server.get('/health', async (_, reply: FastifyReply) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return {
            status: 'healthy',
            database: 'connected',
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        reply.status(500).send({
            error: 'Database connection failed',
            details: error.message
        });
    }
});

// Determine the correct path for static files
// Since build scripts copy/move files to server/public, use that as primary path
const staticPath = path.join(__dirname, '..', 'public');
const clientDistPath = path.join(__dirname, '..', '..', 'client', 'dist');

let finalStaticPath = staticPath; // Always default to server/public first

// Check if server/public exists and has files, otherwise fallback to client/dist (for dev)
if (existsSync(staticPath)) {
    const hasIndexInPublic = existsSync(path.join(staticPath, 'index.html'));
    if (hasIndexInPublic || process.env.NODE_ENV === 'production') {
        finalStaticPath = staticPath;
        server.log.info(`Using server public path: ${staticPath}`);
    } else {
        // Fallback to client/dist for development if public doesn't have index.html
        if (existsSync(clientDistPath) && existsSync(path.join(clientDistPath, 'index.html'))) {
            finalStaticPath = clientDistPath;
            server.log.info(`Fallback to client dist path: ${clientDistPath}`);
        } else {
            server.log.warn(`Using server public path but no index.html found: ${staticPath}`);
        }
    }
} else if (existsSync(clientDistPath)) {
    finalStaticPath = clientDistPath;
    server.log.info(`Server public doesn't exist, using client dist path: ${clientDistPath}`);
} else {
    server.log.error('No static files directory found!');
    server.log.error(`Checked paths: ${staticPath}, ${clientDistPath}`);
}

// Add this before registering the static plugin
server.log.info(`Checking if index.html exists: ${path.join(finalStaticPath, 'index.html')}`);
server.log.info(`Index.html exists: ${existsSync(path.join(finalStaticPath, 'index.html'))}`);

// Serve static files with explicit configuration
// IMPORTANT: Remove decorateReply: false to enable sendFile method
await server.register(import('@fastify/static'), {
    root: finalStaticPath,
    prefix: '/', // This is important - it means files are served from root
    // decorateReply: false, // REMOVED - this was preventing sendFile from being available
});

// Add a specific route for the root path to serve index.html
server.get('/', async (request, reply) => {
    const indexPath = path.join(finalStaticPath, 'index.html');

    if (!existsSync(indexPath)) {
        server.log.error(`index.html not found at: ${indexPath}`);
        reply.type('text/html');
        return reply.status(404).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Application Error</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; }
                    .error { background: #ffebee; border: 1px solid #e57373; padding: 20px; border-radius: 4px; }
                </style>
            </head>
            <body>
                <div class="error">
                    <h1>Application Error</h1>
                    <p>Static files not found at: ${indexPath}</p>
                    <p>Make sure the build process completed successfully by running: <code>pnpm run build</code></p>
                </div>
            </body>
            </html>
        `);
    }

    reply.type('text/html');
    return reply.sendFile('index.html');
});

// Add a route to check static files
server.get('/debug/stati', async (request, reply) => {
    if (process.env.NODE_ENV === 'production') {
        return reply.status(404).send({ error: 'Not found' });
    }

    const fs = await import('fs');
    try {
        const files = fs.readdirSync(finalStaticPath);
        const indexExists = fs.existsSync(path.join(finalStaticPath, 'index.html'));
        return {
            staticPath: finalStaticPath,
            files: files.slice(0, 20), // Limit to first 20 files
            indexExists,
            totalFiles: files.length
        };
    } catch (error) {
        return {
            error: error.message,
            staticPath: finalStaticPath
        };
    }
});

server.get('/debug/static', async (request, reply) => {
    const fs = await import('fs');
    try {
        const files = fs.readdirSync(finalStaticPath);
        const indexExists = fs.existsSync(path.join(finalStaticPath, 'index.html'));
        const indexContent = indexExists ? fs.readFileSync(path.join(finalStaticPath, 'index.html'), 'utf8') : 'Not found';
        return {
            staticPath: finalStaticPath,
            files: files.slice(0, 20),
            indexExists,
            indexContentLength: indexContent.length,
            totalFiles: files.length
        };
    } catch (error) {
        return {
            error: error.message,
            staticPath: finalStaticPath
        };
    }
});

server.get('/debug/index', async (request, reply) => {
    const indexPath = path.join(finalStaticPath, 'index.html');
    const fs = await import('fs');
    return {
        content: fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : 'Not found',
    };
});

// Register API routes - MOVED BEFORE setNotFoundHandler
server.register(productRoutes, { prefix: '/api/v1/collections' });
server.register(bookingRoutes, { prefix: '/api/v1/bookings' });
server.register(customerRoutes, { prefix: '/api/v1/customers' });
server.register(filterRoutes, { prefix: '/api/v1/filter' });

// Handle SPA routing: Serve index.html for all non-API routes
server.setNotFoundHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip API routes - let them return 404 naturally
    if (request.url.startsWith('/api')) {
        return reply.status(404).send({ error: 'API endpoint not found' });
    }

    // Skip static assets (they should be handled by the static plugin)
    if (request.url.startsWith('/assets/') ||
        request.url.startsWith('/fonts/') ||
        request.url.includes('.')) {
        return reply.status(404).send({ error: 'Static file not found' });
    }

    // For SPA routes, serve index.html
    const indexPath = path.join(finalStaticPath, 'index.html');

    if (!existsSync(indexPath)) {
        server.log.error(`index.html not found at: ${indexPath}`);
        // Send HTML error page instead of JSON
        reply.type('text/html');
        return reply.status(404).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Application Error</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; }
                    .error { background: #ffebee; border: 1px solid #e57373; padding: 20px; border-radius: 4px; }
                </style>
            </head>
            <body>
                <div class="error">
                    <h1>Application Error</h1>
                    <p>Static files not found at: ${indexPath}</p>
                    <p>Make sure the build process completed successfully by running: <code>pnpm run build</code></p>
                </div>
            </body>
            </html>
        `);
    }

    // Set content type for HTML and serve index.html
    reply.type('text/html');
    return reply.sendFile('index.html');
});

// Start the server
const start = async () => {
    try {
        const port = Number(process.env.PORT) || 5000;
        const host = process.env.HOST || '0.0.0.0';

        server.log.info(`Starting server on ${host}:${port}`);
        server.log.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        server.log.info(`Static files path: ${finalStaticPath}`);

        await server.listen({ port, host });

        server.log.info(`🚀 Server running at http://${host}:${port}`);
    } catch (err) {
        server.log.error(err);
        await prisma.$disconnect();
        process.exit(1);
    }
};

// Graceful shutdown handlers
const gracefulShutdown = async (signal: string) => {
    server.log.info(`Received ${signal}. Performing graceful shutdown...`);
    try {
        await server.close();
        await prisma.$disconnect();
        process.exit(0);
    } catch (error) {
        server.log.error('Error during shutdown:', error);
        process.exit(1);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    server.log.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    server.log.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

start();