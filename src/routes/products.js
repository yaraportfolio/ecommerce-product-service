// src/routes/products.js
import express from 'express';
import { getPool } from '../config/database.js';
import { updateStockMetrics } from '../middleware/metrics.js';

const router = express.Router();

// GET /api/products - Liste tous les produits
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM products ORDER BY id');
    
    // Mettre à jour les métriques
    const totalStock = rows.reduce((sum, product) => sum + (product.stock || 0), 0);
    updateStockMetrics(totalStock);
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ 
      error: 'Failed to fetch products',
      message: error.message 
    });
  }
});

// GET /api/products/search?q=keyword - Recherche
router.get('/search', async (req, res) => {
  try {
    const searchTerm = `%${req.query.q || ''}%`;
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM products WHERE name LIKE ? OR description LIKE ? ORDER BY name',
      [searchTerm, searchTerm]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ 
      error: 'Failed to search products',
      message: error.message 
    });
  }
});

// GET /api/products/:id - Produit par ID
router.get('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM products WHERE id = ?',
      [req.params.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ 
      error: 'Failed to fetch product',
      message: error.message 
    });
  }
});

// GET /api/products/category/:category - Filtrer par catégorie
router.get('/category/:category', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM products WHERE category = ? ORDER BY name',
      [req.params.category]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({ 
      error: 'Failed to fetch products',
      message: error.message 
    });
  }
});

// POST /api/products - Créer un produit (ADMIN)
router.post('/', async (req, res) => {
  try {
    const { name, description, price, stock, category, image_url } = req.body;
    
    // Validation
    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }
    
    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO products (name, description, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?)',
      [name, description, price, stock || 0, category, image_url]
    );
    
    res.status(201).json({
      message: 'Product created',
      product: {
        id: result.insertId,
        name,
        description,
        price,
        stock: stock || 0,
        category,
        image_url
      }
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ 
      error: 'Failed to create product',
      message: error.message 
    });
  }
});

// PUT /api/products/:id - Modifier un produit (ADMIN)
router.put('/:id', async (req, res) => {
  try {
    const { name, description, price, stock, category, image_url } = req.body;
    const pool = getPool();
    
    // Vérifier que le produit existe
    const [existing] = await pool.query('SELECT id FROM products WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Mettre à jour
    await pool.query(
      'UPDATE products SET name = ?, description = ?, price = ?, stock = ?, category = ?, image_url = ? WHERE id = ?',
      [name, description, price, stock, category, image_url, req.params.id]
    );
    
    res.json({ 
      message: 'Product updated',
      product: { id: req.params.id, name, description, price, stock, category, image_url }
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ 
      error: 'Failed to update product',
      message: error.message 
    });
  }
});

// DELETE /api/products/:id - Supprimer un produit (ADMIN)
router.delete('/:id', async (req, res) => {
  try {
    const pool = getPool();
    
    // Vérifier que le produit existe
    const [existing] = await pool.query('SELECT id FROM products WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    
    res.json({ message: 'Product deleted' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ 
      error: 'Failed to delete product',
      message: error.message 
    });
  }
});

export default router;