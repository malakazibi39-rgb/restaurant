const express = require("express");
const router = express.Router();
const db = require("../config/db");


// ======================================================
// GET ALL MENU ITEMS
// ======================================================

router.get("/", (req, res) => {

    const sql = `
        SELECT 
            menu_items.id,
            menu_items.category_id,
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

            console.error("Error fetching menu:", err);

            return res.status(500).json({
                message: "Error fetching menu"
            });
        }

        res.json(results);
    });
});


// ======================================================
// GET ALL CATEGORIES
// IMPORTANT: This must come BEFORE /:id
// ======================================================

router.get("/categories", (req, res) => {

    const sql = `
        SELECT 
            id,
            name
        FROM categories
        ORDER BY name ASC
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


// ======================================================
// GET ONE MENU ITEM
// ======================================================

router.get("/:id", (req, res) => {

    const sql = `
        SELECT 
            menu_items.id,
            menu_items.category_id,
            menu_items.name,
            menu_items.description,
            menu_items.price,
            menu_items.image,
            categories.name AS category
        FROM menu_items
        LEFT JOIN categories
            ON menu_items.category_id = categories.id
        WHERE menu_items.id = ?
    `;

    db.query(sql, [req.params.id], (err, results) => {

        if (err) {

            console.error("Error fetching menu item:", err);

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


// ======================================================
// ADD MENU ITEM
// ======================================================

router.post("/", (req, res) => {

    const {
        category_id,
        name,
        description,
        price,
        image
    } = req.body;


    // Validate required fields

    if (!name || !name.trim()) {

        return res.status(400).json({
            message: "Name is required"
        });
    }


    if (price === undefined || price === null || price === "") {

        return res.status(400).json({
            message: "Price is required"
        });
    }


    // Check that price is a valid number

    const numericPrice = Number(price);

    if (isNaN(numericPrice) || numericPrice < 0) {

        return res.status(400).json({
            message: "Price must be a valid positive number"
        });
    }


    const sql = `
        INSERT INTO menu_items
        (
            category_id,
            name,
            description,
            price,
            image
        )
        VALUES (?, ?, ?, ?, ?)
    `;


    db.query(
        sql,
        [
            category_id || null,
            name.trim(),
            description ? description.trim() : null,
            numericPrice,
            image ? image.trim() : null
        ],
        (err, result) => {

            if (err) {

                console.error("Error creating menu item:", err);

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


// ======================================================
// UPDATE MENU ITEM
// ======================================================

router.put("/:id", (req, res) => {

    const {
        category_id,
        name,
        description,
        price,
        image
    } = req.body;


    // Validate name

    if (!name || !name.trim()) {

        return res.status(400).json({
            message: "Name is required"
        });
    }


    // Validate price

    if (price === undefined || price === null || price === "") {

        return res.status(400).json({
            message: "Price is required"
        });
    }


    const numericPrice = Number(price);

    if (isNaN(numericPrice) || numericPrice < 0) {

        return res.status(400).json({
            message: "Price must be a valid positive number"
        });
    }


    const sql = `
        UPDATE menu_items

        SET
            category_id = ?,
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
            name.trim(),
            description ? description.trim() : null,
            numericPrice,
            image ? image.trim() : null,
            req.params.id
        ],
        (err, result) => {

            if (err) {

                console.error("Error updating menu item:", err);

                return res.status(500).json({
                    message: "Error updating menu item"
                });
            }


            if (result.affectedRows === 0) {

                return res.status(404).json({
                    message: "Menu item not found"
                });
            }


            res.json({

                message: "Menu item updated successfully"

            });

        }
    );
});


// ======================================================
// DELETE MENU ITEM
// ======================================================

router.delete("/:id", (req, res) => {

    const sql = `
        DELETE FROM menu_items
        WHERE id = ?
    `;


    db.query(
        sql,
        [req.params.id],
        (err, result) => {

            if (err) {

                console.error("Error deleting menu item:", err);


                // Foreign key constraint
                if (err.code === "ER_ROW_IS_REFERENCED_2") {

                    return res.status(400).json({

                        message:
                            "Cannot delete this item because it is already used in an order."

                    });
                }


                return res.status(500).json({

                    message:
                        "Cannot delete menu item."

                });
            }


            if (result.affectedRows === 0) {

                return res.status(404).json({

                    message:
                        "Menu item not found"

                });
            }


            res.json({

                message:
                    "Menu item deleted successfully"

            });

        }
    );
});


// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;