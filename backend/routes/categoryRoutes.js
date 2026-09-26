const express = require("express");
const router = express.Router();
const db = require("../config/db");

// ==========================================
// GET ALL CATEGORIES
// ==========================================
router.get("/", (req, res) => {

    const sql = `
        SELECT id, name
        FROM categories
        ORDER BY id DESC
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.error("Error fetching categories:", err);

            return res.status(500).json({
                message: "Error fetching categories"
            });
        }

        res.json(results);
    });
});


// ==========================================
// GET CATEGORY BY ID
// ==========================================
router.get("/:id", (req, res) => {

    const sql = `
        SELECT id, name
        FROM categories
        WHERE id = ?
    `;

    db.query(sql, [req.params.id], (err, results) => {

        if (err) {
            console.error("Error fetching category:", err);

            return res.status(500).json({
                message: "Error fetching category"
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "Category not found"
            });
        }

        res.json(results[0]);
    });
});


// ==========================================
// CREATE CATEGORY
// ==========================================
router.post("/", (req, res) => {

    const { name } = req.body;

    // Check name
    if (!name || !name.trim()) {

        return res.status(400).json({
            message: "Category name is required"
        });
    }

    const categoryName = name.trim();

    const sql = `
        INSERT INTO categories (name)
        VALUES (?)
    `;

    db.query(sql, [categoryName], (err, result) => {

        if (err) {
            console.error("Error creating category:", err);

            return res.status(500).json({
                message: "Error creating category"
            });
        }

        res.status(201).json({
            message: "Category created successfully",
            id: result.insertId
        });
    });
});


// ==========================================
// UPDATE CATEGORY
// ==========================================
router.put("/:id", (req, res) => {

    const { name } = req.body;

    if (!name || !name.trim()) {

        return res.status(400).json({
            message: "Category name is required"
        });
    }

    const categoryName = name.trim();

    const sql = `
        UPDATE categories
        SET name = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [categoryName, req.params.id],
        (err, result) => {

            if (err) {
                console.error("Error updating category:", err);

                return res.status(500).json({
                    message: "Error updating category"
                });
            }

            if (result.affectedRows === 0) {

                return res.status(404).json({
                    message: "Category not found"
                });
            }

            res.json({
                message: "Category updated successfully"
            });
        }
    );
});


// ==========================================
// DELETE CATEGORY
// ==========================================
router.delete("/:id", (req, res) => {

    const sql = `
        DELETE FROM categories
        WHERE id = ?
    `;

    db.query(sql, [req.params.id], (err, result) => {

        if (err) {
            console.error("Error deleting category:", err);

            return res.status(400).json({
                message:
                    "Cannot delete this category because it is used by menu items."
            });
        }

        if (result.affectedRows === 0) {

            return res.status(404).json({
                message: "Category not found"
            });
        }

        res.json({
            message: "Category deleted successfully"
        });
    });
});


module.exports = router;