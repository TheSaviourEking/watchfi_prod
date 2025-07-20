import fastify, { FastifyReply } from 'fastify';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from './lib/prisma.js';
import productRoutes from './modules/products/product.route.js';
import bookingRoutes from './modules/bookings/booking.route.js';
import customerRoutes from './modules/customer/customer.route.js';
import filterRoutes from './modules/filter/filter.route.js';

// Since we're using ES modules, define __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = fastify({ logger: true });

// Register CORS plugin
server.register(import('@fastify/cors'), {
    origin: process.env.NODE_ENV === 'production' ? ['https://watchfi-prod.onrender.com'] : true,
    credentials: true,
    // methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    // allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
});

// Health check endpoint
server.get('/health', async (_, reply: FastifyReply) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return { status: 'Database connected' };
    } catch (error) {
        reply.status(500).send({ error: 'Database connection failed', details: error.message });
    }
});

// Serve static files from the public directory
server.register(import('@fastify/static'), {
    // root: path.join(__dirname, '..',"..","watchfi_vite","dist", 'public'), // Fixed typo: ',,' to '..'
    root: path.join(__dirname, '..', "..", "client", "dist"),
    prefix: '/',
    wildcard: false,
});

// Register API routes
server.register(productRoutes, { prefix: '/api/v1/collections' });
server.register(bookingRoutes, { prefix: '/api/v1/bookings' });
server.register(customerRoutes, { prefix: '/api/v1/customers' });
server.register(filterRoutes, { prefix: '/api/v1/filter' });

// Handle SPA routing: Serve index.html for all non-API routes
server.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/api')) {
        return reply.status(404).send({ error: 'Not Found' });
    }
    reply.sendFile('index.html');
});

// Start the server
const start = async () => {
    try {
        const port = process.env.PORT || 5000;
        const host = process.env.HOST || '0.0.0.0';
        await server.listen({ port, host });
        // console.log(`Server running at http://${host}:${port}`);
    } catch (err) {
        server.log.error(err);
        await prisma.$disconnect();
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
    server.log.info('Received SIGTERM. Performing graceful shutdown...');
    await server.close();
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGINT', async () => {
    server.log.info('Received SIGINT. Performing graceful shutdown...');
    await server.close();
    await prisma.$disconnect();
    process.exit(0);
});

start();