// src/middleware/metrics.js
import promClient from 'prom-client';

// Créer un registre pour les métriques
const register = new promClient.Registry();

// Métriques par défaut (CPU, mémoire, etc.)
promClient.collectDefaultMetrics({ register });

// Compteur de requêtes HTTP
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

// Histogramme de durée des requêtes
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register]
});

// Gauge pour les produits en stock
const productsInStock = new promClient.Gauge({
  name: 'products_in_stock_total',
  help: 'Total number of products in stock',
  registers: [register]
});

// Middleware pour capturer les métriques
export const metricsMiddleware = (req, res, next) => {
  const start = Date.now();

  // Intercepter la fin de la réponse
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    
    httpRequestsTotal.labels(req.method, route, res.statusCode).inc();
    httpRequestDuration.labels(req.method, route, res.statusCode).observe(duration);
  });

  next();
};

// Endpoint pour exposer les métriques
export const metricsEndpoint = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
};

// Fonction pour mettre à jour le stock (appelée depuis les routes)
export const updateStockMetrics = (stockCount) => {
  productsInStock.set(stockCount);
};

export { register };