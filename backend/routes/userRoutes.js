const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Get all staff
router.get("/", (req, res) => {

    const sql = `
        SELECT id, name, email, role
        FROM users
        ORDER BY id DESC
    `;

    db.query(sql, (err, results) => {

        if (err) {
            return res.status(500).json({
                message: "Error fetching staff"
            });
        }

        res.json(results);
    });
});

// Get staff by ID
router.get("/:id", (req, res) => {

    const sql = `
        SELECT id, name, email, role
        FROM users
        WHERE id = ?
    `;

    db.query(sql, [req.params.id], (err, results) => {

        if (err) {
            return res.status(500).json({
                message: "Error fetching user"
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.json(results[0]);
    });
});

// Add staff
router.post("/", (req, res) => {

    const {
        name,
        email,
        password,
        role
    } = req.body;

    const allowedRoles = [
        "admin",
        "chef",
        "server",
        "cashier"
    ];

    if (!name || !email || !password || !role) {
        return res.status(400).json({
            message: "All fields are required"
        });
    }

    if (!allowedRoles.includes(role)) {
        return res.status(400).json({
            message: "Invalid role"
        });
    }

    const sql = `
        INSERT INTO users
        (name, email, password, role)
        VALUES (?, ?, ?, ?)
    `;

    db.query(
        sql,
        [name, email, password, role],
        (err, result) => {

            if (err) {

                if (err.code === "ER_DUP_ENTRY") {
                    return res.status(400).json({
                        message: "Email already exists"
                    });
                }

                return res.status(500).json({
                    message: "Error creating user"
                });
            }

            res.status(201).json({
                message: "Staff created successfully",
                id: result.insertId
            });
        }
    );
});

// Update staff
router.put("/:id", (req, res) => {

    const {
        name,
        email,
        role
    } = req.body;

    const sql = `
        UPDATE users
        SET name = ?,
            email = ?,
            role = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [name, email, role, req.params.id],
        (err) => {

            if (err) {
                return res.status(500).json({
                    message: "Error updating user"
                });
            }

            res.json({
                message: "User updated successfully"
            });
        }
    );
});

// Delete staff
router.delete("/:id", (req, res) => {

    const sql = "DELETE FROM users WHERE id = ?";

    db.query(sql, [req.params.id], (err) => {

        if (err) {
            return res.status(500).json({
                message: "Error deleting user"
            });
        }

        res.json({
            message: "User deleted successfully"
        });
    });
});

module.exports = router;