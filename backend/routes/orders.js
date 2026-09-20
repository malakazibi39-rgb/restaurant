const express = require('express');
const router = express.Router();
const db = require('../config/db');

/**
 * GET /api/orders/ready
 * List every order the kitchen has marked "ready" so the cashier can invoice it.
 */
router.get('/ready', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT o.id, o.customer_name, o.phone, o.status, o.total_price,
              COUNT(oi.id) AS item_count
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.status = 'ready'
       GROUP BY o.id
       ORDER BY o.id ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load ready orders.' });
  }
});

/**
 * GET /api/orders/:id
 * Full order detail (line items joined with menu_items) used to build the invoice.
 * Read-only join against menu_items -- the cashier never edits menu data.
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [[order]] = await db.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    const [items] = await db.query(
      `SELECT oi.id, oi.quantity, oi.price, mi.name, mi.description
       FROM order_items oi
       JOIN menu_items mi ON mi.id = oi.menu_item_id
       WHERE oi.order_id = ?`,
      [id]
    );

    // Prefer the stored total_price; fall back to summing line items if it's empty.
    const computed = items.reduce((sum, it) => sum + Number(it.price) * it.quantity, 0);
    const total = order.total_price != null ? Number(order.total_price) : Number(computed.toFixed(2));

    res.json({ order, items, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load order.' });
  }
});

/**
 * POST /api/orders/:id/payment
 * body: { payment_method: 'cash' | 'card', status: 'paid' | 'completed' }
 * Records how the order was paid and moves its status forward.
 */
router.post('/:id/payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_method, status } = req.body;

    if (!['cash', 'card'].includes(payment_method)) {
      return res.status(400).json({ error: 'payment_method must be "cash" or "card".' });
    }
    const finalStatus = ['paid', 'completed'].includes(status) ? status : 'paid';

    const [[order]] = await db.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.status === 'completed') {
      return res.status(400).json({ error: 'Order is already completed.' });
    }

    await db.query(
      `UPDATE orders SET payment_method = ?, status = ? WHERE id = ?`,
      [payment_method, finalStatus, id]
    );

    const [[updated]] = await db.query('SELECT * FROM orders WHERE id = ?', [id]);
    res.json({ message: 'Payment recorded.', order: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not record payment.' });
  }
});

/**
 * POST /api/orders/:id/complete
 * Marks an already-paid order as completed (order handed over / closed out).
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const [[order]] = await db.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.status !== 'paid') {
      return res.status(400).json({ error: 'Only paid orders can be marked completed.' });
    }
    await db.query(`UPDATE orders SET status = 'completed' WHERE id = ?`, [id]);
    const [[updated]] = await db.query('SELECT * FROM orders WHERE id = ?', [id]);
    res.json({ message: 'Order completed.', order: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not complete order.' });
  }
});

module.exports = router;

/*
 * NOTE ON PERMISSIONS
 * --------------------
 * This router intentionally exposes ONLY:
 *   - reading ready orders
 *   - reading one order's detail (for the invoice)
 *   - recording payment / status changes
 *
 * There is deliberately NO route here (or anywhere in the app) that creates,
 * updates, or deletes rows in `menu_items`. Cashier cannot modify the menu.
 */