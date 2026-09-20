const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Get all menu items
router.get("/", (req, res) => {

    const sql = `
        SELECT 
            menu_items.id,
            menu_items.name,
            menu_items.description,
            menu_items.price,
            menu_items.image,
            categories.name AS category
        FROM menu_items
        LEFT JOIN categories
        ON menu_items.category_id = categories.id
        ORDER BY menu_items.id DESC
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.error(err);

            return res.status(500).json({
                message: "Error fetching menu"
            });
        }

        res.json(results);
    });
});

// Get one menu item
router.get("/:id", (req, res) => {

    const sql = `
        SELECT 
            menu_items.*,
            categories.name AS category
        FROM menu_items
        LEFT JOIN categories
        ON menu_items.category_id = categories.id
        WHERE menu_items.id = ?
    `;

    db.query(sql, [req.params.id], (err, results) => {

        if (err) {
            return res.status(500).json({
                message: "Error fetching menu item"
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "Menu item not found"
            });
        }

        res.json(results[0]);
    });
});

// Add menu item
router.post("/", (req, res) => {

    const {
        category_id,
        name,
        description,
        price,
        image
    } = req.body;

    if (!name || price === undefined) {
        return res.status(400).json({
            message: "Name and price are required"
        });
    }

    const sql = `
        INSERT INTO menu_items
        (category_id, name, description, price, image)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            category_id || null,
            name,
            description || null,
            price,
            image || null
        ],
        (err, result) => {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    message: "Error creating menu item"
                });
            }

            res.status(201).json({
                message: "Menu item created successfully",
                id: result.insertId
            });
        }
    );
});

// Update menu item
router.put("/:id", (req, res) => {

    const {
        category_id,
        name,
        description,
        price,
        image
    } = req.body;

    const sql = `
        UPDATE menu_items
        SET category_id = ?,
            name = ?,
            description = ?,
            price = ?,
            image = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [
            category_id || null,
            name,
            description || null,
            price,
            image || null,
            req.params.id
        ],
        (err) => {

            if (err) {
                return res.status(500).json({
                    message: "Error updating menu item"
                });
            }

            res.json({
                message: "Menu item updated successfully"
            });
        }
    );
});

// Delete menu item
router.delete("/:id", (req, res) => {

    const sql = "DELETE FROM menu_items WHERE id = ?";

    db.query(sql, [req.params.id], (err) => {

        if (err) {
            return res.status(500).json({
                message: "Cannot delete menu item. It may be used in an order."
            });
        }

        res.json({
            message: "Menu item deleted successfully"
        });
    });
});

module.exports = router;