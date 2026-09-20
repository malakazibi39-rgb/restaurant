const express = require('express');
const router = express.Router();

const db = require('../config/db');
// GET /api/menu-items?category_id=1
router.get('/', async (req, res, next) => {
  try {
    let sql = `SELECT mi.*, c.name AS category_name
               FROM menu_items mi
               LEFT JOIN categories c ON c.id = mi.category_id`;
    const params = [];

    if (req.query.category_id) {
      sql += ' WHERE mi.category_id = ?';
      params.push(req.query.category_id);
    }

    sql += ' ORDER BY mi.category_id, mi.id';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/menu-items/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT mi.*, c.name AS category_name
       FROM menu_items mi
       LEFT JOIN categories c ON c.id = mi.category_id
       WHERE mi.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Menu item not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/menu-items
// body: { category_id, name, description, price, image }
router.post('/', async (req, res, next) => {
  const { category_id, name, description, price, image } = req.body;
  if (!name || price === undefined) {
    return res.status(400).json({ error: 'name and price are required' });
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO menu_items (category_id, name, description, price, image)
       VALUES (?, ?, ?, ?, ?)`,
      [category_id || null, name, description || null, price, image || null]
    );
    const [rows] = await pool.query('SELECT * FROM menu_items WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/menu-items/:id
router.put('/:id', async (req, res, next) => {
  const { category_id, name, description, price, image } = req.body;
  try {
    const [result] = await pool.query(
      `UPDATE menu_items
       SET category_id = ?, name = ?, description = ?, price = ?, image = ?
       WHERE id = ?`,
      [category_id || null, name, description || null, price, image || null, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Menu item not found' });
    const [rows] = await pool.query('SELECT * FROM menu_items WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/menu-items/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const [result] = await pool.query('DELETE FROM menu_items WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Menu item not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;