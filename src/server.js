import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import productRoutes from './routes/products.js';
import { initDatabase } from './config/database.js';
import { metricsMiddleware, metricsEndpoint } from './middleware/metrics.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
const SERVICE_NAME = 'product-service';
const VERSION = '3.3';

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost',
  'http://e-commerce.local',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(metricsMiddleware);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later'
});
app.use('/api/', limiter);

app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const user = req.user?.email || req.body?.email || 'anonymous';
    const status = res.statusCode;
    const emoji = status < 400 ? '✅' : '❌';
    
    console.log(`${emoji} [${SERVICE_NAME}] ${req.method} ${req.path}
   User: ${user}
   Status: ${status}
   Duration: ${duration}ms`);
  });
  
  next();
});

app.get('/api/products/metrics', metricsEndpoint);

app.get('/api/products/health', async (req, res) => {
  const health = {
    status: 'ok',
    service: SERVICE_NAME,
    version: VERSION,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'production',
    database: 'disconnected'
  };

  try {
    const { getConnection } = await import('./config/database.js');
    const connection = await getConnection();
    await connection.query('SELECT 1');
    connection.release();
    health.database = 'connected';
  } catch (error) {
    health.database = 'error';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

app.get('/api/products/ready', async (req, res) => {
  try {
    const { getConnection } = await import('./config/database.js');
    const connection = await getConnection();
    await connection.query('SELECT 1');
    connection.release();
    res.json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});

app.get('/api/products/info', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    version: VERSION,
    description: 'Product catalog microservice',
    endpoints: [
      'GET  /api/products/health - Health check',
      'GET  /api/products/ready - Readiness probe',
      'GET  /api/products/metrics - Prometheus metrics',
      'GET  /api/products/info - Service information',
      'GET  /api/products - List all products',
      'GET  /api/products/:id - Get product details'
    ],
    dependencies: {
      database: 'MariaDB',
      cache: 'none'
    }
  });
});

app.use('/api/products', productRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

app.use((err, req, res, next) => {
  console.error(`[${SERVICE_NAME}] Error:`, err);
  res.status(500).json({
    error: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const startServer = async () => {
  try {
    await initDatabase();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`
╔═══════════════════════════════════════════════
║   🛍️  ${SERVICE_NAME.toUpperCase()} - v${VERSION}
║
║   Port: ${PORT}
║   Environment: ${process.env.NODE_ENV || 'development'}
║   Database: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}
║
║   📚 Endpoints:
║   GET  /api/products/health   - Health check
║   GET  /api/products/ready    - Ready check
║   GET  /api/products/metrics  - Prometheus
║   GET  /api/products/info     - Service info
║   GET  /api/products          - List products
║   GET  /api/products/:id      - Product detail
║
╚═══════════════════════════════════════════════
      `);
    });
  } catch (error) {
    console.error(`❌ Failed to start ${SERVICE_NAME}:`, error);
    process.exit(1);
  }
};

startServer();