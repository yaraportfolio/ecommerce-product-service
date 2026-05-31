// src/config/database.js
import mysql from 'mysql2/promise';

let pool;

// Configuration du pool de connexion
const createPool = () => {
  return mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'devops_user',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'ecommerce_db',
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60000,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  });
};

// Initialiser la base de données
export const initDatabase = async () => {
  try {
    pool = createPool();
    
    // Tester la connexion
    const connection = await pool.getConnection();
    console.log('✅ Database connection pool created');
    
    // Test query
    await connection.query('SELECT 1');
    console.log('✅ Database connection successful');
    
    connection.release();
    
    return pool;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
};

// Obtenir une connexion du pool
export const getConnection = async () => {
  if (!pool) {
    pool = createPool();
  }
  return await pool.getConnection();
};

// Obtenir le pool directement
export const getPool = () => {
  if (!pool) {
    pool = createPool();
  }
  return pool;
};

// Query helper
export const query = async (sql, params) => {
  if (!pool) {
    pool = createPool();
  }
  const [rows] = await pool.query(sql, params);
  return rows;
};

export default pool;