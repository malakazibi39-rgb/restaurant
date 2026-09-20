const express = require('express');
const pool = require('../config/db');

const router = express.Router();

// These must exactly match the enum in the `users` table: enum('chef','server','cashier')
const ALLOWED_ROLES = ['chef', 'server', 'cashier'];

function validateEmployeePayload(body) {
  const errors = [];
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const role = typeof body.role === 'string' ? body.role.trim() : '';

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!name) errors.push('Name is required.');
  if (name.length > 100) errors.push('Name is too long.');

  if (!email || !emailPattern.test(email)) errors.push('A valid email is required.');
  if (email.length > 100) errors.push('Email is too long.');

  if (password && password.length < 8) errors.push('Password must be at least 8 characters.');

  if (!ALLOWED_ROLES.includes(role)) {
    errors.push('Role must be one of: ' + ALLOWED_ROLES.join(', ') + '.');
  }

  return { errors, clean: { name, email, password, role } };
}

// GET /api/employees — list all staff
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, role FROM users ORDER BY id ASC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ errors: ['Could not load employees.'] });
  }
});

// GET /api/employees/:id — fetch a single employee
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, role FROM users WHERE id = ?",
      [id]
    );
    if (!rows.length) return res.status(404).json({ errors: ['Employee not found.'] });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ errors: ['Could not load employee.'] });
  }
});

// POST /api/employees — add an employee (creates a login account)
router.post('/', async (req, res) => {
  const { errors, clean } = validateEmployeePayload(req.body || {});
  if (!clean.password || clean.password.length < 8) {
    if (!errors.includes('Password must be at least 8 characters.')) {
      errors.push('Password must be at least 8 characters.');
    }
  }
  if (errors.length) return res.status(400).json({ errors });

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [clean.email]);
    if (existing.length) {
      return res.status(409).json({ errors: ['An account with that email already exists.'] });
    }

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [clean.name, clean.email, clean.password, clean.role]
    );

    const [rows] = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ errors: ['Could not add employee.'] });
  }
});

// PATCH /api/employees/:id — update an employee (e.g. change role)
router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);

  try {
    const [existingRows] = await pool.query(
      "SELECT * FROM users WHERE id = ?",
      [id]
    );
    if (!existingRows.length) return res.status(404).json({ errors: ['Employee not found.'] });

    const existing = existingRows[0];
    const merged = { ...existing, ...req.body };
    const { errors, clean } = validateEmployeePayload(merged);
    if (errors.length) return res.status(400).json({ errors });

    const passwordToStore = req.body.password ? req.body.password : existing.password;

    await pool.query(
      'UPDATE users SET name = ?, email = ?, password = ?, role = ? WHERE id = ?',
      [clean.name, clean.email, passwordToStore, clean.role, id]
    );

    const [updatedRows] = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = ?',
      [id]
    );
    res.json(updatedRows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ errors: ['Could not update employee.'] });
  }
});

// DELETE /api/employees/:id — remove an employee
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);

  try {
    const [existing] = await pool.query(
      "SELECT id FROM users WHERE id = ?",
      [id]
    );
    if (!existing.length) return res.status(404).json({ errors: ['Employee not found.'] });

    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ errors: ['Could not delete employee.'] });
  }
});

module.exports = router;