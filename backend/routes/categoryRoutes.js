const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Get all categories
router.get("/", (req, res) => {

    const sql = "SELECT * FROM categories ORDER BY id DESC";

    db.query(sql, (err, results) => {

        if (err) {
            console.error(err);
            return res.status(500).json({
                message: "Error fetching categories"
            });
        }

        res.json(results);
    });
});

// Get category by ID
router.get("/:id", (req, res) => {

    const sql = "SELECT * FROM categories WHERE id = ?";

    db.query(sql, [req.params.id], (err, results) => {

        if (err) {
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

// Create category
router.post("/", (req, res) => {

    const { name } = req.body;

    if (!name) {
        return res.status(400).json({
            message: "Category name is required"
        });
    }

    const sql = "INSERT INTO categories (name) VALUES (?)";

    db.query(sql, [name], (err, result) => {

        if (err) {
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

// Update category
router.put("/:id", (req, res) => {

    const { name } = req.body;

    const sql = "UPDATE categories SET name = ? WHERE id = ?";

    db.query(sql, [name, req.params.id], (err) => {

        if (err) {
            return res.status(500).json({
                message: "Error updating category"
            });
        }

        res.json({
            message: "Category updated successfully"
        });
    });
});

// Delete category
router.delete("/:id", (req, res) => {

    const sql = "DELETE FROM categories WHERE id = ?";

    db.query(sql, [req.params.id], (err) => {

        if (err) {
            return res.status(500).json({
                message: "Cannot delete category. It may contain menu items."
            });
        }

        res.json({
            message: "Category deleted successfully"
        });
    });
});

module.exports = router;